/**
 * Asset Loader Module
 *
 * Handles file loading, asset reading, and path resolution
 * for local and template versions of CCASP assets.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Asset type to file path mapping
 */
export const ASSET_PATHS = {
  commands: {
    local: (projectDir, name) => join(projectDir, '.claude', 'commands', `${name}.md`),
    template: (name) => join(__dirname, '..', '..', '..', 'templates', 'commands', `${name}.template.md`),
    extension: '.md',
  },
  skills: {
    local: (projectDir, name) => join(projectDir, '.claude', 'skills', name, 'SKILL.md'),
    template: (name) => join(__dirname, '..', '..', '..', 'templates', 'skills', name, 'SKILL.template.md'),
    extension: '.md',
  },
  agents: {
    local: (projectDir, name) => join(projectDir, '.claude', 'agents', `${name}.md`),
    template: (name) => join(__dirname, '..', '..', '..', 'templates', 'agents', `${name}.template.md`),
    extension: '.md',
  },
  hooks: {
    local: (projectDir, name) => join(projectDir, '.claude', 'hooks', `${name}.js`),
    template: (name) => join(__dirname, '..', '..', '..', 'templates', 'hooks', `${name}.template.js`),
    extension: '.js',
  },
};

/**
 * Get the local (user's) version of an asset
 */
export function getLocalAsset(assetType, assetName, projectDir = process.cwd()) {
  const pathConfig = ASSET_PATHS[assetType];
  if (!pathConfig) return null;

  const localPath = pathConfig.local(projectDir, assetName);

  if (!existsSync(localPath)) {
    return null;
  }

  try {
    return {
      path: localPath,
      content: readFileSync(localPath, 'utf8'),
      stats: statSync(localPath),
    };
  } catch (error) {
    console.error(chalk.yellow(`Warning: Failed to read local asset ${assetName} - ${error.message}`));
    return null;
  }
}

/**
 * Get the template (package) version of an asset
 */
export function getTemplateAsset(assetType, assetName) {
  const pathConfig = ASSET_PATHS[assetType];
  if (!pathConfig) return null;

  const templatePath = pathConfig.template(assetName);

  if (!existsSync(templatePath)) {
    return null;
  }

  try {
    return {
      path: templatePath,
      content: readFileSync(templatePath, 'utf8'),
      stats: statSync(templatePath),
    };
  } catch (error) {
    console.error(chalk.yellow(`Warning: Failed to read template asset ${assetName} - ${error.message}`));
    return null;
  }
}

