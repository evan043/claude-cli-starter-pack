/**
 * Competitor Analysis Constants
 *
 * Configuration constants for analysis phases, search providers,
 * scraping tools, and pattern matching.
 */

/**
 * Analysis phases with timing estimates
 */
export const ANALYSIS_PHASES = {
  discovery: {
    id: 1,
    name: 'Competitor Discovery',
    description: 'Identify direct and indirect competitors',
    estimatedMinutes: 5,
    outputs: ['competitor list', 'market positioning'],
  },
  features: {
    id: 2,
    name: 'Feature Extraction',
    description: 'Map competitor feature sets',
    estimatedMinutes: 10,
    outputs: ['feature inventory', 'unique selling points'],
  },
  pricing: {
    id: 3,
    name: 'Pricing Analysis',
    description: 'Analyze pricing models and tiers',
    estimatedMinutes: 5,
    outputs: ['pricing table', 'value comparison'],
  },
  techStack: {
    id: 4,
    name: 'Tech Stack Discovery',
    description: 'Identify technologies used by competitors',
    estimatedMinutes: 5,
    outputs: ['tech stack inventory', 'architecture insights'],
  },
  sentiment: {
    id: 5,
    name: 'Market Position & Sentiment',
    description: 'Analyze reviews and market perception',
    estimatedMinutes: 8,
    outputs: ['sentiment analysis', 'market share estimates'],
  },
  gaps: {
    id: 6,
    name: 'Feature Gap Analysis',
    description: 'Identify opportunities and competitive gaps',
    estimatedMinutes: 5,
    outputs: ['gap matrix', 'priority recommendations'],
  },
};

/**
 * Search provider preferences (free alternatives)
 */
export const SEARCH_PROVIDERS = {
  primary: {
    id: 'duckduckgo',
    mcpTool: 'mcp__duckduckgo__search',
    description: 'DuckDuckGo MCP for privacy-focused search',
    fallback: 'open-websearch',
  },
  secondary: {
    id: 'open-websearch',
    mcpTool: 'mcp__open-websearch__search',
    description: 'Open-WebSearch as backup',
    fallback: 'websearch',
  },
  builtin: {
    id: 'websearch',
    mcpTool: 'WebSearch',
    description: 'Built-in WebSearch tool',
    fallback: null,
  },
};

/**
 * Web scraper configuration
 */
export const SCRAPER_CONFIG = {
  primary: {
    id: 'crawl4ai',
    command: 'uvx crawl4ai-mcp',
    description: 'Crawl4AI for intelligent web scraping',
    capabilities: ['javascript rendering', 'structured extraction', 'rate limiting'],
  },
  fallback: {
    id: 'webfetch',
    tool: 'WebFetch',
    description: 'Built-in WebFetch for basic scraping',
    limitations: ['no JS rendering', 'limited extraction'],
  },
};

/**
 * Extract pricing information pattern
 */
export const PRICING_PATTERNS = {
  free: /free|$0|no cost/i,
  freemium: /freemium|free tier|starter free/i,
  subscription: /\/month|\/year|per month|annually/i,
  enterprise: /contact|custom|enterprise pricing/i,
  perSeat: /per user|per seat|per license/i,
  usage: /pay as you go|usage.based|per request|per call/i,
};

/**
 * Tech stack detection patterns
 */
export const TECH_STACK_PATTERNS = {
  frontend: {
    react: /react|reactjs|next\.js|nextjs/i,
    vue: /vue|vuejs|nuxt/i,
    angular: /angular/i,
    svelte: /svelte|sveltekit/i,
  },
  backend: {
    node: /node\.js|express|fastify|nestjs/i,
    python: /python|django|flask|fastapi/i,
    go: /golang|go lang/i,
    rust: /rust|actix|axum/i,
  },
  database: {
    postgres: /postgresql|postgres/i,
    mysql: /mysql|mariadb/i,
    mongodb: /mongodb|mongo/i,
    redis: /redis/i,
  },
  cloud: {
    aws: /aws|amazon web services|ec2|s3|lambda/i,
    gcp: /google cloud|gcp|firebase/i,
    azure: /azure|microsoft cloud/i,
    vercel: /vercel|nextjs hosting/i,
  },
};
