/**
 * Competitor Analysis Module (Wrapper)
 *
 * 6-phase workflow for competitive intelligence gathering.
 * Part of Phase 4: Competitor Analysis (Issue #32)
 *
 * Uses free MCPs:
 * - Crawl4AI (uvx crawl4ai-mcp) for web scraping
 * - DuckDuckGo MCP for search
 * - Open-WebSearch as fallback
 *
 * @module competitor-analysis
 */

import { ANALYSIS_PHASES, SEARCH_PROVIDERS, SCRAPER_CONFIG, PRICING_PATTERNS, TECH_STACK_PATTERNS } from './competitor/constants.js';
import { generateDiscoveryQueries, generateFeatureQueries, createAnalysisPrompt } from './competitor/queries.js';
import { createSwotAnalysis, createCompetitorProfile, generateFeatureGapMatrix } from './competitor/models.js';
import { generateMarkdownReport, saveReport, loadAnalysis, getReportDir, checkMcpAvailability } from './competitor/reporting.js';

// Named exports
export {
  ANALYSIS_PHASES,
  SEARCH_PROVIDERS,
  SCRAPER_CONFIG,
  PRICING_PATTERNS,
  TECH_STACK_PATTERNS,
  getReportDir,
  generateDiscoveryQueries,
  generateFeatureQueries,
  createSwotAnalysis,
  createCompetitorProfile,
  generateFeatureGapMatrix,
  generateMarkdownReport,
  saveReport,
  loadAnalysis,
  createAnalysisPrompt,
  checkMcpAvailability,
};

// Default export
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
