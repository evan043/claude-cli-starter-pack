/**
 * Roadmap Intelligence - Recommendations & Optimization
 *
 * Phase ordering, agent assignment, and optimization suggestions.
 */

import {
  estimateComplexity,
  hasIndependentWorkflows,
  hasSignificantComplexitySpread,
  hasExplicitProjectMarkers,
} from './analyzer.js';
import { getPrimaryDomain, groupRelatedItems, formatProjectTitle } from './classifier.js';

/**
 * Identify phases that can run in parallel (no mutual dependencies)
 *
 * @param {Array} phases - Array of phases with dependencies
 * @returns {Array} Groups of parallel phases
 */
export function identifyParallelWork(phases) {
  const parallelGroups = [];
  const processed = new Set();

  // Build dependency graph
  const graph = new Map();
  const reverseDeps = new Map();

  for (const phase of phases) {
    const id = phase.phase_id;
    graph.set(id, new Set(phase.dependencies || []));
    reverseDeps.set(id, new Set());
  }

  // Build reverse dependency graph
  for (const phase of phases) {
    const id = phase.phase_id;
    for (const dep of phase.dependencies || []) {
      if (reverseDeps.has(dep)) {
        reverseDeps.get(dep).add(id);
      }
    }
  }

  // Find phases with same dependencies (can run in parallel)
  const byDependencies = new Map();

  for (const phase of phases) {
    const depsKey = JSON.stringify([...(phase.dependencies || [])].sort());
    if (!byDependencies.has(depsKey)) {
      byDependencies.set(depsKey, []);
    }
    byDependencies.get(depsKey).push(phase);
  }

  // Groups with more than one phase are parallel opportunities
  for (const [depsKey, group] of byDependencies.entries()) {
    if (group.length > 1) {
      // Verify no internal dependencies
      const ids = new Set(group.map(p => p.phase_id));
      const canParallelize = group.every(phase =>
        (phase.dependencies || []).every(dep => !ids.has(dep))
      );

      if (canParallelize) {
        parallelGroups.push({
          phases: group.map(p => p.phase_id),
          sharedDependencies: JSON.parse(depsKey),
          potentialSpeedup: group.length,
        });
      }
    }
  }

  return parallelGroups;
}

/**
 * Generate recommended phases from scope analysis
 *
 * @param {Object} scopeAnalysis - Result from analyzeScope()
 * @param {Array} items - Original items
 * @returns {Array} Recommended phase structure
 */
