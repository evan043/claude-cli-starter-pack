/**
 * pip-audit integration
 * Scans Python packages for known vulnerabilities
 * Falls back to safety if pip-audit is not available
 */

import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Check if pip-audit is available
 * @returns {boolean}
 */
function isPipAuditAvailable() {
  try {
    execFileSync('pip-audit', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if safety is available (fallback)
 * @returns {boolean}
 */
function isSafetyAvailable() {
  try {
    execFileSync('safety', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Python is available
 * @returns {boolean}
 */
function isPythonAvailable() {
  try {
    execFileSync('python', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    try {
      execFileSync('python3', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Run pip-audit on specified packages
 * @param {string[]} packageNames - Array of package names to audit
 * @param {string} [cwd] - Working directory
 * @returns {object|null} Audit results or null if unavailable
 */
export function runPipAudit(packageNames = [], cwd = process.cwd()) {
  if (!isPythonAvailable()) {
    console.warn('Python not found - skipping pip audit');
    return null;
  }

  // Check for requirements.txt or pyproject.toml
  const hasRequirements = existsSync(join(cwd, 'requirements.txt'));
  const hasPyproject = existsSync(join(cwd, 'pyproject.toml'));

  if (!hasRequirements && !hasPyproject) {
    console.warn('No Python dependency file found - skipping pip audit');
    return null;
  }

  // Try pip-audit first (preferred)
  if (isPipAuditAvailable()) {
    return runPipAuditTool(cwd);
  }

  // Fallback to safety
  if (isSafetyAvailable()) {
    return runSafetyTool(cwd);
  }

  console.warn('Neither pip-audit nor safety found - skipping Python vulnerability scan');
  console.warn('Install with: pip install pip-audit');
  return null;
}

/**
 * Run pip-audit tool
 * @param {string} cwd - Working directory
 * @returns {object|null}
 */
function runPipAuditTool(cwd) {
  try {
    const output = execFileSync('pip-audit', ['--format', 'json'], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });

    return {
      source: 'pip-audit',
      data: JSON.parse(output)
    };
  } catch (error) {
    // pip-audit returns non-zero on vulnerabilities
    if (error.stdout) {
      try {
        return {
          source: 'pip-audit',
          data: JSON.parse(error.stdout)
        };
      } catch {
        console.error('Failed to parse pip-audit output:', error.message);
        return null;
      }
    }
    console.error('pip-audit failed:', error.message);
    return null;
  }
}

/**
 * Run safety tool (fallback)
 * @param {string} cwd - Working directory
 * @returns {object|null}
 */
function runSafetyTool(cwd) {
  try {
    const output = execFileSync('safety', ['check', '--json'], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });

    return {
      source: 'safety',
      data: JSON.parse(output)
    };
  } catch (error) {
    if (error.stdout) {
      try {
        return {
          source: 'safety',
          data: JSON.parse(error.stdout)
        };
      } catch {
        console.error('Failed to parse safety output:', error.message);
        return null;
      }
    }
    console.error('safety check failed:', error.message);
    return null;
  }
}

/**
 * Parse pip-audit or safety JSON output
 * @param {object} auditOutput - Raw audit output
 * @returns {object} Parsed vulnerabilities
 */
export function parsePipAuditResults(auditOutput) {
  if (!auditOutput || !auditOutput.data) {
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

  const { source, data } = auditOutput;

  if (source === 'pip-audit') {
    return parsePipAuditFormat(data);
  } else if (source === 'safety') {
    return parseSafetyFormat(data);
  }

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

/**
 * Parse pip-audit JSON format
 * @param {object} data - pip-audit JSON output
 * @returns {object}
 */
function parsePipAuditFormat(data) {
  const vulnerabilities = [];

  if (Array.isArray(data.dependencies)) {
    data.dependencies.forEach(dep => {
      if (Array.isArray(dep.vulns)) {
        dep.vulns.forEach(vuln => {
          vulnerabilities.push({
            package: dep.name,
            version: dep.version,
            severity: mapPipAuditSeverity(vuln.severity),
            title: vuln.description || vuln.id,
            id: vuln.id,
            fixVersion: vuln.fix_versions?.[0] || null,
            url: vuln.url || null
          });
        });
      }
    });
  }

  return buildMetadata(vulnerabilities);
}

/**
 * Parse safety JSON format
 * @param {object} data - safety JSON output
 * @returns {object}
 */
function parseSafetyFormat(data) {
  const vulnerabilities = [];

  if (Array.isArray(data)) {
    data.forEach(vuln => {
      vulnerabilities.push({
        package: vuln.package,
        version: vuln.installed_version,
        severity: 'high', // safety doesn't provide severity scores
        title: vuln.advisory,
        id: vuln.vulnerability_id || vuln.id,
        fixVersion: vuln.fixed_version || null,
        url: null
      });
    });
  }

  return buildMetadata(vulnerabilities);
}

/**
 * Map pip-audit severity to standard levels
 * @param {string} severity - pip-audit severity
 * @returns {string}
 */
function mapPipAuditSeverity(severity) {
  if (!severity) return 'moderate';

  const normalized = severity.toLowerCase();
  if (normalized.includes('critical')) return 'critical';
  if (normalized.includes('high')) return 'high';
  if (normalized.includes('medium') || normalized.includes('moderate')) return 'moderate';
  if (normalized.includes('low')) return 'low';
  return 'moderate';
}

/**
 * Build metadata from vulnerabilities
 * @param {array} vulnerabilities
 * @returns {object}
 */
function buildMetadata(vulnerabilities) {
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
 * @param {object} results - Parsed pip-audit results
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
      classified.moderate.push(vuln);
    }
  });

  return classified;
}
