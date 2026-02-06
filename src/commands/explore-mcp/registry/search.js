/**
 * MCP Registry Search & Recommendations
 *
 * Query, search, and recommendation functions for the MCP registry.
 */

import { MCP_REGISTRY, CORE_TESTING_MCPS } from './catalog.js';

/**
 * Get all MCPs as flat list
 */
export function getAllMcps() {
  return Object.values(MCP_REGISTRY).flat();
}

/**
 * Get MCPs by category
 */
export function getMcpsByCategory(category) {
  return MCP_REGISTRY[category] || [];
}

/**
 * Get recommended MCPs for a tech stack
 *
 * @param {Object} analysis - Codebase analysis result
 * @returns {Array} Recommended MCPs sorted by relevance
 */
export function getRecommendedMcps(analysis) {
  const allMcps = getAllMcps();
  const recommendations = [];

  // Build relevance keywords from analysis
  const keywords = new Set(['all']);

  if (analysis.frontend.detected) {
    keywords.add('frontend');
    keywords.add(analysis.frontend.framework?.toLowerCase());
  }

  if (analysis.backend.detected) {
    keywords.add('backend');
    keywords.add('api');
    keywords.add(analysis.backend.framework?.toLowerCase());
    keywords.add(analysis.backend.language?.toLowerCase());
  }

  if (analysis.database.detected) {
    keywords.add(analysis.database.type?.toLowerCase());
    if (analysis.database.orm) {
      keywords.add(analysis.database.orm.toLowerCase());
    }
  }

  if (analysis.deployment.detected) {
    keywords.add(analysis.deployment.platform?.toLowerCase());
  }

  if (analysis.testing.detected) {
    keywords.add('testing');
    keywords.add('e2e');
    if (analysis.testing.e2e) {
      keywords.add(analysis.testing.e2e.toLowerCase());
    }
  }

  // Add services keywords (Supabase, n8n, etc.)
  if (analysis.services?.detected) {
    if (analysis.services.supabase) {
      keywords.add('supabase');
      keywords.add('auth');
      keywords.add('storage');
      keywords.add('realtime');
    }
    if (analysis.services.n8n) {
      keywords.add('n8n');
      keywords.add('automation');
      keywords.add('workflow');
      keywords.add('integration');
    }
    if (analysis.services.resend) {
      keywords.add('email');
      keywords.add('notifications');
    }
  }

  // Score each MCP
  for (const mcp of allMcps) {
    let score = 0;

    // Base score for recommended MCPs
    if (mcp.recommended) score += 10;

    // Score based on relevance
    for (const keyword of mcp.relevantFor) {
      if (keywords.has(keyword.toLowerCase())) {
        score += 5;
      }
    }

    // Testing MCPs get bonus for frontend projects
    if (mcp.category === 'testing' && keywords.has('frontend')) {
      score += 8;
    }

    if (score > 0) {
      recommendations.push({ ...mcp, score });
    }
  }

  // Sort by score descending
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Get testing MCPs specifically (always recommended for web projects)
 */
export function getTestingMcps() {
  return MCP_REGISTRY.testing;
}

/**
 * Search MCPs by name or description
 */
export function searchMcps(query) {
  const allMcps = getAllMcps();
  const queryLower = query.toLowerCase();

  return allMcps.filter(
    (mcp) =>
      mcp.name.toLowerCase().includes(queryLower) ||
      mcp.description.toLowerCase().includes(queryLower) ||
      mcp.id.toLowerCase().includes(queryLower) ||
      mcp.tools.some((t) => t.toLowerCase().includes(queryLower))
  );
}

/**
 * Get MCP by ID
 */
export function getMcpById(id) {
  return getAllMcps().find((mcp) => mcp.id === id);
}

/**
 * Get all categories
 */
export function getCategories() {
  return Object.keys(MCP_REGISTRY).map((key) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    count: MCP_REGISTRY[key].length,
  }));
}

/**
 * Get core testing MCPs that should always be offered
 * @returns {Array} Core testing MCP objects with source tag
 */
export function getCoreTestingMcps() {
  const allMcps = getAllMcps();
  return CORE_TESTING_MCPS
    .map((id) => {
      const mcp = allMcps.find((m) => m.id === id);
      if (mcp) {
        return {
          ...mcp,
          source: 'core-testing',
          score: 50, // High base score for core testing
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Merge MCP results from multiple sources with de-duplication
 *
 * Priority order:
 * 1. Core testing MCPs (always first)
 * 2. Dynamic web discoveries
 * 3. Static recommendations
 *
 * @param {Array} staticMcps - MCPs from static registry recommendations
 * @param {Array} dynamicMcps - MCPs discovered via web search
 * @param {Array} coreTestingMcps - Core testing MCPs to always include
 * @returns {Array} Merged and de-duplicated MCPs sorted by score
 */
export function mergeMcpResults(staticMcps = [], dynamicMcps = [], coreTestingMcps = []) {
  const seen = new Set();
  const merged = [];

  // Helper to add MCPs while tracking duplicates
  const addMcps = (mcps, defaultSource) => {
    for (const mcp of mcps) {
      // Create unique key from id or npmPackage
      const key = mcp.id || mcp.npmPackage || mcp.name?.toLowerCase().replace(/\s+/g, '-');

      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          ...mcp,
          source: mcp.source || defaultSource,
          score: mcp.score || 0,
        });
      }
    }
  };

  // Add in priority order
  addMcps(coreTestingMcps, 'core-testing');
  addMcps(dynamicMcps, 'dynamic');
  addMcps(staticMcps, 'static');

  // Sort by score descending
  return merged.sort((a, b) => b.score - a.score);
}
