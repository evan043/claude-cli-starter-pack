/**
 * TestingScout Agent
 *
 * Discovers and recommends testing tools based on tech stack.
 * Part of Phase 6: Testing Framework (Issue #31)
 *
 * This file is a thin re-export wrapper.
 * Implementation is decomposed into submodules under testing-scout/
 */

// Import from submodules
import {
  TESTING_TOOLS,
  FRAMEWORK_RECOMMENDATIONS,
  CONFIG_TEMPLATES,
} from './testing-scout/data.js';

import {
  getInventoryPath,
  loadInventory,
  saveToInventory,
} from './testing-scout/inventory.js';

import {
  classifyTechStack,
  getRecommendations,
  generateRecommendationTable,
  generateConfigFile,
  createScoutPrompt,
} from './testing-scout/recommendations.js';

// Re-export all named exports
export {
  TESTING_TOOLS,
  FRAMEWORK_RECOMMENDATIONS,
  CONFIG_TEMPLATES,
  getInventoryPath,
  loadInventory,
  saveToInventory,
  classifyTechStack,
  getRecommendations,
  generateRecommendationTable,
  generateConfigFile,
  createScoutPrompt,
};

// Default export for backwards compatibility
export default {
  TESTING_TOOLS,
  FRAMEWORK_RECOMMENDATIONS,
  CONFIG_TEMPLATES,
  classifyTechStack,
  getRecommendations,
  generateRecommendationTable,
  generateConfigFile,
  createScoutPrompt,
  loadInventory,
  saveToInventory,
  getInventoryPath,
};
