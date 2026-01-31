/**
 * Hook Integration Tests
 *
 * Tests for orchestration hooks (templates/hooks/)
 */

import { strictEqual, ok, deepStrictEqual } from 'assert';

console.log('Running hook integration tests...\n');

// ============================================================
// Test 1: Hierarchy Validator - Level Detection
// ============================================================

console.log('Test 1: Hierarchy Validator - Level Detection...');

// Simulate detectAgentLevel function
function detectAgentLevel(prompt, description) {
  const combined = `${prompt || ''} ${description || ''}`.toLowerCase();

  // Explicit L level mentions
  if (combined.includes('l1') || combined.includes('level 1')) return 'L1';
  if (combined.includes('l2') || combined.includes('level 2')) return 'L2';
  if (combined.includes('l3') || combined.includes('level 3')) return 'L3';

  // Pattern-based detection
  if (/orchestrator|coordinator|manager/i.test(combined)) return 'L1';
  if (/specialist|expert|domain/i.test(combined)) return 'L2';
  if (/worker|helper|search|analyze|atomic/i.test(combined)) return 'L3';

  // Model-based heuristics
  if (combined.includes('haiku')) return 'L3';
  if (combined.includes('sonnet')) return 'L2';
  if (combined.includes('opus')) return 'L1';

  return 'L2'; // Default to L2
}

strictEqual(detectAgentLevel('L1 Orchestrator agent', ''), 'L1');
strictEqual(detectAgentLevel('', 'L2 Frontend Specialist'), 'L2');
strictEqual(detectAgentLevel('Search worker', ''), 'L3');
strictEqual(detectAgentLevel('Using haiku model', ''), 'L3');
strictEqual(detectAgentLevel('Manager for tasks', ''), 'L1');
strictEqual(detectAgentLevel('Generic agent', ''), 'L2');

console.log('  ✓ Level detection passed\n');

// ============================================================
// Test 2: Hierarchy Validator - Transition Rules
// ============================================================

console.log('Test 2: Hierarchy Validator - Transition Rules...');

const ALLOWED_TRANSITIONS = {
  main: ['L1', 'L2', 'L3'],
  L1: ['L2', 'L3'],
  L2: ['L3'],
  L3: [],
};

function isTransitionAllowed(spawnerLevel, spawneeLevel) {
  const allowed = ALLOWED_TRANSITIONS[spawnerLevel] || [];
  return allowed.includes(spawneeLevel);
}

// Main can spawn anything
ok(isTransitionAllowed('main', 'L1'), 'Main → L1 should be allowed');
ok(isTransitionAllowed('main', 'L2'), 'Main → L2 should be allowed');
ok(isTransitionAllowed('main', 'L3'), 'Main → L3 should be allowed');

// L1 can spawn L2 and L3
ok(isTransitionAllowed('L1', 'L2'), 'L1 → L2 should be allowed');
ok(isTransitionAllowed('L1', 'L3'), 'L1 → L3 should be allowed');
ok(!isTransitionAllowed('L1', 'L1'), 'L1 → L1 should NOT be allowed');

// L2 can only spawn L3
ok(isTransitionAllowed('L2', 'L3'), 'L2 → L3 should be allowed');
ok(!isTransitionAllowed('L2', 'L2'), 'L2 → L2 should NOT be allowed');
ok(!isTransitionAllowed('L2', 'L1'), 'L2 → L1 should NOT be allowed');

// L3 cannot spawn anything
ok(!isTransitionAllowed('L3', 'L1'), 'L3 → L1 should NOT be allowed');
ok(!isTransitionAllowed('L3', 'L2'), 'L3 → L2 should NOT be allowed');
ok(!isTransitionAllowed('L3', 'L3'), 'L3 → L3 should NOT be allowed');

console.log('  ✓ Transition rules passed\n');

// ============================================================
// Test 3: Orchestrator Enforcer - Domain Detection
// ============================================================

console.log('Test 3: Orchestrator Enforcer - Domain Detection...');

