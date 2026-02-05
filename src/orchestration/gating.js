/**
 * Gating logic for roadmap transitions
 *
 * Implements test and documentation gates that must pass before advancing
 * between roadmaps in an epic.
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Gate types that can be enforced
 */
export const GateTypes = {
  TESTS: 'tests',
  DOCS: 'docs',
  MANUAL: 'manual'
};

/**
 * Gate result statuses
 */
export const GateResults = {
  PASS: 'pass',
  FAIL: 'fail',
  SKIP: 'skip'
};

/**
 * Check all gates for roadmap advancement
 *
 * @param {string} roadmapPath - Path to roadmap directory
 * @param {Object} gatingConfig - Gating configuration
 * @param {boolean} [gatingConfig.require_tests] - Require tests to pass
 * @param {boolean} [gatingConfig.require_docs] - Require documentation
 * @param {boolean} [gatingConfig.allow_manual_override] - Allow manual override
 * @returns {Promise<Object>} Gate check results
 */
export async function checkGates(roadmapPath, gatingConfig) {
  const results = {
    overall: GateResults.PASS,
    gates: {},
    can_override: gatingConfig.allow_manual_override || false
  };

  // Check test gate
  if (gatingConfig.require_tests) {
    results.gates.tests = await checkTestGate(roadmapPath);
    if (results.gates.tests.result === GateResults.FAIL) {
      results.overall = GateResults.FAIL;
    }
  }

  // Check documentation gate
  if (gatingConfig.require_docs) {
    results.gates.docs = checkDocsGate(roadmapPath);
    if (results.gates.docs.result === GateResults.FAIL) {
      results.overall = GateResults.FAIL;
    }
  }

  return results;
}

/**
 * Check if tests pass for the completed roadmap
 *
 * Tries common test commands in order:
 * - npm test / npm run test
 * - pytest
 * - go test ./...
 * - cargo test
 *
 * @param {string} roadmapPath - Path to roadmap directory
 * @returns {Promise<Object>} Test gate result
 */
export async function checkTestGate(roadmapPath) {
  try {
    // Try common test commands
    const testCommands = [
      'npm test',
      'npm run test',
      'pytest',
      'pytest tests/',
      'go test ./...',
      'cargo test',
      'mvn test'
    ];

    for (const cmd of testCommands) {
      try {
        // Execute test command with timeout
        execSync(cmd, {
          stdio: 'pipe',
          timeout: 300000, // 5 minute timeout
          cwd: roadmapPath
        });

        return {
          result: GateResults.PASS,
          command: cmd,
          message: 'All tests passed'
        };
      } catch (e) {
        // Exit code 127 means command not found
        if (e.status === 127) {
          continue; // Try next command
        }

        // Command exists but tests failed
        return {
          result: GateResults.FAIL,
          command: cmd,
          message: `Tests failed: ${e.message}`,
          error: e.stderr ? e.stderr.toString() : e.message
        };
      }
    }

    // No test command found
    return {
      result: GateResults.SKIP,
      message: 'No test command found',
      details: 'Tried: ' + testCommands.join(', ')
    };
  } catch (error) {
    return {
      result: GateResults.FAIL,
      message: `Test gate error: ${error.message}`
    };
  }
}

/**
 * Check if documentation exists for the roadmap
 *
 * Verifies that:
 * - Phases directory exists
 * - Each phase has exploration directory
 * - Required docs are present (EXPLORATION_SUMMARY.md, PHASE_BREAKDOWN.md)
 *
 * @param {string} roadmapPath - Path to roadmap directory
 * @returns {Object} Documentation gate result
 */
