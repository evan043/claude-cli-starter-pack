/**
 * Agent file operations (write, generate, list, delete)
 */
import { existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { getDefaultAgentsForStack } from '../stack-mapping.js';
import { createAgentDefinition } from '../schema.js';
import { saveAgentRegistry, createRegistryFromTechStack } from '../registry.js';
import { generateAgentMarkdown } from './markdown.js';
import { getAgentsPath } from './paths.js';

/**
 * Write agent markdown file to disk
 * @param {object} agent - Agent configuration
 * @param {string} projectRoot - Project root directory
 * @param {object} techStack - Tech stack for placeholder replacement
 * @returns {string} Path to written file
 */
export function writeAgentFile(agent, projectRoot, techStack = {}) {
  const agentsDir = getAgentsPath(projectRoot);

  // Ensure directory exists
  if (!existsSync(agentsDir)) {
    mkdirSync(agentsDir, { recursive: true });
  }

  const markdown = generateAgentMarkdown(agent, techStack);
  const filePath = join(agentsDir, `${agent.name}.md`);

  writeFileSync(filePath, markdown, 'utf8');
  return filePath;
}

/**
 * Generate all agents for a tech stack
 * @param {object} techStack - Detected tech stack
 * @param {string} projectRoot - Project root directory
 * @param {object} options - Generation options
 * @returns {object} Generation result with created files
 */
export function generateAgentsForStack(techStack, projectRoot = process.cwd(), options = {}) {
  const { overwrite = false, domains = null } = options;

  const result = {
    created: [],
    skipped: [],
    errors: [],
  };

  // Get agents for this tech stack
  const agents = getDefaultAgentsForStack(techStack);

  // Filter by domain if specified
  const filteredAgents = domains
    ? agents.filter((a) => domains.includes(a.domain))
    : agents;

  // Always include general-purpose agent
  const hasGeneral = filteredAgents.some((a) => a.name === 'general-purpose');
  if (!hasGeneral) {
    filteredAgents.push(createAgentDefinition({
      name: 'general-purpose',
      level: 'L2',
      domain: 'general',
      tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob', 'WebSearch'],
      model: 'sonnet',
      description: 'General-purpose implementation agent',
    }));
  }

  // Generate each agent
  for (const agent of filteredAgents) {
    try {
      const agentsDir = getAgentsPath(projectRoot);
      const filePath = join(agentsDir, `${agent.name}.md`);

      // Check if exists
      if (existsSync(filePath) && !overwrite) {
        result.skipped.push({ name: agent.name, path: filePath, reason: 'exists' });
        continue;
      }

      // Write agent file
      const createdPath = writeAgentFile(agent, projectRoot, techStack);
      result.created.push({ name: agent.name, path: createdPath, domain: agent.domain });
    } catch (err) {
      result.errors.push({ name: agent.name, error: err.message });
    }
  }

  // Create/update registry
  try {
    const registry = createRegistryFromTechStack(techStack);
    registry.agents = filteredAgents;
    saveAgentRegistry(registry, projectRoot);
    result.registryPath = join(projectRoot, '.claude', 'config', 'agents.json');
  } catch (err) {
    result.errors.push({ name: 'registry', error: err.message });
  }

  return result;
}

/**
 * List all generated agents in a project
 * @param {string} projectRoot - Project root directory
 * @returns {Array} List of agent files
 */
export function listGeneratedAgents(projectRoot = process.cwd()) {
  const agentsDir = getAgentsPath(projectRoot);

  if (!existsSync(agentsDir)) {
    return [];
  }

  const files = readdirSync(agentsDir);
  return files
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({
      name: basename(f, '.md'),
      path: join(agentsDir, f),
    }));
}

/**
 * Delete a generated agent
 * @param {string} agentName - Name of agent to delete
 * @param {string} projectRoot - Project root directory
 * @returns {boolean} Whether deletion was successful
 */
export function deleteGeneratedAgent(agentName, projectRoot = process.cwd()) {
  const agentsDir = getAgentsPath(projectRoot);
  const filePath = join(agentsDir, `${agentName}.md`);

  if (!existsSync(filePath)) {
    return false;
  }

  unlinkSync(filePath);
  return true;
}
