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
import { loadRegistry } from '../../utils/global-registry.js';
import { DEV_MODE_BANNER } from './constants.js';
import { claudeAbsolutePath } from '../../utils/paths.js';

/**
 * Get bypass permissions status from settings.json
 */
export function getBypassPermissionsStatus() {
  const settingsPath = claudeAbsolutePath(process.cwd(), 'settings.json');
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
  const settingsPath = claudeAbsolutePath(process.cwd(), 'settings.json');
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

/**
 * Get worktree sync status for the menu banner
 * @returns {Object|null} Sync status or null if not in dev mode
 */
export async function getDevModeSyncStatus() {
  if (!isDevMode()) {
    return null;
  }

  const devInfo = getDevModeInfo();
  if (!devInfo || !devInfo.worktreePath) {
    return null;
  }

  const registry = loadRegistry();
  if (!registry.projects || registry.projects.length === 0) {
    return null;
  }

  try {
    // Dynamically import to avoid circular dependency
    const { getAllProjectsSyncStatus } = await import('../../utils/smart-sync.js');
    const statuses = await getAllProjectsSyncStatus(devInfo.worktreePath, registry.projects);

    // Aggregate status across all projects
    let totalCanUpdate = 0;
    let totalWillPreserve = 0;
    let totalNew = 0;

    for (const status of statuses) {
      totalCanUpdate += status.canUpdate || 0;
      totalWillPreserve += status.willPreserve || 0;
      if (status.hasNew) totalNew++;
    }

    return {
      projectCount: statuses.length,
      canUpdate: totalCanUpdate,
      willPreserve: totalWillPreserve,
      hasNew: totalNew > 0,
      worktreePath: devInfo.worktreePath
    };
  } catch {
    return null;
  }
}

/**
 * Format dev mode sync banner for menu display
 * @param {Object} syncStatus - Status from getDevModeSyncStatus
 * @returns {string|null} Formatted banner or null
 */
export function formatDevModeSyncBanner(syncStatus) {
  if (!syncStatus) {
    return null;
  }

  const lines = [];
  lines.push('');
  lines.push(chalk.cyan('┌────────────────────────────────────────────────────────────┐'));
  lines.push(chalk.cyan('│') + chalk.bold.yellow(' 📦 Worktree Sync Available') + ' '.repeat(33) + chalk.cyan('│'));

  if (syncStatus.canUpdate > 0) {
    const updateLine = ` ${syncStatus.canUpdate} files can be updated`;
    const preserveLine = syncStatus.willPreserve > 0
      ? `, ${syncStatus.willPreserve} customizations preserved`
      : '';
    const fullLine = updateLine + preserveLine;
    lines.push(chalk.cyan('│') + chalk.dim(fullLine.padEnd(60)) + chalk.cyan('│'));
  }

  lines.push(chalk.cyan('│') + chalk.dim(' Run /dev-mode-deploy-to-projects or press [W] to sync'.padEnd(60)) + chalk.cyan('│'));
  lines.push(chalk.cyan('└────────────────────────────────────────────────────────────┘'));
  lines.push('');

  return lines.join('\n');
}

/**
 * Execute worktree sync for current project
 * @param {Object} options - Sync options
 * @param {boolean} options.dryRun - Preview only
 * @param {boolean} options.force - Force overwrite
 * @returns {Object} Sync results
 */
export async function executeWorktreeSync(options = {}) {
  if (!isDevMode()) {
    return { error: 'Dev mode is not active' };
  }

  const devInfo = getDevModeInfo();
  if (!devInfo || !devInfo.worktreePath) {
    return { error: 'Could not determine worktree path' };
  }

  const projectPath = process.cwd();
  if (!existsSync(join(projectPath, '.claude'))) {
    return { error: 'No .claude directory found in current project' };
  }

  try {
    const { executeSyncActions, formatSyncResults } = await import('../../utils/smart-sync.js');
    const results = await executeSyncActions(projectPath, devInfo.worktreePath, {
      dryRun: options.dryRun || false,
      force: options.force || false,
      preserveCustomizations: !options.force
    });

    return {
      success: true,
      results,
      formatted: formatSyncResults(results)
    };
  } catch (error) {
    return { error: error.message };
  }
}
