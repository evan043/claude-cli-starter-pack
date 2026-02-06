import { test } from 'node:test';
import { strictEqual, deepStrictEqual, ok, throws } from 'assert';
import {
  generateSlug,
  createRoadmap,
  createPhase,
  createPlanReference,
  calculateCompletion,
  calculateOverallCompletion,
  getNextAvailablePhases,
} from '../src/roadmap/schema.js';

console.log('Running roadmap schema tests...\n');

// ============================================================================
// Slug Generation Tests
// ============================================================================

test('generateSlug - converts simple title to lowercase slug', () => {
  const result = generateSlug('My Project');
  strictEqual(result, 'my-project');
});

test('generateSlug - handles special characters', () => {
  const result = generateSlug('Auth & Security (2024)!');
  strictEqual(result, 'auth-security-2024');
});

test('generateSlug - removes leading and trailing hyphens', () => {
  const result = generateSlug('---Project Name---');
  strictEqual(result, 'project-name');
});

test('generateSlug - handles multiple consecutive special chars', () => {
  const result = generateSlug('Frontend :: React && TypeScript');
  strictEqual(result, 'frontend-react-typescript');
});

test('generateSlug - handles long strings with spaces', () => {
  const result = generateSlug('This is a very long project title with many words');
  strictEqual(result, 'this-is-a-very-long-project-title-with-many-words');
});

test('generateSlug - handles empty string', () => {
  const result = generateSlug('');
  strictEqual(result, '');
});

// ============================================================================
// Roadmap Creation Tests
// ============================================================================

test('createRoadmap - creates roadmap with default values', () => {
  const roadmap = createRoadmap();

  strictEqual(roadmap.title, 'Untitled Roadmap');
  strictEqual(roadmap.description, '');
  strictEqual(roadmap.status, 'planning');
  strictEqual(roadmap.source, 'manual');
  ok(Array.isArray(roadmap.phases));
  strictEqual(roadmap.phases.length, 0);
  ok(roadmap.roadmap_id);
  ok(roadmap.slug);
  ok(roadmap.created);
  ok(roadmap.updated);
});

test('createRoadmap - creates roadmap with custom options', () => {
  const options = {
    title: 'Backend API Refactor',
    description: 'Modernize backend architecture',
    source: 'github',
    milestone: 'v2.0',
  };

  const roadmap = createRoadmap(options);

  strictEqual(roadmap.title, 'Backend API Refactor');
  strictEqual(roadmap.description, 'Modernize backend architecture');
  strictEqual(roadmap.source, 'github');
  strictEqual(roadmap.milestone, 'v2.0');
  strictEqual(roadmap.slug, 'backend-api-refactor');
});

test('createRoadmap - uses provided roadmap_id and slug', () => {
  const options = {
    roadmap_id: 'custom-id-123',
    slug: 'custom-slug',
    title: 'Test Project',
  };

  const roadmap = createRoadmap(options);

  strictEqual(roadmap.roadmap_id, 'custom-id-123');
  strictEqual(roadmap.slug, 'custom-slug');
});

test('createRoadmap - initializes phase_dev_plan_refs array', () => {
  const roadmap = createRoadmap();

  ok(Array.isArray(roadmap.phase_dev_plan_refs));
  strictEqual(roadmap.phase_dev_plan_refs.length, 0);
});

test('createRoadmap - initializes metadata correctly', () => {
  const roadmap = createRoadmap();

  strictEqual(roadmap.metadata.plan_count, 0);
  strictEqual(roadmap.metadata.overall_completion_percentage, 0);
  strictEqual(roadmap.metadata.total_phases, 0);
  strictEqual(roadmap.metadata.completed_phases, 0);
  strictEqual(roadmap.metadata.completion_percentage, 0);
  strictEqual(roadmap.metadata.github_integrated, false);
  strictEqual(roadmap.metadata.last_github_sync, null);
});

// ============================================================================
// Phase Creation Tests
// ============================================================================

