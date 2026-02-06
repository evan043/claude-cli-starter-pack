/**
 * MCP Explorer Flow Handlers
 *
 * Individual flow implementations for MCP exploration menus.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - flows/discovery.js - Smart recommendations and dynamic MCP discovery
 * - flows/install.js - Testing MCPs, installed MCPs, MCP details, docs update
 * - flows/browse.js - Browse by category and search flows
 */

export { runRecommendedFlow, runDiscoverFlow } from './flows/discovery.js';
export { runTestingFlow, runInstalledFlow, runUpdateDocsFlow, showMcpDetails } from './flows/install.js';
export { runBrowseFlow, runSearchFlow } from './flows/browse.js';
