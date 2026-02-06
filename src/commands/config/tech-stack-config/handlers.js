/**
 * Tech Stack Configuration Handlers
 *
 * User interaction handlers for editing tech stack sections
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader, showSuccess, showWarning, showError } from '../../../cli/menu.js';
import { detectTechStack } from '../../detect-tech-stack.js';
import { loadTechStack, saveTechStack } from './persistence.js';

/**
 * Configure Tech Stack settings submenu
 */
export async function configureTechStackSettings(returnToMain) {
  showHeader('Tech Stack Settings');

  const { section } = await inquirer.prompt([
    {
      type: 'list',
      name: 'section',
      message: 'What would you like to do?',
      choices: [
        {
          name: `${chalk.green('1)')} Auto-Detect Tech Stack         Scan codebase and detect technologies`,
          value: 'detect',
          short: 'Auto-Detect',
        },
        {
          name: `${chalk.cyan('2)')} Edit Frontend Settings         Framework, build tool, port`,
          value: 'frontend',
          short: 'Frontend',
        },
        {
          name: `${chalk.yellow('3)')} Edit Backend Settings          Language, framework, API style`,
          value: 'backend',
          short: 'Backend',
        },
        {
          name: `${chalk.blue('4)')} Edit Testing Settings          E2E, unit tests, selectors`,
          value: 'testing',
          short: 'Testing',
        },
        {
          name: `${chalk.magenta('5)')} Edit Deployment Settings       Platforms, URLs, CI/CD`,
          value: 'deployment',
          short: 'Deployment',
        },
        {
          name: `${chalk.red('6)')} Edit Dev Environment           Tunnel, container, package manager`,
          value: 'dev-env',
          short: 'Dev Environment',
        },
        {
          name: `${chalk.white('7)')} View Current Tech Stack        Show tech-stack.json`,
          value: 'view',
          short: 'View',
        },
        {
          name: `${chalk.green('8)')} Apply Templates                Update .claude files with values`,
          value: 'apply',
          short: 'Apply',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('Q)')} Back to Main Menu`,
          value: 'back',
          short: 'Back',
        },
      ],
    },
  ]);

  if (section === 'back') {
    return returnToMain ? await returnToMain() : null;
  }

  switch (section) {
    case 'detect':
      return await autoDetectTechStack(returnToMain);
    case 'frontend':
      return await editFrontendSettings(returnToMain);
    case 'backend':
      return await editBackendSettings(returnToMain);
    case 'testing':
      return await editTestingSettings(returnToMain);
    case 'deployment':
      return await editDeploymentSettings(returnToMain);
    case 'dev-env':
      return await editDevEnvironment(returnToMain);
    case 'view':
      return await viewTechStack(returnToMain);
    case 'apply': {
      // Import dynamically to avoid circular dependency
      const { applyTechStackTemplates } = await import('./applicator.js');
      return await applyTechStackTemplates(returnToMain);
    }
  }
}

/**
 * Auto-detect tech stack
 */
async function autoDetectTechStack(returnToMain) {
  showHeader('Auto-Detect Tech Stack');

  console.log(chalk.dim('Scanning your codebase to detect technologies...\n'));

  try {
    const detected = await detectTechStack(process.cwd());

    // Remove internal tracking
    delete detected._detected;

    console.log(chalk.green('\n✓ Detection complete!\n'));

    // Show summary
    const summary = [];
    if (detected.frontend?.framework) summary.push(`Frontend: ${detected.frontend.framework}`);
    if (detected.backend?.framework) summary.push(`Backend: ${detected.backend.framework} (${detected.backend.language})`);
    if (detected.database?.primary) summary.push(`Database: ${detected.database.primary}`);
    if (detected.testing?.e2e?.framework) summary.push(`E2E: ${detected.testing.e2e.framework}`);
    if (detected.versionControl?.provider) summary.push(`Git: ${detected.versionControl.owner}/${detected.versionControl.repo}`);

    console.log(chalk.cyan('Detected:'));
    summary.forEach((s) => console.log(`  ${s}`));
    console.log('');

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Save detected tech stack to .claude/config/tech-stack.json?',
        default: true,
      },
    ]);

    if (confirm) {
      const path = saveTechStack(detected);
      showSuccess('Tech Stack Saved', [`File: ${path}`]);
    }
  } catch (err) {
    showError('Detection failed', err.message);
  }

  return await configureTechStackSettings(returnToMain);
}

/**
 * Edit frontend settings
 */
async function editFrontendSettings(returnToMain) {
  showHeader('Frontend Settings');

  const techStack = loadTechStack() || { frontend: {} };

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: 'Frontend framework:',
      choices: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'astro', 'vanilla', 'none', 'other'],
      default: techStack.frontend?.framework || 'none',
    },
    {
      type: 'list',
      name: 'buildTool',
      message: 'Build tool:',
      choices: ['vite', 'webpack', 'esbuild', 'parcel', 'turbopack', 'none', 'other'],
      default: techStack.frontend?.buildTool || 'vite',
    },
    {
      type: 'list',
      name: 'stateManager',
      message: 'State manager:',
      choices: ['zustand', 'redux', 'mobx', 'jotai', 'pinia', 'vuex', 'none', 'other'],
      default: techStack.frontend?.stateManager || 'none',
    },
    {
      type: 'number',
      name: 'port',
      message: 'Dev server port:',
      default: techStack.frontend?.port || 5173,
    },
    {
      type: 'input',
      name: 'devCommand',
      message: 'Dev command:',
      default: techStack.frontend?.devCommand || 'npm run dev',
    },
    {
      type: 'input',
      name: 'buildCommand',
      message: 'Build command:',
      default: techStack.frontend?.buildCommand || 'npm run build',
    },
    {
      type: 'input',
      name: 'distDir',
      message: 'Build output directory:',
      default: techStack.frontend?.distDir || 'dist',
    },
  ]);

  techStack.frontend = answers;

  // Update local URLs
  if (!techStack.urls) techStack.urls = { local: {} };
  techStack.urls.local.frontend = `http://localhost:${answers.port}`;

  const path = saveTechStack(techStack);
  showSuccess('Frontend Settings Updated', [`File: ${path}`]);

  return await configureTechStackSettings(returnToMain);
}

/**
 * Edit backend settings
 */
async function editBackendSettings(returnToMain) {
  showHeader('Backend Settings');

  const techStack = loadTechStack() || { backend: {} };

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: 'Backend language:',
      choices: ['python', 'node', 'typescript', 'go', 'rust', 'java', 'ruby', 'none', 'other'],
      default: techStack.backend?.language || 'none',
    },
    {
      type: 'list',
      name: 'framework',
      message: 'Backend framework:',
      choices: ['fastapi', 'express', 'nestjs', 'django', 'flask', 'gin', 'rails', 'none', 'other'],
      default: techStack.backend?.framework || 'none',
    },
    {
      type: 'list',
      name: 'apiStyle',
      message: 'API style:',
      choices: ['rest', 'graphql', 'grpc', 'trpc', 'other'],
      default: techStack.backend?.apiStyle || 'rest',
    },
    {
      type: 'number',
      name: 'port',
      message: 'Backend port:',
      default: techStack.backend?.port || 8000,
    },
    {
      type: 'input',
      name: 'devCommand',
      message: 'Dev command:',
      default: techStack.backend?.devCommand || '',
    },
    {
      type: 'input',
      name: 'healthEndpoint',
      message: 'Health check endpoint:',
      default: techStack.backend?.healthEndpoint || '/api/health',
    },
  ]);

  techStack.backend = answers;

  // Update local URLs
  if (!techStack.urls) techStack.urls = { local: {} };
  techStack.urls.local.backend = `http://localhost:${answers.port}`;
  techStack.urls.local.api = `http://localhost:${answers.port}/api`;

  const path = saveTechStack(techStack);
  showSuccess('Backend Settings Updated', [`File: ${path}`]);

  return await configureTechStackSettings(returnToMain);
}

/**
 * Edit testing settings
 */
async function editTestingSettings(returnToMain) {
  showHeader('Testing Settings');

  const techStack = loadTechStack() || { testing: { e2e: {}, unit: {}, selectors: {}, credentials: {} } };

  const e2eAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: 'E2E testing framework:',
      choices: ['playwright', 'cypress', 'puppeteer', 'selenium', 'none', 'other'],
      default: techStack.testing?.e2e?.framework || 'none',
    },
    {
      type: 'input',
      name: 'configFile',
      message: 'E2E config file:',
      default: techStack.testing?.e2e?.configFile || 'playwright.config.ts',
    },
    {
      type: 'input',
      name: 'testCommand',
      message: 'E2E test command:',
      default: techStack.testing?.e2e?.testCommand || 'npx playwright test',
    },
  ]);

  const unitAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: 'Unit test framework:',
      choices: ['vitest', 'jest', 'mocha', 'pytest', 'none', 'other'],
      default: techStack.testing?.unit?.framework || 'none',
    },
    {
      type: 'input',
      name: 'testCommand',
      message: 'Unit test command:',
      default: techStack.testing?.unit?.testCommand || 'npm test',
    },
  ]);

  console.log(chalk.dim('\nLogin form selectors for E2E tests:\n'));

  const selectorAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'strategy',
      message: 'Selector strategy:',
      choices: ['data-testid', 'name', 'id', 'class', 'xpath'],
      default: techStack.testing?.selectors?.strategy || 'data-testid',
    },
    {
      type: 'input',
      name: 'username',
      message: 'Username field selector:',
      default: techStack.testing?.selectors?.username || '[data-testid="username-input"]',
    },
    {
      type: 'input',
      name: 'password',
      message: 'Password field selector:',
      default: techStack.testing?.selectors?.password || '[data-testid="password-input"]',
    },
    {
      type: 'input',
      name: 'loginButton',
      message: 'Login button selector:',
      default: techStack.testing?.selectors?.loginButton || '[data-testid="login-submit"]',
    },
    {
      type: 'input',
      name: 'loginSuccess',
      message: 'Login success indicator:',
      default: techStack.testing?.selectors?.loginSuccess || '[data-testid="dashboard"]',
    },
  ]);

  const credAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'usernameEnvVar',
      message: 'Username environment variable:',
      default: techStack.testing?.credentials?.usernameEnvVar || 'TEST_USER_USERNAME',
    },
    {
      type: 'input',
      name: 'passwordEnvVar',
      message: 'Password environment variable:',
      default: techStack.testing?.credentials?.passwordEnvVar || 'TEST_USER_PASSWORD',
    },
  ]);

  techStack.testing = {
    e2e: e2eAnswers,
    unit: unitAnswers,
    selectors: selectorAnswers,
    credentials: credAnswers,
  };

  const path = saveTechStack(techStack);
  showSuccess('Testing Settings Updated', [`File: ${path}`]);

  return await configureTechStackSettings(returnToMain);
}

