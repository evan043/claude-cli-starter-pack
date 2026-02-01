import { initOrchestratorState, loadState, addActiveAgent, updateAgentStatus, getStatus, addMessage, createCheckpoint } from '../src/agents/state-manager.js';
import { generateL2Config, detectTaskDomain } from '../src/agents/spawner.js';
import { generateL3Worker, generateL3Workers, parseL3Result } from '../src/agents/l3-generator.js';
import { ResultAggregator } from '../src/agents/result-aggregator.js';
import { getPhaseStatus, findNextPhase } from '../src/agents/phase-advancer.js';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = './tests/.e2e-simulation';

console.log('========================================');
console.log(' CCASP Agent Orchestration E2E Test');
console.log('========================================\n');

// Setup
const progressData = {
  plan_id: 'e2e-test',
  plan_name: 'E2E Test Plan',
  phases: [
    { phase_id: 'P1', name: 'Phase 1', status: 'in_progress',
      tasks: [
        { id: 'P1.1', title: 'Create React form', status: 'pending' },
        { id: 'P1.2', title: 'Add validation', status: 'pending' }
      ]
    },
    { phase_id: 'P2', name: 'Phase 2', status: 'pending', dependencies: ['P1'],
      tasks: [{ id: 'P2.1', title: 'Create API endpoint', status: 'pending' }]
    }
  ]
};

const progressDir = path.join(PROJECT_ROOT, '.claude', 'docs', 'e2e-test');
fs.mkdirSync(progressDir, { recursive: true });
fs.writeFileSync(path.join(progressDir, 'PROGRESS.json'), JSON.stringify(progressData, null, 2));

console.log('1. Created PROGRESS.json');

// Init orchestrator
await initOrchestratorState(PROJECT_ROOT, {
  planId: 'e2e-test',
  planPath: progressDir + '/PROGRESS.json',
  pendingTasks: ['P1.1', 'P1.2', 'P2.1']
});

console.log('2. Initialized orchestrator state');

// Spawn L2
const task = progressData.phases[0].tasks[0];
const l2Config = generateL2Config(task, progressData.phases[0], progressData, null);
console.log('3. Generated L2 config: ' + l2Config.agentId + ' (domain: ' + l2Config.domain + ')');

await addActiveAgent(PROJECT_ROOT, {
  agentId: l2Config.agentId, level: 'L2', domain: l2Config.domain, taskId: task.id
});
console.log('4. Registered L2 agent');

// Spawn L3 workers
const l3Workers = generateL3Workers([
  { type: 'search', query: 'Find components' },
  { type: 'analyze', target: 'src/index.ts', question: 'What exports?' }
], { correlationId: 'P1.1-subs', parentAgentId: l2Config.agentId });
console.log('5. Generated ' + l3Workers.length + ' L3 workers');

// Aggregate results
const agg = new ResultAggregator({ strategy: 'merge' });
agg.addResult(l3Workers[0].id, { status: 'completed', data: ['Button.tsx', 'Form.tsx'] });
agg.addResult(l3Workers[1].id, { status: 'completed', data: ['exports: App, utils'] });
const result = agg.aggregate();
console.log('6. Aggregated L3 results: ' + result.result.totalCount + ' items');

// Complete task
await updateAgentStatus(PROJECT_ROOT, l2Config.agentId, 'completed', {
  artifacts: ['LoginForm.tsx'], summary: 'Created form'
});
console.log('7. Completed task P1.1');

// Check status
const status = getStatus(PROJECT_ROOT);
console.log('8. Final status:');
console.log('   - Completed: ' + status.progress.completed);
console.log('   - Pending: ' + status.progress.pending);
console.log('   - L2 spawned: ' + status.metrics.l2AgentsSpawned);

// Cleanup
fs.rmSync(PROJECT_ROOT, { recursive: true, force: true });
console.log('9. Cleaned up test directory');

console.log('\n========================================');
console.log(' E2E Simulation Complete');
console.log('========================================');
