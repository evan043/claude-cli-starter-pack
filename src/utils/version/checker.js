/**
 * Version Checker Module
 *
 * Handles version comparison, detection, and npm registry queries.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Package name for npm registry lookup
const PACKAGE_NAME = 'claude-cli-advanced-starter-pack';

/**
 * Get the current installed version from package.json
 */
export function getCurrentVersion() {
  try {
    const packagePath = join(__dirname, '..', '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch {
    return '0.0.0';
  }
}

/**
 * Compare two semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

/**
 * Check npm registry for the latest version
 * Returns null if check fails (network error, etc.)
 * Issue #8: Added npm registry API fallback for Windows compatibility
 */
export async function checkLatestVersion() {
  // Try npm CLI first
  try {
    const result = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const version = result.trim();
    if (version && /^\d+\.\d+\.\d+/.test(version)) {
      return version;
    }
  } catch {
    // npm CLI failed, try fallback
  }

  // Fallback: Direct npm registry API call (Issue #8 fix)
  try {
    const https = await import('https');
    return new Promise((resolve) => {
      const req = https.default.get(
        `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
        { timeout: 8000 },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const pkg = JSON.parse(data);
              resolve(pkg.version || null);
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });
  } catch {
    return null;
  }
}

/**
 * Get detailed package info from npm registry
 */
export async function getPackageInfo() {
  try {
    const result = execSync(`npm view ${PACKAGE_NAME} --json`, {
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return JSON.parse(result);
  } catch {
    return null;
  }
}
