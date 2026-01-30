/**
 * Test Run Command
 *
 * Run tests with support for different modes:
 * - Ralph Loop: Auto-retry until tests pass
 * - Manual: Run once
 * - Watch: Interactive test watching
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import {
  loadTestingConfig,
  hasTestingConfig,
  getCredentials,
  validateConfig,
} from '../testing/config.js';
import { loadTaskState, updateTaskStatus } from './sync.js';

// Ralph loop state file
const RALPH_STATE_FILE = '.gtask/ralph-loop.json';

/**
 * Run tests command
 */
export async function runTest(options) {
  // Load config
  const config = loadTestingConfig();

  if (!config) {
    showError('Testing not configured', 'Run "gtask test-setup" first.');
    return;
  }

  // Validate config
  const validation = validateConfig(config);
  if (!validation.valid) {
    showError('Invalid testing configuration');
    for (const err of validation.errors) {
      console.log(chalk.red(`  - ${err}`));
    }
    return;
  }

  // Determine mode
  const mode = options.mode || config.mode || 'manual';

  // Get credentials if needed
  let credentials = null;
  if (config.credentials.source !== 'none') {
    credentials = getCredentials(config);

    if (!credentials && config.credentials.source === 'prompt') {
      credentials = await promptCredentials();
    }

    if (!credentials?.username || !credentials?.password) {
      if (config.credentials.source === 'env') {
        showWarning('Credentials not found in environment variables.');
        console.log(chalk.dim(`Set ${config.credentials.envVars.username} and ${config.credentials.envVars.password}`));

        const { continueWithout } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueWithout',
            message: 'Continue without credentials?',
            default: false,
          },
        ]);

        if (!continueWithout) return;
      }
    }
  }

  // Run based on mode
  switch (mode) {
    case 'ralph':
      await runRalphLoop(config, credentials, options);
      break;
    case 'watch':
      await runWatchMode(config, credentials, options);
      break;
    case 'manual':
    default:
      await runOnce(config, credentials, options);
  }
}

/**
 * Run tests once
 */
async function runOnce(config, credentials, options) {
  showHeader('Running Tests');

  console.log(chalk.dim(`Environment: ${config.environment.baseUrl}`));
  console.log(chalk.dim(`Browser: ${config.playwright.browser}`));
  console.log('');

  // Build environment variables
  const env = buildTestEnv(config, credentials);

  // Determine test command
  const testCommand = options.command || 'npx playwright test';
  const testArgs = [];

  if (options.file) {
    testArgs.push(options.file);
  }

  if (!config.playwright.headless || options.headed) {
    testArgs.push('--headed');
  }

  if (options.ui) {
    testArgs.push('--ui');
  }

  console.log(chalk.dim(`Running: ${testCommand} ${testArgs.join(' ')}`));
  console.log('');

  const result = await executeTests(testCommand, testArgs, env);

  if (result.success) {
    showSuccess('All Tests Passed!', [
      `Duration: ${result.duration}s`,
      `Tests: ${result.passed} passed`,
    ]);
  } else {
    showError('Tests Failed', `${result.failed} test(s) failed`);
    if (result.output) {
      console.log(chalk.dim('\nOutput:'));
      console.log(result.output.slice(-2000));
    }
  }

  return result;
}

/**
 * Run Ralph Loop - continuous test-fix cycle
 */
async function runRalphLoop(config, credentials, options) {
  showHeader('Ralph Loop - Test-Fix Cycle');

  const maxIterations = options.max || config.ralphConfig?.maxIterations || 10;
  const completionPromise = config.ralphConfig?.completionPromise || 'all tasks complete';

  console.log(chalk.cyan(`Max iterations: ${maxIterations}`));
  console.log(chalk.cyan(`Completion phrase: "${completionPromise}"`));
  console.log('');

  // Initialize state
  const state = {
    iteration: 0,
    maxIterations,
    completionPromise,
    startedAt: new Date().toISOString(),
    history: [],
  };

  saveRalphState(state);

  // Build environment
  const env = buildTestEnv(config, credentials);

  let iteration = 0;
  let allPassed = false;

  while (iteration < maxIterations && !allPassed) {
    iteration++;
    state.iteration = iteration;

    console.log(chalk.cyan.bold(`\n═══ Iteration ${iteration}/${maxIterations} ═══\n`));

    // Run tests
    const result = await executeTests('npx playwright test', [], env);

    state.history.push({
      iteration,
      timestamp: new Date().toISOString(),
      passed: result.success,
      passedCount: result.passed,
      failedCount: result.failed,
      duration: result.duration,
    });

    saveRalphState(state);

    if (result.success) {
      allPassed = true;
      console.log(chalk.green.bold('\n✓ All tests passed!\n'));
    } else {
      console.log(chalk.yellow(`\n✗ ${result.failed} test(s) failed\n`));

      if (iteration < maxIterations) {
        // Show failures
        if (result.failedTests?.length > 0) {
          console.log(chalk.dim('Failed tests:'));
          for (const test of result.failedTests.slice(0, 5)) {
            console.log(chalk.dim(`  - ${test}`));
          }
        }

        // Prompt for fix or continue
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Continue - I\'ve made fixes, retry tests', value: 'continue' },
              { name: 'Show errors - View detailed error output', value: 'show' },
              { name: 'Stop - Exit Ralph loop', value: 'stop' },
            ],
          },
        ]);

        if (action === 'stop') {
          console.log(chalk.yellow('Ralph loop stopped by user.'));
          break;
        } else if (action === 'show') {
          console.log('\n' + chalk.dim('─'.repeat(60)));
          console.log(result.output?.slice(-3000) || 'No output captured');
          console.log(chalk.dim('─'.repeat(60)) + '\n');

          const { continueAfterShow } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'continueAfterShow',
              message: 'Continue with next iteration?',
              default: true,
            },
          ]);

          if (!continueAfterShow) {
            console.log(chalk.yellow('Ralph loop stopped.'));
            break;
          }
        }

        console.log(chalk.dim('\nWaiting for fixes... Press Enter when ready.\n'));
        await inquirer.prompt([
          {
            type: 'input',
            name: 'ready',
            message: 'Press Enter to continue...',
          },
        ]);
      }
    }
  }

  // Clean up
  cleanupRalphState();

  // Summary
  const totalDuration = state.history.reduce((sum, h) => sum + (h.duration || 0), 0);

  if (allPassed) {
    showSuccess('Ralph Loop Complete!', [
      `Iterations: ${iteration}`,
      `Total duration: ${totalDuration}s`,
      `Final result: All tests passing`,
    ]);
  } else {
    showError('Ralph Loop Stopped', [
      `Iterations: ${iteration}/${maxIterations}`,
      `Total duration: ${totalDuration}s`,
      `Final result: Tests still failing`,
    ]);
  }

  return { success: allPassed, iterations: iteration, state };
}

