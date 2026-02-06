/**
 * Settings Flow - Service Configuration
 *
 * Submodule: Tunnel, token management, and Happy Mode settings
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader, showSuccess } from '../../menu/display.js';
import { saveTechStack } from '../../../utils.js';

/**
 * Configure Tunnel Services
 */
export async function configureTunnel(techStack) {
  console.log('');
  showHeader('Tunnel Service Configuration');

  console.log(chalk.dim('  Tunnel services expose your local development server to the internet.'));
  console.log(chalk.dim('  Useful for mobile testing, webhooks, or sharing work-in-progress.\n'));

  const current = techStack.devEnvironment?.tunnel || {};

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'service',
      message: 'Which tunnel service would you like to use?',
      choices: [
        { name: 'None - I don\'t need tunnel access', value: 'none' },
        { name: 'ngrok - Popular tunneling service (requires ngrok CLI)', value: 'ngrok' },
        { name: 'localtunnel - Free, no signup required', value: 'localtunnel' },
        { name: 'cloudflare-tunnel - Enterprise-grade (requires CF account)', value: 'cloudflare-tunnel' },
        { name: 'serveo - Free SSH-based tunneling', value: 'serveo' },
        { name: 'Other - I\'ll configure manually', value: 'other' },
      ],
      default: current.service || 'none',
    },
    {
      type: 'input',
      name: 'subdomain',
      message: 'Reserved subdomain (optional):',
      when: (ans) => ['ngrok', 'localtunnel'].includes(ans.service),
      default: current.subdomain || '',
    },
    {
      type: 'number',
      name: 'adminPort',
      message: 'Admin/API port (for ngrok):',
      when: (ans) => ans.service === 'ngrok',
      default: current.adminPort || 4040,
    },
  ]);

  // Build start command based on service
  let startCommand = null;
  const frontendPort = techStack.frontend?.port || 5173;

  switch (answers.service) {
    case 'ngrok':
      startCommand = answers.subdomain
        ? `ngrok http ${frontendPort} --subdomain=${answers.subdomain}`
        : `ngrok http ${frontendPort}`;
      break;
    case 'localtunnel':
      startCommand = answers.subdomain
        ? `lt --port ${frontendPort} --subdomain ${answers.subdomain}`
        : `lt --port ${frontendPort}`;
      break;
    case 'cloudflare-tunnel':
      startCommand = `cloudflared tunnel --url http://localhost:${frontendPort}`;
      break;
    case 'serveo':
      startCommand = `ssh -R 80:localhost:${frontendPort} serveo.net`;
      break;
  }

  techStack.devEnvironment = techStack.devEnvironment || {};
  techStack.devEnvironment.tunnel = {
    service: answers.service,
    subdomain: answers.subdomain || null,
    url: null, // Set when tunnel is running
    startCommand,
    adminPort: answers.adminPort || null,
  };

  // Remove from pending configuration
  if (techStack._pendingConfiguration) {
    techStack._pendingConfiguration = techStack._pendingConfiguration.filter((f) => f !== 'tunnelServices');
  }

  saveTechStack(techStack);
  showSuccess('Tunnel configuration saved!', [
    '',
    answers.service !== 'none' ? `Start command: ${startCommand}` : 'Tunnel disabled',
  ]);
}

/**
 * Configure Token Management
 */
export async function configureToken(techStack) {
  console.log('');
  showHeader('Token Budget Management Configuration');

  const current = techStack.tokenManagement || {};
  const thresholds = current.thresholds || {};

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enabled',
      message: 'Enable token budget tracking?',
      default: current.enabled || false,
    },
    {
      type: 'number',
      name: 'dailyBudget',
      message: 'Daily token budget:',
      when: (ans) => ans.enabled,
      default: current.dailyBudget || 200000,
    },
    {
      type: 'number',
      name: 'compactThreshold',
      message: 'Compact suggestion threshold (0-1):',
      when: (ans) => ans.enabled,
      default: thresholds.compact || 0.75,
    },
    {
      type: 'number',
      name: 'archiveThreshold',
      message: 'Archive suggestion threshold (0-1):',
      when: (ans) => ans.enabled,
      default: thresholds.archive || 0.85,
    },
    {
      type: 'number',
      name: 'respawnThreshold',
      message: 'Force respawn threshold (0-1):',
      when: (ans) => ans.enabled,
      default: thresholds.respawn || 0.90,
    },
  ]);

  techStack.tokenManagement = {
    enabled: answers.enabled,
    dailyBudget: answers.dailyBudget || 200000,
    thresholds: answers.enabled ? {
      compact: answers.compactThreshold,
      archive: answers.archiveThreshold,
      respawn: answers.respawnThreshold,
    } : thresholds,
    trackingFile: current.trackingFile || '.claude/hooks/cache/token-usage.json',
  };

  saveTechStack(techStack);
  showSuccess('Token management configuration saved!');
}

/**
 * Configure Happy Mode
 */
export async function configureHappy(techStack) {
  console.log('');
  showHeader('Happy Mode Configuration');

  console.log(chalk.dim('  Happy Mode enables integration with the Happy Coder mobile app'));
  console.log(chalk.dim('  for remote session control, checkpoints, and mobile-optimized responses.\n'));

  const current = techStack.happyMode || {};
  const notifications = current.notifications || {};

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enabled',
      message: 'Enable Happy Mode integration?',
      default: current.enabled || false,
    },
    {
      type: 'input',
      name: 'dashboardUrl',
      message: 'Dashboard URL (if self-hosted, leave blank for cloud):',
      when: (ans) => ans.enabled,
      default: current.dashboardUrl || '',
    },
    {
      type: 'number',
      name: 'checkpointInterval',
      message: 'Checkpoint interval (minutes):',
      when: (ans) => ans.enabled,
      default: current.checkpointInterval || 10,
    },
    {
      type: 'list',
      name: 'verbosity',
      message: 'Response verbosity for mobile:',
      when: (ans) => ans.enabled,
      choices: [
        { name: 'Full - Complete responses', value: 'full' },
        { name: 'Condensed - Summarized responses (recommended)', value: 'condensed' },
        { name: 'Minimal - Bare essentials only', value: 'minimal' },
      ],
      default: current.verbosity || 'condensed',
    },
    {
      type: 'confirm',
      name: 'notifyTaskComplete',
      message: 'Notify on task completion?',
      when: (ans) => ans.enabled,
      default: notifications.onTaskComplete !== false,
    },
    {
      type: 'confirm',
      name: 'notifyError',
      message: 'Notify on errors?',
      when: (ans) => ans.enabled,
      default: notifications.onError !== false,
    },
  ]);

  techStack.happyMode = {
    enabled: answers.enabled,
    dashboardUrl: answers.dashboardUrl || null,
    checkpointInterval: answers.checkpointInterval || 10,
    verbosity: answers.verbosity || 'condensed',
    notifications: answers.enabled ? {
      onTaskComplete: answers.notifyTaskComplete,
      onError: answers.notifyError,
      onCheckpoint: false,
    } : notifications,
  };

  // Remove from pending configuration
  if (techStack._pendingConfiguration) {
    techStack._pendingConfiguration = techStack._pendingConfiguration.filter((f) => f !== 'happyMode');
  }

  saveTechStack(techStack);
  showSuccess('Happy Mode configuration saved!');
}
