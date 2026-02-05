/**
 * Example usage of Vision Mode Security Scanner
 *
 * Run with: node src/vision/security/example.js
 */

import {
  scanPackages,
  mergeVulnerabilities,
  identifyBlockedPackages,
  generateSecurityReport,
  shouldBlockInstall
} from './scanner.js';

async function main() {
  console.log('Vision Mode Security Scanner - Example\n');

  // Example 1: Full scan of current directory
  console.log('=== Example 1: Full Security Scan ===\n');

  const results = scanPackages();

  if (!results.npm && !results.pip && !results.osv) {
    console.log('No security tools available or no dependency files found.');
    console.log('\nInstall security tools:');
    console.log('  npm audit (included with npm)');
    console.log('  pip install pip-audit');
    console.log('  https://github.com/google/osv-scanner\n');
    return;
  }

  // Generate and display report
  const report = generateSecurityReport(results, {
    format: 'text',
    threshold: 'high',
    includeDetails: true
  });

  console.log(report);

  // Example 2: Merge and analyze vulnerabilities
  console.log('\n=== Example 2: Vulnerability Analysis ===\n');

  const merged = mergeVulnerabilities(results);
  console.log(`Total unique vulnerabilities: ${merged.metadata.total}`);
  console.log(`Packages affected: ${merged.byPackage.size}`);

  // Example 3: Identify blocked packages
  console.log('\n=== Example 3: Blocked Packages ===\n');

  const blocked = identifyBlockedPackages(merged, 'high');

  if (blocked.count > 0) {
    console.log(`Found ${blocked.count} packages that should be blocked:\n`);

    blocked.packages.forEach(pkg => {
      const reason = blocked.reasons.get(pkg);
      console.log(`${pkg}:`);
      console.log(`  Highest Severity: ${reason.severity.toUpperCase()}`);
      console.log(`  Total Vulnerabilities: ${reason.count}`);
      console.log(`  Details:`);

      reason.vulnerabilities.slice(0, 3).forEach(vuln => {
        console.log(`    - ${vuln.id} (${vuln.severity})`);
        if (vuln.url) {
          console.log(`      ${vuln.url}`);
        }
      });

      if (reason.vulnerabilities.length > 3) {
        console.log(`    ... and ${reason.vulnerabilities.length - 3} more`);
      }
      console.log('');
    });
  } else {
    console.log('No packages blocked at HIGH threshold.');
    console.log('All dependencies are secure or have only low/moderate vulnerabilities.\n');
  }

  // Example 4: Check specific package
  console.log('=== Example 4: Check Specific Package ===\n');

  const testPackages = ['express', 'lodash', 'requests', 'django'];

  testPackages.forEach(pkg => {
    const shouldBlock = shouldBlockInstall(pkg, 'high', results);
    const status = shouldBlock ? '❌ BLOCKED' : '✅ ALLOWED';
    console.log(`${status} - ${pkg}`);
  });

  // Example 5: JSON export
  console.log('\n=== Example 5: JSON Export ===\n');

  const jsonReport = generateSecurityReport(results, {
    format: 'json',
    threshold: 'high'
  });

  console.log('JSON report generated. Sample:');
  const jsonData = JSON.parse(jsonReport);
  console.log(JSON.stringify({
    summary: jsonData.summary,
    blocked: {
      count: jsonData.blocked.count,
      threshold: jsonData.blocked.threshold,
      packages: jsonData.blocked.packages.slice(0, 3)
    }
  }, null, 2));

  // Example 6: Different severity thresholds
  console.log('\n=== Example 6: Severity Thresholds ===\n');

  const thresholds = ['critical', 'high', 'moderate', 'low'];

  thresholds.forEach(threshold => {
    const blockedAtLevel = identifyBlockedPackages(merged, threshold);
    console.log(`${threshold.toUpperCase()}: ${blockedAtLevel.count} packages blocked`);
  });
}

// Run examples
main().catch(console.error);
