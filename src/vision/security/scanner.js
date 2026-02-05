/**
 * Main Security Scanner Aggregator
 * Combines results from npm audit, pip-audit, and OSV scanner
 */

import { runNpmAudit, parseNpmAuditResults, classifyVulnerabilities as classifyNpm } from './npm-audit.js';
import { runPipAudit, parsePipAuditResults, classifyVulnerabilities as classifyPip } from './pip-audit.js';
import { runOSVScan, parseOSVResults } from './osv-scanner.js';

/**
 * Severity levels in priority order
 */
const SEVERITY_PRIORITY = {
  critical: 5,
  high: 4,
  moderate: 3,
  low: 2,
  info: 1,
  unknown: 0
};

/**
 * Default block threshold - block on critical or high severity
 */
const DEFAULT_BLOCK_THRESHOLD = 'high';

/**
 * Scan packages for vulnerabilities
 * @param {object} packages - Packages to scan { npm: [], pip: [] }
 * @param {string} [cwd] - Working directory
 * @returns {object} Aggregated scan results
 */
export function scanPackages(packages = {}, cwd = process.cwd()) {
  const results = {
    npm: null,
    pip: null,
    osv: null,
    timestamp: new Date().toISOString(),
    cwd
  };

  // Run npm audit if npm packages specified or package.json exists
  if (packages.npm?.length > 0 || !packages.npm) {
    console.log('Running npm audit...');
    const npmOutput = runNpmAudit(packages.npm || [], cwd);
    if (npmOutput) {
      results.npm = parseNpmAuditResults(npmOutput);
      console.log(`Found ${results.npm.metadata.total} npm vulnerabilities`);
    }
  }

  // Run pip audit if python packages specified or requirements.txt exists
  if (packages.pip?.length > 0 || !packages.pip) {
    console.log('Running pip audit...');
    const pipOutput = runPipAudit(packages.pip || [], cwd);
    if (pipOutput) {
      results.pip = parsePipAuditResults(pipOutput);
      console.log(`Found ${results.pip.metadata.total} Python vulnerabilities`);
    }
  }

  // Run OSV scanner on all lockfiles
  console.log('Running OSV scanner...');
  const osvOutput = runOSVScan(null, cwd);
  if (osvOutput) {
    results.osv = parseOSVResults(osvOutput);
    console.log(`Found ${results.osv.metadata.total} OSV vulnerabilities`);
  }

  return results;
}

/**
 * Merge vulnerabilities from all sources
 * Deduplicates by package name and vulnerability ID
 * @param {object} results - Scan results from scanPackages
 * @returns {object} Merged vulnerabilities
 */
export function mergeVulnerabilities(results) {
  const merged = {
    vulnerabilities: [],
    byPackage: new Map(),
    metadata: {
      total: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      sources: {
        npm: 0,
        pip: 0,
        osv: 0
      }
    }
  };

  const seenVulns = new Set(); // Track package:id combinations

  // Merge npm vulnerabilities
  if (results.npm?.vulnerabilities) {
    results.npm.vulnerabilities.forEach(vuln => {
      const key = `${vuln.package}:${vuln.title}`;
      if (!seenVulns.has(key)) {
        seenVulns.add(key);
        const entry = { ...vuln, source: 'npm' };
        merged.vulnerabilities.push(entry);

        if (!merged.byPackage.has(vuln.package)) {
          merged.byPackage.set(vuln.package, []);
        }
        merged.byPackage.get(vuln.package).push(entry);

        merged.metadata.sources.npm++;
      }
    });
  }

  // Merge pip vulnerabilities
  if (results.pip?.vulnerabilities) {
    results.pip.vulnerabilities.forEach(vuln => {
      const key = `${vuln.package}:${vuln.id || vuln.title}`;
      if (!seenVulns.has(key)) {
        seenVulns.add(key);
        const entry = { ...vuln, source: 'pip' };
        merged.vulnerabilities.push(entry);

        if (!merged.byPackage.has(vuln.package)) {
          merged.byPackage.set(vuln.package, []);
        }
        merged.byPackage.get(vuln.package).push(entry);

        merged.metadata.sources.pip++;
      }
    });
  }

  // Merge OSV vulnerabilities (may overlap with npm/pip)
  if (results.osv?.vulnerabilities) {
    results.osv.vulnerabilities.forEach(vuln => {
      const key = `${vuln.package}:${vuln.id}`;
      if (!seenVulns.has(key)) {
        seenVulns.add(key);
        const entry = { ...vuln, source: 'osv' };
        merged.vulnerabilities.push(entry);

        if (!merged.byPackage.has(vuln.package)) {
          merged.byPackage.set(vuln.package, []);
        }
        merged.byPackage.get(vuln.package).push(entry);

        merged.metadata.sources.osv++;
      }
    });
  }

  // Update metadata counts
  merged.metadata.total = merged.vulnerabilities.length;
  merged.vulnerabilities.forEach(vuln => {
    const severity = vuln.severity.toLowerCase();
    if (merged.metadata[severity] !== undefined) {
      merged.metadata[severity]++;
    }
  });

  return merged;
}

