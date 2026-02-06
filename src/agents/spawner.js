/**
 * Agent Spawner Utility
 *
 * Thin re-export wrapper for agent spawner submodules.
 *
 * Provides functions for spawning L2 specialists and L3 workers
 * from the L1 orchestrator.
 */

import {
  AGENT_CONFIGS as _AGENT_CONFIGS,
  DOMAIN_KEYWORDS as _DOMAIN_KEYWORDS,
  PROJECT_L2_AGENT_TYPES as _PROJECT_L2_AGENT_TYPES,
  detectTaskDomain as _detectTaskDomain,
} from './spawner/config.js';

import {
  generateL2Config as _generateL2Config,
  parseCompletionReport as _parseCompletionReport,
  generateProjectL2Config as _generateProjectL2Config,
  parseProjectL2Report as _parseProjectL2Report,
} from './spawner/l2-spawner.js';

import { generateL3Config as _generateL3Config } from './spawner/l3-spawner.js';

import {
  updateAgentInState as _updateAgentInState,
  addAgentToState as _addAgentToState,
  initializeOrchestratorState as _initializeOrchestratorState,
  loadOrchestratorState as _loadOrchestratorState,
  createCheckpoint as _createCheckpoint,
} from './spawner/state.js';

// Named re-exports
export {
  _AGENT_CONFIGS as AGENT_CONFIGS,
  _DOMAIN_KEYWORDS as DOMAIN_KEYWORDS,
  _PROJECT_L2_AGENT_TYPES as PROJECT_L2_AGENT_TYPES,
  _detectTaskDomain as detectTaskDomain,
  _generateL2Config as generateL2Config,
  _parseCompletionReport as parseCompletionReport,
  _generateProjectL2Config as generateProjectL2Config,
  _parseProjectL2Report as parseProjectL2Report,
  _generateL3Config as generateL3Config,
  _updateAgentInState as updateAgentInState,
  _addAgentToState as addAgentToState,
  _initializeOrchestratorState as initializeOrchestratorState,
  _loadOrchestratorState as loadOrchestratorState,
  _createCheckpoint as createCheckpoint,
};

// Default export for backward compatibility
export default {
  detectTaskDomain: _detectTaskDomain,
  generateL2Config: _generateL2Config,
  generateL3Config: _generateL3Config,
  parseCompletionReport: _parseCompletionReport,
  updateAgentInState: _updateAgentInState,
  addAgentToState: _addAgentToState,
  initializeOrchestratorState: _initializeOrchestratorState,
  loadOrchestratorState: _loadOrchestratorState,
  createCheckpoint: _createCheckpoint,
  generateProjectL2Config: _generateProjectL2Config,
  parseProjectL2Report: _parseProjectL2Report,
  AGENT_CONFIGS: _AGENT_CONFIGS,
  DOMAIN_KEYWORDS: _DOMAIN_KEYWORDS,
  PROJECT_L2_AGENT_TYPES: _PROJECT_L2_AGENT_TYPES,
};
