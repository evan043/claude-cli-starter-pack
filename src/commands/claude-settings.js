/**
 * Claude Settings Command
 *
 * This file is now a thin wrapper that re-exports from the modularized
 * config/ directory for backwards compatibility.
 *
 * The actual implementation has been split into:
 * - config/permission-config.js  (Permission modes and rules)
 * - config/github-config.js      (GitHub Project Board integration)
 * - config/tech-stack-config.js  (Tech stack detection/config)
 * - config/agent-config.js       (Agent-Only mode launchers)
 * - config/index.js              (Unified entry point)
 *
 * @see https://github.com/evan043/claude-cli-advanced-starter-pack/issues/51
 */

// Re-export everything from the modularized config
export {
  // Main entry point
  runClaudeSettings,

  // Permission config
  configurePermissionMode,
  configurePermissions,
  viewCurrentSettings,
  PERMISSION_MODES,

  // GitHub config
  configureGitHubSettings,
  loadGitHubSettings,
  saveGitHubSettings,
  DEFAULT_GITHUB_SETTINGS,
  generateGitHubSettingsUpdater,

  // Tech stack config
  configureTechStackSettings,
  loadTechStack,
  saveTechStack,

  // Agent config
  createAgentOnlyLauncher,
  generateAgentOnlyPolicy,
  generateAgentsJson,
  generateWindowsBatch,
  generatePowerShellLauncher,
  generateBashLauncher,
} from './config/index.js';

// Default export
export { default } from './config/index.js';
