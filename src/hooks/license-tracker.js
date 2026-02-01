/**
 * License Tracker Hook
 *
 * PostUse hook that detects when Claude installs dependencies
 * and tracks their licenses in Licensed-Tools.json.
 *
 * Part of Phase 1: Foundation Hooks (Issue #26)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
  normalizeLicense,
  getLicenseMetadata,
  getLicenseUrl,
  classifyLicense,
} from '../utils/license-detector.js';

/**
 * Path to Licensed-Tools.json
 */
function getLicensedToolsPath(projectRoot = process.cwd()) {
  return join(projectRoot, 'repo-settings', 'Licensed-Tools.json');
}

/**
 * Load the Licensed-Tools.json registry
 * @param {string} projectRoot - Project root directory
 * @returns {object} Registry data
 */
export function loadRegistry(projectRoot = process.cwd()) {
  const registryPath = getLicensedToolsPath(projectRoot);

  if (!existsSync(registryPath)) {
    return createDefaultRegistry();
  }

  try {
    return JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch {
    return createDefaultRegistry();
  }
}

/**
 * Create default registry structure
 * @returns {object} Default registry
 */
function createDefaultRegistry() {
  return {
    version: '1.0.0',
    metadata: {
      generatedAt: new Date().toISOString(),
      lastUpdated: null,
      totalPackages: 0,
    },
    licensePolicy: {
      allowed: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'CC0-1.0', 'Unlicense', '0BSD'],
      restricted: ['GPL-2.0', 'GPL-3.0', 'LGPL-2.0', 'LGPL-2.1', 'LGPL-3.0', 'AGPL-3.0'],
      requiresReview: ['MPL-2.0', 'EPL-1.0', 'EPL-2.0'],
      blocked: ['UNLICENSED', 'PROPRIETARY'],
    },
    packages: {
      npm: {},
      pip: {},
    },
    history: [],
  };
}

/**
 * Save the registry
 * @param {object} registry - Registry to save
 * @param {string} projectRoot - Project root directory
 */
