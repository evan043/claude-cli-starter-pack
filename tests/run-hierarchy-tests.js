#!/usr/bin/env node

/**
 * Test Runner for Epic-Hierarchy Tests
 *
 * Runs all hierarchy-related tests:
 * - Epic layer tests
 * - Roadmap coordination tests
 * - Orchestration layer tests
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFiles = [
  'epic.test.js',
  'roadmap.test.js',
  'orchestration.test.js'
];

console.log('='.repeat(60));
console.log('Running Epic-Hierarchy Tests');
console.log('='.repeat(60));
console.log('');

let totalTests = 0;
let totalPass = 0;
let totalFail = 0;
let totalDuration = 0;

async function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`Running ${testFile}...`);
    console.log('-'.repeat(60));

    const testPath = join(__dirname, testFile);
    const proc = spawn('node', [testPath], {
      stdio: 'pipe',
      shell: false
    });

    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    proc.on('close', (code) => {
      // Combine stdout and stderr for parsing
      const output = stdoutData + stderrData;

      // Parse TAP output for test statistics
      const testsMatch = output.match(/# tests (\d+)/);
      const passMatch = output.match(/# pass (\d+)/);
      const failMatch = output.match(/# fail (\d+)/);
      const durationMatch = output.match(/# duration_ms ([\d.]+)/);

      const tests = testsMatch ? parseInt(testsMatch[1]) : 0;
      const pass = passMatch ? parseInt(passMatch[1]) : 0;
      const fail = failMatch ? parseInt(failMatch[1]) : 0;
      const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;

      totalTests += tests;
      totalPass += pass;
      totalFail += fail;
      totalDuration += duration;

      if (fail > 0 || code !== 0) {
        console.log(`\n❌ ${testFile}: ${pass}/${tests} passed (${fail} failed)`);
        console.log('');
        // Show failed test details
        const failedTests = output.match(/not ok \d+ - (.+)/g);
        if (failedTests) {
          console.log('Failed tests:');
          failedTests.forEach(line => console.log('  ' + line));
        }
      } else {
        console.log(`\n✅ ${testFile}: ${pass}/${tests} passed`);
      }

      console.log('');
      resolve(code === 0 && fail === 0);
    });
  });
}

async function runAllTests() {
  const results = [];

  for (const testFile of testFiles) {
    const success = await runTest(testFile);
    results.push(success);
  }

  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total tests:    ${totalTests}`);
  console.log(`Passed:         ${totalPass} (${Math.round((totalPass / totalTests) * 100)}%)`);
  console.log(`Failed:         ${totalFail}`);
  console.log(`Total duration: ${totalDuration.toFixed(2)}ms`);
  console.log('');

  const allPassed = results.every(r => r);

  if (allPassed) {
    console.log('✅ All hierarchy tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
