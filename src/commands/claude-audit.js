/**
 * Claude Audit Command
 *
 * Audits CLAUDE.md files and .claude/ folder structure against
 * Anthropic's Claude Code CLI best practices.
 *
 * Reference: https://code.claude.com/docs/en/best-practices
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { showHeader } from '../cli/menu.js';
import { detectTechStack } from './detect-tech-stack.js';

// Import from refactored modules
import {
  createAuditResult,
  ENHANCEMENT_TEMPLATES,
  auditClaudeMdFiles,
  auditClaudeFolder,
  calculateOverallScore,
  displayAuditResults,
  showDetailedFixes,
  showBestPracticesReference,
} from './audit/index.js';

/**
 * Main audit runner
 */
export async function runClaudeAudit(options = {}) {
  const cwd = options.cwd || process.cwd();

  showHeader('Claude Code Audit');

  console.log(chalk.dim('Auditing against Anthropic best practices...'));
  console.log(chalk.dim('Reference: https://code.claude.com/docs/en/best-practices'));
  console.log('');

  const spinner = ora('Scanning project...').start();

  const results = {
    claudeMd: createAuditResult(),
    claudeFolder: createAuditResult(),
    overall: createAuditResult(),
  };

  // Audit CLAUDE.md files
  spinner.text = 'Auditing CLAUDE.md files...';
  auditClaudeMdFiles(cwd, results.claudeMd);

  // Audit .claude folder
  spinner.text = 'Auditing .claude/ folder structure...';
  auditClaudeFolder(cwd, results.claudeFolder);

  // Calculate overall score
  calculateOverallScore(results);

  spinner.succeed('Audit complete');
  console.log('');

  // Display results
  displayAuditResults(results);

  // Show fix suggestions
  if (options.interactive !== false) {
    await showFixSuggestions(results, cwd);
  }

  return results;
}

/**
 * Show fix suggestions interactively
 */
async function showFixSuggestions(results, cwd) {
  const { overall } = results;

  if (overall.errors === 0 && overall.warnings === 0) {
    console.log(chalk.green.bold('🎉 Great job! Your Claude configuration follows best practices.'));
    console.log('');

    // Still offer enhancement even if passing
    const { wantEnhance } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'wantEnhance',
        message: 'Would you like to enhance CLAUDE.md with additional sections based on your tech stack?',
        default: false,
      },
    ]);

    if (wantEnhance) {
      await runEnhancement(cwd);
    }
    return;
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: chalk.cyan('✨ Auto-enhance CLAUDE.md (Recommended)'), value: 'enhance' },
        { name: 'Show detailed fix instructions', value: 'details' },
        { name: 'Show best practices reference', value: 'reference' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  if (action === 'enhance') {
    await runEnhancement(cwd);
  } else if (action === 'details') {
    showDetailedFixes(results);
  } else if (action === 'reference') {
    showBestPracticesReference();
  }
}

/**
 * Run CLAUDE.md enhancement
 */
