#!/usr/bin/env node

/**
 * CCASP Neovim Launcher
 *
 * Launches Neovim with the CCASP plugin loaded directly from the npm package.
 * No installation required - works out of the box in any CCASP project.
 *
 * Usage:
 *   ccasp neovim              # Launch Neovim with CCASP in current directory
 *   ccasp neovim .            # Same as above
 *   ccasp neovim /path/to/dir # Launch in specific directory
 *   ccasp neovim --no-sidebar # Launch without auto-opening sidebar
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin source directory (relative to this script)
const PLUGIN_SOURCE = path.resolve(__dirname, '../../nvim-ccasp');

/**
 * Check if Neovim is installed
 */
function checkNeovim() {
  const isWindows = process.platform === 'win32';
  const nvimCmd = isWindows ? 'where nvim' : 'which nvim';

  try {
    execSync(nvimCmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Neovim based on platform
 */
async function installNeovim() {
  const platform = process.platform;

  console.log(
    boxen(
      chalk.yellow('⚠️  Neovim not found\n\n') +
        chalk.white('Neovim is required to run CCASP.\n') +
        chalk.dim('Would you like to install it now?'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'yellow',
      }
    )
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question(chalk.cyan('Install Neovim? [Y/n] '), resolve);
  });
  rl.close();

  if (answer.toLowerCase() === 'n') {
    console.log(chalk.dim('\nManual installation:'));
    console.log(chalk.dim('  Windows: winget install Neovim.Neovim'));
    console.log(chalk.dim('  macOS:   brew install neovim'));
    console.log(chalk.dim('  Linux:   apt install neovim'));
    console.log(chalk.dim('  Or visit: https://neovim.io/'));
    return false;
  }

  const ora = (await import('ora')).default;
  const spinner = ora('Installing Neovim...').start();

  try {
    let installCmd;

    if (platform === 'win32') {
      // Windows - try winget first, then choco, then scoop
      try {
        execSync('winget --version', { stdio: 'pipe' });
        installCmd = 'winget install --id Neovim.Neovim -e --accept-source-agreements --accept-package-agreements';
      } catch {
        try {
          execSync('choco --version', { stdio: 'pipe' });
          installCmd = 'choco install neovim -y';
        } catch {
          try {
            execSync('scoop --version', { stdio: 'pipe' });
            installCmd = 'scoop install neovim';
          } catch {
            spinner.fail('No package manager found');
            console.log(chalk.yellow('\nPlease install a package manager first:'));
            console.log(chalk.dim('  winget: Built into Windows 11 / App Installer from Microsoft Store'));
            console.log(chalk.dim('  choco:  https://chocolatey.org/install'));
            console.log(chalk.dim('  scoop:  https://scoop.sh/'));
            console.log(chalk.dim('\nOr download Neovim directly: https://neovim.io/'));
            return false;
          }
        }
      }
    } else if (platform === 'darwin') {
      // macOS - use brew
      try {
        execSync('brew --version', { stdio: 'pipe' });
        installCmd = 'brew install neovim';
      } catch {
        spinner.fail('Homebrew not found');
        console.log(chalk.yellow('\nPlease install Homebrew first:'));
        console.log(chalk.dim('  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'));
        console.log(chalk.dim('\nThen run: brew install neovim'));
        return false;
      }
    } else {
      // Linux - try apt, dnf, pacman
      try {
        execSync('apt --version', { stdio: 'pipe' });
        installCmd = 'sudo apt update && sudo apt install -y neovim';
      } catch {
        try {
          execSync('dnf --version', { stdio: 'pipe' });
          installCmd = 'sudo dnf install -y neovim';
        } catch {
          try {
            execSync('pacman --version', { stdio: 'pipe' });
            installCmd = 'sudo pacman -S --noconfirm neovim';
          } catch {
            spinner.fail('No supported package manager found');
            console.log(chalk.yellow('\nPlease install Neovim manually:'));
            console.log(chalk.dim('  https://neovim.io/'));
            return false;
          }
        }
      }
    }

    spinner.text = `Running: ${installCmd}`;

    execSync(installCmd, {
      stdio: 'inherit',
      shell: true,
    });

    // Verify installation
    if (checkNeovim()) {
      spinner.succeed(chalk.green('Neovim installed successfully!'));
      return true;
    } else {
      spinner.fail('Installation completed but Neovim not found in PATH');
      console.log(chalk.yellow('\nYou may need to restart your terminal or add Neovim to your PATH.'));
      return false;
    }
  } catch (error) {
    spinner.fail('Installation failed');
    console.error(chalk.red('Error:'), error.message);
    console.log(chalk.dim('\nTry installing manually: https://neovim.io/'));
    return false;
  }
}

/**
 * Generate minimal init.lua for standalone CCASP launch
 */
function generateStandaloneInit(pluginPath, options = {}) {
  const escapedPath = pluginPath.replace(/\\/g, '/');
  const autoOpen = options.sidebar !== false;

  return `
-- CCASP Standalone Neovim Configuration
-- Generated by: ccasp neovim
-- Plugin path: ${escapedPath}

-- Basic settings
vim.opt.number = true
vim.opt.relativenumber = true
vim.opt.mouse = "a"
vim.opt.termguicolors = true
vim.opt.splitright = true
vim.opt.splitbelow = true
vim.opt.signcolumn = "yes"
vim.opt.updatetime = 250
vim.opt.timeoutlen = 300

-- Add plugin to runtime path
vim.opt.runtimepath:prepend("${escapedPath}")

-- Bootstrap lazy.nvim if not present
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  print("Installing lazy.nvim...")
  vim.fn.system({
    "git", "clone", "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", lazypath,
  })
end
vim.opt.runtimepath:prepend(lazypath)

-- Setup plugins
require("lazy").setup({
  -- CCASP plugin (loaded from npm package)
  {
    dir = "${escapedPath}",
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
        layout = "classic",
        sidebar = {
          width = 40,
          position = "left",
          auto_open = ${autoOpen},
        },
        terminal = {
          shell = "claude",
          size = 60,
          direction = "vertical",
        },
        keybindings = {
          toggle_sidebar = "<C-b>",
          toggle_focus = "<C-\\\\>",
          open_ccasp = "<leader>cc",
          run_last = "<leader>cr",
          quick_search = "<leader>cs",
        },
        browser_tabs = { enabled = true, height = 1 },
        prompt_injector = { enabled = false },
      })
    end,
  },
  -- Required dependencies
  { "MunifTanjim/nui.nvim", lazy = true },
  { "nvim-lua/plenary.nvim", lazy = true },
  { "nvim-telescope/telescope.nvim", lazy = true, dependencies = { "nvim-lua/plenary.nvim" } },
  { "akinsho/toggleterm.nvim", lazy = true },
}, {
  install = { colorscheme = { "default" } },
  checker = { enabled = false },
  change_detection = { enabled = false },
})

-- Auto-open CCASP after startup
${autoOpen ? `
vim.api.nvim_create_autocmd("VimEnter", {
  callback = function()
    vim.defer_fn(function()
      local ok, ccasp = pcall(require, "ccasp")
      if ok and ccasp.open then
        ccasp.open()
      end
      print("CCASP ready! Sidebar: <C-b> | Sessions: \` | New: Ctrl+Shift+N")
    end, 100)
  end,
})
` : '-- Sidebar auto-open disabled'}
`;
}

/**
 * Launch Neovim with CCASP
 */
export async function launchNeovim(targetDir, options = {}) {
  // Check if Neovim is installed
  if (!checkNeovim()) {
    const installed = await installNeovim();
    if (!installed) {
      process.exit(1);
    }
  }

  // Resolve target directory
  const cwd = targetDir ? path.resolve(targetDir) : process.cwd();

  // Check directory exists
  if (!fs.existsSync(cwd)) {
    console.error(chalk.red(`Directory not found: ${cwd}`));
    process.exit(1);
  }

  // Check plugin source exists
  if (!fs.existsSync(PLUGIN_SOURCE)) {
    console.error(chalk.red('nvim-ccasp plugin not found in npm package.'));
    console.error(chalk.dim(`Expected at: ${PLUGIN_SOURCE}`));
    process.exit(1);
  }

  // Check for .claude directory (CCASP project)
  const claudeDir = path.join(cwd, '.claude');
  const isCcaspProject = fs.existsSync(claudeDir);

  if (!isCcaspProject && !options.force) {
    console.log(
      boxen(
        chalk.yellow('⚠️  No .claude/ directory found\n\n') +
          chalk.white('This directory may not have CCASP initialized.\n') +
          chalk.dim('Run "ccasp init" first, or use --force to launch anyway.'),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
        }
      )
    );

    // Ask to continue
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question(chalk.cyan('Launch anyway? [y/N] '), resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log(chalk.dim('Aborted.'));
      process.exit(0);
    }
  }

  // Generate standalone init.lua in temp directory
  const tempDir = path.join(
    process.env.TEMP || process.env.TMPDIR || '/tmp',
    'ccasp-nvim-' + Date.now()
  );
  fs.mkdirSync(tempDir, { recursive: true });

  const initPath = path.join(tempDir, 'init.lua');
  fs.writeFileSync(initPath, generateStandaloneInit(PLUGIN_SOURCE, options));

  // Show launch message
  console.log(
    boxen(
      chalk.bold.cyan('🚀 Launching CCASP Neovim\n\n') +
        chalk.white(`Directory: ${cwd}\n`) +
        chalk.dim(`Plugin: ${PLUGIN_SOURCE}\n\n`) +
        chalk.yellow('Keybindings:\n') +
        chalk.dim('  Ctrl+B        Toggle sidebar\n') +
        chalk.dim('  Ctrl+Shift+N  New Claude session\n') +
        chalk.dim('  `             Quick toggle sessions\n') +
        chalk.dim('  Tab           Cycle sessions\n') +
        chalk.dim('  Esc Esc       Exit terminal mode'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );

  // Launch Neovim with custom init
  const nvimArgs = ['-u', initPath];

  // Add any file arguments
  if (options.files && options.files.length > 0) {
    nvimArgs.push(...options.files);
  }

  const nvim = spawn('nvim', nvimArgs, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  nvim.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error(chalk.red('\nNeovim not found. Please install Neovim first:'));
      console.error(chalk.dim('  https://neovim.io/'));
      console.error(chalk.dim('  Windows: winget install Neovim.Neovim'));
      console.error(chalk.dim('  macOS: brew install neovim'));
      console.error(chalk.dim('  Linux: apt install neovim'));
    } else {
      console.error(chalk.red('Failed to launch Neovim:'), err.message);
    }
    process.exit(1);
  });

  nvim.on('close', (code) => {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    process.exit(code || 0);
  });
}

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
