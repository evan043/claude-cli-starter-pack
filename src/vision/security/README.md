# Vision Mode Security Scanner

Phase 6 of the Vision Mode roadmap - Automated vulnerability scanning for package installations.

## Overview

The security scanner aggregates vulnerability data from multiple sources to provide comprehensive security analysis:

- **npm audit** - Node.js package vulnerabilities
- **pip-audit/safety** - Python package vulnerabilities
- **OSV Scanner** - Google's Open Source Vulnerabilities database (multi-ecosystem)

## Installation

### Required Tools

```bash
# npm audit (comes with npm)
npm --version

# pip-audit (Python, recommended)
pip install pip-audit

# OSV Scanner (optional, multi-ecosystem)
# Download from: https://github.com/google/osv-scanner
```

### Optional Tools

```bash
# safety (Python fallback if pip-audit unavailable)
pip install safety
```

## Usage

### Basic Scan

```javascript
import { scanPackages, generateSecurityReport } from './scanner.js';

// Scan all packages in current directory
const results = scanPackages();

// Generate text report
const report = generateSecurityReport(results);
console.log(report);
```

### Scan Specific Packages

```javascript
const results = scanPackages({
  npm: ['express', 'lodash'],
  pip: ['requests', 'django']
});
```

### JSON Report

```javascript
const jsonReport = generateSecurityReport(results, { format: 'json' });
```

### Block Package Installation

```javascript
import { shouldBlockInstall } from './scanner.js';

const shouldBlock = shouldBlockInstall('vulnerable-package', 'high', scanResults);
if (shouldBlock) {
  console.error('Package blocked due to security vulnerabilities');
  process.exit(1);
}
```

### Identify Blocked Packages

```javascript
import { mergeVulnerabilities, identifyBlockedPackages } from './scanner.js';

const merged = mergeVulnerabilities(results);
const blocked = identifyBlockedPackages(merged, 'high');

console.log(`Blocked ${blocked.count} packages:`);
blocked.packages.forEach(pkg => {
  const reason = blocked.reasons.get(pkg);
  console.log(`- ${pkg}: ${reason.severity} (${reason.count} vulnerabilities)`);
});
```

## Severity Levels

| Level | Description | Block by Default |
|-------|-------------|------------------|
| critical | Exploitable vulnerabilities with severe impact | Yes |
| high | Serious vulnerabilities requiring immediate attention | Yes |
| moderate | Notable vulnerabilities worth addressing | No |
| low | Minor issues with low risk | No |
| info | Informational findings | No |

## Block Threshold

Default threshold: **high** (blocks critical and high severity vulnerabilities)

Change threshold:

```javascript
// Block only critical
const blocked = identifyBlockedPackages(merged, 'critical');

// Block moderate and above
const blocked = identifyBlockedPackages(merged, 'moderate');
```

## API Reference

### scanPackages(packages, cwd)

Scan packages for vulnerabilities using all available tools.

**Parameters:**
- `packages` (object, optional): `{ npm: string[], pip: string[] }`
- `cwd` (string, optional): Working directory (default: process.cwd())

**Returns:** Object with npm, pip, and osv results

### mergeVulnerabilities(results)

Merge and deduplicate vulnerabilities from all sources.

**Parameters:**
- `results` (object): Output from scanPackages()

**Returns:** Object with merged vulnerabilities and metadata

### identifyBlockedPackages(mergedVulns, threshold)

Identify packages that should be blocked based on severity threshold.

**Parameters:**
- `mergedVulns` (object): Output from mergeVulnerabilities()
- `threshold` (string, optional): Severity threshold (default: 'high')

**Returns:** Object with blocked packages and reasons

### generateSecurityReport(scanResults, options)

Generate formatted security report.

**Parameters:**
- `scanResults` (object): Output from scanPackages()
- `options` (object, optional):
  - `format` (string): 'text' or 'json' (default: 'text')
  - `threshold` (string): Severity threshold (default: 'high')
  - `includeDetails` (boolean): Include vulnerability details (default: true)

**Returns:** Formatted report string

### shouldBlockInstall(packageName, severity, scanResults)

Determine if a package installation should be blocked.

**Parameters:**
- `packageName` (string): Package to check
- `severity` (string, optional): Severity threshold (default: 'high')
- `scanResults` (object, optional): Output from scanPackages()

**Returns:** Boolean (true if should block)

## Individual Scanner APIs

### npm-audit.js

```javascript
import { runNpmAudit, parseNpmAuditResults, classifyVulnerabilities } from './npm-audit.js';

const auditOutput = runNpmAudit([], process.cwd());
const parsed = parseNpmAuditResults(auditOutput);
const classified = classifyVulnerabilities(parsed);
```

### pip-audit.js

```javascript
import { runPipAudit, parsePipAuditResults, classifyVulnerabilities } from './pip-audit.js';

const auditOutput = runPipAudit([], process.cwd());
const parsed = parsePipAuditResults(auditOutput);
const classified = classifyVulnerabilities(parsed);
```

### osv-scanner.js

```javascript
import { runOSVScan, parseOSVResults } from './osv-scanner.js';

const osvOutput = runOSVScan(null, process.cwd());
const parsed = parseOSVResults(osvOutput);
```

## Error Handling

All scanner functions handle missing tools gracefully:

- If a tool is not installed, a warning is logged and scanning continues
- `null` is returned if a tool is unavailable
- No errors are thrown - allows partial scanning

## Integration with Vision Mode

This module will be integrated into Vision Mode's package recommendation workflow:

1. Tech stack detection identifies packages
2. Security scanner checks for vulnerabilities
3. High/critical vulnerabilities trigger blocks
4. Safe packages are recommended to user

## Example Output

```
============================================================
SECURITY SCAN REPORT
============================================================

Scan Time: 2026-02-05T12:34:56.789Z
Working Directory: /path/to/project

SUMMARY
------------------------------------------------------------
Total Vulnerabilities: 15
  Critical: 2
  High:     5
  Moderate: 6
  Low:      2
  Info:     0

Sources: npm(10) pip(3) osv(2)

BLOCKED PACKAGES
------------------------------------------------------------
Threshold: HIGH
Blocked Count: 3

lodash:
  Severity: HIGH
  Vulnerabilities: 2
    - GHSA-xxxx-yyyy-zzzz (high) [npm]
      https://npmjs.com/advisories/1234
    - CVE-2021-12345 (high) [osv]
      https://osv.dev/vulnerability/CVE-2021-12345

============================================================
```

## Future Enhancements

- [ ] Cache scan results to avoid repeated scans
- [ ] Support custom vulnerability databases
- [ ] Integration with GitHub Security Advisories
- [ ] Whitelist/ignore list for accepted vulnerabilities
- [ ] Automated fix suggestions (npm audit fix, pip install --upgrade)
