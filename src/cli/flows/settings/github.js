/**
 * Settings Flow - GitHub & Deployment Configuration
 *
 * Submodule: GitHub Project Board and deployment platform settings
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader, showSuccess } from '../../menu/display.js';
import { getDeployCommand } from '../../menu/helpers.js';
import { loadTechStack, saveTechStack } from '../../../utils.js';

/**
 * Configure GitHub Project Board
 */
export async function configureGitHub(techStack) {
  console.log('');
  showHeader('GitHub Project Board Configuration');

  const current = techStack.versionControl || {};
  const currentBoard = current.projectBoard || {};

  console.log(chalk.dim('  Current settings:'));
  console.log(chalk.dim(`    Provider: ${current.provider || 'not set'}`));
  console.log(chalk.dim(`    Owner: ${current.owner || 'not set'}`));
  console.log(chalk.dim(`    Repo: ${current.repo || 'not set'}`));
  console.log(chalk.dim(`    Project #: ${currentBoard.number || 'not set'}`));
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'owner',
      message: 'GitHub owner (username or org):',
      default: current.owner || '',
    },
    {
      type: 'input',
      name: 'repo',
      message: 'Repository name:',
      default: current.repo || '',
    },
    {
      type: 'number',
      name: 'projectNumber',
      message: 'GitHub Project number (from URL):',
      default: currentBoard.number || null,
    },
    {
      type: 'input',
      name: 'defaultBranch',
      message: 'Default branch:',
      default: current.defaultBranch || 'main',
    },
  ]);

  // Update tech-stack
  techStack.versionControl = {
    ...current,
    provider: 'github',
    owner: answers.owner,
    repo: answers.repo,
    defaultBranch: answers.defaultBranch,
    projectBoard: {
      type: 'github-projects',
      number: answers.projectNumber,
      url: answers.owner && answers.projectNumber
        ? `https://github.com/users/${answers.owner}/projects/${answers.projectNumber}`
        : null,
    },
  };

  // Remove from pending configuration
  if (techStack._pendingConfiguration) {
    techStack._pendingConfiguration = techStack._pendingConfiguration.filter((f) => f !== 'githubIntegration');
  }

  saveTechStack(techStack);
  showSuccess('GitHub configuration saved!');
}

/**
 * Configure Deployment Platforms
 */
export async function configureDeployment(techStack) {
  console.log('');
  showHeader('Deployment Platform Configuration');

  const { target } = await inquirer.prompt([
    {
      type: 'list',
      name: 'target',
      message: 'Which deployment target do you want to configure?',
      choices: [
        { name: 'Frontend (static sites, SPAs)', value: 'frontend' },
        { name: 'Backend (APIs, servers)', value: 'backend' },
        { name: 'Both', value: 'both' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (target === 'back') return;

  if (target === 'frontend' || target === 'both') {
    const frontendAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Frontend deployment platform:',
        choices: [
          { name: 'Cloudflare Pages', value: 'cloudflare' },
          { name: 'Vercel', value: 'vercel' },
          { name: 'Netlify', value: 'netlify' },
          { name: 'GitHub Pages', value: 'github-pages' },
          { name: 'Railway', value: 'railway' },
          { name: 'Self-hosted', value: 'self-hosted' },
          { name: 'None / Skip', value: 'none' },
        ],
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name (for deployment commands):',
        when: (ans) => ans.platform !== 'none',
      },
      {
        type: 'input',
        name: 'productionUrl',
        message: 'Production URL:',
        when: (ans) => ans.platform !== 'none',
      },
    ]);

    techStack.deployment = techStack.deployment || {};
    techStack.deployment.frontend = {
      platform: frontendAnswers.platform,
      projectName: frontendAnswers.projectName || null,
      productionUrl: frontendAnswers.productionUrl || null,
      deployCommand: getDeployCommand('frontend', frontendAnswers),
    };
  }

  if (target === 'backend' || target === 'both') {
    const backendAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Backend deployment platform:',
        choices: [
          { name: 'Railway', value: 'railway' },
          { name: 'Heroku', value: 'heroku' },
          { name: 'Render', value: 'render' },
          { name: 'Fly.io', value: 'fly' },
          { name: 'Vercel', value: 'vercel' },
          { name: 'DigitalOcean', value: 'digitalocean' },
          { name: 'Self-hosted (SSH)', value: 'self-hosted' },
          { name: 'None / Skip', value: 'none' },
        ],
      },
      {
        type: 'input',
        name: 'projectId',
        message: 'Project ID (from platform dashboard):',
        when: (ans) => ['railway', 'render', 'fly'].includes(ans.platform),
      },
      {
        type: 'input',
        name: 'serviceId',
        message: 'Service ID:',
        when: (ans) => ans.platform === 'railway',
      },
      {
        type: 'input',
        name: 'environmentId',
        message: 'Environment ID:',
        when: (ans) => ans.platform === 'railway',
      },
      {
        type: 'input',
        name: 'productionUrl',
        message: 'Production URL:',
        when: (ans) => ans.platform !== 'none',
      },
    ]);

    // Handle self-hosted config
    let selfHostedConfig = null;
    if (backendAnswers.platform === 'self-hosted') {
      const sshAnswers = await inquirer.prompt([
        { type: 'input', name: 'sshUser', message: 'SSH username:' },
        { type: 'input', name: 'sshHost', message: 'SSH host:' },
        { type: 'number', name: 'sshPort', message: 'SSH port:', default: 22 },
        { type: 'input', name: 'appPath', message: 'App path on server:' },
        { type: 'input', name: 'deployScript', message: 'Deploy script/command:', default: './deploy.sh' },
      ]);
      selfHostedConfig = sshAnswers;
    }

    techStack.deployment = techStack.deployment || {};
    techStack.deployment.backend = {
      platform: backendAnswers.platform,
      projectId: backendAnswers.projectId || null,
      serviceId: backendAnswers.serviceId || null,
      environmentId: backendAnswers.environmentId || null,
      productionUrl: backendAnswers.productionUrl || null,
      selfHostedConfig,
    };
  }

  // Remove from pending configuration
  if (techStack._pendingConfiguration) {
    techStack._pendingConfiguration = techStack._pendingConfiguration.filter((f) => f !== 'deploymentAutomation');
  }

  saveTechStack(techStack);
  showSuccess('Deployment configuration saved!');
}
