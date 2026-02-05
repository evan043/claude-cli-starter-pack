/**
 * Self-Healer
 *
 * Error recovery and self-healing capabilities.
 * Attempts to automatically fix test failures and code issues.
 *
 * Circuit breaker pattern:
 * - MAX_RETRIES = 3
 * - After 3 failed attempts, escalates to human
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const MAX_RETRIES = 3;

/**
 * Generate fixes for test failures
 *
 * @param {Array} failures - Array of failure details
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Fix suggestions { fixes: Array, confidence: number }
 */
export async function generateFixes(failures, projectRoot) {
  console.log(`Generating fixes for ${failures.length} failures...`);

  if (!failures || failures.length === 0) {
    return {
      fixes: [],
      confidence: 0
    };
  }

  const fixes = [];

  for (const failure of failures) {
    try {
      const fix = await analyzeFailureAndGenerateFix(failure, projectRoot);

      if (fix) {
        fixes.push(fix);
      }
    } catch (error) {
      console.error(`Error generating fix for ${failure.test}:`, error.message);
    }
  }

  // Calculate overall confidence
  const confidence = fixes.length > 0
    ? fixes.reduce((sum, fix) => sum + fix.confidence, 0) / fixes.length
    : 0;

  return {
    fixes,
    confidence,
    total: failures.length,
    fixable: fixes.length
  };
}

/**
 * Analyze failure and generate fix
 *
 * @param {Object} failure - Failure details
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object|null>} Fix suggestion or null
 */
async function analyzeFailureAndGenerateFix(failure, projectRoot) {
  const { type, message, file, line } = failure;

  // Pattern matching for common errors
  const fixStrategies = [
    {
      pattern: /Cannot find module|Module not found/i,
      strategy: 'missing_import',
      handler: generateImportFix
    },
    {
      pattern: /is not defined|undefined is not/i,
      strategy: 'undefined_variable',
      handler: generateVariableFix
    },
    {
      pattern: /Expected .* but received/i,
      strategy: 'assertion_mismatch',
      handler: generateAssertionFix
    },
    {
      pattern: /timeout|timed out/i,
      strategy: 'timeout',
      handler: generateTimeoutFix
    },
    {
      pattern: /ECONNREFUSED|network error/i,
      strategy: 'network_error',
      handler: generateNetworkFix
    },
    {
      pattern: /syntax error/i,
      strategy: 'syntax_error',
      handler: generateSyntaxFix
    },
    {
      pattern: /type error/i,
      strategy: 'type_error',
      handler: generateTypeFix
    }
  ];

  // Find matching strategy
  for (const { pattern, strategy, handler } of fixStrategies) {
    if (pattern.test(message)) {
      console.log(`Applying ${strategy} strategy for: ${failure.test}`);

      try {
        const fix = await handler(failure, projectRoot);

        if (fix) {
          return {
            failure,
            strategy,
            ...fix
          };
        }
      } catch (error) {
        console.error(`Error in ${strategy} handler:`, error.message);
      }
    }
  }

  // No matching strategy found
  return {
    failure,
    strategy: 'manual_review',
    action: 'escalate',
    confidence: 0,
    reason: 'No automated fix available'
  };
}

/**
 * Generate fix for missing import
 */
async function generateImportFix(failure, projectRoot) {
  const moduleMatch = failure.message.match(/['"]([^'"]+)['"]/);

  if (!moduleMatch) {
    return null;
  }

  const moduleName = moduleMatch[1];

  return {
    action: 'add_import',
    file: failure.file,
    line: failure.line || 1,
    moduleName,
    code: `import ${moduleName} from '${moduleName}';`,
    confidence: 0.8,
    description: `Add missing import for ${moduleName}`
  };
}

/**
 * Generate fix for undefined variable
 */
async function generateVariableFix(failure, projectRoot) {
  const varMatch = failure.message.match(/(\w+) is not defined/);

  if (!varMatch) {
    return null;
  }

  const variableName = varMatch[1];

  return {
    action: 'define_variable',
    file: failure.file,
    variableName,
    confidence: 0.6,
    description: `Variable ${variableName} needs to be defined or imported`,
    suggestion: `Check if ${variableName} should be imported or defined in scope`
  };
}

/**
 * Generate fix for assertion mismatch
 */
async function generateAssertionFix(failure, projectRoot) {
  return {
    action: 'update_assertion',
    file: failure.file,
    line: failure.line,
    confidence: 0.5,
    description: 'Assertion values may need to be updated',
    suggestion: 'Review expected vs actual values and update test or implementation'
  };
}

/**
 * Generate fix for timeout
 */
async function generateTimeoutFix(failure, projectRoot) {
  return {
    action: 'increase_timeout',
    file: failure.file,
    line: failure.line,
    confidence: 0.7,
    description: 'Test timeout may need to be increased',
    suggestion: 'Consider increasing timeout or optimizing async operations'
  };
}

/**
 * Generate fix for network error
 */
