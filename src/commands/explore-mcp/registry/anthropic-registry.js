/**
 * Anthropic MCP Registry API Integration
 *
 * Fetches commercial MCP servers from Anthropic's official registry API.
 * Transforms API responses to our internal MCP entry format and
 * auto-categorizes servers into existing CCASP categories.
 */

const REGISTRY_BASE_URL = 'https://api.anthropic.com/mcp-registry/v0/servers';
const DEFAULT_PARAMS = {
  version: 'latest',
  visibility: 'commercial',
  limit: '100',
};

/**
 * Category keyword rules for auto-categorization.
 * Checked against server description + oneLiner + useCases + toolNames.
 */
const CATEGORY_RULES = [
  { category: 'testing', keywords: ['test', 'browser automation', 'playwright', 'puppeteer', 'selenium', 'e2e'] },
  { category: 'vcs', keywords: ['git', 'github', 'gitlab', 'bitbucket', 'version control', 'repository', 'commit', 'pull request'] },
  { category: 'deployment', keywords: ['deploy', 'hosting', 'cloud', 'infrastructure', 'netlify', 'vercel', 'railway', 'cloudflare', 'aws', 'ci/cd', 'kubernetes'] },
  { category: 'database', keywords: ['database', 'sql', 'postgres', 'mysql', 'mongo', 'redis', 'query', 'schema', 'table'] },
  { category: 'automation', keywords: ['workflow', 'automation', 'zapier', 'n8n', 'pipeline'] },
  { category: 'communication', keywords: ['email', 'slack', 'message', 'chat', 'notification', 'meeting', 'calendar', 'transcript'] },
  { category: 'ai', keywords: ['ai model', 'ml', 'embedding', 'vector', 'hugging face', 'llm', 'inference'] },
  { category: 'development', keywords: ['code navigation', 'ide', 'linter', 'formatter', 'refactor', 'language server'] },
  { category: 'debugging', keywords: ['debug', 'error tracking', 'sentry', 'observability', 'log monitor'] },
  { category: 'productivity', keywords: ['project', 'task', 'issue', 'board', 'jira', 'linear', 'asana', 'confluence', 'document', 'note', 'wiki'] },
  { category: 'analytics', keywords: ['analytics', 'insights', 'reporting', 'data', 'metrics', 'dashboard', 'amplitude', 'marketing'] },
  { category: 'research', keywords: ['academic', 'clinical', 'scientific', 'paper', 'preprint', 'biomedical', 'research'] },
  { category: 'utilities', keywords: ['file', 'fetch', 'http', 'utility', 'search', 'scrape'] },
];

/**
 * Fetch all servers from Anthropic's MCP registry with cursor pagination.
 * Uses built-in fetch (Node 18+).
 *
 * @param {Object} options
 * @param {number} [options.timeout=10000] - Request timeout in ms
 * @param {number} [options.maxPages=3] - Max pagination pages
 * @returns {Promise<Array>} Raw server objects from API
 */
