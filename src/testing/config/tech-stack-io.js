/**
 * Tech Stack File I/O Operations
 *
 * Delegates to the canonical loadTechStack/saveTechStack in src/utils.js.
 * Maintains loadTechStackJson/saveTechStackJson names for backward compatibility.
 */

import {
  loadTechStack,
  saveTechStack,
  getTechStackPath,
} from '../../utils.js';

export { getTechStackPath };

/**
 * Load tech-stack.json (delegates to canonical utils.js)
 */
export function loadTechStackJson() {
  const result = loadTechStack();
  // Canonical loadTechStack returns default obj, but callers here expect null
  if (result && result._pendingConfiguration) return result;
  return result || null;
}

/**
 * Save tech-stack.json (delegates to canonical utils.js)
 * @returns {string} Path that was written to
 */
export function saveTechStackJson(techStack) {
  saveTechStack(techStack);
  return getTechStackPath();
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
