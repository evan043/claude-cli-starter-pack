/**
 * Agent markdown generation
 */
import { createAgentDefinition } from '../schema.js';
import { getAgentContent } from './content-generators.js';

/**
 * Generate agent markdown content from configuration
 * @param {object} config - Agent configuration from AGENT_CONFIGS
 * @param {object} techStack - Tech stack for placeholder replacement
 * @returns {string} Markdown content for agent file
 */
export function generateAgentMarkdown(config, techStack = {}) {
  const agent = createAgentDefinition(config);

  // Build frontmatter
  const frontmatter = [
    '---',
    `name: ${agent.name}`,
    `description: ${agent.description}`,
    `level: ${agent.level}`,
    `domain: ${agent.domain}`,
    agent.framework ? `framework: ${agent.framework}` : null,
    `tools: ${agent.tools.join(', ')}`,
    `model: ${agent.model}`,
    agent.maxTokens ? `maxTokens: ${agent.maxTokens}` : null,
    '---',
  ].filter(Boolean).join('\n');

  // Get framework-specific content
  const content = getAgentContent(agent, techStack);

  return `${frontmatter}\n\n${content}`;
}
