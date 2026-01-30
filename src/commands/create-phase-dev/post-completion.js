/**
 * Post-Completion Handler
 *
 * Displays completion summary and "What's Next?" menu.
 * MANDATORY: Never end without showing next steps.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Show post-completion handler
 *
 * @param {Object} config - Project configuration
 * @param {Object} results - Generation results
 */
export async function showPostCompletionHandler(config, results) {
  displayCompletionSummary(config, results);

  // Loop until user exits
  let continueMenu = true;
  while (continueMenu) {
    continueMenu = await showWhatsNextMenu(config);
  }
}

/**
 * Display completion summary
 */
function displayCompletionSummary(config, results) {
  const { projectName, projectSlug, scale, phases, taskEstimate } = config;

  console.log('');
  console.log(chalk.green('═'.repeat(65)));
  console.log(
    chalk.green('║') +
      chalk.green.bold('  ✅ PLAN GENERATION COMPLETE').padEnd(64) +
      chalk.green('║')
  );
  console.log(chalk.green('═'.repeat(65)));
  console.log('');

  console.log(chalk.white.bold('Project Summary:'));
  console.log(`  Name:     ${chalk.cyan(projectName)}`);
  console.log(`  Slug:     ${chalk.cyan(projectSlug)}`);
  console.log(`  Scale:    ${chalk.yellow(scale)} (${config.scaleName})`);
  console.log(`  Phases:   ${chalk.yellow(phases.length)}`);
  console.log(`  Tasks:    ${chalk.yellow(taskEstimate)}`);
  console.log(`  Success:  ${chalk.green('95%+')}`);
  console.log('');

  console.log(chalk.white.bold('Generated Files:'));
  results.files.slice(0, 5).forEach((file) => {
    console.log(`  ${chalk.green('✓')} ${file.name}`);
  });
  if (results.files.length > 5) {
    console.log(chalk.dim(`  ... and ${results.files.length - 5} more`));
  }
  console.log('');

  console.log(chalk.white.bold('Key Locations:'));
  console.log(
    `  Docs:     ${chalk.dim(`.claude/docs/${projectSlug}/`)}`
  );
  console.log(
    `  Agent:    ${chalk.dim(`.claude/agents/${projectSlug}-phase-executor-agent.md`)}`
  );
  console.log(
    `  Command:  ${chalk.dim(`.claude/commands/phase-dev-${projectSlug}.md`)}`
  );
  console.log('');
}

/**
 * Show "What's Next?" menu
 *
 * @param {Object} config - Project configuration
 * @returns {boolean} - Whether to continue showing menu
 */
async function showWhatsNextMenu(config) {
  const { projectSlug, phases } = config;

  console.log(chalk.cyan.bold('─'.repeat(40)));
  console.log(chalk.cyan.bold('  What\'s Next?'));
  console.log(chalk.cyan.bold('─'.repeat(40)));
  console.log('');

  const choices = [
    {
      name: `${chalk.green('1)')} Start Phase 1: ${phases[0].name}`,
      value: 'start-phase-1',
      short: 'Start Phase 1',
    },
    {
      name: `${chalk.cyan('2)')} View PROGRESS.json`,
      value: 'view-progress',
      short: 'View Progress',
    },
    {
      name: `${chalk.magenta('3)')} View Executive Summary`,
      value: 'view-summary',
      short: 'View Summary',
    },
    new inquirer.Separator(),
    {
      name: `${chalk.yellow('G)')} Create GitHub Issues (one per phase)`,
      value: 'github-issues',
      short: 'GitHub Issues',
    },
    {
      name: `${chalk.blue('C)')} Run Slash Command: /phase-dev-${projectSlug}`,
      value: 'run-command',
      short: 'Run Command',
    },
    new inquirer.Separator(),
    {
      name: `${chalk.dim('X)')} Exit (show instructions)`,
      value: 'exit',
      short: 'Exit',
    },
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an option:',
      choices,
      pageSize: 10,
    },
  ]);

  console.log('');

  switch (action) {
    case 'start-phase-1':
      await showPhaseStartInstructions(config, 1);
      return true;

    case 'view-progress':
      await viewProgressJson(config);
      return true;

    case 'view-summary':
      await viewExecutiveSummary(config);
      return true;

    case 'github-issues':
      await showGitHubIssueInstructions(config);
      return true;

    case 'run-command':
      showCommandInstructions(config);
      return true;

    case 'exit':
      showExitInstructions(config);
      return false;

    default:
      return false;
  }
}

/**
 * Show phase start instructions
 */
async function showPhaseStartInstructions(config, phaseNum) {
  const { projectSlug, phases } = config;
  const phase = phases[phaseNum - 1];

  console.log(chalk.cyan.bold(`\n🚀 Starting Phase ${phaseNum}: ${phase.name}\n`));

  console.log(chalk.white.bold('Tasks in this phase:'));
  phase.tasks.forEach((task, i) => {
    console.log(`  ${i + 1}. ${task.title}`);
  });
  console.log('');

  console.log(chalk.white.bold('To begin:'));
  console.log(chalk.yellow(`\n  /phase-dev-${projectSlug} ${phaseNum}\n`));
  console.log(
    chalk.dim('Or tell Claude: "Start Phase 1 of ' + config.projectName + '"')
  );
  console.log('');

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: chalk.dim('Press Enter to continue...'),
    },
  ]);
}

/**
 * View PROGRESS.json
 */
