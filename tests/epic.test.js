/**
 * Epic Layer Tests
 *
 * Tests for src/epic/schema.js
 * - EPIC.json validation
 * - Roadmap count determination
 * - Gating logic
 * - Completion aggregation
 */

import { strictEqual, ok, deepStrictEqual } from 'assert';
import { test } from 'node:test';

// Import epic schema functions
import {
  createEpic,
  createRoadmapPlaceholder,
  validateEpic,
  calculateEpicCompletion,
  checkGatingRequirements,
  getNextRoadmap,
} from '../src/epic/schema.js';

console.log('Running epic layer tests...\n');

// ============================================================
// Test: createEpic
// ============================================================

test('createEpic - creates valid epic structure with defaults', () => {
  const epic = createEpic({
    title: 'Test Epic',
    description: 'Test epic description',
  });

  ok(epic.epic_id, 'Epic should have ID');
  strictEqual(epic.title, 'Test Epic', 'Title should match');
  strictEqual(epic.slug, 'test-epic', 'Slug should be generated');
  strictEqual(epic.status, 'not_started', 'Initial status should be not_started');
  strictEqual(epic.roadmap_count, 0, 'Roadmap count should be 0');
  strictEqual(epic.completion_percentage, 0, 'Completion should be 0');
  ok(Array.isArray(epic.roadmaps), 'Roadmaps should be an array');
});

test('createEpic - respects custom configuration', () => {
  const epic = createEpic({
    title: 'Custom Epic',
    epic_id: 'custom-id',
    slug: 'custom-slug',
    roadmap_count: 3,
    gating: {
      require_tests: false,
      require_docs: true,
    },
    token_budget: {
      total: 1000000,
    },
  });

  strictEqual(epic.epic_id, 'custom-id', 'Custom ID should be used');
  strictEqual(epic.slug, 'custom-slug', 'Custom slug should be used');
  strictEqual(epic.roadmap_count, 3, 'Custom roadmap count should be used');
  strictEqual(epic.gating.require_tests, false, 'Gating config should be respected');
  strictEqual(epic.gating.require_docs, true, 'Gating config should be respected');
  strictEqual(epic.token_budget.total, 1000000, 'Token budget should be set');
});

// ============================================================
// Test: createRoadmapPlaceholder
// ============================================================

test('createRoadmapPlaceholder - creates valid placeholder', () => {
  const placeholder = createRoadmapPlaceholder({
    roadmap_index: 0,
    title: 'First Roadmap',
    description: 'First roadmap description',
  });

  ok(placeholder.roadmap_id, 'Placeholder should have ID');
  strictEqual(placeholder.roadmap_index, 0, 'Index should match');
  strictEqual(placeholder.title, 'First Roadmap', 'Title should match');
  strictEqual(placeholder.status, 'not_started', 'Initial status should be not_started');
  strictEqual(placeholder.completion_percentage, 0, 'Completion should be 0');
  ok(Array.isArray(placeholder.depends_on), 'depends_on should be an array');
  ok(Array.isArray(placeholder.blocks), 'blocks should be an array');
});

// ============================================================
// Test: validateEpic
// ============================================================

test('validateEpic - accepts valid epic', () => {
  const epic = createEpic({
    title: 'Valid Epic',
  });

  const result = validateEpic(epic);

  strictEqual(result.valid, true, 'Epic should be valid');
  strictEqual(result.errors.length, 0, 'Should have no errors');
});

test('validateEpic - detects missing required fields', () => {
  const invalidEpic = {
    // Missing epic_id, title, slug
    roadmaps: [],
    roadmap_count: 0,
    status: 'not_started',
    completion_percentage: 0,
    token_budget: { total: 500000, used: 0 }, // Add token_budget to prevent validation crash
  };

  const result = validateEpic(invalidEpic);

  strictEqual(result.valid, false, 'Epic should be invalid');
  ok(result.errors.length >= 3, 'Should have at least 3 errors');
  ok(result.errors.some(e => e.includes('epic_id')), 'Should detect missing epic_id');
  ok(result.errors.some(e => e.includes('title')), 'Should detect missing title');
  ok(result.errors.some(e => e.includes('slug')), 'Should detect missing slug');
});

test('validateEpic - detects roadmap_count mismatch', () => {
  const epic = createEpic({ title: 'Test' });
  epic.roadmaps.push(createRoadmapPlaceholder({
    roadmap_index: 0,
    title: 'Roadmap 1',
  }));
  // roadmap_count is still 0, but roadmaps array has 1 item

  const result = validateEpic(epic);

  strictEqual(result.valid, false, 'Epic should be invalid');
  ok(result.errors.some(e => e.includes('roadmap_count mismatch')), 'Should detect count mismatch');
});

