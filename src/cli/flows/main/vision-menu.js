/**
 * Vision Menu - Vision Mode submenu
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { runVision } from '../../../commands/vision.js';

/**
 * Show Vision Mode menu
 */
export async function showVisionModeMenu() {
  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('                      👁 VISION MODE - Autonomous MVP Development                ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠═══════════════════════════════════════════════════════════════════════════════╣'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + chalk.dim('  Transform natural language prompts into complete, working MVPs              ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('  through intelligent planning, agent orchestration, and self-healing.       ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [1] Initialize Vision     Create vision from natural language prompt        ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [2] View Status           Show all visions with progress                    ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [3] Run Vision            Execute autonomous development                    ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [4] Start Dashboard       Web UI with real-time updates                     ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [5] Security Scan         Scan packages for vulnerabilities                 ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }   [B] Back to main menu                                                       ${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an option:',
      choices: [
        { name: '1. Initialize Vision', value: 'init' },
        { name: '2. View Status', value: 'status' },
        { name: '3. Run Vision', value: 'run' },
        { name: '4. Start Dashboard', value: 'dashboard' },
        { name: '5. Security Scan', value: 'scan' },
        new inquirer.Separator(),
        { name: 'Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') {
    return;
  }

  switch (action) {
    case 'init': {
      const { prompt: visionPrompt } = await inquirer.prompt([
        {
          type: 'input',
          name: 'prompt',
          message: 'Describe what you want to build:',
        },
      ]);
      if (visionPrompt?.trim()) {
        await runVision('init', { prompt: visionPrompt.trim() });
      }
      break;
    }
    case 'status':
      await runVision('status', {});
      break;
    case 'run': {
      const { slug } = await inquirer.prompt([
        {
          type: 'input',
          name: 'slug',
          message: 'Vision slug (leave empty to list):',
        },
      ]);
      await runVision(slug?.trim() ? 'run' : 'list', { args: slug?.trim() ? [slug.trim()] : [] });
      break;
    }
    case 'dashboard':
      console.log(chalk.yellow('\n  Starting Vision Dashboard...'));
      console.log(chalk.dim('  This will block until you press Ctrl+C\n'));
      await runVision('dashboard', {});
      break;
    case 'scan':
      await runVision('scan', {});
      break;
  }
}
