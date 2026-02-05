/**
 * Vision Module - Main Exports
 *
 * Vision Mode is an autonomous feature development framework that transforms
 * a simple user prompt into a complete, working MVP through intelligent planning,
 * parallel agent orchestration, and self-correcting execution loops.
 *
 * Architecture:
 *   VISION (L0+) → EPIC (L0) → ROADMAP (L1) → PHASE-DEV (L2) → TASKS (L3)
 *
 * Key Capabilities:
 * - Natural language prompt parsing
 * - Web search for inspiration and tools
 * - ASCII UI wireframe generation
 * - Mermaid architecture diagrams
 * - Hook-based observation and drift detection
 * - Dynamic agent creation
 * - Security scanning before installations
 * - Autonomous MVP iteration until 100% working
 *
 * Phase 7: Vision Mode Orchestrator integrates all subsystems into unified workflow.
 */

// Schema and Types
export {
  VisionStatus,
  VisionIntent,
  DriftSeverity,
  VISION_SCHEMA,
  createVision,
  generateSlug,
  validateVision,
  updateVisionStatus,
  calculateVisionCompletion,
  recordDriftEvent,
  updateAlignment,
  recordSecurityScan,
  addCreatedAgent,
  updateRoadmapProgress
} from './schema.js';

// State Management
export {
  getVisionDir,
  getVisionPath,
  ensureVisionDir,
  loadVision,
  saveVision,
  createAndSaveVision,
  listVisions,
  updateVision,
  deleteVision,
  transitionVisionStatus,
  getVisionStatus,
  createVisionCheckpoint,
  restoreVisionCheckpoint,
  listVisionCheckpoints
} from './state-manager.js';

// Prompt Parsing
export {
  detectIntent,
  extractFeatures,
  extractConstraints,
  extractQualityAttributes,
  extractTechnologies,
  parseVisionPrompt,
  estimateComplexity,
  generatePromptSummary,
  getDomainDistribution
} from './parser.js';

// Agent Factory
export {
  createSpecializedAgent,
  generateAgentTemplate,
  updateExistingAgent,
  registerAgent,
  allocateAgentContext,
  getAgentForDomain,
  decommissionAgent,
  listAgents,
  createAgentRegistry,
  DOMAIN_PATTERNS
} from './agent-factory.js';

// Observer (drift detection)
export {
  observeProgress,
  calculateAlignment,
  detectDrift,
  identifyDriftAreas,
  generateAdjustments,
  shouldTriggerReplan,
  formatDriftReport
} from './observer.js';

// Orchestrator (Phase 7)
export {
  VisionOrchestrator,
  OrchestratorStage,
  createOrchestrator,
  quickRun
} from './orchestrator.js';

// Re-export default objects for convenience
import schema from './schema.js';
import stateManager from './state-manager.js';
import parser from './parser.js';
import agentFactory from './agent-factory.js';
import observer from './observer.js';
import orchestrator from './orchestrator.js';

export { schema, stateManager, parser, agentFactory, observer, orchestrator };

/**
 * Initialize a new Vision from a prompt (convenience wrapper)
 *
 * For full orchestration, use createOrchestrator() or quickRun() instead.
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} prompt - Natural language prompt
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result with created vision
 */
export async function initializeVision(projectRoot, prompt, options = {}) {
  const { parseVisionPrompt, estimateComplexity } = parser;
  const { createAndSaveVision } = stateManager;

  // Parse the prompt
  const parsedPrompt = parseVisionPrompt(prompt);
  const complexity = estimateComplexity(parsedPrompt);

  // Generate title from prompt if not provided
  const title = options.title || generateTitleFromPrompt(prompt);

  // Create vision with parsed prompt
  const visionOptions = {
    title,
    prompt,
    tags: options.tags || [],
    priority: options.priority || 'medium'
  };

  const result = await createAndSaveVision(projectRoot, visionOptions);

  if (result.success) {
    // Update vision with parsed prompt data
    const { updateVision } = stateManager;
    await updateVision(projectRoot, result.vision.slug, (vision) => {
      vision.prompt = parsedPrompt;
      vision.metadata.estimated_complexity = complexity;
      return vision;
    });
  }

  return result;
}

/**
 * Generate a title from prompt
 * @param {string} prompt - User prompt
 * @returns {string} Generated title
 */
function generateTitleFromPrompt(prompt) {
  // Extract first sentence or first 50 chars
  const firstSentence = prompt.split(/[.!?]/)[0]?.trim();

  if (firstSentence && firstSentence.length <= 60) {
    return firstSentence;
  }

  // Truncate and add ellipsis
  const truncated = prompt.substring(0, 50).trim();
  return truncated + (prompt.length > 50 ? '...' : '');
}

/**
 * Get a quick status summary for a vision
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 * @returns {string} Formatted status string
 */
export function getQuickStatus(projectRoot, visionSlug) {
  const status = stateManager.getVisionStatus(projectRoot, visionSlug);

  if (!status) {
    return `Vision not found: ${visionSlug}`;
  }

  const progressBar = generateProgressBar(status.completion_percentage);

  return `
${status.title}
Status: ${status.status} | ${progressBar} ${status.completion_percentage}%
Roadmaps: ${status.roadmaps.completed}/${status.roadmaps.total} complete
Alignment: ${Math.round(status.observer.current_alignment * 100)}%
Drift Events: ${status.observer.drift_events} | Adjustments: ${status.observer.adjustments}
`.trim();
}

/**
 * Generate ASCII progress bar
 * @param {number} percentage - Completion percentage
 * @returns {string} Progress bar string
 */
function generateProgressBar(percentage) {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export default {
  // Core functions
  initializeVision,
  getQuickStatus,

  // Orchestrator (Phase 7 - recommended entry point)
  createOrchestrator: orchestrator.createOrchestrator,
  quickRun: orchestrator.quickRun,
  VisionOrchestrator: orchestrator.VisionOrchestrator,
  OrchestratorStage: orchestrator.OrchestratorStage,

  // Modules
  schema,
  stateManager,
  parser,
  agentFactory,
  observer,
  orchestrator
};
