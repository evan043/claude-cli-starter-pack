/**
 * Vision Mode Agent Factory - Lifecycle Management
 *
 * Agent creation, updates, decommissioning, and registry management.
 * Handles file I/O for agent definitions.
 */

import fs from 'fs';
import path from 'path';
import { generateAgentTemplate, generateAgentName, DOMAIN_PATTERNS } from './templates.js';

/**
 * Create a specialized agent from configuration
 * @param {Object} config - Agent configuration
 * @param {string} config.domain - Domain (frontend, backend, etc.)
 * @param {Array<string>} config.techStack - Technologies used
 * @param {Array<string>} config.capabilities - Agent capabilities
 * @param {string} config.name - Agent name (optional, auto-generated if not provided)
 * @param {string} config.projectRoot - Project root directory
 * @returns {Object} Result { success: boolean, agentPath?: string, agentName?: string, error?: string }
 */
export function createSpecializedAgent(config) {
  const {
    domain,
    techStack = [],
    capabilities = [],
    name = null,
    projectRoot = process.cwd()
  } = config;

  try {
    // Generate agent name if not provided
    const agentName = name || generateAgentName(domain, techStack);
    const agentSlug = agentName.toLowerCase().replace(/\s+/g, '-');

    // Create agent directory
    const agentsDir = path.join(projectRoot, '.claude', 'agents');
    if (!fs.existsSync(agentsDir)) {
      fs.mkdirSync(agentsDir, { recursive: true });
    }

    const agentPath = path.join(agentsDir, `${agentSlug}.md`);

    // Check if agent already exists
    if (fs.existsSync(agentPath)) {
      return {
        success: false,
        error: `Agent already exists: ${agentPath}`,
        agentPath,
        agentName
      };
    }

    // Generate agent template
    const template = generateAgentTemplate(domain, techStack, {
      name: agentName,
      capabilities
    });

    // Write agent file
    fs.writeFileSync(agentPath, template, 'utf8');

    return {
      success: true,
      agentPath,
      agentName,
      agentSlug,
      domain
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update an existing agent with new capabilities
 * @param {string} agentPath - Path to agent file
 * @param {Array<string>} newCapabilities - New capabilities to add
 * @returns {Object} Result { success: boolean, error?: string }
 */
export function updateExistingAgent(agentPath, newCapabilities) {
  try {
    if (!fs.existsSync(agentPath)) {
      return {
        success: false,
        error: `Agent not found: ${agentPath}`
      };
    }

    const content = fs.readFileSync(agentPath, 'utf8');

    // Find capabilities section
    const capabilitiesMatch = content.match(/## Capabilities\n\n([\s\S]*?)\n\n##/);

    if (!capabilitiesMatch) {
      return {
        success: false,
        error: 'Could not find Capabilities section in agent file'
      };
    }

    const existingCapabilities = capabilitiesMatch[1];
    const newCapabilitiesText = newCapabilities
      .filter(cap => !existingCapabilities.includes(cap))
      .map(cap => `- ${cap}`)
      .join('\n');

    if (newCapabilitiesText.length === 0) {
      return {
        success: true,
        message: 'No new capabilities to add'
      };
    }

    const updatedContent = content.replace(
      /## Capabilities\n\n([\s\S]*?)\n\n##/,
      `## Capabilities\n\n$1\n${newCapabilitiesText}\n\n##`
    );

    fs.writeFileSync(agentPath, updatedContent, 'utf8');

    return {
      success: true,
      addedCapabilities: newCapabilities.filter(cap => !existingCapabilities.includes(cap))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Decommission an agent
 * @param {string} agentName - Agent name to remove
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Result { success: boolean, archived?: string, error?: string }
 */
export function decommissionAgent(agentName, projectRoot) {
  try {
    const agentSlug = agentName.toLowerCase().replace(/\s+/g, '-');
    const agentPath = path.join(projectRoot, '.claude', 'agents', `${agentSlug}.md`);

    if (!fs.existsSync(agentPath)) {
      return {
        success: false,
        error: `Agent not found: ${agentName}`
      };
    }

    // Create archive directory
    const archiveDir = path.join(projectRoot, '.claude', 'agents', 'archived');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Archive the agent with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(archiveDir, `${agentSlug}-${timestamp}.md`);

    // Copy to archive
    const content = fs.readFileSync(agentPath, 'utf8');
    fs.writeFileSync(archivePath, content, 'utf8');

    // Remove original
    fs.unlinkSync(agentPath);

    return {
      success: true,
      archived: archivePath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List all agents in project
 * @param {string} projectRoot - Project root directory
 * @returns {Array<Object>} Agent list
 */
export function listAgents(projectRoot) {
  try {
    const agentsDir = path.join(projectRoot, '.claude', 'agents');

    if (!fs.existsSync(agentsDir)) {
      return [];
    }

    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    const agents = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const nameMatch = frontmatter.match(/name: (.+)/);
        const domainMatch = frontmatter.match(/domain: (.+)/);
        const levelMatch = frontmatter.match(/level: (.+)/);

        agents.push({
          name: nameMatch ? nameMatch[1].trim() : file.replace('.md', ''),
          domain: domainMatch ? domainMatch[1].trim() : 'unknown',
          level: levelMatch ? levelMatch[1].trim() : 'L2',
          file
        });
      }
    }

    return agents;
  } catch (error) {
    console.error('Error listing agents:', error.message);
    return [];
  }
}

/**
 * Create agent registry for a project
 * @param {string} projectRoot - Project root directory
 * @param {Object} techStack - Tech stack configuration
 * @returns {Object} Agent registry
 */
export function createAgentRegistry(projectRoot, techStack) {
  const agents = [];
  const domains = ['frontend', 'backend', 'database', 'testing', 'deployment', 'state'];

  // Import getAgentForDomain dynamically to avoid circular dependency
  // We'll just inline the logic here since it's only used in this function
  const agentsDir = path.join(projectRoot, '.claude', 'agents');
  const getAgentForDomain = (domain) => {
    try {
      if (!fs.existsSync(agentsDir)) {
        return null;
      }

      const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

      // Look for domain-specific agent
      const domainPattern = DOMAIN_PATTERNS[domain];
      if (!domainPattern) {
        return null;
      }

      for (const file of files) {
        const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];

          // Check if domain matches
          if (frontmatter.includes(`domain: ${domain}`)) {
            const nameMatch = frontmatter.match(/name: (.+)/);
            if (nameMatch) {
              return nameMatch[1].trim();
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`Error finding agent for domain ${domain}:`, error.message);
      return null;
    }
  };

  for (const domain of domains) {
    const domainTech = techStack[domain];
    if (domainTech) {
      const techArray = Array.isArray(domainTech) ? domainTech : [domainTech];
      const agentName = getAgentForDomain(domain);

      if (agentName) {
        agents.push({
          name: agentName,
          domain,
          techStack: techArray,
          available: true
        });
      }
    }
  }

  return {
    agents,
    count: agents.length,
    created: new Date().toISOString()
  };
}
