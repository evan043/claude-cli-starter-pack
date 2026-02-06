/**
 * MCP Registry & Discovery
 *
 * Curated registry of popular MCP servers with smart recommendations
 * based on detected tech stack. No hardcoded project-specific values.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - registry/catalog.js - MCP_REGISTRY data and CORE_TESTING_MCPS constant
 * - registry/search.js - Query, search, recommendation, and merge functions
 * - registry/api-keys.js - API key validation, info, and MCP normalization
 */

export { MCP_REGISTRY, CORE_TESTING_MCPS } from './registry/catalog.js';
export {
  getAllMcps,
  getMcpsByCategory,
  getRecommendedMcps,
  getTestingMcps,
  searchMcps,
  getMcpById,
  getCategories,
  getCoreTestingMcps,
  mergeMcpResults,
} from './registry/search.js';
export {
  mcpRequiresApiKey,
  getMcpApiKeyInfo,
  getMcpsWithoutApiKeys,
  normalizeDiscoveredMcp,
} from './registry/api-keys.js';
