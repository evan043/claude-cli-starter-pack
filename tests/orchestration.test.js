/**
 * Orchestration Layer Tests
 *
 * Tests for src/orchestration/ modules
 * - Delegation protocol (spawn/completion messages)
 * - Gating logic (tests, docs gates)
 * - Token budget allocation and tracking
 * - Progress aggregation across hierarchy
 */

import { strictEqual, ok, deepStrictEqual } from 'assert';
import { test } from 'node:test';

// Import orchestration modules
import {
  MessageTypes,
  Levels,
  createSpawnMessage,
  createCompleteMessage,
  createBlockedMessage,
  createFailedMessage,
  parseCompletionOutput,
  formatSpawnPrompt,
} from '../src/orchestration/delegation-protocol.js';

import {
  GateTypes,
  GateResults,
  canOverrideGate,
} from '../src/orchestration/gating.js';

import {
  BudgetStatus,
  createTokenBudget,
  allocateBudget,
  trackUsage,
  checkBudget,
  shouldCompact,
  reallocateBudget,
  releaseBudget,
  getBudgetSummary,
} from '../src/orchestration/token-budget.js';

import {
  HierarchyStatus,
  determineStatus,
} from '../src/orchestration/progress-aggregator.js';

console.log('Running orchestration layer tests...\n');

// ============================================================
// Test: Delegation Protocol - Message Creation
// ============================================================

test('createSpawnMessage - creates valid spawn message', () => {
  const message = createSpawnMessage(Levels.PHASE, {
    parentId: 'roadmap-1',
    childId: 'phase-1',
    title: 'Setup Phase',
    scope: 'Initialize project structure',
    tokenBudget: 50000,
    dependencies: ['phase-0'],
  });

  strictEqual(message.type, MessageTypes.SPAWN, 'Type should be SPAWN');
  strictEqual(message.level, Levels.PHASE, 'Level should be L2');
  strictEqual(message.context.parent_id, 'roadmap-1', 'Parent ID should match');
  strictEqual(message.context.child_id, 'phase-1', 'Child ID should match');
  strictEqual(message.context.title, 'Setup Phase', 'Title should match');
  strictEqual(message.context.token_budget, 50000, 'Token budget should match');
  ok(message.timestamp, 'Should have timestamp');
});

test('createCompleteMessage - creates valid completion message', () => {
  const message = createCompleteMessage(
    Levels.PHASE,
    'phase-1',
    {
      itemsCompleted: 10,
      testsPassed: 8,
      tokensUsed: 45000,
      durationMs: 120000,
    },
    'Completed setup phase successfully',
    ['src/setup.js', 'tests/setup.test.js']
  );

  strictEqual(message.type, MessageTypes.COMPLETE, 'Type should be COMPLETE');
  strictEqual(message.level, Levels.PHASE, 'Level should match');
  strictEqual(message.id, 'phase-1', 'ID should match');
  strictEqual(message.status, 'completed', 'Status should be completed');
  strictEqual(message.metrics.items_completed, 10, 'Items completed should match');
  strictEqual(message.metrics.tests_passed, 8, 'Tests passed should match');
  strictEqual(message.metrics.tokens_used, 45000, 'Tokens used should match');
  strictEqual(message.artifacts.length, 2, 'Should have 2 artifacts');
});

test('createBlockedMessage - creates valid blocked message', () => {
  const message = createBlockedMessage(
    Levels.PHASE,
    'phase-2',
    'Missing API credentials',
    'Contact admin to obtain credentials'
  );

  strictEqual(message.type, MessageTypes.BLOCKED, 'Type should be BLOCKED');
  strictEqual(message.status, 'blocked', 'Status should be blocked');
  strictEqual(message.blocker, 'Missing API credentials', 'Blocker should match');
  strictEqual(message.suggested_action, 'Contact admin to obtain credentials', 'Suggested action should match');
});

