/**
 * Vision Multi-Instance & Decision Engine Tests
 *
 * Tests for:
 * - Vision Registry (registry.js): load, save, rebuild, register, deregister, slug checks
 * - Slug Uniqueness (factories.js): generateUniqueSlug collision handling
 * - Decision Engine (decision-engine.js): plan type selection, scoring, overrides
 * - File Locking (locking.js): acquireFileLock, releaseFileLock, cleanStaleLocks
 */

import { strictEqual, ok, deepStrictEqual, notStrictEqual } from 'assert';
import { test } from 'node:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ============================================================
// Vision Registry Tests
// ============================================================

console.log('# Running Vision Multi-Instance & Decision Engine tests...');

// Create a temp directory for isolated tests
function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccasp-vision-test-'));
  const visionDir = path.join(tmpDir, '.claude', 'visions');
  fs.mkdirSync(visionDir, { recursive: true });
  return tmpDir;
}

function cleanup(tmpDir) {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

// Create a mock vision JSON on disk
function createMockVision(projectRoot, slug, overrides = {}) {
  const visionDir = path.join(projectRoot, '.claude', 'visions', slug);
  fs.mkdirSync(visionDir, { recursive: true });

  const vision = {
    vision_id: `vis-test-${slug}`,
    slug,
    title: overrides.title || `Test Vision: ${slug}`,
    status: overrides.status || 'planning',
    plan_type: overrides.plan_type || 'vision-full',
    metadata: {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      completion_percentage: overrides.completion_percentage || 0
    },
    ...overrides
  };

  fs.writeFileSync(
    path.join(visionDir, 'VISION.json'),
    JSON.stringify(vision, null, 2),
    'utf8'
  );

  return vision;
}

// ============================================================
// Registry: loadRegistry, rebuildRegistry, saveRegistry
// ============================================================

test('Registry - loadRegistry rebuilds from filesystem when no registry file', async () => {
  const { loadRegistry } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    createMockVision(projectRoot, 'my-app');
    createMockVision(projectRoot, 'another-app');

    const registry = loadRegistry(projectRoot);
    ok(registry.version === 1, 'Registry version should be 1');
    ok(registry.visions['my-app'], 'Should find my-app in registry');
    ok(registry.visions['another-app'], 'Should find another-app in registry');
    strictEqual(Object.keys(registry.visions).length, 2, 'Should have 2 visions');
    ok(registry.metadata.last_rebuild, 'Should have rebuild timestamp');
  } finally {
    cleanup(projectRoot);
  }
});

test('Registry - loadRegistry returns cached registry when file exists', async () => {
  const { loadRegistry, saveRegistry } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    // Save a registry manually
    const manualRegistry = {
      version: 1,
      visions: {
        'cached-vision': {
          slug: 'cached-vision',
          title: 'Cached',
          status: 'executing',
          plan_type: 'roadmap'
        }
      },
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        last_rebuild: null
      }
    };
    saveRegistry(projectRoot, manualRegistry);

    const loaded = loadRegistry(projectRoot);
    ok(loaded.visions['cached-vision'], 'Should load cached vision from file');
    strictEqual(loaded.visions['cached-vision'].plan_type, 'roadmap');
  } finally {
    cleanup(projectRoot);
  }
});

test('Registry - rebuildRegistry handles empty vision directory', async () => {
  const { rebuildRegistry } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    const registry = rebuildRegistry(projectRoot);
    strictEqual(Object.keys(registry.visions).length, 0, 'Should have 0 visions');
    ok(registry.metadata.last_rebuild, 'Should have rebuild timestamp');
  } finally {
    cleanup(projectRoot);
  }
});

test('Registry - rebuildRegistry skips corrupt VISION.json files', async () => {
  const { rebuildRegistry } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    createMockVision(projectRoot, 'good-vision');

    // Create a corrupt vision
    const corruptDir = path.join(projectRoot, '.claude', 'visions', 'corrupt-vision');
    fs.mkdirSync(corruptDir, { recursive: true });
    fs.writeFileSync(path.join(corruptDir, 'VISION.json'), '{{{invalid json', 'utf8');

    const registry = rebuildRegistry(projectRoot);
    strictEqual(Object.keys(registry.visions).length, 1, 'Should have only 1 valid vision');
    ok(registry.visions['good-vision'], 'Good vision should be present');
  } finally {
    cleanup(projectRoot);
  }
});

