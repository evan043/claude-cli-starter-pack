import { test } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'assert';
import {
  calculateProjectScale,
  adjustForEnhancements,
  forceScale,
} from '../src/commands/create-phase-dev/scale-calculator.js';

console.log('Running scale-calculator tests...\n');

// ============================================================
// calculateProjectScale() Tests
// ============================================================

test('calculateProjectScale - small project', () => {
  const scope = {
    linesOfCode: 'small',      // 1
    components: 'few',          // 1
    integrations: 'few',        // 1
    familiarity: 'high',        // 0 || 1 = 1 (JS falsy)
  };
  // Total score: 1 + 1 + 1 + 1 = 4 (≤ 4 → S)

  const result = calculateProjectScale(scope);

  strictEqual(result.scale, 'S', 'Should return S scale');
  strictEqual(result.scaleName, 'Small', 'Should return Small scale name');
  strictEqual(result.score, 4, 'Should calculate score as 4');
  ok(Array.isArray(result.phases), 'Should return phases array');
  ok(result.phases.length > 0, 'Should have at least one phase');
  ok(typeof result.taskEstimate === 'number', 'Should return task estimate');
  ok(result.scaleDefinition, 'Should include scale definition');
});

test('calculateProjectScale - medium project (score 7)', () => {
  const scope = {
    linesOfCode: 'medium',      // 2
    components: 'several',      // 2
    integrations: 'several',    // 2
    familiarity: 'medium',      // 1
  };
  // Total score: 2 + 2 + 2 + 1 = 7 (5-8 → M)

  const result = calculateProjectScale(scope);

  strictEqual(result.scale, 'M', 'Should return M scale');
  strictEqual(result.scaleName, 'Medium', 'Should return Medium scale name');
  strictEqual(result.score, 7, 'Should calculate score as 7');
  ok(result.phases.length > 0, 'Should have phases');
});

test('calculateProjectScale - large project', () => {
  const scope = {
    linesOfCode: 'xlarge',      // 4
    components: 'extensive',    // 4
    integrations: 'none',       // 0 || 1 = 1 (JS falsy)
    familiarity: 'low',         // 2
  };
  // Total score: 4 + 4 + 1 + 2 = 11 (≥ 9 → L)

  const result = calculateProjectScale(scope);

  strictEqual(result.scale, 'L', 'Should return L scale');
  strictEqual(result.scaleName, 'Large', 'Should return Large scale name');
  strictEqual(result.score, 11, 'Should calculate score as 11');
  ok(result.phases.length > 0, 'Should have phases');
});

test('calculateProjectScale - boundary score 5 with familiarity high', () => {
  const scope = {
    linesOfCode: 'small',       // 1
    components: 'few',          // 1
    integrations: 'several',    // 2
    familiarity: 'high',        // 0 || 1 = 1 (JS falsy)
  };
  // Total score: 1 + 1 + 2 + 1 = 5 (5-8 → M)

  const result = calculateProjectScale(scope);

  strictEqual(result.scale, 'M', 'Score 5 should be Medium');
  strictEqual(result.score, 5, 'Should calculate score as 5');
});

test('calculateProjectScale - boundary score 5 (medium)', () => {
  const scope = {
    linesOfCode: 'small',       // 1
    components: 'few',          // 1
    integrations: 'several',    // 2
    familiarity: 'medium',      // 1
  };
  // Total score: 1 + 1 + 2 + 1 = 5 (5-8 → M)

  const result = calculateProjectScale(scope);

  strictEqual(result.scale, 'M', 'Score 5 should be Medium');
  strictEqual(result.score, 5, 'Should calculate score as 5');
});

test('calculateProjectScale - boundary score 8 (medium)', () => {
  const scope = {
    linesOfCode: 'medium',      // 2
    components: 'several',      // 2
    integrations: 'several',    // 2
    familiarity: 'low',         // 2
  };
  // Total score: 2 + 2 + 2 + 2 = 8 (5-8 → M)

  const result = calculateProjectScale(scope);

  strictEqual(result.scale, 'M', 'Score 8 should be Medium');
  strictEqual(result.score, 8, 'Should calculate score as 8');
});