export function generatePhaseRecommendations(scopeAnalysis, items) {
  const { groups, domains, recommendation } = scopeAnalysis;

  if (recommendation.shouldBeSinglePhase) {
    // Single phase containing all items
    return [{
      phase_title: 'Implementation',
      goal: 'Complete all tasks',
      complexity: scopeAnalysis.avgComplexity,
      items: items.map(i => i.id || i.number),
      dependencies: [],
    }];
  }

  const phases = [];
  let phaseNumber = 1;

  // Foundation phase for database/core setup
  const dbGroup = groups.find(g => g.domain === 'database');
  if (dbGroup && dbGroup.items.length > 0) {
    phases.push({
      phase_title: 'Foundation & Data Layer',
      goal: 'Set up database schema, migrations, and core data models',
      complexity: estimateComplexity({ issues: dbGroup.items }),
      items: dbGroup.items.map(i => i.id || i.number),
      dependencies: [],
      domain: 'database',
      phase_number: phaseNumber++,
    });
  }

  // Backend phase
  const backendGroup = groups.find(g => g.domain === 'backend');
  if (backendGroup && backendGroup.items.length > 0) {
    phases.push({
      phase_title: 'API & Services',
      goal: 'Implement backend endpoints and business logic',
      complexity: estimateComplexity({ issues: backendGroup.items }),
      items: backendGroup.items.map(i => i.id || i.number),
      dependencies: dbGroup ? [phases[0].phase_number] : [],
      domain: 'backend',
      phase_number: phaseNumber++,
    });
  }

  // Frontend phase
  const frontendGroup = groups.find(g => g.domain === 'frontend');
  if (frontendGroup && frontendGroup.items.length > 0) {
    const deps = [];
    if (backendGroup) deps.push(phases.find(p => p.domain === 'backend')?.phase_number);

    phases.push({
      phase_title: 'UI & Components',
      goal: 'Build user interface and frontend components',
      complexity: estimateComplexity({ issues: frontendGroup.items }),
      items: frontendGroup.items.map(i => i.id || i.number),
      dependencies: deps.filter(Boolean),
      domain: 'frontend',
      phase_number: phaseNumber++,
    });
  }

  // Testing phase
  const testingGroup = groups.find(g => g.domain === 'testing');
  if (testingGroup && testingGroup.items.length > 0) {
    phases.push({
      phase_title: 'Testing & Validation',
      goal: 'Write and run tests, validate functionality',
      complexity: estimateComplexity({ issues: testingGroup.items }),
      items: testingGroup.items.map(i => i.id || i.number),
      dependencies: phases.map(p => p.phase_number), // Depends on all previous
      domain: 'testing',
      phase_number: phaseNumber++,
    });
  }

  // Deployment phase
  const deployGroup = groups.find(g => g.domain === 'deployment');
  if (deployGroup && deployGroup.items.length > 0) {
    phases.push({
      phase_title: 'Deployment & CI/CD',
      goal: 'Set up deployment pipeline and production environment',
      complexity: estimateComplexity({ issues: deployGroup.items }),
      items: deployGroup.items.map(i => i.id || i.number),
      dependencies: phases.map(p => p.phase_number),
      domain: 'deployment',
      phase_number: phaseNumber++,
    });
  }

  // Handle remaining items
  const assignedItems = new Set(phases.flatMap(p => p.items));
  const remainingItems = items.filter(i => !assignedItems.has(i.id || i.number));

  if (remainingItems.length > 0) {
    phases.push({
      phase_title: 'Additional Tasks',
      goal: 'Complete remaining tasks',
      complexity: 'S',
      items: remainingItems.map(i => i.id || i.number),
      dependencies: [],
      domain: 'general',
      phase_number: phaseNumber++,
    });
  }

  // Convert phase_number dependencies to phase_id format
  for (const phase of phases) {
    phase.phase_id = `phase-${phase.phase_number}`;
    phase.dependencies = phase.dependencies.map(n => `phase-${n}`);
  }

  return phases;
}

/**
 * Suggest agent assignments based on phase domain
 *
 * @param {Object} phase - Phase with domain info
 * @returns {Array} Suggested agent names
 */
export function suggestAgents(phase) {
  const domain = phase.domain || getPrimaryDomain(
    `${phase.phase_title || ''} ${phase.goal || ''}`
  );

  const agentSuggestions = {
    frontend: ['frontend-react-specialist', 'ui-component-builder'],
    backend: ['backend-api-specialist', 'service-layer-agent'],
    database: ['database-migration-specialist', 'schema-designer'],
    testing: ['testing-playwright-specialist', 'test-automation-agent'],
    deployment: ['deployment-specialist', 'ci-cd-agent'],
    documentation: ['documentation-writer', 'api-doc-generator'],
    general: ['general-implementation-agent'],
  };

  return agentSuggestions[domain] || agentSuggestions.general;
}

/**
 * Detect if scope should be decomposed into multiple projects
 * @param {Array} items - Array of issues/tasks
 * @returns {Object} Analysis result with project recommendations
 */