async function viewProgressJson(config) {
  const { projectSlug } = config;
  const progressPath = join(
    process.cwd(),
    '.claude',
    'docs',
    projectSlug,
    'PROGRESS.json'
  );

  if (existsSync(progressPath)) {
    const content = readFileSync(progressPath, 'utf8');
    const progress = JSON.parse(content);

    console.log(chalk.cyan.bold('\n📊 PROGRESS.json Overview\n'));

    console.log(chalk.white.bold('Project:'), progress.project.name);
    console.log(chalk.white.bold('Scale:'), progress.project.scale);
    console.log('');

    console.log(chalk.white.bold('Phases:'));
    progress.phases.forEach((phase) => {
      const statusColor =
        phase.status === 'completed'
          ? chalk.green
          : phase.status === 'in_progress'
          ? chalk.yellow
          : chalk.dim;
      const tasksDone = phase.tasks.filter(
        (t) => t.status === 'completed'
      ).length;
      console.log(
        `  ${statusColor('●')} Phase ${phase.id}: ${phase.name} ` +
          chalk.dim(`(${tasksDone}/${phase.tasks.length} tasks)`)
      );
    });
    console.log('');

    console.log(chalk.dim(`Full file: ${progressPath}`));
  } else {
    console.log(chalk.yellow('PROGRESS.json not found'));
  }

  console.log('');
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: chalk.dim('Press Enter to continue...'),
    },
  ]);
}

/**
 * View Executive Summary
 */
async function viewExecutiveSummary(config) {
  const { projectSlug } = config;
  const summaryPath = join(
    process.cwd(),
    '.claude',
    'docs',
    projectSlug,
    'EXECUTIVE_SUMMARY.md'
  );

  if (existsSync(summaryPath)) {
    const content = readFileSync(summaryPath, 'utf8');

    console.log(chalk.cyan.bold('\n📄 Executive Summary (preview)\n'));

    // Show first 30 lines
    const lines = content.split('\n').slice(0, 30);
    lines.forEach((line) => {
      if (line.startsWith('#')) {
        console.log(chalk.cyan.bold(line));
      } else if (line.startsWith('|')) {
        console.log(chalk.dim(line));
      } else {
        console.log(line);
      }
    });

    if (content.split('\n').length > 30) {
      console.log(chalk.dim('\n... (truncated)'));
    }

    console.log('');
    console.log(chalk.dim(`Full file: ${summaryPath}`));
  } else {
    console.log(chalk.yellow('EXECUTIVE_SUMMARY.md not found'));
  }

  console.log('');
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: chalk.dim('Press Enter to continue...'),
    },
  ]);
}

/**
 * Show GitHub issue creation instructions
 */
async function showGitHubIssueInstructions(config) {
  const { projectName, projectSlug, phases } = config;

  console.log(chalk.cyan.bold('\n📋 GitHub Issue Creation\n'));

  console.log(chalk.white.bold('To create issues for each phase:'));
  console.log('');

  console.log(chalk.yellow('Option 1: Use gtask create'));
  console.log(chalk.dim('  For each phase, run:'));
  phases.forEach((phase, i) => {
    console.log(
      chalk.dim(`  gtask create -t "${projectName}: Phase ${i + 1} - ${phase.name}"`)
    );
  });
  console.log('');

  console.log(chalk.yellow('Option 2: Use gh CLI directly'));
  phases.forEach((phase, i) => {
    console.log(
      chalk.dim(
        `  gh issue create --title "${projectName}: Phase ${i + 1} - ${phase.name}" --body "See .claude/docs/${projectSlug}/PROGRESS.json"`
      )
    );
  });
  console.log('');

  console.log(chalk.yellow('Option 3: Tell Claude'));
  console.log(
    chalk.dim(
      `  "Create GitHub issues for each phase of ${projectName}"`
    )
  );

  console.log('');
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: chalk.dim('Press Enter to continue...'),
    },
  ]);
}

/**
 * Show command instructions
 */
function showCommandInstructions(config) {
  const { projectSlug } = config;

  console.log(chalk.cyan.bold('\n💻 Slash Command Usage\n'));

  console.log(chalk.white.bold('In Claude Code, run:'));
  console.log(chalk.yellow(`\n  /phase-dev-${projectSlug}\n`));

  console.log(chalk.white.bold('Or with phase number:'));
  console.log(chalk.yellow(`  /phase-dev-${projectSlug} 1`));
  console.log(chalk.yellow(`  /phase-dev-${projectSlug} status`));
  console.log('');

  console.log(
    chalk.dim(`Command file: .claude/commands/phase-dev-${projectSlug}.md`)
  );
  console.log('');
}

/**
 * Show exit instructions
 */
function showExitInstructions(config) {
  const { projectName, projectSlug } = config;

  console.log(chalk.cyan.bold('\n📝 Quick Reference\n'));

  console.log(chalk.white.bold('Start development:'));
  console.log(chalk.yellow(`  /phase-dev-${projectSlug}`));
  console.log('');

  console.log(chalk.white.bold('Check progress:'));
  console.log(
    chalk.dim(`  cat .claude/docs/${projectSlug}/PROGRESS.json | jq '.phases[] | {name, status}'`)
  );
  console.log('');

  console.log(chalk.white.bold('View documentation:'));
  console.log(chalk.dim(`  .claude/docs/${projectSlug}/EXECUTIVE_SUMMARY.md`));
  console.log(chalk.dim(`  .claude/docs/${projectSlug}/PROGRESS.json`));
  console.log('');

  console.log(chalk.white.bold('Agent executor:'));
  console.log(chalk.dim(`  .claude/agents/${projectSlug}-phase-executor-agent.md`));
  console.log('');

  console.log(chalk.green.bold('─'.repeat(40)));
  console.log(chalk.green(`  Good luck with ${projectName}!`));
  console.log(chalk.green.bold('─'.repeat(40)));
  console.log('');
}
