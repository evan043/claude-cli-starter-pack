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
    // Generate tasks from task templates
    const tasks = template.taskTemplates.map((taskTitle) => ({
      title: taskTitle,
      description: `Implement: ${taskTitle.toLowerCase()}`,
      status: 'pending',
      files: [],
      acceptanceCriteria: generateAcceptanceCriteria(taskTitle),
    }));

    // Add scope-specific tasks
    if (idx === 0 && scope.integrations !== 'none') {
      tasks.push({
        title: 'Set up external integrations',
        description: 'Configure required API connections',
        status: 'pending',
        files: [],
        acceptanceCriteria: ['API connections configured', 'Integration tested'],
      });
    }

    return {
      name: template.name,
      description: template.description,
      tasks,
      prerequisites: idx > 0 ? [`Phase ${idx} complete`] : [],
      validationCriteria: generateValidationCriteria(template.name, idx),
      tests: [],
    };
  });
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
