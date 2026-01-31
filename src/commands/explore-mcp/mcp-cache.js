/**
 * MCP Discovery Cache
 *
 * Caches dynamically discovered MCPs from web searches
 * with TTL (time-to-live) for freshness.
 */

import fs from 'fs';
import path from 'path';

// Cache TTL: 24 hours in milliseconds
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Get the path to ccasp-state.json
 */
function getStatePath() {
  const possiblePaths = [
    path.join(process.cwd(), '.claude', 'config', 'ccasp-state.json'),
    path.join(process.cwd(), '.claude', 'ccasp-state.json'),
  ];

  for (const statePath of possiblePaths) {
    if (fs.existsSync(statePath)) {
      return statePath;
    }
  }

  // Default to .claude/config/ path
  const defaultPath = path.join(process.cwd(), '.claude', 'config', 'ccasp-state.json');
  const configDir = path.dirname(defaultPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  return defaultPath;
}

/**
 * Load the current state file
 */
function loadState() {
  const statePath = getStatePath();

  if (!fs.existsSync(statePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Save state to file
 */
function saveState(state) {
  const statePath = getStatePath();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Load cached MCP discovery results
 * @returns {Object|null} Cached discovery with mcps array, or null if expired/missing
 */
export function loadCachedDiscovery() {
  const state = loadState();

  if (!state.mcpDiscovery) {
    return null;
  }

  const { timestamp, mcps, searchKeywords } = state.mcpDiscovery;

  // Check if cache is still valid
  const age = Date.now() - timestamp;
  if (age > CACHE_TTL_MS) {
    return null; // Cache expired
  }

  return {
    mcps: mcps || [],
    searchKeywords: searchKeywords || [],
    timestamp,
    age,
    expiresIn: CACHE_TTL_MS - age,
  };
}

/**
 * Save discovered MCPs to cache
 * @param {Array} mcps - Array of discovered MCP objects
 * @param {Array} searchKeywords - Keywords used for discovery
 */
export function saveCachedDiscovery(mcps, searchKeywords = []) {
  const state = loadState();

  state.mcpDiscovery = {
    timestamp: Date.now(),
    mcps: mcps.map((mcp) => ({
      ...mcp,
      source: 'dynamic',
      discoveredAt: new Date().toISOString(),
    })),
    searchKeywords,
  };

  saveState(state);

  return {
    saved: mcps.length,
    expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  };
}

/**
 * Clear the discovery cache
 */
export function clearCachedDiscovery() {
  const state = loadState();
  delete state.mcpDiscovery;
  saveState(state);
}

/**
 * Add a single discovered MCP to the cache
 * @param {Object} mcp - MCP object to add
 */
export function addDiscoveredMcp(mcp) {
  const state = loadState();

  if (!state.mcpDiscovery) {
    state.mcpDiscovery = {
      timestamp: Date.now(),
      mcps: [],
      searchKeywords: [],
    };
  }

  // Check for duplicates by id or npmPackage
  const exists = state.mcpDiscovery.mcps.some(
    (existing) => existing.id === mcp.id || existing.npmPackage === mcp.npmPackage
  );

  if (!exists) {
    state.mcpDiscovery.mcps.push({
      ...mcp,
      source: 'dynamic',
      discoveredAt: new Date().toISOString(),
    });
    state.mcpDiscovery.timestamp = Date.now();
    saveState(state);
    return true;
  }

  return false;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const cached = loadCachedDiscovery();

  if (!cached) {
    return {
      hasCached: false,
      count: 0,
      age: null,
      expiresIn: null,
    };
  }

  return {
    hasCached: true,
    count: cached.mcps.length,
    age: cached.age,
    expiresIn: cached.expiresIn,
    searchKeywords: cached.searchKeywords,
  };
}
