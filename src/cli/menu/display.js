/**
 * Display Helper Functions for Menu System
 * Provides styled output functions for headers, success, error, warning, and info messages
 */

import chalk from 'chalk';

/**
 * Show a styled header
 */
export function showHeader(title) {
  const width = 60;
  const padding = Math.max(0, Math.floor((width - title.length - 2) / 2));
  const line = '═'.repeat(width);

  console.log(chalk.cyan(`╔${line}╗`));
  console.log(
    chalk.cyan('║') +
      ' '.repeat(padding) +
      chalk.bold(title) +
      ' '.repeat(width - padding - title.length) +
      chalk.cyan('║')
  );
  console.log(chalk.cyan(`╚${line}╝`));
  console.log('');
}

/**
 * Show a success message in a box
 */
export function showSuccess(title, details = []) {
  const width = 65;
  const line = '═'.repeat(width);

  console.log('');
  console.log(chalk.green(`╔${line}╗`));
  console.log(
    chalk.green('║  ') +
      chalk.green.bold(`✅ ${  title.padEnd(width - 5)}`) +
      chalk.green('║')
  );

  if (details.length > 0) {
    console.log(chalk.green(`║${  ' '.repeat(width)  }║`));
    for (const detail of details) {
      const paddedDetail = (`  ${  detail}`).padEnd(width);
      console.log(chalk.green('║') + paddedDetail + chalk.green('║'));
    }
  }

  console.log(chalk.green(`╚${line}╝`));
  console.log('');
}

/**
 * Show an error message
 */
export function showError(title, message) {
  console.log('');
  console.log(chalk.red(`✗ ${chalk.bold(title)}`));
  if (message) {
    console.log(chalk.red(`  ${message}`));
  }
  console.log('');
}

/**
 * Show a warning message
 */
export function showWarning(message) {
  console.log(chalk.yellow(`⚠ ${message}`));
}

/**
 * Show info message
 */
export function showInfo(message) {
  console.log(chalk.blue(`ℹ ${message}`));
}
