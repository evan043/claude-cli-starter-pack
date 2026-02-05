/**
 * Phased Development Templates
 *
 * Generic template generators for phased development plans.
 * Works with ANY tech stack - no hardcoded assumptions.
 *
 * This file re-exports from phase-dev-templates/ submodules for backwards compatibility.
 */

export {
  SCALE_DEFINITIONS,
  SMALL_PHASE_TEMPLATES,
  MEDIUM_PHASE_TEMPLATES,
  LARGE_PHASE_TEMPLATES,
  generateProgressJson,
  generateExecutiveSummary,
  generateMiddlewareSpec,
  generateApiEndpoints,
  generateDatabaseSchema,
  generateDeploymentConfig,
  generatePhaseExecutorAgent,
  generatePhaseDevCommand,
  generateTestDefinitions,
  generatePhaseDevEnforcerHook,
} from './phase-dev-templates/index.js';
