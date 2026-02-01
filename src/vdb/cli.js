#!/usr/bin/env node

/**
 * VDB CLI Scripts
 *
 * Standalone scripts for Vision Driver Bot operations.
 * Used by GitHub Actions workflow and manual execution.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Scan board and queue actionable items
 */
export async function scan(projectRoot = process.cwd()) {
  const { VisionDriverBot } = await import('./index.js');

  const vdb = new VisionDriverBot();
  await vdb.initialize(projectRoot);

  const result = await vdb.scan();

  console.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Execute next task from queue
 */
export async function executeNext(projectRoot = process.cwd(), options = {}) {
  const { VisionDriverBot } = await import('./index.js');

  const vdb = new VisionDriverBot();
  await vdb.initialize(projectRoot);

  if (options.dryRun) {
    const task = await vdb.queue.peek();
    if (!task) {
      console.log('No tasks in queue');
      return { executed: false, reason: 'queue_empty' };
    }

    const prompt = await vdb.executor.buildPrompt(task);
    console.log('=== DRY RUN ===');
    console.log('Task:', task.phase_title);
    console.log('Prompt length:', prompt.length);
    console.log('\n=== Prompt Preview ===\n');
    console.log(prompt.substring(0, 2000));
    console.log('\n... (truncated)');

    return { executed: false, dryRun: true, task };
  }

  return await vdb.executeNext();
}

/**
 * Get queue status
 */
export async function status(projectRoot = process.cwd()) {
  const { VisionDriverBot } = await import('./index.js');

  const vdb = new VisionDriverBot();
  await vdb.initialize(projectRoot);

  const status = await vdb.getStatus();
  console.log(JSON.stringify(status, null, 2));
  return status;
}

/**
 * Run decision engine evaluation
 */
export async function evaluate(projectRoot = process.cwd(), event = {}) {
  const { VisionDriverBot } = await import('./index.js');

  const vdb = new VisionDriverBot();
  await vdb.initialize(projectRoot);

  const decision = await vdb.evaluate(event);
  console.log(JSON.stringify(decision, null, 2));
  return decision;
}

/**
 * Initialize VDB for a project
 */
export async function init(projectRoot = process.cwd(), options = {}) {
  const { createDefaultConfig, saveConfig } = await import('./config.js');

  console.log('🤖 Initializing Vision Driver Bot...\n');

  // Create config
  const config = await createDefaultConfig(projectRoot, options);

  console.log('✅ Created VDB configuration');
  console.log(`   GitHub: ${config.boards.github.owner}/${config.boards.github.repo}`);

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
  console.log('✅ Created VDB directories');

  // Copy GitHub Actions workflow
  const workflowSource = join(__dirname, '../../templates/workflows/vision-driver-bot.yml');
  const workflowDest = join(projectRoot, '.github/workflows/vision-driver-bot.yml');

  if (existsSync(workflowSource)) {
    const workflowDir = dirname(workflowDest);
    if (!existsSync(workflowDir)) {
      mkdirSync(workflowDir, { recursive: true });
    }
    copyFileSync(workflowSource, workflowDest);
    console.log('✅ Copied GitHub Actions workflow');
  }

  // Create .gitignore entries
  const gitignorePath = join(projectRoot, '.claude/vdb/.gitignore');
  writeFileSync(gitignorePath, `# VDB runtime files
current-prompt.txt
current-task.json
execution-output.txt
last-scan.json
last-decision.json
*.log
`, 'utf8');

  console.log('\n🎉 VDB initialized successfully!\n');
  console.log('Next steps:');
  console.log('1. Add ANTHROPIC_API_KEY to your GitHub repository secrets');
  console.log('2. Create a PAT with repo+project permissions and add as VDB_PAT secret');
  console.log('3. (Optional) Set up a GitHub Project board for your Vision');
  console.log('4. Create epics in .claude/github-epics/ or on GitHub');
  console.log('5. Push to trigger the workflow\n');

  return config;
}

/**
 * Clear the task queue
 */
export async function clearQueue(projectRoot = process.cwd()) {
  const { TaskQueue } = await import('./queue.js');
  const { loadConfig } = await import('./config.js');

  const config = await loadConfig(projectRoot);
  const queue = new TaskQueue(config, projectRoot);

  await queue.clear();
  console.log('✅ Queue cleared');
}

/**
 * Get execution statistics
 */
export async function stats(projectRoot = process.cwd(), days = 7) {
  const { Reporter } = await import('./reporter.js');
  const { loadConfig } = await import('./config.js');

  const config = await loadConfig(projectRoot);
  const reporter = new Reporter(config, projectRoot);

  const stats = await reporter.getStats(days);
  console.log(JSON.stringify(stats, null, 2));
  return stats;
}

/**
 * Generate daily summary
 */
export async function dailySummary(projectRoot = process.cwd()) {
  const { Reporter } = await import('./reporter.js');
  const { loadConfig } = await import('./config.js');

  const config = await loadConfig(projectRoot);
  const reporter = new Reporter(config, projectRoot);

  const summary = await reporter.generateDailySummary();
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  const commands = {
    scan: () => scan(),
    'execute-next': () => executeNext(process.cwd(), { dryRun: args.includes('--dry-run') }),
    status: () => status(),
    evaluate: () => evaluate(process.cwd(), { type: args[0] || 'manual' }),
    init: () => init(),
    'clear-queue': () => clearQueue(),
    stats: () => stats(process.cwd(), parseInt(args[0]) || 7),
    'daily-summary': () => dailySummary(),
    help: () => {
      console.log(`
Vision Driver Bot CLI

Commands:
  scan            Scan board and queue actionable items
  execute-next    Execute next task from queue (--dry-run for preview)
  status          Get current VDB status
  evaluate        Run decision engine evaluation
  init            Initialize VDB for this project
  clear-queue     Clear the task queue
  stats [days]    Get execution statistics
  daily-summary   Generate daily summary

Examples:
  node cli.js scan
  node cli.js execute-next --dry-run
  node cli.js init
  node cli.js stats 14
`);
    }
  };

  const fn = commands[command];
  if (fn) {
    fn()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
      });
  } else {
    console.error(`Unknown command: ${command}`);
    commands.help();
    process.exit(1);
  }
}

export default {
  scan,
  executeNext,
  status,
  evaluate,
  init,
  clearQueue,
  stats,
  dailySummary
};
