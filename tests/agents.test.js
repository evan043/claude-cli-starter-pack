/**
 * Agent Module Tests
 *
 * Tests for src/agents/ modules (spawner, l3-generator, state-manager, etc.)
 */

import { strictEqual, ok, deepStrictEqual } from 'assert';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import agent modules
import { generateL2Config, generateL3Config, AGENT_CONFIGS } from '../src/agents/spawner.js';
import { generateL3Workers, L3_WORKER_TYPES } from '../src/agents/l3-generator.js';
import { ResultAggregator } from '../src/agents/result-aggregator.js';
import {
  initializeState,
  loadState,
  addMessage,
  registerAgent,
  updateAgentStatus,
} from '../src/agents/state-manager.js';
import {
  checkPhaseAdvancement,
  advancePhase,
  calculateTaskCompletion,
} from '../src/agents/phase-advancer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test directory for state management tests
const TEST_DIR = join(__dirname, '.test-orchestrator');
const TEST_STATE_DIR = join(TEST_DIR, '.claude', 'orchestrator');

console.log('Running agent module tests...\n');

// ============================================================
// Setup & Cleanup
// ============================================================

function setupTestDir() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(TEST_STATE_DIR, { recursive: true });
}

function cleanupTestDir() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
}

// ============================================================
// Test 1: Agent Spawner - L2 Config Generation
// ============================================================

console.log('Test 1: L2 Config Generation...');

const testTask = {
  id: 'P1.1',
  title: 'Create login component',
  description: 'Implement login form with validation',
};

const testPhase = {
  phase_id: 'P1',
  phase_name: 'Frontend Foundation',
};

const testPlan = {
  plan_name: 'Auth System',
  plan_slug: 'auth-system',
};

const l2Config = generateL2Config(testTask, testPhase, testPlan, null);

ok(l2Config, 'L2 config should be generated');
ok(l2Config.prompt.includes('P1.1'), 'Prompt should include task ID');
ok(l2Config.prompt.includes('TASK_COMPLETE'), 'Prompt should include completion format');
strictEqual(l2Config.model, 'sonnet', 'L2 should use Sonnet model');
strictEqual(l2Config.subagent_type, 'general-purpose', 'Should use general-purpose agent type');

console.log('  ✓ L2 config generation passed\n');

// ============================================================
// Test 2: Agent Spawner - L3 Config Generation
// ============================================================

console.log('Test 2: L3 Config Generation...');

const l3Subtask = {
  type: 'search',
  query: 'Find all Button components',
  scope: 'src/components',
};

const l3Config = generateL3Config(l3Subtask, 'P1.1');

ok(l3Config, 'L3 config should be generated');
ok(l3Config.prompt.includes('L3 WORKER'), 'Prompt should indicate L3 worker');
strictEqual(l3Config.model, 'haiku', 'L3 should use Haiku model');
strictEqual(l3Config.subagent_type, 'Explore', 'Search tasks should use Explore agent');

console.log('  ✓ L3 config generation passed\n');

// ============================================================
// Test 3: L3 Generator - Worker Types
// ============================================================

console.log('Test 3: L3 Worker Type Generation...');

ok(L3_WORKER_TYPES.search, 'Search worker type should exist');
ok(L3_WORKER_TYPES.analyze, 'Analyze worker type should exist');
ok(L3_WORKER_TYPES.validate, 'Validate worker type should exist');
ok(L3_WORKER_TYPES.lint, 'Lint worker type should exist');

const workers = generateL3Workers(testTask, 'frontend');
ok(Array.isArray(workers), 'generateL3Workers should return an array');

console.log('  ✓ L3 worker type generation passed\n');

// ============================================================
// Test 4: Result Aggregator
// ============================================================

console.log('Test 4: Result Aggregator...');

const aggregator = new ResultAggregator('merge');

aggregator.addResult('worker-1', { files: ['a.ts', 'b.ts'], count: 5 });
aggregator.addResult('worker-2', { files: ['c.ts'], count: 3 });

const merged = aggregator.getAggregatedResult();

ok(merged.files.includes('a.ts'), 'Should include files from worker-1');
ok(merged.files.includes('c.ts'), 'Should include files from worker-2');

// Test sum strategy
const sumAggregator = new ResultAggregator('sum');
sumAggregator.addResult('w1', { count: 10 });
sumAggregator.addResult('w2', { count: 20 });

const summed = sumAggregator.getAggregatedResult();
strictEqual(summed.count, 30, 'Sum aggregator should sum count fields');

console.log('  ✓ Result aggregator passed\n');

// ============================================================
// Test 5: State Manager - Initialize
// ============================================================

console.log('Test 5: State Manager Initialization...');

setupTestDir();

