#!/usr/bin/env node

/**
 * CCASP Postinstall Script
 *
 * Automatically runs after npm install to guide users through setup.
 * Designed for "vibe coding" - minimal typing, mobile-friendly.
 */

import chalk from 'chalk';
import boxen from 'boxen';

const SETUP_MESSAGE = `
${chalk.bold.cyan('🚀 Claude CLI Advanced Starter Pack')}

${chalk.green('✓')} Installation complete!

${chalk.bold('Step 1: Terminal Commands')} ${chalk.dim('(no AI needed)')}

${chalk.yellow('1.')} Run vibe-friendly setup wizard:
   ${chalk.dim('$')} ${chalk.white('ccasp wizard')}

${chalk.yellow('2.')} Quick init (auto-detect + deploy):
   ${chalk.dim('$')} ${chalk.white('ccasp init')}

${chalk.dim('These read your project files to detect tech stack.')}
${chalk.dim('No Claude/AI connection required.')}

${chalk.dim('─────────────────────────────────────')}

${chalk.bold('Step 2: Restart Claude Code CLI')}

After running ${chalk.cyan('ccasp init')}, restart Claude Code CLI.

${chalk.bold('Step 3: Slash Commands')} ${chalk.dim('(AI-powered, inside Claude)')}
  ${chalk.cyan('/menu')}         - Project command menu
  ${chalk.cyan('/ccasp-setup')}  - Setup wizard
  ${chalk.cyan('/github-update')} - GitHub Project Board

${chalk.dim('These only work inside Claude Code CLI.')}
`;

console.log(
  boxen(SETUP_MESSAGE, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
  })
);

// Check if running interactively and offer to start setup
if (process.stdout.isTTY && !process.env.CI && !process.env.CCASP_SKIP_POSTINSTALL) {
  console.log(chalk.dim('\nTip: Set CCASP_SKIP_POSTINSTALL=1 to skip this message\n'));
}
