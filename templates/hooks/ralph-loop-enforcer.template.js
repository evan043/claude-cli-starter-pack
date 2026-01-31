/**
 * Ralph Loop Enforcer Hook
 *
 * Monitors test execution and enforces continuous test-fix cycles.
 * Triggers when tests fail and ensures fixes are applied before proceeding.
 *
 * Event: PostToolUse (after Bash commands)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateFile: '.claude/ralph-loop.json',
  maxIterations: 10,
  sameFailureThreshold: 3, // Stop if same failure occurs this many times
  testPatterns: [
    /npm\s+test/,
    /npx\s+playwright\s+test/,
    /npx\s+cypress\s+run/,
    /npx\s+vitest/,
    /npx\s+jest/,
    /pytest/,
    /cargo\s+test/,
    /go\s+test/,
  ],
  failurePatterns: [
    { pattern: /FAIL\s+(.+)/, type: 'jest' },
    { pattern: /✖\s+(\d+)\s+failing/, type: 'mocha' },
    { pattern: /(\d+)\s+failed/, type: 'playwright' },
    { pattern: /FAILED\s+(.+)/, type: 'pytest' },
    { pattern: /Error:\s+(.+)/, type: 'generic' },
    { pattern: /AssertionError:\s+(.+)/, type: 'assertion' },
    { pattern: /Expected\s+(.+)\s+to\s+(equal|be|match)/, type: 'expect' },
    { pattern: /Timeout\s+of\s+\d+ms\s+exceeded/, type: 'timeout' },
  ],
};

/**
 * Load Ralph loop state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save Ralph loop state
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
 * Check if command is a test command
 */
function isTestCommand(command) {
  return CONFIG.testPatterns.some((pattern) => pattern.test(command));
}

/**
 * Parse test failures from output
 */
function parseFailures(output) {
  const failures = [];

  for (const { pattern, type } of CONFIG.failurePatterns) {
    const matches = output.match(new RegExp(pattern, 'gm'));
    if (matches) {
      for (const match of matches) {
        const details = match.match(pattern);
        failures.push({
          type,
          message: details[1] || match,
          raw: match,
        });
      }
    }
  }

  // Extract file:line references
  const fileLinePattern = /([a-zA-Z0-9_\-./]+\.(ts|js|tsx|jsx|py|rs|go)):(\d+)/g;
  let fileMatch;
  while ((fileMatch = fileLinePattern.exec(output)) !== null) {
    const existing = failures.find((f) => f.file === fileMatch[1]);
    if (!existing) {
      failures.push({
        type: 'location',
        file: fileMatch[1],
        line: parseInt(fileMatch[3], 10),
        message: `Failure at ${fileMatch[1]}:${fileMatch[3]}`,
      });
    }
  }

  return failures;
}

/**
 * Check if all tests passed
 */
function allTestsPassed(output) {
  const passPatterns = [
    /All\s+\d+\s+tests?\s+passed/i,
    /✓\s+\d+\s+passing/,
    /PASS\s+/,
    /passed/i,
    /0\s+failing/,
    /0\s+failed/,
  ];

  const hasPass = passPatterns.some((p) => p.test(output));
  const hasFail = CONFIG.failurePatterns.some(({ pattern }) => pattern.test(output));

  return hasPass && !hasFail;
}

/**
 * Main hook handler
 */
