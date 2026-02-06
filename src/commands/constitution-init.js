/**
 * Constitution Init Command
 *
 * Initialize AI Constitution in a project's .claude/config/ folder.
 * Creates a constitution.yaml file with configurable defaults.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { replacePlaceholders } from '../utils/template-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default constitution configuration presets
 */
const PRESETS = {
  senior: {
    name: 'Senior Fullstack Developer',
    description: 'Strict typing, architecture patterns, security focus',
    sampling_rate: 0.05,
    enabled_sections: ['code_style', 'architecture', 'security', 'performance', 'git', 'dependencies'],
  },
  minimal: {
    name: 'Minimal',
    description: 'Only critical security rules',
    sampling_rate: 0.02,
    enabled_sections: ['security'],
  },
  strict: {
    name: 'Strict',
    description: 'All rules enabled, higher sampling rate',
    sampling_rate: 0.15,
    enabled_sections: ['code_style', 'architecture', 'security', 'performance', 'git', 'dependencies', 'custom'],
  },
  custom: {
    name: 'Custom',
    description: 'Configure each setting manually',
    sampling_rate: 0.05,
    enabled_sections: [],
  },
};

/**
 * Get the template path
 */
function getTemplatePath() {
  // Try multiple possible locations
  const possiblePaths = [
    join(__dirname, '..', '..', 'templates', 'docs', 'AI_CONSTITUTION.template.yaml'),
    join(__dirname, '..', '..', '..', 'templates', 'docs', 'AI_CONSTITUTION.template.yaml'),
    join(process.cwd(), 'templates', 'docs', 'AI_CONSTITUTION.template.yaml'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Get the output path for constitution
 */
function getOutputPath(cwd = process.cwd()) {
  return join(cwd, '.claude', 'config', 'constitution.yaml');
}

/**
 * Check if constitution already exists
 */
function constitutionExists(cwd = process.cwd()) {
  return existsSync(getOutputPath(cwd));
}

/**
 * Create backup of existing constitution
 */
function createBackup(cwd = process.cwd()) {
  const outputPath = getOutputPath(cwd);
  if (existsSync(outputPath)) {
    const backupPath = `${outputPath  }.backup.${  Date.now()}`;
    copyFileSync(outputPath, backupPath);
    return backupPath;
  }
  return null;
}

/**
 * Load and process the constitution template
 */
function loadTemplate(projectName, options = {}) {
  const templatePath = getTemplatePath();

  if (!templatePath) {
    throw new Error('Constitution template not found. Please ensure CCASP is properly installed.');
  }

  let content = readFileSync(templatePath, 'utf8');

  // Replace placeholders
  const values = {
    project: {
      name: projectName,
    },
    date: new Date().toISOString(),
  };

  content = replacePlaceholders(content, values);

  // Apply preset modifications
  if (options.preset && options.preset !== 'custom') {
    const preset = PRESETS[options.preset];
    if (preset) {
      // Modify sampling rate
      content = content.replace(
        /sampling_rate:\s*[\d.]+/,
        `sampling_rate: ${preset.sampling_rate}`
      );

      // Disable sections not in preset
      const allSections = ['code_style', 'architecture', 'security', 'performance', 'git', 'dependencies', 'custom'];
      for (const section of allSections) {
        if (!preset.enabled_sections.includes(section)) {
          // Find section and set enabled to false
          const sectionRegex = new RegExp(`(${section}:\\s*\\n\\s*title:[^\\n]*\\n)\\s*enabled:\\s*true`, 'g');
          content = content.replace(sectionRegex, `$1    enabled: false`);
        }
      }
    }
  }

  // Apply custom sampling rate
  if (options.sampling_rate !== undefined) {
    content = content.replace(
      /sampling_rate:\s*[\d.]+/,
      `sampling_rate: ${options.sampling_rate}`
    );
  }

  return content;
}

/**
 * Interactive constitution initialization
 */
export async function runConstitutionInit(options = {}) {
  const cwd = options.cwd || process.cwd();
  const projectName = options.projectName || basename(cwd);

  console.log('');
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.magenta.bold('  📜 AI Constitution Setup'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  // Check if constitution already exists
  if (constitutionExists(cwd) && !options.force) {
    console.log(chalk.yellow('  ⚠ Constitution already exists at:'));
    console.log(chalk.yellow(`    ${getOutputPath(cwd)}`));
    console.log('');

    if (!options.quiet) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Keep existing constitution', value: 'keep' },
            { name: 'Backup and replace', value: 'replace' },
            { name: 'View current constitution', value: 'view' },
          ],
        },
      ]);

      if (action === 'keep') {
        console.log(chalk.green('\n  ✓ Keeping existing constitution'));
        return { success: true, action: 'kept' };
      }

      if (action === 'view') {
        const content = readFileSync(getOutputPath(cwd), 'utf8');
        console.log('');
        console.log(chalk.cyan('Current constitution:'));
        console.log(chalk.dim('─'.repeat(60)));
        console.log(content);
        console.log(chalk.dim('─'.repeat(60)));
        return { success: true, action: 'viewed' };
      }

      // Backup existing
      const backupPath = createBackup(cwd);
      if (backupPath) {
        console.log(chalk.green(`  ✓ Backed up to: ${backupPath}`));
      }
    }
  }

  // Select preset
  let selectedPreset = options.preset;
  if (!selectedPreset && !options.quiet) {
    console.log(chalk.white('  Select a configuration preset:'));
    console.log('');

    const { preset } = await inquirer.prompt([
      {
        type: 'list',
        name: 'preset',
        message: 'Constitution preset:',
        choices: Object.entries(PRESETS).map(([key, value]) => ({
          name: `${value.name} - ${value.description}`,
          value: key,
        })),
        default: 'senior',
      },
    ]);
    selectedPreset = preset;
  } else if (!selectedPreset) {
    selectedPreset = 'senior';
  }

  // Custom configuration
  let samplingRate = PRESETS[selectedPreset]?.sampling_rate || 0.05;
  if (selectedPreset === 'custom' && !options.quiet) {
    const { rate } = await inquirer.prompt([
      {
        type: 'list',
        name: 'rate',
        message: 'Sampling rate (how often to check edits):',
        choices: [
          { name: '2% (1 in 50) - Minimal impact', value: 0.02 },
          { name: '5% (1 in 20) - Recommended', value: 0.05 },
          { name: '10% (1 in 10) - Moderate', value: 0.10 },
          { name: '15% (1 in ~7) - Strict', value: 0.15 },
          { name: '25% (1 in 4) - Very strict', value: 0.25 },
          { name: '100% - Check every edit', value: 1.0 },
        ],
        default: 1,
      },
    ]);
    samplingRate = rate;
  }

  // Generate constitution
  const spinner = ora('Generating constitution...').start();

  try {
    // Ensure config directory exists
    const configDir = join(cwd, '.claude', 'config');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Load and process template
    const content = loadTemplate(projectName, {
      preset: selectedPreset,
      sampling_rate: samplingRate,
    });

    // Write constitution
    const outputPath = getOutputPath(cwd);
    writeFileSync(outputPath, content, 'utf8');

    spinner.succeed('Constitution generated');

    console.log('');
    console.log(chalk.green('  ✓ Created: .claude/config/constitution.yaml'));
    console.log('');
    console.log(chalk.cyan('  Configuration:'));
    console.log(chalk.white(`    Preset: ${PRESETS[selectedPreset].name}`));
    console.log(chalk.white(`    Sampling: ${(samplingRate * 100).toFixed(0)}% of edits checked`));
    console.log('');

    // Show hook installation reminder
    console.log(chalk.yellow('  ⚠ To enable enforcement, install the constitution hook:'));
    console.log(chalk.dim('    Run: ccasp init --hooks'));
    console.log('');

    return {
      success: true,
      action: 'created',
      path: outputPath,
      preset: selectedPreset,
      sampling_rate: samplingRate,
    };

  } catch (error) {
    spinner.fail('Failed to generate constitution');
    console.error(chalk.red(`\n  Error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Quick constitution init (non-interactive)
 */
export async function quickConstitutionInit(cwd = process.cwd(), preset = 'senior') {
  return runConstitutionInit({
    cwd,
    preset,
    quiet: true,
  });
}

/**
 * Check if constitution exists
 */
export function hasConstitution(cwd = process.cwd()) {
  return constitutionExists(cwd);
}

/**
 * Get constitution path
 */
export function getConstitutionPath(cwd = process.cwd()) {
  return getOutputPath(cwd);
}

export default {
  runConstitutionInit,
  quickConstitutionInit,
  hasConstitution,
  getConstitutionPath,
  PRESETS,
};
