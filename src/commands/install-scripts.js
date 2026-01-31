/**
 * Install Scripts Command
 *
 * Copies utility scripts from templates to project's .claude/scripts/ directory.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { showHeader } from '../cli/menu.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../../templates/scripts');

/**
 * Available scripts with descriptions
 */
const SCRIPTS = [
  {
    id: 'validate-deployment',
    file: 'validate-deployment.js',
    name: 'Deployment Validator',
    description: 'Pre-deployment environment validation for Railway, Cloudflare, Vercel',
    category: 'deployment',
  },
  {
    id: 'poll-deployment-status',
    file: 'poll-deployment-status.js',
    name: 'Deployment Poller',
    description: 'Poll deployment status until complete or timeout',
    category: 'deployment',
  },
  {
    id: 'roadmap-scanner',
    file: 'roadmap-scanner.js',
    name: 'Roadmap Scanner',
    description: 'Multi-roadmap progress dashboard',
    category: 'project',
  },
  {
    id: 'analyze-delegation-log',
    file: 'analyze-delegation-log.js',
    name: 'Delegation Log Analyzer',
    description: 'Analyze Claude Code model usage and token consumption',
    category: 'analysis',
  },
  {
    id: 'autonomous-decision-logger',
    file: 'autonomous-decision-logger.js',
    name: 'Decision Logger',
    description: 'JSONL audit trail for agent decisions',
    category: 'logging',
  },
  {
    id: 'phase-validation-gates',
    file: 'phase-validation-gates.js',
    name: 'Phase Validation Gates',
    description: '5-gate validation (EXIST, INIT, REGISTER, INVOKE, PROPAGATE)',
    category: 'phased-dev',
  },
  {
    id: 'git-history-analyzer',
    file: 'git-history-analyzer.py',
    name: 'Git History Analyzer',
    description: 'Security audit for sensitive data in git history (Python)',
    category: 'security',
  },
];

/**
 * Run the install-scripts command
 */
export async function runInstallScripts(options = {}) {
  showHeader('Install Utility Scripts');

  console.log(chalk.dim('Copy utility scripts to .claude/scripts/ for project use.\n'));

  const targetDir = join(process.cwd(), '.claude/scripts');

  // Show available scripts
  if (options.list) {
    return showScriptList();
  }

  // Interactive selection
  const { selections } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selections',
      message: 'Select scripts to install:',
      choices: SCRIPTS.map((script) => {
        const installed = existsSync(join(targetDir, script.file));
        const status = installed ? chalk.green(' [installed]') : '';

        return {
          name: `${script.name}${status}\n   ${chalk.dim(script.description)}`,
          value: script.id,
          short: script.name,
          checked: !installed,
        };
      }),
      pageSize: 10,
    },
  ]);

  if (selections.length === 0) {
    console.log(chalk.yellow('\nNo scripts selected.'));
    return;
  }

  // Create target directory
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
    console.log(chalk.dim(`Created ${targetDir}`));
  }

  // Copy selected scripts
  const spinner = ora('Installing scripts...').start();
  const results = [];

  for (const scriptId of selections) {
    const script = SCRIPTS.find((s) => s.id === scriptId);
    if (!script) continue;

    try {
      const sourcePath = join(TEMPLATES_DIR, script.file);
      const targetPath = join(targetDir, script.file);

      if (!existsSync(sourcePath)) {
        results.push({ script, success: false, error: 'Template not found' });
        continue;
      }

      copyFileSync(sourcePath, targetPath);
      results.push({ script, success: true });
    } catch (error) {
      results.push({ script, success: false, error: error.message });
    }
  }

  spinner.stop();

  // Copy README if not exists
  const readmePath = join(targetDir, 'README.md');
  if (!existsSync(readmePath)) {
    try {
      const sourceReadme = join(TEMPLATES_DIR, 'README.md');
      if (existsSync(sourceReadme)) {
        copyFileSync(sourceReadme, readmePath);
      }
    } catch (e) {
      // Ignore
    }
  }

  // Display results
  console.log(chalk.cyan.bold('\n📋 Installation Results\n'));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    console.log(chalk.green('✓ Installed:'));
    for (const result of successful) {
      console.log(`  - ${result.script.name}`);
    }
  }

  if (failed.length > 0) {
    console.log(chalk.red('\n✗ Failed:'));
    for (const result of failed) {
      console.log(`  - ${result.script.name}: ${result.error}`);
    }
  }

  // Show usage tips
  if (successful.length > 0) {
    console.log(chalk.cyan('\n📚 Usage Tips\n'));
    console.log(chalk.dim(`Scripts installed to: ${targetDir}\n`));

    for (const result of successful) {
      const script = result.script;
      if (script.file.endsWith('.js')) {
        console.log(chalk.white(`${script.name}:`));
        console.log(chalk.dim(`  node .claude/scripts/${script.file} --help`));
      } else if (script.file.endsWith('.py')) {
        console.log(chalk.white(`${script.name}:`));
        console.log(chalk.dim(`  python .claude/scripts/${script.file} --help`));
      }
      console.log('');
    }
  }
}

/**
 * Show list of available scripts
 */
function showScriptList() {
  const targetDir = join(process.cwd(), '.claude/scripts');

  console.log(chalk.cyan.bold('Available Scripts\n'));

  // Group by category
  const categories = {};
  for (const script of SCRIPTS) {
    if (!categories[script.category]) {
      categories[script.category] = [];
    }
    categories[script.category].push(script);
  }

  for (const [category, scripts] of Object.entries(categories)) {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    console.log(chalk.white.bold(`\n${categoryName}:`));

    for (const script of scripts) {
      const installed = existsSync(join(targetDir, script.file));
      const status = installed ? chalk.green(' [installed]') : '';

      console.log(`  ${script.name}${status}`);
      console.log(chalk.dim(`    ${script.description}`));
      console.log(chalk.dim(`    File: ${script.file}`));
    }
  }

  console.log('');
}

export default runInstallScripts;