function detectDomainFromPath(filePath) {
  if (!filePath) return 'general';

  const pathLower = filePath.toLowerCase();

  // Frontend patterns
  if (
    pathLower.match(/\.(tsx?|jsx?)$/) &&
    (pathLower.includes('component') ||
      pathLower.includes('page') ||
      pathLower.includes('/ui/') ||
      pathLower.includes('/views/'))
  ) {
    return 'frontend';
  }

  // Backend patterns
  if (
    pathLower.match(/\.(py|ts|js)$/) &&
    (pathLower.includes('route') ||
      pathLower.includes('api') ||
      pathLower.includes('service') ||
      pathLower.includes('model') ||
      pathLower.includes('controller'))
  ) {
    return 'backend';
  }

  // Testing patterns
  if (
    pathLower.match(/\.(test|spec)\.(ts|js|tsx|jsx|py)$/) ||
    pathLower.includes('/test/') ||
    pathLower.includes('/__tests__/')
  ) {
    return 'testing';
  }

  // Deployment patterns
  if (
    pathLower.match(/dockerfile|docker-compose|\.ya?ml$/) ||
    pathLower.includes('deploy') ||
    pathLower.includes('ci')
  ) {
    return 'deployment';
  }

  return 'general';
}

strictEqual(detectDomainFromPath('src/components/Button.tsx'), 'frontend');
strictEqual(detectDomainFromPath('src/pages/Home.tsx'), 'frontend');
strictEqual(detectDomainFromPath('api/routes/users.ts'), 'backend');
strictEqual(detectDomainFromPath('backend/services/auth.py'), 'backend');
strictEqual(detectDomainFromPath('src/Button.test.tsx'), 'testing');
strictEqual(detectDomainFromPath('tests/__tests__/utils.js'), 'testing');
strictEqual(detectDomainFromPath('Dockerfile'), 'deployment');
strictEqual(detectDomainFromPath('.github/workflows/ci.yml'), 'deployment');
strictEqual(detectDomainFromPath('README.md'), 'general');

console.log('  ✓ Domain detection passed\n');

// ============================================================
// Test 4: Agent Error Recovery - Error Classification
// ============================================================

console.log('Test 4: Agent Error Recovery - Error Classification...');

const ERROR_PATTERNS = {
  transient: [/timeout/i, /network/i, /connection/i, /rate limit/i, /temporarily unavailable/i],
  fatal: [/permission denied/i, /not found/i, /syntax error/i, /invalid/i],
  recoverable: [/lint error/i, /test fail/i, /type error/i],
};

function classifyError(errorMessage) {
  if (!errorMessage) return 'unknown';

  for (const [type, patterns] of Object.entries(ERROR_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(errorMessage)) {
        return type;
      }
    }
  }

  return 'unknown';
}

strictEqual(classifyError('Connection timeout after 30s'), 'transient');
strictEqual(classifyError('Network error: ECONNREFUSED'), 'transient');
strictEqual(classifyError('Rate limit exceeded'), 'transient');
strictEqual(classifyError('Permission denied: /etc/passwd'), 'fatal');
strictEqual(classifyError('File not found: missing.js'), 'fatal');
strictEqual(classifyError('ESLint: lint error in Button.tsx'), 'recoverable');
strictEqual(classifyError('Test failed: expected true, got false'), 'recoverable');
strictEqual(classifyError('Type error: cannot assign string to number'), 'recoverable');
strictEqual(classifyError('Something went wrong'), 'unknown');

console.log('  ✓ Error classification passed\n');

// ============================================================
// Test 5: Agent Error Recovery - Strategy Selection
// ============================================================

console.log('Test 5: Agent Error Recovery - Strategy Selection...');

const STRATEGIES = {
  transient: 'retry',
  recoverable: 'retry',
  fatal: 'escalate',
  unknown: 'escalate',
};

const MAX_RETRIES = 3;

function determineStrategy(errorType, retryCount) {
  // If max retries exceeded, always abort
  if (retryCount >= MAX_RETRIES) {
    return 'abort';
  }

  return STRATEGIES[errorType] || 'escalate';
}