test('calculateProjectScale - boundary score 9 (large)', () => {
  const scope = {
    linesOfCode: 'large',       // 3
    components: 'several',      // 2
    integrations: 'several',    // 2
    familiarity: 'low',         // 2
  };
  // Total score: 3 + 2 + 2 + 2 = 9 (≥ 9 → L)

  const result = calculateProjectScale(scope);

  strictEqual(result.scale, 'L', 'Score 9 should be Large');
  strictEqual(result.score, 9, 'Should calculate score as 9');
});

test('calculateProjectScale - adds integration task when integrations present', () => {
  const scope = {
    linesOfCode: 'small',
    components: 'few',
    integrations: 'few',        // Not 'none'
    familiarity: 'high',
  };

  const result = calculateProjectScale(scope);
  const firstPhase = result.phases[0];

  // Should have integration task added to first phase
  const hasIntegrationTask = firstPhase.tasks.some(
    task => task.title.toLowerCase().includes('integration')
  );

  ok(hasIntegrationTask, 'Should add integration task when integrations !== none');
});

test('calculateProjectScale - no integration task when integrations none', () => {
  const scope = {
    linesOfCode: 'small',
    components: 'few',
    integrations: 'none',
    familiarity: 'high',
  };

  const result = calculateProjectScale(scope);
  const firstPhase = result.phases[0];

  // Should NOT have integration task in first phase
  const hasIntegrationTask = firstPhase.tasks.some(
    task => task.title.toLowerCase().includes('integration')
  );

  strictEqual(hasIntegrationTask, false, 'Should not add integration task when integrations = none');
});

test('calculateProjectScale - task estimate matches total tasks', () => {
  const scope = {
    linesOfCode: 'medium',
    components: 'several',
    integrations: 'several',
    familiarity: 'medium',
  };

  const result = calculateProjectScale(scope);

  const actualTaskCount = result.phases.reduce(
    (sum, phase) => sum + phase.tasks.length,
    0
  );

  strictEqual(result.taskEstimate, actualTaskCount, 'Task estimate should match total tasks');
});

// ============================================================
// adjustForEnhancements() Tests
// ============================================================

test('adjustForEnhancements - adds test tasks when testing enabled', () => {
  const scope = {
    linesOfCode: 'small',
    components: 'few',
    integrations: 'none',
    familiarity: 'high',
  };

  const baseResult = calculateProjectScale(scope);
  const originalTaskCount = baseResult.taskEstimate;

  const enhanced = adjustForEnhancements(baseResult, ['testing']);

  ok(enhanced.taskEstimate > originalTaskCount, 'Should increase task count');

  // Each phase should have a test task
  enhanced.phases.forEach((phase) => {
    const hasTestTask = phase.tasks.some(
      task => task.title.toLowerCase().includes('test')
    );
    ok(hasTestTask, `Phase ${phase.name} should have test task`);
  });
});

test('adjustForEnhancements - adds E2E phase for large projects with testing', () => {
  const scope = {
    linesOfCode: 'xlarge',
    components: 'extensive',
    integrations: 'many',
    familiarity: 'low',
  };

  const baseResult = calculateProjectScale(scope);
  const originalPhaseCount = baseResult.phases.length;

  const enhanced = adjustForEnhancements(baseResult, ['testing']);

  ok(enhanced.phases.length > originalPhaseCount, 'Should add E2E phase for large project');

  const lastPhase = enhanced.phases[enhanced.phases.length - 1];
  ok(
    lastPhase.name.toLowerCase().includes('e2e'),
    'Last phase should be E2E validation'
  );
});