/**
 * Edit deployment settings
 */
async function editDeploymentSettings(returnToMain) {
  showHeader('Deployment Settings');

  const techStack = loadTechStack() || { deployment: { frontend: {}, backend: {} } };

  console.log(chalk.dim('Frontend deployment:\n'));

  const frontendAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Frontend platform:',
      choices: ['cloudflare', 'vercel', 'netlify', 'aws-amplify', 'firebase', 'github-pages', 'railway', 'self-hosted', 'none', 'other'],
      default: techStack.deployment?.frontend?.platform || 'none',
    },
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (on platform):',
      default: techStack.deployment?.frontend?.projectName || '',
    },
    {
      type: 'input',
      name: 'productionUrl',
      message: 'Production URL:',
      default: techStack.deployment?.frontend?.productionUrl || '',
    },
    {
      type: 'input',
      name: 'deployCommand',
      message: 'Deploy command:',
      default: techStack.deployment?.frontend?.deployCommand || '',
    },
  ]);

  console.log(chalk.dim('\nBackend deployment:\n'));

  const backendAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Backend platform:',
      choices: ['railway', 'heroku', 'aws', 'gcp', 'azure', 'digitalocean', 'render', 'fly', 'self-hosted', 'none', 'other'],
      default: techStack.deployment?.backend?.platform || 'none',
    },
    {
      type: 'input',
      name: 'projectId',
      message: 'Project ID:',
      default: techStack.deployment?.backend?.projectId || '',
    },
    {
      type: 'input',
      name: 'serviceId',
      message: 'Service ID:',
      default: techStack.deployment?.backend?.serviceId || '',
    },
    {
      type: 'input',
      name: 'productionUrl',
      message: 'Production URL:',
      default: techStack.deployment?.backend?.productionUrl || '',
    },
  ]);

  const cicdAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'cicd',
      message: 'CI/CD platform:',
      choices: ['github-actions', 'gitlab-ci', 'circleci', 'jenkins', 'azure-devops', 'none', 'other'],
      default: techStack.deployment?.cicd || 'none',
    },
  ]);

  techStack.deployment = {
    frontend: frontendAnswers,
    backend: backendAnswers,
    cicd: cicdAnswer.cicd,
  };

  // Update production URLs
  if (!techStack.urls) techStack.urls = { production: {} };
  techStack.urls.production = {
    frontend: frontendAnswers.productionUrl,
    backend: backendAnswers.productionUrl,
  };

  const path = saveTechStack(techStack);
  showSuccess('Deployment Settings Updated', [`File: ${path}`]);

  return await configureTechStackSettings(returnToMain);
}