export function detectMultiProjectPatterns(items) {
  if (!items || items.length === 0) {
    return {
      shouldDecompose: false,
      reason: 'No items to analyze',
      projects: [],
    };
  }

  // Group items by domain
  const groups = groupRelatedItems(items);

  // Check for multi-project indicators
  const indicators = {
    multiDomain: groups.length >= 3,
    largeDomains: groups.filter(g => g.items.length >= 5).length >= 2,
    independentWorkflows: hasIndependentWorkflows(items, groups),
    complexitySpread: hasSignificantComplexitySpread(items),
    explicitProjects: hasExplicitProjectMarkers(items),
  };

  const score = Object.values(indicators).filter(Boolean).length;
  const shouldDecompose = score >= 2;

  // Generate project recommendations if decomposition is warranted
  let projects = [];
  if (shouldDecompose) {
    projects = generateProjectRecommendations(items, groups);
  }

  return {
    shouldDecompose,
    score,
    indicators,
    reason: shouldDecompose
      ? `Multi-project decomposition recommended: ${score}/5 indicators met`
      : 'Single roadmap sufficient',
    projects,
    groups,
  };
}

/**
 * Generate project recommendations from analysis
 * @param {Array} items - All items
 * @param {Array} groups - Domain groups
 * @returns {Array} Recommended projects
 */
function generateProjectRecommendations(items, groups) {
  const projects = [];
  let projectNumber = 1;

  // Create a project for each significant domain group
  for (const group of groups) {
    if (group.items.length < 2) continue;

    const complexity = estimateComplexity({
      issues: group.items,
      description: group.keywords.join(' '),
    });

    projects.push({
      project_id: `project-${projectNumber}`,
      project_title: formatProjectTitle(group.domain, group.keywords),
      description: `Implementation of ${group.domain} components`,
      domain: group.domain,
      complexity,
      items: group.items.map(i => i.id || i.number),
      itemCount: group.items.length,
      keywords: group.keywords.slice(0, 5),
      project_number: projectNumber,
    });

    projectNumber++;
  }

  // Handle remaining uncategorized items
  const assignedItems = new Set(projects.flatMap(p => p.items));
  const remainingItems = items.filter(i => !assignedItems.has(i.id || i.number));

  if (remainingItems.length > 0) {
    projects.push({
      project_id: `project-${projectNumber}`,
      project_title: 'Additional Tasks',
      description: 'Remaining tasks and integration work',
      domain: 'general',
      complexity: 'S',
      items: remainingItems.map(i => i.id || i.number),
      itemCount: remainingItems.length,
      keywords: [],
      project_number: projectNumber,
    });
  }

  return projects;
}

/**
 * Analyze a project for L2 agent delegation
 * @param {Object} project - Project to analyze
 * @returns {Object} L2 delegation recommendations
 */
export function analyzeProjectForL2Delegation(project) {
  const domain = project.domain || 'general';
  const complexity = project.complexity || 'M';

  // Determine primary agent based on domain
  const domainAgentMap = {
    frontend: 'frontend-specialist',
    backend: 'backend-specialist',
    database: 'backend-specialist',
    testing: 'testing-specialist',
    deployment: 'deployment-specialist',
    documentation: 'general-implementation-agent',
    general: 'general-implementation-agent',
  };

  const primaryAgent = domainAgentMap[domain];

  // Determine L2 agent types to spawn
  const l2AgentTypes = ['code_snippets', 'reference_files', 'agent_delegation'];

  // Add json_structure for complex projects
  if (complexity === 'L' || (project.phases?.length || 0) > 3) {
    l2AgentTypes.push('json_structure');
  }

  // Generate task assignments (preliminary)
  const taskAssignments = [];
  if (project.phases) {
    for (const phase of project.phases) {
      const phaseDomain = getPrimaryDomain(`${phase.name} ${phase.objective || ''}`) || domain;
      const phaseAgent = domainAgentMap[phaseDomain] || primaryAgent;

      for (const task of (phase.tasks || [])) {
        taskAssignments.push({
          phase: `P${phase.id}`,
          task: task.id,
          agent: phaseAgent,
          reason: `Domain match: ${phaseDomain}`,
        });
      }
    }
  }

  return {
    primaryAgent,
    primaryAgentReason: `Project domain is ${domain}`,
    l2AgentTypes,
    taskAssignments,
    executionSequence: [{
      agent: primaryAgent,
      scope: `Full project: ${project.project_title}`,
    }],
  };
}
