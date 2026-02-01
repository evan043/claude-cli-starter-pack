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
import { generateL2Config, generateL3Config, AGENT_CONFIGS, detectTaskDomain } from '../src/agents/spawner.js';
import { generateL3Worker, generateL3Workers, L3_WORKER_TYPES, parseL3Result } from '../src/agents/l3-generator.js';
import { ResultAggregator } from '../src/agents/result-aggregator.js';
import {
  initOrchestratorState,
  loadState,
  addMessage,
  addActiveAgent,
  updateAgentStatus,
} from '../src/agents/state-manager.js';
import {
  getPhaseStatus,
  findNextPhase,
  advancePhase,
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
  name: 'Frontend Foundation',
};

const testPlan = {
  plan_name: 'Auth System',
  plan_id: 'auth-system',
};

const l2Config = generateL2Config(testTask, testPhase, testPlan, null);

ok(l2Config, 'L2 config should be generated');
ok(l2Config.prompt.includes('P1.1'), 'Prompt should include task ID');
ok(l2Config.prompt.includes('TASK_COMPLETE'), 'Prompt should include completion format');
strictEqual(l2Config.model, 'sonnet', 'L2 should use Sonnet model');
strictEqual(l2Config.subagentType, 'general-purpose', 'Should use general-purpose agent type');

console.log('  ✓ L2 config generation passed\n');

// ============================================================
// Test 2: Agent Spawner - Domain Detection
// ============================================================

console.log('Test 2: Domain Detection...');

strictEqual(detectTaskDomain({ title: 'Create React component' }), 'frontend');
strictEqual(detectTaskDomain({ title: 'Build API endpoint' }), 'backend');
strictEqual(detectTaskDomain({ title: 'Write unit tests' }), 'testing');
strictEqual(detectTaskDomain({ title: 'Deploy to production' }), 'deployment');
strictEqual(detectTaskDomain({ title: 'Update the changelog' }), 'general');

console.log('  ✓ Domain detection passed\n');

// ============================================================
// Test 3: L3 Generator - Worker Types
// ============================================================

console.log('Test 3: L3 Worker Type Generation...');

ok(L3_WORKER_TYPES.search, 'Search worker type should exist');
ok(L3_WORKER_TYPES.analyze, 'Analyze worker type should exist');
ok(L3_WORKER_TYPES.validate, 'Validate worker type should exist');
ok(L3_WORKER_TYPES.lint, 'Lint worker type should exist');

const searchWorker = generateL3Worker('search', { query: 'Find Button components', scope: 'src/' });
ok(searchWorker, 'Search worker should be generated');
strictEqual(searchWorker.model, 'haiku', 'L3 should use Haiku model');
strictEqual(searchWorker.subagentType, 'Explore', 'Search tasks should use Explore agent');

console.log('  ✓ L3 worker type generation passed\n');

// ============================================================
// Test 4: L3 Generator - Batch Generation
// ============================================================

console.log('Test 4: L3 Batch Generation...');

const batchTasks = [
  { type: 'search', query: 'Find imports' },
  { type: 'analyze', target: 'src/index.js', question: 'What does this export?' },
];

const workers = generateL3Workers(batchTasks, { correlationId: 'test-batch' });
ok(Array.isArray(workers), 'generateL3Workers should return an array');
strictEqual(workers.length, 2, 'Should generate 2 workers');

console.log('  ✓ L3 batch generation passed\n');

// ============================================================
// Test 5: Result Aggregator
// ============================================================

console.log('Test 5: Result Aggregator...');

const aggregator = new ResultAggregator({ strategy: 'merge' });

aggregator.addResult('worker-1', { status: 'completed', data: ['a.ts', 'b.ts'] });
aggregator.addResult('worker-2', { status: 'completed', data: ['c.ts'] });

const merged = aggregator.aggregate();

ok(merged.result.items.includes('a.ts'), 'Should include files from worker-1');
ok(merged.result.items.includes('c.ts'), 'Should include files from worker-2');
strictEqual(merged.result.totalCount, 3, 'Should have 3 total items');

console.log('  ✓ Result aggregator passed\n');

// ============================================================
// Test 6: State Manager - Initialize
// ============================================================

console.log('Test 6: State Manager Initialization...');

setupTestDir();

await initOrchestratorState(TEST_DIR, {
  planId: 'test-plan',
  planPath: '/test/path',
  pendingTasks: ['P1.1', 'P1.2'],
});

