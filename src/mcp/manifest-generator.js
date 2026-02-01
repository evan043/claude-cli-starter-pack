/**
 * MCP Manifest Generator
 *
 * Generates MCP-Manifest.json with token cost awareness and permission control.
 * Part of Phase 3: MCP Governance (Issue #30)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Token usage classifications with thresholds
 */
export const TOKEN_CLASSIFICATIONS = {
  low: {
    label: 'Low',
    maxTokensPerCall: 500,
    description: 'Minimal token usage, safe for frequent use',
    color: 'green',
  },
  medium: {
    label: 'Medium',
    minTokensPerCall: 500,
    maxTokensPerCall: 2000,
    description: 'Moderate token usage, use with awareness',
    color: 'yellow',
  },
  high: {
    label: 'High',
    minTokensPerCall: 2000,
    description: 'Significant token usage, consider alternatives',
    color: 'red',
  },
};

/**
 * Known MCP token profiles
 */
export const MCP_TOKEN_PROFILES = {
  playwright: {
    classification: 'medium',
    estimatedPerCall: 800,
    estimatedPerSession: 5000,
    costFactors: ['Screenshot data', 'Page HTML content', 'Console logs'],
    tools: {
      browser_navigate: { tokens: 300, classification: 'low' },
      browser_click: { tokens: 200, classification: 'low' },
      browser_fill: { tokens: 200, classification: 'low' },
      browser_screenshot: { tokens: 2000, classification: 'high' },
      browser_snapshot: { tokens: 1500, classification: 'medium' },
      browser_evaluate: { tokens: 500, classification: 'medium' },
      browser_console_messages: { tokens: 1000, classification: 'medium' },
    },
  },
  'browser-monitor': {
    classification: 'medium',
    estimatedPerCall: 800,
    estimatedPerSession: 4000,
    costFactors: ['Screenshot data', 'DOM content'],
    tools: {
      puppeteer_navigate: { tokens: 300, classification: 'low' },
      puppeteer_screenshot: { tokens: 2000, classification: 'high' },
      puppeteer_click: { tokens: 200, classification: 'low' },
      puppeteer_fill: { tokens: 200, classification: 'low' },
    },
  },
  github: {
    classification: 'low',
    estimatedPerCall: 400,
    estimatedPerSession: 2000,
    costFactors: ['API response size', 'File contents'],
    tools: {
      create_issue: { tokens: 300, classification: 'low' },
      create_pull_request: { tokens: 400, classification: 'low' },
      get_file_contents: { tokens: 1000, classification: 'medium' },
      search_code: { tokens: 800, classification: 'medium' },
      list_commits: { tokens: 500, classification: 'low' },
    },
  },
  railway: {
    classification: 'low',
    estimatedPerCall: 300,
    estimatedPerSession: 1500,
    costFactors: ['Deployment logs', 'Service configurations'],
    tools: {
      deployment_trigger: { tokens: 200, classification: 'low' },
      deployment_status: { tokens: 300, classification: 'low' },
      deployment_logs: { tokens: 1500, classification: 'medium' },
      service_list: { tokens: 400, classification: 'low' },
    },
  },
  digitalocean: {
    classification: 'low',
    estimatedPerCall: 300,
    estimatedPerSession: 1500,
    costFactors: ['API responses', 'Resource listings'],
  },
  'log-monitor': {
    classification: 'medium',
    estimatedPerCall: 600,
    estimatedPerSession: 3000,
    costFactors: ['Log content size', 'Tail length'],
    tools: {
      logs_tail: { tokens: 1000, classification: 'medium' },
      logs_grep: { tokens: 800, classification: 'medium' },
      logs_watch: { tokens: 1500, classification: 'high' },
    },
  },
  skyvern: {
    classification: 'high',
    estimatedPerCall: 3000,
    estimatedPerSession: 15000,
    costFactors: ['Browser automation complexity', 'Task execution time'],
  },
  exa: {
    classification: 'medium',
    estimatedPerCall: 800,
    estimatedPerSession: 4000,
    costFactors: ['Search result content', 'Document extraction'],
  },
  resend: {
    classification: 'low',
    estimatedPerCall: 200,
    estimatedPerSession: 800,
    costFactors: ['Email content size'],
  },
};

/**
 * Default permissions by category
 */
