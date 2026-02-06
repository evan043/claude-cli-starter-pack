/**
 * L2 Orchestrator - Phase Breakdown Generator
 *
 * Generates detailed phase breakdowns with tasks, file references,
 * specificity scoring, and agent assignments.
 */

import { getPrimaryDomain } from '../../../roadmap/intelligence.js';

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

    const enhancedTasks = tasks.map((task, taskIdx) => {
      const taskId = task.id || `${phaseNum}.${taskIdx + 1}`;

      const taskKeywords = extractTaskKeywords(task.title || '', task.description || '');
      const relevantFiles = findRelevantFilesForTask(aggregated.files, taskKeywords);
      const relevantSnippets = findRelevantSnippets(aggregated.snippets, taskKeywords);
      const specificity = calculateSpecificity(task, relevantFiles, relevantSnippets);

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
        subject: task.title,
        activeForm: generateActiveForm(task.title),
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

  if (titleLower.includes('test')) return ['Tests pass', 'Coverage acceptable'];
  if (titleLower.includes('deploy')) return ['Deployment successful', 'Health checks pass'];
  if (titleLower.includes('api') || titleLower.includes('endpoint')) return ['Endpoints respond correctly', 'Error handling complete'];

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