/**
 * Run watch mode - interactive test watching
 */
async function runWatchMode(config, credentials, options) {
  showHeader('Test Watch Mode');

  console.log(chalk.dim('Tests will re-run on file changes.'));
  console.log(chalk.dim('Press q to quit, r to re-run manually.'));
  console.log('');

  const env = buildTestEnv(config, credentials);

  // Use Playwright's built-in watch mode if available
  const args = ['--ui'];

  console.log(chalk.dim('Starting Playwright UI mode...'));
  console.log(chalk.dim('This opens an interactive test runner.'));
  console.log('');

  await executeTests('npx playwright test', args, env, { interactive: true });
}

/**
 * Execute tests and capture results
 */
function executeTests(command, args, env, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let output = '';
    let passed = 0;
    let failed = 0;
    const failedTests = [];

    const [cmd, ...cmdArgs] = command.split(' ');
    const allArgs = [...cmdArgs, ...args];

    const proc = spawn(cmd, allArgs, {
      env: { ...process.env, ...env },
      shell: true,
      stdio: options.interactive ? 'inherit' : 'pipe',
    });

    if (!options.interactive) {
      proc.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);

        // Parse test results from output
        const passMatch = text.match(/(\d+) passed/);
        const failMatch = text.match(/(\d+) failed/);

        if (passMatch) passed = parseInt(passMatch[1], 10);
        if (failMatch) failed = parseInt(failMatch[1], 10);

        // Capture failed test names
        const failedMatch = text.match(/✘\s+(.+)/g);
        if (failedMatch) {
          failedTests.push(...failedMatch.map((m) => m.replace('✘ ', '')));
        }
      });

      proc.stderr?.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stderr.write(text);
      });
    }

    proc.on('close', (code) => {
      const duration = Math.round((Date.now() - startTime) / 1000);

      resolve({
        success: code === 0,
        exitCode: code,
        passed,
        failed,
        failedTests,
        duration,
        output,
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
        output,
        duration: Math.round((Date.now() - startTime) / 1000),
      });
    });
  });
}

/**
 * Build environment variables for tests
 */
function buildTestEnv(config, credentials) {
  const env = {
    BASE_URL: config.environment.baseUrl,
    PLAYWRIGHT_BASE_URL: config.environment.baseUrl,
  };

  if (credentials) {
    env.TEST_USER_USERNAME = credentials.username;
    env.TEST_USER_PASSWORD = credentials.password;
  }

  if (config.playwright) {
    if (!config.playwright.headless) {
      env.HEADED = 'true';
    }
  }

  return env;
}

/**
 * Prompt for credentials
 */
async function promptCredentials() {
  const { username, password } = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Test username:',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Test password:',
      mask: '*',
    },
  ]);

  return { username, password };
}

/**
 * Save Ralph loop state
 */
function saveRalphState(state) {
  try {
    writeFileSync(RALPH_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Ignore errors
  }
}

/**
 * Load Ralph loop state
 */
function loadRalphState() {
  try {
    if (existsSync(RALPH_STATE_FILE)) {
      return JSON.parse(readFileSync(RALPH_STATE_FILE, 'utf8'));
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Clean up Ralph loop state
 */
function cleanupRalphState() {
  try {
    if (existsSync(RALPH_STATE_FILE)) {
      unlinkSync(RALPH_STATE_FILE);
    }
  } catch {
    // Ignore errors
  }
}