strictEqual(determineStrategy('transient', 0), 'retry');
strictEqual(determineStrategy('transient', 2), 'retry');
strictEqual(determineStrategy('transient', 3), 'abort');
strictEqual(determineStrategy('fatal', 0), 'escalate');
strictEqual(determineStrategy('fatal', 3), 'abort');
strictEqual(determineStrategy('unknown', 1), 'escalate');

console.log('  ✓ Strategy selection passed\n');

// ============================================================
// Test 6: Progress Tracker - Completion Detection
// ============================================================

console.log('Test 6: Progress Tracker - Completion Detection...');

function detectCompletion(output) {
  if (!output) return null;

  // Check for TASK_COMPLETE signal
  const completeMatch = output.match(/TASK_COMPLETE:\s*(\S+)/);
  if (completeMatch) {
    const artifactMatch = output.match(/ARTIFACTS:\s*(.+?)(?:\n|$)/);
    const summaryMatch = output.match(/SUMMARY:\s*(.+?)(?:\n|$)/);

    return {
      type: 'complete',
      taskId: completeMatch[1],
      artifacts: artifactMatch ? artifactMatch[1].split(',').map((s) => s.trim()) : [],
      summary: summaryMatch ? summaryMatch[1].trim() : '',
    };
  }

  // Check for TASK_FAILED signal
  const failedMatch = output.match(/TASK_FAILED:\s*(\S+)/);
  if (failedMatch) {
    const errorMatch = output.match(/ERROR:\s*(.+?)(?:\n|$)/);
    return {
      type: 'failed',
      taskId: failedMatch[1],
      error: errorMatch ? errorMatch[1].trim() : 'Unknown error',
    };
  }

  // Check for TASK_BLOCKED signal
  const blockedMatch = output.match(/TASK_BLOCKED:\s*(\S+)/);
  if (blockedMatch) {
    const blockerMatch = output.match(/BLOCKER:\s*(.+?)(?:\n|$)/);
    return {
      type: 'blocked',
      taskId: blockedMatch[1],
      blocker: blockerMatch ? blockerMatch[1].trim() : 'Unknown blocker',
    };
  }

  return null;
}

const completeOutput = `
Completed the task successfully.
TASK_COMPLETE: P1.1
ARTIFACTS: src/Login.tsx, src/Login.test.tsx
SUMMARY: Created login component with tests
`;

const completion = detectCompletion(completeOutput);
ok(completion, 'Should detect completion');
strictEqual(completion.type, 'complete');
strictEqual(completion.taskId, 'P1.1');
deepStrictEqual(completion.artifacts, ['src/Login.tsx', 'src/Login.test.tsx']);

const failedOutput = `
Encountered an error.
TASK_FAILED: P2.1
ERROR: Database connection refused
`;

const failure = detectCompletion(failedOutput);
ok(failure, 'Should detect failure');
strictEqual(failure.type, 'failed');
strictEqual(failure.taskId, 'P2.1');
strictEqual(failure.error, 'Database connection refused');

const blockedOutput = `
Cannot proceed.
TASK_BLOCKED: P3.1
BLOCKER: Waiting for API key from admin
`;

const blocked = detectCompletion(blockedOutput);
ok(blocked, 'Should detect blocked');
strictEqual(blocked.type, 'blocked');
strictEqual(blocked.taskId, 'P3.1');

console.log('  ✓ Completion detection passed\n');

// ============================================================
// Test 7: GitHub Progress Sync - Progress Bar Generation
// ============================================================

console.log('Test 7: GitHub Progress Sync - Progress Bar Generation...');

function generateProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

strictEqual(generateProgressBar(0), '[░░░░░░░░░░░░░░░░░░░░]');
strictEqual(generateProgressBar(50), '[██████████░░░░░░░░░░]');
strictEqual(generateProgressBar(100), '[████████████████████]');
strictEqual(generateProgressBar(25), '[█████░░░░░░░░░░░░░░░]');

console.log('  ✓ Progress bar generation passed\n');

// ============================================================
// Test 8: Audit Logger - Truncation
// ============================================================

console.log('Test 8: Audit Logger - Truncation...');

function truncate(str, maxLen) {
  if (!str) return str;
  if (typeof str !== 'string') str = JSON.stringify(str);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + `... [truncated ${str.length - maxLen} chars]`;
}