initializeState(TEST_DIR, {
  roadmapSlug: 'test-roadmap',
  planName: 'Test Plan',
});

const statePath = join(TEST_STATE_DIR, 'state.json');
ok(existsSync(statePath), 'State file should be created');

const state = loadState(TEST_DIR);
ok(state, 'State should be loadable');
strictEqual(state.status, 'active', 'Initial status should be active');
strictEqual(state.roadmapSlug, 'test-roadmap', 'Should have roadmap slug');
ok(Array.isArray(state.activeAgents), 'Should have activeAgents array');
ok(Array.isArray(state.messages), 'Should have messages array');

console.log('  ✓ State manager initialization passed\n');

// ============================================================
// Test 6: State Manager - Agent Registration
// ============================================================

console.log('Test 6: Agent Registration...');

registerAgent(TEST_DIR, {
  agentId: 'l2-frontend-001',
  level: 'L2',
  domain: 'frontend',
  taskId: 'P1.1',
});

const stateWithAgent = loadState(TEST_DIR);
strictEqual(stateWithAgent.activeAgents.length, 1, 'Should have 1 active agent');
strictEqual(stateWithAgent.activeAgents[0].agentId, 'l2-frontend-001', 'Agent ID should match');
strictEqual(stateWithAgent.activeAgents[0].level, 'L2', 'Agent level should be L2');

console.log('  ✓ Agent registration passed\n');

// ============================================================
// Test 7: State Manager - Messaging
// ============================================================

console.log('Test 7: Agent Messaging...');

addMessage(TEST_DIR, {
  type: 'task_complete',
  sender: 'l2-frontend-001',
  recipient: 'orchestrator',
  payload: {
    taskId: 'P1.1',
    artifacts: ['src/Login.tsx'],
    summary: 'Created login component',
  },
});

const stateWithMessage = loadState(TEST_DIR);
strictEqual(stateWithMessage.messages.length, 1, 'Should have 1 message');
strictEqual(stateWithMessage.messages[0].type, 'task_complete', 'Message type should match');

console.log('  ✓ Agent messaging passed\n');

// ============================================================
// Test 8: State Manager - Status Update
// ============================================================

console.log('Test 8: Agent Status Update...');

updateAgentStatus(TEST_DIR, 'l2-frontend-001', 'completed', {
  taskId: 'P1.1',
  artifacts: ['src/Login.tsx'],
});

const stateUpdated = loadState(TEST_DIR);
// Agent should be moved from activeAgents to completedTasks
strictEqual(stateUpdated.activeAgents.length, 0, 'Active agents should be empty');
strictEqual(stateUpdated.completedTasks.length, 1, 'Should have 1 completed task');

console.log('  ✓ Agent status update passed\n');

// ============================================================
// Test 9: Phase Advancer - Task Completion Calculation
// ============================================================

console.log('Test 9: Task Completion Calculation...');

const testProgress = {
  phases: [
    {
      phase_id: 'P1',
      tasks: [
        { id: 'P1.1', status: 'completed' },
        { id: 'P1.2', status: 'completed' },
        { id: 'P1.3', status: 'pending' },
      ],
    },
    {
      phase_id: 'P2',
      tasks: [
        { id: 'P2.1', status: 'pending' },
        { id: 'P2.2', status: 'pending' },
      ],
    },
  ],
};

const p1Completion = calculateTaskCompletion(testProgress, 'P1');
strictEqual(p1Completion.completed, 2, 'P1 should have 2 completed');
strictEqual(p1Completion.total, 3, 'P1 should have 3 total');
strictEqual(Math.round(p1Completion.percentage), 67, 'P1 should be ~67% complete');

console.log('  ✓ Task completion calculation passed\n');

// ============================================================
// Test 10: Phase Advancer - Advancement Check
// ============================================================

console.log('Test 10: Phase Advancement Check...');

const progressAllComplete = {
  current_phase: 'P1',
  phases: [
    {
      phase_id: 'P1',
      status: 'in_progress',
      tasks: [
        { id: 'P1.1', status: 'completed' },
        { id: 'P1.2', status: 'completed' },
      ],
    },
    {
      phase_id: 'P2',
      status: 'pending',
      tasks: [{ id: 'P2.1', status: 'pending' }],
    },
  ],
};

const shouldAdvance = checkPhaseAdvancement(progressAllComplete);
ok(shouldAdvance.ready, 'Should be ready to advance when all tasks complete');
strictEqual(shouldAdvance.currentPhase, 'P1', 'Current phase should be P1');
strictEqual(shouldAdvance.nextPhase, 'P2', 'Next phase should be P2');

console.log('  ✓ Phase advancement check passed\n');

// ============================================================
// Cleanup
// ============================================================

cleanupTestDir();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✓ All agent module tests passed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
