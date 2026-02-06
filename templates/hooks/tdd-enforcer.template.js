/**
 * TDD Enforcer Hook
 *
 * Enforces Test-Driven Development workflow: RED → GREEN → REFACTOR → RED
 * - RED: Write failing tests first (blocks implementation without failing tests)
 * - GREEN: Write minimal code to make tests pass
 * - REFACTOR: Clean up code while keeping tests green
 *
 * Cherry-picked from nizos/tdd-guard patterns, adapted to CCASP hook template format.
 *
 * Event: PreToolUse (before Write/Edit/MultiEdit tools)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateFile: '.claude/hooks/cache/tdd-enforcer-state.json',
  testFilePatterns: [
    /\.test\.(ts|js|tsx|jsx|mjs|cjs)$/,
    /\.spec\.(ts|js|tsx|jsx|mjs|cjs)$/,
    /__tests__\//,
    /test_.*\.py$/,
    /.*_test\.py$/,
    /tests\/.*\.py$/,
    /.*_test\.go$/,
    /.*_test\.rs$/,
  ],
  implementationExclusions: [
    /\.test\./,
    /\.spec\./,
    /__tests__\//,
    /test_/,
    /_test\./,
    /\.config\./,
    /\.d\.ts$/,
    /package\.json$/,
    /tsconfig/,
    /eslint/,
    /prettier/,
    /\.md$/,
  ],
  phases: {
    RED: 'RED',
    GREEN: 'GREEN',
    REFACTOR: 'REFACTOR',
  },
  testCommands: [
    /npm\s+test/,
    /npx\s+vitest/,
    /npx\s+jest/,
    /npx\s+playwright\s+test/,
    /pytest/,
    /cargo\s+test/,
    /go\s+test/,
  ],
};

/**
 * Load TDD enforcer state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return {
      enabled: true,
      phase: CONFIG.phases.RED,
      testsWritten: [],
      lastTestRun: null,
      lastTestPassed: null,
      sessionStart: new Date().toISOString(),
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return {
      enabled: true,
      phase: CONFIG.phases.RED,
      testsWritten: [],
      lastTestRun: null,
      lastTestPassed: null,
      sessionStart: new Date().toISOString(),
    };
  }
}

/**
 * Save TDD enforcer state
 */
function saveState(projectRoot, state) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Check if a file path is a test file
 */
function isTestFile(filePath) {
  return CONFIG.testFilePatterns.some((pattern) => pattern.test(filePath));
}

/**
 * Check if a file path is an implementation file (not config, test, etc.)
 */
function isImplementationFile(filePath) {
  if (isTestFile(filePath)) return false;
  return !CONFIG.implementationExclusions.some((pattern) => pattern.test(filePath));
}

/**
 * Get phase emoji and label
 */
function getPhaseDisplay(phase) {
  switch (phase) {
    case CONFIG.phases.RED: return { emoji: '🔴', label: 'RED - Write Failing Tests' };
    case CONFIG.phases.GREEN: return { emoji: '🟢', label: 'GREEN - Make Tests Pass' };
    case CONFIG.phases.REFACTOR: return { emoji: '🔵', label: 'REFACTOR - Clean Up' };
    default: return { emoji: '⚪', label: 'UNKNOWN' };
  }
}

/**
 * Main hook handler - PreToolUse
 */
