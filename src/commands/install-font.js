/**
 * CCASP Font Installer
 *
 * Installs the bundled JetBrainsMono Nerd Font to the user's OS font directory.
 * The font files ship with the CCASP npm package in nvim-ccasp/fonts/.
 *
 * Supports: Windows, macOS, Linux
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { homedir, platform } from 'os';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLED_FONTS_DIR = join(__dirname, '..', '..', 'nvim-ccasp', 'fonts');

// Font files bundled with CCASP
const FONT_FILES = [
  'JetBrainsMonoNerdFontMono-Regular.ttf',
  'JetBrainsMonoNerdFontMono-Bold.ttf',
  'JetBrainsMonoNerdFontMono-Italic.ttf',
  'JetBrainsMonoNerdFontMono-BoldItalic.ttf',
];

/**
 * Get the OS-specific font installation directory
 */
function getFontInstallDir() {
  const plat = platform();
  if (plat === 'win32') {
    return join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'Microsoft', 'Windows', 'Fonts');
  } else if (plat === 'darwin') {
    return join(homedir(), 'Library', 'Fonts');
  } else {
    return join(homedir(), '.local', 'share', 'fonts');
  }
}

/**
 * Check if JetBrainsMono Nerd Font is already installed
 */
export function isFontInstalled() {
  const destDir = getFontInstallDir();
  // Check for at least the Regular variant
  return existsSync(join(destDir, FONT_FILES[0]));
}

/**
 * Install bundled Nerd Font to the OS font directory
 */
export async function installFont(options = {}) {
  const { quiet = false } = options;

  if (!quiet) {
    console.log(chalk.cyan('\n  Nerd Font Installer'));
    console.log(chalk.dim('  ─────────────────────────────\n'));
  }

  // Check if bundled fonts exist
  const bundledFonts = FONT_FILES.filter(f => existsSync(join(BUNDLED_FONTS_DIR, f)));
  if (bundledFonts.length === 0) {
    console.log(chalk.red('  No bundled font files found in nvim-ccasp/fonts/'));
    console.log(chalk.dim('  Run the download script first:'));
    console.log(chalk.dim('    powershell -File nvim-ccasp/fonts/download-font.ps1\n'));
    return false;
  }

  // Check if already installed
  if (isFontInstalled()) {
    if (!quiet) {
      console.log(chalk.green('  JetBrainsMono Nerd Font is already installed.\n'));
    }
    return true;
  }

  const destDir = getFontInstallDir();
  if (!quiet) {
    console.log(chalk.dim(`  Source: ${BUNDLED_FONTS_DIR}`));
    console.log(chalk.dim(`  Destination: ${destDir}\n`));
  }

  // Create destination directory if needed
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // Copy font files
  let installed = 0;
  for (const fontFile of bundledFonts) {
    const src = join(BUNDLED_FONTS_DIR, fontFile);
    const dest = join(destDir, fontFile);
    try {
      copyFileSync(src, dest);
      installed++;
      if (!quiet) {
        console.log(chalk.green(`  ✓ ${fontFile}`));
      }
    } catch (err) {
      console.log(chalk.red(`  ✗ ${fontFile}: ${err.message}`));
    }
  }

  // Platform-specific post-install steps
  const plat = platform();
  if (plat === 'win32') {
    // Register fonts in Windows registry (per-user)
    try {
      for (const fontFile of bundledFonts) {
        const fontPath = join(destDir, fontFile);
        const displayName = fontFile.replace('.ttf', ' (TrueType)');
        execSync(
          `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts" /v "${displayName}" /t REG_SZ /d "${fontPath}" /f`,
          { stdio: 'pipe' }
        );
      }
      if (!quiet) {
        console.log(chalk.dim('\n  Registered fonts in Windows registry.'));
      }
    } catch (err) {
      if (!quiet) {
        console.log(chalk.yellow('\n  Could not register fonts in registry. You may need to restart.'));
      }
    }
  } else if (plat === 'linux') {
    // Refresh font cache on Linux
    try {
      execSync('fc-cache -fv', { stdio: 'pipe' });
      if (!quiet) {
        console.log(chalk.dim('\n  Refreshed font cache.'));
      }
    } catch {
      // fc-cache might not be available
    }
  }
  // macOS: no post-install needed — fonts in ~/Library/Fonts are auto-detected

  if (!quiet) {
    console.log(chalk.green(`\n  Installed ${installed} font files.`));
    if (plat === 'win32') {
      console.log(chalk.yellow('  Note: You may need to restart Neovide/terminal for the font to appear.\n'));
    } else {
      console.log('');
    }
  }

  return installed > 0;
}

/**
 * CLI entry point
 */
export async function runInstallFont(options = {}) {
  await installFont(options);
}

export default { installFont, isFontInstalled, runInstallFont };
