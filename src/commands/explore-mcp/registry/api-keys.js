/**
 * MCP Registry API Key Management
 *
 * API key validation, information retrieval, and MCP normalization.
 */

import { getAllMcps } from './search.js';

/**
 * Check if an MCP requires an API key
 * @param {Object} mcp - MCP object from registry
 * @returns {boolean} True if API key is required
 */
export function mcpRequiresApiKey(mcp) {
  // Explicit apiKeyRequired field takes precedence
  if (typeof mcp.apiKeyRequired === 'boolean') {
    return mcp.apiKeyRequired;
  }
  // Fall back to checking requiredEnv
  return mcp.requiredEnv && Object.keys(mcp.requiredEnv).length > 0;
}

/**
 * Get API key information for an MCP
 * @param {Object} mcp - MCP object from registry
 * @returns {Object|null} API key info or null if not required
 */
export function getMcpApiKeyInfo(mcp) {
  if (!mcpRequiresApiKey(mcp)) {
    return null;
  }

  return {
    required: true,
    keyName: mcp.apiKeyName || Object.keys(mcp.requiredEnv || {})[0] || 'API_KEY',
    url: mcp.apiKeyUrl || null,
    free: mcp.apiKeyFree !== false, // Default to true if not specified
    note: mcp.apiKeyNote || mcp.requiredEnv?.[Object.keys(mcp.requiredEnv)[0]]?.description || null,
  };
}

/**
 * Get all MCPs that don't require API keys (good for quick start)
 * @returns {Array} MCPs that work without API keys
 */
export function getMcpsWithoutApiKeys() {
  return getAllMcps().filter((mcp) => !mcpRequiresApiKey(mcp));
}

/**
 * Validate and normalize a dynamically discovered MCP
 * @param {Object} rawMcp - Raw MCP data from web discovery
 * @returns {Object|null} Normalized MCP object or null if invalid
 */
export function normalizeDiscoveredMcp(rawMcp) {
  // Required fields
  if (!rawMcp.name && !rawMcp.npmPackage) {
    return null;
  }

  // Generate ID from name or package
  const id = rawMcp.id ||
    rawMcp.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
    rawMcp.npmPackage?.split('/').pop()?.replace('@', '').replace(/[^a-z0-9]+/g, '-');

  return {
    id,
    name: rawMcp.name || rawMcp.npmPackage,
    description: rawMcp.description || 'Discovered via web search',
    npmPackage: rawMcp.npmPackage || null,
    command: rawMcp.command || null,
    category: rawMcp.category || 'discovered',
    requiredEnv: rawMcp.requiredEnv || {},
    optionalEnv: rawMcp.optionalEnv || {},
    relevantFor: rawMcp.relevantFor || [],
    recommended: false,
    tools: rawMcp.tools || [],
    source: 'dynamic',
    discoveredAt: rawMcp.discoveredAt || new Date().toISOString(),
  };
}
