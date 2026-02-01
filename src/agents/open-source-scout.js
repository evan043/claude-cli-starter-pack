/**
 * OpenSourceScout Agent
 *
 * Discovers and recommends open-source tools for feature development.
 * Part of Phase 2: Hook Extensions (Issue #28)
 *
 * Triggered by /create-task-list, /github-task, /phase-dev-plan when
 * feature intent is detected in the prompt.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Feature intent keywords that trigger the scout
 */
export const FEATURE_INTENT_KEYWORDS = [
  'new feature',
  'feature',
  'enhancement',
  'improvement',
  'add support',
  'introduce',
  'upgrade',
  'refactor to include',
  'build',
  'implement',
  'integrate',
];

/**
 * Keywords that indicate non-feature work (no scout needed)
 */
export const NON_FEATURE_KEYWORDS = [
  'bugfix',
  'fix bug',
  'bug fix',
  'documentation',
  'docs only',
  'format',
  'formatting',
  'cleanup',
  'clean up',
  'typo',
];

/**
 * Tool categories that benefit from OSS acceleration
 */
export const SCOUT_CATEGORIES = {
  auth: {
    keywords: ['auth', 'authentication', 'authorization', 'rbac', 'permissions', 'oauth', 'jwt', 'session'],
    searchTerms: ['authentication library', 'oauth library', 'jwt library'],
  },
  payments: {
    keywords: ['payment', 'subscription', 'billing', 'stripe', 'checkout'],
    searchTerms: ['payment processing', 'subscription management', 'stripe integration'],
  },
  fileProcessing: {
    keywords: ['file', 'upload', 'parse', 'pdf', 'ocr', 'csv', 'excel', 'image'],
    searchTerms: ['file parsing library', 'pdf processing', 'image processing'],
  },
  search: {
    keywords: ['search', 'indexing', 'full-text', 'elasticsearch', 'algolia', 'vector', 'embeddings'],
    searchTerms: ['search engine', 'full-text search', 'vector database'],
  },
  scheduling: {
    keywords: ['schedule', 'cron', 'background', 'job', 'queue', 'worker', 'async'],
    searchTerms: ['job scheduler', 'task queue', 'background jobs'],
  },
  ui: {
    keywords: ['component', 'ui library', 'design system', 'form', 'table', 'chart', 'dashboard'],
    searchTerms: ['ui component library', 'react components', 'design system'],
  },
  security: {
    keywords: ['security', 'scanning', 'audit', 'vulnerability', 'encryption'],
    searchTerms: ['security scanning', 'vulnerability detection', 'encryption library'],
  },
  integration: {
    keywords: ['crm', 'email', 'calendar', 'slack', 'webhook', 'api client'],
    searchTerms: ['api client library', 'integration sdk', 'webhook handler'],
  },
};

/**
 * Get the path to the inventory file
 * @param {string} projectRoot - Project root directory
 * @returns {string} Path to inventory file
 */
export function getInventoryPath(projectRoot = process.cwd()) {
  return join(projectRoot, 'repo-settings', 'OpenSource-Search-Inventory.json');
}

/**
 * Load the inventory
 * @param {string} projectRoot - Project root directory
 * @returns {object} Inventory data
 */
export function loadInventory(projectRoot = process.cwd()) {
  const inventoryPath = getInventoryPath(projectRoot);

  if (!existsSync(inventoryPath)) {
    return { runs: [] };
  }

  try {
    return JSON.parse(readFileSync(inventoryPath, 'utf8'));
  } catch {
    return { runs: [] };
  }
}

/**
 * Save to the inventory
 * @param {object} entry - Inventory entry to append
 * @param {string} projectRoot - Project root directory
 */
export function saveToInventory(entry, projectRoot = process.cwd()) {
  const inventoryPath = getInventoryPath(projectRoot);
  const dir = dirname(inventoryPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const inventory = loadInventory(projectRoot);
  inventory.runs.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });

  writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2), 'utf8');
}