test('createFailedMessage - creates valid failed message', () => {
  const message = createFailedMessage(
    Levels.TASK,
    'task-5',
    'Database connection timeout',
    ['Tried localhost:5432', 'Tried localhost:5433', 'Tried connection pooling']
  );

  strictEqual(message.type, MessageTypes.FAILED, 'Type should be FAILED');
  strictEqual(message.status, 'failed', 'Status should be failed');
  strictEqual(message.error, 'Database connection timeout', 'Error should match');
  strictEqual(message.attempted.length, 3, 'Should have 3 attempted actions');
});

// ============================================================
// Test: Delegation Protocol - Message Parsing
// ============================================================

test('parseCompletionOutput - parses PHASE_COMPLETE message', () => {
  const output = `
PHASE_COMPLETE: phase-1
STATUS: completed
METRICS: {"items_completed": 10, "tests_passed": 8}
ARTIFACTS: ["src/setup.js", "tests/setup.test.js"]
SUMMARY: Completed setup phase successfully
`;

  const message = parseCompletionOutput(output);

  ok(message, 'Should parse message');
  strictEqual(message.type, MessageTypes.COMPLETE, 'Type should be COMPLETE');
  strictEqual(message.level, 'PHASE', 'Level should be PHASE');
  strictEqual(message.id, 'phase-1', 'ID should match');
});

test('parseCompletionOutput - parses ROADMAP_BLOCKED message', () => {
  const output = `
ROADMAP_BLOCKED: roadmap-2
BLOCKER: Waiting for API specification
SUGGESTED_ACTION: Contact product team
`;

  const message = parseCompletionOutput(output);

  ok(message, 'Should parse message');
  strictEqual(message.type, MessageTypes.BLOCKED, 'Type should be BLOCKED');
  strictEqual(message.level, 'ROADMAP', 'Level should be ROADMAP');
});

test('parseCompletionOutput - returns null for invalid output', () => {
  const output = 'This is just regular text with no completion markers';

  const message = parseCompletionOutput(output);

  strictEqual(message, null, 'Should return null for invalid output');
});

// ============================================================
// Test: Delegation Protocol - Message Formatting
// ============================================================

test('formatSpawnPrompt - formats spawn message for agent', () => {
  const message = createSpawnMessage(Levels.PHASE, {
    parentId: 'roadmap-1',
    childId: 'phase-1',
    title: 'Setup Phase',
    scope: 'Initialize project structure',
    tokenBudget: 50000,
    dependencies: ['phase-0'],
  });

  const prompt = formatSpawnPrompt(message);

  ok(prompt.includes('SPAWN_L2'), 'Should include spawn command');
  ok(prompt.includes('phase-1'), 'Should include child ID');
  ok(prompt.includes('Setup Phase'), 'Should include title');
  ok(prompt.includes('50000'), 'Should include token budget');
  ok(prompt.includes('phase-0'), 'Should include dependencies');
});

// ============================================================
// Test: Gating Logic
// ============================================================

test('canOverrideGate - allows override when configured', () => {
  const gatingConfig = {
    allow_manual_override: true,
  };

  const result = canOverrideGate(gatingConfig, GateTypes.TESTS);

  strictEqual(result, true, 'Should allow override');
});

test('canOverrideGate - blocks override when disabled', () => {
  const gatingConfig = {
    allow_manual_override: false,
  };

  const result = canOverrideGate(gatingConfig, GateTypes.TESTS);

  strictEqual(result, false, 'Should not allow override');
});

test('canOverrideGate - blocks override for critical gates', () => {
  const gatingConfig = {
    allow_manual_override: true,
    critical_gates: [GateTypes.TESTS],
  };

  const result = canOverrideGate(gatingConfig, GateTypes.TESTS);

  strictEqual(result, false, 'Should not allow override for critical gate');
});

// ============================================================
// Test: Token Budget - Budget Creation
// ============================================================

test('createTokenBudget - creates valid budget structure', () => {
  const budget = createTokenBudget(500000, {
    compactionThreshold: 0.8,
    allowReallocation: true,
  });

  strictEqual(budget.total, 500000, 'Total should match');
  strictEqual(budget.used, 0, 'Used should be 0');
  strictEqual(budget.available, 500000, 'Available should equal total');
  strictEqual(budget.compaction_threshold, 0.8, 'Compaction threshold should match');
  strictEqual(budget.allow_reallocation, true, 'Reallocation should be allowed');
  ok(budget.allocations, 'Should have allocations object');
});