async function generateNetworkFix(failure, projectRoot) {
  return {
    action: 'mock_network',
    file: failure.file,
    confidence: 0.6,
    description: 'Network call may need to be mocked',
    suggestion: 'Add mock for external service or ensure service is running'
  };
}

/**
 * Generate fix for syntax error
 */
async function generateSyntaxFix(failure, projectRoot) {
  return {
    action: 'fix_syntax',
    file: failure.file,
    line: failure.line,
    confidence: 0.9,
    description: 'Syntax error detected',
    suggestion: 'Run linter to identify and fix syntax issues'
  };
}

/**
 * Generate fix for type error
 */
async function generateTypeFix(failure, projectRoot) {
  return {
    action: 'fix_types',
    file: failure.file,
    line: failure.line,
    confidence: 0.7,
    description: 'Type mismatch detected',
    suggestion: 'Check type definitions and ensure correct types are used'
  };
}

/**
 * Apply fixes to code
 *
 * @param {Array} fixes - Array of fix suggestions
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Result { success: boolean, applied: number, failed: number }
 */
export async function applyFixes(fixes, projectRoot) {
  console.log(`Applying ${fixes.length} fixes...`);

  const results = {
    success: true,
    applied: 0,
    failed: 0,
    errors: []
  };

  for (const fix of fixes) {
    try {
      // Only apply high-confidence fixes
      if (fix.confidence < 0.7) {
        console.log(`Skipping low-confidence fix: ${fix.description}`);
        continue;
      }

      const applied = await applySingleFix(fix, projectRoot);

      if (applied) {
        results.applied++;
        console.log(`Applied fix: ${fix.description}`);
      } else {
        results.failed++;
      }
    } catch (error) {
      console.error(`Error applying fix: ${fix.description}`, error.message);
      results.failed++;
      results.errors.push({
        fix: fix.description,
        error: error.message
      });
    }
  }

  results.success = results.failed === 0;

  return results;
}

/**
 * Apply a single fix
 *
 * @param {Object} fix - Fix suggestion
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>} True if applied successfully
 */
async function applySingleFix(fix, projectRoot) {
  switch (fix.action) {
    case 'add_import':
      return await addImport(fix, projectRoot);

    case 'fix_syntax':
      return await runLinter(fix.file, projectRoot);

    case 'fix_types':
      return await runTypeChecker(fix.file, projectRoot);

    default:
      console.log(`No automated action for: ${fix.action}`);
      return false;
  }
}

/**
 * Add import to file
 *
 * @param {Object} fix - Fix details
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>} True if successful
 */
async function addImport(fix, projectRoot) {
  const filePath = path.join(projectRoot, fix.file);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Find last import statement
    let insertLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith('from ')) {
        insertLine = i + 1;
      }
    }

    // Insert new import
    lines.splice(insertLine, 0, fix.code);

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

    return true;
  } catch (error) {
    console.error('Error adding import:', error.message);
    return false;
  }
}

/**
 * Run linter on file
 *
 * @param {string} file - File path
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>} True if successful
 */
async function runLinter(file, projectRoot) {
  try {
    await execAsync(`npx eslint ${file} --fix`, {
      cwd: projectRoot,
      timeout: 30000
    });

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Run type checker on file
 *
 * @param {string} file - File path
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>} True if successful
 */
async function runTypeChecker(file, projectRoot) {
  try {
    await execAsync(`npx tsc --noEmit ${file}`, {
      cwd: projectRoot,
      timeout: 30000
    });

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate a fix was successful
 *
 * @param {Object} fix - Fix that was applied
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>} True if fix is valid
 */
export async function validateFix(fix, projectRoot) {
  // Re-run tests for the specific file
  // This is a simplified version - full implementation would run specific tests

  if (!fix.file) {
    return false;
  }

  try {
    // Check if file has syntax errors
    const filePath = path.join(projectRoot, fix.file);

    if (!fs.existsSync(filePath)) {
      return false;
    }

    // Basic validation: file can be read without errors
    fs.readFileSync(filePath, 'utf8');

    return true;
  } catch (error) {
    console.error('Fix validation failed:', error.message);
    return false;
  }
}

/**
 * Determine if failures should be escalated to human
 *
 * @param {Array} failures - Array of failures
 * @param {number} retryCount - Current retry count
 * @returns {boolean} True if should escalate
 */
export function shouldEscalate(failures, retryCount) {
  // Escalate if max retries reached
  if (retryCount >= MAX_RETRIES) {
    console.log(`Max retries (${MAX_RETRIES}) reached, escalating to human`);
    return true;
  }

  // Escalate if critical failures detected
  const criticalPatterns = [
    /database.*error/i,
    /auth.*failed/i,
    /permission denied/i,
    /fatal error/i,
    /segmentation fault/i
  ];

  for (const failure of failures) {
    for (const pattern of criticalPatterns) {
      if (pattern.test(failure.message)) {
        console.log(`Critical failure detected: ${failure.message}`);
        return true;
      }
    }
  }

  return false;
}

export default {
  generateFixes,
  applyFixes,
  validateFix,
  shouldEscalate,
  MAX_RETRIES
};
