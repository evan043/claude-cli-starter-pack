/**
 * Roadmap Coordination Layer Tests
 *
 * Tests for src/roadmap/schema.js
 * - Phase-dev-plan reference tracking
 * - Completion calculation from children
 * - Cross-plan dependencies
 * - Backwards compatibility migration
 */

import { strictEqual, ok, deepStrictEqual } from 'assert';
import { test } from 'node:test';

// Import roadmap schema functions
import {
  createRoadmap,
  createPlanReference,
  addPlanReference,
  removePlanReference,
  updatePlanReference,
  calculateOverallCompletion,
  addCrossPlanDependency,
  checkPlanDependencies,
  migrateLegacyRoadmap,
  validateRoadmap,
  createPhase,
} from '../src/roadmap/schema.js';

console.log('Running roadmap coordination layer tests...\n');

// ============================================================
// Test: createRoadmap
// ============================================================

test('createRoadmap - creates valid roadmap structure', () => {
  const roadmap = createRoadmap({
    title: 'Test Roadmap',
    description: 'Test description',
  });

  ok(roadmap.roadmap_id, 'Roadmap should have ID');
  strictEqual(roadmap.title, 'Test Roadmap', 'Title should match');
  strictEqual(roadmap.status, 'planning', 'Initial status should be planning');
  ok(Array.isArray(roadmap.phase_dev_plan_refs), 'Should have plan refs array');
  ok(Array.isArray(roadmap.cross_plan_dependencies), 'Should have dependencies array');
  strictEqual(roadmap.metadata.plan_count, 0, 'Plan count should be 0');
});

// ============================================================
// Test: createPlanReference
// ============================================================

test('createPlanReference - creates valid plan reference', () => {
  const planRef = createPlanReference({
    slug: 'test-plan',
    title: 'Test Plan',
    status: 'pending',
    completion_percentage: 0,
  });

  strictEqual(planRef.slug, 'test-plan', 'Slug should match');
  strictEqual(planRef.title, 'Test Plan', 'Title should match');
  strictEqual(planRef.status, 'pending', 'Status should match');
  strictEqual(planRef.completion_percentage, 0, 'Completion should be 0');
  ok(planRef.path.includes('test-plan'), 'Path should include slug');
});

test('createPlanReference - throws error without slug', () => {
  try {
    createPlanReference({ title: 'Test' });
    ok(false, 'Should have thrown error');
  } catch (error) {
    ok(error.message.includes('slug'), 'Error should mention slug');
  }
});

// ============================================================
// Test: addPlanReference
// ============================================================

test('addPlanReference - adds new plan reference', () => {
  const roadmap = createRoadmap({ title: 'Test' });
  const planRef = createPlanReference({
    slug: 'plan-1',
    title: 'Plan 1',
  });

  addPlanReference(roadmap, planRef);

  strictEqual(roadmap.phase_dev_plan_refs.length, 1, 'Should have 1 plan ref');
  strictEqual(roadmap.metadata.plan_count, 1, 'Plan count should be updated');
  strictEqual(roadmap.phase_dev_plan_refs[0].slug, 'plan-1', 'Plan ref should be added');
});

test('addPlanReference - updates existing plan reference', () => {
  const roadmap = createRoadmap({ title: 'Test' });
  const planRef1 = createPlanReference({
    slug: 'plan-1',
    title: 'Plan 1',
    completion_percentage: 0,
  });
  const planRef2 = createPlanReference({
    slug: 'plan-1',
    title: 'Plan 1 Updated',
    completion_percentage: 50,
  });

  addPlanReference(roadmap, planRef1);
  addPlanReference(roadmap, planRef2);

  strictEqual(roadmap.phase_dev_plan_refs.length, 1, 'Should still have 1 plan ref');
  strictEqual(roadmap.phase_dev_plan_refs[0].title, 'Plan 1 Updated', 'Title should be updated');
  strictEqual(roadmap.phase_dev_plan_refs[0].completion_percentage, 50, 'Completion should be updated');
});

