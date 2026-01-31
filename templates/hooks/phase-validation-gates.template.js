#!/usr/bin/env node
/**
 * Phase Validation Gates Hook
 *
 * 5-gate validation system for phased development.
 * Ensures quality standards are met before auto-chaining to next phase.
 *
 * Event: PostToolUse (custom trigger)
 * Trigger: Phase completion markers
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 *
 * Gates:
 * 1. Tasks Complete - All phase tasks marked done
 * 2. Files Created - Expected output files exist
 * 3. Tests Passing - Required tests pass (if configured)
 * 4. No Errors - No blocking errors detected
 * 5. Token Budget - Within configured token limits
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  gates: {
    tasks_complete: { enabled: true, required: true },
    files_created: { enabled: true, required: false },
    tests_passing: { enabled: true, required: false },
    no_errors: { enabled: true, required: true },
    token_budget: { enabled: true, required: false },
  },
  auto_chain_on_pass: false,    // Automatically start next phase
  report_failures: true,        // Log detailed failure reports
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const STATE_FILE = path.join(process.cwd(), '.claude', 'hooks', 'config', 'phase-validation-state.json');

/**
 * Load configuration
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.phase_validation || {}) };
    }
  } catch (e) {
    // Use defaults
  }
  return DEFAULT_CONFIG;
}

/**
 * Load validation state
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    // Use defaults
  }
  return {
    last_validation: null,
    gate_results: {},
    phases_validated: [],
  };
}

/**
 * Save validation state
 */
function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error(`[phase-validation] Error saving state: ${e.message}`);
  }
}

/**
 * Gate 1: Check if all tasks are complete
 */
async function checkTasksComplete(phase, result) {
  const tasks = phase.tasks || [];
  const completed = tasks.filter(t => t.status === 'completed');

  const passed = completed.length >= tasks.length;
  const message = passed
    ? `All tasks complete (${tasks.length}/${tasks.length})`
    : `${tasks.length - completed.length} tasks incomplete`;

  return { passed, message, completed: completed.length, total: tasks.length };
}

/**
 * Gate 2: Check if expected files were created
 */
async function checkFilesCreated(phase, result) {
  const expectedFiles = phase.expectedOutputFiles || [];
  const actualFiles = result?.filesCreated || [];

  if (expectedFiles.length === 0) {
    return { passed: true, message: 'No expected files specified', expected: 0, found: 0 };
  }

  const missingFiles = expectedFiles.filter(file => {
    const fullPath = path.resolve(file);
    return !fs.existsSync(fullPath) && !actualFiles.includes(file);
  });

  const passed = missingFiles.length === 0;
  const message = passed
    ? `All expected files created (${expectedFiles.length})`
    : `Missing files: ${missingFiles.slice(0, 3).join(', ')}${missingFiles.length > 3 ? '...' : ''}`;

  return { passed, message, expected: expectedFiles.length, missing: missingFiles };
}

/**
 * Gate 3: Check if tests are passing
 */
async function checkTestsPassing(phase, result) {
  if (!phase.requireTests) {
    return { passed: true, message: 'Tests not required for this phase' };
  }

  const testResults = result?.testResults || { passed: 0, failed: 0, total: 0 };

  if (testResults.total === 0) {
    return { passed: false, message: 'No tests executed (requireTests=true)', testResults };
  }

  const passed = testResults.failed === 0;
  const message = passed
    ? `All tests passing (${testResults.passed}/${testResults.total})`
    : `${testResults.failed} tests failed`;

  return { passed, message, testResults };
}

/**
 * Gate 4: Check for errors
 */
async function checkNoErrors(phase, result) {
  const errors = result?.errors || [];

  const passed = errors.length === 0;
  const message = passed
    ? 'No errors detected'
    : `${errors.length} error(s) detected`;

  return { passed, message, errors: errors.slice(0, 5) };
}

/**
 * Gate 5: Check token budget
 */
