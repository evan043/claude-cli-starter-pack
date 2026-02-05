/**
 * Tech Stack File I/O Operations
 *
 * Reading and writing tech-stack.json.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { TECH_STACK_PATHS } from './constants.js';

/**
 * Get path to tech-stack.json (prefers .claude/tech-stack.json)
 */
export function getTechStackPath() {
  for (const path of TECH_STACK_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return TECH_STACK_PATHS[0];
}

/**
 * Load tech-stack.json
 */
export function loadTechStackJson() {
  const techStackPath = getTechStackPath();
  if (existsSync(techStackPath)) {
    try {
      return JSON.parse(readFileSync(techStackPath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Save tech-stack.json
 */
export function saveTechStackJson(techStack) {
  const techStackPath = getTechStackPath();
  const configDir = dirname(techStackPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  techStack._lastModified = new Date().toISOString();
  writeFileSync(techStackPath, JSON.stringify(techStack, null, 2), 'utf8');
  return techStackPath;
}

/**
 * Get environment configuration - prioritizes tunnel URL over localhost
 *
 * Order of preference:
 * 1. Explicitly provided baseUrl in options
 * 2. Tunnel URL from tech-stack.json (if tunnel service is configured and has URL)
 * 3. Localhost with configured port
 */
export function getEnvironmentConfig(options = {}) {
  const techStack = loadTechStackJson();
  const tunnel = techStack?.devEnvironment?.tunnel;

  // Check for active tunnel configuration
  const hasTunnel = tunnel && tunnel.service !== 'none' && tunnel.url;

  // Determine base URL
  let baseUrl = options.baseUrl;
  let envType = options.envType || 'localhost';

  if (!baseUrl) {
    if (hasTunnel) {
      // Prefer tunnel URL for E2E testing
      baseUrl = tunnel.url;
      envType = tunnel.service; // ngrok, localtunnel, cloudflare-tunnel, etc.
    } else {
      // Fallback to localhost
      const port = techStack?.frontend?.port || options.port || 5173;
      baseUrl = `http://localhost:${port}`;
      envType = 'localhost';
    }
  }

  return {
    type: envType,
    baseUrl: baseUrl,
    port: options.port || techStack?.frontend?.port || 5173,
    requiresSetup: options.requiresSetup || [],
    // Include tunnel info for commands that need it
    tunnel: {
      service: tunnel?.service || 'none',
      url: tunnel?.url || null,
      subdomain: tunnel?.subdomain || null,
      isActive: hasTunnel,
    },
  };
}