test('addPlanReference - handles missing phase_dev_plan_refs array', () => {
  const roadmap = createRoadmap({ title: 'Test' });
  delete roadmap.phase_dev_plan_refs;

  const planRef = createPlanReference({
    slug: 'plan-1',
    title: 'Plan 1',
  });

  addPlanReference(roadmap, planRef);

  ok(Array.isArray(roadmap.phase_dev_plan_refs), 'Should create array');
  strictEqual(roadmap.phase_dev_plan_refs.length, 1, 'Should have 1 plan ref');
});

// ============================================================
// Test: removePlanReference
// ============================================================

test('removePlanReference - removes plan reference', () => {
  const roadmap = createRoadmap({ title: 'Test' });
  const planRef1 = createPlanReference({ slug: 'plan-1', title: 'Plan 1' });
  const planRef2 = createPlanReference({ slug: 'plan-2', title: 'Plan 2' });

  addPlanReference(roadmap, planRef1);
  addPlanReference(roadmap, planRef2);

  removePlanReference(roadmap, 'plan-1');

  strictEqual(roadmap.phase_dev_plan_refs.length, 1, 'Should have 1 plan ref');
  strictEqual(roadmap.phase_dev_plan_refs[0].slug, 'plan-2', 'Should keep plan-2');
  strictEqual(roadmap.metadata.plan_count, 1, 'Plan count should be updated');
});

test('removePlanReference - removes related dependencies', () => {
  const roadmap = createRoadmap({ title: 'Test' });
  const planRef1 = createPlanReference({ slug: 'plan-1', title: 'Plan 1' });
  const planRef2 = createPlanReference({ slug: 'plan-2', title: 'Plan 2' });

  addPlanReference(roadmap, planRef1);
  addPlanReference(roadmap, planRef2);
  addCrossPlanDependency(roadmap, 'plan-2', 'plan-1', 'Test dependency');

  strictEqual(roadmap.cross_plan_dependencies.length, 1, 'Should have 1 dependency');

  removePlanReference(roadmap, 'plan-1');

  strictEqual(roadmap.cross_plan_dependencies.length, 0, 'Should remove related dependency');
});

test('removePlanReference - handles missing phase_dev_plan_refs', () => {
  const roadmap = createRoadmap({ title: 'Test' });
  delete roadmap.phase_dev_plan_refs;

  removePlanReference(roadmap, 'plan-1');

  // Should not throw
  ok(true, 'Should handle gracefully');
});

// ============================================================
// Test: updatePlanReference
// ============================================================

test('updatePlanReference - updates plan status and completion', () => {
  const roadmap = createRoadmap({ title: 'Test' });
  const planRef = createPlanReference({
    slug: 'plan-1',
    title: 'Plan 1',
    status: 'pending',
    completion_percentage: 0,
  });

  addPlanReference(roadmap, planRef);

  updatePlanReference(roadmap, 'plan-1', {
    status: 'in_progress',
    completion_percentage: 50,
  });

  strictEqual(roadmap.phase_dev_plan_refs[0].status, 'in_progress', 'Status should be updated');
  strictEqual(roadmap.phase_dev_plan_refs[0].completion_percentage, 50, 'Completion should be updated');
});

test('updatePlanReference - throws error for non-existent plan', () => {
  const roadmap = createRoadmap({ title: 'Test' });

  try {
    updatePlanReference(roadmap, 'non-existent', { status: 'completed' });
    ok(false, 'Should have thrown error');
  } catch (error) {
    ok(error.message.includes('not found'), 'Error should mention not found');
  }
});

// ============================================================
// Test: calculateOverallCompletion
// ============================================================

test('calculateOverallCompletion - returns 0 for empty roadmap', () => {
  const roadmap = createRoadmap({ title: 'Test' });

  const completion = calculateOverallCompletion(roadmap);

  strictEqual(completion, 0, 'Should return 0 for empty roadmap');
});

test('calculateOverallCompletion - calculates average from plan refs', () => {
  const roadmap = createRoadmap({ title: 'Test' });

  addPlanReference(roadmap, createPlanReference({
    slug: 'plan-1',
    title: 'Plan 1',
    completion_percentage: 100,
  }));

  addPlanReference(roadmap, createPlanReference({
    slug: 'plan-2',
    title: 'Plan 2',
    completion_percentage: 50,
  }));

  addPlanReference(roadmap, createPlanReference({
    slug: 'plan-3',
    title: 'Plan 3',
    completion_percentage: 0,
  }));

  const completion = calculateOverallCompletion(roadmap);

  strictEqual(completion, 50, 'Should calculate average (100+50+0)/3 = 50');
});

