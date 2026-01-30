/**
 * gtask-init - Global Project Initialization
 *
 * This command can be run from any Claude Code session to initialize
 * the advanced starter pack in the current project directory.
 *
 * Features:
 * - Auto-detects tech stack from codebase
 * - Creates tech-stack.json with detected values
 * - Generates templated .claude files
 * - Sets up GitHub integration
 * - Configures testing framework
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { detectTechStack } from './detect-tech-stack.js';
import { processDirectory, generateTechStack } from '../utils/template-engine.js';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main initialization wizard
 */
export async function runGtaskInit(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();

  showHeader('Claude CLI Advanced Starter Pack - Project Setup');

  console.log(chalk.dim('This wizard will configure the advanced starter pack for your project.\n'));

  // Check if already initialized
  const techStackPath = join(projectRoot, '.claude', 'config', 'tech-stack.json');
  if (existsSync(techStackPath)) {
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: chalk.yellow('Project already initialized. Re-run setup?'),
        default: false,
      },
    ]);
    if (!proceed) {
      console.log(chalk.dim('Setup cancelled.'));
      return null;
    }
  }

  // Step 1: Detect tech stack
  console.log(chalk.cyan('\n📦 Step 1: Detecting Tech Stack\n'));

  const spinner = ora('Scanning codebase...').start();
  let detected;

  try {
    detected = await detectTechStack(projectRoot, { silent: true });
    delete detected._detected;
    spinner.succeed('Codebase analysis complete');
  } catch (err) {
    spinner.fail('Detection failed');
    showError('Could not analyze codebase', err.message);
    detected = { version: '1.0.0', project: { name: '', rootPath: '.' } };
  }

  // Display detected values
  console.log('');
  displayDetectedStack(detected);

  // Step 2: Confirm and customize
  console.log(chalk.cyan('\n📝 Step 2: Review & Customize\n'));

  const { customize } = await inquirer.prompt([
    {
      type: 'list',
      name: 'customize',
      message: 'How would you like to proceed?',
      choices: [
        { name: 'Accept detected values', value: 'accept' },
        { name: 'Customize settings', value: 'customize' },
        { name: 'Start from scratch', value: 'scratch' },
      ],
    },
  ]);

  let techStack = detected;

  if (customize === 'customize') {
    techStack = await customizeSettings(detected);
  } else if (customize === 'scratch') {
    techStack = await fullSetup();
  }

  // Step 3: Configure integrations
  console.log(chalk.cyan('\n🔗 Step 3: Configure Integrations\n'));

  techStack = await configureIntegrations(techStack);

  // Step 4: Save configuration
  console.log(chalk.cyan('\n💾 Step 4: Save Configuration\n'));

  // Ensure directories exist
  const configDir = join(projectRoot, '.claude', 'config');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Save tech-stack.json
  writeFileSync(
    join(configDir, 'tech-stack.json'),
    JSON.stringify(techStack, null, 2),
    'utf8'
  );

  console.log(chalk.green('✓ Saved: .claude/config/tech-stack.json'));

  // Step 5: Generate templates
  const { generateTemplates } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'generateTemplates',
      message: 'Generate .claude command templates?',
      default: true,
    },
  ]);

  if (generateTemplates) {
    await generateCommandTemplates(projectRoot, techStack);
  }

  // Step 6: Complete
  console.log(chalk.cyan('\n✅ Setup Complete!\n'));

  showSuccess('Project Initialized', [
    'Tech stack: .claude/config/tech-stack.json',
    generateTemplates ? 'Commands: .claude/commands/' : '',
    '',
    'Next steps:',
    '  1. Review generated files',
    '  2. Run "gtask claude-settings" to fine-tune',
    '  3. Use "/create-task-list" to start working',
  ].filter(Boolean));

  return techStack;
}

/**
 * Display detected stack summary
 */
