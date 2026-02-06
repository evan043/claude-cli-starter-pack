/**
 * Settings Flow - Configuration menus and helpers
 *
 * Thin wrapper orchestrating settings submodules:
 * - settings/github.js - GitHub & Deployment configuration
 * - settings/services.js - Tunnel, token, and Happy Mode settings
 * - settings/advanced.js - Ralph Loop, GitHub Task, Vision & Epics
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getBypassPermissionsStatus,
  getVisionEpicsStatus,
  toggleBypassPermissions,
} from '../menu/helpers.js';
import { loadTechStack } from '../../utils.js';

// Import submodule functions
import { configureGitHub, configureDeployment } from './settings/github.js';
import { configureTunnel, configureToken, configureHappy } from './settings/services.js';
import {
  configureRalphLoop,
  configureGitHubTask,
  configureVisionEpics,
  configureOrchestration,
} from './settings/advanced.js';

/**
 * Show Project Settings submenu
 */
export async function showProjectSettingsMenu() {
  // Get current bypass status for display
  const bypassEnabled = getBypassPermissionsStatus();
  const bypassStatus = bypassEnabled ? chalk.green('ON') : chalk.red('OFF');
  const bypassLine = `   [P] Bypass All Permissions                             [${bypassStatus}]`;
  // eslint-disable-next-line no-control-regex
  const bypassPadding = ' '.repeat(79 - bypassLine.replace(/\x1B\[[0-9;]*m/g, '').length - 1);

  // Get Vision & Epics status
  const visionEpicsEnabled = getVisionEpicsStatus();
  const visionStatus = visionEpicsEnabled ? chalk.green('ON') : chalk.red('OFF');
  const visionLine = `   [V] Vision & Epics                                     [${visionStatus}]`;
  // eslint-disable-next-line no-control-regex
  const visionPadding = ' '.repeat(79 - visionLine.replace(/\x1B\[[0-9;]*m/g, '').length - 1);

  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('                           PROJECT CONFIGURATION                               ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠═══════════════════════════════════════════════════════════════════════════════╣'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + bypassLine + bypassPadding + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Toggle auto-approve all tool calls (use with caution)               ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + visionLine + visionPadding + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Enable strategic Vision & Epics layer (disabled by default)         ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('╠───────────────────────────────────────────────────────────────────────────────╣'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [1] GitHub Project Board                                                    ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + chalk.dim('       └─ Connect to GitHub Projects v2 for issue tracking                     ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [2] Deployment Platforms                                                    ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + chalk.dim('       └─ Configure Railway, Cloudflare, Vercel, or self-hosted               ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [3] Tunnel Services                                                         ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + chalk.dim('       └─ Set up ngrok, localtunnel, or cloudflare-tunnel                     ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [4] Token Management                                                        ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + chalk.dim('       └─ Customize daily budget and thresholds                               ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [5] Happy Mode                                                              ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + chalk.dim('       └─ Configure mobile app integration                                    ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [6] Ralph Loop                                                              ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + chalk.dim('       └─ Occurrence auditor, max iterations, web search                      ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [7] GitHub Task                                                             ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + chalk.dim('       └─ Auto-split detection, parallel agents, post-creation                ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [8] Orchestration (Parallel & Compacting)                                   ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + chalk.dim('       └─ Max parallel agents, compact threshold, poll interval               ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [B] Back to main menu                                                       ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  const { settingsAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'settingsAction',
      message: 'Select a configuration area:',
      choices: [
        { name: `P. Bypass All Permissions [${bypassEnabled ? 'ON' : 'OFF'}]`, value: 'bypass' },
        { name: `V. Vision & Epics [${visionEpicsEnabled ? 'ON' : 'OFF'}]`, value: 'vision-epics' },
        new inquirer.Separator(),
        { name: '1. GitHub Project Board', value: 'github' },
        { name: '2. Deployment Platforms', value: 'deployment' },
        { name: '3. Tunnel Services', value: 'tunnel' },
        { name: '4. Token Management', value: 'token' },
        { name: '5. Happy Mode', value: 'happy' },
        { name: '6. Ralph Loop', value: 'ralph-loop' },
        { name: '7. GitHub Task', value: 'github-task' },
        { name: '8. Orchestration (Parallel & Compacting)', value: 'orchestration' },
        new inquirer.Separator(),
        { name: 'Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (settingsAction === 'back') {
    return;
  }

  // Handle bypass toggle
  if (settingsAction === 'bypass') {
    const newState = toggleBypassPermissions();
    console.log('');
    if (newState) {
      console.log(chalk.green('  ✓ Bypass All Permissions: ON'));
      console.log(chalk.yellow('    All tool calls will be auto-approved'));
    } else {
      console.log(chalk.green('  ✓ Bypass All Permissions: OFF'));
      console.log(chalk.dim('    Using Accept Edits mode (prompts for Edit/Write/Bash)'));
    }
    console.log('');
    await showProjectSettingsMenu();
    return;
  }

  // Handle Vision & Epics toggle/configuration
  if (settingsAction === 'vision-epics') {
    await configureVisionEpics();
    await showProjectSettingsMenu();
    return;
  }

  // Load current tech-stack.json
  const techStack = loadTechStack();

  switch (settingsAction) {
    case 'github':
      await configureGitHub(techStack);
      break;
    case 'deployment':
      await configureDeployment(techStack);
      break;
    case 'tunnel':
      await configureTunnel(techStack);
      break;
    case 'token':
      await configureToken(techStack);
      break;
    case 'happy':
      await configureHappy(techStack);
      break;
    case 'ralph-loop':
      await configureRalphLoop(techStack);
      break;
    case 'github-task':
      await configureGitHubTask(techStack);
      break;
    case 'orchestration':
      await configureOrchestration(techStack);
      break;
  }

  // Show submenu again
  await showProjectSettingsMenu();
}

// Re-exports for backward compatibility (used by menu.js and main.js)
export {
  configureGitHub,
  configureDeployment,
  configureTunnel,
  configureToken,
  configureHappy,
};
