/**
 * Folder Structure Creation
 * Creates .claude directory structure
 */

import chalk from 'chalk';
import { existsSync, mkdirSync } from 'fs';

/**
 * Create folder structure for .claude
 * @param {Object} paths - Directory paths object
 */
export function createFolderStructure(paths) {
  console.log(chalk.bold('Step 1: Setting up .claude/ folder structure\n'));
  console.log(chalk.dim('  (Only creates missing folders - existing content preserved)\n'));

  const foldersToCreate = [
    { path: paths.claudeDir, name: '.claude' },
    { path: paths.commandsDir, name: '.claude/commands' },
    { path: paths.skillsDir, name: '.claude/skills' },
    { path: paths.agentsDir, name: '.claude/agents' },
    { path: paths.hooksDir, name: '.claude/hooks' },
    { path: paths.docsDir, name: '.claude/docs' },
  ];

  for (const folder of foldersToCreate) {
    if (!existsSync(folder.path)) {
      mkdirSync(folder.path, { recursive: true });
      console.log(chalk.green(`  ✓ Created ${folder.name}/`));
    } else {
      console.log(chalk.dim(`  ○ ${folder.name}/ exists`));
    }
  }

  console.log('');
}
