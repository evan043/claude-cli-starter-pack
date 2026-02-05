#!/usr/bin/env node

/**
 * CCASP Neovim Plugin Setup
 *
 * Installs the nvim-ccasp plugin to the user's Neovim configuration.
 * Supports both symlink (development) and copy (production) modes.
 *
 * Usage:
 *   ccasp nvim-setup              # Interactive setup
 *   ccasp nvim-setup --symlink    # Create symlink (for development)
 *   ccasp nvim-setup --copy       # Copy files (for production)
 *   ccasp nvim-setup --lazy       # Generate lazy.nvim config snippet
 *   ccasp nvim-setup --packer     # Generate packer.nvim config snippet
 *   ccasp nvim-setup --uninstall  # Remove the plugin
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';
import inquirer from 'inquirer';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin source directory (relative to this script)
const PLUGIN_SOURCE = path.resolve(__dirname, '../../nvim-ccasp');

// Common Neovim config locations
const NVIM_CONFIG_PATHS = {
  win32: [
    path.join(process.env.LOCALAPPDATA || '', 'nvim'),
    path.join(process.env.APPDATA || '', 'nvim'),
  ],
  darwin: [
    path.join(process.env.HOME || '', '.config/nvim'),
    path.join(process.env.HOME || '', '.nvim'),
  ],
  linux: [
    path.join(process.env.HOME || '', '.config/nvim'),
    path.join(process.env.HOME || '', '.nvim'),
  ],
};

// Plugin installation paths for different plugin managers
const PLUGIN_PATHS = {
  lazy: 'lua/plugins/ccasp.lua',
  packer: 'lua/plugins/ccasp.lua',
  manual: 'pack/ccasp/start/ccasp.nvim',
};

/**
 * Find existing Neovim config directory
 */
function findNvimConfig() {
  const platform = process.platform;
  const paths = NVIM_CONFIG_PATHS[platform] || NVIM_CONFIG_PATHS.linux;

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Return first option as default
  return paths[0];
}

/**
 * Check if plugin source exists
 */
function checkPluginSource() {
  if (!fs.existsSync(PLUGIN_SOURCE)) {
    console.error(chalk.red('Error: nvim-ccasp plugin source not found.'));
    console.error(chalk.dim(`Expected at: ${PLUGIN_SOURCE}`));
    process.exit(1);
  }
  return true;
}

/**
 * Create symlink (cross-platform)
 */
function createSymlink(source, target) {
  const isWindows = process.platform === 'win32';

  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(target), { recursive: true });

  // Remove existing if present
  if (fs.existsSync(target)) {
    const stats = fs.lstatSync(target);
    if (stats.isSymbolicLink() || stats.isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  if (isWindows) {
    // Windows requires directory junction for symlinks without admin
    fs.symlinkSync(source, target, 'junction');
  } else {
    fs.symlinkSync(source, target);
  }
}

/**
 * Copy directory recursively
 */
function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Generate lazy.nvim config snippet
 */
function generateLazyConfig(pluginPath) {
  return `-- CCASP Neovim Control Center
-- Add this to your lazy.nvim plugin configuration

{
  dir = "${pluginPath.replace(/\\/g, '/')}",
  name = "ccasp.nvim",
  lazy = false,
  dependencies = {
    "MunifTanjim/nui.nvim",
    "nvim-telescope/telescope.nvim",
    "akinsho/toggleterm.nvim",
    "nvim-lua/plenary.nvim",
  },
  config = function()
    require("ccasp").setup({
      -- Layout mode: "classic" (sidebar+terminal) or "modern" (floating panels)
      layout = "classic",

      -- Sidebar settings (left panel with commands)
      sidebar = {
        width = 40,
        position = "left",
        auto_open = true,
      },

      -- Terminal settings (right panel with Claude CLI)
      terminal = {
        shell = "claude",
        size = 60,
        direction = "vertical",
      },

      -- Keybindings
      keybindings = {
        toggle_sidebar = "<C-b>",
        toggle_focus = "<C-\\\\>",
        open_ccasp = "<leader>cc",
        run_last = "<leader>cr",
        quick_search = "<leader>cs",
      },

      -- Multi-session support
      -- Ctrl+Shift+N: New session
      -- \`: Quick toggle sessions
      -- Tab: Cycle sessions
    })
  end,
},
`;
}

/**
 * Generate packer.nvim config snippet
 */
function generatePackerConfig(pluginPath) {
  return `-- CCASP Neovim Control Center
-- Add this to your packer.nvim plugin configuration

use {
  "${pluginPath.replace(/\\/g, '/')}",
  requires = {
    "MunifTanjim/nui.nvim",
    "nvim-telescope/telescope.nvim",
    "akinsho/toggleterm.nvim",
    "nvim-lua/plenary.nvim",
  },
  config = function()
    require("ccasp").setup({
      layout = "classic",
      sidebar = { width = 40, position = "left", auto_open = true },
      terminal = { shell = "claude", size = 60, direction = "vertical" },
      keybindings = {
        toggle_sidebar = "<C-b>",
        toggle_focus = "<C-\\\\>",
      },
    })
  end,
}
`;
}

/**
 * Install plugin via symlink
 */
async function installSymlink(nvimConfig) {
  const spinner = ora('Creating symlink...').start();

  try {
    const targetPath = path.join(nvimConfig, PLUGIN_PATHS.manual);
    createSymlink(PLUGIN_SOURCE, targetPath);

    spinner.succeed(chalk.green('Symlink created successfully!'));
    console.log(chalk.dim(`  Source: ${PLUGIN_SOURCE}`));
    console.log(chalk.dim(`  Target: ${targetPath}`));

    return targetPath;
  } catch (error) {
    spinner.fail(chalk.red('Failed to create symlink'));
    throw error;
  }
}

/**
 * Install plugin via copy
 */
async function installCopy(nvimConfig) {
  const spinner = ora('Copying plugin files...').start();

  try {
    const targetPath = path.join(nvimConfig, PLUGIN_PATHS.manual);

    // Remove existing if present
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }

    copyDir(PLUGIN_SOURCE, targetPath);

    spinner.succeed(chalk.green('Plugin files copied successfully!'));
    console.log(chalk.dim(`  Source: ${PLUGIN_SOURCE}`));
    console.log(chalk.dim(`  Target: ${targetPath}`));

    return targetPath;
  } catch (error) {
    spinner.fail(chalk.red('Failed to copy plugin files'));
    throw error;
  }
}