async function checkTokenBudget(phase, result) {
  const budget = phase.tokenBudget || Infinity;
  const used = result?.tokens || 0;

  if (budget === Infinity) {
    return { passed: true, message: `No token budget specified (used: ${used.toLocaleString()})`, used };
  }

  const passed = used <= budget;
  const percentage = Math.round((used / budget) * 100);
  const message = passed
    ? `Within budget: ${used.toLocaleString()}/${budget.toLocaleString()} (${percentage}%)`
    : `Budget exceeded: ${used.toLocaleString()}/${budget.toLocaleString()} (${percentage}%)`;

  return { passed, message, used, budget, percentage };
}

/**
 * Run all validation gates
 */
async function validatePhase(phase, result, config) {
  const gateConfig = config.gates;
  const gateResults = {};
  let allPassed = true;
  let requiredPassed = true;

  const gates = [
    { id: 'tasks_complete', name: 'Tasks Complete', fn: checkTasksComplete },
    { id: 'files_created', name: 'Files Created', fn: checkFilesCreated },
    { id: 'tests_passing', name: 'Tests Passing', fn: checkTestsPassing },
    { id: 'no_errors', name: 'No Errors', fn: checkNoErrors },
    { id: 'token_budget', name: 'Token Budget', fn: checkTokenBudget },
  ];

  console.log(`\n[phase-validation] Running validation gates for Phase ${phase.phase_number || '?'}`);
  console.log('─'.repeat(60));

  for (const gate of gates) {
    const gateSettings = gateConfig[gate.id] || { enabled: true, required: false };

    if (!gateSettings.enabled) {
      gateResults[gate.id] = { skipped: true, message: 'Gate disabled' };
      console.log(`⏭️  ${gate.name}: Skipped (disabled)`);
      continue;
    }

    const gateResult = await gate.fn(phase, result);
    gateResults[gate.id] = gateResult;

    if (gateResult.passed) {
      console.log(`✅ ${gate.name}: ${gateResult.message}`);
    } else {
      console.log(`❌ ${gate.name}: ${gateResult.message}`);
      allPassed = false;
      if (gateSettings.required) {
        requiredPassed = false;
      }
    }
  }

  console.log('─'.repeat(60));

  if (allPassed) {
    console.log('✅ All gates passed\n');
  } else if (requiredPassed) {
    console.log('⚠️  Some optional gates failed (required gates passed)\n');
  } else {
    console.log('❌ Required gates failed\n');
  }

  return {
    allPassed,
    requiredPassed,
    gateResults,
    phase_number: phase.phase_number,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Main hook handler
 */
module.exports = async function phaseValidationGates(context) {
  const approve = () => ({ continue: true });

  try {
    const config = loadConfig();

    if (!config.enabled) {
      return approve();
    }

    // This hook is typically called programmatically with phase data
    // For now, return approve and let the caller use validatePhase directly
    return approve();
  } catch (error) {
    console.error(`[phase-validation] Error: ${error.message}`);
    return approve();
  }
};

// Export validation functions for programmatic use
module.exports.validatePhase = validatePhase;
module.exports.gates = {
  checkTasksComplete,
  checkFilesCreated,
  checkTestsPassing,
  checkNoErrors,
  checkTokenBudget,
};

// Direct execution support
if (require.main === module) {
  const config = loadConfig();

  // Example phase for testing
  const testPhase = {
    phase_number: 1,
    tasks: [
      { id: 'T1', status: 'completed' },
      { id: 'T2', status: 'completed' },
      { id: 'T3', status: 'pending' },
    ],
    expectedOutputFiles: [],
    requireTests: false,
    tokenBudget: 50000,
  };

  const testResult = {
    tokens: 25000,
    errors: [],
    filesCreated: [],
    testResults: { passed: 0, failed: 0, total: 0 },
  };

  validatePhase(testPhase, testResult, config).then(result => {
    console.log('\nValidation Result:');
    console.log(JSON.stringify(result, null, 2));
  });
}
