/**
 * MCP Registry Search & Recommendations
 *
 * Query, search, and recommendation functions for the MCP registry.
 * Merges curated catalog with cached Anthropic registry data.
 */

import { MCP_REGISTRY, CORE_TESTING_MCPS } from './catalog.js';
import { loadCachedRegistry } from '../mcp-cache.js';

/**
 * Get all MCPs as flat list (curated + cached registry, deduped)
 */
export function getAllMcps() {
  const staticMcps = Object.values(MCP_REGISTRY).flat();

  const cached = loadCachedRegistry();
  if (!cached || !cached.mcps?.length) {
    return staticMcps;
  }

  // Curated catalog wins on ID collisions
  const staticIds = new Set(staticMcps.map((m) => m.id));
  const registryMcps = cached.mcps.filter((m) => !staticIds.has(m.id));

  return [...staticMcps, ...registryMcps];
}

/**
 * Get MCPs by category (curated + cached registry)
 */
export function getMcpsByCategory(category) {
  const staticMcps = MCP_REGISTRY[category] || [];

  const cached = loadCachedRegistry();
  if (!cached || !cached.mcps?.length) {
    return staticMcps;
  }

  const staticIds = new Set(staticMcps.map((m) => m.id));
  const registryMcps = cached.mcps.filter(
    (m) => m.category === category && !staticIds.has(m.id)
  );

  return [...staticMcps, ...registryMcps];
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
      (mcp.tools || []).some((t) => t.toLowerCase().includes(queryLower))
  );
}

/**
 * Get MCP by ID
 */
export function getMcpById(id) {
  return getAllMcps().find((mcp) => mcp.id === id);
}

/**
 * Get all categories (built dynamically from all MCPs)
 */
export function getCategories() {
  const allMcps = getAllMcps();
  const categories = {};

  // Start with static catalog categories
  for (const key of Object.keys(MCP_REGISTRY)) {
    categories[key] = {
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      count: 0,
    };
  }

  // Count all MCPs including registry
  for (const mcp of allMcps) {
    const cat = mcp.category || 'utilities';
    if (!categories[cat]) {
      categories[cat] = {
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        count: 0,
      };
    }
    categories[cat].count++;
  }

  // Filter out empty categories
  return Object.values(categories).filter((c) => c.count > 0);
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