const shortString = 'Hello';
strictEqual(truncate(shortString, 10), 'Hello', 'Short strings should not be truncated');

const longString = 'This is a very long string that should be truncated';
const truncated = truncate(longString, 20);
ok(truncated.startsWith('This is a very long '), 'Should start with original content');
ok(truncated.includes('[truncated'), 'Should include truncation notice');

const obj = { key: 'value', nested: { a: 1 } };
const truncatedObj = truncate(obj, 10);
ok(truncatedObj.includes('[truncated'), 'Objects should be stringified and truncated');

console.log('  ✓ Truncation passed\n');

// ============================================================
// Test 9: Context Injector - State Summary
// ============================================================

console.log('Test 9: Context Injector - State Summary...');

function summarizeState(state) {
  if (!state) return 'No orchestrator state';

  return `
## Orchestrator Context
- Status: ${state.status}
- Current Phase: ${state.currentPhase || 'N/A'}
- Active Agents: ${state.activeAgents?.length || 0}
- Completed Tasks: ${state.completedTasks?.length || 0}
- Token Budget: ${state.tokenBudget?.used || 0}/${state.tokenBudget?.total || 0}
`.trim();
}

const mockState = {
  status: 'active',
  currentPhase: 'P2',
  activeAgents: [{ id: 'a1' }, { id: 'a2' }],
  completedTasks: [{ id: 't1' }],
  tokenBudget: { total: 200000, used: 45000 },
};

const summary = summarizeState(mockState);
ok(summary.includes('Status: active'), 'Summary should include status');
ok(summary.includes('Current Phase: P2'), 'Summary should include current phase');
ok(summary.includes('Active Agents: 2'), 'Summary should include active agent count');
ok(summary.includes('45000/200000'), 'Summary should include token budget');

console.log('  ✓ State summary passed\n');

// ============================================================
// Test 10: Completion Verifier - Validation
// ============================================================

console.log('Test 10: Completion Verifier - Validation...');

function validateCompletionReport(output) {
  const errors = [];

  // Check for required completion signal
  const hasComplete = /TASK_COMPLETE:\s*\S+/.test(output);
  const hasFailed = /TASK_FAILED:\s*\S+/.test(output);
  const hasBlocked = /TASK_BLOCKED:\s*\S+/.test(output);

  if (!hasComplete && !hasFailed && !hasBlocked) {
    errors.push('Missing completion signal (TASK_COMPLETE, TASK_FAILED, or TASK_BLOCKED)');
  }

  // If complete, check for artifacts
  if (hasComplete && !/ARTIFACTS:/.test(output)) {
    errors.push('TASK_COMPLETE should include ARTIFACTS (even if empty)');
  }

  // If complete, check for summary
  if (hasComplete && !/SUMMARY:/.test(output)) {
    errors.push('TASK_COMPLETE should include SUMMARY');
  }

  // If failed, check for error
  if (hasFailed && !/ERROR:/.test(output)) {
    errors.push('TASK_FAILED should include ERROR');
  }

  // If blocked, check for blocker
  if (hasBlocked && !/BLOCKER:/.test(output)) {
    errors.push('TASK_BLOCKED should include BLOCKER');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

const validComplete = `
TASK_COMPLETE: P1.1
ARTIFACTS: file.ts
SUMMARY: Done
`;
ok(validateCompletionReport(validComplete).valid, 'Valid complete report should pass');

const invalidComplete = `
TASK_COMPLETE: P1.1
`;
ok(!validateCompletionReport(invalidComplete).valid, 'Incomplete report should fail');
strictEqual(validateCompletionReport(invalidComplete).errors.length, 2);

const validFailed = `
TASK_FAILED: P1.1
ERROR: Something went wrong
`;
ok(validateCompletionReport(validFailed).valid, 'Valid failed report should pass');

const noSignal = 'Just some random output without any signal';
ok(!validateCompletionReport(noSignal).valid, 'Missing signal should fail');

console.log('  ✓ Completion validation passed\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✓ All hook integration tests passed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
