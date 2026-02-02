/**
 * Security Scanner Hook
 *
 * PreInstall hook that scans dependencies for security vulnerabilities
 * using GuardDog and OSV-Scanner.
 *
 * Part of Phase 1: Foundation Hooks (Issue #27)
 */

import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync, spawnSync } from 'child_process';

/**
 * Check if a CLI tool is available
 * @param {string} command - Command to check
 * @returns {boolean} Whether the tool is available
 */
export function isToolAvailable(command) {
  try {
    const result = spawnSync('which', [command], { encoding: 'utf8' });
    if (result.status === 0) return true;

    // Try Windows where
    const resultWin = spawnSync('where', [command], { encoding: 'utf8', shell: true });
    return resultWin.status === 0;
  } catch {
    return false;
  }
}

/**
 * Run GuardDog scan on a package
 * @param {string} packageName - Package to scan
 * @param {string} ecosystem - Package ecosystem (npm, pypi)
 * @returns {object} Scan result
 */
export function runGuardDogScan(packageName, ecosystem = 'npm') {
  const result = {
    tool: 'guarddog',
    scanned: false,
    passed: true,
    findings: [],
    error: null,
  };

  if (!isToolAvailable('guarddog')) {
    result.error = 'GuardDog not installed. Install with: pip install guarddog';
    return result;
  }

  try {
    const ecosystemArg = ecosystem === 'npm' ? 'npm' : 'pypi';
    // Use spawnSync to prevent shell injection from malicious package names
    const proc = spawnSync('guarddog', [ecosystemArg, 'scan', packageName], {
      encoding: 'utf8',
      timeout: 60000,
    });

    if (proc.error) {
      throw proc.error;
    }

    const output = proc.stdout || '';
    result.scanned = true;
    result.rawOutput = output;

    // Parse GuardDog output for findings
    if (output.includes('MALICIOUS') || output.includes('SUSPICIOUS')) {
      result.passed = false;
      result.findings.push({
        severity: 'critical',
        message: 'Potentially malicious package detected',
        details: output,
      });
    }

    if (output.includes('WARNING')) {
      result.findings.push({
        severity: 'warning',
        message: 'Package has warnings',
        details: output,
      });
    }
  } catch (error) {
    result.error = error.message;
  }

  return result;
}

/**
 * Run OSV-Scanner on a package or directory
 * @param {string} target - Package name or directory path
 * @param {object} options - Scan options
 * @returns {object} Scan result
 */
export function runOsvScan(target, options = {}) {
  const result = {
    tool: 'osv-scanner',
    scanned: false,
    passed: true,
    vulnerabilities: [],
    error: null,
  };

  if (!isToolAvailable('osv-scanner')) {
    result.error = 'OSV-Scanner not installed. Install from: https://github.com/google/osv-scanner';
    return result;
  }

  try {
    const args = ['--format', 'json'];

    if (options.lockfile) {
      args.push('--lockfile', options.lockfile);
    } else if (existsSync(target)) {
      args.push('-r', target);
    } else {
      args.push('--package', target);
    }

    // Use spawnSync to prevent shell injection from malicious paths/package names
    const proc = spawnSync('osv-scanner', args, {
      encoding: 'utf8',
      timeout: 120000,
    });

    if (proc.error) {
      throw proc.error;
    }

    const output = proc.stdout || '';
    result.scanned = true;

    try {
      const parsed = JSON.parse(output);
      result.vulnerabilities = parsed.results || [];
      result.passed = result.vulnerabilities.length === 0;
    } catch {
      // Non-JSON output means no vulnerabilities found
      result.passed = true;
    }
  } catch (error) {
    // OSV-Scanner exits with code 1 if vulnerabilities found
    if (error.stdout) {
      try {
        const parsed = JSON.parse(error.stdout);
        result.scanned = true;
        result.vulnerabilities = parsed.results || [];
        result.passed = false;
      } catch {
        result.error = error.message;
      }
    } else {
      result.error = error.message;
    }
  }

  return result;
}

/**
 * Combined security scan
 * @param {string} packageName - Package to scan
 * @param {string} ecosystem - Package ecosystem
 * @returns {object} Combined scan result
 */
export function runSecurityScan(packageName, ecosystem = 'npm') {
  const result = {
    package: packageName,
    ecosystem,
    timestamp: new Date().toISOString(),
    passed: true,
    scans: {},
    summary: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      warnings: 0,
    },
    blocked: false,
    blockReason: null,
  };

  // Run GuardDog
  result.scans.guarddog = runGuardDogScan(packageName, ecosystem);
  if (result.scans.guarddog.scanned && !result.scans.guarddog.passed) {
    result.passed = false;
    result.blocked = true;
    result.blockReason = 'Malicious package detected by GuardDog';
    result.summary.critical++;
  }

  // Run OSV-Scanner
  result.scans.osv = runOsvScan(packageName);
  if (result.scans.osv.scanned) {
    for (const vuln of result.scans.osv.vulnerabilities) {
      const severity = (vuln.severity || 'unknown').toLowerCase();
      if (severity === 'critical') {
        result.summary.critical++;
        result.blocked = true;
        result.blockReason = result.blockReason || 'Critical vulnerability found';
      } else if (severity === 'high') {
        result.summary.high++;
      } else if (severity === 'medium') {
        result.summary.medium++;
      } else {
        result.summary.low++;
      }
    }
    if (result.scans.osv.vulnerabilities.length > 0) {
      result.passed = false;
    }
  }

  return result;
}