/**
 * Detect if a prompt contains feature intent
 * @param {string} prompt - User prompt
 * @returns {object} Detection result { isFeature, confidence, matchedKeywords }
 */
export function detectFeatureIntent(prompt) {
  const promptLower = prompt.toLowerCase();

  // Check for non-feature work first
  for (const keyword of NON_FEATURE_KEYWORDS) {
    if (promptLower.includes(keyword)) {
      return {
        isFeature: false,
        confidence: 0,
        matchedKeywords: [],
        reason: `Detected non-feature work: "${keyword}"`,
      };
    }
  }

  // Check for feature intent
  const matchedKeywords = [];
  for (const keyword of FEATURE_INTENT_KEYWORDS) {
    if (promptLower.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }

  const confidence = Math.min(matchedKeywords.length / 3, 1);

  return {
    isFeature: matchedKeywords.length > 0,
    confidence,
    matchedKeywords,
    reason: matchedKeywords.length > 0
      ? `Detected feature intent: ${matchedKeywords.join(', ')}`
      : 'No feature intent detected',
  };
}

/**
 * Detect which categories are relevant for a prompt
 * @param {string} prompt - User prompt
 * @returns {string[]} Array of relevant category IDs
 */
export function detectRelevantCategories(prompt) {
  const promptLower = prompt.toLowerCase();
  const relevant = [];

  for (const [categoryId, category] of Object.entries(SCOUT_CATEGORIES)) {
    for (const keyword of category.keywords) {
      if (promptLower.includes(keyword)) {
        relevant.push(categoryId);
        break;
      }
    }
  }

  return relevant;
}

/**
 * Generate search queries for tool discovery
 * @param {string} prompt - User prompt
 * @param {object} techStack - Tech stack configuration
 * @returns {string[]} Array of search queries
 */
export function generateSearchQueries(prompt, techStack = {}) {
  const categories = detectRelevantCategories(prompt);
  const queries = [];

  // Language-specific prefix
  const language = techStack.primaryLanguage || 'javascript';
  const framework = techStack.frontend?.framework || techStack.backend?.framework || '';

  // Generate category-specific queries
  for (const categoryId of categories) {
    const category = SCOUT_CATEGORIES[categoryId];
    if (category) {
      for (const term of category.searchTerms) {
        queries.push(`${language} ${term}`);
        if (framework) {
          queries.push(`${framework} ${term}`);
        }
      }
    }
  }

  // Add generic queries based on prompt keywords
  const promptWords = prompt.toLowerCase().split(/\s+/);
  const techWords = promptWords.filter(w =>
    w.length > 3 &&
    !['this', 'that', 'with', 'from', 'want', 'need', 'help', 'please'].includes(w)
  );

  if (techWords.length > 0) {
    const keyTerms = techWords.slice(0, 3).join(' ');
    queries.push(`${language} library ${keyTerms}`);
    queries.push(`npm package ${keyTerms}`);
  }

  // Deduplicate
  return [...new Set(queries)].slice(0, 5);
}

/**
 * Tool ranking criteria
 */
export const RANKING_CRITERIA = {
  adoption: {
    weight: 0.3,
    description: 'Wide adoption (npm downloads, GitHub stars)',
  },
  maintenance: {
    weight: 0.25,
    description: 'Recent maintenance (last commit, release frequency)',
  },
  documentation: {
    weight: 0.2,
    description: 'Strong documentation and examples',
  },
  license: {
    weight: 0.15,
    description: 'Permissive license (MIT, Apache 2.0, BSD)',
  },
  integration: {
    weight: 0.1,
    description: 'Low implementation overhead',
  },
};

/**
 * Score a tool based on ranking criteria
 * @param {object} tool - Tool metadata
 * @returns {number} Score between 0 and 1
 */
export function scoreTool(tool) {
  let score = 0;

  // Adoption score
  if (tool.weeklyDownloads) {
    const adoptionScore = Math.min(tool.weeklyDownloads / 100000, 1);
    score += adoptionScore * RANKING_CRITERIA.adoption.weight;
  }

  // Maintenance score
  if (tool.lastCommit) {
    const daysSinceCommit = (Date.now() - new Date(tool.lastCommit).getTime()) / (1000 * 60 * 60 * 24);
    const maintenanceScore = Math.max(0, 1 - daysSinceCommit / 365);
    score += maintenanceScore * RANKING_CRITERIA.maintenance.weight;
  }

  // Documentation score (assume 0.5 if unknown)
  const docScore = tool.hasReadme ? 0.8 : 0.5;
  score += docScore * RANKING_CRITERIA.documentation.weight;

  // License score
  const permissiveLicenses = ['mit', 'apache-2.0', 'bsd-3-clause', 'bsd-2-clause', 'isc'];
  const licenseScore = permissiveLicenses.includes(tool.license?.toLowerCase() || '') ? 1 : 0.3;
  score += licenseScore * RANKING_CRITERIA.license.weight;

  // Integration score (default 0.5)
  score += 0.5 * RANKING_CRITERIA.integration.weight;

  return Math.round(score * 100) / 100;
}

/**
 * Format a tool recommendation for output
 * @param {object} tool - Tool data
 * @returns {object} Formatted recommendation
 */
export function formatRecommendation(tool) {
  return {
    name: tool.name,
    ecosystem: tool.ecosystem || 'npm',
    whyItMatches: tool.matchReason || 'Matches search criteria',
    maintenanceSignal: tool.lastCommit
      ? `Last updated: ${new Date(tool.lastCommit).toLocaleDateString()}`
      : 'Unknown',
    adoptionSignal: tool.weeklyDownloads
      ? `${(tool.weeklyDownloads / 1000).toFixed(1)}k weekly downloads`
      : 'Unknown',
    license: tool.license || 'Unknown',
    securityStatus: tool.securityStatus || 'pending',
    score: scoreTool(tool),
  };
}

/**
 * Create the OpenSourceScout agent prompt
 * @param {string} featurePrompt - The feature description
 * @param {string[]} searchQueries - Generated search queries
 * @param {object} techStack - Tech stack info
 * @returns {string} Agent prompt
 */
export function createScoutPrompt(featurePrompt, searchQueries, techStack = {}) {
  return `# OpenSourceScout - Tool Discovery Agent

## Feature Goal
${featurePrompt}

## Tech Stack Context
${JSON.stringify(techStack, null, 2)}

## Search Queries to Execute
${searchQueries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

## Instructions

1. **Execute Web Searches**
   Run the search queries above using WebSearch tool.

2. **Evaluate Each Tool Found**
   For each promising tool, assess:
   - Wide adoption (npm downloads, GitHub stars)
   - Recent maintenance (commits, releases)
   - Strong documentation
   - Permissive licensing (MIT, Apache-2.0, BSD preferred)
   - Low integration overhead

3. **Security Check**
   Flag any tools for security review before recommending.

4. **Output Format**
   Return a markdown table with:
   | Tool | Ecosystem | Why it matches | Maintenance | Adoption | License | Security |

5. **Final Recommendation**
   Recommend either:
   - "Use Tool X" with implementation notes
   - "Build In-House" if no good options
   - "Hybrid" if partial tool + custom code needed

## Response Limits
Maximum 2000 tokens for this search task.
`;
}

export default {
  FEATURE_INTENT_KEYWORDS,
  NON_FEATURE_KEYWORDS,
  SCOUT_CATEGORIES,
  RANKING_CRITERIA,
  detectFeatureIntent,
  detectRelevantCategories,
  generateSearchQueries,
  scoreTool,
  formatRecommendation,
  createScoutPrompt,
  loadInventory,
  saveToInventory,
  getInventoryPath,
};
