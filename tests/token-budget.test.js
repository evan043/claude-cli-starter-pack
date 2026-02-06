console.log('Running token-budget tests...\n');

import { test } from 'node:test';
import { strictEqual, deepStrictEqual, ok, throws } from 'assert';
import {
  createTokenBudget,
  allocateBudget,
  trackUsage,
  checkBudget,
  shouldCompact,
  reallocateBudget,
  releaseBudget,
  getBudgetSummary,
  formatBudgetSummary,
  BudgetStatus,
  DEFAULT_COMPACTION_THRESHOLD
} from '../src/orchestration/token-budget.js';

// Test 1: Create budget with default options
test('createTokenBudget - creates budget with default options', () => {
  const budget = createTokenBudget(100000);

  strictEqual(budget.total, 100000);
  strictEqual(budget.used, 0);
  strictEqual(budget.available, 100000);
  strictEqual(budget.compaction_threshold, DEFAULT_COMPACTION_THRESHOLD);
  strictEqual(budget.allow_reallocation, true);
  deepStrictEqual(budget.allocations, {});
  deepStrictEqual(budget.usage_history, []);
  ok(budget.created_at);
  ok(budget.updated_at);
});

// Test 2: Create budget with custom options
test('createTokenBudget - creates budget with custom options', () => {
  const budget = createTokenBudget(50000, {
    compactionThreshold: 0.9,
    allowReallocation: false
  });

  strictEqual(budget.total, 50000);
  strictEqual(budget.compaction_threshold, 0.9);
  strictEqual(budget.allow_reallocation, false);
});

// Test 3: Allocate budget successfully
test('allocateBudget - allocates budget to child', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 30000, { type: 'phase' });

  strictEqual(budget.available, 70000);
  ok(budget.allocations['phase-1']);
  strictEqual(budget.allocations['phase-1'].allocated, 30000);
  strictEqual(budget.allocations['phase-1'].used, 0);
  strictEqual(budget.allocations['phase-1'].available, 30000);
  strictEqual(budget.allocations['phase-1'].status, BudgetStatus.AVAILABLE);
  deepStrictEqual(budget.allocations['phase-1'].metadata, { type: 'phase' });
});

// Test 4: Allocate budget - reject negative amount
test('allocateBudget - throws error for negative amount', () => {
  let budget = createTokenBudget(100000);

  throws(() => {
    allocateBudget(budget, 'phase-1', -5000);
  }, /Allocation amount must be positive/);
});

// Test 5: Allocate budget - reject insufficient budget
test('allocateBudget - throws error for insufficient budget', () => {
  let budget = createTokenBudget(100000);

  throws(() => {
    allocateBudget(budget, 'phase-1', 150000);
  }, /Insufficient budget/);
});

// Test 6: Allocate budget - reject duplicate allocation
test('allocateBudget - throws error for duplicate allocation', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 30000);

  throws(() => {
    allocateBudget(budget, 'phase-1', 20000);
  }, /Budget already allocated/);
});

// Test 7: Track usage - normal usage
test('trackUsage - tracks token usage for child', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 30000);
  budget = trackUsage(budget, 'phase-1', 5000);

  strictEqual(budget.allocations['phase-1'].used, 5000);
  strictEqual(budget.allocations['phase-1'].available, 25000);
  strictEqual(budget.allocations['phase-1'].status, BudgetStatus.AVAILABLE);
  strictEqual(budget.used, 5000);
  strictEqual(budget.usage_history.length, 1);
  strictEqual(budget.usage_history[0].child_id, 'phase-1');
  strictEqual(budget.usage_history[0].tokens_used, 5000);
});

// Test 8: Track usage - status changes to LOW
test('trackUsage - updates status to LOW when threshold reached', () => {
  let budget = createTokenBudget(100000, { compactionThreshold: 0.8 });
  budget = allocateBudget(budget, 'phase-1', 10000);
  budget = trackUsage(budget, 'phase-1', 8500); // 85% used

  strictEqual(budget.allocations['phase-1'].status, BudgetStatus.LOW);
});

// Test 9: Track usage - status changes to EXHAUSTED
test('trackUsage - updates status to EXHAUSTED when budget depleted', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 10000);
  budget = trackUsage(budget, 'phase-1', 10000); // 100% used

  strictEqual(budget.allocations['phase-1'].available, 0);
  strictEqual(budget.allocations['phase-1'].status, BudgetStatus.EXHAUSTED);
});

