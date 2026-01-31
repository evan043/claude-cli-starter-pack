/**
 * Complexity Analyzer Hook
 *
 * Analyzes task lists and phase development plans to detect complexity
 * and recommend roadmap creation when appropriate.
 *
 * Triggers on:
 * - TodoWrite tool calls (task list creation)
 * - Phase development plan completion
 *
 * Event: PostToolUse
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateFile: '.claude/complexity-analysis.json',
  thresholds: {
    // When to recommend roadmap (score >= this)
    roadmapRecommendation: 7,
    // Task count thresholds
    taskCountLow: 15,
    taskCountMedium: 30,
    taskCountHigh: 50,
    // Domain count threshold
    multiDomainThreshold: 2,
    // Dependency depth threshold
    dependencyDepthThreshold: 3,
    // Feature variance threshold (different feature types)
    featureVarianceThreshold: 4,
  },
  domains: [
    'frontend',
    'backend',
    'database',
    'testing',
    'deployment',
    'devops',
    'documentation',
    'security',
    'api',
    'ui',
    'infrastructure',
  ],
  featureTypes: [
    'feature',
    'bugfix',
    'refactor',
    'migration',
    'integration',
    'optimization',
    'security',
    'testing',
    'documentation',
    'deployment',
  ],
};

/**
 * Load analysis state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return { analyses: [], recommendations: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { analyses: [], recommendations: [] };
  }
}

/**
 * Save analysis state
 */
function saveState(projectRoot, state) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Extract tasks from TodoWrite tool input
 */
function extractTasks(toolInput) {
  if (!toolInput || !toolInput.todos) {
    return [];
  }
  return toolInput.todos.map((todo, index) => ({
    id: `T${index + 1}`,
    content: todo.content || '',
    status: todo.status || 'pending',
    activeForm: todo.activeForm || '',
  }));
}

/**
 * Detect domains from task content
 */