function displayDetectedStack(stack) {
  const items = [];

  if (stack.frontend?.framework) {
    items.push(`Frontend: ${chalk.cyan(stack.frontend.framework)}` +
      (stack.frontend.buildTool ? ` (${stack.frontend.buildTool})` : '') +
      ` on port ${stack.frontend.port || 5173}`);
  }

  if (stack.backend?.framework) {
    items.push(`Backend: ${chalk.cyan(stack.backend.framework)}` +
      (stack.backend.language ? ` (${stack.backend.language})` : '') +
      ` on port ${stack.backend.port || 8000}`);
  }

  if (stack.database?.primary) {
    items.push(`Database: ${chalk.cyan(stack.database.primary)}` +
      (stack.database.orm ? ` with ${stack.database.orm}` : ''));
  }

  if (stack.testing?.e2e?.framework) {
    items.push(`E2E Testing: ${chalk.cyan(stack.testing.e2e.framework)}`);
  }

  if (stack.testing?.unit?.framework) {
    items.push(`Unit Testing: ${chalk.cyan(stack.testing.unit.framework)}`);
  }

  if (stack.versionControl?.provider) {
    items.push(`Repository: ${chalk.cyan(stack.versionControl.owner + '/' + stack.versionControl.repo)}`);
  }

  if (stack.devEnvironment?.packageManager) {
    items.push(`Package Manager: ${chalk.cyan(stack.devEnvironment.packageManager)}`);
  }

  if (items.length === 0) {
    console.log(chalk.dim('  No technologies detected automatically.'));
  } else {
    items.forEach((item) => console.log(`  ${item}`));
  }
}

/**
 * Quick customize essential settings
 */
async function customizeSettings(detected) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: detected.project?.name || '',
    },
    {
      type: 'list',
      name: 'frontendFramework',
      message: 'Frontend framework:',
      choices: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'vanilla', 'none'],
      default: detected.frontend?.framework || 'none',
    },
    {
      type: 'number',
      name: 'frontendPort',
      message: 'Frontend port:',
      default: detected.frontend?.port || 5173,
    },
    {
      type: 'list',
      name: 'backendFramework',
      message: 'Backend framework:',
      choices: ['fastapi', 'express', 'nestjs', 'django', 'flask', 'rails', 'none'],
      default: detected.backend?.framework || 'none',
    },
    {
      type: 'number',
      name: 'backendPort',
      message: 'Backend port:',
      default: detected.backend?.port || 8000,
    },
    {
      type: 'list',
      name: 'e2eFramework',
      message: 'E2E testing framework:',
      choices: ['playwright', 'cypress', 'puppeteer', 'none'],
      default: detected.testing?.e2e?.framework || 'none',
    },
  ]);

  // Merge answers into detected
  return generateTechStack(detected, {
    project: { name: answers.projectName },
    frontend: {
      framework: answers.frontendFramework,
      port: answers.frontendPort,
    },
    backend: {
      framework: answers.backendFramework,
      port: answers.backendPort,
    },
    testing: {
      e2e: { framework: answers.e2eFramework },
    },
  });
}

/**
 * Full setup from scratch
 */
async function fullSetup() {
  const techStack = {
    version: '1.0.0',
    project: {},
    frontend: {},
    backend: {},
    database: {},
    deployment: { frontend: {}, backend: {} },
    devEnvironment: { tunnel: {} },
    testing: { e2e: {}, unit: {}, selectors: {}, credentials: {} },
    versionControl: { projectBoard: {} },
    urls: { local: {}, tunnel: {}, production: {} },
  };

  // Project
  const projectAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: '',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: '',
    },
  ]);
  techStack.project = projectAnswers;

  // Frontend
  const frontendAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: 'Frontend framework:',
      choices: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'vanilla', 'none'],
    },
    {
      type: 'list',
      name: 'buildTool',
      message: 'Build tool:',
      choices: ['vite', 'webpack', 'esbuild', 'parcel', 'none'],
      default: 'vite',
    },
    {
      type: 'number',
      name: 'port',
      message: 'Dev server port:',
      default: 5173,
    },
  ]);
  techStack.frontend = frontendAnswers;

  // Backend
  const backendAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: 'Backend language:',
      choices: ['python', 'node', 'typescript', 'go', 'rust', 'none'],
    },
    {
      type: 'list',
      name: 'framework',
      message: 'Backend framework:',
      choices: ['fastapi', 'express', 'nestjs', 'django', 'flask', 'gin', 'none'],
    },
    {
      type: 'number',
      name: 'port',
      message: 'Backend port:',
      default: 8000,
    },
  ]);
  techStack.backend = backendAnswers;

  // Database
  const dbAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'primary',
      message: 'Database:',
      choices: ['postgresql', 'mysql', 'mongodb', 'sqlite', 'none'],
    },
    {
      type: 'list',
      name: 'orm',
      message: 'ORM:',
      choices: ['prisma', 'drizzle', 'typeorm', 'sqlalchemy', 'none'],
    },
  ]);
  techStack.database = dbAnswers;

  // Testing
  const testingAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'e2e',
      message: 'E2E testing framework:',
      choices: ['playwright', 'cypress', 'puppeteer', 'none'],
    },
    {
      type: 'list',
      name: 'unit',
      message: 'Unit testing framework:',
      choices: ['vitest', 'jest', 'mocha', 'pytest', 'none'],
    },
  ]);
  techStack.testing.e2e.framework = testingAnswers.e2e;
  techStack.testing.unit.framework = testingAnswers.unit;

  // URLs
  techStack.urls.local = {
    frontend: `http://localhost:${frontendAnswers.port}`,
    backend: `http://localhost:${backendAnswers.port}`,
    api: `http://localhost:${backendAnswers.port}/api`,
  };

  return techStack;
}