export const DEFAULT_PERMISSIONS = {
  testing: { read: true, write: false, execute: true, network: true, filesystem: false },
  deployment: { read: true, write: true, execute: true, network: true, filesystem: false },
  database: { read: true, write: true, execute: false, network: true, filesystem: false },
  api: { read: true, write: true, execute: false, network: true, filesystem: false },
  browser: { read: true, write: false, execute: true, network: true, filesystem: false },
  search: { read: true, write: false, execute: false, network: true, filesystem: false },
  ai: { read: true, write: false, execute: false, network: true, filesystem: false },
  utility: { read: true, write: false, execute: false, network: false, filesystem: false },
};

/**
 * Get manifest file path
 * @param {string} projectRoot - Project root
 * @returns {string} Path to manifest
 */
export function getManifestPath(projectRoot = process.cwd()) {
  return join(projectRoot, 'mcp', 'MCP-Manifest.json');
}

/**
 * Load existing manifest
 * @param {string} projectRoot - Project root
 * @returns {object|null} Manifest or null
 */
export function loadManifest(projectRoot = process.cwd()) {
  const manifestPath = getManifestPath(projectRoot);

  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save manifest
 * @param {object} manifest - Manifest to save
 * @param {string} projectRoot - Project root
 * @returns {string} Path to saved manifest
 */
export function saveManifest(manifest, projectRoot = process.cwd()) {
  const manifestPath = getManifestPath(projectRoot);
  const dir = dirname(manifestPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  manifest.generated = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifestPath;
}

/**
 * Read .mcp.json to get installed MCPs
 * @param {string} projectRoot - Project root
 * @returns {object} MCP config
 */
export function readMcpJson(projectRoot = process.cwd()) {
  const mcpJsonPath = join(projectRoot, '.mcp.json');

  if (!existsSync(mcpJsonPath)) {
    // Check global location
    const globalPath = join(process.env.HOME || process.env.USERPROFILE || '', '.claude', '.mcp.json');
    if (existsSync(globalPath)) {
      return JSON.parse(readFileSync(globalPath, 'utf8'));
    }
    return { mcpServers: {} };
  }

  try {
    return JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
  } catch {
    return { mcpServers: {} };
  }
}

/**
 * Get token profile for an MCP
 * @param {string} mcpId - MCP identifier
 * @returns {object} Token profile
 */
export function getTokenProfile(mcpId) {
  // Normalize ID
  const normalizedId = mcpId.replace(/^mcp__/, '').split('__')[0].toLowerCase();

  // Check for known profile
  if (MCP_TOKEN_PROFILES[normalizedId]) {
    return MCP_TOKEN_PROFILES[normalizedId];
  }

  // Default profile
  return {
    classification: 'medium',
    estimatedPerCall: 500,
    estimatedPerSession: 2500,
    costFactors: ['API response size'],
  };
}

/**
 * Classify token usage
 * @param {number} tokens - Estimated tokens
 * @returns {string} Classification
 */
export function classifyTokenUsage(tokens) {
  if (tokens < TOKEN_CLASSIFICATIONS.low.maxTokensPerCall) {
    return 'low';
  } else if (tokens < TOKEN_CLASSIFICATIONS.medium.maxTokensPerCall) {
    return 'medium';
  }
  return 'high';
}

/**
 * Generate manifest from installed MCPs
 * @param {object} options - Generation options
 * @returns {object} Generated manifest
 */
export function generateManifest(options = {}) {
  const {
    projectRoot = process.cwd(),
    scope = 'project',
    includeTokenBudget = true,
  } = options;

  const mcpConfig = readMcpJson(projectRoot);
  const servers = {};

  // Process each installed MCP
  for (const [serverId, serverConfig] of Object.entries(mcpConfig.mcpServers || {})) {
    const tokenProfile = getTokenProfile(serverId);

    // Determine category from ID or command
    let category = 'utility';
    const idLower = serverId.toLowerCase();
    if (idLower.includes('playwright') || idLower.includes('puppeteer') || idLower.includes('browser')) {
      category = 'testing';
    } else if (idLower.includes('railway') || idLower.includes('cloudflare') || idLower.includes('digitalocean')) {
      category = 'deployment';
    } else if (idLower.includes('db') || idLower.includes('postgres') || idLower.includes('sql')) {
      category = 'database';
    } else if (idLower.includes('github') || idLower.includes('api')) {
      category = 'api';
    } else if (idLower.includes('search') || idLower.includes('exa')) {
      category = 'search';
    }

    servers[serverId] = {
      id: serverId,
      name: formatMcpName(serverId),
      description: `MCP server: ${serverId}`,
      command: serverConfig.command,
      args: serverConfig.args || [],
      enabled: true,
      category,
      permissions: DEFAULT_PERMISSIONS[category] || DEFAULT_PERMISSIONS.utility,
      tokenUsage: {
        classification: tokenProfile.classification,
        estimatedPerCall: tokenProfile.estimatedPerCall,
        estimatedPerSession: tokenProfile.estimatedPerSession,
        costFactors: tokenProfile.costFactors,
      },
      tools: generateToolsList(serverId, tokenProfile),
      requiredEnv: serverConfig.env || {},
    };
  }

  const manifest = {
    version: '1.0',
    generated: new Date().toISOString(),
    projectScope: scope,
    servers,
  };

  if (includeTokenBudget) {
    manifest.tokenBudget = {
      dailyLimit: 100000,
      warningThreshold: 0.75,
      trackUsage: true,
    };
  }

  return manifest;
}

/**
 * Format MCP ID to display name
 * @param {string} mcpId - MCP ID
 * @returns {string} Display name
 */
function formatMcpName(mcpId) {
  return mcpId
    .replace(/^mcp__/, '')
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate tools list from token profile
 * @param {string} mcpId - MCP ID
 * @param {object} tokenProfile - Token profile
 * @returns {Array} Tools list
 */
function generateToolsList(mcpId, tokenProfile) {
  if (!tokenProfile.tools) {
    return [];
  }

  return Object.entries(tokenProfile.tools).map(([toolName, toolProfile]) => ({
    name: toolName,
    enabled: true,
    tokenUsage: toolProfile.classification,
    estimatedTokens: toolProfile.tokens,
  }));
}

/**
 * Generate token cost awareness table
 * @param {object} manifest - MCP manifest
 * @returns {object} Table data for display
 */
export function generateTokenCostTable(manifest) {
  const rows = [];

  for (const [serverId, server] of Object.entries(manifest.servers || {})) {
    const tokenUsage = server.tokenUsage || {};

    if (tokenUsage.classification === 'medium' || tokenUsage.classification === 'high') {
      rows.push({
        mcp: server.name || serverId,
        classification: tokenUsage.classification,
        estimatedTokens: tokenUsage.estimatedPerCall,
        costFactors: (tokenUsage.costFactors || []).join(', '),
      });

      // Add high-token tools
      for (const tool of server.tools || []) {
        if (tool.tokenUsage === 'high') {
          rows.push({
            mcp: `  └─ ${tool.name}`,
            classification: 'high',
            estimatedTokens: tool.estimatedTokens,
            costFactors: 'Individual tool',
          });
        }
      }
    }
  }

  return {
    headers: ['MCP/Tool', 'Token Usage', 'Est. Tokens', 'Cost Factors'],
    rows,
  };
}

/**
 * Check if any MCPs need optimization
 * @param {object} manifest - MCP manifest
 * @returns {Array} MCPs that could be optimized
 */
export function getOptimizationCandidates(manifest) {
  const candidates = [];

  for (const [serverId, server] of Object.entries(manifest.servers || {})) {
    if (server.tokenUsage?.classification === 'high') {
      candidates.push({
        id: serverId,
        name: server.name,
        classification: server.tokenUsage.classification,
        estimatedPerSession: server.tokenUsage.estimatedPerSession,
        suggestion: getSuggestion(serverId),
      });
    }
  }

  return candidates;
}

/**
 * Get optimization suggestion for an MCP
 * @param {string} mcpId - MCP ID
 * @returns {string} Suggestion
 */
function getSuggestion(mcpId) {
  const suggestions = {
    playwright: 'Consider using browser_snapshot instead of browser_screenshot for most cases',
    'browser-monitor': 'Limit screenshot frequency; use selective screenshots',
    skyvern: 'Break complex tasks into smaller, targeted operations',
    'log-monitor': 'Use grep with specific patterns instead of full log tails',
  };

  const normalizedId = mcpId.replace(/^mcp__/, '').split('__')[0].toLowerCase();
  return suggestions[normalizedId] || 'Consider batching operations to reduce API calls';
}

export default {
  TOKEN_CLASSIFICATIONS,
  MCP_TOKEN_PROFILES,
  DEFAULT_PERMISSIONS,
  getManifestPath,
  loadManifest,
  saveManifest,
  readMcpJson,
  getTokenProfile,
  classifyTokenUsage,
  generateManifest,
  generateTokenCostTable,
  getOptimizationCandidates,
};
