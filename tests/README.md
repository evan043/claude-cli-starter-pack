# Epic-Hierarchy Test Suite

This directory contains comprehensive test coverage for the Epic-Hierarchy architecture.

## Test Files

### `epic.test.js` (22 tests)

Tests for the Epic layer (L0) from `src/epic/schema.js`:

**Coverage:**
- Epic creation with default and custom configuration
- Roadmap placeholder creation
- Epic validation (required fields, roadmap count consistency, status validation, token budget validation)
- Completion percentage calculation from roadmap children
- Gating requirement checks (dependencies, sequential gating, manual override)
- Next roadmap determination

**Key Functions Tested:**
- `createEpic(config)`
- `createRoadmapPlaceholder(config)`
- `validateEpic(epic)`
- `calculateEpicCompletion(epic)`
- `checkGatingRequirements(epic, roadmapIndex)`
- `getNextRoadmap(epic)`

**Run:**
```bash
npm run test:epic
# or
node tests/epic.test.js
```

---

### `roadmap.test.js` (26 tests)

Tests for the Roadmap coordination layer (L1) from `src/roadmap/schema.js`:

**Coverage:**
- Roadmap creation
- Phase-dev-plan reference management (create, add, update, remove)
- Completion calculation from plan references
- Cross-plan dependency management (add, check satisfaction)
- Legacy roadmap migration (phases → plan references)
- Roadmap validation

**Key Functions Tested:**
- `createRoadmap(options)`
- `createPlanReference(options)`
- `addPlanReference(roadmap, planRef)`
- `removePlanReference(roadmap, planSlug)`
- `updatePlanReference(roadmap, planSlug, updates)`
- `calculateOverallCompletion(roadmap)`
- `addCrossPlanDependency(roadmap, dependentSlug, dependsOnSlug, reason)`
- `checkPlanDependencies(roadmap, planSlug)`
- `migrateLegacyRoadmap(roadmap)`
- `validateRoadmap(roadmap)`

**Run:**
```bash
npm run test:roadmap
# or
node tests/roadmap.test.js
```

---

### `orchestration.test.js` (36 tests)

Tests for orchestration layer modules:

**Delegation Protocol (`src/orchestration/delegation-protocol.js`):**
- Message creation (spawn, complete, blocked, failed)
- Message parsing from agent output
- Message formatting for prompts

**Gating (`src/orchestration/gating.js`):**
- Gate override logic
- Critical gate enforcement

**Token Budget (`src/orchestration/token-budget.js`):**
- Budget creation and allocation
- Usage tracking and status updates (AVAILABLE, LOW, EXHAUSTED)
- Budget checking and compaction triggers
- Budget reallocation between children
- Budget release from completed children
- Budget summaries

**Progress Aggregation (`src/orchestration/progress-aggregator.js`):**
- Status determination from child statuses
- Hierarchy-aware status rules

**Key Functions Tested:**
- `createSpawnMessage(level, context)`
- `createCompleteMessage(level, id, metrics, summary, artifacts)`
- `createBlockedMessage(level, id, blocker, suggestedAction)`
- `createFailedMessage(level, id, error, attempted)`
- `parseCompletionOutput(output)`
- `formatSpawnPrompt(message)`
- `canOverrideGate(gatingConfig, gateType)`
- `createTokenBudget(totalBudget, options)`
- `allocateBudget(budget, childId, amount, metadata)`
- `trackUsage(budget, childId, tokensUsed)`
- `checkBudget(budget, childId)`
- `shouldCompact(budget, childId, threshold)`
- `reallocateBudget(budget, fromChildId, toChildId, amount)`
- `releaseBudget(budget, childId)`
- `getBudgetSummary(budget)`
- `determineStatus(children)`

**Run:**
```bash
npm run test:orchestration
# or
node tests/orchestration.test.js
```

---

## Running All Tests

### Run All Hierarchy Tests

```bash
npm run test:hierarchy
```

This runs all three test files and provides a summary:

```
============================================================
Running Epic-Hierarchy Tests
============================================================

Running epic.test.js...
------------------------------------------------------------
✅ epic.test.js: 22/22 passed

Running roadmap.test.js...
------------------------------------------------------------
✅ roadmap.test.js: 26/26 passed

Running orchestration.test.js...
------------------------------------------------------------
✅ orchestration.test.js: 36/36 passed

============================================================
Test Summary
============================================================
Total tests:    84
Passed:         84 (100%)
Failed:         0
Total duration: 82.46ms

✅ All hierarchy tests passed!
```

---

## Test Framework

These tests use **Node.js built-in test runner** (`node:test`) introduced in Node.js 18+. No external test framework is required.

