/**
 * Integration Configuration Management
 *
 * Handles loading and saving integration config files.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createEmptyIntegrationConfig } from '../schema.js';

export const CONFIG_PATH = '.claude/integrations/config.json';

/**
 * Load existing integration config
 */
export function loadConfig(cwd = process.cwd()) {
  const configPath = join(cwd, CONFIG_PATH);

  if (!existsSync(configPath)) {
    return createEmptyIntegrationConfig();
  }

  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return createEmptyIntegrationConfig();
  }
}

/**
 * Save integration config
 */
export function saveConfig(config, cwd = process.cwd()) {
  const configPath = join(cwd, CONFIG_PATH);
  const dir = dirname(configPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  config.last_modified = new Date().toISOString();
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}