/**
 * Configure integrations (GitHub, tunnel, deployment)
 */
async function configureIntegrations(techStack) {
  // GitHub integration
  const { hasGitHub } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasGitHub',
      message: 'Configure GitHub integration?',
      default: !!techStack.versionControl?.provider,
    },
  ]);

  if (hasGitHub) {
    const githubAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'owner',
        message: 'GitHub username/org:',
        default: techStack.versionControl?.owner || '',
      },
      {
        type: 'input',
        name: 'repo',
        message: 'Repository name:',
        default: techStack.versionControl?.repo || '',
      },
      {
        type: 'list',
        name: 'projectBoard',
        message: 'Project board type:',
        choices: ['github-projects', 'jira', 'linear', 'trello', 'none'],
        default: 'github-projects',
      },
      {
        type: 'number',
        name: 'projectNumber',
        message: 'GitHub Project number (if using GitHub Projects):',
        default: null,
        when: (answers) => answers.projectBoard === 'github-projects',
      },
    ]);

    techStack.versionControl = {
      ...techStack.versionControl,
      provider: 'github',
      owner: githubAnswers.owner,
      repo: githubAnswers.repo,
      projectBoard: {
        type: githubAnswers.projectBoard,
        number: githubAnswers.projectNumber || null,
      },
    };
  }

  // Tunnel configuration
  const { hasTunnel } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasTunnel',
      message: 'Configure tunnel service (ngrok, etc.)?',
      default: false,
    },
  ]);

  if (hasTunnel) {
    const tunnelAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'service',
        message: 'Tunnel service:',
        choices: ['ngrok', 'localtunnel', 'cloudflare-tunnel', 'none'],
      },
      {
        type: 'input',
        name: 'subdomain',
        message: 'Subdomain (if reserved):',
        default: '',
        when: (answers) => answers.service === 'ngrok',
      },
    ]);

    techStack.devEnvironment = {
      ...techStack.devEnvironment,
      tunnel: {
        service: tunnelAnswers.service,
        subdomain: tunnelAnswers.subdomain || null,
        adminPort: tunnelAnswers.service === 'ngrok' ? 4040 : null,
      },
    };

    if (tunnelAnswers.subdomain) {
      techStack.urls.tunnel = {
        frontend: `https://${tunnelAnswers.subdomain}.ngrok.dev`,
        backend: `https://${tunnelAnswers.subdomain}.ngrok.dev`,
      };
    }
  }

  // Deployment configuration
  const { hasDeployment } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasDeployment',
      message: 'Configure deployment platforms?',
      default: false,
    },
  ]);

  if (hasDeployment) {
    const deployAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'frontend',
        message: 'Frontend deployment:',
        choices: ['cloudflare', 'vercel', 'netlify', 'github-pages', 'self-hosted', 'none'],
      },
      {
        type: 'input',
        name: 'frontendUrl',
        message: 'Frontend production URL:',
        default: '',
        when: (answers) => answers.frontend !== 'none',
      },
      {
        type: 'list',
        name: 'backend',
        message: 'Backend deployment:',
        choices: ['railway', 'heroku', 'render', 'fly', 'self-hosted', 'none'],
      },
      {
        type: 'input',
        name: 'backendUrl',
        message: 'Backend production URL:',
        default: '',
        when: (answers) => answers.backend !== 'none',
      },
    ]);

    techStack.deployment = {
      frontend: {
        platform: deployAnswers.frontend,
        productionUrl: deployAnswers.frontendUrl || '',
      },
      backend: {
        platform: deployAnswers.backend,
        productionUrl: deployAnswers.backendUrl || '',
      },
    };

    techStack.urls.production = {
      frontend: deployAnswers.frontendUrl || '',
      backend: deployAnswers.backendUrl || '',
    };
  }

  return techStack;
}