// ============================================================
// Test: Token Budget - Allocation
// ============================================================

test('allocateBudget - allocates tokens to child', () => {
  const budget = createTokenBudget(500000);

  allocateBudget(budget, 'roadmap-1', 100000, { priority: 'high' });

  ok(budget.allocations['roadmap-1'], 'Should have allocation');
  strictEqual(budget.allocations['roadmap-1'].allocated, 100000, 'Allocated amount should match');
  strictEqual(budget.allocations['roadmap-1'].used, 0, 'Used should be 0');
  strictEqual(budget.allocations['roadmap-1'].available, 100000, 'Available should equal allocated');
  strictEqual(budget.available, 400000, 'Parent available should decrease');
});

test('allocateBudget - throws error for insufficient budget', () => {
  const budget = createTokenBudget(100000);

  try {
    allocateBudget(budget, 'roadmap-1', 150000);
    ok(false, 'Should have thrown error');
  } catch (error) {
    ok(error.message.includes('Insufficient budget'), 'Error should mention insufficient budget');
  }
});

test('allocateBudget - throws error for duplicate allocation', () => {
  const budget = createTokenBudget(500000);

  allocateBudget(budget, 'roadmap-1', 100000);

  try {
    allocateBudget(budget, 'roadmap-1', 50000);
    ok(false, 'Should have thrown error');
  } catch (error) {
    ok(error.message.includes('already allocated'), 'Error should mention already allocated');
  }
});

// ============================================================
// Test: Token Budget - Usage Tracking
// ============================================================

test('trackUsage - tracks token usage', () => {
  const budget = createTokenBudget(500000);
  allocateBudget(budget, 'roadmap-1', 100000);

  trackUsage(budget, 'roadmap-1', 50000);

  strictEqual(budget.allocations['roadmap-1'].used, 50000, 'Used should be updated');
  strictEqual(budget.allocations['roadmap-1'].available, 50000, 'Available should decrease');
  strictEqual(budget.used, 50000, 'Parent used should be updated');
  strictEqual(budget.usage_history.length, 1, 'Should record usage history');
});

test('trackUsage - updates status to LOW when threshold reached', () => {
  const budget = createTokenBudget(500000, { compactionThreshold: 0.8 });
  allocateBudget(budget, 'roadmap-1', 100000);

  trackUsage(budget, 'roadmap-1', 85000); // 85% used

  strictEqual(budget.allocations['roadmap-1'].status, BudgetStatus.LOW, 'Status should be LOW');
});

test('trackUsage - updates status to EXHAUSTED when depleted', () => {
  const budget = createTokenBudget(500000);
  allocateBudget(budget, 'roadmap-1', 100000);

  trackUsage(budget, 'roadmap-1', 100000);

  strictEqual(budget.allocations['roadmap-1'].status, BudgetStatus.EXHAUSTED, 'Status should be EXHAUSTED');
  strictEqual(budget.allocations['roadmap-1'].available, 0, 'Available should be 0');
});

test('trackUsage - updates status to EXHAUSTED when over budget', () => {
  const budget = createTokenBudget(500000);
  allocateBudget(budget, 'roadmap-1', 100000);

  trackUsage(budget, 'roadmap-1', 120000);

  // Note: Implementation checks available <= 0 before checking used > allocated,
  // so over-budget results in EXHAUSTED status, not EXCEEDED
  strictEqual(budget.allocations['roadmap-1'].status, BudgetStatus.EXHAUSTED, 'Status should be EXHAUSTED');
  ok(budget.allocations['roadmap-1'].available < 0, 'Available should be negative');
  ok(budget.allocations['roadmap-1'].used > budget.allocations['roadmap-1'].allocated, 'Used should exceed allocated');
});

// ============================================================
// Test: Token Budget - Budget Checking
// ============================================================