async function runEnhancement(cwd) {
  console.log('');
  console.log(chalk.bold('━'.repeat(60)));
  console.log(chalk.bold.cyan('🚀 CLAUDE.md Enhancement Mode'));
  console.log(chalk.bold('━'.repeat(60)));
  console.log('');

  const spinner = ora('Detecting tech stack...').start();

  // Detect tech stack
  const techStack = await detectTechStack(cwd, { silent: true });

  spinner.succeed('Tech stack detected');

  // Show what was detected
  console.log('');
  console.log(chalk.cyan('Detected Technologies:'));
  const detected = techStack._detected || [];
  for (const item of detected.slice(0, 8)) {
    console.log(`  ${chalk.green('✓')} ${item}`);
  }
  if (detected.length > 8) {
    console.log(chalk.dim(`  ... and ${detected.length - 8} more`));
  }
  console.log('');

  // Get project name
  const projectName = techStack.project?.name || basename(cwd);

  // Ask what to enhance
  const { enhanceMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'enhanceMode',
      message: 'What would you like to do?',
      choices: [
        { name: 'Generate full CLAUDE.md from scratch', value: 'full' },
        { name: 'Add missing sections to existing CLAUDE.md', value: 'add' },
        { name: 'Generate specific section', value: 'section' },
        { name: 'Preview generated content', value: 'preview' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (enhanceMode === 'back') return;

  if (enhanceMode === 'preview') {
    console.log('');
    console.log(chalk.bold('━'.repeat(60)));
    console.log(chalk.bold('Generated CLAUDE.md Preview:'));
    console.log(chalk.bold('━'.repeat(60)));
    console.log('');
    console.log(ENHANCEMENT_TEMPLATES.fullTemplate(techStack, projectName));
    console.log(chalk.bold('━'.repeat(60)));
    console.log('');

    const { savePreview } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'savePreview',
        message: 'Save this to CLAUDE.md?',
        default: false,
      },
    ]);

    if (savePreview) {
      await saveClaudeMd(cwd, techStack, projectName, 'full');
    }
    return;
  }

  if (enhanceMode === 'section') {
    const { section } = await inquirer.prompt([
      {
        type: 'list',
        name: 'section',
        message: 'Which section to generate?',
        choices: [
          { name: 'Quick Start (commands to run)', value: 'quickStart' },
          { name: 'Tech Stack Table', value: 'techStackTable' },
          { name: 'Key Locations', value: 'keyLocations' },
          { name: 'Import Patterns', value: 'importPatterns' },
          { name: 'Testing Instructions', value: 'testingInstructions' },
          { name: 'Deployment Section', value: 'deploymentSection' },
          { name: 'Architecture Rules', value: 'architectureRules' },
          { name: 'Critical Rules', value: 'criticalRules' },
          { name: 'Reference Documentation Links', value: 'referenceLinks' },
        ],
      },
    ]);

    const content = ENHANCEMENT_TEMPLATES[section](techStack);
    console.log('');
    console.log(chalk.bold('Generated Content:'));
    console.log(chalk.bold('━'.repeat(60)));
    console.log(content);
    console.log(chalk.bold('━'.repeat(60)));
    console.log('');

    const { appendSection } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'appendSection',
        message: 'Append this section to CLAUDE.md?',
        default: true,
      },
    ]);

    if (appendSection) {
      await appendToClaudeMd(cwd, content);
    }
    return;
  }

  if (enhanceMode === 'full') {
    await saveClaudeMd(cwd, techStack, projectName, 'full');
    return;
  }

  if (enhanceMode === 'add') {
    await addMissingSections(cwd, techStack, projectName);
    return;
  }
}

/**
 * Save full CLAUDE.md
 */
async function saveClaudeMd(cwd, techStack, projectName, _mode) {
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  const backupPath = join(cwd, 'CLAUDE.md.backup');

  // Check for existing file
  if (existsSync(claudeMdPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'list',
        name: 'overwrite',
        message: 'CLAUDE.md already exists. What would you like to do?',
        choices: [
          { name: 'Backup existing and replace', value: 'backup' },
          { name: 'Merge with existing (add missing sections)', value: 'merge' },
          { name: 'Cancel', value: 'cancel' },
        ],
      },
    ]);

    if (overwrite === 'cancel') {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }

    if (overwrite === 'backup') {
      const existingContent = readFileSync(claudeMdPath, 'utf8');
      writeFileSync(backupPath, existingContent, 'utf8');
      console.log(chalk.dim(`Backed up to ${backupPath}`));
    }

    if (overwrite === 'merge') {
      await addMissingSections(cwd, techStack, projectName);
      return;
    }
  }

  // Generate and save
  const content = ENHANCEMENT_TEMPLATES.fullTemplate(techStack, projectName);
  writeFileSync(claudeMdPath, content, 'utf8');

  console.log(chalk.green.bold('✓ CLAUDE.md generated successfully!'));
  console.log(chalk.dim(`  Path: ${claudeMdPath}`));
  console.log('');

  // Show stats
  const lines = content.split('\n').length;
  console.log(chalk.cyan('Stats:'));
  console.log(`  Lines: ${lines} (recommended: <60, max: 300)`);
  console.log(`  Size: ${(content.length / 1024).toFixed(1)} KB`);
  console.log('');
}

