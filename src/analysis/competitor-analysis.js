/**
 * Competitor Analysis Module
 *
 * 6-phase workflow for competitive intelligence gathering.
 * Part of Phase 4: Competitor Analysis (Issue #32)
 *
 * Uses free MCPs:
 * - Crawl4AI (uvx crawl4ai-mcp) for web scraping
 * - DuckDuckGo MCP for search
 * - Open-WebSearch as fallback
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

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
 * Get report output directory
 * @param {string} projectRoot - Project root
 * @returns {string} Report directory path
 */
export function getReportDir(projectRoot = process.cwd()) {
  return join(projectRoot, 'docs', 'competitive-analysis');
}

/**
 * Generate search queries for competitor discovery
 * @param {object} context - Analysis context
 * @returns {string[]} Search queries
 */
export function generateDiscoveryQueries(context) {
  const { productName, domain, targetMarket, keywords = [] } = context;
  const queries = [];

  // Direct competitor searches
  queries.push(`${productName} alternatives`);
  queries.push(`${productName} competitors`);
  queries.push(`best ${domain} tools ${new Date().getFullYear()}`);
  queries.push(`top ${domain} software comparison`);

  // Market-specific searches
  if (targetMarket) {
    queries.push(`${domain} tools for ${targetMarket}`);
  }

  // Keyword-based searches
  for (const keyword of keywords.slice(0, 3)) {
    queries.push(`${keyword} software comparison`);
  }

  return [...new Set(queries)].slice(0, 8);
}

/**
 * Generate search queries for feature extraction
 * @param {string[]} competitors - List of competitor names
 * @returns {object} Queries per competitor
 */
export function generateFeatureQueries(competitors) {
  const queries = {};

  for (const competitor of competitors) {
    queries[competitor] = [
      `${competitor} features`,
      `${competitor} pricing`,
      `${competitor} review`,
      `${competitor} vs`,
    ];
  }

  return queries;
}

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

/**
 * SWOT analysis structure
 */
export function createSwotAnalysis() {
  return {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
  };
}

/**
 * Create competitor profile structure
 * @param {string} name - Competitor name
 * @returns {object} Profile structure
 */