module.exports = async function ralphLoopEnforcerHook(context) {
  const { tool, toolInput, toolOutput, projectRoot } = context;

  // Only process Bash tool results
  if (tool !== 'Bash') {
    return { continue: true };
  }

  const command = toolInput?.command || '';
  const output = toolOutput?.output || toolOutput?.stdout || '';

  // Check if this is a test command
  if (!isTestCommand(command)) {
    return { continue: true };
  }

  // Load current state
  let state = loadState(projectRoot);

  // If no active Ralph loop, check if we should suggest starting one
  if (!state || !state.active) {
    const failures = parseFailures(output);

    if (failures.length > 0) {
      // Tests failed but no Ralph loop active - suggest starting one
      return {
        continue: true,
        message: `
╔═══════════════════════════════════════════════════════════════╗
║  🔴 Tests Failed - ${failures.length} failure(s) detected                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  💡 Tip: Use /ralph to start a continuous test-fix loop       ║
║                                                               ║
║  The Ralph Loop will automatically:                           ║
║  • Run tests                                                  ║
║  • Analyze failures                                           ║
║  • Apply fixes                                                ║
║  • Repeat until all tests pass                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
        metadata: {
          ralphSuggested: true,
          failureCount: failures.length,
        },
      };
    }

    return { continue: true };
  }

  // Ralph loop is active - process results
  const failures = parseFailures(output);

  if (allTestsPassed(output)) {
    // SUCCESS! All tests pass
    state.active = false;
    state.completedAt = new Date().toISOString();
    state.summary = {
      ...state.summary,
      success: true,
      totalIterations: state.iteration,
    };
    saveState(projectRoot, state);

    return {
      continue: true,
      message: `
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Ralph Loop Complete - ALL TESTS PASS!                      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Iterations: ${state.iteration}/${state.maxIterations}                                     ║
║  Fixed: ${state.failures?.length || 0} failure(s)                                       ║
║  Duration: ${Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000)}s                                             ║
║                                                               ║
║  "Me fail English? That's unpossible!" - Ralph                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
      metadata: {
        ralphComplete: true,
        success: true,
        iterations: state.iteration,
      },
    };
  }

  // Tests still failing
  state.iteration = (state.iteration || 0) + 1;

  // Check for max iterations
  if (state.iteration > state.maxIterations) {
    state.active = false;
    state.completedAt = new Date().toISOString();
    state.summary = {
      ...state.summary,
      success: false,
      reason: 'max_iterations',
      remainingFailures: failures.length,
    };
    saveState(projectRoot, state);

    return {
      continue: true,
      message: `
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  Ralph Loop - Max Iterations Reached                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Iterations: ${state.maxIterations}/${state.maxIterations} (limit reached)                    ║
║  Remaining failures: ${failures.length}                                       ║
║                                                               ║
║  Use /ralph --max 15 to continue with more iterations         ║
║  Or manually fix the remaining issues                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
      metadata: {
        ralphComplete: true,
        success: false,
        reason: 'max_iterations',
      },
    };
  }

  // Check for repeated same failure
  const failureSignature = failures.map((f) => f.message).sort().join('|');
  state.lastFailureSignature = state.lastFailureSignature || '';
  state.sameFailureCount = state.lastFailureSignature === failureSignature
    ? (state.sameFailureCount || 0) + 1
    : 0;
  state.lastFailureSignature = failureSignature;

  if (state.sameFailureCount >= CONFIG.sameFailureThreshold) {
    state.active = false;
    state.summary = {
      ...state.summary,
      success: false,
      reason: 'stuck_on_same_failure',
    };
    saveState(projectRoot, state);

    return {
      continue: true,
      message: `
╔═══════════════════════════════════════════════════════════════╗
║  🔄 Ralph Loop - Stuck on Same Failure                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  The same failure occurred ${CONFIG.sameFailureThreshold} times in a row.              ║
║  This may require manual intervention or a different approach.║
║                                                               ║
║  Failure: ${failures[0]?.message?.substring(0, 45) || 'Unknown'}...  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
      metadata: {
        ralphComplete: true,
        success: false,
        reason: 'stuck',
      },
    };
  }

  // Record failures and continue
  state.failures = state.failures || [];
  state.failures.push({
    iteration: state.iteration,
    timestamp: new Date().toISOString(),
    count: failures.length,
    details: failures.slice(0, 5), // Keep first 5 for brevity
  });
  saveState(projectRoot, state);

  return {
    continue: true,
    message: `
╔═══════════════════════════════════════════════════════════════╗
║  🔄 Ralph Loop - Iteration ${state.iteration}/${state.maxIterations}                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Failures detected: ${failures.length}                                        ║
║  ${failures.slice(0, 3).map((f) => `• ${f.message?.substring(0, 50) || 'Unknown'}`).join('\n║  ')}
║                                                               ║
║  Analyzing and applying fixes...                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
    metadata: {
      ralphIteration: state.iteration,
      failureCount: failures.length,
      failures: failures.slice(0, 5),
    },
  };
};

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.parseFailures = parseFailures;
module.exports.isTestCommand = isTestCommand;
module.exports.allTestsPassed = allTestsPassed;
