/**
 * Testing Configuration Validation
 *
 * Validators and prerequisite checks.
 */

import { getCredentials } from './credentials.js';

/**
 * Validate testing configuration (works with tech-stack.json structure)
 */
export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config.environment?.baseUrl) {
    errors.push('Base URL is required');
  }

  if (config.credentials?.source === 'env') {
    const creds = getCredentials(config);
    const usernameVar = config.credentials.usernameEnvVar || config.credentials.envVars?.username;
    const passwordVar = config.credentials.passwordEnvVar || config.credentials.envVars?.password;

    if (!creds?.username || !creds?.password) {
      warnings.push(
        `Environment variables not set: ${usernameVar}, ${passwordVar}`
      );
    }
  }

  if (config.mode === 'ralph' && !config.ralphConfig) {
    errors.push('Ralph configuration missing');
  }

  if (config.e2e?.framework === 'none') {
    warnings.push('No E2E testing framework configured');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