**Key Features:**
- Native test runner (no Jest/Mocha/Vitest needed)
- TAP (Test Anything Protocol) output
- Async/await support
- Descriptive test names
- Assertion library from `node:assert`

**Example Test:**
```javascript
import { test } from 'node:test';
import { strictEqual, ok } from 'assert';

test('createEpic - creates valid structure', () => {
  const epic = createEpic({ title: 'Test Epic' });

  ok(epic.epic_id, 'Epic should have ID');
  strictEqual(epic.title, 'Test Epic', 'Title should match');
});
```

---

## Test Coverage

### Epic Layer (L0)
- ✅ Epic creation and validation
- ✅ Roadmap reference management
- ✅ Completion aggregation
- ✅ Gating logic (sequential, dependencies, override)
- ✅ Next roadmap determination

### Roadmap Layer (L1)
- ✅ Roadmap creation and validation
- ✅ Phase-dev-plan reference tracking
- ✅ Cross-plan dependency management
- ✅ Completion calculation from children
- ✅ Legacy migration support

### Orchestration Layer
- ✅ Delegation protocol (all message types)
- ✅ Message parsing and formatting
- ✅ Gating logic
- ✅ Token budget management (allocation, tracking, reallocation)
- ✅ Progress aggregation
- ✅ Status determination rules

---

## Adding New Tests

### 1. Create Test File

```javascript
import { test } from 'node:test';
import { strictEqual, ok } from 'assert';
import { myFunction } from '../src/my-module.js';

console.log('Running my tests...\n');

test('myFunction - does something', () => {
  const result = myFunction('input');
  strictEqual(result, 'expected', 'Should return expected value');
});

console.log('\n✓ All my tests passed!');
```

### 2. Add to package.json

```json
{
  "scripts": {
    "test:mymodule": "node tests/mymodule.test.js"
  }
}
```

### 3. Add to Test Runner (optional)

Edit `tests/run-hierarchy-tests.js` and add your test file to the `testFiles` array:

```javascript
const testFiles = [
  'epic.test.js',
  'roadmap.test.js',
  'orchestration.test.js',
  'mymodule.test.js'  // Add here
];
```

---

## Test Patterns

### Testing Object Creation

```javascript
test('createX - creates valid structure', () => {
  const obj = createX({ prop: 'value' });

  ok(obj.id, 'Should have ID');
  strictEqual(obj.prop, 'value', 'Property should match');
  ok(Array.isArray(obj.array), 'Should initialize array');
});
```

### Testing Validation

```javascript
test('validateX - detects missing fields', () => {
  const invalid = { /* incomplete */ };

  const result = validateX(invalid);

  strictEqual(result.valid, false, 'Should be invalid');
  ok(result.errors.length > 0, 'Should have errors');
  ok(result.errors.some(e => e.includes('field_name')), 'Should detect missing field');
});
```

### Testing Error Handling

```javascript
test('functionX - throws error for invalid input', () => {
  try {
    functionX(invalidInput);
    ok(false, 'Should have thrown error');
  } catch (error) {
    ok(error.message.includes('expected text'), 'Error should mention issue');
  }
});
```

### Testing State Mutations

```javascript
test('mutateX - updates state correctly', () => {
  const obj = createX();

  mutateX(obj, 'newValue');

  strictEqual(obj.field, 'newValue', 'Field should be updated');
  ok(obj.updated, 'Should have updated timestamp');
});
```

---

## Troubleshooting

### Test Failures

If tests fail, check:

1. **Import paths** - Ensure relative paths are correct
2. **Function signatures** - Verify function parameters match
3. **Async operations** - Use `await` for async functions
4. **Mock data** - Ensure test data is valid

### TAP Output Issues

If TAP parsing fails in the test runner:

```bash
# Run individual test to see raw output
node tests/epic.test.js

# Check for syntax errors
node --check tests/epic.test.js
```

### Node.js Version

These tests require **Node.js 18+** for the built-in test runner:

```bash
node --version
# Should be >= v18.0.0
```

---

## Related Documentation

- [HIERARCHY.md](../docs/HIERARCHY.md) - Epic-Hierarchy architecture
- [PHASE_DEV_PLAN.md](../docs/PHASE_DEV_PLAN.md) - Phase-dev-plan guide
- [Epic Schema](../src/epic/schema.js) - Epic layer implementation
- [Roadmap Schema](../src/roadmap/schema.js) - Roadmap layer implementation
- [Orchestration](../src/orchestration/) - Orchestration modules

---

**Test Suite Version:** 1.0.0
**Last Updated:** 2026-02-04
**Total Test Coverage:** 84 tests across 3 test files