test('adjustForEnhancements - no E2E phase for small/medium projects', () => {
  const scope = {
    linesOfCode: 'medium',
    components: 'several',
    integrations: 'several',
    familiarity: 'medium',
  };

  const baseResult = calculateProjectScale(scope); // Will be M scale
  const originalPhaseCount = baseResult.phases.length;

  const enhanced = adjustForEnhancements(baseResult, ['testing']);

  // Should NOT add extra phase for non-large projects
  strictEqual(
    enhanced.phases.length,
    originalPhaseCount,
    'Should not add E2E phase for medium project'
  );
});

test('adjustForEnhancements - no changes when no enhancements', () => {
  const scope = {
    linesOfCode: 'small',
    components: 'few',
    integrations: 'none',
    familiarity: 'high',
  };

  const baseResult = calculateProjectScale(scope);
  const enhanced = adjustForEnhancements(baseResult, []);

  strictEqual(
    enhanced.taskEstimate,
    baseResult.taskEstimate,
    'Should not change task count without enhancements'
  );
  strictEqual(
    enhanced.phases.length,
    baseResult.phases.length,
    'Should not change phase count without enhancements'
  );
});

test('adjustForEnhancements - updates task estimate after adding tasks', () => {
  const scope = {
    linesOfCode: 'large',
    components: 'many',
    integrations: 'several',
    familiarity: 'low',
  };

  const baseResult = calculateProjectScale(scope);
  const enhanced = adjustForEnhancements(baseResult, ['testing']);

  const actualTaskCount = enhanced.phases.reduce(
    (sum, phase) => sum + phase.tasks.length,
    0
  );

  strictEqual(
    enhanced.taskEstimate,
    actualTaskCount,
    'Task estimate should be updated after enhancements'
  );
});

// ============================================================
// forceScale() Tests
// ============================================================

test('forceScale - forces S scale', () => {
  const result = forceScale('S');

  strictEqual(result.scale, 'S', 'Should force S scale');
  strictEqual(result.scaleName, 'Small', 'Should have Small scale name');
  strictEqual(result.score, -1, 'Should indicate forced with score -1');
  ok(result.phases.length > 0, 'Should have phases');
  ok(typeof result.taskEstimate === 'number', 'Should have task estimate');
  ok(result.scaleDefinition, 'Should have scale definition');
});

test('forceScale - forces M scale', () => {
  const result = forceScale('M');

  strictEqual(result.scale, 'M', 'Should force M scale');
  strictEqual(result.scaleName, 'Medium', 'Should have Medium scale name');
  strictEqual(result.score, -1, 'Should indicate forced with score -1');
});

test('forceScale - forces L scale', () => {
  const result = forceScale('L');

  strictEqual(result.scale, 'L', 'Should force L scale');
  strictEqual(result.scaleName, 'Large', 'Should have Large scale name');
  strictEqual(result.score, -1, 'Should indicate forced with score -1');
});

test('forceScale - handles lowercase scale input', () => {
  const result = forceScale('s');

  strictEqual(result.scale, 'S', 'Should normalize lowercase to uppercase');
});

test('forceScale - throws error for invalid scale', () => {
  let errorThrown = false;

  try {
    forceScale('X');
  } catch (err) {
    errorThrown = true;
    ok(err.message.includes('Invalid scale'), 'Should throw error with message');
  }

  ok(errorThrown, 'Should throw error for invalid scale');
});

test('forceScale - accepts scope parameter for integration tasks', () => {
  const scope = {
    integrations: 'several',
  };

  const result = forceScale('S', scope);

  strictEqual(result.scale, 'S', 'Should force S scale');

  const firstPhase = result.phases[0];
  const hasIntegrationTask = firstPhase.tasks.some(
    task => task.title.toLowerCase().includes('integration')
  );

  ok(hasIntegrationTask, 'Should add integration task when scope provided');
});

test('forceScale - task estimate matches total tasks', () => {
  const result = forceScale('M');

  const actualTaskCount = result.phases.reduce(
    (sum, phase) => sum + phase.tasks.length,
    0
  );

  strictEqual(
    result.taskEstimate,
    actualTaskCount,
    'Task estimate should match total tasks'
  );
});

console.log('\n✓ All scale-calculator tests passed!');
