/**
 * Test Validator
 *
 * Executes test suites and validates results.
 * Supports Playwright (E2E), Vitest (unit), and generic test runners.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * Run tests for the vision
 *
 * @param {Object} vision - Vision object
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Test results { success: boolean, passed: number, failed: number, failures: Array }
 */
export async function runTests(vision, projectRoot) {
  console.log('Running test suite...');

  try {
    // Detect available test frameworks
    const hasPlaywright = await checkTestFramework(projectRoot, 'playwright');
    const hasVitest = await checkTestFramework(projectRoot, 'vitest');
    const hasPytest = await checkTestFramework(projectRoot, 'pytest');

    const results = {
      success: true,
      passed: 0,
      failed: 0,
      skipped: 0,
      failures: [],
      reports: []
    };

    // Run Playwright tests (E2E)
    if (hasPlaywright) {
      console.log('Running Playwright E2E tests...');
      const playwrightResult = await runPlaywrightTests(projectRoot);
      mergeTestResults(results, playwrightResult);
    }

    // Run Vitest tests (unit)
    if (hasVitest) {
      console.log('Running Vitest unit tests...');
      const vitestResult = await runVitestTests(projectRoot);
      mergeTestResults(results, vitestResult);
    }

    // Run pytest tests (Python backend)
    if (hasPytest) {
      console.log('Running pytest tests...');
      const pytestResult = await runPytestTests(projectRoot);
      mergeTestResults(results, pytestResult);
    }

    // No test frameworks found
    if (!hasPlaywright && !hasVitest && !hasPytest) {
      console.log('No test frameworks detected, skipping tests');
      return {
        success: true,
        passed: 0,
        failed: 0,
        skipped: 0,
        failures: [],
        message: 'No test frameworks detected'
      };
    }

    // Overall success if no failures
    results.success = results.failed === 0;

    return results;

  } catch (error) {
    console.error('Error running tests:', error);
    return {
      success: false,
      passed: 0,
      failed: 1,
      failures: [{
        type: 'test_execution_error',
        message: error.message,
        stack: error.stack
      }],
      error: error.message
    };
  }
}

/**
 * Check if test framework is available
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} framework - Framework name
 * @returns {Promise<boolean>} True if framework is available
 */
async function checkTestFramework(projectRoot, framework) {
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json');

    if (framework === 'pytest') {
      // Check for pytest in requirements.txt or pyproject.toml
      const requirementsPath = path.join(projectRoot, 'requirements.txt');
      const pyprojectPath = path.join(projectRoot, 'pyproject.toml');

      if (fs.existsSync(requirementsPath)) {
        const requirements = fs.readFileSync(requirementsPath, 'utf8');
        if (requirements.includes('pytest')) return true;
      }

      if (fs.existsSync(pyprojectPath)) {
        const pyproject = fs.readFileSync(pyprojectPath, 'utf8');
        if (pyproject.includes('pytest')) return true;
      }

      return false;
    }

    // Check package.json for Node.js test frameworks
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    return framework in deps;

  } catch (error) {
    return false;
  }
}

/**
 * Run Playwright tests
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Test results
 */
async function runPlaywrightTests(projectRoot) {
  try {
    const { stdout, stderr } = await execAsync('npx playwright test --reporter=json', {
      cwd: projectRoot,
      timeout: 300000 // 5 minutes
    });

    return parsePlaywrightResults(stdout);

  } catch (error) {
    // Playwright returns non-zero exit code on test failures
    if (error.stdout) {
      return parsePlaywrightResults(error.stdout);
    }

    return {
      passed: 0,
      failed: 1,
      failures: [{
        type: 'playwright_error',
        message: error.message,
        output: error.stderr
      }]
    };
  }
}

/**
 * Run Vitest tests
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Test results
 */
async function runVitestTests(projectRoot) {
  try {
    const { stdout, stderr } = await execAsync('npx vitest run --reporter=json', {
      cwd: projectRoot,
      timeout: 300000
    });

    return parseVitestResults(stdout);

  } catch (error) {
    if (error.stdout) {
      return parseVitestResults(error.stdout);
    }

    return {
      passed: 0,
      failed: 1,
      failures: [{
        type: 'vitest_error',
        message: error.message,
        output: error.stderr
      }]
    };
  }
}

/**
 * Run pytest tests
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Test results
 */
async function runPytestTests(projectRoot) {
  try {
    const { stdout, stderr } = await execAsync('pytest --json-report --json-report-file=.pytest-report.json', {
      cwd: projectRoot,
      timeout: 300000
    });

    const reportPath = path.join(projectRoot, '.pytest-report.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      return parsePytestResults(report);
    }

    return parsePytestOutput(stdout);

  } catch (error) {
    if (error.stdout) {
      return parsePytestOutput(error.stdout);
    }

    return {
      passed: 0,
      failed: 1,
      failures: [{
        type: 'pytest_error',
        message: error.message,
        output: error.stderr
      }]
    };
  }
}

/**
 * Parse Playwright JSON results
 *
 * @param {string} output - JSON output from Playwright
 * @returns {Object} Parsed results
 */