// Test 10: Track usage - status is EXHAUSTED when over budget (available <= 0 checked first)
test('trackUsage - updates status to EXHAUSTED when over budget', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 10000);
  budget = trackUsage(budget, 'phase-1', 12000); // 120% used

  strictEqual(budget.allocations['phase-1'].used, 12000);
  strictEqual(budget.allocations['phase-1'].available, -2000);
  strictEqual(budget.allocations['phase-1'].status, BudgetStatus.EXHAUSTED);
});

// Test 11: Check budget - allocated child
test('checkBudget - returns budget info for allocated child', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 10000);
  budget = trackUsage(budget, 'phase-1', 3000);

  const check = checkBudget(budget, 'phase-1');

  strictEqual(check.allocated, true);
  strictEqual(check.total, 10000);
  strictEqual(check.used, 3000);
  strictEqual(check.available, 7000);
  strictEqual(check.usage_percentage, 30);
  strictEqual(check.status, BudgetStatus.AVAILABLE);
  strictEqual(check.should_compact, false);
});

// Test 12: Check budget - unallocated child
test('checkBudget - returns not allocated for missing child', () => {
  let budget = createTokenBudget(100000);

  const check = checkBudget(budget, 'phase-999');

  strictEqual(check.allocated, false);
  ok(check.message.includes('No allocation found'));
});

// Test 13: Should compact - returns true when threshold reached
test('shouldCompact - returns true when threshold reached', () => {
  let budget = createTokenBudget(100000, { compactionThreshold: 0.8 });
  budget = allocateBudget(budget, 'phase-1', 10000);
  budget = trackUsage(budget, 'phase-1', 8500);

  strictEqual(shouldCompact(budget, 'phase-1'), true);
});

// Test 14: Should compact - returns false below threshold
test('shouldCompact - returns false when below threshold', () => {
  let budget = createTokenBudget(100000, { compactionThreshold: 0.8 });
  budget = allocateBudget(budget, 'phase-1', 10000);
  budget = trackUsage(budget, 'phase-1', 5000);

  strictEqual(shouldCompact(budget, 'phase-1'), false);
});

// Test 15: Should compact - custom threshold override
test('shouldCompact - respects custom threshold override', () => {
  let budget = createTokenBudget(100000, { compactionThreshold: 0.8 });
  budget = allocateBudget(budget, 'phase-1', 10000);
  budget = trackUsage(budget, 'phase-1', 7000); // 70% used

  strictEqual(shouldCompact(budget, 'phase-1'), false); // 80% default
  strictEqual(shouldCompact(budget, 'phase-1', 0.6), true); // 60% override
});

// Test 16: Should compact - missing child returns false
test('shouldCompact - returns false for missing child', () => {
  let budget = createTokenBudget(100000);

  strictEqual(shouldCompact(budget, 'phase-999'), false);
});

// Test 17: Reallocate budget - successful reallocation
test('reallocateBudget - reallocates tokens between children', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 30000);
  budget = allocateBudget(budget, 'phase-2', 20000);
  budget = reallocateBudget(budget, 'phase-1', 'phase-2', 5000);

  strictEqual(budget.allocations['phase-1'].allocated, 25000);
  strictEqual(budget.allocations['phase-1'].available, 25000);
  strictEqual(budget.allocations['phase-2'].allocated, 25000);
  strictEqual(budget.allocations['phase-2'].available, 25000);
});

// Test 18: Reallocate budget - not allowed
test('reallocateBudget - throws error when reallocation disabled', () => {
  let budget = createTokenBudget(100000, { allowReallocation: false });
  budget = allocateBudget(budget, 'phase-1', 30000);
  budget = allocateBudget(budget, 'phase-2', 20000);

  throws(() => {
    reallocateBudget(budget, 'phase-1', 'phase-2', 5000);
  }, /reallocation is not allowed/);
});

// Test 19: Reallocate budget - insufficient available
test('reallocateBudget - throws error for insufficient available budget', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 10000);
  budget = allocateBudget(budget, 'phase-2', 20000);
  budget = trackUsage(budget, 'phase-1', 8000); // only 2000 available

  throws(() => {
    reallocateBudget(budget, 'phase-1', 'phase-2', 5000);
  }, /Insufficient available budget/);
});

// Test 20: Release budget - returns unused tokens
test('releaseBudget - releases unused tokens to parent', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 30000);
  budget = trackUsage(budget, 'phase-1', 10000); // 20000 unused

  const initialAvailable = budget.available;
  const result = releaseBudget(budget, 'phase-1');

  strictEqual(result.released, 20000);
  strictEqual(result.budget.available, initialAvailable + 20000);
  strictEqual(result.budget.allocations['phase-1'].available, 0);
  strictEqual(result.budget.allocations['phase-1'].allocated, 10000);
});