export async function fetchAnthropicRegistry(options = {}) {
  const { timeout = 10000, maxPages = 3 } = options;
  const allServers = [];
  let cursor = null;
  let page = 0;

  while (page < maxPages) {
    const url = new URL(REGISTRY_BASE_URL);
    for (const [key, val] of Object.entries(DEFAULT_PARAMS)) {
      url.searchParams.set(key, val);
    }
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Registry API returned ${response.status}`);
      }

      const data = await response.json();
      const servers = data.servers || [];
      allServers.push(...servers);

      const nextCursor = data.metadata?.nextCursor;
      if (!nextCursor || servers.length === 0) break;

      cursor = nextCursor;
      page++;
    } catch (error) {
      clearTimeout(timer);
      if (error.name === 'AbortError') {
        throw new Error('Registry API request timed out');
      }
      throw error;
    }
  }

  return allServers;
}

/**
 * Auto-categorize a server based on its metadata.
 *
 * @param {Object} entry - Raw API server entry
 * @returns {string} Category ID
 */
function categorizeServer(entry) {
  const meta = entry._meta?.['com.anthropic.api/mcp-registry'] || {};
  const description = (entry.server?.description || '').toLowerCase();
  const oneLiner = (meta.oneLiner || '').toLowerCase();
  const useCases = (meta.useCases || []).map((u) => u.toLowerCase());
  const toolNames = (meta.toolNames || []).map((t) => t.toLowerCase());

  const searchText = [description, oneLiner, ...useCases, ...toolNames].join(' ');

  let bestCategory = 'utilities';
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (searchText.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
    }
  }

  return bestCategory;
}

/**
 * Transform a single API server entry to our internal MCP format.
 *
 * @param {Object} entry - Raw API server entry { server, _meta }
 * @returns {Object|null} Normalized MCP entry or null if filtered out
 */
export function transformApiServer(entry) {
  const meta = entry._meta?.['com.anthropic.api/mcp-registry'] || {};
  const server = entry.server || {};

  // Only include servers that work with claude-code
  const worksWith = meta.worksWith || [];
  if (!worksWith.includes('claude-code')) {
    return null;
  }

  // Extract remote URL (prefer streamable-http over sse)
  const remotes = server.remotes || [];
  const httpRemote = remotes.find((r) => r.type === 'streamable-http');
  const sseRemote = remotes.find((r) => r.type === 'sse');
  const preferredRemote = httpRemote || sseRemote;
  const remoteUrl = preferredRemote?.url;
  const remoteType = preferredRemote?.type || 'streamable-http';

  // Check for templated URLs (need user-specific setup)
  const isTemplatedUrl = remoteUrl?.includes('{');

  // Skip servers without a usable URL
  if (!remoteUrl || isTemplatedUrl) {
    // Still include if they have an npm package
    const npmPkg = server.packages?.find((p) => p.registryType === 'npm');
    if (!npmPkg && !remoteUrl) return null;
  }

  // Generate stable ID
  const id = meta.slug ||
    server.name?.split('/').pop()?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
    meta.displayName?.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  if (!id) return null;

  const category = categorizeServer(entry);

  // Check for npm package (some servers have both remote and stdio)
  const npmPkg = server.packages?.find((p) => p.registryType === 'npm');
  const envVars = npmPkg?.environmentVariables || [];

  // Build requiredEnv from npm package env vars
  const requiredEnv = {};
  for (const ev of envVars) {
    if (ev.required !== false) {
      requiredEnv[ev.name] = { description: ev.description || ev.name };
    }
  }

  // Determine transport
  const transport = isTemplatedUrl ? null : (remoteType === 'streamable-http' ? 'http' : remoteType);

  return {
    id,
    name: meta.displayName || server.title || server.name,
    description: meta.oneLiner || server.description || '',
    npmPackage: npmPkg?.identifier || null,
    category,
    requiredEnv,
    optionalEnv: {},
    relevantFor: meta.useCases || [],
    recommended: false,
    tools: (meta.toolNames || []).slice(0, 10),
    note: meta.documentation ? `Docs: ${meta.documentation}` : null,
    // Remote server fields
    transport: isTemplatedUrl ? null : transport,
    remoteUrl: isTemplatedUrl ? null : remoteUrl,
    isAuthless: meta.isAuthless || false,
    claudeCodeCopyText: meta.claudeCodeCopyText || null,
    // Source tracking
    source: 'anthropic-registry',
    author: meta.author?.name || null,
    documentationUrl: meta.documentation || null,
    // API key metadata (remote servers mostly use OAuth)
    apiKeyRequired: !meta.isAuthless && Object.keys(requiredEnv).length === 0,
    apiKeyName: Object.keys(requiredEnv)[0] || null,
    apiKeyUrl: meta.documentation || null,
    apiKeyFree: null,
    apiKeyNote: meta.isAuthless
      ? 'No authentication required'
      : Object.keys(requiredEnv).length > 0
        ? `Requires: ${Object.keys(requiredEnv).join(', ')}`
        : 'Uses OAuth - authenticate via /mcp in Claude Code',
  };
}

/**
 * Fetch, filter, and transform all Anthropic registry servers.
 *
 * @param {Object} options - { timeout, maxPages }
 * @returns {Promise<Array>} Transformed MCP entries compatible with our format
 */
export async function getAnthropicRegistryMcps(options = {}) {
  const rawServers = await fetchAnthropicRegistry(options);

  return rawServers
    .map(transformApiServer)
    .filter(Boolean);
}