test('createPhase - creates phase with default values', () => {
  const phase = createPhase();

  strictEqual(phase.phase_title, 'Untitled Phase');
  strictEqual(phase.goal, '');
  strictEqual(phase.complexity, 'M');
  strictEqual(phase.status, 'pending');
  strictEqual(phase.phase_id, 'phase-1');
  ok(phase.inputs);
  ok(Array.isArray(phase.outputs));
});

test('createPhase - creates phase with custom options', () => {
  const options = {
    phase_title: 'Database Migration',
    goal: 'Migrate from MySQL to PostgreSQL',
    complexity: 'L',
    phase_number: 3,
  };

  const phase = createPhase(options);

  strictEqual(phase.phase_title, 'Database Migration');
  strictEqual(phase.goal, 'Migrate from MySQL to PostgreSQL');
  strictEqual(phase.complexity, 'L');
  strictEqual(phase.phase_id, 'phase-3');
});

test('createPhase - uses provided phase_id', () => {
  const options = {
    phase_id: 'custom-phase-id',
    phase_title: 'Test Phase',
  };

  const phase = createPhase(options);

  strictEqual(phase.phase_id, 'custom-phase-id');
});

test('createPhase - initializes inputs structure', () => {
  const phase = createPhase();

  ok(Array.isArray(phase.inputs.issues));
  ok(Array.isArray(phase.inputs.docs));
  ok(Array.isArray(phase.inputs.prompts));
  strictEqual(phase.inputs.issues.length, 0);
});

test('createPhase - sets phase_dev_config', () => {
  const options = { complexity: 'XL' };
  const phase = createPhase(options);

  strictEqual(phase.phase_dev_config.scale, 'XL');
  strictEqual(phase.phase_dev_config.progress_json_path, null);
});

test('createPhase - initializes metadata with timestamps', () => {
  const phase = createPhase();

  strictEqual(phase.metadata.total_tasks, 0);
  strictEqual(phase.metadata.completed_tasks, 0);
  ok(phase.metadata.created);
  strictEqual(phase.metadata.completed_at, null);
});

// ============================================================================
// Plan Reference Tests
// ============================================================================

test('createPlanReference - creates reference with required slug', () => {
  const options = {
    slug: 'auth-refactor',
    title: 'Authentication Refactor',
  };

  const ref = createPlanReference(options);

  strictEqual(ref.slug, 'auth-refactor');
  strictEqual(ref.title, 'Authentication Refactor');
  strictEqual(ref.path, '.claude/phase-plans/auth-refactor/PROGRESS.json');
  strictEqual(ref.status, 'pending');
  strictEqual(ref.completion_percentage, 0);
  ok(ref.created);
  ok(ref.updated);
});

test('createPlanReference - throws error without slug', () => {
  throws(
    () => createPlanReference({ title: 'Test' }),
    /Plan reference requires a slug/
  );
});

test('createPlanReference - accepts custom status and completion', () => {
  const options = {
    slug: 'test-plan',
    status: 'in_progress',
    completion_percentage: 45,
  };

  const ref = createPlanReference(options);

  strictEqual(ref.status, 'in_progress');
  strictEqual(ref.completion_percentage, 45);
});

// ============================================================================
// Completion Calculation Tests
// ============================================================================

test('calculateCompletion - returns 0 for empty phases', () => {
  const roadmap = createRoadmap();
  const completion = calculateCompletion(roadmap);
  strictEqual(completion, 0);
});

test('calculateCompletion - returns 0 when no phases completed', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'pending' },
    { phase_id: 'p2', status: 'in_progress' },
  ];

  const completion = calculateCompletion(roadmap);
  strictEqual(completion, 0);
});

test('calculateCompletion - returns 50% when half completed', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'completed' },
    { phase_id: 'p2', status: 'pending' },
  ];

  const completion = calculateCompletion(roadmap);
  strictEqual(completion, 50);
});

