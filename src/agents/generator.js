/**
 * Agent Template Generator
 *
 * Re-exports from focused submodules under src/agents/generator/
 */

// Path utilities
export { getTemplatesPath, getAgentsPath } from './generator/paths.js';

// Markdown generation
export { generateAgentMarkdown } from './generator/markdown.js';

// File operations
export {
  writeAgentFile,
  generateAgentsForStack,
  listGeneratedAgents,
  deleteGeneratedAgent,
} from './generator/file-operations.js';

// Content generators (internal, re-exported for testing)
export { getAgentContent } from './generator/content-generators.js';