test('calculateOverallCompletion - handles undefined completion_percentage', () => {
  const roadmap = createRoadmap({ title: 'Test' });

  addPlanReference(roadmap, createPlanReference({
    slug: 'plan-1',
    title: 'Plan 1',
    completion_percentage: 100,
  }));

  const planRef2 = createPlanReference({
    slug: 'plan-2',
    title: 'Plan 2',
  });
  delete planRef2.completion_percentage;
  addPlanReference(roadmap, planRef2);

  const completion = calculateOverallCompletion(roadmap);

  strictEqual(completion, 50, 'Should treat undefined as 0');
});

// ============================================================
// Test: addCrossPlanDependency
// ============================================================

test('addCrossPlanDependency - adds dependency', () => {
  const roadmap = createRoadmap({ title: 'Test' });

  addCrossPlanDependency(roadmap, 'plan-2', 'plan-1', 'Plan 2 depends on Plan 1');

  strictEqual(roadmap.cross_plan_dependencies.length, 1, 'Should have 1 dependency');
  strictEqual(roadmap.cross_plan_dependencies[0].dependent_slug, 'plan-2', 'Dependent should match');
  strictEqual(roadmap.cross_plan_dependencies[0].depends_on_slug, 'plan-1', 'Depends on should match');
  strictEqual(roadmap.cross_plan_dependencies[0].reason, 'Plan 2 depends on Plan 1', 'Reason should match');
});

test('addCrossPlanDependency - prevents duplicate dependencies', () => {
  const roadmap = createRoadmap({ title: 'Test' });

  addCrossPlanDependency(roadmap, 'plan-2', 'plan-1', 'Reason 1');
  addCrossPlanDependency(roadmap, 'plan-2', 'plan-1', 'Reason 2');

  strictEqual(roadmap.cross_plan_dependencies.length, 1, 'Should not add duplicate');
});

test('addCrossPlanDependency - handles missing dependencies array', () => {
  const roadmap = createRoadmap({ title: 'Test' });
  delete roadmap.cross_plan_dependencies;

  addCrossPlanDependency(roadmap, 'plan-2', 'plan-1', 'Test');

  ok(Array.isArray(roadmap.cross_plan_dependencies), 'Should create array');
  strictEqual(roadmap.cross_plan_dependencies.length, 1, 'Should have 1 dependency');
});

// ============================================================
// Test: checkPlanDependencies
// ============================================================

test('checkPlanDependencies - returns satisfied when no dependencies', () => {
  const roadmap = createRoadmap({ title: 'Test' });

  const result = checkPlanDependencies(roadmap, 'plan-1');

  strictEqual(result.satisfied, true, 'Should be satisfied');
  strictEqual(result.missing.length, 0, 'Should have no missing dependencies');
});

test('checkPlanDependencies - detects unsatisfied dependencies', () => {
  const roadmap = createRoadmap({ title: 'Test' });

  addPlanReference(roadmap, createPlanReference({
    slug: 'plan-1',
    title: 'Plan 1',
    status: 'in_progress',
  }));

  addPlanReference(roadmap, createPlanReference({
    slug: 'plan-2',
    title: 'Plan 2',
    status: 'pending',
  }));

  addCrossPlanDependency(roadmap, 'plan-2', 'plan-1', 'Test dependency');

  const result = checkPlanDependencies(roadmap, 'plan-2');

  strictEqual(result.satisfied, false, 'Should not be satisfied');
  strictEqual(result.missing.length, 1, 'Should have 1 missing dependency');
  strictEqual(result.missing[0], 'plan-1', 'Should identify plan-1 as missing');
});

