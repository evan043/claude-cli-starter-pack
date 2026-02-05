/**
 * Tech Stack Configuration
 *
 * Configure and auto-detect project tech stack including frontend,
 * backend, testing, deployment, and dev environment settings.
 *
 * This is a thin re-export wrapper. Implementation is in submodules.
 */

export { loadTechStack, saveTechStack } from './tech-stack-config/persistence.js';
export { configureTechStackSettings } from './tech-stack-config/handlers.js';
export { applyTechStackTemplates } from './tech-stack-config/applicator.js';
