/**
 * Template Engine
 *
 * Handles placeholder replacement in .claude files using tech-stack.json values.
 * Supports:
 * - Nested property access: {{frontend.port}}, {{deployment.backend.platform}}
 * - Conditional blocks: {{#if condition}}...{{/if}}
 * - Equality checks: {{#if (eq path "value")}}...{{/if}}
 * - Else blocks: {{#if condition}}...{{else}}...{{/if}}
 * - Each loops: {{#each array}}{{this}}{{/each}}
 * - Path variables: ${CWD}, ${HOME}
 *
 * This file serves as a thin re-export wrapper for organized submodules.
 */

// Context building and variable resolution
export {
  loadAgentContext,
  findBestAgent,
  mergeAgentContext,
  getNestedValue,
  flattenObject,
} from './template-engine/context.js';

// Template processing, placeholder replacement, conditionals
export {
  evaluateCondition,
  processEachBlocks,
  processConditionalBlocks,
  processPathVariables,
  replacePlaceholders,
  extractPlaceholders,
  validateTechStack,
} from './template-engine/processor.js';

// File reading/writing for templates
export { processFile, processDirectory } from './template-engine/file-ops.js';

// Tech stack related utilities
export { generateTechStack } from './template-engine/tech-stack.js';

// Default export for backward compatibility
import {
  loadAgentContext,
  findBestAgent,
  mergeAgentContext,
  flattenObject,
} from './template-engine/context.js';
import {
  evaluateCondition,
  processEachBlocks,
  processConditionalBlocks,
  processPathVariables,
  replacePlaceholders,
  extractPlaceholders,
  validateTechStack,
} from './template-engine/processor.js';
import { processFile, processDirectory } from './template-engine/file-ops.js';
import { generateTechStack } from './template-engine/tech-stack.js';

export default {
  replacePlaceholders,
  processFile,
  processDirectory,
  generateTechStack,
  flattenObject,
  extractPlaceholders,
  validateTechStack,
  evaluateCondition,
  processConditionalBlocks,
  processEachBlocks,
  processPathVariables,
  loadAgentContext,
  findBestAgent,
  mergeAgentContext,
};
