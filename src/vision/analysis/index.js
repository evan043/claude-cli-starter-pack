/**
 * Vision Mode Analysis Engine - Module Exports
 *
 * Provides analysis capabilities for vision-based app planning:
 * - Web search for similar apps and UI patterns
 * - Open source tool discovery (npm/pip packages)
 * - MCP server matching
 * - Account/API requirement detection
 *
 * @module vision/analysis
 */

export {
  searchSimilarApps,
  searchUIPatterns,
  searchOpenSourceTools
} from './web-search.js';

export {
  discoverNpmPackages,
  discoverPipPackages,
  rankByRelevance
} from './tool-discovery.js';

export {
  matchMCPServers,
  getMCPCapabilities
} from './mcp-matcher.js';

export {
  detectAccountRequirements,
  generateSetupChecklist
} from './account-detector.js';
