/**
 * Scale Calculator
 *
 * Determines project scale (S/M/L) based on scope assessment.
 * Generates appropriate phase structure - works with ANY tech stack.
 */

import {
  SCALE_DEFINITIONS,
  SMALL_PHASE_TEMPLATES,
  MEDIUM_PHASE_TEMPLATES,
  LARGE_PHASE_TEMPLATES,
} from '../../agents/phase-dev-templates.js';

/**
 * Score mapping for scope assessment
 */
const SCORE_MAP = {
  linesOfCode: {
    small: 1,
    medium: 2,
    large: 3,
    xlarge: 4,
  },
  components: {
    few: 1,
    several: 2,
    many: 3,
    extensive: 4,
  },
  integrations: {
    none: 0,
    few: 1,
    several: 2,
    many: 3,
  },
  familiarity: {
    high: 0,
    medium: 1,
    low: 2,
  },
};

/**
 * Calculate project scale from scope assessment
 *
 * @param {Object} scope - Scope assessment answers
 * @returns {Object} Scale result with phases
 */
export function calculateProjectScale(scope) {
  // Calculate score
  let score = 0;
  score += SCORE_MAP.linesOfCode[scope.linesOfCode] || 2;
  score += SCORE_MAP.components[scope.components] || 2;
  score += SCORE_MAP.integrations[scope.integrations] || 1;
  score += SCORE_MAP.familiarity[scope.familiarity] || 1;

  // Determine scale
  // 0-4 → S | 5-8 → M | 9+ → L
  let scale, scaleName, phaseTemplates;

  if (score <= 4) {
    scale = 'S';
    scaleName = 'Small';
    phaseTemplates = SMALL_PHASE_TEMPLATES;
  } else if (score <= 8) {
    scale = 'M';
    scaleName = 'Medium';
    phaseTemplates = MEDIUM_PHASE_TEMPLATES;
  } else {
    scale = 'L';
    scaleName = 'Large';
    phaseTemplates = LARGE_PHASE_TEMPLATES;
  }

  // Generate phases from templates
  const phases = generatePhases(phaseTemplates, scope);

  // Calculate task estimate
  const taskEstimate = phases.reduce((sum, p) => sum + p.tasks.length, 0);

  return {
    scale,
    scaleName,
    score,
    phases,
    taskEstimate,
    scaleDefinition: SCALE_DEFINITIONS[scale],
  };
}

/**
 * Generate phases from templates
 */
function generatePhases(templates, scope) {
  return templates.map((template, idx) => {
    const phaseNum = idx + 1;

    // Generate tasks from task templates with enhanced fields
    const tasks = template.taskTemplates.map((taskTitle, taskIdx) => {
      const taskId = `${phaseNum}.${taskIdx + 1}`;

      return {
        id: taskId,
        title: taskTitle,
        // TaskCreate compatibility fields
        subject: taskTitle,
        activeForm: generateActiveForm(taskTitle),
        description: `Implement: ${taskTitle.toLowerCase()}`,
        status: 'pending',
        files: [],
        acceptanceCriteria: generateAcceptanceCriteria(taskTitle),
        // Specificity scoring (4-dimension)
        specificity: calculateTaskSpecificity(taskTitle, []),
        // Task dependencies
        blocks: [],
        blockedBy: taskIdx > 0 ? [`${phaseNum}.${taskIdx}`] : (idx > 0 ? [`${idx}.${templates[idx - 1].taskTemplates.length}`] : []),
        // Agent assignment (will be populated by L2 exploration)
        assignedAgent: null,
      };
    });

    // Add scope-specific tasks
    if (idx === 0 && scope.integrations !== 'none') {
      const intTaskId = `${phaseNum}.${tasks.length + 1}`;
      tasks.push({
        id: intTaskId,
        title: 'Set up external integrations',
        subject: 'Set up external integrations',
        activeForm: 'Setting up external integrations',
        description: 'Configure required API connections',
        status: 'pending',
        files: [],
        acceptanceCriteria: ['API connections configured', 'Integration tested'],
        specificity: calculateTaskSpecificity('Set up external integrations', []),
        blocks: [],
        blockedBy: tasks.length > 0 ? [`${phaseNum}.${tasks.length}`] : [],
        assignedAgent: null,
      });
    }

    return {
      id: phaseNum,
      name: template.name,
      description: template.description,
      tasks,
      prerequisites: idx > 0 ? [`Phase ${idx} complete`] : [],
      validationCriteria: generateValidationCriteria(template.name, idx),
      tests: [],
      // Phase-level fields
      complexity: estimatePhaseComplexity(tasks.length),
      assignedAgent: null,
      dependencies: idx > 0 ? [`phase-${idx}`] : [],
    };
  });
}