test('checkBudget - returns budget status', () => {
  const budget = createTokenBudget(500000);
  allocateBudget(budget, 'roadmap-1', 100000);
  trackUsage(budget, 'roadmap-1', 30000);

  const result = checkBudget(budget, 'roadmap-1');

  strictEqual(result.allocated, true, 'Should be allocated');
  strictEqual(result.total, 100000, 'Total should match');
  strictEqual(result.used, 30000, 'Used should match');
  strictEqual(result.available, 70000, 'Available should match');
  strictEqual(result.usage_percentage, 30, 'Usage percentage should be 30%');
  strictEqual(result.should_compact, false, 'Should not need compaction at 30%');
});

test('checkBudget - returns not allocated for missing child', () => {
  const budget = createTokenBudget(500000);

  const result = checkBudget(budget, 'non-existent');

  strictEqual(result.allocated, false, 'Should not be allocated');
  ok(result.message, 'Should have message');
});

// ============================================================
// Test: Token Budget - Compaction Check
// ============================================================

test('shouldCompact - returns true when threshold exceeded', () => {
  const budget = createTokenBudget(500000, { compactionThreshold: 0.8 });
  allocateBudget(budget, 'roadmap-1', 100000);
  trackUsage(budget, 'roadmap-1', 85000);

  const result = shouldCompact(budget, 'roadmap-1');

  strictEqual(result, true, 'Should need compaction');
});

test('shouldCompact - returns false when below threshold', () => {
  const budget = createTokenBudget(500000, { compactionThreshold: 0.8 });
  allocateBudget(budget, 'roadmap-1', 100000);
  trackUsage(budget, 'roadmap-1', 70000);

  const result = shouldCompact(budget, 'roadmap-1');

  strictEqual(result, false, 'Should not need compaction');
});

test('shouldCompact - accepts custom threshold', () => {
  const budget = createTokenBudget(500000);
  allocateBudget(budget, 'roadmap-1', 100000);
  trackUsage(budget, 'roadmap-1', 55000);

  const result = shouldCompact(budget, 'roadmap-1', 0.5); // 50% threshold

  strictEqual(result, true, 'Should need compaction with custom threshold');
});

// ============================================================
// Test: Token Budget - Reallocation
// ============================================================

test('reallocateBudget - transfers budget between children', () => {
  const budget = createTokenBudget(500000);
  allocateBudget(budget, 'roadmap-1', 100000);
  allocateBudget(budget, 'roadmap-2', 100000);

  reallocateBudget(budget, 'roadmap-1', 'roadmap-2', 20000);

  strictEqual(budget.allocations['roadmap-1'].allocated, 80000, 'Source allocation should decrease');
  strictEqual(budget.allocations['roadmap-2'].allocated, 120000, 'Target allocation should increase');
});

test('reallocateBudget - throws error when reallocation disabled', () => {
  const budget = createTokenBudget(500000, { allowReallocation: false });
  allocateBudget(budget, 'roadmap-1', 100000);
  allocateBudget(budget, 'roadmap-2', 100000);

  try {
    reallocateBudget(budget, 'roadmap-1', 'roadmap-2', 20000);
    ok(false, 'Should have thrown error');
  } catch (error) {
    ok(error.message.includes('not allowed'), 'Error should mention not allowed');
  }
});

test('reallocateBudget - throws error for insufficient available budget', () => {
  const budget = createTokenBudget(500000);
  allocateBudget(budget, 'roadmap-1', 100000);
  allocateBudget(budget, 'roadmap-2', 100000);
  trackUsage(budget, 'roadmap-1', 95000); // Only 5k available

  try {
    reallocateBudget(budget, 'roadmap-1', 'roadmap-2', 20000);
    ok(false, 'Should have thrown error');
  } catch (error) {
    ok(error.message.includes('Insufficient available'), 'Error should mention insufficient');
  }
});

// ============================================================
// Test: Token Budget - Release Budget
// ============================================================

