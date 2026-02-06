/**
 * Install Skill Command
 *
 * Install individual skills to a project's .claude/skills/ folder
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import { importFromRepo } from './install-skill/importers/claude-skills-format.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Skills directory in the package
const SKILLS_DIR = join(__dirname, '..', '..', 'templates', 'skills');

/**
 * Get available skills from the package
 */
function getAvailableSkills() {
  const skills = [];

  try {
    if (!existsSync(SKILLS_DIR)) {
      return skills;
    }

    const dirs = readdirSync(SKILLS_DIR, { withFileTypes: true });

    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const manifestPath = join(SKILLS_DIR, dir.name, 'skill.json');
        const skillPath = join(SKILLS_DIR, dir.name, 'skill.md');

        if (existsSync(manifestPath) && existsSync(skillPath)) {
          try {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            skills.push({
              name: manifest.name || dir.name,
              description: manifest.description || 'No description',
              category: manifest.category || 'general',
              portability: manifest.portability || 100,
              directory: dir.name,
            });
          } catch (e) {
            // Skip invalid manifests
          }
        }
      }
    }
  } catch (e) {
    // Return empty array on error
  }

  return skills;
}

/**
 * Get installed skills in a project
 */
function getInstalledSkills(projectPath) {
  const skillsDir = join(projectPath, '.claude', 'skills');
  const installed = [];

  try {
    if (!existsSync(skillsDir)) {
      return installed;
    }

    const dirs = readdirSync(skillsDir, { withFileTypes: true });

    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const skillPath = join(skillsDir, dir.name, 'skill.md');
        if (existsSync(skillPath)) {
          installed.push(dir.name);
        }
      }
    }
  } catch (e) {
    // Return empty array on error
  }

  return installed;
}

/**
 * Install a skill to the project
 */
function installSkill(skillName, projectPath) {
  const sourcePath = join(SKILLS_DIR, skillName);
  const targetPath = join(projectPath, '.claude', 'skills', skillName);

  // Create target directory
  mkdirSync(targetPath, { recursive: true });

  // Copy all files recursively
  cpSync(sourcePath, targetPath, { recursive: true });

  return true;
}

/**
 * Import a skill from an external GitHub repository
 * @param {string} repoUrl - GitHub repo URL or owner/repo format
 * @param {string} skillPath - Path within the repo to the skill directory
 * @param {Object} options - Command options
 */
async function importExternalSkill(repoUrl, skillPath, options = {}) {
  const projectPath = options.project || process.cwd();
  const skillsDir = join(projectPath, '.claude', 'skills');

  if (!existsSync(join(projectPath, '.claude'))) {
    showError('No .claude directory found. Run `ccasp init` first.');
    return;
  }

  const spinner = ora(`Importing skill from ${repoUrl}...`).start();

  try {
    const result = await importFromRepo(repoUrl, skillPath, skillsDir);

    if (result.success) {
      spinner.succeed(`Imported skill: ${result.skillName}`);
      console.log(chalk.green(`\n  ✓ Skill installed to .claude/skills/${result.skillName}/`));
      console.log(chalk.yellow('  Restart Claude Code CLI to use the new skill.'));
    } else {
      spinner.fail('Import failed');
      for (const err of result.errors) {
        showError(err);
      }
    }
  } catch (error) {
    spinner.fail(`Import failed: ${error.message}`);
  }
}

/**
 * Main install-skill command
 */
export async function installSkillCommand(options = {}) {
  const projectPath = options.project || process.cwd();

  // Handle --from-repo flag for external skill import
  if (options.fromRepo) {
    const skillPath = options.skillPath || options.args?.[0] || '.';
    await importExternalSkill(options.fromRepo, skillPath, options);
    return;
  }

  showHeader();

  console.log(chalk.cyan('\n  Install Skills\n'));

  // Check if .claude directory exists
  const claudeDir = join(projectPath, '.claude');
  if (!existsSync(claudeDir)) {
    showError('No .claude directory found. Run `ccasp init` first.');
    return;
  }

  // Get available and installed skills
  const availableSkills = getAvailableSkills();
  const installedSkills = getInstalledSkills(projectPath);

  if (availableSkills.length === 0) {
    showWarning('No skills available in the package.');
    return;
  }

  // Show skill list
  console.log(chalk.white('  Available Skills:\n'));

  for (const skill of availableSkills) {
    const installed = installedSkills.includes(skill.directory);
    const status = installed ? chalk.green('✓ installed') : chalk.gray('not installed');

    console.log(
      `  ${chalk.cyan(skill.name.padEnd(20))} ${status}`
    );
    console.log(
      `    ${chalk.gray(skill.description)}`
    );
    console.log();
  }

  // Filter to uninstalled skills
  const uninstalledSkills = availableSkills.filter(
    (s) => !installedSkills.includes(s.directory)
  );

  if (uninstalledSkills.length === 0) {
    showSuccess('All available skills are already installed!');
    return;
  }

  // Ask which skills to install
  const { selectedSkills } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedSkills',
      message: 'Select skills to install:',
      choices: uninstalledSkills.map((skill) => ({
        name: `${skill.name} - ${skill.description}`,
        value: skill.directory,
        checked: false,
      })),
    },
  ]);

  if (selectedSkills.length === 0) {
    showInfo('No skills selected.');
    return;
  }

  // Install selected skills
  const spinner = ora('Installing skills...').start();

  try {
    for (const skillName of selectedSkills) {
      spinner.text = `Installing ${skillName}...`;
      installSkill(skillName, projectPath);
    }

    spinner.succeed(`Installed ${selectedSkills.length} skill(s)`);

    console.log(chalk.green('\n  ✓ Skills installed successfully!\n'));

    console.log(chalk.yellow('  To use a skill, restart Claude Code CLI and use:'));
    for (const skillName of selectedSkills) {
      console.log(chalk.cyan(`    skill: "${skillName}"`));
    }
    console.log();
  } catch (error) {
    spinner.fail('Installation failed');
    showError(`Error: ${error.message}`);
  }
}

/**
 * List available skills (non-interactive)
 */
export function listSkills() {
  const skills = getAvailableSkills();

  console.log(chalk.cyan('\n  Available CCASP Skills:\n'));

  for (const skill of skills) {
    console.log(`  ${chalk.white(skill.name)}`);
    console.log(`    ${chalk.gray(skill.description)}`);
    console.log(`    Category: ${chalk.yellow(skill.category)} | Portability: ${chalk.green(`${skill.portability  }%`)}`);
    console.log();
  }

  return skills;
}

export default installSkillCommand;