// Test 21: Release budget - no tokens to release
test('releaseBudget - releases zero when budget fully used', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 10000);
  budget = trackUsage(budget, 'phase-1', 10000);

  const result = releaseBudget(budget, 'phase-1');

  strictEqual(result.released, 0);
});

// Test 22: Get budget summary - empty allocations
test('getBudgetSummary - returns summary with no allocations', () => {
  let budget = createTokenBudget(100000);
  const summary = getBudgetSummary(budget);

  strictEqual(summary.total, 100000);
  strictEqual(summary.allocated, 0);
  strictEqual(summary.used, 0);
  strictEqual(summary.available, 100000);
  strictEqual(summary.unallocated, 100000);
  strictEqual(summary.usage_percentage, 0);
  strictEqual(summary.children.length, 0);
  strictEqual(summary.compaction_threshold, 80);
  strictEqual(summary.allow_reallocation, true);
});

// Test 23: Get budget summary - with allocations
test('getBudgetSummary - returns summary with multiple allocations', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 30000);
  budget = allocateBudget(budget, 'phase-2', 20000);
  budget = trackUsage(budget, 'phase-1', 10000);
  budget = trackUsage(budget, 'phase-2', 5000);

  const summary = getBudgetSummary(budget);

  strictEqual(summary.total, 100000);
  strictEqual(summary.allocated, 50000);
  strictEqual(summary.used, 15000);
  strictEqual(summary.available, 50000);
  strictEqual(summary.unallocated, 50000);
  strictEqual(summary.usage_percentage, 15);
  strictEqual(summary.children.length, 2);

  const child1 = summary.children.find(c => c.child_id === 'phase-1');
  strictEqual(child1.allocated, 30000);
  strictEqual(child1.used, 10000);
  strictEqual(child1.available, 20000);
  strictEqual(child1.usage_percentage, 33);
});

// Test 24: Format budget summary - returns formatted string
test('formatBudgetSummary - returns formatted string output', () => {
  let budget = createTokenBudget(100000);
  budget = allocateBudget(budget, 'phase-1', 30000);
  budget = trackUsage(budget, 'phase-1', 10000);

  const output = formatBudgetSummary(budget);

  ok(output.includes('Token Budget Summary'));
  ok(output.includes('Total Budget:'));
  ok(output.includes('100,000'));
  ok(output.includes('phase-1'));
  ok(output.includes('30,000'));
  ok(output.includes('10,000'));
  ok(typeof output === 'string');
});

// Test 25: Multiple children workflow
test('Complex workflow - multiple children with various operations', () => {
  // Create budget
  let budget = createTokenBudget(200000, { compactionThreshold: 0.75 });

  // Allocate to three children
  budget = allocateBudget(budget, 'roadmap-1', 60000);
  budget = allocateBudget(budget, 'roadmap-2', 50000);
  budget = allocateBudget(budget, 'roadmap-3', 40000);

  strictEqual(budget.available, 50000);

  // Track usage
  budget = trackUsage(budget, 'roadmap-1', 20000);
  budget = trackUsage(budget, 'roadmap-2', 45000); // 90% - should be LOW
  budget = trackUsage(budget, 'roadmap-3', 10000);

  strictEqual(budget.used, 75000);
  strictEqual(budget.allocations['roadmap-2'].status, BudgetStatus.LOW);

  // Reallocate from roadmap-1 to roadmap-2
  budget = reallocateBudget(budget, 'roadmap-1', 'roadmap-2', 10000);

  strictEqual(budget.allocations['roadmap-1'].allocated, 50000);
  strictEqual(budget.allocations['roadmap-2'].allocated, 60000);

  // Release unused from roadmap-3
  const releaseResult = releaseBudget(budget, 'roadmap-3');
  strictEqual(releaseResult.released, 30000);
  strictEqual(releaseResult.budget.available, 80000);

  // Get summary
  const summary = getBudgetSummary(releaseResult.budget);
  strictEqual(summary.children.length, 3);
  strictEqual(summary.unallocated, 80000);
});

// Test 26: Edge case - zero budget
test('Edge case - create budget with zero tokens', () => {
  const budget = createTokenBudget(0);

  strictEqual(budget.total, 0);
  strictEqual(budget.available, 0);

  throws(() => {
    allocateBudget(budget, 'phase-1', 1000);
  }, /Insufficient budget/);
});

console.log('✓ All token-budget tests passed!');