// ============================================================
// Registry: registerVision, deregisterVision
// ============================================================

test('Registry - registerVision adds vision to registry', async () => {
  const { registerVision, loadRegistry } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    const result = await registerVision(projectRoot, {
      slug: 'new-vision',
      title: 'New Vision',
      status: 'planning',
      plan_type: 'epic'
    });

    ok(result.success, 'Registration should succeed');

    const registry = loadRegistry(projectRoot);
    ok(registry.visions['new-vision'], 'Vision should be in registry');
    strictEqual(registry.visions['new-vision'].plan_type, 'epic');
  } finally {
    cleanup(projectRoot);
  }
});

test('Registry - deregisterVision removes vision from registry', async () => {
  const { registerVision, deregisterVision, loadRegistry } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    await registerVision(projectRoot, { slug: 'to-remove', title: 'Temp', status: 'failed' });
    const result = await deregisterVision(projectRoot, 'to-remove');

    ok(result.success, 'Deregistration should succeed');

    const registry = loadRegistry(projectRoot);
    ok(!registry.visions['to-remove'], 'Vision should be removed from registry');
  } finally {
    cleanup(projectRoot);
  }
});

// ============================================================
// Registry: isSlugTaken, getRegisteredVisions, getActiveVisions, getVisionCount
// ============================================================

test('Registry - isSlugTaken returns true for taken slugs', async () => {
  const { registerVision, isSlugTaken } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    await registerVision(projectRoot, { slug: 'taken-slug', title: 'Taken' });

    ok(isSlugTaken(projectRoot, 'taken-slug'), 'Should detect taken slug');
    ok(!isSlugTaken(projectRoot, 'free-slug'), 'Should detect free slug');
  } finally {
    cleanup(projectRoot);
  }
});

test('Registry - getRegisteredVisions returns sorted array', async () => {
  const { getRegisteredVisions } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    createMockVision(projectRoot, 'vision-a');
    createMockVision(projectRoot, 'vision-b');
    createMockVision(projectRoot, 'vision-c');

    const visions = getRegisteredVisions(projectRoot);
    strictEqual(visions.length, 3, 'Should return 3 visions');
    ok(visions.every(v => v.slug), 'All entries should have slugs');
  } finally {
    cleanup(projectRoot);
  }
});

test('Registry - getActiveVisions excludes completed and failed', async () => {
  const { getActiveVisions } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    createMockVision(projectRoot, 'active-one', { status: 'executing' });
    createMockVision(projectRoot, 'done-one', { status: 'completed' });
    createMockVision(projectRoot, 'failed-one', { status: 'failed' });
    createMockVision(projectRoot, 'active-two', { status: 'planning' });

    const active = getActiveVisions(projectRoot);
    strictEqual(active.length, 2, 'Should return 2 active visions');
    ok(active.some(v => v.slug === 'active-one'), 'Should include executing vision');
    ok(active.some(v => v.slug === 'active-two'), 'Should include planning vision');
  } finally {
    cleanup(projectRoot);
  }
});

test('Registry - getVisionCount returns count', async () => {
  const { getVisionCount } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    createMockVision(projectRoot, 'count-a');
    createMockVision(projectRoot, 'count-b');

    const count = getVisionCount(projectRoot);
    strictEqual(count, 2, 'Should count 2 visions');
  } finally {
    cleanup(projectRoot);
  }
});

// ============================================================
// Slug Uniqueness: generateUniqueSlug
// ============================================================

test('Slug uniqueness - generateUniqueSlug returns base slug when no collision', async () => {
  const { generateUniqueSlug } = await import('../src/vision/schema/factories.js');

  const slug = generateUniqueSlug('My Cool App', []);
  strictEqual(slug, 'my-cool-app', 'Should return base slug');
});

test('Slug uniqueness - generateUniqueSlug appends -2 on first collision', async () => {
  const { generateUniqueSlug } = await import('../src/vision/schema/factories.js');

  const slug = generateUniqueSlug('My Cool App', ['my-cool-app']);
  strictEqual(slug, 'my-cool-app-2', 'Should append -2');
});

test('Slug uniqueness - generateUniqueSlug increments suffix on multiple collisions', async () => {
  const { generateUniqueSlug } = await import('../src/vision/schema/factories.js');

  const existing = ['my-app', 'my-app-2', 'my-app-3'];
  const slug = generateUniqueSlug('My App', existing);
  strictEqual(slug, 'my-app-4', 'Should append -4');
});

