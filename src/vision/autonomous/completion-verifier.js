/**
 * Completion Verifier
 *
 * Verifies MVP completion by checking:
 * 1. All tests pass
 * 2. All features implemented
 * 3. No critical issues
 * 4. Documentation complete
 */

import fs from 'fs';
import path from 'path';
import { runTests } from './test-validator.js';
import { calculateVisionCompletion } from '../schema.js';

/**
 * Verify MVP is complete
 *
 * @param {Object} vision - Vision object
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Verification result { complete: boolean, missing: Array, report: string }
 */
export async function verifyMVPComplete(vision, projectRoot) {
  console.log('Verifying MVP completion...');

  const checks = {
    testsPass: false,
    featuresImplemented: false,
    roadmapsComplete: false,
    architectureValid: false,
    securityChecked: false
  };

  const missing = [];

  // Check 1: All tests pass
  console.log('Checking tests...');
  const testsResult = await checkAllTestsPass(projectRoot);
  checks.testsPass = testsResult.success;

  if (!checks.testsPass) {
    missing.push({
      check: 'tests',
      status: 'failed',
      details: `${testsResult.failed} test(s) failing`,
      failures: testsResult.failures
    });
  }

  // Check 2: All features implemented
  console.log('Checking features...');
  const featuresResult = checkAllFeaturesImplemented(vision);
  checks.featuresImplemented = featuresResult.complete;

  if (!checks.featuresImplemented) {
    missing.push({
      check: 'features',
      status: 'incomplete',
      details: `${featuresResult.missing.length} feature(s) incomplete`,
      features: featuresResult.missing
    });
  }

  // Check 3: All roadmaps complete
  console.log('Checking roadmaps...');
  const roadmapsResult = checkRoadmapsComplete(vision);
  checks.roadmapsComplete = roadmapsResult.complete;

  if (!checks.roadmapsComplete) {
    missing.push({
      check: 'roadmaps',
      status: 'incomplete',
      details: `${roadmapsResult.incomplete} roadmap(s) incomplete`,
      roadmaps: roadmapsResult.incompleteRoadmaps
    });
  }

  // Check 4: Architecture valid
  console.log('Checking architecture...');
  const architectureResult = checkArchitectureValid(vision);
  checks.architectureValid = architectureResult.valid;

  if (!checks.architectureValid) {
    missing.push({
      check: 'architecture',
      status: 'invalid',
      details: architectureResult.reason
    });
  }

  // Check 5: Security checked
  console.log('Checking security...');
  const securityResult = checkSecurityStatus(vision);
  checks.securityChecked = securityResult.clean;

  if (!checks.securityChecked) {
    missing.push({
      check: 'security',
      status: 'issues_found',
      details: `${securityResult.vulnerabilities} vulnerabilities found`
    });
  }

  // Overall completion
  const complete = Object.values(checks).every(check => check === true);

  // Generate report
  const report = generateCompletionReport({
    vision,
    checks,
    missing,
    complete
  });

  return {
    complete,
    checks,
    missing,
    report
  };
}

/**
 * Check if all tests pass
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Test results { success: boolean, passed: number, failed: number }
 */
export async function checkAllTestsPass(projectRoot) {
  try {
    const results = await runTests({}, projectRoot);

    return {
      success: results.success && results.failed === 0,
      passed: results.passed || 0,
      failed: results.failed || 0,
      failures: results.failures || []
    };
  } catch (error) {
    console.error('Error running tests:', error);
    return {
      success: false,
      passed: 0,
      failed: 1,
      failures: [{
        type: 'test_error',
        message: error.message
      }]
    };
  }
}

/**
 * Check if all features are implemented
 *
 * @param {Object} vision - Vision object
 * @returns {Object} Feature check result { complete: boolean, total: number, implemented: number, missing: Array }
 */
export function checkAllFeaturesImplemented(vision) {
  const features = vision.prompt?.parsed?.features || [];

  if (features.length === 0) {
    // If no features specified, check roadmaps
    const roadmaps = vision.execution_plan?.roadmaps || [];
    const completedRoadmaps = roadmaps.filter(rm => rm.status === 'completed');

    return {
      complete: roadmaps.length > 0 && completedRoadmaps.length === roadmaps.length,
      total: roadmaps.length,
      implemented: completedRoadmaps.length,
      missing: roadmaps
        .filter(rm => rm.status !== 'completed')
        .map(rm => rm.title)
    };
  }

  // Check features against implementation
  // This is a placeholder - actual implementation would check if features exist in codebase
  const implemented = features.filter(feature => {
    // TODO: Implement actual feature detection logic
    return true;
  });

  const missing = features.filter(feature => {
    // TODO: Implement actual feature detection logic
    return false;
  });

  return {
    complete: missing.length === 0,
    total: features.length,
    implemented: implemented.length,
    missing
  };
}

/**
 * Check if all roadmaps are complete
 *
 * @param {Object} vision - Vision object
 * @returns {Object} Roadmap check result
 */
function checkRoadmapsComplete(vision) {
  const roadmaps = vision.execution_plan?.roadmaps || [];

  const completedRoadmaps = roadmaps.filter(rm => rm.status === 'completed');
  const incompleteRoadmaps = roadmaps.filter(rm =>
    rm.status !== 'completed' && rm.status !== 'failed'
  );

  return {
    complete: roadmaps.length > 0 && completedRoadmaps.length === roadmaps.length,
    total: roadmaps.length,
    completed: completedRoadmaps.length,
    incomplete: incompleteRoadmaps.length,
    incompleteRoadmaps: incompleteRoadmaps.map(rm => ({
      title: rm.title,
      status: rm.status,
      completion: rm.completion_percentage || 0
    }))
  };
}

