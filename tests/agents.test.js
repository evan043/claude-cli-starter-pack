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
ok(L3_WORKER_TYPES['github-issue-sync'], 'GitHub Issue Sync worker type should exist');

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
// Test 13: GitHub Issue Sync Worker - L3 Result Format Parsing
// ============================================================

console.log('Test 13: GitHub Issue Sync Worker - L3 Result Parsing...');

// Test successful sync result
const successfulSyncOutput = `
L3_RESULT: github-sync-42
STATUS: completed
DATA:
- Issue #42 updated
- Checkboxes: 5/8 complete
- Completion: 62%
- Comments added: 1
- Issue closed: false
SYNC_COMPLETE: true
`;

const parsedSuccess = parseL3Result(successfulSyncOutput);
ok(parsedSuccess, 'Should parse successful sync result');
strictEqual(parsedSuccess.id, 'github-sync-42', 'Should extract sync worker ID');
strictEqual(parsedSuccess.status, 'completed', 'Should extract completed status');
ok(parsedSuccess.data.includes('Issue #42 updated'), 'Should include issue update in data');
ok(parsedSuccess.data.includes('Checkboxes: 5/8 complete'), 'Should include checkbox count');
ok(parsedSuccess.data.includes('Completion: 62%'), 'Should include completion percentage');
strictEqual(parsedSuccess.metrics.sync, true, 'Should extract SYNC_COMPLETE flag');

// Test failed sync result
const failedSyncOutput = `
L3_RESULT: github-sync-99
STATUS: failed
ERROR: Issue #99 not found in user/repo
SUGGESTIONS:
- Verify issue number
- Check repository access
`;

const parsedFailure = parseL3Result(failedSyncOutput);
ok(parsedFailure, 'Should parse failed sync result');
strictEqual(parsedFailure.id, 'github-sync-99', 'Should extract failed worker ID');
strictEqual(parsedFailure.status, 'failed', 'Should extract failed status');
ok(parsedFailure.error, 'Should extract error message');
ok(parsedFailure.error.includes('Issue #99 not found'), 'Should include 404 error details');

// Test partial success with warnings
const partialSuccessOutput = `
L3_RESULT: github-sync-42
STATUS: completed
DATA:
- Issue #42 updated
- Checkboxes: 3/8
- Completion: 38%
- Comments added: 0
WARNINGS:
- Could not parse metadata: using fallback
- Timestamp update skipped
SYNC_COMPLETE: true
`;

const parsedPartial = parseL3Result(partialSuccessOutput);
ok(parsedPartial, 'Should parse partial success result');
strictEqual(parsedPartial.status, 'completed', 'Should still show completed status');
ok(parsedPartial.data.length > 0, 'Should have data items even with warnings');
strictEqual(parsedPartial.metrics.sync, true, 'Should have SYNC_COMPLETE flag');

console.log('  ✓ GitHub Issue Sync Worker L3 result parsing passed\n');

// ============================================================
// Test 14: GitHub Issue Sync Worker - Configuration
// ============================================================

console.log('Test 14: GitHub Issue Sync Worker - Configuration...');

// Test worker type exists
ok(L3_WORKER_TYPES['github-issue-sync'], 'GitHub Issue Sync worker type should exist in registry');

// Test worker configuration
const syncWorkerType = L3_WORKER_TYPES['github-issue-sync'];
strictEqual(syncWorkerType.subagentType, 'Bash', 'Should use Bash agent type');
ok(syncWorkerType.tools.includes('Read'), 'Should include Read tool');
ok(syncWorkerType.tools.includes('Bash'), 'Should include Bash tool');
strictEqual(syncWorkerType.tools.length, 2, 'Should have exactly 2 tools');
strictEqual(syncWorkerType.description, 'GitHub Issue Sync Worker', 'Should have correct description');

// Test worker generation
const syncWorker = generateL3Worker('github-issue-sync', {
  issueNumber: 42,
  progressFile: '/path/to/PROGRESS.json',
  changesSummary: 'Completed task T1',
  repo: 'user/my-project',
});

