/**
 * npm audit integration
 * Scans Node.js packages for known vulnerabilities
 */

import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Check if npm is available
 * @returns {boolean}
 */
function isNpmAvailable() {
  try {
    execFileSync('npm', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run npm audit on specified packages
 * @param {string[]} packageNames - Array of package names to audit
 * @param {string} [cwd] - Working directory (should contain package.json)
 * @returns {object|null} Audit results or null if npm unavailable
 */
export function runNpmAudit(packageNames = [], cwd = process.cwd()) {
  if (!isNpmAvailable()) {
    console.warn('npm not found - skipping npm audit');
    return null;
  }

  // Check if package.json exists
  const packageJsonPath = join(cwd, 'package.json');
  if (!existsSync(packageJsonPath)) {
    console.warn('package.json not found - skipping npm audit');
    return null;
  }

  try {
    // Run npm audit with JSON output
    // Note: npm audit returns non-zero exit code if vulnerabilities found
    const output = execFileSync('npm', ['audit', '--json'], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      // Don't throw on non-zero exit (vulnerabilities present)
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    return JSON.parse(output);
  } catch (error) {
    // npm audit throws when vulnerabilities are found
    // Try to parse stdout as JSON anyway
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        console.error('Failed to parse npm audit output:', error.message);
        return null;
      }
    }
    console.error('npm audit failed:', error.message);
    return null;
  }
}

/**
 * Parse npm audit JSON output
 * @param {object} auditOutput - Raw npm audit JSON
 * @returns {object} Parsed vulnerabilities
 */
export function parseNpmAuditResults(auditOutput) {
  if (!auditOutput || !auditOutput.vulnerabilities) {
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
  const vulnMap = auditOutput.vulnerabilities || {};

  for (const [packageName, vulnData] of Object.entries(vulnMap)) {
    const vuln = {
      package: packageName,
      severity: vulnData.severity || 'unknown',
      title: vulnData.name || packageName,
      range: vulnData.range || '*',
      fixAvailable: vulnData.fixAvailable || false,
      via: Array.isArray(vulnData.via) ? vulnData.via : [],
      effects: vulnData.effects || [],
      advisories: []
    };

    // Extract advisory details from 'via' array
    if (Array.isArray(vulnData.via)) {
      vulnData.via.forEach(item => {
        if (typeof item === 'object' && item.url) {
          vuln.advisories.push({
            id: item.source || 'unknown',
            url: item.url,
            title: item.title || '',
            severity: item.severity || vuln.severity
          });
        }
      });
    }

    vulnerabilities.push(vuln);
  }

  // Count by severity
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
 * Classify vulnerabilities by severity
 * @param {object} results - Parsed npm audit results
 * @returns {object} Vulnerabilities grouped by severity
 */
export function classifyVulnerabilities(results) {
  if (!results || !results.vulnerabilities) {
    return {
      critical: [],
      high: [],
      moderate: [],
      low: [],
      info: []
    };
  }

  const classified = {
    critical: [],
    high: [],
    moderate: [],
    low: [],
    info: []
  };

  results.vulnerabilities.forEach(vuln => {
    const severity = vuln.severity.toLowerCase();
    if (classified[severity]) {
      classified[severity].push(vuln);
    } else {
      // Unknown severity defaults to moderate
      classified.moderate.push(vuln);
    }
  });

  return classified;
}
