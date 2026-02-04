/**
 * L2 Orchestrator for Phase-Dev Plan
 *
 * Spawns parallel L2 agents for codebase exploration during phase-dev planning.
 * Aggregates findings and saves to .claude/exploration/{slug}/ as markdown.
 *
 * L2 Agent Types:
 * - code-explorer: Find relevant files and code paths
 * - reference-analyzer: Find similar existing features
 * - doc-generator: Generate context documentation
 */

import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { extractSnippets, analyzeFileContent } from './code-snippet-extractor.js';
import { saveAllExplorationDocs, loadExplorationDocs, explorationDocsExist } from '../../utils/exploration-docs.js';
import { getPrimaryDomain, classifyDomain } from '../../roadmap/intelligence.js';

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

  // Extract keywords for search
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

  // Build complete exploration data
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

  // Save exploration docs
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

  // From description
  if (description) {
    const words = description.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    words.forEach(w => keywords.add(w));
  }

  // From architecture
  if (architecture) {
    if (architecture.frontend?.framework) {
      keywords.add(architecture.frontend.framework.toLowerCase());
    }
    if (architecture.backend?.framework) {
      keywords.add(architecture.backend.framework.toLowerCase());
    }
    if (architecture.database?.type) {
      keywords.add(architecture.database.type.toLowerCase());
    }
    if (architecture.database?.orm) {
      keywords.add(architecture.database.orm.toLowerCase());
    }
  }

  // Add common important terms
  const importantTerms = ['auth', 'api', 'model', 'service', 'component', 'hook', 'store', 'util'];
  importantTerms.forEach(t => keywords.add(t));

  return Array.from(keywords).slice(0, 20);
}

/**
 * Run code explorer L2 agent
 */
async function runCodeExplorer(cwd, keywords, architecture) {
  const results = {
    files: [],
    directories: [],
    snippets: [],
    imports: new Map(),
    exports: new Map(),
  };

  // Determine key directories to explore
  const keyDirs = determineKeyDirectories(cwd, architecture);

  for (const dir of keyDirs) {
    const fullDir = join(cwd, dir);
    if (!existsSync(fullDir)) continue;

    const files = scanDirectory(fullDir, cwd);
    results.files.push(...files);
  }

  // Score files by relevance
  results.files = scoreFileRelevance(results.files, keywords, architecture);

  // Extract snippets from top relevant files
  const topFiles = results.files
    .filter(f => f.relevanceScore > 0.3)
    .slice(0, 20);

  for (const file of topFiles) {
    const snippets = await extractSnippets(file.fullPath, {
      keywords,
      maxSnippets: 3,
      extractStructures: true,
    });
    results.snippets.push(...snippets);
  }

  return results;
}

/**
 * Run reference analyzer L2 agent
 */
async function runReferenceAnalyzer(cwd, explorerResults, architecture) {
  const results = {
    patterns: [],
    similarFeatures: [],
    recommendations: [],
  };

  // Analyze file patterns
  const files = explorerResults.files;

  // Group by purpose
  const byPurpose = new Map();
  for (const file of files) {
    const analysis = analyzeFileContent(file.fullPath);
    const purpose = analysis.primaryPurpose || 'general';

    if (!byPurpose.has(purpose)) {
      byPurpose.set(purpose, []);
    }
    byPurpose.get(purpose).push({ ...file, analysis });
  }

  // Detect patterns
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

  // Recommend agents based on architecture
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
 * Determine key directories to explore based on architecture
 */
function determineKeyDirectories(cwd, architecture) {
  const dirs = new Set(['src', 'lib', 'app', 'components', 'pages']);

  // Add backend directories
  if (architecture?.backend) {
    dirs.add('backend');
    dirs.add('server');
    dirs.add('api');
    dirs.add('routes');
    dirs.add('controllers');
    dirs.add('services');
    dirs.add('models');
  }

  // Add frontend directories
  if (architecture?.frontend) {
    dirs.add('components');
    dirs.add('pages');
    dirs.add('views');
    dirs.add('hooks');
    dirs.add('store');
    dirs.add('stores');
  }

  // Add test directories
  dirs.add('tests');
  dirs.add('test');
  dirs.add('__tests__');
  dirs.add('e2e');

  // Filter to existing directories
  return Array.from(dirs).filter(d => existsSync(join(cwd, d)));
}

/**
 * Scan a directory recursively for relevant files
 */
function scanDirectory(dir, cwd, depth = 0, maxDepth = 5) {
  const files = [];

  if (depth > maxDepth) return files;

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      // Skip common non-relevant directories
      if (['node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', 'venv', '.next', '.cache'].includes(entry)) {
        continue;
      }

      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        files.push(...scanDirectory(fullPath, cwd, depth + 1, maxDepth));
      } else if (stats.isFile()) {
        const ext = extname(entry).toLowerCase();
        const relevantExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.vue', '.svelte', '.go', '.rs', '.java'];

        if (relevantExtensions.includes(ext)) {
          files.push({
            fullPath,
            relativePath: relative(cwd, fullPath),
            name: entry,
            ext,
            size: stats.size,
          });
        }
      }
    }
  } catch {
    // Ignore permission errors
  }

  return files;
}

