/**
 * Validate Command
 *
 * Validates templates for hardcoded values and ensures platform agnosticism.
 */

import chalk from 'chalk';
import { join } from 'path';
import { existsSync } from 'fs';
import { showHeader, showSuccess, showError } from '../cli/menu.js';
import { scanDirectory, formatViolations } from '../utils/validate-templates.js';

/**
 * Run template validation
 */
export async function runValidate(options = {}) {
  showHeader('Template Validation');

  const { path: targetPath = 'templates', fix = false, verbose = false } = options;

  const fullPath = join(process.cwd(), targetPath);

  if (!existsSync(fullPath)) {
    showError('Directory not found', `Could not find: ${fullPath}`);
    return false;
  }

  console.log(chalk.dim(`  Scanning: ${fullPath}`));
  console.log(chalk.dim(`  Checking for hardcoded values...\n`));

  const violations = scanDirectory(fullPath, {
    extensions: ['.md', '.js', '.ts', '.json'],
    exclude: ['node_modules', '.git', 'dist', 'build', 'cache'],
  });

  console.log(formatViolations(violations));

  if (violations.length === 0) {
    showSuccess('Validation Passed', [
      '',
      'All templates use parameterized values.',
      'No hardcoded project-specific values detected.',
    ]);
    return true;
  }

  console.log(chalk.yellow('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.yellow.bold('\nHow to Fix:\n'));
  console.log(chalk.dim('  1. Replace hardcoded values with {{placeholder}} syntax'));
  console.log(chalk.dim('  2. Add the placeholder path to tech-stack.schema.json'));
  console.log(chalk.dim('  3. Set default values in tech-stack.defaults.json'));
  console.log('');
  console.log(chalk.dim('  Example transformations:'));
  console.log(chalk.dim('    --project-name=my-project'));
  console.log(chalk.green('    --project-name={{deployment.frontend.projectName}}'));
  console.log('');
  console.log(chalk.dim('    ngrok http 5174'));
  console.log(chalk.green('    {{devEnvironment.tunnel.startCommand}}'));
  console.log('');
  console.log(chalk.dim('    projectId: "abc123-..."'));
  console.log(chalk.green('    projectId: "{{deployment.backend.projectId}}"'));
  console.log('');

  return false;
}

export default runValidate;
