/**
 * GitHub Epic Menu Command
 *
 * Interactive menu for managing GitHub Epics.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - epic-menu/display.js - Desktop/mobile table display, epic details, session restart warning
 * - epic-menu/actions.js - Action handlers (sync, delete, testing issues)
 * - epic-menu/data.js - Epic data loading, migration, session state
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { showHeader } from '../cli/menu.js';
import { loadTechStack } from '../utils.js';
import { shouldUseMobileUI } from '../utils/happy-detect.js';

import {
  EPICS_DIR,
  LEGACY_ROADMAPS_DIR,
  INITIALIZED_MARKER,
  needsSessionRestart,
  markSessionInitialized,
  loadAllEpics,
  migrateToEpics,
} from './epic-menu/data.js';

import {
  formatDate,
  showSessionRestartWarning,
  displayDesktopTable,
  displayMobileList,
  displayEpicDetails,
} from './epic-menu/display.js';

import {
  handleEpicAction,
  syncEpicsWithGitHub,
  deleteEpic,
  createTestingIssues,
  createLocalTestingIssues,
  generateTestingIssueBody,
} from './epic-menu/actions.js';

export async function showGitHubEpicMenu(options = {}) {
  const cwd = process.cwd();
  const techStack = loadTechStack();
  const isMobile = shouldUseMobileUI(techStack);

  if (needsSessionRestart(cwd)) {
    showSessionRestartWarning();
    markSessionInitialized(cwd);
    return;
  }

  showHeader('GitHub Epic Management');

  const legacyDir = join(cwd, LEGACY_ROADMAPS_DIR);
  if (existsSync(legacyDir)) {
    const legacyFiles = readdirSync(legacyDir).filter(f => f.endsWith('.json'));
    if (legacyFiles.length > 0) {
      console.log(chalk.yellow(`  Found ${legacyFiles.length} legacy roadmap(s) to migrate.`));

      const { migrate } = await inquirer.prompt([{
        type: 'confirm',
        name: 'migrate',
        message: 'Migrate legacy roadmaps to GitHub Epics?',
        default: true,
      }]);

      if (migrate) {
        const result = await migrateToEpics(cwd);
        console.log(chalk.green(`  Migrated ${result.migrated} epic(s)`));
        if (result.errors.length > 0) {
          console.log(chalk.yellow(`  ${result.errors.length} migration error(s)`));
        }
        console.log('');
      }
    }
  }

  const epics = loadAllEpics(cwd);

  if (isMobile) {
    displayMobileList(epics);
  } else {
    displayDesktopTable(epics);
  }

  const choices = [];

  if (epics.length > 0) {
    for (let i = 0; i < Math.min(epics.length, 9); i++) {
      choices.push({
        name: `${i + 1}. ${(epics[i].title || epics[i].roadmap_name || 'Untitled').substring(0, 30)}`,
        value: `select-${i}`,
        short: `Epic ${i + 1}`,
      });
    }
    choices.push(new inquirer.Separator());
  }

  const actionChoices = [
    { name: isMobile ? '[V] View' : '[V] View Epic Details', value: 'view', short: 'View' },
    { name: isMobile ? '[N] New' : '[N] New Epic', value: 'new', short: 'New' },
    { name: isMobile ? '[S] Sync' : '[S] Sync with GitHub', value: 'sync', short: 'Sync' },
    { name: isMobile ? '[E] Edit' : '[E] Edit Epic', value: 'edit', short: 'Edit' },
    { name: isMobile ? '[T] Test' : '[T] Testing Issues', value: 'testing', short: 'Testing' },
    { name: isMobile ? '[D] Del' : '[D] Delete Epic', value: 'delete', short: 'Delete' },
    { name: isMobile ? '[R] Resume' : '[R] Resume Epic', value: 'resume', short: 'Resume' },
    new inquirer.Separator(),
    { name: isMobile ? '[B] Back' : '[B] Back to Main Menu', value: 'back', short: 'Back' },
  ];

  choices.push(...actionChoices);

  let selectedIndex = 0;

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: isMobile ? 'Choice:' : 'Select an epic or action:',
    choices,
    pageSize: isMobile ? 12 : 20,
  }]);

  if (action.startsWith('select-')) {
    selectedIndex = parseInt(action.replace('select-', ''));
    await handleEpicAction('view', epics, selectedIndex, cwd, isMobile);
  } else if (action === 'back') {
    return;
  } else {
    await handleEpicAction(action, epics, selectedIndex, cwd, isMobile);
  }

  const { returnToMenu } = await inquirer.prompt([{
    type: 'confirm',
    name: 'returnToMenu',
    message: 'Return to epic menu?',
    default: true,
  }]);

  if (returnToMenu) {
    await showGitHubEpicMenu(options);
  }
}

export async function runGitHubEpicMenu(options = {}) {
  return await showGitHubEpicMenu(options);
}

export { loadAllEpics as listEpics };
export { migrateToEpics };
