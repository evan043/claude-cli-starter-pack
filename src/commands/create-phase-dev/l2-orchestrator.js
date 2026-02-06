/**
 * L2 Orchestrator for Phase-Dev Plan
 *
 * Spawns parallel L2 agents for codebase exploration during phase-dev planning.
 * Aggregates findings and saves to .claude/exploration/{slug}/ as markdown.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - orchestrator/explorer.js - Code scanning, file discovery, relevance scoring
 * - orchestrator/phases.js - Phase breakdown generation with tasks and specificity
 * - orchestrator/aggregator.js - Results aggregation, reference analysis, confidence
 */

import ora from 'ora';
import { saveAllExplorationDocs, explorationDocsExist, loadExplorationDocs } from '../../utils/exploration-docs.js';
import { runCodeExplorer } from './orchestrator/explorer.js';
import { generatePhaseBreakdown } from './orchestrator/phases.js';
import {
  runReferenceAnalyzer,
  aggregateExplorationResults,
  generateTaskAssignments,
  generateExecutionSequence,
  calculateConfidence,
  assessComplexity,
} from './orchestrator/aggregator.js';

/**
 * L2 Agent configurations for exploration
 */
const L2_EXPLORATION_AGENTS = {
  codeExplorer: {
    name: 'code-explorer',
    description: 'Find relevant files and code paths',
    focus: ['files', 'structure', 'imports', 'exports'],
  },
  referenceAnalyzer: {
    name: 'reference-analyzer',
    description: 'Find similar existing features and patterns',
    focus: ['patterns', 'similar', 'existing'],
  },
  docGenerator: {
    name: 'doc-generator',
    description: 'Generate context documentation from findings',
    focus: ['documentation', 'summary', 'context'],
  },
};

/**
 * Run L2 exploration for a phase-dev plan
 * @param {Object} config - Phase-dev configuration
 * @param {Object} options - Exploration options
 * @returns {Object} Exploration results
 */
export async function runL2Exploration(config, options = {}) {
  const spinner = options.spinner || ora('Running L2 exploration...').start();
  const cwd = options.cwd || process.cwd();
  const { projectSlug, projectName, description, architecture, phases } = config;

  // Check for existing exploration
  if (!options.forceRefresh && explorationDocsExist(projectSlug, cwd)) {
    spinner.info('Existing exploration found');
    const existing = loadExplorationDocs(projectSlug, cwd);
    if (existing?.findings) {
      spinner.succeed('Loaded existing exploration');
      return existing.findings;
    }
  }

  spinner.text = 'Extracting keywords from configuration...';

  const keywords = extractKeywords(description, architecture);

  // Phase 1: Code exploration
  spinner.text = 'L2: Exploring codebase structure...';
  const explorerResults = await runCodeExplorer(cwd, keywords, architecture);

  // Phase 2: Reference analysis
  spinner.text = 'L2: Analyzing reference patterns...';
  const analyzerResults = await runReferenceAnalyzer(cwd, explorerResults, architecture);

  // Phase 3: Aggregate results
  spinner.text = 'L2: Aggregating exploration results...';
  const aggregated = aggregateExplorationResults(explorerResults, analyzerResults);

  // Phase 4: Generate phase breakdown
  spinner.text = 'L2: Generating phase breakdown...';
  const phaseBreakdown = generatePhaseBreakdown(aggregated, phases, config);

  const explorationData = {
    summary: {
      title: projectName || projectSlug,
      status: 'complete',
      confidence: calculateConfidence(aggregated),
      overview: `Exploration of ${projectName || projectSlug} codebase completed. Found ${aggregated.files.length} relevant files, extracted ${aggregated.snippets.length} code snippets.`,
      filesAnalyzed: aggregated.filesAnalyzed,
      snippetsExtracted: aggregated.snippets.length,
      phasesIdentified: phaseBreakdown.length,
      tasksGenerated: phaseBreakdown.reduce((sum, p) => sum + (p.tasks?.length || 0), 0),
      recommendedAgents: aggregated.recommendedAgents,
      domains: aggregated.domainDistribution,
      complexityAssessment: assessComplexity(aggregated),
    },
    snippets: aggregated.snippets,
    files: {
      modify: aggregated.files.filter(f => f.relevance === 'primary'),
      reference: aggregated.files.filter(f => f.relevance === 'reference'),
      tests: aggregated.files.filter(f => f.relevance === 'test'),
    },
    delegation: {
      primaryAgent: aggregated.primaryAgent,
      primaryAgentReason: aggregated.primaryAgentReason,
      taskAssignments: generateTaskAssignments(phaseBreakdown, aggregated),
      executionSequence: generateExecutionSequence(phaseBreakdown),
    },
    phases: phaseBreakdown,
  };

  spinner.text = 'Saving exploration documentation...';
  const saveResult = saveAllExplorationDocs(projectSlug, explorationData, cwd);

  if (saveResult.success) {
    spinner.succeed(`L2 exploration complete: ${saveResult.directory}`);
  } else {
    spinner.warn('L2 exploration complete but save failed');
  }

  return explorationData;
}

/**
 * Extract search keywords from project description and architecture
 * @param {string} description - Project description
 * @param {Object} architecture - Architecture configuration
 * @returns {Array} Keywords for searching
 */
export function extractKeywords(description, architecture) {
  const keywords = new Set();

  if (description) {
    const words = description.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    words.forEach(w => keywords.add(w));
  }

  if (architecture) {
    if (architecture.frontend?.framework) keywords.add(architecture.frontend.framework.toLowerCase());
    if (architecture.backend?.framework) keywords.add(architecture.backend.framework.toLowerCase());
    if (architecture.database?.type) keywords.add(architecture.database.type.toLowerCase());
    if (architecture.database?.orm) keywords.add(architecture.database.orm.toLowerCase());
  }

  const importantTerms = ['auth', 'api', 'model', 'service', 'component', 'hook', 'store', 'util'];
  importantTerms.forEach(t => keywords.add(t));

  return Array.from(keywords).slice(0, 20);
}

/**
 * Save exploration to markdown (wrapper)
 */
export async function saveExplorationToMarkdown(slug, findings, cwd = process.cwd()) {
  return saveAllExplorationDocs(slug, findings, cwd);
}

// Re-export submodule functions used externally
export { aggregateExplorationResults } from './orchestrator/aggregator.js';
export { generatePhaseBreakdown } from './orchestrator/phases.js';

export default {
  runL2Exploration,
  extractKeywords,
  aggregateExplorationResults,
  generatePhaseBreakdown,
  saveExplorationToMarkdown,
  L2_EXPLORATION_AGENTS,
};