/**
 * Identify packages that should be blocked from installation
 * @param {object} mergedVulns - Output from mergeVulnerabilities
 * @param {string} [threshold] - Severity threshold (critical, high, moderate, low)
 * @returns {object} Blocked packages and reasons
 */
export function identifyBlockedPackages(mergedVulns, threshold = DEFAULT_BLOCK_THRESHOLD) {
  const blocked = {
    packages: [],
    count: 0,
    threshold,
    reasons: new Map()
  };

  const thresholdPriority = SEVERITY_PRIORITY[threshold] || SEVERITY_PRIORITY.high;

  mergedVulns.byPackage.forEach((vulns, packageName) => {
    // Find highest severity for this package
    const highestSeverity = vulns.reduce((max, vuln) => {
      const priority = SEVERITY_PRIORITY[vuln.severity] || 0;
      return priority > SEVERITY_PRIORITY[max] ? vuln.severity : max;
    }, 'info');

    const highestPriority = SEVERITY_PRIORITY[highestSeverity] || 0;

    // Block if highest severity meets or exceeds threshold
    if (highestPriority >= thresholdPriority) {
      blocked.packages.push(packageName);
      blocked.reasons.set(packageName, {
        severity: highestSeverity,
        count: vulns.length,
        vulnerabilities: vulns.map(v => ({
          id: v.id || v.title,
          severity: v.severity,
          source: v.source,
          url: v.url
        }))
      });
    }
  });

  blocked.count = blocked.packages.length;
  return blocked;
}

/**
 * Generate a formatted security report
 * @param {object} scanResults - Results from scanPackages
 * @param {object} [options] - Report options
 * @returns {string} Formatted report
 */
export function generateSecurityReport(scanResults, options = {}) {
  const {
    format = 'text',
    threshold = DEFAULT_BLOCK_THRESHOLD,
    includeDetails = true
  } = options;

  const merged = mergeVulnerabilities(scanResults);
  const blocked = identifyBlockedPackages(merged, threshold);

  if (format === 'json') {
    return JSON.stringify({
      summary: merged.metadata,
      blocked,
      vulnerabilities: merged.vulnerabilities,
      timestamp: scanResults.timestamp
    }, null, 2);
  }

  // Text format
  const lines = [];
  lines.push('='.repeat(60));
  lines.push('SECURITY SCAN REPORT');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Scan Time: ${scanResults.timestamp}`);
  lines.push(`Working Directory: ${scanResults.cwd}`);
  lines.push('');

  // Summary
  lines.push('SUMMARY');
  lines.push('-'.repeat(60));
  lines.push(`Total Vulnerabilities: ${merged.metadata.total}`);
  lines.push(`  Critical: ${merged.metadata.critical}`);
  lines.push(`  High:     ${merged.metadata.high}`);
  lines.push(`  Moderate: ${merged.metadata.moderate}`);
  lines.push(`  Low:      ${merged.metadata.low}`);
  lines.push(`  Info:     ${merged.metadata.info}`);
  lines.push('');
  lines.push(`Sources: npm(${merged.metadata.sources.npm}) pip(${merged.metadata.sources.pip}) osv(${merged.metadata.sources.osv})`);
  lines.push('');

  // Blocked packages
  lines.push('BLOCKED PACKAGES');
  lines.push('-'.repeat(60));
  lines.push(`Threshold: ${threshold.toUpperCase()}`);
  lines.push(`Blocked Count: ${blocked.count}`);
  lines.push('');

  if (blocked.count > 0) {
    blocked.packages.forEach(pkg => {
      const reason = blocked.reasons.get(pkg);
      lines.push(`${pkg}:`);
      lines.push(`  Severity: ${reason.severity.toUpperCase()}`);
      lines.push(`  Vulnerabilities: ${reason.count}`);

      if (includeDetails) {
        reason.vulnerabilities.forEach(vuln => {
          lines.push(`    - ${vuln.id} (${vuln.severity}) [${vuln.source}]`);
          if (vuln.url) {
            lines.push(`      ${vuln.url}`);
          }
        });
      }
      lines.push('');
    });
  } else {
    lines.push('No packages blocked at current threshold.');
    lines.push('');
  }

  lines.push('='.repeat(60));
  return lines.join('\n');
}

/**
 * Determine if a package installation should be blocked
 * @param {string} packageName - Package to check
 * @param {string} severity - Severity threshold
 * @param {object} scanResults - Results from scanPackages
 * @returns {boolean} True if should block
 */
export function shouldBlockInstall(packageName, severity = DEFAULT_BLOCK_THRESHOLD, scanResults = null) {
  if (!scanResults) {
    // No scan results available - allow by default
    return false;
  }

  const merged = mergeVulnerabilities(scanResults);
  const blocked = identifyBlockedPackages(merged, severity);

  return blocked.packages.includes(packageName);
}
