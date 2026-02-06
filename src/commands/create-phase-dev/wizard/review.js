/**
 * Wizard Review - Plan Review & Confirmation
 *
 * Displays a summary of all wizard inputs and prompts for confirmation.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * Step 4: Review and Confirm
 */
export async function reviewAndConfirm(config) {
  console.log(chalk.cyan.bold('\n\u{1f4dd} Step 4: Review Plan\n'));

  console.log(chalk.white.bold('Project:'));
  console.log(`  Name: ${chalk.cyan(config.projectName)}`);
  console.log(`  Slug: ${chalk.cyan(config.projectSlug)}`);
  console.log('');

  console.log(chalk.white.bold('Scale Assessment:'));
  console.log(`  Scale: ${chalk.yellow(config.scale)} (${config.scaleName})`);
  console.log(`  Phases: ${chalk.yellow(config.phases.length)}`);
  console.log(`  Estimated Tasks: ${chalk.yellow(config.taskEstimate)}`);
  console.log('');

  console.log(chalk.white.bold('Phases:'));
  config.phases.forEach((phase, i) => {
    console.log(`  ${i + 1}. ${chalk.green(phase.name)} - ${phase.description}`);
  });
  console.log('');

  console.log(chalk.white.bold('Architecture:'));
  console.log(`  Stack: ${chalk.dim(config.architecture.summary)}`);
  console.log(
    `  Auth: ${config.architecture.needsAuth ? chalk.green('Yes') : chalk.dim('No')}`
  );
  console.log(
    `  Realtime: ${config.architecture.needsRealtime ? chalk.green('Yes') : chalk.dim('No')}`
  );
  if (config.architecture.autoDetected) {
    console.log(`  ${chalk.dim('(auto-detected from codebase)')}`);
  }
  console.log('');

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Generate phased development plan with these settings?',
      default: true,
    },
  ]);

  return confirmed;
}
