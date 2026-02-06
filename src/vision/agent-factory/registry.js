/**
 * Vision Mode Agent Factory - Registry Management
 *
 * Agent registration, context allocation, and domain-based agent lookup.
 * Integrates with Vision Mode state management.
 */

import fs from 'fs';
import path from 'path';
import { addCreatedAgent } from '../schema.js';
import { updateVision } from '../state-manager.js';
import { DOMAIN_PATTERNS } from './templates.js';

/**
 * Register agent with a vision
 * @param {string} agentName - Agent name
 * @param {string} visionSlug - Vision slug
 * @param {string} projectRoot - Project root directory
 * @param {string} domain - Agent domain
 * @returns {Object} Result { success: boolean, error?: string }
 */
export async function registerAgent(agentName, visionSlug, projectRoot, domain = 'general') {
  try {
    const result = await updateVision(projectRoot, visionSlug, (vision) => {
      addCreatedAgent(vision, {
        name: agentName,
        domain
      });
      return vision;
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      vision: result.vision
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Allocate token budget to an agent
 * @param {Object} agent - Agent details { name, domain }
 * @param {number} tokenBudget - Total token budget
 * @param {string} level - Agent level (L1, L2, L3)
 * @returns {Object} Allocation { allocated: number, remaining: number }
 */
export function allocateAgentContext(agent, tokenBudget, level = 'L2') {
  const allocations = {
    L1: 0.5, // Orchestrators get 50% of budget
    L2: 0.3, // Specialists get 30%
    L3: 0.1  // Workers get 10%
  };

  const percentage = allocations[level] || 0.3;
  const allocated = Math.floor(tokenBudget * percentage);
  const remaining = tokenBudget - allocated;

  return {
    allocated,
    remaining,
    percentage: percentage * 100,
    level
  };
}

/**
 * Find best agent for a domain
 * @param {string} domain - Domain to search for
 * @param {string} projectRoot - Project root directory
 * @returns {string|null} Agent name or null if not found
 */
export function getAgentForDomain(domain, projectRoot) {
  try {
    const agentsDir = path.join(projectRoot, '.claude', 'agents');

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
}
