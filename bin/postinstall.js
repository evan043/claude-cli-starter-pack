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

${chalk.bold('Quick Setup Options:')}

${chalk.yellow('1.')} Run vibe-friendly setup wizard:
   ${chalk.dim('$')} ${chalk.white('npx ccasp wizard')}

${chalk.yellow('2.')} Quick init (auto-detect + deploy):
   ${chalk.dim('$')} ${chalk.white('npx ccasp init')}

${chalk.yellow('3.')} Full interactive menu:
   ${chalk.dim('$')} ${chalk.white('npx ccasp')}

${chalk.dim('─────────────────────────────────────')}

${chalk.bold('After init, in Claude Code CLI:')}
  ${chalk.cyan('/menu')}         - Project command menu
  ${chalk.cyan('/ccasp-setup')}  - Setup wizard (vibe-code friendly)

${chalk.dim('─────────────────────────────────────')}

${chalk.bold('Terminal commands:')}
  ${chalk.cyan('ccasp wizard')}   - Setup wizard (recommended)
  ${chalk.cyan('ccasp init')}     - Initialize .claude folder
  ${chalk.cyan('ccasp detect')}   - Auto-detect tech stack
  ${chalk.cyan('ccasp audit')}    - Audit/enhance CLAUDE.md
  ${chalk.cyan('ccasp help')}     - Show all commands
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