/**
 * Uninstall plugin
 */
async function uninstallPlugin(nvimConfig) {
  const spinner = ora('Removing plugin...').start();

  try {
    const targetPath = path.join(nvimConfig, PLUGIN_PATHS.manual);

    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      spinner.succeed(chalk.green('Plugin removed successfully!'));
      console.log(chalk.dim(`  Removed: ${targetPath}`));
    } else {
      spinner.info(chalk.yellow('Plugin not found at expected location'));
      console.log(chalk.dim(`  Expected: ${targetPath}`));
    }

    // Also check for config files
    const lazyConfig = path.join(nvimConfig, PLUGIN_PATHS.lazy);
    if (fs.existsSync(lazyConfig)) {
      console.log(chalk.yellow('\nNote: Config file still exists:'));
      console.log(chalk.dim(`  ${lazyConfig}`));
      console.log(chalk.dim('  Remove manually if no longer needed.'));
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to remove plugin'));
    throw error;
  }
}

/**
 * Interactive setup
 */
async function interactiveSetup() {
  console.log(
    boxen(
      chalk.bold.cyan('🎮 CCASP Neovim Plugin Setup\n\n') +
        chalk.white('This will install the nvim-ccasp plugin\n') +
        chalk.white('to your Neovim configuration.\n\n') +
        chalk.dim('Features:\n') +
        chalk.dim('• Sidebar with slash commands\n') +
        chalk.dim('• Multi-session Claude CLI terminals\n') +
        chalk.dim('• Collapsible sections & mouse support\n') +
        chalk.dim('• Session colors & titlebars'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );

  // Detect Neovim config
  const detectedConfig = findNvimConfig();
  const configExists = fs.existsSync(detectedConfig);

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'nvimConfig',
      message: 'Neovim config directory:',
      default: detectedConfig,
      validate: (input) => {
        if (!input) return 'Please enter a path';
        return true;
      },
    },
    {
      type: 'list',
      name: 'installMethod',
      message: 'Installation method:',
      choices: [
        {
          name: 'Symlink (recommended for development)',
          value: 'symlink',
        },
        {
          name: 'Copy files (standalone installation)',
          value: 'copy',
        },
        {
          name: 'Generate config snippet only',
          value: 'config',
        },
      ],
    },
    {
      type: 'list',
      name: 'pluginManager',
      message: 'Plugin manager:',
      choices: [
        { name: 'lazy.nvim (recommended)', value: 'lazy' },
        { name: 'packer.nvim', value: 'packer' },
        { name: 'Manual (pack/)', value: 'manual' },
      ],
      when: (answers) => answers.installMethod !== 'config',
    },
    {
      type: 'list',
      name: 'configFormat',
      message: 'Config format:',
      choices: [
        { name: 'lazy.nvim', value: 'lazy' },
        { name: 'packer.nvim', value: 'packer' },
      ],
      when: (answers) => answers.installMethod === 'config',
    },
  ]);

  // Create config directory if needed
  if (!configExists) {
    console.log(chalk.yellow(`\nConfig directory doesn't exist: ${answers.nvimConfig}`));
    const { createDir } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createDir',
        message: 'Create it?',
        default: true,
      },
    ]);

    if (createDir) {
      fs.mkdirSync(answers.nvimConfig, { recursive: true });
      console.log(chalk.green('Created directory.'));
    } else {
      console.log(chalk.red('Aborted.'));
      return;
    }
  }

  let pluginPath;

  // Handle config-only mode
  if (answers.installMethod === 'config') {
    pluginPath = PLUGIN_SOURCE;
    const format = answers.configFormat;

    console.log(chalk.cyan(`\n${format}.nvim configuration:\n`));
    console.log(chalk.dim('─'.repeat(60)));

    if (format === 'lazy') {
      console.log(generateLazyConfig(pluginPath));
    } else {
      console.log(generatePackerConfig(pluginPath));
    }

    console.log(chalk.dim('─'.repeat(60)));
    console.log(chalk.yellow('\nAdd this to your Neovim config and run :Lazy sync or :PackerSync'));
    return;
  }

  // Install the plugin
  if (answers.installMethod === 'symlink') {
    pluginPath = await installSymlink(answers.nvimConfig);
  } else {
    pluginPath = await installCopy(answers.nvimConfig);
  }

  // Show config snippet
  console.log(chalk.cyan('\n📝 Add this to your Neovim config:\n'));
  console.log(chalk.dim('─'.repeat(60)));

  const manager = answers.pluginManager || 'lazy';
  if (manager === 'lazy') {
    console.log(generateLazyConfig(pluginPath));
  } else if (manager === 'packer') {
    console.log(generatePackerConfig(pluginPath));
  } else {
    console.log(chalk.green('Plugin installed to pack/ directory.'));
    console.log(chalk.dim('Add this to your init.lua:\n'));
    console.log(`require("ccasp").setup({
  layout = "classic",
  sidebar = { width = 40, auto_open = true },
  terminal = { shell = "claude", size = 60 },
})`);
  }

  console.log(chalk.dim('─'.repeat(60)));

  // Success message
  console.log(
    boxen(
      chalk.green('✓ Installation complete!\n\n') +
        chalk.white('Next steps:\n') +
        chalk.dim('1. Add the config snippet to your init.lua\n') +
        chalk.dim('2. Install dependencies (nui.nvim, telescope, toggleterm)\n') +
        chalk.dim('3. Restart Neovim\n') +
        chalk.dim('4. Press Ctrl+B to open CCASP sidebar'),
      {
        padding: 1,
        margin: { top: 1 },
        borderStyle: 'round',
        borderColor: 'green',
      }
    )
  );
}

