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

${chalk.bold('Step 1: Run Setup')} ${chalk.dim('(one-time, in terminal)')}

   ${chalk.dim('$')} ${chalk.white('ccasp wizard')}   ${chalk.dim('← recommended')}
   ${chalk.dim('$')} ${chalk.white('ccasp init')}     ${chalk.dim('← quick mode')}

${chalk.dim('This deploys slash commands to your .claude/ folder.')}

${chalk.dim('─────────────────────────────────────')}

${chalk.bold('Step 2: Restart Claude Code CLI')}

${chalk.dim('─────────────────────────────────────')}

${chalk.bold('Step 3: Use Slash Commands')} ${chalk.dim('(inside Claude)')}

  ${chalk.cyan('/menu')}           - All commands menu
  ${chalk.cyan('/create-agent')}   - Create L1/L2/L3 agents
  ${chalk.cyan('/create-hook')}    - Build enforcement hooks
  ${chalk.cyan('/explore-mcp')}    - Discover MCP servers
  ${chalk.cyan('/phase-dev-plan')} - Create dev plans
  ${chalk.cyan('/github-update')}  - GitHub Project Board
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