test('checkPlanDependencies - satisfied when dependencies completed', () => {
  const roadmap = createRoadmap({ title: 'Test' });

  addPlanReference(roadmap, createPlanReference({
    slug: 'plan-1',
    title: 'Plan 1',
    status: 'completed',
  }));

  addPlanReference(roadmap, createPlanReference({
    slug: 'plan-2',
    title: 'Plan 2',
    status: 'pending',
  }));

  addCrossPlanDependency(roadmap, 'plan-2', 'plan-1', 'Test dependency');

  const result = checkPlanDependencies(roadmap, 'plan-2');

  strictEqual(result.satisfied, true, 'Should be satisfied');
  strictEqual(result.missing.length, 0, 'Should have no missing dependencies');
});

// ============================================================
// Test: migrateLegacyRoadmap
// ============================================================

test('migrateLegacyRoadmap - migrates phases to plan references', () => {
  const roadmap = createRoadmap({ title: 'Legacy Roadmap' });

  // Add legacy phases
  roadmap.phases = [
    createPhase({
      phase_id: 'phase-1',
      phase_title: 'Phase 1',
      phase_number: 1,
    }),
    createPhase({
      phase_id: 'phase-2',
      phase_title: 'Phase 2',
      phase_number: 2,
    }),
  ];

  const migrated = migrateLegacyRoadmap(roadmap);

  strictEqual(migrated.phase_dev_plan_refs.length, 2, 'Should create 2 plan refs');
  strictEqual(migrated.phase_dev_plan_refs[0].title, 'Phase 1', 'Title should match');
  strictEqual(migrated.phase_dev_plan_refs[1].title, 'Phase 2', 'Title should match');
  strictEqual(migrated._legacy_phases_deprecated, true, 'Should mark legacy phases');
  strictEqual(migrated.metadata.plan_count, 2, 'Should update plan count');
});

test('migrateLegacyRoadmap - migrates phase dependencies', () => {
  const roadmap = createRoadmap({ title: 'Legacy Roadmap' });

  const phase1 = createPhase({
    phase_id: 'phase-1',
    phase_title: 'Phase 1',
    phase_number: 1,
  });

  const phase2 = createPhase({
    phase_id: 'phase-2',
    phase_title: 'Phase 2',
    phase_number: 2,
    dependencies: ['phase-1'],
  });

  roadmap.phases = [phase1, phase2];

  const migrated = migrateLegacyRoadmap(roadmap);

  strictEqual(migrated.cross_plan_dependencies.length, 1, 'Should create 1 dependency');
  strictEqual(migrated.cross_plan_dependencies[0].dependent_slug, 'phase-2', 'Dependent should match');
  strictEqual(migrated.cross_plan_dependencies[0].depends_on_slug, 'phase-1', 'Depends on should match');
});

test('migrateLegacyRoadmap - skips already migrated roadmaps', () => {
  const roadmap = createRoadmap({ title: 'Already Migrated' });

  addPlanReference(roadmap, createPlanReference({
    slug: 'plan-1',
    title: 'Plan 1',
  }));

  const migrated = migrateLegacyRoadmap(roadmap);

  strictEqual(migrated.phase_dev_plan_refs.length, 1, 'Should keep existing plan refs');
});

test('migrateLegacyRoadmap - handles empty phases array', () => {
  const roadmap = createRoadmap({ title: 'Empty' });
  roadmap.phases = [];

  const migrated = migrateLegacyRoadmap(roadmap);

  strictEqual(migrated.phase_dev_plan_refs.length, 0, 'Should have no plan refs');
});

// ============================================================
// Test: validateRoadmap
// ============================================================

test('validateRoadmap - accepts valid roadmap', () => {
  const roadmap = createRoadmap({ title: 'Valid Roadmap' });

  const result = validateRoadmap(roadmap);

  strictEqual(result.valid, true, 'Roadmap should be valid');
  strictEqual(result.errors.length, 0, 'Should have no errors');
});

test('validateRoadmap - detects missing required fields', () => {
  const invalidRoadmap = {
    // Missing roadmap_id, title, source
  };

  const result = validateRoadmap(invalidRoadmap);

  strictEqual(result.valid, false, 'Roadmap should be invalid');
  ok(result.errors.length >= 2, 'Should have at least 2 errors');
});

// ============================================================
// Summary
// ============================================================

console.log('\n✓ All roadmap coordination layer tests passed!');