export function createCompetitorProfile(name) {
  return {
    name,
    website: null,
    description: null,
    founded: null,
    funding: null,
    employees: null,
    features: [],
    pricing: {
      model: null,
      tiers: [],
      startingPrice: null,
      hasFreeTier: false,
    },
    techStack: {
      frontend: [],
      backend: [],
      database: [],
      cloud: [],
    },
    marketPosition: {
      targetAudience: null,
      marketShare: null,
      growthTrend: null,
    },
    sentiment: {
      overallRating: null,
      reviewCount: 0,
      commonPraises: [],
      commonComplaints: [],
    },
    swot: createSwotAnalysis(),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate feature gap matrix
 * @param {object} ourProduct - Our product features
 * @param {object[]} competitors - Competitor profiles
 * @returns {object} Gap matrix
 */
export function generateFeatureGapMatrix(ourProduct, competitors) {
  const allFeatures = new Set();

  // Collect all features
  if (ourProduct.features) {
    ourProduct.features.forEach(f => allFeatures.add(f.name || f));
  }

  for (const competitor of competitors) {
    if (competitor.features) {
      competitor.features.forEach(f => allFeatures.add(f.name || f));
    }
  }

  // Build matrix
  const matrix = {
    headers: ['Feature', 'Our Product', ...competitors.map(c => c.name)],
    rows: [],
    summary: {
      ourFeatureCount: ourProduct.features?.length || 0,
      gaps: [],
      opportunities: [],
    },
  };

  for (const feature of allFeatures) {
    const hasFeature = (product) => {
      if (!product.features) return false;
      return product.features.some(f =>
        (f.name || f).toLowerCase() === feature.toLowerCase()
      );
    };

    const row = {
      feature,
      ourProduct: hasFeature(ourProduct) ? '✓' : '✗',
      competitors: {},
    };

    let competitorCount = 0;
    for (const competitor of competitors) {
      const has = hasFeature(competitor);
      row.competitors[competitor.name] = has ? '✓' : '✗';
      if (has) competitorCount++;
    }

    // Identify gaps
    if (!hasFeature(ourProduct) && competitorCount >= Math.ceil(competitors.length / 2)) {
      matrix.summary.gaps.push({
        feature,
        priority: competitorCount === competitors.length ? 'high' : 'medium',
        competitorCoverage: `${competitorCount}/${competitors.length}`,
      });
    }

    // Identify opportunities (features we have that competitors don't)
    if (hasFeature(ourProduct) && competitorCount < Math.ceil(competitors.length / 2)) {
      matrix.summary.opportunities.push({
        feature,
        differentiator: competitorCount === 0,
      });
    }

    matrix.rows.push(row);
  }

  return matrix;
}

/**
 * Generate markdown report
 * @param {object} analysis - Complete analysis data
 * @returns {string} Markdown report
 */
export function generateMarkdownReport(analysis) {
  const {
    productName,
    domain,
    generatedAt,
    competitors = [],
    featureGapMatrix,
    swot,
  } = analysis;

  let report = `# Competitive Analysis: ${productName}

**Domain:** ${domain}
**Generated:** ${generatedAt}
**Competitors Analyzed:** ${competitors.length}

---

## Executive Summary

${analysis.executiveSummary || 'Analysis in progress...'}

---

## Competitors

`;

  // Competitor profiles
  for (const competitor of competitors) {
    report += `### ${competitor.name}

**Website:** ${competitor.website || 'N/A'}
**Description:** ${competitor.description || 'N/A'}

**Pricing Model:** ${competitor.pricing?.model || 'Unknown'}
${competitor.pricing?.hasFreeTier ? '✓ Has free tier' : '✗ No free tier'}
${competitor.pricing?.startingPrice ? `Starting at: ${competitor.pricing.startingPrice}` : ''}

**Key Features:**
${(competitor.features || []).slice(0, 10).map(f => `- ${f.name || f}`).join('\n') || '- Not yet analyzed'}

**Sentiment:**
- Rating: ${competitor.sentiment?.overallRating || 'N/A'}
- Reviews: ${competitor.sentiment?.reviewCount || 0}

---

`;
  }

  // Feature gap matrix
  if (featureGapMatrix) {
    report += `## Feature Gap Analysis

### Gaps to Address (Features Competitors Have)

| Priority | Feature | Competitor Coverage |
|----------|---------|---------------------|
${featureGapMatrix.summary.gaps.map(g =>
  `| ${g.priority} | ${g.feature} | ${g.competitorCoverage} |`
).join('\n') || '| - | No significant gaps identified | - |'}

### Our Differentiators

${featureGapMatrix.summary.opportunities.map(o =>
  `- **${o.feature}** ${o.differentiator ? '(Unique to us!)' : ''}`
).join('\n') || '- Analysis in progress...'}

---

`;
  }

  // SWOT
  if (swot) {
    report += `## SWOT Analysis

### Strengths
${swot.strengths.map(s => `- ${s}`).join('\n') || '- (To be identified)'}

### Weaknesses
${swot.weaknesses.map(w => `- ${w}`).join('\n') || '- (To be identified)'}

### Opportunities
${swot.opportunities.map(o => `- ${o}`).join('\n') || '- (To be identified)'}

### Threats
${swot.threats.map(t => `- ${t}`).join('\n') || '- (To be identified)'}

---

`;
  }

  report += `## Recommendations

${analysis.recommendations || '(Recommendations will be generated after full analysis)'}

---

*Generated by CCASP Competitor Analysis*
`;

  return report;
}

/**
 * Save analysis report
 * @param {object} analysis - Analysis data
 * @param {string} projectRoot - Project root
 * @returns {string} Path to saved report
 */
export function saveReport(analysis, projectRoot = process.cwd()) {
  const reportDir = getReportDir(projectRoot);

  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }

  const slug = analysis.productName.toLowerCase().replace(/\s+/g, '-');
  const date = new Date().toISOString().split('T')[0];

  // Save markdown report
  const mdPath = join(reportDir, `${slug}-analysis-${date}.md`);
  writeFileSync(mdPath, generateMarkdownReport(analysis), 'utf8');

  // Save JSON data
  const jsonPath = join(reportDir, `${slug}-analysis-${date}.json`);
  writeFileSync(jsonPath, JSON.stringify(analysis, null, 2), 'utf8');

  return mdPath;
}

/**
 * Load existing analysis
 * @param {string} productName - Product name
 * @param {string} projectRoot - Project root
 * @returns {object|null} Analysis data or null
 */
export function loadAnalysis(productName, projectRoot = process.cwd()) {
  const reportDir = getReportDir(projectRoot);
  const slug = productName.toLowerCase().replace(/\s+/g, '-');

  // Find most recent analysis
  try {
    const files = require('fs').readdirSync(reportDir);
    const jsonFiles = files
      .filter(f => f.startsWith(slug) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (jsonFiles.length > 0) {
      return JSON.parse(readFileSync(join(reportDir, jsonFiles[0]), 'utf8'));
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Create agent prompt for competitor analysis
 * @param {object} context - Analysis context
 * @param {string} phase - Current phase ID
 * @returns {string} Agent prompt
 */
export function createAnalysisPrompt(context, phase) {
  const phaseConfig = ANALYSIS_PHASES[phase];

  if (!phaseConfig) {
    return `Unknown analysis phase: ${phase}`;
  }

  const { productName, domain, competitors = [] } = context;

  return `# Competitor Analysis - Phase ${phaseConfig.id}: ${phaseConfig.name}

## Context
- **Product:** ${productName}
- **Domain:** ${domain}
- **Competitors:** ${competitors.length > 0 ? competitors.join(', ') : 'To be identified'}

## Phase Objective
${phaseConfig.description}

## Expected Outputs
${phaseConfig.outputs.map(o => `- ${o}`).join('\n')}

## Instructions

${getPhaseInstructions(phase, context)}

## Search Tools Available
1. **Primary:** DuckDuckGo MCP (mcp__duckduckgo__search) - if available
2. **Fallback:** WebSearch tool - always available

## Web Scraping
1. **Primary:** Crawl4AI MCP (uvx crawl4ai-mcp) - if available
2. **Fallback:** WebFetch tool - always available

## Response Format
Provide structured JSON output with:
- phase: "${phase}"
- status: "complete" | "partial" | "failed"
- data: { ... phase-specific data ... }
- nextSteps: [ ... suggested actions ... ]

## Token Limit
Maximum 3000 tokens for this phase.
`;
}

/**
 * Get phase-specific instructions
 * @param {string} phase - Phase ID
 * @param {object} context - Analysis context
 * @returns {string} Instructions
 */
function getPhaseInstructions(phase, context) {
  const { productName, domain, competitors } = context;

  const instructions = {
    discovery: `
1. Search for "${productName} alternatives" and "${productName} competitors"
2. Search for "best ${domain} tools ${new Date().getFullYear()}"
3. Identify 5-10 direct competitors
4. For each competitor, note:
   - Company name
   - Website URL
   - Brief description (1 sentence)
5. Categorize as: Direct competitor, Indirect competitor, or Adjacent solution
`,
    features: `
1. For each competitor in the list:
   - Visit their website
   - Extract feature list from product pages
   - Note any unique features
2. Create a feature inventory with:
   - Feature name
   - Brief description
   - Which competitors have it
3. Identify unique selling points per competitor
`,
    pricing: `
1. For each competitor:
   - Find pricing page
   - Extract pricing tiers
   - Note: free tier, starting price, enterprise options
2. Classify pricing model:
   - Free / Freemium / Subscription / Usage-based / Enterprise only
3. Create comparison table
`,
    techStack: `
1. For each competitor website:
   - Check builtwith.com or similar
   - Analyze page source hints
   - Check job postings for tech requirements
2. Identify:
   - Frontend framework
   - Backend technology
   - Database hints
   - Cloud provider
`,
    sentiment: `
1. Search for "[competitor] review" for each competitor
2. Check:
   - G2 / Capterra / TrustRadius reviews
   - Product Hunt comments
   - Twitter/X sentiment
   - Reddit discussions
3. Extract:
   - Overall rating
   - Common praises
   - Common complaints
`,
    gaps: `
1. Compare our features vs competitors
2. Identify:
   - Features competitors have that we lack (gaps)
   - Features we have that competitors lack (differentiators)
3. Prioritize gaps by:
   - How many competitors have the feature
   - User demand signals
   - Implementation complexity
4. Generate recommendations
`,
  };

  return instructions[phase] || 'Follow standard analysis procedures.';
}

/**
 * Check MCP availability for competitor analysis
 * @returns {object} Available MCPs
 */
export function checkMcpAvailability() {
  // This would be called by the agent to check what tools are available
  return {
    search: {
      duckduckgo: false,
      openWebsearch: false,
      websearch: true, // Always available
    },
    scraping: {
      crawl4ai: false,
      webfetch: true, // Always available
    },
    recommendation: 'Using built-in WebSearch and WebFetch. For enhanced analysis, consider installing Crawl4AI (uvx crawl4ai-mcp).',
  };
}

export default {
  ANALYSIS_PHASES,
  SEARCH_PROVIDERS,
  SCRAPER_CONFIG,
  PRICING_PATTERNS,
  TECH_STACK_PATTERNS,
  getReportDir,
  generateDiscoveryQueries,
  generateFeatureQueries,
  createCompetitorProfile,
  createSwotAnalysis,
  generateFeatureGapMatrix,
  generateMarkdownReport,
  saveReport,
  loadAnalysis,
  createAnalysisPrompt,
  checkMcpAvailability,
};