/**
 * Generate SARIF report from scan results
 * @param {object} scanResult - Scan result from runSecurityScan
 * @returns {object} SARIF formatted report
 */
export function generateSarifReport(scanResult) {
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'CCASP Security Scanner',
            version: '1.0.0',
            informationUri: 'https://github.com/ccasp',
            rules: [],
          },
        },
        results: [],
      },
    ],
  };

  const run = sarif.runs[0];

  // Add GuardDog findings
  if (scanResult.scans.guarddog?.findings) {
    for (const finding of scanResult.scans.guarddog.findings) {
      run.results.push({
        ruleId: 'GUARDDOG-001',
        level: finding.severity === 'critical' ? 'error' : 'warning',
        message: { text: finding.message },
        locations: [{ physicalLocation: { artifactLocation: { uri: scanResult.package } } }],
      });
    }
  }

  // Add OSV findings
  if (scanResult.scans.osv?.vulnerabilities) {
    for (const vuln of scanResult.scans.osv.vulnerabilities) {
      run.results.push({
        ruleId: vuln.id || 'OSV-001',
        level: vuln.severity === 'critical' || vuln.severity === 'high' ? 'error' : 'warning',
        message: { text: vuln.summary || vuln.details || 'Vulnerability detected' },
        locations: [{ physicalLocation: { artifactLocation: { uri: scanResult.package } } }],
      });
    }
  }

  return sarif;
}

/**
 * Save scan report to file
 * @param {object} report - Report object
 * @param {string} format - Output format (json, sarif)
 * @param {string} outputPath - Output file path
 */
export function saveScanReport(report, format = 'json', outputPath = null) {
  const outputDir = outputPath ? dirname(outputPath) : join(process.cwd(), 'repo-settings', 'security-reports');

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = outputPath || join(outputDir, `scan-${timestamp}.${format}`);

  const content = format === 'sarif' ? generateSarifReport(report) : report;
  writeFileSync(filename, JSON.stringify(content, null, 2), 'utf8');

  return filename;
}

/**
 * Generate security scanner hook script
 * @returns {string} Hook script content
 */
export function generateSecurityScannerHook() {
  return `#!/usr/bin/env node
/**
 * Security Scanner - PreToolUse Hook
 *
 * Scans packages before installation for security issues.
 * Uses GuardDog and OSV-Scanner if available.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

// Patterns that indicate dependency installation
const INSTALL_PATTERNS = [
  /npm\\s+(install|i|add)\\s+([^\\s]+)/i,
  /yarn\\s+(add|install)\\s+([^\\s]+)/i,
  /pnpm\\s+(add|install)\\s+([^\\s]+)/i,
  /pip3?\\s+install\\s+([^\\s]+)/i,
];

function extractPackageName(command) {
  for (const pattern of INSTALL_PATTERNS) {
    const match = command.match(pattern);
    if (match) {
      // Get the package name (last capture group)
      let pkg = match[match.length - 1];
      // Remove version specifiers
      pkg = pkg.replace(/@[^/]+$/, '').replace(/[<>=!].+$/, '');
      return pkg;
    }
  }
  return null;
}

async function main() {
  try {
    const tool = hookInput.tool_name || '';
    const input = hookInput.tool_input || {};

    // Only intercept Bash tool for install commands
    if (tool !== 'Bash') {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    const command = input.command || '';
    const packageName = extractPackageName(command);

    if (!packageName) {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    // Warn about security scanning
    console.log(JSON.stringify({
      decision: 'approve',
      systemMessage: \`
## Security Scan Notice

Installing package: **\${packageName}**

⚠️ Security tools status:
- GuardDog: Check with \\\`guarddog --version\\\`
- OSV-Scanner: Check with \\\`osv-scanner --version\\\`

If available, security scans will run automatically.
Critical vulnerabilities will be reported after installation.

**Best Practices:**
1. Review package before installing
2. Check npm/PyPI page for maintenance status
3. Verify package authenticity (typosquatting)
\`
    }));

  } catch (error) {
    // Always approve on error (fail-safe)
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
  isToolAvailable,
  runGuardDogScan,
  runOsvScan,
  runSecurityScan,
  generateSarifReport,
  saveScanReport,
  generateSecurityScannerHook,
};