ok(syncWorker, 'Should generate sync worker');
strictEqual(syncWorker.type, 'github-issue-sync', 'Should have correct type');
strictEqual(syncWorker.level, 'L3', 'Should be L3 level');
strictEqual(syncWorker.subagentType, 'Bash', 'Should use Bash agent');
strictEqual(syncWorker.maxDuration, 30000, 'Should have 30 second timeout');
ok(syncWorker.prompt.includes('ISSUE_NUMBER: 42'), 'Prompt should include issue number');
ok(syncWorker.prompt.includes('PROGRESS_FILE: /path/to/PROGRESS.json'), 'Prompt should include progress file path');
ok(syncWorker.prompt.includes('gh issue view'), 'Prompt should include gh CLI commands');

console.log('  ✓ GitHub Issue Sync Worker configuration passed\n');

// ============================================================
// Test 15: GitHub Issue Sync Worker - GitHub CLI Commands
// ============================================================

console.log('Test 15: GitHub Issue Sync Worker - GitHub CLI Commands...');

const testWorker = generateL3Worker('github-issue-sync', {
  issueNumber: 123,
  progressFile: '/workspace/PROGRESS.json',
  changesSummary: 'Test update',
  repo: 'owner/repository',
});

// Test that prompt includes proper gh commands
ok(testWorker.prompt.includes('gh issue view 123'), 'Should include gh issue view command');
ok(testWorker.prompt.includes('--repo owner/repository'), 'Should include repository flag');
ok(testWorker.prompt.includes('gh issue edit 123'), 'Should include gh issue edit command');
ok(testWorker.prompt.includes('gh issue comment 123'), 'Should include gh issue comment command');
ok(testWorker.prompt.includes('--json body'), 'Should request JSON output format');

// Test format includes HEREDOC for special character handling
ok(testWorker.prompt.includes('$(cat <<\'EOF\''), 'Should use HEREDOC for body content');
ok(testWorker.prompt.includes('EOF'), 'Should close HEREDOC properly');

console.log('  ✓ GitHub Issue Sync Worker GitHub CLI commands passed\n');

// ============================================================
// Test 16: GitHub Issue Sync Worker - Error Handling
// ============================================================

console.log('Test 16: GitHub Issue Sync Worker - Error Handling...');

// Test 404 error parsing
const error404Output = `
L3_RESULT: github-sync-404
STATUS: failed
ERROR: Issue #404 not found in user/repo
SUGGESTIONS:
- Verify issue number
- Check repository access
`;

const parsed404 = parseL3Result(error404Output);
ok(parsed404, 'Should parse 404 error');
strictEqual(parsed404.status, 'failed', 'Should have failed status');
ok(parsed404.error.includes('not found'), 'Should indicate issue not found');

// Test rate limit error parsing
const rateLimitOutput = `
L3_RESULT: github-sync-42
STATUS: failed
ERROR: GitHub API rate limit exceeded
SUGGESTIONS:
- Wait 3600 seconds
- Check rate limit: gh api rate_limit
- Consider using GitHub App token for higher limits
`;

const parsedRateLimit = parseL3Result(rateLimitOutput);
ok(parsedRateLimit, 'Should parse rate limit error');
strictEqual(parsedRateLimit.status, 'failed', 'Should have failed status');
ok(parsedRateLimit.error.includes('rate limit'), 'Should indicate rate limit issue');

// Test parse error (warning, not failure)
const parseErrorOutput = `
L3_RESULT: github-sync-42
STATUS: completed
DATA:
- Issue #42 updated
- Checkboxes: 2/5
- Completion: 40%
WARNINGS:
- Could not parse CCASP-META section
- Updating checkboxes only
SYNC_COMPLETE: true
`;

const parsedWithWarning = parseL3Result(parseErrorOutput);
ok(parsedWithWarning, 'Should parse result with warnings');
strictEqual(parsedWithWarning.status, 'completed', 'Should still be completed despite warnings');
strictEqual(parsedWithWarning.metrics.sync, true, 'Should have sync complete flag');