export function saveRegistry(registry, projectRoot = process.cwd()) {
  const registryPath = getLicensedToolsPath(projectRoot);
  const dir = dirname(registryPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  registry.metadata.lastUpdated = new Date().toISOString();
  registry.metadata.totalPackages = Object.keys(registry.packages.npm || {}).length +
                                    Object.keys(registry.packages.pip || {}).length;

  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
}

/**
 * Parse npm install command output
 * @param {string} output - Command output
 * @returns {Array} Array of installed packages
 */
export function parseNpmInstallOutput(output) {
  const packages = [];

  // Match "added X packages" or individual package names
  const addedMatch = output.match(/added (\d+) packages?/i);
  const packageMatches = output.matchAll(/\+ ([^@\s]+)@([^\s]+)/g);

  for (const match of packageMatches) {
    packages.push({
      name: match[1],
      version: match[2],
      ecosystem: 'npm',
    });
  }

  return packages;
}

/**
 * Parse pip install command output
 * @param {string} output - Command output
 * @returns {Array} Array of installed packages
 */
export function parsePipInstallOutput(output) {
  const packages = [];

  // Match "Successfully installed package-version"
  const matches = output.matchAll(/Successfully installed ([^\s]+)-(\d+\.\d+[^\s]*)/gi);

  for (const match of matches) {
    packages.push({
      name: match[1],
      version: match[2],
      ecosystem: 'pip',
    });
  }

  return packages;
}

/**
 * Register a package in the registry
 * @param {object} registry - Registry object
 * @param {object} packageInfo - Package information
 * @returns {object} Updated registry
 */
export function registerPackage(registry, packageInfo) {
  const { name, version, ecosystem, license } = packageInfo;

  if (!registry.packages[ecosystem]) {
    registry.packages[ecosystem] = {};
  }

  const normalizedLicense = normalizeLicense(license);
  const classification = classifyLicense(normalizedLicense);

  registry.packages[ecosystem][name] = {
    version,
    license: normalizedLicense,
    licenseUrl: getLicenseUrl(normalizedLicense),
    classification: classification.status,
    copyleft: classification.copyleft,
    compliance: classification.compliance,
    detectedAt: new Date().toISOString(),
    source: 'auto-detected',
  };

  registry.history.push({
    action: 'add',
    package: name,
    ecosystem,
    version,
    license: normalizedLicense,
    timestamp: new Date().toISOString(),
  });

  return registry;
}

/**
 * Check if a license is allowed by policy
 * @param {object} registry - Registry with policy
 * @param {string} license - License to check
 * @returns {object} Check result
 */
export function checkLicensePolicy(registry, license) {
  const normalizedLicense = normalizeLicense(license);
  const policy = registry.licensePolicy;

  if (policy.allowed.includes(normalizedLicense)) {
    return { allowed: true, status: 'allowed', message: 'License is allowed' };
  }

  if (policy.blocked.includes(normalizedLicense)) {
    return { allowed: false, status: 'blocked', message: `License ${normalizedLicense} is blocked by policy` };
  }

  if (policy.restricted.includes(normalizedLicense)) {
    return { allowed: false, status: 'restricted', message: `License ${normalizedLicense} is restricted (copyleft)` };
  }

  if (policy.requiresReview.includes(normalizedLicense)) {
    return { allowed: true, status: 'requires-review', message: `License ${normalizedLicense} requires manual review` };
  }

  return { allowed: true, status: 'unknown', message: `License ${normalizedLicense} not in policy - requires review` };
}

/**
 * Generate hook script for license tracking
 * @returns {string} Hook script content
 */
export function generateLicenseTrackerHook() {
  return `#!/usr/bin/env node
/**
 * License Tracker - PostToolUse Hook
 *
 * Monitors for dependency installations and tracks licenses.
 * Triggered after Bash tool calls that install packages.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

// Patterns that indicate dependency installation
const INSTALL_PATTERNS = [
  /npm\\s+(install|i|add)/i,
  /yarn\\s+(add|install)/i,
  /pnpm\\s+(add|install)/i,
  /pip\\s+install/i,
  /pip3\\s+install/i,
  /poetry\\s+add/i,
  /cargo\\s+add/i,
];

async function main() {
  try {
    const tool = hookInput.tool_name || '';
    const input = hookInput.tool_input || {};
    const output = hookInput.tool_output || {};

    // Only process Bash tool completions
    if (tool !== 'Bash') {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    const command = input.command || '';

    // Check if this is an install command
    const isInstall = INSTALL_PATTERNS.some(p => p.test(command));

    if (!isInstall) {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    // Extract package names from command
    const packages = [];

    // npm/yarn/pnpm pattern: install <package>[@version]
    const npmMatch = command.match(/(?:npm|yarn|pnpm)\\s+(?:install|add|i)\\s+([^\\s]+)/i);
    if (npmMatch) {
      const pkg = npmMatch[1].replace(/@[^/]+$/, ''); // Remove version
      packages.push({ name: pkg, ecosystem: 'npm' });
    }

    // pip pattern: pip install <package>
    const pipMatch = command.match(/pip3?\\s+install\\s+([^\\s]+)/i);
    if (pipMatch) {
      const pkg = pipMatch[1].replace(/[<>=!].+$/, ''); // Remove version spec
      packages.push({ name: pkg, ecosystem: 'pip' });
    }

    if (packages.length > 0) {
      console.log(JSON.stringify({
        decision: 'approve',
        systemMessage: \`
## License Tracking Notice

New dependencies detected:
\${packages.map(p => \`- \${p.name} (\${p.ecosystem})\`).join('\\n')}

Licenses will be tracked in repo-settings/Licensed-Tools.json

⚠️ Remember to review licenses for compliance before committing.
\`
      }));
      return;
    }

    console.log(JSON.stringify({ decision: 'approve' }));

  } catch (error) {
    // Always approve on error (non-blocking)
    console.log(JSON.stringify({
      decision: 'approve',
      reason: 'Hook error (non-blocking): ' + error.message
    }));
  }
}

main();
`;
}

export default {
  loadRegistry,
  saveRegistry,
  registerPackage,
  checkLicensePolicy,
  parseNpmInstallOutput,
  parsePipInstallOutput,
  generateLicenseTrackerHook,
  getLicensedToolsPath,
};
