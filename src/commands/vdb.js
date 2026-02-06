/**
 * VDB Command
 *
 * CLI command for Vision Driver Bot operations.
 * Wraps the VDB modules for use in CCASP CLI.
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { showHeader } from '../cli/menu.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main VDB command handler
 */
export async function vdbCommand(subcommand, options = {}) {
  const projectRoot = process.cwd();

  switch (subcommand) {
    case 'init':
      return await initVDB(projectRoot, options);

    case 'status':
      return await showStatus(projectRoot);

    case 'scan':
      return await scanBoard(projectRoot, options);

    case 'execute':
    case 'execute-next':
      return await executeNext(projectRoot, options);

    case 'queue':
      return await showQueue(projectRoot);

    case 'stats':
      return await showStats(projectRoot, options.days || 7);

    case 'clear':
      return await clearQueue(projectRoot);

    default:
      showVDBHelp();
      return;
  }
}

/**
 * Initialize VDB for a project
 */
async function initVDB(projectRoot, options = {}) {
  showHeader();

  console.log(chalk.cyan.bold('\n  🤖 Vision Driver Bot Setup\n'));
  console.log(chalk.gray('  Autonomous development from your Vision/Epic board\n'));

  // Check if already initialized
  const configPath = join(projectRoot, '.claude/vdb/config.json');
  if (existsSync(configPath) && !options.force) {
    console.log(chalk.yellow('  ⚠ VDB is already initialized in this project.'));
    console.log(chalk.gray('  Use --force to reinitialize.\n'));

    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Reinitialize VDB?',
      default: false
    }]);

    if (!proceed) return;
  }

  const spinner = ora('Initializing VDB...').start();

  try {
    // Import VDB modules
    const { createDefaultConfig } = await import('../vdb/config.js');

    // Create config
    const config = await createDefaultConfig(projectRoot, options);
    spinner.succeed('Created VDB configuration');

    // Create directories
    const dirs = [
      '.claude/vdb',
      '.claude/vdb/logs',
      '.claude/vdb/summaries'
    ];

    for (const dir of dirs) {
      const fullPath = join(projectRoot, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    }
    console.log(chalk.green('  ✓ Created VDB directories'));

    // Copy GitHub Actions workflow
    const workflowSource = join(__dirname, '../../templates/workflows/vision-driver-bot.yml');
    const workflowDest = join(projectRoot, '.github/workflows/vision-driver-bot.yml');

    if (existsSync(workflowSource)) {
      const workflowDir = dirname(workflowDest);
      if (!existsSync(workflowDir)) {
        mkdirSync(workflowDir, { recursive: true });
      }
      copyFileSync(workflowSource, workflowDest);
      console.log(chalk.green('  ✓ Installed GitHub Actions workflow'));
    }

    // Create .gitignore for VDB runtime files
    const gitignorePath = join(projectRoot, '.claude/vdb/.gitignore');
    writeFileSync(gitignorePath, `# VDB runtime files
current-prompt.txt
current-task.json
execution-output.txt
last-scan.json
last-decision.json
*.log
`, 'utf8');

    // Show success and next steps
    console.log(chalk.green.bold('\n  ✅ VDB initialized successfully!\n'));

    console.log(chalk.cyan('  ┌─────────────────────────────────────────────────────────────┐'));
    console.log(chalk.cyan('  │') + chalk.white.bold('                    NEXT STEPS                              ') + chalk.cyan('│'));
    console.log(chalk.cyan('  ├─────────────────────────────────────────────────────────────┤'));
    console.log(chalk.cyan('  │') + chalk.white(' 1. Add secrets to your GitHub repository:                   ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.yellow('    • ANTHROPIC_API_KEY') + chalk.gray(' - Your Anthropic API key          ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.yellow('    • VDB_PAT') + chalk.gray(' - Personal Access Token (repo+project)    ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.white('                                                              ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.white(' 2. (Optional) Create a GitHub Project board:                ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.gray(`    gh project create --owner ${config.boards.github.owner} --title "Vision"`) + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.white('                                                              ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.white(' 3. Create epics using:                                      ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.gray('    • /create-github-epic command                            ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.gray('    • Or issues with "epic" label on GitHub                  ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.white('                                                              ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.white(' 4. Push to trigger the workflow:                            ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.gray('    git add .claude .github                                  ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.gray('    git commit -m "feat: initialize Vision Driver Bot"       ') + chalk.cyan('│'));
    console.log(chalk.cyan('  │') + chalk.gray('    git push                                                 ') + chalk.cyan('│'));
    console.log(chalk.cyan('  └─────────────────────────────────────────────────────────────┘'));

    console.log(chalk.gray('\n  The bot will start scanning every 15 minutes after push.\n'));

    return config;

  } catch (error) {
    spinner.fail('Failed to initialize VDB');
    console.error(chalk.red(`  Error: ${error.message}`));
    throw error;
  }
}

/**
 * Show VDB status
 */
async function showStatus(projectRoot) {
  const configPath = join(projectRoot, '.claude/vdb/config.json');

  if (!existsSync(configPath)) {
    console.log(chalk.yellow('\n  ⚠ VDB is not initialized. Run: ccasp vdb init\n'));
    return;
  }

  try {
    const { VisionDriverBot } = await import('../vdb/index.js');
    const vdb = new VisionDriverBot();
    await vdb.initialize(projectRoot);

    const status = await vdb.getStatus();

    console.log(chalk.cyan('\n  ╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('  ║') + chalk.white.bold('                  VISION DRIVER BOT STATUS                    ') + chalk.cyan('║'));
    console.log(chalk.cyan('  ╠══════════════════════════════════════════════════════════════╣'));

    // Config summary
    const gh = status.config.boards?.github;
    console.log(chalk.cyan('  ║') + chalk.gray(' Repository: ') + chalk.white(`${gh?.owner}/${gh?.repo}`.padEnd(45)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.gray(' Primary Board: ') + chalk.white(status.config.boards?.primary?.padEnd(42)) + chalk.cyan('║'));

    // Queue status
    const queue = status.queue || {};
    console.log(chalk.cyan('  ╠══════════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan('  ║') + chalk.yellow.bold(' QUEUE'.padEnd(61)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.gray(' ├─ Queued: ') + chalk.white(String(queue.queued || 0).padEnd(47)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.gray(' ├─ Executing: ') + chalk.white(String(queue.executing || 0).padEnd(44)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.gray(' └─ Total: ') + chalk.white(String(queue.total || 0).padEnd(48)) + chalk.cyan('║'));

    // Last scan
    if (status.lastScan) {
      console.log(chalk.cyan('  ╠══════════════════════════════════════════════════════════════╣'));
      console.log(chalk.cyan('  ║') + chalk.gray(' Last Scan: ') + chalk.white(status.lastScan.padEnd(47)) + chalk.cyan('║'));
    }

    console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════════════╝\n'));

  } catch (error) {
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
  }
}

/**
 * Scan board for actionable items
 */
async function scanBoard(projectRoot, options = {}) {
  const configPath = join(projectRoot, '.claude/vdb/config.json');

  if (!existsSync(configPath)) {
    console.log(chalk.yellow('\n  ⚠ VDB is not initialized. Run: ccasp vdb init\n'));
    return;
  }

  const spinner = ora('Scanning Vision board...').start();

  try {
    const { VisionDriverBot } = await import('../vdb/index.js');
    const vdb = new VisionDriverBot();
    await vdb.initialize(projectRoot);

    const result = await vdb.scan();
    spinner.succeed('Scan complete');

    console.log(chalk.cyan('\n  ╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('  ║') + chalk.white.bold('                     VDB BOARD SCAN                            ') + chalk.cyan('║'));
    console.log(chalk.cyan('  ╠══════════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan('  ║') + chalk.gray(' Epics scanned: ') + chalk.white(String(result.boardState?.epics?.length || 0).padEnd(42)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.gray(' Actionable found: ') + chalk.white(String(result.actionable?.length || 0).padEnd(39)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.gray(' Queue size: ') + chalk.white(String(result.queueStatus?.total || 0).padEnd(45)) + chalk.cyan('║'));

    if (result.actionable?.length > 0) {
      console.log(chalk.cyan('  ╠══════════════════════════════════════════════════════════════╣'));
      console.log(chalk.cyan('  ║') + chalk.yellow.bold(' TOP ACTIONABLE ITEMS:'.padEnd(61)) + chalk.cyan('║'));

      for (let i = 0; i < Math.min(5, result.actionable.length); i++) {
        const item = result.actionable[i];
        const title = (item.phase_title || item.phase_id).substring(0, 40);
        console.log(chalk.cyan('  ║') + chalk.gray(` ${i + 1}. `) + chalk.white(title.padEnd(55)) + chalk.cyan('║'));
        console.log(chalk.cyan('  ║') + chalk.gray(`    Score: ${item.priority} | Complexity: ${item.complexity}`.padEnd(58)) + chalk.cyan('║'));
      }
    }

    console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════════════╝\n'));

    return result;

  } catch (error) {
    spinner.fail('Scan failed');
    console.error(chalk.red(`  Error: ${error.message}\n`));
    throw error;
  }
}

/**
 * Execute next task
 */
async function executeNext(projectRoot, options = {}) {
  const configPath = join(projectRoot, '.claude/vdb/config.json');

  if (!existsSync(configPath)) {
    console.log(chalk.yellow('\n  ⚠ VDB is not initialized. Run: ccasp vdb init\n'));
    return;
  }

  try {
    const { VisionDriverBot } = await import('../vdb/index.js');
    const vdb = new VisionDriverBot();
    await vdb.initialize(projectRoot);

    if (options.dryRun) {
      const task = await vdb.queue.peek();
      if (!task) {
        console.log(chalk.yellow('\n  ⚠ No tasks in queue. Run: ccasp vdb scan\n'));
        return;
      }

      console.log(chalk.cyan('\n  🔍 DRY RUN MODE - Preview only\n'));
      console.log(chalk.gray('  Task:'), chalk.white(task.phase_title));
      console.log(chalk.gray('  Epic:'), chalk.white(task.epic_title));
      console.log(chalk.gray('  Priority:'), chalk.white(task.priority));
      console.log(chalk.gray('  Complexity:'), chalk.white(task.complexity));

      const prompt = await vdb.executor.buildPrompt(task);
      console.log(chalk.gray('\n  Prompt preview (first 500 chars):\n'));
      console.log(chalk.gray(`  ${  prompt.substring(0, 500).replace(/\n/g, '\n  ')  }...\n`));

      return;
    }

    console.log(chalk.cyan.bold('\n  🤖 VDB Execute Next Task\n'));

    const spinner = ora('Executing next task...').start();
    const result = await vdb.executeNext();

    if (!result.executed) {
      spinner.info(result.reason || 'No tasks to execute');
      return;
    }

    spinner.succeed('Task execution complete');
    console.log(chalk.green(`\n  ✅ Completed: ${result.task.phase_title}\n`));

    return result;

  } catch (error) {
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
    throw error;
  }
}

/**
 * Show queue contents
 */
async function showQueue(projectRoot) {
  const configPath = join(projectRoot, '.claude/vdb/config.json');

  if (!existsSync(configPath)) {
    console.log(chalk.yellow('\n  ⚠ VDB is not initialized. Run: ccasp vdb init\n'));
    return;
  }

  try {
    const { TaskQueue } = await import('../vdb/queue.js');
    const { loadConfig } = await import('../vdb/config.js');

    const config = await loadConfig(projectRoot);
    const queue = new TaskQueue(config, projectRoot);
    const status = await queue.getStatus();

    console.log(chalk.cyan('\n  ╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('  ║') + chalk.white.bold('                      VDB TASK QUEUE                           ') + chalk.cyan('║'));
    console.log(chalk.cyan('  ╠══════════════════════════════════════════════════════════════╣'));

    if (status.items?.length === 0) {
      console.log(chalk.cyan('  ║') + chalk.gray(' Queue is empty'.padEnd(61)) + chalk.cyan('║'));
    } else {
      for (const item of status.items) {
        const statusIcon = item.status === 'executing' ? '▶' :
                          item.status === 'queued' ? '○' : '?';
        const title = (item.phase_title || item.id).substring(0, 45);
        console.log(chalk.cyan('  ║') + chalk.yellow(` ${statusIcon} `) + chalk.white(title.padEnd(56)) + chalk.cyan('║'));
        console.log(chalk.cyan('  ║') + chalk.gray(`   Priority: ${item.priority} | Attempts: ${item.attempts}`.padEnd(58)) + chalk.cyan('║'));
      }
    }

    console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════════════╝\n'));

  } catch (error) {
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
  }
}

/**
 * Show execution statistics
 */
async function showStats(projectRoot, days) {
  const configPath = join(projectRoot, '.claude/vdb/config.json');

  if (!existsSync(configPath)) {
    console.log(chalk.yellow('\n  ⚠ VDB is not initialized. Run: ccasp vdb init\n'));
    return;
  }

  try {
    const { Reporter } = await import('../vdb/reporter.js');
    const { loadConfig } = await import('../vdb/config.js');

    const config = await loadConfig(projectRoot);
    const reporter = new Reporter(config, projectRoot);
    const stats = await reporter.getStats(days);

    console.log(chalk.cyan('\n  ╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('  ║') + chalk.white.bold(`                 VDB STATISTICS (${days} days)`.padEnd(61)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ╠══════════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan('  ║') + chalk.gray(' Total executions: ') + chalk.white(String(stats.total).padEnd(39)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.green(' Successful: ') + chalk.white(String(stats.successful).padEnd(45)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.red(' Failed: ') + chalk.white(String(stats.failed).padEnd(49)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.gray(' Success rate: ') + chalk.white(stats.success_rate.padEnd(43)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.gray(' Avg duration: ') + chalk.white(`${stats.avg_duration_minutes} min`.padEnd(43)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.gray(' Phases completed: ') + chalk.white(String(stats.phases_completed).padEnd(39)) + chalk.cyan('║'));
    console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════════════╝\n'));

  } catch (error) {
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
  }
}

/**
 * Clear the task queue
 */
async function clearQueue(projectRoot) {
  const configPath = join(projectRoot, '.claude/vdb/config.json');

  if (!existsSync(configPath)) {
    console.log(chalk.yellow('\n  ⚠ VDB is not initialized. Run: ccasp vdb init\n'));
    return;
  }

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Clear all tasks from the queue?',
    default: false
  }]);

  if (!confirm) {
    console.log(chalk.gray('\n  Cancelled.\n'));
    return;
  }

  try {
    const { TaskQueue } = await import('../vdb/queue.js');
    const { loadConfig } = await import('../vdb/config.js');

    const config = await loadConfig(projectRoot);
    const queue = new TaskQueue(config, projectRoot);

    await queue.clear();
    console.log(chalk.green('\n  ✅ Queue cleared\n'));

  } catch (error) {
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
  }
}

/**
 * Show VDB help
 */
function showVDBHelp() {
  console.log(chalk.cyan(`
  ╔══════════════════════════════════════════════════════════════╗
  ║              VISION DRIVER BOT - Help                        ║
  ╠══════════════════════════════════════════════════════════════╣
  ║                                                              ║
  ║  ${chalk.yellow('ccasp vdb init')}                                            ║
  ║    Initialize VDB for this project                           ║
  ║                                                              ║
  ║  ${chalk.yellow('ccasp vdb status')}                                          ║
  ║    Show current VDB status and queue                         ║
  ║                                                              ║
  ║  ${chalk.yellow('ccasp vdb scan')}                                            ║
  ║    Scan Vision board and queue actionable items              ║
  ║                                                              ║
  ║  ${chalk.yellow('ccasp vdb execute [--dry-run]')}                             ║
  ║    Execute next task from queue                              ║
  ║                                                              ║
  ║  ${chalk.yellow('ccasp vdb queue')}                                           ║
  ║    Show queue contents                                       ║
  ║                                                              ║
  ║  ${chalk.yellow('ccasp vdb stats [days]')}                                    ║
  ║    Show execution statistics                                 ║
  ║                                                              ║
  ║  ${chalk.yellow('ccasp vdb clear')}                                           ║
  ║    Clear the task queue                                      ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
`));
}

export default vdbCommand;
