/**
 * Vision Decision Engine
 *
 * Determines the optimal planning artifact type based on prompt analysis.
 * Instead of always creating the full VISION→EPIC→ROADMAP→PHASE hierarchy,
 * this engine scores the prompt and recommends the right level.
 *
 * Plan Types (least → most complex):
 *   task-list      → Simple PROGRESS.json with flat task list
 *   phase-dev-plan → PROGRESS.json with phased tasks
 *   roadmap        → ROADMAP.json + PROGRESS.json files
 *   epic           → EPIC.json + ROADMAPs + PROGRESS files
 *   vision-full    → Full VISION → EPIC → ROADMAP → PHASE hierarchy
 */

import { VisionIntent } from './schema.js';

/**
 * Plan type constants
 */
export const PlanType = {
  TASK_LIST: 'task-list',
  PHASE_DEV_PLAN: 'phase-dev-plan',
  ROADMAP: 'roadmap',
  EPIC: 'epic',
  VISION_FULL: 'vision-full'
};

/**
 * Scoring weights for decision factors
 */
const WEIGHTS = {
  featureCount: 2.0,
  domainDiversity: 3.0,
  technologyCount: 1.5,
  constraintCount: 1.0,
  intentModifier: 1.0,
  promptLength: 0.3
};

/**
 * Score thresholds for plan types
 */
const THRESHOLDS = {
  [PlanType.TASK_LIST]:      { max: 6 },
  [PlanType.PHASE_DEV_PLAN]: { max: 14 },
  [PlanType.ROADMAP]:        { max: 25 },
  [PlanType.EPIC]:           { max: 40 },
  [PlanType.VISION_FULL]:    { max: Infinity }
};

/**
 * Intent multipliers - how much intent affects the score upward
 */
const INTENT_MULTIPLIERS = {
  [VisionIntent.BUILD]: 1.2,
  [VisionIntent.MODIFY]: 0.8,
  [VisionIntent.REFACTOR]: 0.7,
  [VisionIntent.MIGRATE]: 1.0,
  [VisionIntent.OPTIMIZE]: 0.6
};

/**
 * Decide the optimal plan type for a parsed prompt
 *
 * @param {Object} parsedPrompt - Output from parseVisionPrompt()
 * @param {Object} complexityInfo - Output from estimateComplexity()
 * @param {Object} options - Optional overrides
 * @param {string} options.override - Force a specific plan type
 * @returns {Object} Decision result { planType, score, confidence, reasoning, factors }
 */
export function decidePlanType(parsedPrompt, complexityInfo = {}, options = {}) {
  // Allow explicit override
  if (options.override && Object.values(PlanType).includes(options.override)) {
    return {
      planType: options.override,
      score: 0,
      confidence: 1.0,
      reasoning: `Plan type overridden to "${options.override}" by user`,
      factors: {},
      overridden: true
    };
  }

  const parsed = parsedPrompt?.parsed || {};
  const features = parsed.features || [];
  const featureDetails = parsed.feature_details || [];
  const constraints = parsed.constraints || [];
  const technologies = parsed.technologies || [];
  const intent = parsed.intent || VisionIntent.BUILD;

  // Calculate domain diversity
  const domains = new Set(featureDetails.map(f => f.domain).filter(Boolean));
  const domainCount = Math.max(domains.size, 1);

  // Calculate prompt length score (longer prompts → more complex)
  const promptLength = parsedPrompt?.original?.length || 0;
  const promptLengthScore = Math.min(promptLength / 200, 5); // Cap at 5

  // Calculate individual factor scores
  const factors = {
    featureCount: features.length,
    featureScore: features.length * WEIGHTS.featureCount,
    domainDiversity: domainCount,
    domainScore: domainCount * WEIGHTS.domainDiversity,
    technologyCount: technologies.length,
    technologyScore: technologies.length * WEIGHTS.technologyCount,
    constraintCount: constraints.length,
    constraintScore: constraints.length * WEIGHTS.constraintCount,
    intent,
    intentMultiplier: INTENT_MULTIPLIERS[intent] || 1.0,
    promptLength,
    promptLengthScore: promptLengthScore * WEIGHTS.promptLength
  };

  // Calculate raw score
  const rawScore = factors.featureScore
    + factors.domainScore
    + factors.technologyScore
    + factors.constraintScore
    + factors.promptLengthScore;

  // Apply intent multiplier
  const finalScore = rawScore * factors.intentMultiplier;
  factors.rawScore = rawScore;
  factors.finalScore = finalScore;

  // Determine plan type from score
  let planType = PlanType.VISION_FULL;
  for (const [type, threshold] of Object.entries(THRESHOLDS)) {
    if (finalScore <= threshold.max) {
      planType = type;
      break;
    }
  }

  // Use complexity scale as a cross-check
  if (complexityInfo?.scale === 'S' && planType !== PlanType.TASK_LIST && planType !== PlanType.PHASE_DEV_PLAN) {
    planType = PlanType.PHASE_DEV_PLAN;
  }

  // Calculate confidence (higher when score is clearly in one bucket)
  const thresholdValues = Object.values(THRESHOLDS).map(t => t.max).filter(v => v !== Infinity);
  let confidence = 0.8; // Default good confidence
  for (const threshold of thresholdValues) {
    const distance = Math.abs(finalScore - threshold);
    if (distance < 3) {
      confidence = 0.6; // Near a boundary = less confident
      break;
    }
  }

  // Generate human-readable reasoning
  const reasoning = generateReasoning(planType, factors, complexityInfo);

  return {
    planType,
    score: Math.round(finalScore * 10) / 10,
    confidence,
    reasoning,
    factors,
    overridden: false
  };
}