function detectDomains(tasks) {
  const domainCounts = {};

  tasks.forEach((task) => {
    const content = (task.content + ' ' + task.activeForm).toLowerCase();

    CONFIG.domains.forEach((domain) => {
      // Check for domain keywords
      const keywords = getDomainKeywords(domain);
      if (keywords.some((kw) => content.includes(kw))) {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    });
  });

  return Object.entries(domainCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => ({ domain, count }));
}

/**
 * Get keywords for domain detection
 */
function getDomainKeywords(domain) {
  const keywordMap = {
    frontend: ['component', 'react', 'vue', 'angular', 'css', 'ui', 'page', 'form', 'button', 'render'],
    backend: ['api', 'endpoint', 'route', 'controller', 'service', 'handler', 'middleware', 'express', 'fastapi'],
    database: ['database', 'query', 'migration', 'schema', 'table', 'model', 'orm', 'sql', 'postgresql', 'mongodb'],
    testing: ['test', 'spec', 'mock', 'fixture', 'assertion', 'coverage', 'playwright', 'jest', 'vitest'],
    deployment: ['deploy', 'build', 'release', 'publish', 'ci/cd', 'pipeline', 'docker', 'kubernetes'],
    devops: ['infrastructure', 'monitoring', 'logging', 'metrics', 'alert', 'scaling'],
    documentation: ['readme', 'docs', 'documentation', 'comment', 'jsdoc', 'docstring'],
    security: ['auth', 'authentication', 'authorization', 'permission', 'role', 'token', 'jwt', 'oauth'],
    api: ['rest', 'graphql', 'endpoint', 'request', 'response', 'payload', 'swagger'],
    ui: ['style', 'theme', 'layout', 'responsive', 'animation', 'tailwind', 'css'],
    infrastructure: ['aws', 'gcp', 'azure', 'terraform', 'cloudflare', 'railway'],
  };
  return keywordMap[domain] || [domain];
}

/**
 * Detect feature types from tasks
 */
function detectFeatureTypes(tasks) {
  const typeCounts = {};

  tasks.forEach((task) => {
    const content = (task.content + ' ' + task.activeForm).toLowerCase();

    CONFIG.featureTypes.forEach((type) => {
      const keywords = getFeatureTypeKeywords(type);
      if (keywords.some((kw) => content.includes(kw))) {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    });
  });

  return Object.entries(typeCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({ type, count }));
}

/**
 * Get keywords for feature type detection
 */
function getFeatureTypeKeywords(type) {
  const keywordMap = {
    feature: ['add', 'create', 'implement', 'build', 'new feature', 'functionality'],
    bugfix: ['fix', 'bug', 'issue', 'error', 'crash', 'broken'],
    refactor: ['refactor', 'restructure', 'reorganize', 'clean up', 'optimize code'],
    migration: ['migrate', 'migration', 'upgrade', 'convert', 'move'],
    integration: ['integrate', 'connect', 'sync', 'api integration', 'third-party'],
    optimization: ['optimize', 'performance', 'speed', 'cache', 'lazy load'],
    security: ['security', 'vulnerability', 'patch', 'sanitize', 'validate'],
    testing: ['test', 'coverage', 'e2e', 'unit test', 'integration test'],
    documentation: ['document', 'readme', 'comment', 'docs'],
    deployment: ['deploy', 'release', 'publish', 'ci/cd'],
  };
  return keywordMap[type] || [type];
}

/**
 * Analyze task dependencies
 */
function analyzeDependencies(tasks) {
  // Look for dependency indicators in task content
  let maxDepth = 1;
  let hasDependencies = false;

  const dependencyKeywords = ['after', 'depends on', 'requires', 'blocked by', 'following', 'then'];

  tasks.forEach((task) => {
    const content = task.content.toLowerCase();
    if (dependencyKeywords.some((kw) => content.includes(kw))) {
      hasDependencies = true;
    }
  });

  // Estimate depth based on task count and sequential indicators
  if (tasks.length > 30) maxDepth = 4;
  else if (tasks.length > 20) maxDepth = 3;
  else if (tasks.length > 10) maxDepth = 2;

  return {
    hasDependencies,
    estimatedDepth: maxDepth,
    sequential: hasDependencies,
  };
}

/**
 * Calculate complexity score (0-10)
 */
function calculateComplexityScore(analysis) {
  let score = 0;

  // Task count scoring (0-3 points)
  if (analysis.taskCount >= CONFIG.thresholds.taskCountHigh) {
    score += 3;
  } else if (analysis.taskCount >= CONFIG.thresholds.taskCountMedium) {
    score += 2;
  } else if (analysis.taskCount >= CONFIG.thresholds.taskCountLow) {
    score += 1;
  }

  // Domain count scoring (0-2 points)
  if (analysis.domainCount > CONFIG.thresholds.multiDomainThreshold + 1) {
    score += 2;
  } else if (analysis.domainCount > CONFIG.thresholds.multiDomainThreshold) {
    score += 1;
  }

  // Feature variance scoring (0-2 points)
  if (analysis.featureTypeCount >= CONFIG.thresholds.featureVarianceThreshold) {
    score += 2;
  } else if (analysis.featureTypeCount >= CONFIG.thresholds.featureVarianceThreshold - 1) {
    score += 1;
  }

  // Dependency depth scoring (0-2 points)
  if (analysis.dependencyAnalysis.estimatedDepth >= CONFIG.thresholds.dependencyDepthThreshold + 1) {
    score += 2;
  } else if (analysis.dependencyAnalysis.estimatedDepth >= CONFIG.thresholds.dependencyDepthThreshold) {
    score += 1;
  }

  // Overlapping concern bonus (0-1 point)
  if (analysis.hasOverlappingConcerns) {
    score += 1;
  }

  return Math.min(score, 10);
}

/**
 * Detect overlapping concerns
 */
function detectOverlappingConcerns(tasks, domains) {
  // Check if multiple domains affect same files/areas
  const filePatterns = [];

  tasks.forEach((task) => {
    const content = task.content.toLowerCase();
    // Extract file references
    const fileMatches = content.match(/[\w-]+\.(js|ts|tsx|jsx|py|md|json|css|html)/g);
    if (fileMatches) {
      filePatterns.push(...fileMatches);
    }
  });

  // Check for duplicates (same file mentioned in multiple tasks)
  const fileCounts = {};
  filePatterns.forEach((f) => {
    fileCounts[f] = (fileCounts[f] || 0) + 1;
  });

  const overlappingFiles = Object.entries(fileCounts).filter(([, count]) => count > 2);

  return {
    hasOverlap: overlappingFiles.length > 0 || domains.length > 3,
    overlappingFiles: overlappingFiles.map(([file]) => file),
    reason:
      overlappingFiles.length > 0
        ? `${overlappingFiles.length} files referenced in multiple tasks`
        : domains.length > 3
          ? `${domains.length} different domains detected`
          : null,
  };
}

/**
 * Generate recommendation based on analysis
 */
function generateRecommendation(analysis, score) {
  if (score >= CONFIG.thresholds.roadmapRecommendation) {
    return {
      type: 'roadmap',
      reason: buildRecommendationReason(analysis, score),
      suggestedPhases: calculateSuggestedPhases(analysis),
      options: [
        { key: 'R', label: 'Create Roadmap', description: 'Split into multiple phase development plans' },
        { key: 'S', label: 'Keep as Single Plan', description: 'Continue with current task list' },
        { key: 'P', label: 'Create Phase Plan', description: 'Create single phased development plan' },
      ],
    };
  } else if (score >= 5) {
    return {
      type: 'phase-plan',
      reason: `Moderate complexity detected (score: ${score}/10). Consider using phased development.`,
      suggestedPhases: calculateSuggestedPhases(analysis),
      options: [
        { key: 'P', label: 'Create Phase Plan', description: 'Organize tasks into phases' },
        { key: 'C', label: 'Continue', description: 'Proceed with task list' },
      ],
    };
  } else {
    return {
      type: 'simple',
      reason: `Low complexity (score: ${score}/10). Task list approach is appropriate.`,
      options: [{ key: 'C', label: 'Continue', description: 'Proceed with task list' }],
    };
  }
}

/**
 * Build detailed recommendation reason
 */
function buildRecommendationReason(analysis, score) {
  const reasons = [];

  if (analysis.taskCount >= CONFIG.thresholds.taskCountMedium) {
    reasons.push(`${analysis.taskCount} tasks detected`);
  }
  if (analysis.domainCount > CONFIG.thresholds.multiDomainThreshold) {
    reasons.push(`spans ${analysis.domainCount} domains (${analysis.domains.map((d) => d.domain).join(', ')})`);
  }
  if (analysis.featureTypeCount >= CONFIG.thresholds.featureVarianceThreshold) {
    reasons.push(`${analysis.featureTypeCount} different feature types`);
  }
  if (analysis.hasOverlappingConcerns) {
    reasons.push('overlapping concerns detected');
  }

  return `High complexity detected (score: ${score}/10). ${reasons.join(', ')}. Recommend creating a roadmap with multiple phases for better organization and tracking.`;
}

/**
 * Calculate suggested number of phases
 */
function calculateSuggestedPhases(analysis) {
  const taskCount = analysis.taskCount;
  const domainCount = analysis.domainCount;

  // Base on task count
  let phases = Math.ceil(taskCount / 10);

  // Adjust for domains (at least one phase per major domain)
  phases = Math.max(phases, domainCount);

  // Cap at reasonable limits
  phases = Math.max(2, Math.min(phases, 8));

  return phases;
}

/**
 * Format recommendation message
 */
function formatRecommendationMessage(analysis, recommendation) {
  const borderChar = '═';
  const width = 70;

  let message = `
╔${borderChar.repeat(width)}╗
║  📊 Complexity Analysis Complete                                        ║
╠${borderChar.repeat(width)}╣
║                                                                          ║
║  Task Count: ${analysis.taskCount.toString().padEnd(6)} Domains: ${analysis.domainCount.toString().padEnd(6)} Score: ${analysis.complexityScore}/10       ║
║                                                                          ║
║  Domains: ${analysis.domains
    .slice(0, 4)
    .map((d) => d.domain)
    .join(', ')
    .padEnd(55)}║
`;

  if (analysis.featureTypes.length > 0) {
    message += `║  Feature Types: ${analysis.featureTypes
      .slice(0, 4)
      .map((f) => f.type)
      .join(', ')
      .padEnd(49)}║\n`;
  }

  message += `║                                                                          ║
╠${borderChar.repeat(width)}╣
║                                                                          ║`;

  if (recommendation.type === 'roadmap') {
    message += `
║  ⚠️  ROADMAP RECOMMENDED                                                 ║
║                                                                          ║
║  ${recommendation.reason.substring(0, 66).padEnd(66)}║`;

    if (recommendation.reason.length > 66) {
      message += `
║  ${recommendation.reason.substring(66, 132).padEnd(66)}║`;
    }

    message += `
║                                                                          ║
║  Suggested: ${recommendation.suggestedPhases} phases                                                  ║
║                                                                          ║
║  Options:                                                                ║`;

    recommendation.options.forEach((opt) => {
      message += `
║  [${opt.key}] ${opt.label.padEnd(20)} - ${opt.description.padEnd(38)}║`;
    });
  } else if (recommendation.type === 'phase-plan') {
    message += `
║  💡 PHASE PLAN SUGGESTED                                                 ║
║                                                                          ║
║  ${recommendation.reason.padEnd(66)}║
║                                                                          ║
║  Options:                                                                ║`;

    recommendation.options.forEach((opt) => {
      message += `
║  [${opt.key}] ${opt.label.padEnd(20)} - ${opt.description.padEnd(38)}║`;
    });
  }

  message += `
║                                                                          ║
╚${borderChar.repeat(width)}╝
`;

  return message;
}

/**
 * Main hook handler
 */
async function complexityAnalyzerHook(context) {
  const { tool, toolInput, toolOutput, projectRoot, hookType } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Only analyze TodoWrite calls
  if (tool !== 'TodoWrite') {
    return { continue: true };
  }

  // Extract tasks from input
  const tasks = extractTasks(toolInput);

  if (tasks.length < 5) {
    // Too few tasks to analyze
    return { continue: true };
  }

  // Perform analysis
  const domains = detectDomains(tasks);
  const featureTypes = detectFeatureTypes(tasks);
  const dependencyAnalysis = analyzeDependencies(tasks);
  const overlappingConcerns = detectOverlappingConcerns(tasks, domains);

  const analysis = {
    timestamp: new Date().toISOString(),
    taskCount: tasks.length,
    domains: domains,
    domainCount: domains.length,
    featureTypes: featureTypes,
    featureTypeCount: featureTypes.length,
    dependencyAnalysis: dependencyAnalysis,
    hasOverlappingConcerns: overlappingConcerns.hasOverlap,
    overlappingDetails: overlappingConcerns,
  };

  // Calculate complexity score
  const score = calculateComplexityScore(analysis);
  analysis.complexityScore = score;

  // Generate recommendation
  const recommendation = generateRecommendation(analysis, score);
  analysis.recommendation = recommendation;

  // Save state
  const state = loadState(projectRoot);
  state.analyses.push(analysis);
  if (recommendation.type === 'roadmap' || recommendation.type === 'phase-plan') {
    state.recommendations.push({
      timestamp: analysis.timestamp,
      type: recommendation.type,
      score: score,
      taskCount: tasks.length,
    });
  }
  saveState(projectRoot, state);

  // Only show recommendation for significant complexity
  if (score >= 5) {
    const message = formatRecommendationMessage(analysis, recommendation);

    return {
      continue: true,
      message: message,
      metadata: {
        complexityAnalysis: true,
        score: score,
        recommendation: recommendation.type,
        suggestedAction: recommendation.type === 'roadmap' ? '/create-roadmap' : '/create-phase-dev',
      },
    };
  }

  return { continue: true };
}

module.exports = complexityAnalyzerHook;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.calculateComplexityScore = calculateComplexityScore;
module.exports.detectDomains = detectDomains;
module.exports.detectFeatureTypes = detectFeatureTypes;
module.exports.generateRecommendation = generateRecommendation;