test('calculateCompletion - returns 100% when all completed', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'completed' },
    { phase_id: 'p2', status: 'completed' },
    { phase_id: 'p3', status: 'completed' },
  ];

  const completion = calculateCompletion(roadmap);
  strictEqual(completion, 100);
});

test('calculateCompletion - rounds to nearest integer', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'completed' },
    { phase_id: 'p2', status: 'pending' },
    { phase_id: 'p3', status: 'pending' },
  ];

  const completion = calculateCompletion(roadmap);
  strictEqual(completion, 33); // 33.33 rounded to 33
});

test('calculateOverallCompletion - falls back to legacy when no plan refs', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'completed' },
    { phase_id: 'p2', status: 'pending' },
  ];

  const completion = calculateOverallCompletion(roadmap);
  strictEqual(completion, 50);
});

test('calculateOverallCompletion - calculates average from plan refs', () => {
  const roadmap = createRoadmap();
  roadmap.phase_dev_plan_refs = [
    { slug: 'plan1', completion_percentage: 100 },
    { slug: 'plan2', completion_percentage: 50 },
    { slug: 'plan3', completion_percentage: 0 },
  ];

  const completion = calculateOverallCompletion(roadmap);
  strictEqual(completion, 50); // (100 + 50 + 0) / 3 = 50
});

// ============================================================================
// Available Phases Tests
// ============================================================================

test('getNextAvailablePhases - returns empty for roadmap with no phases', () => {
  const roadmap = createRoadmap();
  const available = getNextAvailablePhases(roadmap);

  strictEqual(available.length, 0);
});

test('getNextAvailablePhases - returns phases with no dependencies', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'pending', dependencies: [] },
    { phase_id: 'p2', status: 'pending', dependencies: [] },
  ];

  const available = getNextAvailablePhases(roadmap);

  strictEqual(available.length, 2);
});

test('getNextAvailablePhases - excludes completed phases', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'completed', dependencies: [] },
    { phase_id: 'p2', status: 'pending', dependencies: [] },
  ];

  const available = getNextAvailablePhases(roadmap);

  strictEqual(available.length, 1);
  strictEqual(available[0].phase_id, 'p2');
});

test('getNextAvailablePhases - excludes in_progress phases', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'in_progress', dependencies: [] },
    { phase_id: 'p2', status: 'pending', dependencies: [] },
  ];

  const available = getNextAvailablePhases(roadmap);

  strictEqual(available.length, 1);
  strictEqual(available[0].phase_id, 'p2');
});

test('getNextAvailablePhases - excludes phases with unmet dependencies', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'pending', dependencies: [] },
    { phase_id: 'p2', status: 'pending', dependencies: ['p1'] },
    { phase_id: 'p3', status: 'pending', dependencies: ['p1', 'p2'] },
  ];

  const available = getNextAvailablePhases(roadmap);

  strictEqual(available.length, 1);
  strictEqual(available[0].phase_id, 'p1');
});

test('getNextAvailablePhases - includes phases with met dependencies', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'completed', dependencies: [] },
    { phase_id: 'p2', status: 'pending', dependencies: ['p1'] },
    { phase_id: 'p3', status: 'pending', dependencies: ['p1'] },
  ];

  const available = getNextAvailablePhases(roadmap);

  strictEqual(available.length, 2);
  ok(available.some(p => p.phase_id === 'p2'));
  ok(available.some(p => p.phase_id === 'p3'));
});

test('getNextAvailablePhases - handles multiple dependency levels', () => {
  const roadmap = createRoadmap();
  roadmap.phases = [
    { phase_id: 'p1', status: 'completed', dependencies: [] },
    { phase_id: 'p2', status: 'completed', dependencies: ['p1'] },
    { phase_id: 'p3', status: 'pending', dependencies: ['p1', 'p2'] },
    { phase_id: 'p4', status: 'pending', dependencies: ['p3'] },
  ];

  const available = getNextAvailablePhases(roadmap);

  strictEqual(available.length, 1);
  strictEqual(available[0].phase_id, 'p3');
});

console.log('✓ All roadmap schema tests passed!');