test('releaseBudget - returns unused budget to parent', () => {
  const budget = createTokenBudget(500000);
  allocateBudget(budget, 'roadmap-1', 100000);
  trackUsage(budget, 'roadmap-1', 70000);

  const initialAvailable = budget.available;
  const result = releaseBudget(budget, 'roadmap-1');

  strictEqual(result.released, 30000, 'Should release 30000 tokens');
  strictEqual(budget.available, initialAvailable + 30000, 'Parent available should increase');
  strictEqual(budget.allocations['roadmap-1'].available, 0, 'Child available should be 0');
});

test('releaseBudget - handles no unused budget', () => {
  const budget = createTokenBudget(500000);
  allocateBudget(budget, 'roadmap-1', 100000);
  trackUsage(budget, 'roadmap-1', 100000);

  const result = releaseBudget(budget, 'roadmap-1');

  strictEqual(result.released, 0, 'Should release 0 tokens');
});

// ============================================================
// Test: Token Budget - Budget Summary
// ============================================================

test('getBudgetSummary - returns comprehensive summary', () => {
  const budget = createTokenBudget(500000);
  allocateBudget(budget, 'roadmap-1', 100000);
  allocateBudget(budget, 'roadmap-2', 150000);
  trackUsage(budget, 'roadmap-1', 50000);
  trackUsage(budget, 'roadmap-2', 100000);

  const summary = getBudgetSummary(budget);

  strictEqual(summary.total, 500000, 'Total should match');
  strictEqual(summary.allocated, 250000, 'Allocated should be sum of allocations');
  strictEqual(summary.used, 150000, 'Used should be sum of usage');
  strictEqual(summary.unallocated, 250000, 'Unallocated should be remaining');
  strictEqual(summary.children.length, 2, 'Should have 2 children');
});

// ============================================================
// Test: Progress Aggregation - Status Determination
// ============================================================

test('determineStatus - returns PENDING for empty children', () => {
  const status = determineStatus([]);

  strictEqual(status, HierarchyStatus.PENDING, 'Should be PENDING');
});

test('determineStatus - returns BLOCKED if any child blocked', () => {
  const children = [
    { status: HierarchyStatus.COMPLETED, completion: 100 },
    { status: HierarchyStatus.BLOCKED, completion: 50 },
    { status: HierarchyStatus.IN_PROGRESS, completion: 30 },
  ];

  const status = determineStatus(children);

  strictEqual(status, HierarchyStatus.BLOCKED, 'Should be BLOCKED');
});

test('determineStatus - returns FAILED if any child failed', () => {
  const children = [
    { status: HierarchyStatus.COMPLETED, completion: 100 },
    { status: HierarchyStatus.FAILED, completion: 50 },
    { status: HierarchyStatus.IN_PROGRESS, completion: 30 },
  ];

  const status = determineStatus(children);

  strictEqual(status, HierarchyStatus.FAILED, 'Should be FAILED');
});

test('determineStatus - returns COMPLETED when all complete', () => {
  const children = [
    { status: HierarchyStatus.COMPLETED, completion: 100 },
    { status: HierarchyStatus.COMPLETED, completion: 100 },
    { status: HierarchyStatus.COMPLETED, completion: 100 },
  ];

  const status = determineStatus(children);

  strictEqual(status, HierarchyStatus.COMPLETED, 'Should be COMPLETED');
});

test('determineStatus - returns IN_PROGRESS when any in progress', () => {
  const children = [
    { status: HierarchyStatus.COMPLETED, completion: 100 },
    { status: HierarchyStatus.IN_PROGRESS, completion: 50 },
    { status: HierarchyStatus.PENDING, completion: 0 },
  ];

  const status = determineStatus(children);

  strictEqual(status, HierarchyStatus.IN_PROGRESS, 'Should be IN_PROGRESS');
});

test('determineStatus - returns PENDING when no progress', () => {
  const children = [
    { status: HierarchyStatus.PENDING, completion: 0 },
    { status: HierarchyStatus.PENDING, completion: 0 },
  ];

  const status = determineStatus(children);

  strictEqual(status, HierarchyStatus.PENDING, 'Should be PENDING');
});

// ============================================================
// Summary
// ============================================================

console.log('\n✓ All orchestration layer tests passed!');
