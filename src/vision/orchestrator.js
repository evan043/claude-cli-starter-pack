/**
 * Vision Mode Orchestrator (Phase 7) - Thin Re-Export Wrapper
 *
 * This file re-exports all orchestrator functionality from domain-specific submodules.
 * See src/vision/orchestrators/ for implementations.
 *
 * Architecture:
 *   VISION (L0+) → EPIC (L0) → ROADMAP (L1) → PHASE-DEV (L2) → TASKS (L3)
 *
 * Workflow Stages:
 *   1. INITIALIZATION - Parse prompt, create vision, detect accounts/tools
 *   2. ANALYSIS - Web search, tool discovery, MCP matching
 *   3. ARCHITECTURE - Generate diagrams, API contracts, state design
 *   4. PLANNING - Create Epic → Roadmaps → Phases → Tasks
 *   5. SECURITY - Scan dependencies before installation
 *   6. EXECUTION - Autonomous loop with self-healing
 *   7. VALIDATION - Test verification, MVP completion check
 *   8. COMPLETION - Generate final report, cleanup
 *
 * @module vision/orchestrator
 */

// Lifecycle exports
export {
  OrchestratorStage,
  DEFAULT_CONFIG,
  log,
  transitionStage,
  initialize,
  run,
  resume,
  generateTitleFromPrompt
} from './orchestrators/lifecycle.js';

// Analysis exports
export { analyze } from './orchestrators/analysis.js';

// Architecture exports
export { architect } from './orchestrators/architecture.js';

// Planning exports
export {
  plan,
  analyzeRoadmapBreakdown
} from './orchestrators/planning.js';

// Decision Engine exports
export {
  PlanType,
  decidePlanType,
  describePlanType,
  getAllPlanTypes
} from './decision-engine.js';

// Security exports
export {
  scanSecurity,
  isPackageBlocked
} from './orchestrators/security.js';

// Execution exports
export {
  execute,
  selectAgentForPlan
} from './orchestrators/execution.js';

// Validation exports
export {
  validate,
  complete
} from './orchestrators/validation.js';

// Agent management exports
export {
  createAgents,
  determineRequiredAgents
} from './orchestrators/agents.js';

// Monitoring exports
export {
  observe,
  getStatus,
  checkSessionRestart
} from './orchestrators/monitoring.js';

// Import required for class definition
import {
  DEFAULT_CONFIG,
  OrchestratorStage,
  log,
  transitionStage,
  initialize,
  run,
  resume,
  generateTitleFromPrompt
} from './orchestrators/lifecycle.js';
import { analyze } from './orchestrators/analysis.js';
import { architect } from './orchestrators/architecture.js';
import { plan, analyzeRoadmapBreakdown as planningBreakdown } from './orchestrators/planning.js';
import { scanSecurity, isPackageBlocked } from './orchestrators/security.js';
import { createAgents, determineRequiredAgents as agentsDetermine } from './orchestrators/agents.js';
import { execute, selectAgentForPlan as executionSelectAgent } from './orchestrators/execution.js';
import { validate, complete } from './orchestrators/validation.js';
import { observe, getStatus, checkSessionRestart } from './orchestrators/monitoring.js';

/**
 * Vision Mode Orchestrator
 */
export class VisionOrchestrator {
  /**
   * Create a new orchestrator instance
   * @param {string} projectRoot - Project root directory
   * @param {Object} config - Configuration overrides
   */
  constructor(projectRoot, config = {}) {
    this.projectRoot = projectRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.vision = null;
    this.stage = null;
    this.stageHistory = [];
    this.analysisResults = null;
    this.architectureArtifacts = null;
    this.securityResults = null;
    this.agents = new Map();
    this.logs = [];
  }

  /**
   * Log a message with timestamp
   */
  log(level, message, data = null) {
    return log(this, level, message, data);
  }

  /**
   * Transition to a new stage
   */
  transitionStage(newStage) {
    return transitionStage(this, newStage);
  }

  /**
   * Initialize a new vision from a prompt
   */
  async initialize(prompt, options = {}) {
    return initialize(this, prompt, options);
  }

  /**
   * Run analysis phase
   */
  async analyze() {
    return analyze(this);
  }

  /**
   * Run architecture phase
   */
  async architect() {
    return architect(this);
  }

  /**
   * Run the planning phase - Create Epic, Roadmaps, and Phase-Dev-Plans
   */
  async plan() {
    return plan(this);
  }

  /**
   * Run security scan phase
   */
  async scanSecurity() {
    return scanSecurity(this);
  }

  /**
   * Check if a package should be blocked
   */
  isPackageBlocked(packageName) {
    return isPackageBlocked(this, packageName);
  }

  /**
   * Create specialized agents for the vision
   */
  async createAgents() {
    return createAgents(this);
  }

  /**
   * Run the execution phase with proper agent delegation
   */
  async execute(options = {}) {
    return execute(this, options);
  }

  /**
   * Run validation phase
   */
  async validate() {
    return validate(this);
  }

  /**
   * Complete the vision
   */
  async complete() {
    return complete(this);
  }

  /**
   * Observe progress and detect drift
   */
  observe(update) {
    return observe(this, update);
  }

  /**
   * Run the full orchestration workflow
   */
  async run(prompt, options = {}) {
    return run(this, prompt, options);
  }

  /**
   * Resume from a saved vision
   */
  async resume(visionSlug) {
    return resume(this, visionSlug);
  }

  /**
   * Get current status
   */
  getStatus() {
    return getStatus(this);
  }

  /**
   * Check if session restart is needed for hooks
   */
  checkSessionRestart() {
    return checkSessionRestart(this);
  }

  /**
   * Generate title from prompt
   */
  generateTitleFromPrompt(prompt) {
    return generateTitleFromPrompt(prompt);
  }

  /**
   * Analyze scope and break down into roadmaps
   */
  analyzeRoadmapBreakdown(features, technologies, complexity) {
    return planningBreakdown(this, features, technologies, complexity);
  }

  /**
   * Determine which agents are needed
   */
  determineRequiredAgents(features, technologies) {
    return agentsDetermine(this, features, technologies);
  }

  /**
   * Select the appropriate agent for a phase-dev-plan based on its content
   */
  selectAgentForPlan(progress) {
    return executionSelectAgent(this, progress);
  }
}

/**
 * Create a new orchestrator instance
 * @param {string} projectRoot - Project root directory
 * @param {Object} config - Configuration overrides
 * @returns {VisionOrchestrator} Orchestrator instance
 */
export function createOrchestrator(projectRoot, config = {}) {
  return new VisionOrchestrator(projectRoot, config);
}

/**
 * Quick run - initialize and execute a vision in one call
 * @param {string} projectRoot - Project root directory
 * @param {string} prompt - Natural language prompt
 * @param {Object} options - Options
 * @returns {Promise<Object>} Result
 */
export async function quickRun(projectRoot, prompt, options = {}) {
  const orchestrator = createOrchestrator(projectRoot, options.config);
  return orchestrator.run(prompt, options);
}

export default {
  VisionOrchestrator,
  OrchestratorStage,
  createOrchestrator,
  quickRun,
  DEFAULT_CONFIG
};
