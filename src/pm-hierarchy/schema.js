/**
 * Project Management Hierarchy Schema
 *
 * Thin re-export wrapper for decomposed schema modules.
 */

// Schema definitions
export {
  VISION_SCHEMA,
  EPIC_SCHEMA,
  ROADMAP_SCHEMA,
  PHASE_SCHEMA,
  TASK_SCHEMA,
  COMPLETION_TRACKING_SCHEMA,
  INTEGRATION_CONFIG_SCHEMA,
  DEFAULTS,
} from './schema/definitions.js';

// Validators
export {
  validateEpic,
  validateVision,
  validateIntegrationConfig,
} from './schema/validators.js';

// Factories
export {
  createEmptyEpic,
  createEmptyVision,
  createEmptyCompletionTracking,
  createEmptyIntegrationConfig,
} from './schema/factories.js';