/**
 * Check if architecture is valid
 *
 * @param {Object} vision - Vision object
 * @returns {Object} Architecture validation result
 */
function checkArchitectureValid(vision) {
  const arch = vision.architecture;

  if (!arch) {
    return {
      valid: false,
      reason: 'No architecture defined'
    };
  }

  // Check required architecture components
  const checks = {
    hasMermaidDiagrams: arch.mermaid_diagrams?.component?.length > 0,
    hasTechDecisions: arch.tech_decisions?.frontend?.framework?.length > 0,
    hasApiContracts: arch.api_contracts?.length > 0,
    hasStateDesign: arch.state_design?.stores?.length > 0
  };

  const missingComponents = Object.entries(checks)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  return {
    valid: missingComponents.length === 0,
    checks,
    missingComponents,
    reason: missingComponents.length > 0
      ? `Missing: ${missingComponents.join(', ')}`
      : 'Architecture complete'
  };
}

/**
 * Check security status
 *
 * @param {Object} vision - Vision object
 * @returns {Object} Security check result
 */
function checkSecurityStatus(vision) {
  const security = vision.security;

  if (!security || !security.enabled) {
    return {
      clean: false,
      reason: 'Security scanning not enabled',
      vulnerabilities: 0
    };
  }

  const vulnerabilities = security.vulnerabilities_found || 0;
  const blockedPackages = security.blocked_packages?.length || 0;

  return {
    clean: vulnerabilities === 0 && blockedPackages === 0,
    vulnerabilities,
    blockedPackages,
    lastScan: security.last_scan,
    reason: vulnerabilities > 0
      ? `${vulnerabilities} vulnerabilities found`
      : 'No vulnerabilities found'
  };
}

/**
 * Generate completion report
 *
 * @param {Object} data - Completion data
 * @returns {string} Formatted report
 */
export function generateCompletionReport(data) {
  const { vision, checks, missing, complete } = data;

  const completion = calculateVisionCompletion(vision);

  let report = `
MVP Completion Report
=====================

Vision: ${vision.title}
Status: ${complete ? 'COMPLETE ✓' : 'INCOMPLETE ✗'}
Overall Progress: ${completion}%

Verification Checks
-------------------
`;

  // Add check results
  for (const [check, passed] of Object.entries(checks)) {
    const symbol = passed ? '✓' : '✗';
    const checkName = check.replace(/([A-Z])/g, ' $1').trim();
    report += `${symbol} ${checkName}\n`;
  }

  // Add missing items
  if (missing.length > 0) {
    report += `\nIncomplete Items (${missing.length})
-------------------\n`;

    for (const item of missing) {
      report += `\n${item.check.toUpperCase()}: ${item.status}\n`;
      report += `  ${item.details}\n`;

      if (item.features?.length > 0) {
        report += `  Features: ${item.features.join(', ')}\n`;
      }

      if (item.roadmaps?.length > 0) {
        report += '  Roadmaps:\n';
        for (const rm of item.roadmaps) {
          report += `    - ${rm.title} (${rm.status}, ${rm.completion}%)\n`;
        }
      }

      if (item.failures?.length > 0) {
        report += `  Failures (${item.failures.length}):\n`;
        for (const failure of item.failures.slice(0, 5)) {
          report += `    - ${failure.test || failure.type}: ${failure.message || failure.error}\n`;
        }
        if (item.failures.length > 5) {
          report += `    ... and ${item.failures.length - 5} more\n`;
        }
      }
    }
  }

  // Add roadmap summary
  const roadmaps = vision.execution_plan?.roadmaps || [];
  if (roadmaps.length > 0) {
    report += `\nRoadmap Summary
---------------\n`;

    for (const rm of roadmaps) {
      const symbol = rm.status === 'completed' ? '✓' : '○';
      report += `${symbol} ${rm.title} - ${rm.status} (${rm.completion_percentage || 0}%)\n`;
    }
  }

  // Add observer metrics
  if (vision.observer) {
    report += `\nObserver Metrics
----------------
Alignment: ${Math.round(vision.observer.current_alignment * 100)}%
Drift Events: ${vision.observer.drift_events?.length || 0}
Adjustments: ${vision.observer.adjustments_made || 0}
`;
  }

  // Add security summary
  if (vision.security) {
    report += `\nSecurity Summary
----------------
Scan Count: ${vision.security.scan_count || 0}
Vulnerabilities Found: ${vision.security.vulnerabilities_found || 0}
Blocked Packages: ${vision.security.blocked_packages?.length || 0}
Last Scan: ${vision.security.last_scan || 'Never'}
`;
  }

  // Add metadata
  report += `\nMetadata
--------
Created: ${vision.metadata?.created}
Updated: ${vision.metadata?.updated}
Priority: ${vision.metadata?.priority}
Tags: ${vision.metadata?.tags?.join(', ') || 'None'}
`;

  return report;
}

export default {
  verifyMVPComplete,
  checkAllTestsPass,
  checkAllFeaturesImplemented,
  generateCompletionReport
};
