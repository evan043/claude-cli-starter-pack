# Security Scanner - Quick Start Guide

One-page reference for CCASP Vision Mode Security Scanner.

## Installation

```bash
# npm audit - included with npm
npm --version

# pip-audit - recommended for Python
pip install pip-audit

# OSV Scanner - optional, multi-ecosystem
# Download: https://github.com/google/osv-scanner
```

## Quick Usage

### 1. Scan Everything
```javascript
import { scanPackages, generateSecurityReport } from './scanner.js';

const results = scanPackages();
console.log(generateSecurityReport(results));
```

### 2. Block Vulnerable Packages
```javascript
import { shouldBlockInstall } from './scanner.js';

if (shouldBlockInstall('package-name', 'high', results)) {
  throw new Error('Package blocked: security vulnerabilities detected');
}
```

### 3. Get Blocked Package List
```javascript
import { mergeVulnerabilities, identifyBlockedPackages } from './scanner.js';

const merged = mergeVulnerabilities(results);
const blocked = identifyBlockedPackages(merged, 'high');

blocked.packages.forEach(pkg => {
  console.log(`Blocked: ${pkg}`);
});
```

## API Cheat Sheet

| Function | Purpose | Returns |
|----------|---------|---------|
| `scanPackages(packages, cwd)` | Run all scanners | Scan results |
| `mergeVulnerabilities(results)` | Combine & dedupe | Merged vulns |
| `identifyBlockedPackages(merged, threshold)` | Find blocked packages | Block list |
| `generateSecurityReport(results, options)` | Format report | String |
| `shouldBlockInstall(pkg, severity, results)` | Block decision | Boolean |

## Severity Levels

| Level | Priority | Default Action |
|-------|----------|----------------|
| critical | 5 | Block |
| high | 4 | Block |
| moderate | 3 | Allow |
| low | 2 | Allow |
| info | 1 | Allow |

## Common Patterns

### Pattern 1: Pre-Install Check
```javascript
import { scanPackages, shouldBlockInstall } from './scanner.js';

function checkBeforeInstall(packageName) {
  const results = scanPackages();

  if (shouldBlockInstall(packageName, 'high', results)) {
    console.error(`❌ ${packageName} blocked: security vulnerabilities`);
    return false;
  }

  console.log(`✅ ${packageName} is safe to install`);
  return true;
}
```

### Pattern 2: Vulnerability Report
```javascript
import { scanPackages, generateSecurityReport } from './scanner.js';

function generateReport(format = 'text') {
  const results = scanPackages();
  return generateSecurityReport(results, { format });
}

// Text report
console.log(generateReport('text'));

// JSON report
const json = JSON.parse(generateReport('json'));
```

### Pattern 3: Custom Threshold
```javascript
import { scanPackages, mergeVulnerabilities, identifyBlockedPackages } from './scanner.js';

function getBlockedPackages(threshold = 'critical') {
  const results = scanPackages();
  const merged = mergeVulnerabilities(results);
  return identifyBlockedPackages(merged, threshold);
}

// Only block critical
const critical = getBlockedPackages('critical');

// Block moderate and above
const moderate = getBlockedPackages('moderate');
```

## Report Output Example

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

============================================================
```

## Troubleshooting

### No Tools Found
```
npm not found - skipping npm audit
pip-audit not found - skipping Python scan
osv-scanner not found - skipping OSV scan
```
**Solution:** Install at least one security tool (see Installation above)

### No Dependency Files
```
package.json not found - skipping npm audit
requirements.txt not found - skipping pip audit
No lockfiles found - skipping OSV scan
```
**Solution:** Run scanner in a directory with dependency files

### Parse Errors
```
Failed to parse npm audit output
```
**Solution:** Update npm to latest version, check JSON output manually

## Environment Variables

None required. All configuration is via function parameters.

## Performance

- **Small projects (<100 deps):** ~5-10 seconds
- **Large projects (>500 deps):** ~30-60 seconds
- **Buffer size:** 10MB max output per tool

## File Locations

```
src/vision/security/
├── index.js           # Module exports
├── npm-audit.js       # npm audit wrapper
├── pip-audit.js       # pip-audit wrapper
├── osv-scanner.js     # OSV Scanner wrapper
├── scanner.js         # Main aggregator
├── README.md          # Full documentation
├── QUICK_START.md     # This file
└── example.js         # Usage examples
```

## Return Value Structures

### scanPackages() Result
```javascript
{
  npm: { vulnerabilities: [...], metadata: {...} },
  pip: { vulnerabilities: [...], metadata: {...} },
  osv: { vulnerabilities: [...], metadata: {...} },
  timestamp: "2026-02-05T12:34:56.789Z",
  cwd: "/path/to/project"
}
```

### mergeVulnerabilities() Result
```javascript
{
  vulnerabilities: [...],
  byPackage: Map<string, array>,
  metadata: {
    total: 15,
    critical: 2,
    high: 5,
    moderate: 6,
    low: 2,
    info: 0,
    sources: { npm: 10, pip: 3, osv: 2 }
  }
}
```

### identifyBlockedPackages() Result
```javascript
{
  packages: ["lodash", "moment"],
  count: 2,
  threshold: "high",
  reasons: Map<string, {
    severity: "high",
    count: 3,
    vulnerabilities: [...]
  }>
}
```

---

**Need more details?** See `README.md` for full API reference.

**Want to test?** Run `node src/vision/security/example.js`