/**
 * Score files by relevance to keywords and architecture
 */
function scoreFileRelevance(files, keywords, architecture) {
  return files.map(file => {
    let score = 0;
    const path = file.relativePath.toLowerCase();
    const name = file.name.toLowerCase();

    // Keyword matching
    for (const keyword of keywords) {
      if (path.includes(keyword)) {
        score += 0.2;
      }
      if (name.includes(keyword)) {
        score += 0.3;
      }
    }

    // Architecture matching
    if (architecture?.backend) {
      if (path.includes('api') || path.includes('route') || path.includes('controller') || path.includes('service')) {
        score += 0.2;
      }
    }
    if (architecture?.frontend) {
      if (path.includes('component') || path.includes('page') || path.includes('hook')) {
        score += 0.2;
      }
    }

    // Test files
    if (path.includes('test') || path.includes('spec')) {
      file.relevance = 'test';
      score += 0.1;
    } else if (path.includes('util') || path.includes('helper') || path.includes('lib')) {
      file.relevance = 'reference';
      score += 0.1;
    } else {
      file.relevance = score > 0.3 ? 'primary' : 'reference';
    }

    return {
      ...file,
      relevanceScore: Math.min(1, score),
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Aggregate exploration results from multiple agents
 * @param {Object} explorerResults - Code explorer results
 * @param {Object} analyzerResults - Reference analyzer results
 * @returns {Object} Aggregated results
 */
export function aggregateExplorationResults(explorerResults, analyzerResults) {
  // Analyze domain distribution
  const domainDistribution = {};
  for (const file of explorerResults.files) {
    const domain = getPrimaryDomain(file.relativePath) || 'general';
    domainDistribution[domain] = (domainDistribution[domain] || 0) + 1;
  }

  // Determine primary domain and agent
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
 * Generate full phase breakdown with tasks
 * @param {Object} aggregated - Aggregated exploration results
 * @param {Array} basePhases - Base phases from config
 * @param {Object} config - Full configuration
 * @returns {Array} Enhanced phases with tasks
 */
export function generatePhaseBreakdown(aggregated, basePhases, config) {
  if (!basePhases || basePhases.length === 0) {
    return [];
  }

  return basePhases.map((phase, phaseIdx) => {
    const phaseNum = phaseIdx + 1;
    const tasks = phase.tasks || [];

    // Enhance tasks with exploration data
    const enhancedTasks = tasks.map((task, taskIdx) => {
      const taskId = task.id || `${phaseNum}.${taskIdx + 1}`;

      // Find relevant files for this task
      const taskKeywords = extractTaskKeywords(task.title || '', task.description || '');
      const relevantFiles = findRelevantFilesForTask(aggregated.files, taskKeywords);

      // Find relevant snippets
      const relevantSnippets = findRelevantSnippets(aggregated.snippets, taskKeywords);

      // Calculate specificity score
      const specificity = calculateSpecificity(task, relevantFiles, relevantSnippets);

      // Determine agent for task
      const taskDomain = getPrimaryDomain(`${task.title} ${task.description}`) || 'general';
      const agentMap = {
        frontend: 'frontend-specialist',
        backend: 'backend-specialist',
        testing: 'testing-specialist',
        database: 'backend-specialist',
        deployment: 'deployment-specialist',
        general: aggregated.primaryAgent,
      };

      return {
        id: taskId,
        title: task.title,
        subject: task.title,  // TaskCreate compatibility
        activeForm: generateActiveForm(task.title),  // TaskCreate compatibility
        description: task.description || `Implement: ${task.title.toLowerCase()}`,
        status: task.status || 'pending',
        files: relevantFiles.slice(0, 5),
        codePatternRef: relevantSnippets.length > 0 ? `Snippet ${relevantSnippets[0]?.description || 1}` : null,
        specificity,
        acceptanceCriteria: task.acceptanceCriteria || task.acceptance_criteria || generateDefaultCriteria(task.title),
        assignedAgent: agentMap[taskDomain] || aggregated.primaryAgent,
        blockedBy: taskIdx === 0 && phaseIdx > 0 ? [`${phaseNum - 1}.${basePhases[phaseIdx - 1].tasks?.length || 1}`] : [],
        blocks: [],
      };
    });

    // Determine phase agent
    const phaseText = `${phase.name} ${phase.description}`;
    const phaseDomain = getPrimaryDomain(phaseText) || 'general';

    return {
      id: phaseNum,
      name: phase.name,
      objective: phase.description,
      description: phase.description,
      complexity: phase.complexity || estimatePhaseComplexity(enhancedTasks),
      assignedAgent: aggregated.primaryAgent,
      dependencies: phaseIdx > 0 ? [`Phase ${phaseIdx}`] : [],
      validationCriteria: phase.validationCriteria || generateValidationCriteria(phase.name),
      tasks: enhancedTasks,
    };
  });
}

/**
 * Extract keywords from task title/description
 */
function extractTaskKeywords(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(w));
  return [...new Set(words)];
}

/**
 * Find files relevant to a task
 */
function findRelevantFilesForTask(files, keywords) {
  return files
    .filter(f => {
      const path = f.path.toLowerCase();
      return keywords.some(kw => path.includes(kw));
    })
    .map(f => ({
      path: f.path,
      reason: f.reason,
      relevance: f.relevance,
    }));
}

/**
 * Find snippets relevant to a task
 */
function findRelevantSnippets(snippets, keywords) {
  return snippets.filter(s => {
    const desc = (s.description || '').toLowerCase();
    const content = (s.content || '').toLowerCase();
    return keywords.some(kw => desc.includes(kw) || content.includes(kw));
  });
}

/**
 * Calculate task specificity score
 */
function calculateSpecificity(task, files, snippets) {
  // 4-dimension scoring: specificity, scope, depth, reproducibility
  const specificityScore = Math.min(100, (task.title?.length || 0) * 2 + (task.description?.length || 0) / 5);
  const scopeScore = Math.min(100, files.length * 20 + 20);
  const depthScore = Math.min(100, snippets.length * 25 + 25);
  const reproducibilityScore = task.acceptanceCriteria?.length > 0 ? 80 : 40;

  const score = Math.round(
    specificityScore * 0.30 +
    scopeScore * 0.25 +
    depthScore * 0.25 +
    reproducibilityScore * 0.20
  );

  return {
    score,
    breakdown: {
      specificity: Math.round(specificityScore),
      scope: Math.round(scopeScore),
      technicalDepth: Math.round(depthScore),
      reproducibility: Math.round(reproducibilityScore),
    },
  };
}

/**
 * Generate active form for TaskCreate
 */
function generateActiveForm(title) {
  if (!title) return 'Working on task';

  // Convert imperative to present continuous
  const words = title.split(' ');
  const verb = words[0].toLowerCase();

  const verbMap = {
    'set': 'Setting',
    'add': 'Adding',
    'create': 'Creating',
    'implement': 'Implementing',
    'build': 'Building',
    'configure': 'Configuring',
    'fix': 'Fixing',
    'update': 'Updating',
    'write': 'Writing',
    'run': 'Running',
    'test': 'Testing',
    'deploy': 'Deploying',
    'connect': 'Connecting',
    'wire': 'Wiring',
    'integrate': 'Integrating',
    'refactor': 'Refactoring',
    'optimize': 'Optimizing',
  };

  const activeVerb = verbMap[verb] || `${verb.charAt(0).toUpperCase()}${verb.slice(1)}ing`;
  words[0] = activeVerb;
  return words.join(' ');
}

/**
 * Estimate phase complexity
 */
function estimatePhaseComplexity(tasks) {
  const taskCount = tasks.length;
  const avgSpecificity = tasks.reduce((sum, t) => sum + (t.specificity?.score || 50), 0) / (taskCount || 1);

  if (taskCount <= 3 && avgSpecificity > 60) return 'S';
  if (taskCount <= 6) return 'M';
  return 'L';
}

/**
 * Generate default acceptance criteria
 */
function generateDefaultCriteria(title) {
  const titleLower = (title || '').toLowerCase();

  if (titleLower.includes('test')) {
    return ['Tests pass', 'Coverage acceptable'];
  }
  if (titleLower.includes('deploy')) {
    return ['Deployment successful', 'Health checks pass'];
  }
  if (titleLower.includes('api') || titleLower.includes('endpoint')) {
    return ['Endpoints respond correctly', 'Error handling complete'];
  }

  return ['Implementation complete', 'No build errors'];
}

/**
 * Generate validation criteria for a phase
 */
function generateValidationCriteria(phaseName) {
  const nameLower = (phaseName || '').toLowerCase();

  const criteria = ['All tasks complete', 'No blocking issues'];

  if (nameLower.includes('foundation') || nameLower.includes('setup')) {
    criteria.push('Development environment working');
  }
  if (nameLower.includes('api') || nameLower.includes('backend')) {
    criteria.push('Endpoints documented and tested');
  }
  if (nameLower.includes('ui') || nameLower.includes('frontend')) {
    criteria.push('Components render correctly', 'No console errors');
  }
  if (nameLower.includes('test')) {
    criteria.push('All tests pass', 'Coverage meets target');
  }
  if (nameLower.includes('deploy')) {
    criteria.push('Deployment successful', 'Monitoring configured');
  }

  return criteria;
}

/**
 * Generate task-agent assignments
 */
function generateTaskAssignments(phases, aggregated) {
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
function generateExecutionSequence(phases) {
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
function calculateConfidence(aggregated) {
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
function assessComplexity(aggregated) {
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

/**
 * Save exploration to markdown (wrapper)
 */
export async function saveExplorationToMarkdown(slug, findings, cwd = process.cwd()) {
  return saveAllExplorationDocs(slug, findings, cwd);
}

export default {
  runL2Exploration,
  extractKeywords,
  aggregateExplorationResults,
  generatePhaseBreakdown,
  saveExplorationToMarkdown,
  L2_EXPLORATION_AGENTS,
};
