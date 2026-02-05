/**
 * Settings File Management
 * Creates and updates settings.json and settings.local.json
 */

import chalk from 'chalk';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { safeWriteJson } from '../../utils/file-ops.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('init:settings');

/**
 * Create or update settings files
 * @param {Object} paths - Directory paths
 * @param {string} projectName - Project name
 * @param {Function} generateSettingsJson - Generator function
 * @param {Function} generateSettingsLocalJson - Generator function
 */
export function manageSettings(paths, projectName, generateSettingsJson, generateSettingsLocalJson) {
  console.log(chalk.bold('Step 2: Configuring settings\n'));
  console.log(chalk.dim('  (Skips existing files - your settings are preserved)\n'));

  const settingsPath = paths.settingsPath;
  const settingsLocalPath = paths.settingsLocalPath;

  // Create or update settings.json
  if (!existsSync(settingsPath)) {
    writeFileSync(settingsPath, generateSettingsJson(projectName), 'utf8');
    console.log(chalk.green('  ✓ Created settings.json'));
  } else {
    mergeUpdateCheckHook(settingsPath);
  }

  // Create settings.local.json if missing
  if (!existsSync(settingsLocalPath)) {
    writeFileSync(settingsLocalPath, generateSettingsLocalJson(), 'utf8');
    log.info(chalk.green('  ✓ Created settings.local.json'));
  } else {
    log.debug(chalk.blue('  ○ settings.local.json exists (preserved)'));
  }

  console.log('');
}

/**
 * Merge update check hook into existing settings.json
 * @param {string} settingsPath - Path to settings.json
 */
function mergeUpdateCheckHook(settingsPath) {
  try {
    const existingSettings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    let settingsUpdated = false;

    // Ensure hooks object exists
    if (!existingSettings.hooks) {
      existingSettings.hooks = {};
    }

    // Add UserPromptSubmit hook for update checking if not present
    if (!existingSettings.hooks.UserPromptSubmit) {
      existingSettings.hooks.UserPromptSubmit = [
        {
          matcher: '',
          hooks: [
            {
              type: 'command',
              command: 'node .claude/hooks/ccasp-update-check.js',
            },
          ],
        },
      ];
      settingsUpdated = true;
    } else {
      // Check if update check hook already exists
      const hasUpdateHook = existingSettings.hooks.UserPromptSubmit.some(
        (h) => h.hooks?.some((hook) => hook.command?.includes('ccasp-update-check'))
      );
      if (!hasUpdateHook) {
        existingSettings.hooks.UserPromptSubmit.push({
          matcher: '',
          hooks: [
            {
              type: 'command',
              command: 'node .claude/hooks/ccasp-update-check.js',
            },
          ],
        });
        settingsUpdated = true;
      }
    }

    if (settingsUpdated) {
      safeWriteJson(settingsPath, existingSettings);
      log.info(chalk.green('  ✓ Updated settings.json (added update check hook)'));
    } else {
      log.debug(chalk.blue('  ○ settings.json exists (preserved)'));
    }
  } catch (error) {
    log.debug(chalk.blue('  ○ settings.json exists (preserved)'));
  }
}
