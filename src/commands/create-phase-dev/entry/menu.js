/**
 * Create Phase Dev - Main Menu & Help
 *
 * Interactive menu for selecting phase-dev creation mode and help display.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * Show main menu for create-phase-dev
 * @param {Function} runCreatePhaseDev - The main entry function
 */
export async function showPhasDevMainMenu(runCreatePhaseDev) {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'What would you like to do?',
      choices: [
        {
          name: `${chalk.green('1)')} Create New Plan       Full interactive wizard`,
          value: 'new',
          short: 'Create New',
        },
        {
          name: `${chalk.cyan('2)')} Quick Plan (S)        Small project (2 phases)`,
          value: 'quick-s',
          short: 'Quick S',
        },
        {
          name: `${chalk.cyan('3)')} Quick Plan (M)        Medium project (3-4 phases)`,
          value: 'quick-m',
          short: 'Quick M',
        },
        {
          name: `${chalk.cyan('4)')} Quick Plan (L)        Large project (5+ phases)`,
          value: 'quick-l',
          short: 'Quick L',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('H)')} Help & Examples`,
          value: 'help',
          short: 'Help',
        },
        {
          name: `${chalk.dim('Q)')} Back to main menu`,
          value: 'back',
          short: 'Back',
        },
      ],
    },
  ]);

  switch (mode) {
    case 'new':
      return await runCreatePhaseDev({});
    case 'quick-s':
      return await runCreatePhaseDev({ scale: 'S' });
    case 'quick-m':
      return await runCreatePhaseDev({ scale: 'M' });
    case 'quick-l':
      return await runCreatePhaseDev({ scale: 'L' });
    case 'help':
      showPhaseDevHelp();
      return await showPhasDevMainMenu(runCreatePhaseDev);
    case 'back':
      return null;
    default:
      return null;
  }
}

/**
 * Show help for phase-dev
 */
function showPhaseDevHelp() {
  console.log(chalk.cyan.bold('\n\u{1f4da} Phased Development Help\n'));

  console.log(chalk.white.bold('What is Phased Development?'));
  console.log(
    chalk.dim(`
  A structured approach to complex projects that:
  - Breaks work into sequential phases
  - Tracks progress with PROGRESS.json
  - Generates RAG agents for autonomous execution
  - Creates enforcement hooks for quality
  - Achieves 95%+ success rate
`)
  );

  console.log(chalk.white.bold('Scales:'));
  console.log(
    chalk.dim(`
  S (Small)   - 2 phases, 10-30 tasks
                Focused features or bug fixes

  M (Medium)  - 3-4 phases, 30-80 tasks
                Multi-component features

  L (Large)   - 5-8 phases, 80-200 tasks
                Major overhauls or new modules
`)
  );

  console.log(chalk.white.bold('Generated Files:'));
  console.log(
    chalk.dim(`
  .claude/phase-dev/{slug}/
    PROGRESS.json        - Task tracking and state
    EXECUTIVE_SUMMARY.md - Project overview
    API_ENDPOINTS.md     - Backend endpoints (if backend detected)
    DATABASE_SCHEMA.md   - Database schema (adapts to your DB)
    exploration/         - L2 exploration documents

  .claude/agents/{slug}-phase-executor-agent.md
    RAG agent for autonomous execution

  .claude/commands/phase-dev-{slug}.md
    Dynamic slash command (removed when completed)
`)
  );

  console.log(chalk.white.bold('CLI Usage:'));
  console.log(
    chalk.dim(`
  gtask create-phase-dev              # Interactive wizard
  gtask create-phase-dev --scale M    # Force medium scale
  gtask create-phase-dev --autonomous --name "My Project"
`)
  );

  console.log('');
}