function parsePlaywrightResults(output) {
  try {
    const data = JSON.parse(output);
    const suites = data.suites || [];

    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      failures: []
    };

    for (const suite of suites) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const result = test.results?.[0];

          if (result?.status === 'passed') {
            results.passed++;
          } else if (result?.status === 'failed') {
            results.failed++;
            results.failures.push({
              type: 'playwright_test_failure',
              test: spec.title,
              suite: suite.title,
              error: result.error?.message || 'Test failed',
              file: spec.file,
              line: spec.line
            });
          } else if (result?.status === 'skipped') {
            results.skipped++;
          }
        }
      }
    }

    return results;

  } catch (error) {
    return {
      passed: 0,
      failed: 0,
      failures: []
    };
  }
}

/**
 * Parse Vitest JSON results
 *
 * @param {string} output - JSON output from Vitest
 * @returns {Object} Parsed results
 */
function parseVitestResults(output) {
  try {
    const data = JSON.parse(output);

    const results = {
      passed: data.numPassedTests || 0,
      failed: data.numFailedTests || 0,
      skipped: data.numPendingTests || 0,
      failures: []
    };

    if (data.testResults) {
      for (const testFile of data.testResults) {
        for (const test of testFile.assertionResults || []) {
          if (test.status === 'failed') {
            results.failures.push({
              type: 'vitest_test_failure',
              test: test.title,
              file: testFile.name,
              error: test.failureMessages?.join('\n') || 'Test failed'
            });
          }
        }
      }
    }

    return results;

  } catch (error) {
    return {
      passed: 0,
      failed: 0,
      failures: []
    };
  }
}

/**
 * Parse pytest JSON report
 *
 * @param {Object} report - Pytest JSON report
 * @returns {Object} Parsed results
 */
function parsePytestResults(report) {
  const results = {
    passed: report.summary?.passed || 0,
    failed: report.summary?.failed || 0,
    skipped: report.summary?.skipped || 0,
    failures: []
  };

  if (report.tests) {
    for (const test of report.tests) {
      if (test.outcome === 'failed') {
        results.failures.push({
          type: 'pytest_test_failure',
          test: test.nodeid,
          error: test.call?.longrepr || 'Test failed',
          file: test.location?.[0],
          line: test.location?.[1]
        });
      }
    }
  }

  return results;
}

/**
 * Parse pytest text output
 *
 * @param {string} output - Text output from pytest
 * @returns {Object} Parsed results
 */
function parsePytestOutput(output) {
  // Basic parsing of pytest output
  const passedMatch = output.match(/(\d+) passed/);
  const failedMatch = output.match(/(\d+) failed/);
  const skippedMatch = output.match(/(\d+) skipped/);

  return {
    passed: passedMatch ? parseInt(passedMatch[1]) : 0,
    failed: failedMatch ? parseInt(failedMatch[1]) : 0,
    skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
    failures: []
  };
}

/**
 * Merge test results
 *
 * @param {Object} target - Target results object
 * @param {Object} source - Source results object
 */
function mergeTestResults(target, source) {
  target.passed += source.passed || 0;
  target.failed += source.failed || 0;
  target.skipped += source.skipped || 0;

  if (source.failures) {
    target.failures.push(...source.failures);
  }
}

/**
 * Parse test results (legacy method for compatibility)
 *
 * @param {Object} output - Test output
 * @returns {Object} Parsed results
 */
export function parseTestResults(output) {
  if (typeof output === 'string') {
    // Try to parse as JSON first
    try {
      const data = JSON.parse(output);
      return data;
    } catch {
      // Fall back to text parsing
      return {
        passed: 0,
        failed: 0,
        failures: []
      };
    }
  }

  return output;
}

/**
 * Identify failures from test results
 *
 * @param {Object} results - Test results
 * @returns {Array} Array of failure details
 */
export function identifyFailures(results) {
  if (!results || !results.failures) {
    return [];
  }

  return results.failures.map(failure => ({
    type: failure.type || 'unknown',
    test: failure.test || 'Unknown test',
    message: failure.error || failure.message || 'Unknown error',
    file: failure.file,
    line: failure.line,
    suite: failure.suite
  }));
}

/**
 * Generate test report
 *
 * @param {Object} results - Test results
 * @returns {string} Formatted test report
 */
export function generateTestReport(results) {
  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;

  let report = `
Test Report
===========
Total: ${total}
Passed: ${results.passed} (${passRate}%)
Failed: ${results.failed}
Skipped: ${results.skipped}
`;

  if (results.failures?.length > 0) {
    report += '\n\nFailures:\n---------\n';

    for (const failure of results.failures) {
      report += `\n${failure.type}: ${failure.test}\n`;
      report += `  ${failure.message}\n`;

      if (failure.file) {
        report += `  File: ${failure.file}`;
        if (failure.line) {
          report += `:${failure.line}`;
        }
        report += '\n';
      }
    }
  }

  return report;
}

export default {
  runTests,
  parseTestResults,
  identifyFailures,
  generateTestReport
};
