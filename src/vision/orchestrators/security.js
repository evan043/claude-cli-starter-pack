/**
 * Orchestrator Security Phase
 * Handles security scanning and vulnerability checking
 */

import { loadVision, updateVision } from '../state-manager.js';
import {
  scanPackages,
  mergeVulnerabilities,
  identifyBlockedPackages,
  generateSecurityReport,
  shouldBlockInstall
} from '../security/index.js';
import { log, transitionStage, OrchestratorStage } from './lifecycle.js';

/**
 * Run security scan phase
 */
export async function scanSecurity(orchestrator) {
  transitionStage(orchestrator, OrchestratorStage.SECURITY);

  if (!orchestrator.config.security.enabled) {
    log(orchestrator, 'info', 'Security scanning disabled');
    return {
      success: true,
      stage: orchestrator.stage,
      skipped: true
    };
  }

  try {
    log(orchestrator, 'info', 'Running security scan...');

    // Run all available scanners
    const scanResults = await scanPackages(orchestrator.projectRoot);

    // Merge and deduplicate vulnerabilities
    const merged = mergeVulnerabilities(scanResults);

    // Identify blocked packages based on threshold
    const blocked = identifyBlockedPackages(
      merged,
      orchestrator.config.security.blockThreshold
    );

    // Generate report
    const report = generateSecurityReport(scanResults, {
      format: 'text',
      threshold: orchestrator.config.security.blockThreshold
    });

    orchestrator.securityResults = {
      scanResults,
      merged,
      blocked,
      report,
      hasBlockedPackages: blocked.length > 0
    };

    // Save security results
    await updateVision(orchestrator.projectRoot, orchestrator.vision.slug, (vision) => {
      vision.security = {
        lastScan: new Date().toISOString(),
        vulnerabilityCount: merged.length,
        blockedPackages: blocked,
        threshold: orchestrator.config.security.blockThreshold
      };
      vision.orchestrator.stage = orchestrator.stage;
      return vision;
    });

    orchestrator.vision = await loadVision(orchestrator.projectRoot, orchestrator.vision.slug);

    log(orchestrator, 'info', 'Security scan complete', {
      vulnerabilities: merged.length,
      blocked: blocked.length
    });

    // Warn if blocked packages found
    if (blocked.length > 0) {
      log(orchestrator, 'warn', `${blocked.length} package(s) blocked due to security vulnerabilities`);
      console.log('\n' + report);
    }

    return {
      success: true,
      stage: orchestrator.stage,
      results: orchestrator.securityResults
    };

  } catch (error) {
    log(orchestrator, 'error', `Security scan failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      stage: orchestrator.stage
    };
  }
}

/**
 * Check if a package should be blocked
 */
export function isPackageBlocked(orchestrator, packageName) {
  if (!orchestrator.config.security.enabled || !orchestrator.securityResults) {
    return false;
  }

  return shouldBlockInstall(
    packageName,
    orchestrator.config.security.blockThreshold,
    orchestrator.securityResults.scanResults
  );
}
