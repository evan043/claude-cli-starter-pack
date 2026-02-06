/**
 * Neovim Detection & Installation
 *
 * Platform-specific Neovim detection and auto-installation.
 *
 * Provides:
 * - checkNeovim: Check if Neovim is installed
 * - installNeovim: Interactive Neovim installation (Windows/macOS/Linux)
 */

import { execSync } from 'child_process';
import readline from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Check if Neovim is installed
 */
export function checkNeovim() {
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
export async function installNeovim() {
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
    }
      spinner.fail('Installation completed but Neovim not found in PATH');
      console.log(chalk.yellow('\nYou may need to restart your terminal or add Neovim to your PATH.'));
      return false;

  } catch (error) {
    spinner.fail('Installation failed');
    console.error(chalk.red('Error:'), error.message);
    console.log(chalk.dim('\nTry installing manually: https://neovim.io/'));
    return false;
  }
}