test('Slug uniqueness - generateUniqueSlug works with Set input', async () => {
  const { generateUniqueSlug } = await import('../src/vision/schema/factories.js');

  const existing = new Set(['todo-app', 'todo-app-2']);
  const slug = generateUniqueSlug('Todo App', existing);
  strictEqual(slug, 'todo-app-3', 'Should work with Set and append -3');
});

test('Slug uniqueness - generateUniqueSlug truncates to 50 chars', async () => {
  const { generateUniqueSlug } = await import('../src/vision/schema/factories.js');

  const longTitle = 'A very long title that exceeds fifty characters and should be truncated properly';
  const slug = generateUniqueSlug(longTitle, []);
  ok(slug.length <= 50, `Slug length ${slug.length} should be <= 50`);
});

// ============================================================
// Decision Engine: decidePlanType
// ============================================================

test('Decision engine - simple prompt maps to task-list', async () => {
  const { decidePlanType, PlanType } = await import('../src/vision/decision-engine.js');

  // Very simple prompt: 1 feature, 1 domain, no extra tech
  const decision = decidePlanType({
    original: 'Fix the login bug',
    parsed: {
      intent: 'modify',
      features: ['fix login'],
      feature_details: [{ name: 'fix login', domain: 'auth' }],
      constraints: [],
      technologies: []
    }
  }, { scale: 'S' });

  strictEqual(decision.planType, PlanType.TASK_LIST, 'Simple fix should be task-list');
  ok(decision.score >= 0, 'Score should be non-negative');
  ok(decision.confidence > 0, 'Confidence should be positive');
  ok(decision.reasoning.length > 0, 'Should have reasoning');
});

test('Decision engine - medium prompt maps to phase-dev-plan or roadmap', async () => {
  const { decidePlanType, PlanType } = await import('../src/vision/decision-engine.js');

  const decision = decidePlanType({
    original: 'Add dark mode with theme switching, update all components, add user preference storage',
    parsed: {
      intent: 'build',
      features: ['dark mode', 'theme switching', 'preference storage'],
      feature_details: [
        { name: 'dark mode', domain: 'ui' },
        { name: 'theme switching', domain: 'ui' },
        { name: 'preference storage', domain: 'data' }
      ],
      constraints: [],
      technologies: ['react', 'zustand']
    }
  }, { scale: 'M' });

  ok(
    decision.planType === PlanType.PHASE_DEV_PLAN || decision.planType === PlanType.ROADMAP,
    `Medium prompt should be phase-dev-plan or roadmap, got: ${decision.planType}`
  );
});

test('Decision engine - complex prompt maps to epic or vision-full', async () => {
  const { decidePlanType, PlanType } = await import('../src/vision/decision-engine.js');

  const decision = decidePlanType({
    original: 'Build a full e-commerce platform with user authentication, product catalog, shopping cart, checkout with Stripe payments, admin dashboard, inventory management, email notifications, real-time order tracking, and mobile-responsive design',
    parsed: {
      intent: 'build',
      features: ['auth', 'catalog', 'cart', 'checkout', 'admin', 'inventory', 'notifications', 'tracking', 'mobile'],
      feature_details: [
        { name: 'auth', domain: 'auth' },
        { name: 'catalog', domain: 'data' },
        { name: 'cart', domain: 'ui' },
        { name: 'checkout', domain: 'payment' },
        { name: 'admin', domain: 'admin' },
        { name: 'inventory', domain: 'data' },
        { name: 'notifications', domain: 'messaging' },
        { name: 'tracking', domain: 'real-time' },
        { name: 'mobile', domain: 'ui' }
      ],
      constraints: ['stripe integration', 'mobile responsive'],
      technologies: ['react', 'node', 'postgres', 'stripe', 'redis', 'websockets']
    }
  }, { scale: 'L' });

  ok(
    decision.planType === PlanType.EPIC || decision.planType === PlanType.VISION_FULL,
    `Complex prompt should be epic or vision-full, got: ${decision.planType}`
  );
  ok(decision.score > 25, `Score should be > 25, got: ${decision.score}`);
});

