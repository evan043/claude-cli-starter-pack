/**
 * Phased Development Templates
 *
 * Generic template generators for phased development plans.
 * Works with ANY tech stack - no hardcoded assumptions.
 *
 * Re-exports from focused submodules:
 * - scale-definitions.json / phase-templates.json (static data)
 * - progress-generator.js (PROGRESS.json generation)
 * - doc-generators.js (markdown documentation)
 * - agent-generators.js (agents, commands, tests, hooks)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Static data from JSON
export const SCALE_DEFINITIONS = require('./scale-definitions.json');
const phaseTemplates = require('./phase-templates.json');
export const SMALL_PHASE_TEMPLATES = phaseTemplates.small;
export const MEDIUM_PHASE_TEMPLATES = phaseTemplates.medium;
export const LARGE_PHASE_TEMPLATES = phaseTemplates.large;

// Progress generator
export { generateProgressJson } from './progress-generator.js';

// Documentation generators
export {
  generateExecutiveSummary,
  generateMiddlewareSpec,
  generateApiEndpoints,
  generateDatabaseSchema,
  generateDeploymentConfig,
} from './doc-generators.js';

// Agent and command generators
export {
  generatePhaseExecutorAgent,
  generatePhaseDevCommand,
  generateTestDefinitions,
  generatePhaseDevEnforcerHook,
} from './agent-generators.js';
