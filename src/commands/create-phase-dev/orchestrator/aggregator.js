/**
 * L2 Orchestrator - Results Aggregator
 *
 * Aggregates exploration results from multiple agents,
 * runs reference analysis, generates task assignments and execution sequences.
 */

import { analyzeFileContent } from '../code-snippet-extractor.js';
import { getPrimaryDomain } from '../../../roadmap/intelligence.js';

/**
 * Run reference analyzer L2 agent
 */
export async function runReferenceAnalyzer(cwd, explorerResults, architecture) {
  const results = {
    patterns: [],
    similarFeatures: [],
    recommendations: [],
  };

  const files = explorerResults.files;

  const byPurpose = new Map();
  for (const file of files) {
    const analysis = analyzeFileContent(file.fullPath);
    const purpose = analysis.primaryPurpose || 'general';

    if (!byPurpose.has(purpose)) {
      byPurpose.set(purpose, []);
    }
    byPurpose.get(purpose).push({ ...file, analysis });
  }

  for (const [purpose, purposeFiles] of byPurpose) {
    if (purposeFiles.length >= 2) {
      results.patterns.push({
        type: purpose,
        count: purposeFiles.length,
        files: purposeFiles.map(f => f.relativePath).slice(0, 5),
        recommendation: `Follow existing ${purpose} patterns`,
      });
    }
  }

  if (architecture) {
    if (architecture.frontend) {
      results.recommendations.push({
        agent: 'frontend-specialist',
        reason: `Frontend using ${architecture.frontend.framework || 'detected framework'}`,
      });
    }
    if (architecture.backend) {
      results.recommendations.push({
        agent: 'backend-specialist',
        reason: `Backend using ${architecture.backend.framework || 'detected framework'}`,
      });
    }
    if (architecture.testing?.e2e || architecture.testing?.unit) {
      results.recommendations.push({
        agent: 'testing-specialist',
        reason: `Testing with ${architecture.testing.e2e || architecture.testing.unit || 'detected framework'}`,
      });
    }
  }

  return results;
}

/**
 * Aggregate exploration results from multiple agents
 * @param {Object} explorerResults - Code explorer results
 * @param {Object} analyzerResults - Reference analyzer results
 * @returns {Object} Aggregated results
 */
export function aggregateExplorationResults(explorerResults, analyzerResults) {
  const domainDistribution = {};
  for (const file of explorerResults.files) {
    const domain = getPrimaryDomain(file.relativePath) || 'general';
    domainDistribution[domain] = (domainDistribution[domain] || 0) + 1;
  }

  const sortedDomains = Object.entries(domainDistribution)
    .sort((a, b) => b[1] - a[1]);

  const primaryDomain = sortedDomains[0]?.[0] || 'general';
  const agentMap = {
    frontend: 'frontend-specialist',
    backend: 'backend-specialist',
    testing: 'testing-specialist',
    database: 'backend-specialist',
    deployment: 'deployment-specialist',
    general: 'general-implementation-agent',
  };

  return {
    files: explorerResults.files.filter(f => f.relevanceScore > 0.1).map(f => ({
      path: f.relativePath,
      reason: `Relevance: ${(f.relevanceScore * 100).toFixed(0)}%`,
      complexity: f.size > 5000 ? 'L' : f.size > 1000 ? 'M' : 'S',
      relevance: f.relevance,
    })),
    snippets: explorerResults.snippets.map(s => ({
      file: s.file,
      startLine: s.startLine,
      endLine: s.endLine,
      content: s.content,
      language: s.language,
      description: s.description,
      relevance: s.relevance,
    })),
    patterns: analyzerResults.patterns,
    filesAnalyzed: explorerResults.files.length,
    domainDistribution,
    primaryAgent: agentMap[primaryDomain] || 'general-implementation-agent',
    primaryAgentReason: `Primary domain is ${primaryDomain} (${sortedDomains[0]?.[1] || 0} files)`,
    recommendedAgents: analyzerResults.recommendations.map(r => r.agent),
  };
}

/**
 * Generate task-agent assignments
 */
export function generateTaskAssignments(phases, aggregated) {
  const assignments = [];

  for (const phase of phases) {
    for (const task of (phase.tasks || [])) {
      assignments.push({
        phase: `P${phase.id}`,
        task: task.id,
        agent: task.assignedAgent || aggregated.primaryAgent,
        reason: `Domain match for ${task.title.substring(0, 30)}`,
      });
    }
  }

  return assignments;
}

/**
 * Generate execution sequence
 */
export function generateExecutionSequence(phases) {
  const sequence = [];

  for (const phase of phases) {
    const agent = phase.assignedAgent || 'general-implementation-agent';
    const existing = sequence.find(s => s.agent === agent);

    if (existing) {
      existing.scope += `, Phase ${phase.id}`;
    } else {
      sequence.push({
        agent,
        scope: `Phase ${phase.id}: ${phase.name}`,
      });
    }
  }

  return sequence;
}

/**
 * Calculate exploration confidence
 */
export function calculateConfidence(aggregated) {
  const fileCount = aggregated.files?.length || 0;
  const snippetCount = aggregated.snippets?.length || 0;
  const patternCount = aggregated.patterns?.length || 0;

  if (fileCount > 20 && snippetCount > 10 && patternCount > 2) return 'high';
  if (fileCount > 5 && snippetCount > 3) return 'medium';
  return 'low';
}

/**
 * Assess overall complexity
 */
export function assessComplexity(aggregated) {
  const fileCount = aggregated.files?.length || 0;
  const domainCount = Object.keys(aggregated.domainDistribution || {}).length;

  if (fileCount > 50 || domainCount > 4) {
    return 'Large - Multiple domains and extensive codebase';
  }
  if (fileCount > 15 || domainCount > 2) {
    return 'Medium - Several components across domains';
  }
  return 'Small - Focused scope with limited files';
}
