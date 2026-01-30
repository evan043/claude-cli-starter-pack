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
