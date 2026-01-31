/**
 * MCP Registry & Discovery
 *
 * Curated registry of popular MCP servers with smart recommendations
 * based on detected tech stack. No hardcoded project-specific values.
 */

/**
 * MCP server registry - organized by category
 * Each entry includes npm package, required env vars, and tech stack relevance
 */
export const MCP_REGISTRY = {
  // Browser Automation & Testing
  testing: [
    {
      id: 'playwright',
      name: 'Playwright MCP',
      description: 'Official Playwright browser automation - navigate, click, screenshot, form fill',
      npmPackage: '@playwright/mcp@latest',
      category: 'testing',
      requiredEnv: {},
      optionalEnv: {
        PLAYWRIGHT_HEADLESS: { default: 'true', description: 'Run in headless mode' },
      },
      relevantFor: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'frontend'],
      recommended: true,
      tools: ['browser_navigate', 'browser_click', 'browser_fill', 'browser_screenshot', 'browser_snapshot'],
    },
    {
      id: 'puppeteer',
      name: 'Puppeteer MCP',
      description: 'Chrome/Chromium automation via Puppeteer - lightweight alternative to Playwright',
      npmPackage: '@modelcontextprotocol/server-puppeteer',
      category: 'testing',
      requiredEnv: {},
      optionalEnv: {
        BROWSER_HEADLESS: { default: 'new', description: 'Headless mode (new/true/false)' },
        BROWSER_URL: { description: 'Default URL to navigate to' },
      },
      relevantFor: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'frontend'],
      recommended: true,
      tools: ['puppeteer_navigate', 'puppeteer_screenshot', 'puppeteer_click', 'puppeteer_fill'],
    },
    {
      id: 'playwright-ext',
      name: 'Playwright Extended',
      description: 'Extended Playwright with API testing, iframes, PDF export',
      npmPackage: '@executeautomation/playwright-mcp-server',
      category: 'testing',
      requiredEnv: {},
      optionalEnv: {},
      relevantFor: ['react', 'vue', 'angular', 'api', 'e2e'],
      recommended: false,
      tools: ['playwright_navigate', 'playwright_screenshot', 'playwright_get', 'playwright_post'],
    },
    {
      id: 'skyvern',
      name: 'Skyvern MCP',
      description: 'AI-powered browser automation - handles complex web tasks with natural language',
      npmPackage: '@skyvern/mcp-server',
      category: 'testing',
      requiredEnv: {
        SKYVERN_API_KEY: { description: 'Skyvern API key from app.skyvern.com' },
      },
      optionalEnv: {},
      relevantFor: ['automation', 'scraping', 'testing', 'e2e', 'frontend'],
      recommended: false,
      tools: ['skyvern_run_task'],
      note: 'AI-powered automation that can handle CAPTCHAs, dynamic content, and complex workflows',
    },
  ],

  // Version Control & GitHub
  vcs: [
    {
      id: 'github',
      name: 'GitHub MCP',
      description: 'GitHub API - issues, PRs, files, branches, commits',
      npmPackage: '@modelcontextprotocol/server-github',
      category: 'vcs',
      requiredEnv: {
        GITHUB_PERSONAL_ACCESS_TOKEN: { description: 'GitHub PAT with repo access' },
      },
      optionalEnv: {},
      relevantFor: ['all'],
      recommended: true,
      tools: ['create_issue', 'create_pull_request', 'get_file_contents', 'search_code'],
    },
    {
      id: 'git',
      name: 'Git MCP',
      description: 'Local git operations - commits, branches, diffs',
      npmPackage: '@modelcontextprotocol/server-git',
      category: 'vcs',
      requiredEnv: {},
      optionalEnv: {},
      relevantFor: ['all'],
      recommended: false,
      tools: ['git_status', 'git_diff', 'git_log', 'git_branch'],
    },
  ],

  // Deployment & Infrastructure
  deployment: [
    {
      id: 'railway',
      name: 'Railway MCP',
      description: 'Railway deployments, services, variables, logs',
      npmPackage: '@jasontanswe/railway-mcp',
      category: 'deployment',
      requiredEnv: {
        RAILWAY_API_TOKEN: { description: 'Railway API token from dashboard' },
      },
      optionalEnv: {},
      relevantFor: ['railway', 'backend', 'api', 'fastapi', 'express', 'nodejs'],
      recommended: false,
      tools: ['deployment_trigger', 'deployment_logs', 'service_list', 'variable_set'],
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare MCP',
      description: 'Cloudflare Workers, Pages, DNS, KV',
      npmPackage: '@cloudflare/mcp-server-cloudflare',
      category: 'deployment',
      requiredEnv: {
        CLOUDFLARE_API_TOKEN: { description: 'Cloudflare API token' },
      },
      optionalEnv: {},
      relevantFor: ['cloudflare', 'vercel', 'netlify', 'frontend', 'workers'],
      recommended: false,
      tools: ['deploy_worker', 'kv_get', 'kv_put', 'dns_records'],
    },
    {
      id: 'digitalocean',
      name: 'DigitalOcean MCP',
      description: 'DigitalOcean droplets, databases, storage',
      npmPackage: '@digitalocean/mcp@latest',
      category: 'deployment',
      requiredEnv: {
        DIGITALOCEAN_API_TOKEN: { description: 'DigitalOcean API token' },
      },
      optionalEnv: {},
      relevantFor: ['digitalocean', 'self-hosted', 'backend'],
      recommended: false,
      tools: ['list_droplets', 'create_droplet', 'list_databases'],
    },
    {
      id: 'vercel',
      name: 'Vercel MCP',
      description: 'Vercel deployments, domains, environment variables',
      npmPackage: '@vercel/mcp',
      category: 'deployment',
      requiredEnv: {
        VERCEL_TOKEN: { description: 'Vercel API token' },
      },
      optionalEnv: {},
      relevantFor: ['vercel', 'nextjs', 'frontend', 'react'],
      recommended: false,
      tools: ['list_deployments', 'trigger_deploy', 'get_domains'],
    },
  ],

  // Database & Backend Services
  database: [
    {
      id: 'postgres',
      name: 'PostgreSQL MCP',
      description: 'Query PostgreSQL databases directly',
      npmPackage: '@bytebase/dbhub',
      category: 'database',
      requiredEnv: {},
      optionalEnv: {},
      args: ['--dsn', 'postgresql://user:pass@host:5432/db'],
      relevantFor: ['postgresql', 'postgres', 'prisma', 'sequelize', 'typeorm', 'drizzle'],
      recommended: false,
      tools: ['query', 'list_tables', 'describe_table'],
    },
    {
      id: 'sqlite',
      name: 'SQLite MCP',
      description: 'Query SQLite databases',
      npmPackage: '@modelcontextprotocol/server-sqlite',
      category: 'database',
      requiredEnv: {},
      optionalEnv: {},
      relevantFor: ['sqlite', 'better-sqlite3'],
      recommended: false,
      tools: ['query', 'list_tables'],
    },
    {
      id: 'supabase',
      name: 'Supabase MCP',
      description: 'Supabase database, auth, storage, and edge functions',
      npmPackage: '@supabase/mcp-server-supabase@latest',
      category: 'database',
      requiredEnv: {
        SUPABASE_ACCESS_TOKEN: { description: 'Supabase access token from dashboard' },
      },
      optionalEnv: {},
      relevantFor: ['supabase', 'postgresql', 'postgres', 'auth', 'storage', 'realtime'],
      recommended: true,
      tools: ['list_tables', 'execute_sql', 'get_logs', 'list_edge_functions', 'deploy_edge_function', 'list_storage_buckets'],
      note: 'Full Supabase platform access - database, auth, storage, edge functions, and logs',
    },
  ],

  // Automation & Workflows
  automation: [
    {
      id: 'n8n',
      name: 'n8n MCP',
      description: 'n8n workflow automation - manage workflows, executions, and credentials',
      npmPackage: '@n8n/n8n-mcp-server',
      category: 'automation',
      requiredEnv: {
        N8N_API_KEY: { description: 'n8n API key' },
        N8N_BASE_URL: { description: 'n8n instance URL (e.g., https://your-n8n.app.n8n.cloud)' },
      },
      optionalEnv: {},
      relevantFor: ['n8n', 'automation', 'workflow', 'integration'],
      recommended: true,
      tools: ['list_workflows', 'get_workflow', 'execute_workflow', 'list_executions', 'list_credentials'],
      note: 'Automate workflows and integrate with 400+ apps via n8n',
    },
  ],

  // Communication & Collaboration
  communication: [
    {
      id: 'slack',
      name: 'Slack MCP',
      description: 'Send/read Slack messages, manage channels',
      npmPackage: '@anthropic/mcp-server-slack',
      category: 'communication',
      requiredEnv: {
        SLACK_BOT_TOKEN: { description: 'Slack Bot OAuth token' },
      },
      optionalEnv: {},
      relevantFor: ['slack', 'team'],
      recommended: false,
      tools: ['send_message', 'read_channel', 'list_channels'],
    },
    {
      id: 'resend',
      name: 'Resend MCP',
      description: 'Send emails via Resend API',
      npmPackage: 'resend-mcp',
      category: 'communication',
      requiredEnv: {
        RESEND_API_KEY: { description: 'Resend API key' },
        SENDER_EMAIL_ADDRESS: { description: 'Verified sender email' },
      },
      optionalEnv: {},
      relevantFor: ['email', 'notifications'],
      recommended: false,
      tools: ['send_email'],
    },
  ],

  // AI & Memory
  ai: [
    {
      id: 'claude-mem',
      name: 'Claude Memory (ChromaDB)',
      description: 'Persistent memory using ChromaDB vector store',
      command: 'uvx',
      npmPackage: null,
      args: ['chroma-mcp', '--client-type', 'persistent', '--data-dir'],
      category: 'ai',
      requiredEnv: {},
      optionalEnv: {},
      relevantFor: ['all'],
      recommended: false,
      tools: ['chroma_add_documents', 'chroma_query_documents', 'chroma_list_collections'],
      note: 'Requires uvx (Python) and custom data directory',
    },
  ],

  // Debugging & Monitoring
  debugging: [
    {
      id: 'log-monitor',
      name: 'Log Monitor MCP',
      description: 'Real-time log tailing, grep, and watching - debug backend services',
      npmPackage: '@anthropic/log-monitor-mcp',
      category: 'debugging',
      requiredEnv: {},
      optionalEnv: {
        LOG_DIR: { description: 'Default directory for log files', default: './logs' },
      },
      relevantFor: ['backend', 'api', 'fastapi', 'express', 'nodejs', 'python'],
      recommended: true,
      tools: ['logs_list', 'logs_tail', 'logs_grep', 'logs_watch', 'logs_watch_stop', 'logs_clear'],
      note: 'Watch log files in real-time, grep for patterns, and clear old logs',
    },
    {
      id: 'browser-monitor',
      name: 'Browser Monitor MCP',
      description: 'Puppeteer browser automation with network and console monitoring',
      npmPackage: '@anthropic/browser-monitor-mcp',
      category: 'debugging',
      requiredEnv: {},
      optionalEnv: {
        BROWSER_HEADLESS: { default: 'new', description: 'Headless mode (new/true/false)' },
      },
      relevantFor: ['frontend', 'react', 'vue', 'angular', 'e2e', 'testing'],
      recommended: false,
      tools: ['puppeteer_navigate', 'puppeteer_screenshot', 'puppeteer_click', 'puppeteer_fill', 'puppeteer_select', 'puppeteer_hover', 'puppeteer_evaluate'],
      note: 'Combined browser automation with network request and console log monitoring',
    },
  ],

  // Tunnel Services
  tunnel: [
    {
      id: 'ngrok',
      name: 'ngrok Tunnel',
      description: 'Expose local servers via ngrok tunnels for webhook testing and demos',
      command: 'ngrok',
      npmPackage: null,
      category: 'tunnel',
      requiredEnv: {
        NGROK_AUTHTOKEN: { description: 'ngrok auth token from dashboard.ngrok.com' },
      },
      optionalEnv: {},
      relevantFor: ['backend', 'api', 'webhook', 'testing', 'development'],
      recommended: false,
      tools: [],
      note: 'Requires ngrok CLI installed. Not an MCP - use via Bash tool with "ngrok http <port>"',
      installGuide: 'Install from https://ngrok.com/download, then run: ngrok config add-authtoken YOUR_TOKEN',
    },
    {
      id: 'cloudflare-tunnel',
      name: 'Cloudflare Tunnel',
      description: 'Expose local servers via Cloudflare Argo Tunnels - more secure than ngrok',
      command: 'cloudflared',
      npmPackage: null,
      category: 'tunnel',
      requiredEnv: {},
      optionalEnv: {},
      relevantFor: ['backend', 'api', 'cloudflare', 'production'],
      recommended: false,
      tools: [],
      note: 'Requires cloudflared CLI. Use "cloudflared tunnel --url http://localhost:PORT"',
      installGuide: 'Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/',
    },
    {
      id: 'localtunnel',
      name: 'LocalTunnel',
      description: 'Simple, free tunnels for local development - no signup required',
      npmPackage: 'localtunnel',
      category: 'tunnel',
      requiredEnv: {},
      optionalEnv: {},
      relevantFor: ['backend', 'api', 'development', 'testing'],
      recommended: false,
      tools: [],
      note: 'Simple alternative to ngrok. Use via npx: "npx localtunnel --port 3000"',
      installGuide: 'No installation required. Run: npx localtunnel --port YOUR_PORT',
    },
  ],

  // Utilities
  utilities: [
    {
      id: 'filesystem',
      name: 'Filesystem MCP',
      description: 'File operations beyond Claude\'s built-in Read/Write',
      npmPackage: '@modelcontextprotocol/server-filesystem',
      category: 'utilities',
      requiredEnv: {},
      optionalEnv: {},
      relevantFor: ['all'],
      recommended: false,
      tools: ['list_directory', 'create_directory', 'move_file'],
    },
    {
      id: 'fetch',
      name: 'Fetch MCP',
      description: 'HTTP requests with full control',
      npmPackage: '@modelcontextprotocol/server-fetch',
      category: 'utilities',
      requiredEnv: {},
      optionalEnv: {},
      relevantFor: ['api', 'backend'],
      recommended: false,
      tools: ['fetch', 'fetch_json'],
    },
  ],
};

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
 * Core Testing MCPs - Always offered regardless of tech stack
 * These are the baseline testing tools that every project can benefit from.
 */
export const CORE_TESTING_MCPS = [
  'playwright',      // Primary browser automation
  'puppeteer',       // Alternative browser automation
  'log-monitor',     // Backend log monitoring
  'browser-monitor', // Browser with network/console monitoring
];

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
