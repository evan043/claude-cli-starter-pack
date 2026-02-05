/**
 * OSV Scanner integration
 * Uses Google's Open Source Vulnerabilities database
 * Scans lockfiles for known vulnerabilities across ecosystems
 */

import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Check if osv-scanner is available
 * @returns {boolean}
 */
function isOSVScannerAvailable() {
  try {
    execFileSync('osv-scanner', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Find lockfiles in the project
 * @param {string} cwd - Working directory
 * @returns {string[]} Array of lockfile paths
 */
function findLockfiles(cwd) {
  const lockfiles = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'requirements.txt',
    'Pipfile.lock',
    'poetry.lock',
    'Cargo.lock',
    'go.sum',
    'composer.lock',
    'Gemfile.lock'
  ];

  return lockfiles
    .map(file => join(cwd, file))
    .filter(path => existsSync(path));
}

/**
 * Run OSV Scanner on lockfile(s)
 * @param {string|string[]} lockfilePath - Path to lockfile or array of paths
 * @param {string} [cwd] - Working directory
 * @returns {object|null} OSV scan results or null if unavailable
 */
export function runOSVScan(lockfilePath = null, cwd = process.cwd()) {
  if (!isOSVScannerAvailable()) {
    console.warn('osv-scanner not found - skipping OSV scan');
    console.warn('Install from: https://github.com/google/osv-scanner');
    return null;
  }

  // If no lockfile specified, find all lockfiles
  const lockfiles = lockfilePath
    ? (Array.isArray(lockfilePath) ? lockfilePath : [lockfilePath])
    : findLockfiles(cwd);

  if (lockfiles.length === 0) {
    console.warn('No lockfiles found - skipping OSV scan');
    return null;
  }

  try {
    // OSV scanner can scan multiple files at once
    // Use --format json for machine-readable output
    const args = ['--format', 'json', ...lockfiles];

    const output = execFileSync('osv-scanner', args, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });

    return JSON.parse(output);
  } catch (error) {
    // osv-scanner returns non-zero when vulnerabilities found
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        console.error('Failed to parse osv-scanner output:', error.message);
        return null;
      }
    }
    console.error('osv-scanner failed:', error.message);
    return null;
  }
}

/**
 * Parse OSV Scanner JSON output
 * @param {object} osvOutput - Raw OSV scanner JSON
 * @returns {object} Parsed vulnerabilities
 */
export function parseOSVResults(osvOutput) {
  if (!osvOutput || !osvOutput.results) {
    return {
      vulnerabilities: [],
      metadata: {
        total: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        info: 0
      }
    };
  }

  const vulnerabilities = [];

  osvOutput.results.forEach(result => {
    const source = result.source?.path || 'unknown';

    if (Array.isArray(result.packages)) {
      result.packages.forEach(pkg => {
        if (Array.isArray(pkg.vulnerabilities)) {
          pkg.vulnerabilities.forEach(vuln => {
            // Map OSV severity to standard levels
            const severity = mapOSVSeverity(vuln);

            vulnerabilities.push({
              package: pkg.package?.name || 'unknown',
              version: pkg.package?.version || 'unknown',
              ecosystem: pkg.package?.ecosystem || 'unknown',
              severity,
              title: vuln.summary || vuln.id,
              id: vuln.id,
              source,
              url: `https://osv.dev/vulnerability/${vuln.id}`,
              published: vuln.published || null,
              modified: vuln.modified || null,
              aliases: vuln.aliases || [],
              references: vuln.references || []
            });
          });
        }
      });
    }
  });

  // Build metadata
  const metadata = {
    total: vulnerabilities.length,
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    moderate: vulnerabilities.filter(v => v.severity === 'moderate').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length,
    info: vulnerabilities.filter(v => v.severity === 'info').length
  };

  return { vulnerabilities, metadata };
}

/**
 * Map OSV severity to standard levels
 * OSV uses CVSS scores or ecosystem-specific severity
 * @param {object} vuln - OSV vulnerability object
 * @returns {string} Severity level
 */
function mapOSVSeverity(vuln) {
  // Check for severity field
  if (vuln.severity) {
    const normalized = vuln.severity.toLowerCase();
    if (normalized.includes('critical')) return 'critical';
    if (normalized.includes('high')) return 'high';
    if (normalized.includes('medium') || normalized.includes('moderate')) return 'moderate';
    if (normalized.includes('low')) return 'low';
  }

  // Check for CVSS score
  if (vuln.database_specific?.cvss_score) {
    const score = vuln.database_specific.cvss_score;
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'moderate';
    if (score >= 0.1) return 'low';
  }

  // Check severity in database_specific
  if (vuln.database_specific?.severity) {
    const normalized = vuln.database_specific.severity.toLowerCase();
    if (normalized.includes('critical')) return 'critical';
    if (normalized.includes('high')) return 'high';
    if (normalized.includes('medium') || normalized.includes('moderate')) return 'moderate';
    if (normalized.includes('low')) return 'low';
  }

  // Default to moderate if no severity info available
  return 'moderate';
}
