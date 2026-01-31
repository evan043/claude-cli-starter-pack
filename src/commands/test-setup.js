/**
 * Testing Setup Wizard Command
 *
 * Interactive setup for testing configuration including:
 * - Testing mode (Ralph Loop, Manual, Minimal)
 * - Environment (localhost, ngrok, custom)
 * - Credentials (env vars, config file, prompt)
 * - Playwright configuration
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync } from 'fs';
import { join } from 'path';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import {
  TESTING_MODES,
  ENVIRONMENTS,
  CREDENTIAL_SOURCES,
  createTestingConfig,
  saveTestingConfig,
  saveTestingRules,
  loadTestingConfig,
  hasTestingConfig,
} from '../testing/config.js';

/**
 * Run the testing setup wizard
 */
export async function runTestSetup(options) {
  showHeader('Testing Setup Wizard');

  // Check for existing config
  if (hasTestingConfig() && !options.force) {
    const existing = loadTestingConfig();
    console.log(chalk.dim('Existing testing configuration found:'));
    console.log(chalk.dim(`  Mode: ${existing.mode}`));
    console.log(chalk.dim(`  Environment: ${existing.environment.type}`));
    console.log(chalk.dim(`  URL: ${existing.environment.baseUrl}`));
    console.log('');

    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Overwrite existing configuration?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Setup cancelled. Use --force to overwrite.'));
      return;
    }
  }

  const config = {};

  // Step 1: Testing Mode
  console.log(chalk.cyan.bold('\n📋 Step 1: Testing Mode\n'));

  const modeChoices = Object.entries(TESTING_MODES).map(([key, mode]) => ({
    name: `${mode.name}${mode.recommended ? chalk.green(' (Recommended)') : ''}\n   ${chalk.dim(mode.description)}`,
    value: key,
    short: mode.name,
  }));

  const { testingMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'testingMode',
      message: 'How should tests be run?',
      choices: modeChoices,
      default: 'ralph',
    },
  ]);

  config.mode = testingMode;

  // Ralph-specific configuration
  if (testingMode === 'ralph') {
    console.log('');
    console.log(chalk.dim('Ralph Loop continuously runs tests and retries fixes until all pass.'));

    const { maxIterations, completionPromise } = await inquirer.prompt([
      {
        type: 'number',
        name: 'maxIterations',
        message: 'Maximum retry iterations:',
        default: 10,
        validate: (n) => (n > 0 && n <= 50 ? true : 'Enter 1-50'),
      },
      {
        type: 'input',
        name: 'completionPromise',
        message: 'Completion phrase (what Claude should say when done):',
        default: 'all tasks complete and tests passing',
      },
    ]);

    config.maxIterations = maxIterations;
    config.completionPromise = completionPromise;
  }

  // Step 2: Environment
  console.log(chalk.cyan.bold('\n🌐 Step 2: Testing Environment\n'));

  const envChoices = Object.entries(ENVIRONMENTS).map(([key, env]) => ({
    name: `${env.name}${env.recommended ? chalk.green(' (Recommended)') : ''}\n   ${chalk.dim(env.description)}`,
    value: key,
    short: env.name,
  }));

  const { envType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'envType',
      message: 'Where should tests run?',
      choices: envChoices,
      default: 'localhost',
    },
  ]);

  config.envType = envType;

  // Environment-specific configuration
  if (envType === 'localhost') {
    const { port } = await inquirer.prompt([
      {
        type: 'number',
        name: 'port',
        message: 'Development server port:',
        default: 5173,
      },
    ]);
    config.port = port;
    config.baseUrl = `http://localhost:${port}`;
    config.requiresSetup = ['npm run dev'];
  } else if (envType === 'ngrok') {
    const { subdomain, port } = await inquirer.prompt([
      {
        type: 'input',
        name: 'subdomain',
        message: 'ngrok subdomain (e.g., my-app-name):',
        default: 'my.app',
        validate: (s) => (s.length > 0 ? true : 'Subdomain required'),
      },
      {
        type: 'number',
        name: 'port',
        message: 'Local port to tunnel:',
        default: 5173,
      },
    ]);
    config.port = port;
    config.baseUrl = `https://${subdomain}.ngrok.dev`;
    config.requiresSetup = ['npm run dev', `ngrok http ${port}`];
  } else if (envType === 'custom') {
    const { customUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customUrl',
        message: 'Custom testing URL:',
        default: 'https://example.com',
        validate: (url) => {
          try {
            new URL(url);
            return true;
          } catch {
            return 'Enter a valid URL';
          }
        },
      },
    ]);
    config.baseUrl = customUrl;
    config.requiresSetup = [];
  }

  // Step 3: Credentials
  console.log(chalk.cyan.bold('\n🔐 Step 3: Test Credentials\n'));

  const { needsAuth } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'needsAuth',
      message: 'Do your tests require login/authentication?',
      default: true,
    },
  ]);

  if (needsAuth) {
    const credChoices = Object.entries(CREDENTIAL_SOURCES)
      .filter(([key]) => key !== 'none')
      .map(([key, source]) => ({
        name: `${source.name}${source.recommended ? chalk.green(' (Recommended)') : ''}${source.secure ? chalk.blue(' 🔒') : ''}\n   ${chalk.dim(source.description)}`,
        value: key,
        short: source.name,
      }));

    const { credentialSource } = await inquirer.prompt([
      {
        type: 'list',
        name: 'credentialSource',
        message: 'How should credentials be managed?',
        choices: credChoices,
        default: 'env',
      },
    ]);

    config.credentialSource = credentialSource;

    if (credentialSource === 'env') {
      const { usernameVar, passwordVar } = await inquirer.prompt([
        {
          type: 'input',
          name: 'usernameVar',
          message: 'Username environment variable name:',
          default: 'TEST_USER_USERNAME',
        },
        {
          type: 'input',
          name: 'passwordVar',
          message: 'Password environment variable name:',
          default: 'TEST_USER_PASSWORD',
        },
      ]);

      config.envVars = {
        username: usernameVar,
        password: passwordVar,
      };

      // Check if env vars are set
      const hasUsername = !!process.env[usernameVar];
      const hasPassword = !!process.env[passwordVar];

      if (!hasUsername || !hasPassword) {
        console.log('');
        showWarning('Environment variables not currently set!');
        console.log(chalk.dim(`Add to your .env file or shell:`));
        console.log(chalk.dim(`  export ${usernameVar}="your_username"`));
        console.log(chalk.dim(`  export ${passwordVar}="your_password"`));
      }
    } else if (credentialSource === 'config') {
      showWarning('Storing credentials in config is not recommended for security.');
      console.log(chalk.dim('Consider using environment variables instead.'));
      console.log('');

      const { username, password } = await inquirer.prompt([
        {
          type: 'input',
          name: 'username',
          message: 'Test username:',
          validate: (u) => (u.length > 0 ? true : 'Username required'),
        },
        {
          type: 'password',
          name: 'password',
          message: 'Test password:',
          mask: '*',
          validate: (p) => (p.length > 0 ? true : 'Password required'),
        },
      ]);

      config.username = username;
      config.password = password;
    }

    // Login selectors
    console.log('');
    console.log(chalk.dim('Configure login form selectors (used by Playwright):'));

    const { customSelectors } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'customSelectors',
        message: 'Use custom selectors? (No = use defaults)',
        default: false,
      },
    ]);

    if (customSelectors) {
      const selectors = await inquirer.prompt([
        {
          type: 'input',
          name: 'usernameSelector',
          message: 'Username input selector:',
          default: '[data-testid="username-input"]',
        },
        {
          type: 'input',
          name: 'passwordSelector',
          message: 'Password input selector:',
          default: '[data-testid="password-input"]',
        },
        {
          type: 'input',
          name: 'loginButtonSelector',
          message: 'Login button selector:',
          default: '[data-testid="login-submit"]',
        },
        {
          type: 'input',
          name: 'loginSuccessSelector',
          message: 'Login success indicator selector:',
          default: '[data-testid="dashboard"]',
        },
      ]);

      Object.assign(config, selectors);
    }
  } else {
    config.credentialSource = 'none';
  }

  // Step 4: Playwright Configuration
  console.log(chalk.cyan.bold('\n🎭 Step 4: Playwright Configuration\n'));

  const { usePlaywright } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'usePlaywright',
      message: 'Will you use Playwright for E2E testing?',
      default: true,
    },
  ]);

  config.playwrightEnabled = usePlaywright;

  if (usePlaywright) {
    // Check if playwright is installed
    const playwrightConfigExists = existsSync(join(process.cwd(), 'playwright.config.ts')) ||
      existsSync(join(process.cwd(), 'playwright.config.js'));

    if (!playwrightConfigExists) {
      showInfo('No playwright.config found in current directory.');

      const { initPlaywright } = await inquirer.prompt([
        {
          type: 'list',
          name: 'initPlaywright',
          message: 'Would you like to initialize Playwright?',
          choices: [
            { name: 'Yes - Run npx playwright install', value: 'install' },
            { name: 'Skip - I\'ll set it up later', value: 'skip' },
            { name: 'Show me the commands', value: 'show' },
          ],
        },
      ]);

      if (initPlaywright === 'install') {
        console.log('');
        console.log(chalk.dim('Run these commands after setup:'));
        console.log(chalk.cyan('  npm init playwright@latest'));
        console.log(chalk.cyan('  npx playwright install'));
      } else if (initPlaywright === 'show') {
        console.log('');
        console.log(chalk.dim('Playwright setup commands:'));
        console.log(chalk.cyan('  npm init playwright@latest  # Initialize Playwright'));
        console.log(chalk.cyan('  npx playwright install      # Install browsers'));
        console.log(chalk.cyan('  npx playwright test         # Run tests'));
        console.log(chalk.cyan('  npx playwright test --ui    # Interactive UI mode'));
      }
    } else {
      console.log(chalk.green('✓ Playwright config found'));
    }

    const { browser, headless } = await inquirer.prompt([
      {
        type: 'list',
        name: 'browser',
        message: 'Default browser for tests:',
        choices: [
          { name: 'Chromium (Recommended)', value: 'chromium' },
          { name: 'Firefox', value: 'firefox' },
          { name: 'WebKit (Safari)', value: 'webkit' },
          { name: 'All browsers', value: 'all' },
        ],
        default: 'chromium',
      },
      {
        type: 'confirm',
        name: 'headless',
        message: 'Run tests in headless mode?',
        default: true,
      },
    ]);

    config.browser = browser;
    config.headless = headless;
  }

  // Step 5: Generate files
  console.log(chalk.cyan.bold('\n📄 Step 5: Generate Configuration\n'));

  const spinner = ora('Creating configuration files...').start();

  const testingConfig = createTestingConfig(config);

  // Save main config to tech-stack.json
  const configPath = saveTestingConfig(testingConfig);
  spinner.succeed('Saved testing config to tech-stack.json');

  // Save testing rules markdown - ask user AFTER spinner is stopped
  const { generateRules } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'generateRules',
      message: 'Generate TESTING_RULES.md documentation?',
      default: true,
    },
  ]);

  let rulesPath = null;
  if (generateRules) {
    const rulesSpinner = ora('Generating TESTING_RULES.md...').start();
    rulesPath = saveTestingRules(testingConfig);
    rulesSpinner.succeed('Saved TESTING_RULES.md to .claude/task-lists/');
  }

  // Summary
  const details = [
    `Mode: ${TESTING_MODES[config.mode].name}`,
    `Environment: ${config.baseUrl}`,
    `Credentials: ${CREDENTIAL_SOURCES[config.credentialSource].name}`,
    `Playwright: ${config.playwrightEnabled ? 'Enabled' : 'Disabled'}`,
    '',
    `Config saved to: ${configPath}`,
    'Testing config is now stored in tech-stack.json under the "testing" section.',
  ];

  if (rulesPath) {
    details.push(`Rules: ${rulesPath}`);
  }

  if (config.requiresSetup?.length > 0) {
    details.push('');
    details.push('Before running tests:');
    for (const cmd of config.requiresSetup) {
      details.push(`  ${cmd}`);
    }
  }

  showSuccess('Testing Setup Complete!', details);

  // Show next steps
  console.log(chalk.dim('\nNext steps:'));
  console.log(chalk.dim('  gtask test         - Run tests'));
  console.log(chalk.dim('  gtask test --watch - Watch mode'));
  if (config.mode === 'ralph') {
    console.log(chalk.dim('  gtask sync watch   - Start Ralph loop with task tracking'));
  }

  return testingConfig;
}