const statePath = join(TEST_STATE_DIR, 'state.json');
ok(existsSync(statePath), 'State file should be created');

const state = loadState(TEST_DIR);
ok(state, 'State should be loadable');
strictEqual(state.status, 'active', 'Initial status should be active');
strictEqual(state.planId, 'test-plan', 'Should have plan ID');
ok(Array.isArray(state.activeAgents), 'Should have activeAgents array');
ok(Array.isArray(state.messages), 'Should have messages array');

console.log('  ✓ State manager initialization passed\n');

// ============================================================
// Test 7: State Manager - Agent Registration
// ============================================================

console.log('Test 7: Agent Registration...');

await addActiveAgent(TEST_DIR, {
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
// Test 8: State Manager - Messaging
// ============================================================

console.log('Test 8: Agent Messaging...');

await addMessage(TEST_DIR, {
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
// Test 9: State Manager - Status Update
// ============================================================

console.log('Test 9: Agent Status Update...');

await updateAgentStatus(TEST_DIR, 'l2-frontend-001', 'completed', {
  taskId: 'P1.1',
  artifacts: ['src/Login.tsx'],
});

const stateUpdated = loadState(TEST_DIR);
// Agent should be moved from activeAgents to completedTasks
strictEqual(stateUpdated.activeAgents.length, 0, 'Active agents should be empty');
ok(stateUpdated.completedTasks.includes('P1.1'), 'P1.1 should be in completed tasks');

console.log('  ✓ Agent status update passed\n');

// ============================================================
// Test 10: Phase Advancer - Phase Status
// ============================================================

console.log('Test 10: Phase Status Calculation...');

const testPhases = [
  {
    phase_id: 'P1',
    name: 'Phase 1',
    status: 'in_progress',
    tasks: [
      { id: 'P1.1', status: 'completed' },
      { id: 'P1.2', status: 'completed' },
      { id: 'P1.3', status: 'pending' },
    ],
  },
  {
    phase_id: 'P2',
    name: 'Phase 2',
    status: 'pending',
    dependencies: ['P1'],
    tasks: [
      { id: 'P2.1', status: 'pending' },
      { id: 'P2.2', status: 'pending' },
    ],
  },
];

const p1Status = getPhaseStatus(testPhases[0], testPhases);
strictEqual(p1Status.progress.completed, 2, 'P1 should have 2 completed tasks');
strictEqual(p1Status.progress.total, 3, 'P1 should have 3 total tasks');
strictEqual(p1Status.progress.percentage, 67, 'P1 should be 67% complete');
strictEqual(p1Status.isComplete, false, 'P1 should not be complete');

console.log('  ✓ Phase status calculation passed\n');

// ============================================================
// Test 11: Phase Advancer - Next Phase Finding
// ============================================================

console.log('Test 11: Next Phase Finding...');

const completedPhases = [
  {
    phase_id: 'P1',
    name: 'Phase 1',
    status: 'completed',
    tasks: [
      { id: 'P1.1', status: 'completed' },
      { id: 'P1.2', status: 'completed' },
    ],
  },
  {
    phase_id: 'P2',
    name: 'Phase 2',
    status: 'pending',
    dependencies: ['P1'],
    tasks: [{ id: 'P2.1', status: 'pending' }],
  },
];

const nextInfo = findNextPhase(completedPhases, 'P1');
ok(nextInfo.nextPhase, 'Should find next phase');
strictEqual(nextInfo.nextPhase.phase_id, 'P2', 'Next phase should be P2');

console.log('  ✓ Next phase finding passed\n');

// ============================================================
// Test 12: L3 Result Parsing
// ============================================================

console.log('Test 12: L3 Result Parsing...');

const l3Output = `
L3_RESULT: search-001
STATUS: completed
DATA:
- src/Button.tsx
- src/Input.tsx
- src/Modal.tsx
FILES_FOUND: 3
SEARCH_COMPLETE: true
`;

const parsed = parseL3Result(l3Output);
ok(parsed, 'Should parse L3 result');
strictEqual(parsed.id, 'search-001', 'Should extract ID');
strictEqual(parsed.status, 'completed', 'Should extract status');
strictEqual(parsed.data.length, 3, 'Should extract 3 data items');
strictEqual(parsed.filesFound, 3, 'Should extract files found count');

console.log('  ✓ L3 result parsing passed\n');

// ============================================================
// Cleanup
// ============================================================

cleanupTestDir();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✓ All agent module tests passed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