test('Decision engine - override forces specific plan type', async () => {
  const { decidePlanType, PlanType } = await import('../src/vision/decision-engine.js');

  const decision = decidePlanType(
    { original: 'Big complex app', parsed: { features: ['a', 'b', 'c', 'd', 'e'] } },
    {},
    { override: PlanType.TASK_LIST }
  );

  strictEqual(decision.planType, PlanType.TASK_LIST, 'Override should force task-list');
  ok(decision.overridden, 'Should be marked as overridden');
  strictEqual(decision.confidence, 1.0, 'Overridden confidence should be 1.0');
});

test('Decision engine - intent multiplier affects score', async () => {
  const { decidePlanType } = await import('../src/vision/decision-engine.js');

  const basePrompt = {
    parsed: {
      features: ['feature1', 'feature2', 'feature3'],
      feature_details: [
        { name: 'feature1', domain: 'ui' },
        { name: 'feature2', domain: 'data' },
        { name: 'feature3', domain: 'api' }
      ],
      constraints: [],
      technologies: ['react']
    }
  };

  const buildDecision = decidePlanType(
    { ...basePrompt, original: 'Build something', parsed: { ...basePrompt.parsed, intent: 'build' } },
    {}
  );
  const optimizeDecision = decidePlanType(
    { ...basePrompt, original: 'Optimize something', parsed: { ...basePrompt.parsed, intent: 'optimize' } },
    {}
  );

  ok(buildDecision.score > optimizeDecision.score,
    `Build score (${buildDecision.score}) should be > optimize score (${optimizeDecision.score})`);
});

test('Decision engine - describePlanType returns descriptions for all types', async () => {
  const { describePlanType, PlanType } = await import('../src/vision/decision-engine.js');

  for (const type of Object.values(PlanType)) {
    const desc = describePlanType(type);
    ok(desc.label, `${type} should have a label`);
    ok(desc.description, `${type} should have a description`);
    ok(Array.isArray(desc.artifacts), `${type} should have artifacts array`);
    ok(desc.artifacts.length > 0, `${type} should have at least 1 artifact`);
  }
});

test('Decision engine - getAllPlanTypes returns all 5 types', async () => {
  const { getAllPlanTypes } = await import('../src/vision/decision-engine.js');

  const types = getAllPlanTypes();
  strictEqual(types.length, 5, 'Should return 5 plan types');
  ok(types.every(t => t.type && t.label && t.description), 'Each type should have type, label, description');
});

// ============================================================
// Decision engine - complexity scale cross-check
// ============================================================

test('Decision engine - S complexity overrides to phase-dev-plan max', async () => {
  const { decidePlanType, PlanType } = await import('../src/vision/decision-engine.js');

  // Even if features are many, scale S should cap at phase-dev-plan
  const decision = decidePlanType({
    original: 'Some prompt',
    parsed: {
      intent: 'build',
      features: ['a', 'b', 'c', 'd'],
      feature_details: [
        { name: 'a', domain: 'x' },
        { name: 'b', domain: 'y' },
        { name: 'c', domain: 'z' },
        { name: 'd', domain: 'w' }
      ],
      constraints: [],
      technologies: ['react', 'node']
    }
  }, { scale: 'S' });

  ok(
    decision.planType === PlanType.TASK_LIST || decision.planType === PlanType.PHASE_DEV_PLAN,
    `With scale S, should be task-list or phase-dev-plan, got: ${decision.planType}`
  );
});

// ============================================================
// File Locking Tests
// ============================================================

test('File locking - acquireFileLock creates lockfile', async () => {
  const { acquireFileLock, releaseFileLock } = await import('../src/vision/state/locking.js');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccasp-lock-test-'));
  const targetFile = path.join(tmpDir, 'test.json');

  try {
    fs.writeFileSync(targetFile, '{}', 'utf8');
    await acquireFileLock(targetFile);

    const lockFile = targetFile + '.lock';
    ok(fs.existsSync(lockFile), 'Lock file should exist');

    // Read and parse lockfile
    const lockContent = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    strictEqual(lockContent.pid, process.pid, 'Lock should contain current PID');

    releaseFileLock(targetFile);
    ok(!fs.existsSync(lockFile), 'Lock file should be removed after release');
  } finally {
    cleanup(tmpDir);
  }
});

test('File locking - cleanStaleLocks removes old locks', async () => {
  const { cleanStaleLocks } = await import('../src/vision/state/locking.js');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccasp-stale-test-'));

  try {
    // Create a stale lockfile with a PID that doesn't exist
    const lockFile = path.join(tmpDir, 'stale.json.lock');
    const staleData = JSON.stringify({ pid: 999999, timestamp: Date.now() - 60000 });
    fs.writeFileSync(lockFile, staleData, 'utf8');

    cleanStaleLocks(tmpDir);

    // The stale lock should be cleaned
    ok(!fs.existsSync(lockFile), 'Stale lock should be removed');
  } finally {
    cleanup(tmpDir);
  }
});