/**
 * Generate active form for TaskCreate (present continuous)
 * @param {string} title - Task title in imperative form
 * @returns {string} Present continuous form
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
    'wire': 'Wiring',
    'integrate': 'Integrating',
    'refactor': 'Refactoring',
    'optimize': 'Optimizing',
    'design': 'Designing',
    'plan': 'Planning',
    'define': 'Defining',
  };

  const activeVerb = verbMap[verb] || (verb.endsWith('e')
    ? `${verb.slice(0, -1)}ing`
    : `${verb}ing`).charAt(0).toUpperCase() + (verb.endsWith('e')
    ? `${verb.slice(0, -1)}ing`
    : `${verb}ing`).slice(1);

  words[0] = activeVerb;
  return words.join(' ');
}

/**
 * Calculate task specificity score (4-dimension)
 * @param {string} title - Task title
 * @param {Array} files - Related files
 * @returns {Object} Specificity breakdown
 */
function calculateTaskSpecificity(title, files) {
  const titleLength = title?.length || 0;

  // Specificity: How well-defined is the task? (30%)
  const specificityScore = Math.min(100, titleLength * 3 + 20);

  // Scope: How constrained is the work? (25%)
  const scopeScore = files.length > 0 ? Math.min(100, files.length * 25 + 30) : 40;

  // Technical Depth: How much detail is provided? (25%)
  const depthScore = titleLength > 30 ? 70 : titleLength > 15 ? 50 : 30;

  // Reproducibility: Could another agent do this? (20%)
  const reproducibilityScore = titleLength > 20 && files.length > 0 ? 75 : 45;

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
 * Estimate phase complexity from task count
 */
function estimatePhaseComplexity(taskCount) {
  if (taskCount <= 3) return 'S';
  if (taskCount <= 6) return 'M';
  return 'L';
}

/**
 * Generate acceptance criteria based on task title (generic)
 */
function generateAcceptanceCriteria(taskTitle) {
  const titleLower = taskTitle.toLowerCase();

  if (titleLower.includes('database') || titleLower.includes('schema') || titleLower.includes('data layer')) {
    return [
      'Database schema created',
      'Migrations run successfully',
      'Data access layer implemented',
    ];
  }

  if (titleLower.includes('api') || titleLower.includes('endpoint')) {
    return [
      'Endpoints respond correctly',
      'Error handling implemented',
      'API documented',
    ];
  }

  if (titleLower.includes('ui') || titleLower.includes('component')) {
    return [
      'Component renders correctly',
      'Responsive design verified',
      'Accessibility checked',
    ];
  }

  if (titleLower.includes('test')) {
    return [
      'Tests pass',
      'Coverage meets target',
      'Edge cases handled',
    ];
  }

  if (titleLower.includes('deploy')) {
    return [
      'Deployment successful',
      'Health checks pass',
      'No regressions',
    ];
  }

  if (titleLower.includes('integration')) {
    return [
      'Components connected',
      'Data flows correctly',
      'Integration tested',
    ];
  }

  // Default criteria (generic)
  return [
    'Implementation complete',
    'Code reviewed',
    'No build errors',
  ];
}

/**
 * Generate validation criteria for a phase (generic)
 */
function generateValidationCriteria(phaseName, phaseIndex) {
  const criteria = ['All tasks complete', 'No blocking issues'];

  const nameLower = phaseName.toLowerCase();

  if (nameLower.includes('foundation') || nameLower.includes('architecture')) {
    criteria.push(
      'Project structure established',
      'Development environment working',
      'Core architecture defined'
    );
  }

  if (nameLower.includes('api') || nameLower.includes('data')) {
    criteria.push(
      'Endpoints documented',
      'Data layer tested',
      'Error handling complete'
    );
  }

  if (nameLower.includes('ui') || nameLower.includes('feature') || nameLower.includes('core')) {
    criteria.push(
      'Components render correctly',
      'No console errors',
      'User flows complete'
    );
  }

  if (nameLower.includes('integration')) {
    criteria.push(
      'E2E tests pass',
      'Performance acceptable',
      'No regressions'
    );
  }

  if (nameLower.includes('deploy') || nameLower.includes('launch')) {
    criteria.push(
      'Deployment successful',
      'Monitoring configured',
      'Documentation updated'
    );
  }

  if (nameLower.includes('polish')) {
    criteria.push(
      'UI/UX review complete',
      'Performance optimized',
      'Accessibility checked'
    );
  }

  return criteria;
}

/**
 * Adjust scale based on enhancements
 */
export function adjustForEnhancements(scaleResult, enhancements) {
  const adjusted = { ...scaleResult };

  // Add tasks for testing enhancement
  if (enhancements.includes('testing')) {
    adjusted.phases = adjusted.phases.map((phase) => ({
      ...phase,
      tasks: [
        ...phase.tasks,
        {
          title: `Write tests for ${phase.name}`,
          description: 'Create tests for this phase',
          status: 'pending',
          files: [],
          acceptanceCriteria: ['Tests written', 'Coverage acceptable'],
          testType: 'unit',
        },
      ],
    }));
  }

  // Add E2E phase for large projects with testing
  if (scaleResult.scale === 'L' && enhancements.includes('testing')) {
    const lastPhase = adjusted.phases[adjusted.phases.length - 1];
    if (!lastPhase.name.toLowerCase().includes('e2e')) {
      adjusted.phases.push({
        name: 'E2E Validation',
        description: 'End-to-end testing and validation',
        tasks: [
          {
            title: 'Run full E2E test suite',
            description: 'Execute all end-to-end tests',
            status: 'pending',
            files: [],
            acceptanceCriteria: ['All E2E tests pass', 'No flaky tests'],
            testType: 'e2e',
          },
          {
            title: 'Performance validation',
            description: 'Run performance benchmarks',
            status: 'pending',
            files: [],
            acceptanceCriteria: ['Load times acceptable', 'No memory leaks'],
          },
        ],
        prerequisites: [`Phase ${adjusted.phases.length} complete`],
        validationCriteria: ['E2E tests pass', 'Performance acceptable'],
        tests: [],
      });
    }
  }

  // Recalculate task estimate
  adjusted.taskEstimate = adjusted.phases.reduce(
    (sum, p) => sum + p.tasks.length,
    0
  );

  return adjusted;
}

/**
 * Force a specific scale (bypass calculation)
 */
export function forceScale(scale, scope = {}) {
  let phaseTemplates;

  switch (scale.toUpperCase()) {
    case 'S':
      phaseTemplates = SMALL_PHASE_TEMPLATES;
      break;
    case 'M':
      phaseTemplates = MEDIUM_PHASE_TEMPLATES;
      break;
    case 'L':
      phaseTemplates = LARGE_PHASE_TEMPLATES;
      break;
    default:
      throw new Error(`Invalid scale: ${scale}. Use S, M, or L.`);
  }

  const phases = generatePhases(phaseTemplates, scope);
  const taskEstimate = phases.reduce((sum, p) => sum + p.tasks.length, 0);

  return {
    scale: scale.toUpperCase(),
    scaleName: SCALE_DEFINITIONS[scale.toUpperCase()].name,
    score: -1, // Indicates forced
    phases,
    taskEstimate,
    scaleDefinition: SCALE_DEFINITIONS[scale.toUpperCase()],
  };
}
