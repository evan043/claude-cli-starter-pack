/**
 * Tech Stack Template Applicator
 *
 * Apply tech stack configuration to .claude templates
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync } from 'fs';
import { join } from 'path';
import { showHeader, showSuccess, showWarning, showError } from '../../../cli/menu.js';
import { processDirectory } from '../../../utils/template-engine.js';
import { loadTechStack } from './persistence.js';

/**
 * Apply tech stack templates
 */
export async function applyTechStackTemplates(returnToMain) {
  showHeader('Apply Tech Stack Templates');

  const techStack = loadTechStack();

  if (!techStack) {
    showWarning('No tech-stack.json found. Run "Auto-Detect Tech Stack" first.');
    return returnToMain ? await returnToMain() : null;
  }

  console.log(chalk.dim('This will update .claude files to use your tech stack configuration.\n'));

  const { dryRun } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Run in dry-run mode first? (preview changes)',
      default: true,
    },
  ]);

  const claudeDir = join(process.cwd(), '.claude');
  if (!existsSync(claudeDir)) {
    showWarning('No .claude directory found.');
    return returnToMain ? await returnToMain() : null;
  }

  const spinner = ora('Processing templates...').start();

  try {
    const results = processDirectory(claudeDir, techStack, {
      dryRun,
      extensions: ['.md', '.json'],
      exclude: ['node_modules', '.git'],
    });

    spinner.succeed('Template processing complete');

    // Show summary
    const changed = results.filter((r) => r.changed);
    const totalPlaceholders = results.reduce((sum, r) => sum + r.placeholders, 0);
    const totalReplaced = results.reduce((sum, r) => sum + r.replaced, 0);

    console.log('');
    console.log(chalk.cyan('Summary:'));
    console.log(`  Files scanned: ${results.length}`);
    console.log(`  Files changed: ${changed.length}`);
    console.log(`  Placeholders found: ${totalPlaceholders}`);
    console.log(`  Placeholders replaced: ${totalReplaced}`);

    if (dryRun && changed.length > 0) {
      console.log('');
      console.log(chalk.yellow('Files that would be changed:'));
      changed.forEach((r) => console.log(`  ${r.file}`));

      const { apply } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'apply',
          message: 'Apply these changes for real?',
          default: true,
        },
      ]);

      if (apply) {
        // Run again without dry-run
        processDirectory(claudeDir, techStack, {
          dryRun: false,
          extensions: ['.md', '.json'],
          exclude: ['node_modules', '.git'],
        });
        showSuccess('Templates Applied', [`${changed.length} files updated`]);
      }
    } else if (!dryRun) {
      showSuccess('Templates Applied', [`${changed.length} files updated`]);
    }
  } catch (err) {
    spinner.fail('Template processing failed');
    showError('Error', err.message);
  }

  return returnToMain ? await returnToMain() : null;
}