// Test auth error parsing
const authErrorOutput = `
L3_RESULT: github-sync-42
STATUS: failed
ERROR: GitHub CLI not authenticated
SUGGESTIONS:
- Run: gh auth login
- Verify token has repo scope
`;

const parsedAuthError = parseL3Result(authErrorOutput);
ok(parsedAuthError, 'Should parse auth error');
strictEqual(parsedAuthError.status, 'failed', 'Should have failed status');
ok(parsedAuthError.error.includes('not authenticated'), 'Should indicate auth issue');

console.log('  ✓ GitHub Issue Sync Worker error handling passed\n');

// ============================================================
// Test 17: GitHub Issue Sync Worker - Data Extraction
// ============================================================

console.log('Test 17: GitHub Issue Sync Worker - Data Extraction...');

const detailedSyncOutput = `
L3_RESULT: github-sync-42
STATUS: completed
DATA:
- Issue #42 updated
- Checkboxes: 8/10 complete
- Completion: 80%
- Comments added: 2
- Issue closed: false
- Metadata updated: true
- Timestamp: 2024-01-15T10:30:00Z
SYNC_COMPLETE: true
`;

const parsedDetailed = parseL3Result(detailedSyncOutput);
ok(parsedDetailed, 'Should parse detailed sync output');
strictEqual(parsedDetailed.data.length, 7, 'Should extract all 7 data items');
ok(parsedDetailed.data.some(d => d.includes('Checkboxes: 8/10')), 'Should extract checkbox counts');
ok(parsedDetailed.data.some(d => d.includes('Completion: 80%')), 'Should extract completion percentage');
ok(parsedDetailed.data.some(d => d.includes('Comments added: 2')), 'Should extract comment count');
ok(parsedDetailed.data.some(d => d.includes('Issue closed: false')), 'Should extract closed status');
strictEqual(parsedDetailed.metrics.sync, true, 'Should extract SYNC_COMPLETE flag');

// Test minimal output
const minimalSyncOutput = `
L3_RESULT: github-sync-1
STATUS: completed
DATA:
- Issue #1 updated
- Checkboxes: 1/1
- Completion: 100%
SYNC_COMPLETE: true
`;

const parsedMinimal = parseL3Result(minimalSyncOutput);
ok(parsedMinimal, 'Should parse minimal sync output');
strictEqual(parsedMinimal.data.length, 3, 'Should extract 3 data items');
strictEqual(parsedMinimal.metrics.sync, true, 'Should have sync complete flag');

console.log('  ✓ GitHub Issue Sync Worker data extraction passed\n');

// ============================================================
// Test 18: GitHub Issue Sync Worker - Background Execution
// ============================================================

console.log('Test 18: GitHub Issue Sync Worker - Background Execution...');

// Test that generated worker has appropriate settings for background execution
const backgroundWorker = generateL3Worker('github-issue-sync', {
  issueNumber: 99,
  progressFile: '/path/to/progress.json',
  changesSummary: 'Background test',
}, {
  maxDuration: 30000, // 30 seconds
});

ok(backgroundWorker, 'Should generate worker for background execution');
strictEqual(backgroundWorker.maxDuration, 30000, 'Should have 30 second max duration');
strictEqual(backgroundWorker.level, 'L3', 'Should be L3 level for quick execution');
ok(backgroundWorker.tools.includes('Bash'), 'Should have Bash tool for gh CLI commands');

// Verify prompt includes non-interactive instructions
ok(backgroundWorker.prompt.includes('Return immediately'), 'Should instruct to return immediately');
ok(backgroundWorker.prompt.includes('Don\'t wait'), 'Should instruct not to wait');
ok(backgroundWorker.prompt.includes('Fast execution'), 'Should emphasize fast execution');

console.log('  ✓ GitHub Issue Sync Worker background execution passed\n');

// ============================================================
// Cleanup
// ============================================================

cleanupTestDir();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✓ All agent module tests passed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