/**
 * Edit dev environment
 */
async function editDevEnvironment(returnToMain) {
  showHeader('Dev Environment Settings');

  const techStack = loadTechStack() || { devEnvironment: { tunnel: {} } };

  const tunnelAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'service',
      message: 'Tunnel service:',
      choices: ['ngrok', 'localtunnel', 'cloudflare-tunnel', 'serveo', 'none', 'other'],
      default: techStack.devEnvironment?.tunnel?.service || 'none',
    },
    {
      type: 'input',
      name: 'url',
      message: 'Tunnel URL (when active):',
      default: techStack.devEnvironment?.tunnel?.url || '',
    },
    {
      type: 'input',
      name: 'subdomain',
      message: 'Tunnel subdomain:',
      default: techStack.devEnvironment?.tunnel?.subdomain || '',
    },
    {
      type: 'input',
      name: 'startCommand',
      message: 'Tunnel start command:',
      default: techStack.devEnvironment?.tunnel?.startCommand || '',
    },
    {
      type: 'number',
      name: 'adminPort',
      message: 'Tunnel admin port (for ngrok: 4040):',
      default: techStack.devEnvironment?.tunnel?.adminPort || 4040,
    },
  ]);

  const envAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'container',
      message: 'Container runtime:',
      choices: ['docker', 'podman', 'colima', 'orbstack', 'none', 'other'],
      default: techStack.devEnvironment?.container || 'none',
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Package manager:',
      choices: ['npm', 'yarn', 'pnpm', 'bun', 'pip', 'poetry', 'cargo', 'go-mod', 'other'],
      default: techStack.devEnvironment?.packageManager || 'npm',
    },
  ]);

  techStack.devEnvironment = {
    tunnel: tunnelAnswers,
    container: envAnswers.container,
    packageManager: envAnswers.packageManager,
  };

  // Update tunnel URLs
  if (tunnelAnswers.url) {
    if (!techStack.urls) techStack.urls = { tunnel: {} };
    techStack.urls.tunnel = {
      frontend: tunnelAnswers.url,
      backend: tunnelAnswers.url,
    };
  }

  const path = saveTechStack(techStack);
  showSuccess('Dev Environment Updated', [`File: ${path}`]);

  return await configureTechStackSettings(returnToMain);
}

/**
 * View current tech stack
 */
async function viewTechStack(returnToMain) {
  showHeader('Current Tech Stack');

  const techStack = loadTechStack();

  if (!techStack) {
    showWarning('No tech-stack.json found.');
    console.log(chalk.dim('Run "Auto-Detect Tech Stack" to create one.'));
  } else {
    console.log(JSON.stringify(techStack, null, 2));
  }

  console.log('');
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What next?',
      choices: [
        { name: 'Back to Tech Stack Settings', value: 'back' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  if (action === 'back') {
    return await configureTechStackSettings(returnToMain);
  }

  return null;
}