/**
 * Append content to existing CLAUDE.md
 */
async function appendToClaudeMd(cwd, content) {
  const claudeMdPath = join(cwd, 'CLAUDE.md');

  let existingContent = '';
  if (existsSync(claudeMdPath)) {
    existingContent = readFileSync(claudeMdPath, 'utf8');
  }

  const newContent = existingContent.trim() + '\n\n' + content;
  writeFileSync(claudeMdPath, newContent, 'utf8');

  console.log(chalk.green.bold('✓ Section appended to CLAUDE.md'));
}

/**
 * Add missing sections to existing CLAUDE.md
 */
async function addMissingSections(cwd, techStack, _projectName) {
  const claudeMdPath = join(cwd, 'CLAUDE.md');

  let existingContent = '';
  if (existsSync(claudeMdPath)) {
    existingContent = readFileSync(claudeMdPath, 'utf8');
  }

  const missingSections = [];

  // Check which sections are missing
  const sectionChecks = [
    { pattern: /##\s*quick\s*start/i, name: 'Quick Start', key: 'quickStart' },
    { pattern: /##\s*tech\s*stack/i, name: 'Tech Stack', key: 'techStackTable' },
    { pattern: /##\s*key\s*locations/i, name: 'Key Locations', key: 'keyLocations' },
    { pattern: /##\s*import\s*patterns/i, name: 'Import Patterns', key: 'importPatterns' },
    { pattern: /##\s*testing/i, name: 'Testing', key: 'testingInstructions' },
    { pattern: /##\s*deploy/i, name: 'Deployment', key: 'deploymentSection' },
    { pattern: /##\s*architecture/i, name: 'Architecture Rules', key: 'architectureRules' },
    { pattern: /##\s*critical/i, name: 'Critical Rules', key: 'criticalRules' },
    { pattern: /##\s*reference/i, name: 'Reference Links', key: 'referenceLinks' },
  ];

  for (const check of sectionChecks) {
    if (!check.pattern.test(existingContent)) {
      missingSections.push(check);
    }
  }

  if (missingSections.length === 0) {
    console.log(chalk.green.bold('✓ CLAUDE.md already has all recommended sections!'));
    return;
  }

  console.log('');
  console.log(chalk.yellow(`Found ${missingSections.length} missing sections:`));
  for (const section of missingSections) {
    console.log(`  ${chalk.dim('-')} ${section.name}`);
  }
  console.log('');

  const { sectionsToAdd } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'sectionsToAdd',
      message: 'Select sections to add:',
      choices: missingSections.map((s) => ({
        name: s.name,
        value: s.key,
        checked: true,
      })),
    },
  ]);

  if (sectionsToAdd.length === 0) {
    console.log(chalk.yellow('No sections selected.'));
    return;
  }

  // Generate and append selected sections
  let newContent = existingContent.trim();

  for (const key of sectionsToAdd) {
    const sectionContent = ENHANCEMENT_TEMPLATES[key](techStack);
    if (sectionContent.trim()) {
      newContent += '\n\n' + sectionContent;
    }
  }

  writeFileSync(claudeMdPath, newContent, 'utf8');

  console.log(chalk.green.bold(`✓ Added ${sectionsToAdd.length} sections to CLAUDE.md`));
}

/**
 * Interactive menu entry point
 */
export async function showClaudeAuditMenu() {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Claude Code Configuration Audit:',
      choices: [
        { name: 'Run Full Audit', value: 'full' },
        { name: 'Audit CLAUDE.md only', value: 'claudemd' },
        { name: 'Audit .claude/ folder only', value: 'folder' },
        { name: chalk.cyan('✨ Enhance CLAUDE.md (NEW)'), value: 'enhance' },
        { name: 'Show Best Practices Reference', value: 'reference' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (mode === 'back') return;

  if (mode === 'reference') {
    showBestPracticesReference();
    return;
  }

  if (mode === 'enhance') {
    await runEnhancement(process.cwd());
    return;
  }

  await runClaudeAudit({ mode });
}

// Export enhancement templates for use by other modules
export { ENHANCEMENT_TEMPLATES, runEnhancement };
