/**
 * GitHub Configuration
 *
 * Configure GitHub Project Board integration, branch strategy, PR workflow,
 * and deployment settings.
 *
 * This file serves as a thin re-export wrapper for the modular implementation.
 */

export { DEFAULT_GITHUB_SETTINGS } from './github-config/data.js';
export { loadGitHubSettings, saveGitHubSettings } from './github-config/persistence.js';
export { configureGitHubSettings } from './github-config/handlers.js';
export { generateGitHubSettingsUpdater } from './github-config/templates.js';