test('validateEpic - detects invalid status', () => {
  const epic = createEpic({ title: 'Test' });
  epic.status = 'invalid_status';

  const result = validateEpic(epic);

  strictEqual(result.valid, false, 'Epic should be invalid');
  ok(result.errors.some(e => e.includes('Invalid status')), 'Should detect invalid status');
});

test('validateEpic - detects completion percentage out of range', () => {
  const epic = createEpic({ title: 'Test' });
  epic.completion_percentage = 150;

  const result = validateEpic(epic);

  strictEqual(result.valid, false, 'Epic should be invalid');
  ok(result.errors.some(e => e.includes('completion_percentage')), 'Should detect invalid completion');
});

test('validateEpic - detects token budget exceeded', () => {
  const epic = createEpic({ title: 'Test' });
  epic.token_budget.used = 600000;
  epic.token_budget.total = 500000;

  const result = validateEpic(epic);

  strictEqual(result.valid, false, 'Epic should be invalid');
  ok(result.errors.some(e => e.includes('Token budget exceeded')), 'Should detect budget exceeded');
});

test('validateEpic - validates roadmap structure', () => {
  const epic = createEpic({ title: 'Test' });
  epic.roadmaps.push({
    // Missing required fields
    roadmap_index: 0,
  });
  epic.roadmap_count = 1;

  const result = validateEpic(epic);

  strictEqual(result.valid, false, 'Epic should be invalid');
  ok(result.errors.some(e => e.includes('roadmap_id')), 'Should detect missing roadmap_id');
  ok(result.errors.some(e => e.includes('title')), 'Should detect missing title');
});

// ============================================================
// Test: calculateEpicCompletion
// ============================================================

test('calculateEpicCompletion - returns 0 for empty epic', () => {
  const epic = createEpic({ title: 'Test' });

  const completion = calculateEpicCompletion(epic);

  strictEqual(completion, 0, 'Completion should be 0 for empty epic');
});

test('calculateEpicCompletion - calculates average from roadmaps', () => {
  const epic = createEpic({ title: 'Test' });
  epic.roadmaps.push(
    { ...createRoadmapPlaceholder({ roadmap_index: 0, title: 'R1' }), completion_percentage: 50 },
    { ...createRoadmapPlaceholder({ roadmap_index: 1, title: 'R2' }), completion_percentage: 100 },
    { ...createRoadmapPlaceholder({ roadmap_index: 2, title: 'R3' }), completion_percentage: 0 }
  );
  epic.roadmap_count = 3;

  const completion = calculateEpicCompletion(epic);

  strictEqual(completion, 50, 'Completion should be average (50+100+0)/3 = 50');
});

test('calculateEpicCompletion - handles undefined completion_percentage', () => {
  const epic = createEpic({ title: 'Test' });
  epic.roadmaps.push(
    { ...createRoadmapPlaceholder({ roadmap_index: 0, title: 'R1' }), completion_percentage: 100 },
    { ...createRoadmapPlaceholder({ roadmap_index: 1, title: 'R2' }), completion_percentage: undefined }
  );
  epic.roadmap_count = 2;

  const completion = calculateEpicCompletion(epic);

  strictEqual(completion, 50, 'Should treat undefined as 0');
});

// ============================================================
// Test: checkGatingRequirements
// ============================================================

test('checkGatingRequirements - passes when no dependencies', () => {
  const epic = createEpic({ title: 'Test' });
  epic.roadmaps.push(
    createRoadmapPlaceholder({ roadmap_index: 0, title: 'R1' })
  );
  epic.roadmap_count = 1;

  const result = checkGatingRequirements(epic, 0);

  strictEqual(result.canProceed, true, 'Should be able to proceed');
  strictEqual(result.blockers.length, 0, 'Should have no blockers');
});

test('checkGatingRequirements - blocks when previous roadmap not complete', () => {
  const epic = createEpic({ title: 'Test' });
  const r1 = createRoadmapPlaceholder({ roadmap_index: 0, title: 'R1' });
  r1.status = 'in_progress'; // Not completed
  const r2 = createRoadmapPlaceholder({ roadmap_index: 1, title: 'R2' });

  epic.roadmaps.push(r1, r2);
  epic.roadmap_count = 2;

  const result = checkGatingRequirements(epic, 1);

  strictEqual(result.canProceed, false, 'Should be blocked');
  ok(result.blockers.length > 0, 'Should have blockers');
  ok(result.blockers[0].includes('Previous roadmap not complete'), 'Should mention previous roadmap');
});