export function checkDocsGate(roadmapPath) {
  const requiredDocs = [
    'EXPLORATION_SUMMARY.md',
    'PHASE_BREAKDOWN.md'
  ];

  // Check if roadmap has phases directory
  const phasesDir = join(roadmapPath, 'phases');
  if (!existsSync(phasesDir)) {
    return {
      result: GateResults.FAIL,
      message: 'No phases directory found',
      details: `Expected directory: ${phasesDir}`
    };
  }

  // Check each phase has exploration docs
  let phases;
  try {
    phases = readdirSync(phasesDir);
  } catch (error) {
    return {
      result: GateResults.FAIL,
      message: `Cannot read phases directory: ${error.message}`
    };
  }

  if (phases.length === 0) {
    return {
      result: GateResults.FAIL,
      message: 'No phases found in roadmap'
    };
  }

  const missingDocs = [];

  for (const phase of phases) {
    const explorationDir = join(phasesDir, phase, 'exploration');

    // Check if exploration directory exists
    if (!existsSync(explorationDir)) {
      missingDocs.push(`${phase}/exploration/ directory`);
      continue;
    }

    // Check each required doc
    for (const doc of requiredDocs) {
      const docPath = join(explorationDir, doc);
      if (!existsSync(docPath)) {
        missingDocs.push(`${phase}/${doc}`);
      }
    }
  }

  if (missingDocs.length > 0) {
    return {
      result: GateResults.FAIL,
      message: `Missing documentation: ${missingDocs.length} items`,
      details: missingDocs
    };
  }

  return {
    result: GateResults.PASS,
    message: 'All documentation present',
    phases_checked: phases.length
  };
}

/**
 * Request manual gate override from user
 *
 * Formats a question for user decision on gate override.
 *
 * @param {string} gateType - Type of gate that failed
 * @param {string} failureReason - Reason gate failed
 * @returns {Object} Override request object
 */
export function requestManualOverride(gateType, failureReason) {
  return {
    type: 'gate_override_request',
    gate_type: gateType,
    failure_reason: failureReason,
    question: `Gate '${gateType}' failed: ${failureReason}. Override and continue?`,
    options: [
      {
        label: 'Override and continue',
        value: 'override',
        description: 'Skip this gate and proceed to next roadmap'
      },
      {
        label: 'Fix issues first',
        value: 'fix',
        description: 'Return to fix the issues before advancing'
      },
      {
        label: 'Abort epic',
        value: 'abort',
        description: 'Stop epic execution entirely'
      }
    ]
  };
}

/**
 * Apply gate override decision
 *
 * @param {Object} gateResult - Original gate result
 * @param {string} decision - Override decision (override|fix|abort)
 * @param {string} reason - Reason for override
 * @returns {Object} Updated gate result
 */
export function applyGateOverride(gateResult, decision, reason) {
  if (decision === 'override') {
    return {
      ...gateResult,
      result: GateResults.PASS,
      overridden: true,
      override_reason: reason,
      override_timestamp: new Date().toISOString()
    };
  }

  return gateResult;
}

/**
 * Format gate results for display
 *
 * @param {Object} results - Gate check results
 * @returns {string} Formatted output
 */
export function formatGateResults(results) {
  let output = `\nGate Check Results: ${results.overall}\n`;
  output += '='.repeat(50) + '\n\n';

  for (const [gateType, gateResult] of Object.entries(results.gates)) {
    output += `${gateType.toUpperCase()}: ${gateResult.result}\n`;
    output += `  ${gateResult.message}\n`;

    if (gateResult.details) {
      if (Array.isArray(gateResult.details)) {
        output += `  Missing:\n`;
        for (const detail of gateResult.details) {
          output += `    - ${detail}\n`;
        }
      } else {
        output += `  ${gateResult.details}\n`;
      }
    }

    if (gateResult.overridden) {
      output += `  [OVERRIDDEN: ${gateResult.override_reason}]\n`;
    }

    output += '\n';
  }

  if (results.overall === GateResults.FAIL && results.can_override) {
    output += '* Manual override is allowed for this epic\n';
  }

  return output;
}

/**
 * Log gate decision to execution log
 *
 * @param {string} epicPath - Path to epic directory
 * @param {string} roadmapId - Roadmap ID being gated
 * @param {Object} gateResults - Gate check results
 * @param {string} [decision] - Override decision if applicable
 */
export function logGateDecision(epicPath, roadmapId, gateResults, decision = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'gate_check',
    roadmap_id: roadmapId,
    results: gateResults,
    decision: decision
  };

  // In a real implementation, this would append to an execution log file
  // For now, we just return the structured log entry
  return logEntry;
}

/**
 * Check if gate can be overridden
 *
 * @param {Object} gatingConfig - Gating configuration
 * @param {string} gateType - Type of gate
 * @returns {boolean} True if override is allowed
 */
export function canOverrideGate(gatingConfig, gateType) {
  if (!gatingConfig.allow_manual_override) {
    return false;
  }

  // Some gates might be critical and not overridable
  if (gatingConfig.critical_gates && gatingConfig.critical_gates.includes(gateType)) {
    return false;
  }

  return true;
}
