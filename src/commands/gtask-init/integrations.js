/**
 * gtask-init/integrations.js - Integration Configuration
 *
 * Handles:
 * - GitHub integration setup
 * - Tunnel service configuration
 * - Deployment platform configuration
 */

import inquirer from 'inquirer';

/**
 * Configure integrations (GitHub, tunnel, deployment)
 */
export async function configureIntegrations(techStack) {
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
