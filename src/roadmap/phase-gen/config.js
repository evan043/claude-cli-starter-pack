/**
 * Phase Generator Configuration
 *
 * Testing configuration utilities and constants for phase generation.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Default phase-plans directory
 * NOTE: This is the legacy location. New roadmaps store phase plans in .claude/roadmaps/{slug}/
 */
export const PHASE_PLANS_DIR = '.claude/phase-plans';

/**
 * Load tech-stack.json to get testing and tunnel configuration
 */
export function loadTechStack(cwd = process.cwd()) {
  const paths = [
    join(cwd, '.claude', 'config', 'tech-stack.json'),
    join(cwd, '.claude', 'tech-stack.json'),
    join(cwd, 'tech-stack.json'),
  ];

  for (const techStackPath of paths) {
    if (existsSync(techStackPath)) {
      try {
        return JSON.parse(readFileSync(techStackPath, 'utf8'));
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Get testing environment URL - prefers tunnel URL over localhost
 */
export function getTestingBaseUrl(techStack, options = {}) {
  // If explicitly provided in options, use that
  if (options.baseUrl) {
    return options.baseUrl;
  }

  // Check for configured tunnel URL first (preferred for E2E testing)
  const tunnel = techStack?.devEnvironment?.tunnel;
  if (tunnel && tunnel.service !== 'none' && tunnel.url) {
    return tunnel.url;
  }

  // Check testing configuration for baseUrl
  if (techStack?.testing?.e2e?.baseUrl) {
    return techStack.testing.e2e.baseUrl;
  }

  if (techStack?.testing?.environment?.baseUrl) {
    return techStack.testing.environment.baseUrl;
  }

  // Fallback to localhost with configured port
  const port = techStack?.frontend?.port || options.port || 5173;
  return `http://localhost:${port}`;
}

/**
 * Generate testing configuration from tech-stack.json
 * Prefers tunnel URL over localhost for E2E testing
 */
export function generateTestingConfig(options = {}, cwd = process.cwd()) {
  const techStack = loadTechStack(cwd);
  const baseUrl = getTestingBaseUrl(techStack, options);
  const tunnel = techStack?.devEnvironment?.tunnel;
  const testing = techStack?.testing || {};

  // Determine environment type
  let envType = 'localhost';
  if (tunnel && tunnel.service !== 'none' && tunnel.url) {
    envType = tunnel.service; // ngrok, localtunnel, cloudflare-tunnel, etc.
  } else if (baseUrl && !baseUrl.includes('localhost')) {
    envType = 'production';
  }

  return {
    ralph_loop: {
      enabled: options.ralphLoopEnabled ?? true,
      testCommand: testing.e2e?.testCommand || 'npx playwright test',
      maxIterations: options.maxIterations || 10,
      autoStart: options.ralphAutoStart || false,
    },
    e2e_framework: testing.e2e?.framework || options.e2eFramework || null,
    environment: {
      type: envType,
      baseUrl: baseUrl,
      tunnelService: tunnel?.service || 'none',
      tunnelUrl: tunnel?.url || null,
    },
    selectors: testing.selectors || {
      username: '[data-testid="username-input"]',
      password: '[data-testid="password-input"]',
      loginButton: '[data-testid="login-submit"]',
      loginSuccess: '[data-testid="dashboard"]',
    },
    credentials: {
      usernameEnvVar: testing.credentials?.usernameEnvVar || 'TEST_USER_USERNAME',
      passwordEnvVar: testing.credentials?.passwordEnvVar || 'TEST_USER_PASSWORD',
    },
  };
}
