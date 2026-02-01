/**
 * Integration Adapters Index
 *
 * Exports all adapters and provides factory functions for creating them.
 */

import { AdapterRegistry } from './adapter-interface.js';
import { GitHubAdapter, createGitHubAdapter } from './github-adapter.js';
import { JiraAdapter, createJiraAdapter } from './jira-adapter.js';
import { LinearAdapter, createLinearAdapter } from './linear-adapter.js';
import { ClickUpAdapter, createClickUpAdapter } from './clickup-adapter.js';

// Re-export everything
export * from './adapter-interface.js';
export * from './github-adapter.js';
export * from './jira-adapter.js';
export * from './linear-adapter.js';
export * from './clickup-adapter.js';

/**
 * Create and configure all adapters from integration config
 * @param {Object} config - Integration configuration from .claude/integrations/config.json
 * @returns {AdapterRegistry}
 */
export function createAdapterRegistry(config = {}) {
  const registry = new AdapterRegistry();

  // Always register GitHub adapter (default)
  registry.register('github', createGitHubAdapter(config.github || {}));

  // Register optional adapters if configured
  if (config.jira?.enabled) {
    registry.register('jira', createJiraAdapter(config.jira));
  }

  if (config.linear?.enabled) {
    registry.register('linear', createLinearAdapter(config.linear));
  }

  if (config.clickup?.enabled) {
    registry.register('clickup', createClickUpAdapter(config.clickup));
  }

  return registry;
}

/**
 * Get adapter by name with config
 * @param {string} name - Adapter name (github, jira, linear, clickup)
 * @param {Object} config - Adapter-specific config
 * @returns {IntegrationAdapter|null}
 */
export function getAdapter(name, config = {}) {
  switch (name) {
    case 'github':
      return createGitHubAdapter(config);
    case 'jira':
      return createJiraAdapter(config);
    case 'linear':
      return createLinearAdapter(config);
    case 'clickup':
      return createClickUpAdapter(config);
    default:
      return null;
  }
}

/**
 * List of supported integrations
 */
export const SUPPORTED_INTEGRATIONS = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub Issues and Projects (uses gh CLI)',
    requiresApiKey: false,
    configFields: ['owner', 'repo', 'project_number'],
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Atlassian Jira (REST API)',
    requiresApiKey: true,
    configFields: ['base_url', 'project_key', 'email', 'api_token'],
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Linear (GraphQL API)',
    requiresApiKey: true,
    configFields: ['team_key', 'api_key'],
  },
  {
    id: 'clickup',
    name: 'ClickUp',
    description: 'ClickUp (REST API)',
    requiresApiKey: true,
    configFields: ['workspace_id', 'space_id', 'api_key'],
  },
];

/**
 * Get integration info by ID
 * @param {string} id
 * @returns {Object|null}
 */
export function getIntegrationInfo(id) {
  return SUPPORTED_INTEGRATIONS.find(i => i.id === id) || null;
}

/**
 * Validate integration configuration
 * @param {string} integrationId
 * @param {Object} config
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateIntegrationConfig(integrationId, config) {
  const errors = [];
  const warnings = [];

  const info = getIntegrationInfo(integrationId);
  if (!info) {
    errors.push(`Unknown integration: ${integrationId}`);
    return { valid: false, errors, warnings };
  }

  // Check required fields
  for (const field of info.configFields) {
    if (info.requiresApiKey && field.includes('api') && !config[field]) {
      warnings.push(`${integrationId}: ${field} not configured`);
    } else if (!field.includes('api') && !config[field]) {
      // Non-API fields are required
      if (['owner', 'repo', 'base_url', 'project_key', 'team_key', 'workspace_id', 'space_id'].includes(field)) {
        errors.push(`${integrationId}: ${field} is required`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