/**
 * Generate human-readable reasoning for the decision
 */
function generateReasoning(planType, factors, complexityInfo) {
  const parts = [];

  parts.push(`Score: ${Math.round(factors.finalScore * 10) / 10} → ${planType}`);

  if (factors.featureCount > 0) {
    parts.push(`${factors.featureCount} feature(s) detected`);
  }

  if (factors.domainDiversity > 1) {
    parts.push(`spans ${factors.domainDiversity} domain(s)`);
  }

  if (factors.technologyCount > 0) {
    parts.push(`${factors.technologyCount} technology mention(s)`);
  }

  if (factors.constraintCount > 0) {
    parts.push(`${factors.constraintCount} constraint(s)`);
  }

  if (factors.intentMultiplier !== 1.0) {
    const direction = factors.intentMultiplier > 1.0 ? 'boosted' : 'reduced';
    parts.push(`intent "${factors.intent}" ${direction} score`);
  }

  if (complexityInfo?.scale) {
    parts.push(`complexity: ${complexityInfo.scale}`);
  }

  return parts.join(', ');
}

/**
 * Get a description for a plan type
 * @param {string} planType - Plan type constant
 * @returns {Object} { label, description, artifacts }
 */
export function describePlanType(planType) {
  const descriptions = {
    [PlanType.TASK_LIST]: {
      label: 'Task List',
      description: 'Simple flat task list for focused, small-scope changes',
      artifacts: ['PROGRESS.json (flat tasks)']
    },
    [PlanType.PHASE_DEV_PLAN]: {
      label: 'Phase Dev Plan',
      description: 'Phased development plan for medium-scope, single-domain work',
      artifacts: ['PROGRESS.json (with phases)', 'exploration docs']
    },
    [PlanType.ROADMAP]: {
      label: 'Roadmap',
      description: 'Multi-phase roadmap for large-scope, multi-domain work',
      artifacts: ['ROADMAP.json', 'PROGRESS.json files', 'exploration docs']
    },
    [PlanType.EPIC]: {
      label: 'Epic',
      description: 'Epic with roadmaps for complex, multi-stack projects',
      artifacts: ['EPIC.json', 'ROADMAP.json files', 'PROGRESS.json files', 'GitHub issues']
    },
    [PlanType.VISION_FULL]: {
      label: 'Full Vision',
      description: 'Complete VISION hierarchy for transformative, system-scale work',
      artifacts: ['VISION.json', 'EPIC.json', 'ROADMAP.json files', 'PROGRESS.json files', 'GitHub issues', 'agents']
    }
  };

  return descriptions[planType] || descriptions[PlanType.VISION_FULL];
}

/**
 * Get all available plan types with descriptions
 * @returns {Array} Array of { type, label, description }
 */
export function getAllPlanTypes() {
  return Object.values(PlanType).map(type => ({
    type,
    ...describePlanType(type)
  }));
}

export default {
  PlanType,
  decidePlanType,
  describePlanType,
  getAllPlanTypes
};
