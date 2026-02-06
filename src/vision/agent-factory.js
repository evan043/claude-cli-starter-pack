/**
 * Vision Mode Agent Factory
 * Thin re-export wrapper for organized submodules.
 *
 * Architecture:
 * - templates.js: Pure functions for agent template generation (no I/O)
 * - lifecycle.js: Agent CRUD operations (create, update, decommission, list)
 * - registry.js: Agent registration and domain lookup
 */

import { DOMAIN_PATTERNS, generateAgentTemplate } from './agent-factory/templates.js';
import { createSpecializedAgent, updateExistingAgent, decommissionAgent, listAgents, createAgentRegistry } from './agent-factory/lifecycle.js';
import { registerAgent, allocateAgentContext, getAgentForDomain } from './agent-factory/registry.js';

// Named exports
export {
  DOMAIN_PATTERNS,
  generateAgentTemplate,
  createSpecializedAgent,
  updateExistingAgent,
  registerAgent,
  allocateAgentContext,
  getAgentForDomain,
  decommissionAgent,
  listAgents,
  createAgentRegistry
};

// Default export (object with all functions)
export default {
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
};
