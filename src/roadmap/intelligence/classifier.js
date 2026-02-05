/**
 * Roadmap Intelligence - Domain Classification
 *
 * Domain classification, issue categorization, and priority scoring.
 */

/**
 * Domain keywords for classification
 */
const DOMAIN_KEYWORDS = {
  frontend: [
    'ui', 'component', 'react', 'vue', 'angular', 'css', 'style', 'layout',
    'page', 'form', 'button', 'modal', 'dashboard', 'widget', 'responsive',
    'tailwind', 'scss', 'template', 'view', 'render', 'jsx', 'tsx', 'html',
  ],
  backend: [
    'api', 'endpoint', 'server', 'route', 'controller', 'service', 'handler',
    'express', 'fastapi', 'django', 'rails', 'node', 'python', 'rest', 'graphql',
    'middleware', 'auth', 'jwt', 'oauth', 'session',
  ],
  database: [
    'database', 'db', 'sql', 'postgres', 'mysql', 'mongodb', 'redis', 'schema',
    'migration', 'model', 'entity', 'table', 'query', 'orm', 'prisma', 'sequelize',
    'typeorm', 'drizzle', 'knex', 'index', 'constraint',
  ],
  testing: [
    'test', 'spec', 'unit', 'integration', 'e2e', 'playwright', 'jest', 'vitest',
    'cypress', 'pytest', 'fixture', 'mock', 'stub', 'coverage', 'assertion',
  ],
  deployment: [
    'deploy', 'ci', 'cd', 'pipeline', 'docker', 'kubernetes', 'k8s', 'aws',
    'cloud', 'hosting', 'vercel', 'railway', 'heroku', 'nginx', 'production',
    'staging', 'environment', 'build', 'bundle',
  ],
  documentation: [
    'doc', 'readme', 'api doc', 'swagger', 'openapi', 'comment', 'jsdoc',
    'typedoc', 'guide', 'tutorial', 'wiki', 'changelog',
  ],
};

/**
 * Analyze text and classify into domains
 *
 * @param {string} text - Text to analyze
 * @returns {Object} Domain scores { frontend: 0.5, backend: 0.8, ... }
 */
export function classifyDomain(text) {
  const lowerText = text.toLowerCase();
  const scores = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let count = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerText.match(regex);
      count += matches ? matches.length : 0;
    }
    scores[domain] = count / keywords.length; // Normalize by keyword count
  }

  return scores;
}

/**
 * Get the primary domain for a piece of text
 *
 * @param {string} text - Text to analyze
 * @returns {string|null} Primary domain or null if no clear domain
 */
export function getPrimaryDomain(text) {
  const scores = classifyDomain(text);
  const entries = Object.entries(scores);

  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);

  // Only return if score is meaningful
  if (entries[0][1] < 0.1) return null;

  return entries[0][0];
}

/**
 * Group related issues/items by domain and topic
 *
 * @param {Array} items - Array of items with title/description
 * @returns {Array} Grouped items with group metadata
 */
export function groupRelatedItems(items) {
  if (!items || items.length === 0) {
    return [];
  }

  const groups = new Map();

  for (const item of items) {
    const text = `${item.title || ''} ${item.description || ''} ${item.body || ''}`;
    const domain = getPrimaryDomain(text) || 'general';

    if (!groups.has(domain)) {
      groups.set(domain, {
        domain,
        items: [],
        keywords: new Set(),
      });
    }

    const group = groups.get(domain);
    group.items.push(item);

    // Extract key terms for sub-grouping
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 4 && !DOMAIN_KEYWORDS[domain]?.includes(word)) {
        group.keywords.add(word);
      }
    }
  }

  // Convert to array and sort by item count
  return Array.from(groups.values())
    .map(g => ({
      ...g,
      keywords: Array.from(g.keywords).slice(0, 10),
      itemCount: g.items.length,
    }))
    .sort((a, b) => b.itemCount - a.itemCount);
}

/**
 * Format a project title from domain and keywords
 * @param {string} domain - Domain name
 * @param {Array} keywords - Keywords array
 * @returns {string} Formatted title
 */
export function formatProjectTitle(domain, keywords) {
  const domainTitles = {
    frontend: 'Frontend UI',
    backend: 'Backend API',
    database: 'Data Layer',
    testing: 'Testing Suite',
    deployment: 'Deployment & CI/CD',
    documentation: 'Documentation',
    general: 'General',
  };

  const base = domainTitles[domain] || 'Implementation';

  // Add a keyword if available
  const keyword = keywords.find(k => k.length > 4 && !DOMAIN_KEYWORDS[domain]?.includes(k));
  if (keyword) {
    return `${base}: ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
  }

  return `${base} Implementation`;
}

// Export domain keywords for use in other modules
export { DOMAIN_KEYWORDS };
