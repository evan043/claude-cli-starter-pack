/**
 * Competitor Analysis Query Generation
 *
 * Functions for generating search queries and analysis prompts.
 */

import { ANALYSIS_PHASES } from './constants.js';

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
  const { productName, domain } = context;

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
