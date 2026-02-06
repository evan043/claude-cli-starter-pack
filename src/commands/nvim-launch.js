#!/usr/bin/env node

/**
 * CCASP Neovim Launcher
 *
 * Launches Neovim with the CCASP plugin loaded directly from the npm package.
 * No installation required - works out of the box in any CCASP project.
 *
 * Submodules:
 * - nvim/detector.js: Neovim detection and installation
 * - nvim/launcher.js: Standalone init.lua generation and launch orchestration
 *
 * Usage:
 *   ccasp neovim              # Launch Neovim with CCASP in current directory
 *   ccasp neovim .            # Same as above
 *   ccasp neovim /path/to/dir # Launch in specific directory
 *   ccasp neovim --no-sidebar # Launch without auto-opening sidebar
 */

import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { launchNeovim } from './nvim/launcher.js';

/**
 * Main entry point
 */
export async function runNvimLaunch(args = [], options = {}) {
  // First arg could be a directory
  const targetDir = args[0] && !args[0].startsWith('-') ? args[0] : null;

  // Remaining args are files to open
  const files = args.slice(targetDir ? 1 : 0).filter((a) => !a.startsWith('-'));

  await launchNeovim(targetDir, {
    ...options,
    files,
  });
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force'),
    sidebar: !args.includes('--no-sidebar'),
  };

  // Filter out option flags from args
  const cleanArgs = args.filter((a) => !a.startsWith('--'));

  runNvimLaunch(cleanArgs, options).catch((error) => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
}

export default runNvimLaunch;

// Re-export for programmatic use
export { launchNeovim } from './nvim/launcher.js';
