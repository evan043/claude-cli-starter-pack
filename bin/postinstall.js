#!/usr/bin/env node

/**
 * CCASP Postinstall Script
 *
 * Automatically runs after npm install to guide users through setup.
 * Features:
 * - Runs npm fund to display funding info
 * - Auto-launches setup wizard with directory selection
 * - Designed for "vibe coding" - minimal typing, mobile-friendly
 */

import chalk from 'chalk';
import boxen from 'boxen';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Display npm fund information
 */
function showFundingInfo() {
  try {
    console.log(chalk.dim('\n📦 Checking funding information...\n'));
    execSync('npm fund', { stdio: 'inherit', encoding: 'utf8' });
  } catch (error) {
    // npm fund might not exist or fail silently - that's OK
  }
}

/**
 * Check if wizard should auto-launch
 */
function shouldAutoLaunchWizard() {
  // Skip in CI environments
  if (process.env.CI) return false;

  // Skip if env var set
  if (process.env.CCASP_SKIP_WIZARD === '1') return false;
  if (process.env.CCASP_SKIP_POSTINSTALL === '1') return false;

  // Only auto-launch in interactive TTY
  if (!process.stdout.isTTY) return false;

  return true;
}

/**
 * Launch the setup wizard
 */
async function launchWizard() {
  console.log(chalk.cyan('\n🚀 Launching CCASP Setup Wizard...\n'));

  try {
    // Import and run the wizard directly
    const { runSetupWizard } = await import('../src/commands/setup-wizard.js');
    await runSetupWizard({ fromPostinstall: true });
  } catch (error) {
    // If direct import fails, try spawning ccasp wizard
    console.log(chalk.yellow('\nStarting wizard in new process...\n'));

    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'ccasp.cmd' : 'ccasp';

    try {
      const child = spawn(cmd, ['wizard'], {
        stdio: 'inherit',
        shell: true,
      });

      child.on('error', (err) => {
        console.log(chalk.dim('\nRun manually: ccasp wizard\n'));
      });
    } catch (spawnError) {
      console.log(chalk.dim('\nRun manually: ccasp wizard\n'));
    }
  }
}

const SETUP_MESSAGE = `
${chalk.bold.cyan('🚀 Claude CLI Advanced Starter Pack')}

${chalk.green('✓')} Installation complete!

${chalk.bold('Quick Start:')}

   ${chalk.dim('$')} ${chalk.white('ccasp wizard')}   ${chalk.dim('← interactive setup')}
   ${chalk.dim('$')} ${chalk.white('ccasp init')}     ${chalk.dim('← quick mode')}

${chalk.dim('This deploys slash commands to your .claude/ folder.')}

${chalk.dim('─────────────────────────────────────')}

${chalk.bold('After Setup:')}

  ${chalk.cyan('/menu')}           - All commands menu
  ${chalk.cyan('/create-agent')}   - Create L1/L2/L3 agents
  ${chalk.cyan('/create-hook')}    - Build enforcement hooks
  ${chalk.cyan('/explore-mcp')}    - Discover MCP servers
  ${chalk.cyan('/phase-dev-plan')} - Create dev plans
  ${chalk.cyan('/github-update')}  - GitHub Project Board
`;

// Main execution
async function main() {
  // Show funding info first
  showFundingInfo();

  // Show welcome message
  console.log(
    boxen(SETUP_MESSAGE, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );

  // Auto-launch wizard if conditions are met
  if (shouldAutoLaunchWizard()) {
    console.log(chalk.dim('\nStarting setup wizard automatically...'));
    console.log(chalk.dim('(Set CCASP_SKIP_WIZARD=1 to disable auto-launch)\n'));

    // Small delay for user to read the message
    await new Promise((resolve) => setTimeout(resolve, 1500));

    await launchWizard();
  } else {
    // Show manual instructions
    if (process.env.CI) {
      console.log(chalk.dim('\nCI environment detected - skipping interactive wizard.\n'));
    } else if (!process.stdout.isTTY) {
      console.log(chalk.dim('\nNon-interactive terminal - run "ccasp wizard" manually.\n'));
    } else {
      console.log(chalk.dim('\nTip: Set CCASP_SKIP_WIZARD=1 to skip auto-wizard\n'));
    }
  }
}

main().catch((error) => {
  console.error(chalk.red('Postinstall error:'), error.message);
  console.log(chalk.dim('\nRun "ccasp wizard" to complete setup.\n'));
});