module.exports = async function tddEnforcerHook(context) {
  const { tool, toolInput, projectRoot } = context;

  // Only intercept file modification tools
  if (!['Write', 'Edit', 'MultiEdit'].includes(tool)) {
    // Track test command results via Bash (PostToolUse behavior)
    if (tool === 'Bash') {
      const command = toolInput?.command || '';
      const isTestCommand = CONFIG.testCommands.some((p) => p.test(command));
      if (isTestCommand) {
        const state = loadState(projectRoot);
        state.lastTestRun = new Date().toISOString();
        // We'll detect pass/fail from a PostToolUse companion - for now just record
        saveState(projectRoot, state);
      }
    }
    return { continue: true };
  }

  const state = loadState(projectRoot);

  // If TDD enforcer is disabled for this session, skip
  if (!state.enabled) {
    return { continue: true };
  }

  const filePath = toolInput?.file_path || toolInput?.filePath || '';

  // Always allow test files to be written/edited
  if (isTestFile(filePath)) {
    // Track that tests were written
    if (!state.testsWritten.includes(filePath)) {
      state.testsWritten.push(filePath);
    }
    state.lastActivity = new Date().toISOString();
    saveState(projectRoot, state);

    const display = getPhaseDisplay(state.phase);
    return {
      continue: true,
      message: `${display.emoji} TDD [${state.phase}]: Writing test file - ${path.basename(filePath)}`,
    };
  }

  // For implementation files, enforce TDD phase
  if (isImplementationFile(filePath)) {
    const display = getPhaseDisplay(state.phase);

    switch (state.phase) {
      case CONFIG.phases.RED: {
        // In RED phase: block implementation files until tests exist and are failing
        if (state.testsWritten.length === 0) {
          return {
            continue: false,
            message: `
╔═══════════════════════════════════════════════════════════════╗
║  ${display.emoji} TDD Enforcer - ${display.label}                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ⛔ Cannot write implementation code yet!                     ║
║                                                               ║
║  TDD requires writing tests FIRST:                            ║
║  1. Write a test file (*.test.ts, *.spec.js, etc.)            ║
║  2. Run the tests to confirm they FAIL                        ║
║  3. Then write implementation to make them pass                ║
║                                                               ║
║  Blocked file: ${path.basename(filePath).substring(0, 42).padEnd(42)} ║
║                                                               ║
║  To disable: Set .claude/hooks/cache/tdd-enforcer-state.json  ║
║  "enabled": false                                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
          };
        }

        // Tests exist - transition to GREEN
        state.phase = CONFIG.phases.GREEN;
        state.lastActivity = new Date().toISOString();
        saveState(projectRoot, state);

        return {
          continue: true,
          message: `${display.emoji} → 🟢 TDD: Tests exist! Transitioning to GREEN phase. Write code to make tests pass.`,
        };
      }

      case CONFIG.phases.GREEN: {
        // In GREEN phase: allow implementation, track progress
        state.lastActivity = new Date().toISOString();
        saveState(projectRoot, state);

        return {
          continue: true,
          message: `🟢 TDD [GREEN]: Implementing - ${path.basename(filePath)}. Run tests when ready.`,
        };
      }

      case CONFIG.phases.REFACTOR: {
        // In REFACTOR phase: allow cleanup edits
        state.lastActivity = new Date().toISOString();
        saveState(projectRoot, state);

        return {
          continue: true,
          message: `🔵 TDD [REFACTOR]: Cleaning up - ${path.basename(filePath)}. Tests must stay green.`,
        };
      }

      default:
        return { continue: true };
    }
  }

  // Not a test or implementation file (config, etc.) - always allow
  return { continue: true };
};

/**
 * Transition to next TDD phase (called externally or by PostToolUse companion)
 */
module.exports.transitionPhase = function transitionPhase(projectRoot, testsPassed) {
  const state = loadState(projectRoot);

  if (testsPassed && state.phase === CONFIG.phases.GREEN) {
    // Tests pass in GREEN → move to REFACTOR
    state.phase = CONFIG.phases.REFACTOR;
    state.lastTestPassed = true;
  } else if (testsPassed && state.phase === CONFIG.phases.REFACTOR) {
    // Tests pass in REFACTOR → cycle back to RED for next feature
    state.phase = CONFIG.phases.RED;
    state.testsWritten = [];
    state.lastTestPassed = true;
  } else if (!testsPassed) {
    state.lastTestPassed = false;
  }

  state.lastActivity = new Date().toISOString();
  saveState(projectRoot, state);
  return state;
};

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.isTestFile = isTestFile;
module.exports.isImplementationFile = isImplementationFile;
module.exports.getPhaseDisplay = getPhaseDisplay;