/**
 * Main entry point
 */
export async function runNvimSetup(options = {}) {
  checkPluginSource();

  const nvimConfig = findNvimConfig();

  // Handle CLI flags
  if (options.symlink) {
    await installSymlink(nvimConfig);
    console.log(chalk.cyan('\nConfig snippet (lazy.nvim):\n'));
    console.log(generateLazyConfig(path.join(nvimConfig, PLUGIN_PATHS.manual)));
    return;
  }

  if (options.copy) {
    await installCopy(nvimConfig);
    console.log(chalk.cyan('\nConfig snippet (lazy.nvim):\n'));
    console.log(generateLazyConfig(path.join(nvimConfig, PLUGIN_PATHS.manual)));
    return;
  }

  if (options.lazy) {
    console.log(generateLazyConfig(PLUGIN_SOURCE));
    return;
  }

  if (options.packer) {
    console.log(generatePackerConfig(PLUGIN_SOURCE));
    return;
  }

  if (options.uninstall) {
    await uninstallPlugin(nvimConfig);
    return;
  }

  // Interactive mode
  await interactiveSetup();
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options = {
    symlink: args.includes('--symlink'),
    copy: args.includes('--copy'),
    lazy: args.includes('--lazy'),
    packer: args.includes('--packer'),
    uninstall: args.includes('--uninstall'),
  };

  runNvimSetup(options).catch((error) => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
}

export default runNvimSetup;