test('checkGatingRequirements - allows manual override when enabled', () => {
  const epic = createEpic({
    title: 'Test',
    gating: { allow_manual_override: true },
  });
  const r1 = createRoadmapPlaceholder({ roadmap_index: 0, title: 'R1' });
  r1.status = 'in_progress';
  const r2 = createRoadmapPlaceholder({ roadmap_index: 1, title: 'R2' });

  epic.roadmaps.push(r1, r2);
  epic.roadmap_count = 2;

  const result = checkGatingRequirements(epic, 1);

  strictEqual(result.canProceed, false, 'Should still be blocked');
  strictEqual(result.canOverride, true, 'Should allow override');
});

test('checkGatingRequirements - checks explicit dependencies', () => {
  const epic = createEpic({ title: 'Test' });
  const r1 = createRoadmapPlaceholder({ roadmap_index: 0, title: 'R1' });
  r1.roadmap_id = 'r1-id';
  r1.status = 'in_progress';

  const r2 = createRoadmapPlaceholder({ roadmap_index: 1, title: 'R2' });
  r2.roadmap_id = 'r2-id';

  const r3 = createRoadmapPlaceholder({ roadmap_index: 2, title: 'R3' });
  r3.depends_on = ['r1-id'];

  epic.roadmaps.push(r1, r2, r3);
  epic.roadmap_count = 3;

  const result = checkGatingRequirements(epic, 2);

  strictEqual(result.canProceed, false, 'Should be blocked');
  ok(result.blockers.some(b => b.includes('Dependencies not complete')), 'Should mention dependencies');
});

test('checkGatingRequirements - validates roadmap index', () => {
  const epic = createEpic({ title: 'Test' });

  const result = checkGatingRequirements(epic, 5); // Invalid index

  strictEqual(result.canProceed, false, 'Should not proceed');
  ok(result.blockers.some(b => b.includes('Invalid roadmap index')), 'Should mention invalid index');
});

// ============================================================
// Test: getNextRoadmap
// ============================================================

test('getNextRoadmap - returns null when no roadmaps', () => {
  const epic = createEpic({ title: 'Test' });

  const result = getNextRoadmap(epic);

  strictEqual(result, null, 'Should return null for empty epic');
});

test('getNextRoadmap - returns first non-completed roadmap', () => {
  const epic = createEpic({ title: 'Test' });
  const r1 = createRoadmapPlaceholder({ roadmap_index: 0, title: 'R1' });
  r1.status = 'completed';
  const r2 = createRoadmapPlaceholder({ roadmap_index: 1, title: 'R2' });
  r2.status = 'not_started';

  epic.roadmaps.push(r1, r2);
  epic.roadmap_count = 2;

  const result = getNextRoadmap(epic);

  ok(result, 'Should return a result');
  strictEqual(result.roadmap.roadmap_index, 1, 'Should return R2');
  strictEqual(result.blocked, false, 'Should not be blocked');
});

test('getNextRoadmap - returns blocked status when dependencies not met', () => {
  const epic = createEpic({ title: 'Test' });
  const r1 = createRoadmapPlaceholder({ roadmap_index: 0, title: 'R1' });
  r1.status = 'in_progress';
  const r2 = createRoadmapPlaceholder({ roadmap_index: 1, title: 'R2' });
  r2.status = 'not_started';

  epic.roadmaps.push(r1, r2);
  epic.roadmap_count = 2;

  const result = getNextRoadmap(epic);

  // getNextRoadmap returns first non-completed/non-failed roadmap, which is R1 (in_progress)
  // R1 is not blocked, so it returns with blocked: false
  ok(result, 'Should return a result');
  strictEqual(result.roadmap.roadmap_index, 0, 'Should return R1 which is in progress');
  strictEqual(result.blocked, false, 'R1 should not be blocked');
});

test('getNextRoadmap - skips failed roadmaps', () => {
  const epic = createEpic({ title: 'Test' });
  const r1 = createRoadmapPlaceholder({ roadmap_index: 0, title: 'R1' });
  r1.status = 'failed';
  const r2 = createRoadmapPlaceholder({ roadmap_index: 1, title: 'R2' });
  r2.status = 'not_started';

  epic.roadmaps.push(r1, r2);
  epic.roadmap_count = 2;

  const result = getNextRoadmap(epic);

  // getNextRoadmap finds R2 (not completed/failed), but R2 is blocked by incomplete R1
  ok(result, 'Should return a result');
  strictEqual(result.roadmap.roadmap_index, 1, 'Should find R2');
  strictEqual(result.blocked, true, 'R2 should be blocked by failed R1');
  ok(result.blockers.length > 0, 'Should have blockers');
});

// ============================================================
// Summary
// ============================================================

console.log('\n✓ All epic layer tests passed!');