/**
 * Generate command templates
 */
async function generateCommandTemplates(projectRoot, techStack) {
  const spinner = ora('Generating command templates...').start();

  const commandsDir = join(projectRoot, '.claude', 'commands');
  if (!existsSync(commandsDir)) {
    mkdirSync(commandsDir, { recursive: true });
  }

  // Generate TESTING_RULES.md
  const testingRulesContent = generateTestingRules(techStack);
  writeFileSync(
    join(projectRoot, '.claude', 'task-lists', 'TESTING_RULES.md'),
    testingRulesContent,
    'utf8'
  );

  // Ensure task-lists dir exists
  const taskListsDir = join(projectRoot, '.claude', 'task-lists');
  if (!existsSync(taskListsDir)) {
    mkdirSync(taskListsDir, { recursive: true });
  }
  writeFileSync(
    join(taskListsDir, 'TESTING_RULES.md'),
    testingRulesContent,
    'utf8'
  );

  spinner.succeed('Command templates generated');
  console.log(chalk.green('  ✓ .claude/task-lists/TESTING_RULES.md'));
}

/**
 * Generate TESTING_RULES.md from tech stack
 */
function generateTestingRules(techStack) {
  const tunnelUrl = techStack.urls?.tunnel?.frontend || '{{TUNNEL_URL}}';
  const prodUrl = techStack.urls?.production?.frontend || '{{PRODUCTION_URL}}';
  const backendUrl = techStack.urls?.production?.backend || '{{BACKEND_URL}}';
  const selectors = techStack.testing?.selectors || {};

  return `# Testing Rules (Auto-Generated)

## Environment URLs

| Environment | Frontend | Backend |
|-------------|----------|---------|
| Local | http://localhost:${techStack.frontend?.port || 5173} | http://localhost:${techStack.backend?.port || 8000} |
| Tunnel | ${tunnelUrl} | ${tunnelUrl} |
| Production | ${prodUrl} | ${backendUrl} |

## Login Credentials

- **Username Variable**: \`${techStack.testing?.credentials?.usernameEnvVar || 'TEST_USER_USERNAME'}\`
- **Password Variable**: \`${techStack.testing?.credentials?.passwordEnvVar || 'TEST_USER_PASSWORD'}\`

## Login Selectors

| Element | Selector |
|---------|----------|
| Username | \`${selectors.username || '[data-testid="username-input"]'}\` |
| Password | \`${selectors.password || '[data-testid="password-input"]'}\` |
| Login Button | \`${selectors.loginButton || '[data-testid="login-submit"]'}\` |
| Success Indicator | \`${selectors.loginSuccess || '[data-testid="dashboard"]'}\` |

## E2E Testing

- **Framework**: ${techStack.testing?.e2e?.framework || 'playwright'}
- **Config**: ${techStack.testing?.e2e?.configFile || 'playwright.config.ts'}
- **Command**: \`${techStack.testing?.e2e?.testCommand || 'npx playwright test'}\`

## Unit Testing

- **Framework**: ${techStack.testing?.unit?.framework || 'vitest'}
- **Command**: \`${techStack.testing?.unit?.testCommand || 'npm test'}\`

## Deployment

- **Frontend Platform**: ${techStack.deployment?.frontend?.platform || 'not configured'}
- **Backend Platform**: ${techStack.deployment?.backend?.platform || 'not configured'}

## Task Workflow

1. Debug with curl/fetch first
2. ${techStack.testing?.e2e?.framework ? `Run ${techStack.testing.e2e.framework} tests` : 'Manual testing'}
3. Commit after each task

---
*Generated by gtask-init on ${new Date().toISOString()}*
`;
}

export default { runGtaskInit };
