/**
 * Roadmap Intelligence Layer
 *
 * Smart grouping, dependency detection, complexity estimation,
 * and parallel work identification for roadmap planning.
 */

import { COMPLEXITY } from './schema.js';

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
 * Dependency indicator phrases
 */
const DEPENDENCY_INDICATORS = {
  depends_on: ['depends on', 'requires', 'needs', 'after', 'following', 'once', 'when'],
  blocks: ['blocks', 'required by', 'prerequisite for', 'before'],
  related: ['related to', 'similar to', 'see also', 'cf.', 'connected to'],
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
 * Detect dependencies between items
 *
 * @param {Array} items - Array of items with title/description/body
 * @returns {Map} Dependency map: item -> [dependent items]
 */
export function detectDependencies(items) {
  const dependencies = new Map();

  for (const item of items) {
    dependencies.set(item.id || item.number, []);
  }

  for (const item of items) {
    const text = `${item.title || ''} ${item.body || ''} ${item.description || ''}`.toLowerCase();
    const itemId = item.id || item.number;

    // Check for explicit dependency mentions
    for (const indicator of DEPENDENCY_INDICATORS.depends_on) {
      const regex = new RegExp(`${indicator}\\s+#?(\\d+)`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const depId = parseInt(match[1]);
        if (items.some(i => (i.id || i.number) === depId)) {
          dependencies.get(itemId).push(depId);
        }
      }
    }

    // Check for mentions of other item titles
    for (const otherItem of items) {
      if (otherItem === item) continue;

      const otherId = otherItem.id || otherItem.number;
      const otherTitle = (otherItem.title || '').toLowerCase();

      // Look for "after {title}" or "requires {title}" patterns
      for (const indicator of DEPENDENCY_INDICATORS.depends_on) {
        if (otherTitle.length > 5 && text.includes(`${indicator} ${otherTitle.substring(0, 20)}`)) {
          if (!dependencies.get(itemId).includes(otherId)) {
            dependencies.get(itemId).push(otherId);
          }
        }
      }
    }
  }

  return dependencies;
}

/**
 * Analyze file overlap between items to infer dependencies
 *
 * @param {Array} items - Array of items with file references
 * @returns {Object} Overlap analysis
 */
export function analyzeFileOverlap(items) {
  const fileToItems = new Map();

  // Build file -> items mapping
  for (const item of items) {
    const files = item.files || item.source_files || [];
    const itemId = item.id || item.number;

    for (const file of files) {
      if (!fileToItems.has(file)) {
        fileToItems.set(file, []);
      }
      fileToItems.get(file).push(itemId);
    }
  }

  // Find overlapping items
  const overlaps = [];
  for (const [file, itemIds] of fileToItems.entries()) {
    if (itemIds.length > 1) {
      overlaps.push({
        file,
        items: itemIds,
        conflictRisk: itemIds.length > 2 ? 'high' : 'medium',
      });
    }
  }

  return {
    overlaps,
    hasConflictRisk: overlaps.some(o => o.conflictRisk === 'high'),
    suggestedOrder: suggestOrderFromOverlaps(overlaps, items),
  };
}

/**
 * Suggest execution order based on file overlaps
 */
function suggestOrderFromOverlaps(overlaps, items) {
  // Items with more shared files should run sequentially
  const itemOverlapCount = new Map();

  for (const item of items) {
    itemOverlapCount.set(item.id || item.number, 0);
  }

  for (const overlap of overlaps) {
    for (const itemId of overlap.items) {
      itemOverlapCount.set(itemId, (itemOverlapCount.get(itemId) || 0) + 1);
    }
  }

  // Sort by overlap count (most overlaps first - they're the "base" changes)
  return Array.from(itemOverlapCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

/**
 * Estimate complexity for a phase or task group
 *
 * @param {Object} phase - Phase or task group
 * @returns {string} Complexity: S, M, or L
 */
export function estimateComplexity(phase) {
  const factors = {
    issueCount: 0,
    fileCount: 0,
    domainCount: 0,
    hasDatabase: false,
    hasAuth: false,
    hasTests: false,
    descriptionLength: 0,
  };

  // Count issues/tasks
  const issues = phase.issues || phase.inputs?.issues || [];
  factors.issueCount = issues.length;

  // Count files
  const files = phase.files || phase.source_files || phase.inputs?.docs || [];
  factors.fileCount = files.length;

  // Analyze description for complexity indicators
  const text = `${phase.goal || ''} ${phase.description || ''} ${phase.phase_title || ''}`.toLowerCase();
  factors.descriptionLength = text.length;

  // Domain diversity
  const scores = classifyDomain(text);
  factors.domainCount = Object.values(scores).filter(s => s > 0.1).length;

  // Special complexity factors
  factors.hasDatabase = scores.database > 0.2;
  factors.hasAuth = text.includes('auth') || text.includes('login') || text.includes('permission');
  factors.hasTests = scores.testing > 0.2;

  // Calculate score
  let score = 0;

  score += factors.issueCount * 2;
  score += factors.fileCount * 1.5;
  score += factors.domainCount * 3;
  score += factors.hasDatabase ? 5 : 0;
  score += factors.hasAuth ? 4 : 0;
  score += factors.hasTests ? 2 : 0;
  score += factors.descriptionLength > 500 ? 3 : 0;

  // Map to complexity
  if (score < 10) return 'S';
  if (score < 25) return 'M';
  return 'L';
}

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
 * Check if roadmap scope is simple enough for a single phase-dev-plan
 *
 * @param {Object} scope - Scope analysis object
 * @returns {Object} Recommendation { shouldBeSinglePhase: boolean, reason: string }
 */
export function shouldRecommendSinglePhase(scope) {
  const {
    issueCount = 0,
    avgComplexity = 'M',
    domainCount = 1,
    hasMultipleDependencyChains = false,
  } = scope;

  // Simple scope: few issues, low complexity, single domain
  if (issueCount < 5 && avgComplexity === 'S' && domainCount <= 1) {
    return {
      shouldBeSinglePhase: true,
      reason: 'Scope is small enough for a single phase-dev-plan',
    };
  }

  // Too simple for roadmap overhead
  if (issueCount < 3) {
    return {
      shouldBeSinglePhase: true,
      reason: 'Only a few tasks - roadmap overhead not justified',
    };
  }

  // Complex enough for roadmap
  return {
    shouldBeSinglePhase: false,
    reason: null,
  };
}

/**
 * Analyze overall scope and recommend structure
 *
 * @param {Array} items - Array of issues/tasks
 * @returns {Object} Scope analysis with recommendations
 */
export function analyzeScope(items) {
  if (!items || items.length === 0) {
    return {
      itemCount: 0,
      avgComplexity: 'S',
      domainCount: 0,
      domains: [],
      hasMultipleDependencyChains: false,
      recommendation: shouldRecommendSinglePhase({ issueCount: 0 }),
    };
  }

  // Group by domain
  const groups = groupRelatedItems(items);

  // Detect dependencies
  const dependencies = detectDependencies(items);

  // Count dependency chains
  let chainCount = 0;
  for (const deps of dependencies.values()) {
    if (deps.length > 0) chainCount++;
  }

  // Calculate average complexity
  const complexities = items.map(item => estimateComplexity({
    description: item.body || item.description || '',
    goal: item.title || '',
    files: item.files || [],
  }));

  const complexityScores = { S: 1, M: 2, L: 3 };
  const avgScore = complexities.reduce((sum, c) => sum + complexityScores[c], 0) / complexities.length;
  const avgComplexity = avgScore < 1.5 ? 'S' : avgScore < 2.5 ? 'M' : 'L';

  const scope = {
    itemCount: items.length,
    avgComplexity,
    domainCount: groups.length,
    domains: groups.map(g => g.domain),
    hasMultipleDependencyChains: chainCount > 2,
    groups,
    dependencies: Object.fromEntries(dependencies),
  };

  scope.recommendation = shouldRecommendSinglePhase({
    issueCount: items.length,
    avgComplexity,
    domainCount: groups.length,
    hasMultipleDependencyChains: scope.hasMultipleDependencyChains,
  });

  return scope;
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

// ============================================================
// MULTI-PROJECT PATTERNS (Mode C)
// ============================================================

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
 * Check if groups have independent workflows (minimal overlap)
 */
function hasIndependentWorkflows(items, groups) {
  if (groups.length < 2) return false;

  // Check file overlap between groups
  const filesByGroup = groups.map(g => {
    const files = new Set();
    g.items.forEach(item => {
      (item.files || item.source_files || []).forEach(f => files.add(f));
    });
    return files;
  });

  // Count overlapping files between groups
  let overlapCount = 0;
  for (let i = 0; i < filesByGroup.length; i++) {
    for (let j = i + 1; j < filesByGroup.length; j++) {
      const intersection = [...filesByGroup[i]].filter(f => filesByGroup[j].has(f));
      overlapCount += intersection.length;
    }
  }

  // Low overlap indicates independent workflows
  const totalFiles = filesByGroup.reduce((sum, s) => sum + s.size, 0);
  return totalFiles > 0 && (overlapCount / totalFiles) < 0.2;
}

/**
 * Check if items have significant complexity spread
 */
function hasSignificantComplexitySpread(items) {
  const complexities = items.map(item => estimateComplexity({
    description: item.body || item.description || '',
    goal: item.title || '',
    files: item.files || [],
  }));

  const hasSmall = complexities.includes('S');
  const hasMedium = complexities.includes('M');
  const hasLarge = complexities.includes('L');

  // All three complexity levels present
  return hasSmall && hasMedium && hasLarge;
}

/**
 * Check for explicit project markers in items
 */
function hasExplicitProjectMarkers(items) {
  const markers = ['project:', 'epic:', 'feature:', 'module:', 'subsystem:'];

  for (const item of items) {
    const text = `${item.title || ''} ${item.body || ''}`.toLowerCase();
    if (markers.some(m => text.includes(m))) {
      return true;
    }
  }

  return false;
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
 * Format a project title from domain and keywords
 */
function formatProjectTitle(domain, keywords) {
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

/**
 * Identify independent tracks that can run in parallel
 * @param {Array} groups - Domain groups
 * @param {Map} dependencies - Dependency map
 * @returns {Array} Groups of independent tracks
 */
export function identifyIndependentTracks(groups, dependencies) {
  if (!groups || groups.length < 2) {
    return [{ tracks: groups || [], canParallelize: false }];
  }

  const independentTracks = [];
  const processedGroups = new Set();

  // Build dependency graph between groups
  const groupDependencies = new Map();

  for (const group of groups) {
    groupDependencies.set(group.domain, new Set());

    for (const item of group.items) {
      const itemId = item.id || item.number;
      const itemDeps = dependencies.get(itemId) || [];

      for (const depId of itemDeps) {
        // Find which group the dependency belongs to
        for (const otherGroup of groups) {
          if (otherGroup === group) continue;
          if (otherGroup.items.some(i => (i.id || i.number) === depId)) {
            groupDependencies.get(group.domain).add(otherGroup.domain);
            break;
          }
        }
      }
    }
  }

  // Find groups with no dependencies (can start immediately)
  const noDeps = groups.filter(g => groupDependencies.get(g.domain).size === 0);

  if (noDeps.length > 1) {
    independentTracks.push({
      tracks: noDeps,
      canParallelize: true,
      reason: 'No inter-group dependencies',
    });
    noDeps.forEach(g => processedGroups.add(g.domain));
  }

  // Find groups with same dependencies (can run in parallel after deps complete)
  const byDependencies = new Map();

  for (const group of groups) {
    if (processedGroups.has(group.domain)) continue;

    const depsKey = JSON.stringify([...groupDependencies.get(group.domain)].sort());
    if (!byDependencies.has(depsKey)) {
      byDependencies.set(depsKey, []);
    }
    byDependencies.get(depsKey).push(group);
  }

  for (const [depsKey, groupList] of byDependencies.entries()) {
    if (groupList.length > 1) {
      independentTracks.push({
        tracks: groupList,
        canParallelize: true,
        sharedDependencies: JSON.parse(depsKey),
        reason: 'Same dependencies - can run after they complete',
      });
    } else if (groupList.length === 1) {
      independentTracks.push({
        tracks: groupList,
        canParallelize: false,
        dependencies: JSON.parse(depsKey),
        reason: 'Has unique dependencies',
      });
    }
  }

  return independentTracks;
}
