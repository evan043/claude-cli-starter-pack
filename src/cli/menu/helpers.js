/**
 * Helper Functions for Menu System
 * Settings management, status checks, and configuration utilities
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadTechStack, saveTechStack } from '../../utils.js';
import { isDevMode, getDevModeInfo, hasPendingRestore, loadDevState, clearPendingProjects } from '../../utils/dev-mode-state.js';
import { restoreProject, getLatestBackup } from '../../utils/project-backup.js';
import { DEV_MODE_BANNER } from './constants.js';

/**
 * Get bypass permissions status from settings.json
 */
export function getBypassPermissionsStatus() {
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  if (!existsSync(settingsPath)) {
    return false;
  }
  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    return settings.permissions?.defaultMode === 'bypassPermissions';
  } catch {
    return false;
  }
}

/**
 * Get Vision & Epics enabled status from tech-stack.json
 */
export function getVisionEpicsStatus() {
  const techStack = loadTechStack();
  return techStack?.visionEpics?.enabled || false;
}

/**
 * Toggle Vision & Epics in tech-stack.json
 */
export function toggleVisionEpics() {
  const techStack = loadTechStack();

  if (!techStack.visionEpics) {
    techStack.visionEpics = { enabled: false };
  }

  const newState = !techStack.visionEpics.enabled;
  techStack.visionEpics.enabled = newState;

  saveTechStack(techStack);
  return newState;
}

/**
 * Toggle bypass permissions in settings.json
 */
export function toggleBypassPermissions() {
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  let settings = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    } catch {
      settings = {};
    }
  }

  if (!settings.permissions) {
    settings.permissions = {};
  }

  const currentMode = settings.permissions.defaultMode;
  const newMode = currentMode === 'bypassPermissions' ? 'acceptEdits' : 'bypassPermissions';
  settings.permissions.defaultMode = newMode;

  // Ensure directory exists
  const dir = dirname(settingsPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  return newMode === 'bypassPermissions';
}

/**
 * Show development mode indicator if active
 */
export function showDevModeIndicator() {
  if (isDevMode()) {
    console.log(chalk.bgYellow.black(DEV_MODE_BANNER));
    const info = getDevModeInfo();
    if (info) {
      console.log(chalk.yellow(`  Worktree: ${info.worktreePath}`));
      console.log(chalk.yellow(`  Version: ${info.version} (dev)`));
      if (info.projectCount > 0) {
        console.log(chalk.yellow(`  Projects with backups: ${info.projectCount}`));
      }
    }
    console.log('');
  }
}

/**
 * Check for pending project restoration after dev mode
 */
export async function checkPendingRestore() {
  if (!hasPendingRestore()) {
    return;
  }

  const devState = loadDevState();
  const projectCount = devState.projects?.length || 0;

  console.log(chalk.yellow('\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.yellow('  ⚠️  Dev mode was recently deactivated'));
  console.log(chalk.yellow(`  ${projectCount} project(s) may need to be restored or updated`));
  console.log(chalk.yellow('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do with backed up projects?',
    choices: [
      { name: 'Restore projects from backup (keep customizations)', value: 'restore' },
      { name: 'Update projects to npm version (fresh install)', value: 'update' },
      { name: 'Skip for now (ask again later)', value: 'skip' },
      { name: 'Clear backups (no restore needed)', value: 'clear' }
    ]
  }]);

  if (action === 'restore') {
    console.log(chalk.cyan('\n  Restoring projects from backup...\n'));
    let restored = 0;
    let failed = 0;

    for (const project of devState.projects) {
      const backup = getLatestBackup(project.path);
      if (backup) {
        console.log(chalk.dim(`  Restoring ${project.name}...`));
        const result = restoreProject(backup);
        if (result.success) {
          console.log(chalk.green(`  ✓ Restored ${project.name}`));
          restored++;
        } else {
          console.log(chalk.red(`  ✗ Failed: ${result.errors.join(', ')}`));
          failed++;
        }
      }
    }

    console.log(chalk.green(`\n  ✓ Restored ${restored} project(s)`));
    if (failed > 0) {
      console.log(chalk.yellow(`  ⚠️  Failed ${failed} project(s)`));
    }
    clearPendingProjects();
  } else if (action === 'update') {
    console.log(chalk.cyan('\n  Projects will be updated on next ccasp init.\n'));
    clearPendingProjects();
  } else if (action === 'clear') {
    clearPendingProjects();
    console.log(chalk.dim('\n  Backups cleared.\n'));
  }
  // 'skip' does nothing - will ask again next time
}

/**
 * Get deploy command based on platform
 */
export function getDeployCommand(type, answers) {
  if (type === 'frontend') {
    switch (answers.platform) {
      case 'cloudflare':
        return `npx wrangler pages deploy dist --project-name=${answers.projectName || '{{PROJECT_NAME}}'}`;
      case 'vercel':
        return 'vercel --prod';
      case 'netlify':
        return 'netlify deploy --prod';
      case 'github-pages':
        return 'npm run deploy'; // Typically uses gh-pages package
      default:
        return null;
    }
  }
  return null;
}