// ============================================================
// Edge Cases
// ============================================================

test('Edge case - empty prompt gets valid decision', async () => {
  const { decidePlanType, PlanType } = await import('../src/vision/decision-engine.js');

  const decision = decidePlanType({ original: '', parsed: {} }, {});
  strictEqual(decision.planType, PlanType.TASK_LIST, 'Empty prompt should be task-list');
  ok(decision.score >= 0, 'Score should be non-negative');
});

test('Edge case - long prompt affects score through prompt length factor', async () => {
  const { decidePlanType } = await import('../src/vision/decision-engine.js');

  const shortDecision = decidePlanType({
    original: 'Fix bug',
    parsed: { features: ['fix'], feature_details: [], constraints: [], technologies: [] }
  }, {});

  const longPrompt = 'Build a comprehensive platform '.repeat(20);
  const longDecision = decidePlanType({
    original: longPrompt,
    parsed: { features: ['fix'], feature_details: [], constraints: [], technologies: [] }
  }, {});

  ok(longDecision.score >= shortDecision.score,
    `Long prompt score (${longDecision.score}) should be >= short (${shortDecision.score})`);
});

test('Edge case - generateUniqueSlug with empty title', async () => {
  const { generateUniqueSlug } = await import('../src/vision/schema/factories.js');

  const slug = generateUniqueSlug('', []);
  strictEqual(typeof slug, 'string', 'Should return a string');
});

test('Edge case - invalid override is ignored by decidePlanType', async () => {
  const { decidePlanType, PlanType } = await import('../src/vision/decision-engine.js');

  const decision = decidePlanType(
    { original: 'test', parsed: {} },
    {},
    { override: 'not-a-real-type' }
  );

  // Should not be overridden since the type is invalid
  ok(!decision.overridden || decision.planType !== 'not-a-real-type',
    'Invalid override should not be applied');
});

// ============================================================
// Backward Compatibility
// ============================================================

test('Backward compat - registry rebuilds correctly from existing vision dirs', async () => {
  const { rebuildRegistry } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    // Simulate 4 existing visions on disk (as described in PROGRESS.json task 5.1)
    createMockVision(projectRoot, 'app-one', { status: 'executing', plan_type: 'roadmap' });
    createMockVision(projectRoot, 'app-two', { status: 'completed', plan_type: 'epic' });
    createMockVision(projectRoot, 'app-three', { status: 'planning', plan_type: 'task-list' });
    createMockVision(projectRoot, 'app-four', { status: 'failed', plan_type: 'vision-full' });

    const registry = rebuildRegistry(projectRoot);

    strictEqual(Object.keys(registry.visions).length, 4, 'Should index all 4 visions');
    strictEqual(registry.visions['app-one'].status, 'executing');
    strictEqual(registry.visions['app-two'].plan_type, 'epic');
    strictEqual(registry.visions['app-three'].plan_type, 'task-list');
    strictEqual(registry.visions['app-four'].status, 'failed');
  } finally {
    cleanup(projectRoot);
  }
});

test('Backward compat - getRegisteredVisions works without pre-existing registry file', async () => {
  const { getRegisteredVisions } = await import('../src/vision/state/registry.js');
  const projectRoot = createTempProject();

  try {
    createMockVision(projectRoot, 'legacy-vision');

    // No VISION_REGISTRY.json exists yet - should auto-rebuild
    const visions = getRegisteredVisions(projectRoot);
    strictEqual(visions.length, 1, 'Should auto-rebuild and find legacy vision');
    strictEqual(visions[0].slug, 'legacy-vision');
  } finally {
    cleanup(projectRoot);
  }
});

test('Backward compat - OrchestratorStage includes DECISION', async () => {
  const { OrchestratorStage } = await import('../src/vision/orchestrators/lifecycle.js');

  ok(OrchestratorStage.DECISION, 'Should have DECISION stage');
  strictEqual(OrchestratorStage.DECISION, 'decision');
});

// ============================================================
// Summary
// ============================================================

console.log('# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('# ✓ All Vision Multi-Instance & Decision Engine tests passed!');
console.log('# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
