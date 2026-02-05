/**
 * GitHub Configuration Persistence
 *
 * Read/write config to disk.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { DEFAULT_GITHUB_SETTINGS } from './data.js';

/**
 * Load existing GitHub settings or return defaults
 */
export function loadGitHubSettings() {
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  let settings = { github: { ...DEFAULT_GITHUB_SETTINGS } };

  if (existsSync(settingsPath)) {
    try {
      const fileSettings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (fileSettings.github) {
        settings.github = { ...DEFAULT_GITHUB_SETTINGS, ...fileSettings.github };
      }
      settings = { ...fileSettings, github: settings.github };
    } catch {
      // Use defaults
    }
  }

  return settings;
}

/**
 * Save GitHub settings
 */
export function saveGitHubSettings(settings) {
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  const dir = dirname(settingsPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  return settingsPath;
}
