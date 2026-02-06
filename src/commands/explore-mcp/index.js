/**
 * MCP Explorer Module Exports
 *
 * Unified re-exports from all explore-mcp submodules.
 */

// Registry exports
export {
  getAllMcps,
  getMcpsByCategory,
  getRecommendedMcps,
  getTestingMcps,
  getCoreTestingMcps,
  searchMcps,
  getMcpById,
  getCategories,
  mergeMcpResults,
  mcpRequiresApiKey,
  getMcpApiKeyInfo,
  fetchAnthropicRegistry,
  transformApiServer,
  getAnthropicRegistryMcps,
} from './mcp-registry.js';

// Installer exports
export {
  installMcp,
  installMultipleMcps,
  isMcpInstalled,
  getInstalledMcps,
  removeMcp,
  loadClaudeSettings,
  saveClaudeSettings,
} from './mcp-installer.js';

// CLAUDE.md updater exports
export { updateClaudeMd, removeMcpSection } from './claude-md-updater.js';

// Cache exports
export {
  loadCachedDiscovery,
  saveCachedDiscovery,
  loadCachedRegistry,
  saveCachedRegistry,
  clearCachedRegistry,
} from './mcp-cache.js';

// Display exports
export { displayInstallResults, showExploreMcpHelp } from './display.js';

// Tech stack exports
export { loadTechStackJson, ensureTechStackAnalysis, buildSearchKeywords } from './tech-stack.js';

// API key hook exports
export {
  isApiKeyHookEnabled,
  enableApiKeyHook,
  disableApiKeyHook,
  deployApiKeyHook,
  getEmbeddedHookTemplate,
  runApiKeyHookFlow,
} from './api-key-hook.js';

// Flow exports
export {
  runRecommendedFlow,
  runTestingFlow,
  runBrowseFlow,
  runSearchFlow,
  runInstalledFlow,
  runUpdateDocsFlow,
  runDiscoverFlow,
  showMcpDetails,
} from './flows.js';
