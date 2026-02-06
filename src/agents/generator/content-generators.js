/**
 * Domain-specific agent content generators
 *
 * Thin re-export wrapper for organized submodules.
 */

import {
  getFrontendAgentContent,
  getStateAgentContent,
} from './content/ui-generators.js';

import {
  getBackendAgentContent,
  getDatabaseAgentContent,
  getDeploymentAgentContent,
} from './content/backend-generators.js';

import {
  getTestingAgentContent,
  getGeneralAgentContent,
} from './content/testing-generators.js';

/**
 * Get agent-specific markdown content
 * @param {object} agent - Agent definition
 * @param {object} techStack - Tech stack for context
 * @returns {string} Markdown content body
 */
export function getAgentContent(agent, techStack) {
  const templates = {
    frontend: getFrontendAgentContent,
    backend: getBackendAgentContent,
    state: getStateAgentContent,
    database: getDatabaseAgentContent,
    testing: getTestingAgentContent,
    deployment: getDeploymentAgentContent,
    general: getGeneralAgentContent,
  };

  const generator = templates[agent.domain] || templates.general;
  return generator(agent, techStack);
}
