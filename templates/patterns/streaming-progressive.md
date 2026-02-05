# Streaming/Progressive Output Pattern

Progressive output via file-based checkpoints for long-running tasks.

## Overview

The Streaming/Progressive Output pattern provides real-time feedback during long-running operations by writing incremental progress to files, enabling users to monitor execution without blocking on completion.

## The Problem

Without progressive output:
- Long-running tasks appear frozen (no feedback)
- Users can't tell if operation is still working or stuck
- No visibility into intermediate results
- Difficult to resume after interruption
- Hard to debug stalled operations

## Solution Approach

Instead of waiting for final completion, write progress incrementally:

```
Traditional (Blocking):
┌─────────────────────────────────────────────────┐
│ Operation starts...                             │
│ [30 seconds of silence]                         │
│ Operation complete!                             │
└─────────────────────────────────────────────────┘

Progressive (Streaming):
┌─────────────────────────────────────────────────┐
│ Operation starts...                             │
│ ✓ Phase 1 complete (5s)                         │
│ ✓ Phase 2 complete (12s)                        │
│ ⚠️ Phase 3 blocked (waiting for API)            │
│ ✓ Phase 3 complete (25s)                        │
│ ✓ Operation complete! (30s total)               │
└─────────────────────────────────────────────────┘
```

## Claude Code Context

### Use Case 1: Multi-Phase Execution

```typescript
// Phase-dev-plan with progressive updates
async function executePhaseWithProgress(phaseId: number, progressPath: string) {
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  const phase = progress.phases.find(p => p.id === phaseId);

  console.log(`▶ Starting Phase ${phaseId}: ${phase.name}`);

  for (const task of phase.tasks) {
    if (task.completed) {
      console.log(`  ✓ Task ${task.id}: Already complete`);
      continue;
    }

    // Update: Task started
    task.status = 'in_progress';
    task.startedAt = new Date().toISOString();
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    console.log(`  ▶ Task ${task.id}: ${task.description}`);

    try {
      // Execute task
      const result = await executeTask(task);

      // Update: Task completed
      task.completed = true;
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = result.summary;
      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
      console.log(`  ✓ Task ${task.id}: Complete`);
    } catch (error) {
      // Update: Task failed
      task.status = 'failed';
      task.error = error.message;
      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
      console.log(`  ✗ Task ${task.id}: Failed - ${error.message}`);
      throw error;
    }
  }

  // Update: Phase complete
  phase.status = 'completed';
  phase.completedAt = new Date().toISOString();
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
  console.log(`✓ Phase ${phaseId} complete!`);
}
```

### Use Case 2: Parallel Agent Progress

```typescript
// Track multiple L3 workers with progressive updates
async function monitorParallelAgents(agentHandles: any[]) {
  const statusFile = '.claude/cache/agent-status.json';
  const status = agentHandles.map(h => ({
    taskId: h.task_id,
    description: h.description,
    status: 'pending',
    startTime: Date.now()
  }));

  // Write initial status
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));

  // Poll for updates
  const checkInterval = setInterval(async () => {
    let allComplete = true;

    for (let i = 0; i < agentHandles.length; i++) {
      if (status[i].status === 'complete') continue;

      // Non-blocking check
      const output = await TaskOutput({
        task_id: agentHandles[i].task_id,
        block: false,
        timeout: 1000
      });

      if (output.complete) {
        status[i].status = 'complete';
        status[i].endTime = Date.now();
        status[i].duration = status[i].endTime - status[i].startTime;
        console.log(`✓ Agent ${i + 1}: Complete (${status[i].duration}ms)`);
      } else {
        status[i].status = 'running';
        allComplete = false;
      }

      // Update status file
      fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    }

    if (allComplete) {
      clearInterval(checkInterval);
      console.log('✓ All agents complete!');
    }
  }, 2000);  // Check every 2 seconds
}
```

### Use Case 3: Build/Deployment Progress

```typescript
// Stream build output with progressive status
async function buildWithProgress(config: BuildConfig) {
  const statusFile = '.claude/cache/build-status.json';
  const steps = ['lint', 'type-check', 'build', 'test'];

  const status = {
    startTime: Date.now(),
    currentStep: null,
    steps: steps.map(s => ({ name: s, status: 'pending' }))
  };

  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  console.log('🚀 Build started...');

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Update: Step started
    status.currentStep = step;
    status.steps[i].status = 'running';
    status.steps[i].startTime = Date.now();
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    console.log(`  ▶ ${step}...`);

    try {
      // Execute step
      await executeStep(step, config);

      // Update: Step complete
      status.steps[i].status = 'success';
      status.steps[i].endTime = Date.now();
      status.steps[i].duration = status.steps[i].endTime - status.steps[i].startTime;
      fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
      console.log(`  ✓ ${step} complete (${status.steps[i].duration}ms)`);
    } catch (error) {
      // Update: Step failed
      status.steps[i].status = 'failed';
      status.steps[i].error = error.message;
      fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
      console.log(`  ✗ ${step} failed: ${error.message}`);
      throw error;
    }
  }

  status.endTime = Date.now();
  status.totalDuration = status.endTime - status.startTime;
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  console.log(`✓ Build complete! (${status.totalDuration}ms)`);
}
```

### Use Case 4: Roadmap Execution with Checkpoints

```typescript
// Execute roadmap with phase-by-phase progress
async function executeRoadmapProgressive(roadmapSlug: string) {
  const roadmapPath = `.claude/roadmaps/${roadmapSlug}/ROADMAP.json`;
  const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

  console.log(`📋 Roadmap: ${roadmap.title}`);
  console.log(`Phases: ${roadmap.phases.length}`);

  for (const phase of roadmap.phases) {
    if (phase.status === 'completed') {
      console.log(`✓ Phase ${phase.id}: ${phase.name} (already complete)`);
      continue;
    }

    // Update: Phase started
    phase.status = 'in_progress';
    phase.startedAt = new Date().toISOString();
    roadmap.metadata.current_phase = phase.id;
    fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2));
    console.log(`\n▶ Phase ${phase.id}: ${phase.name}`);

    // Execute phase
    try {
      await executePhase(phase);

      // Update: Phase complete
      phase.status = 'completed';
      phase.completedAt = new Date().toISOString();
      roadmap.metadata.completed_phases++;
      roadmap.metadata.overall_completion_percentage =
        (roadmap.metadata.completed_phases / roadmap.phases.length) * 100;
      fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2));

      console.log(`✓ Phase ${phase.id} complete!`);
      console.log(
        `  Progress: ${roadmap.metadata.overall_completion_percentage}%`
      );
    } catch (error) {
      // Update: Phase failed
      phase.status = 'failed';
      phase.error = error.message;
      fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2));
      console.log(`✗ Phase ${phase.id} failed: ${error.message}`);

      // Offer to resume
      console.log('\n⚠️ Roadmap paused. Run /roadmap-track resume to continue.');
      throw error;
    }
  }

  roadmap.status = 'completed';
  roadmap.metadata.completedAt = new Date().toISOString();
  fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2));
  console.log('\n✓ Roadmap complete!');
}
```

## Implementation

```typescript
interface ProgressConfig {
  statusFile: string;           // Where to write progress
  updateInterval?: number;      // ms between updates (default: 1000)
  displayInConsole?: boolean;   // Show progress in console (default: true)
  persistentHistory?: boolean;  // Keep history of updates (default: false)
}

class ProgressiveOperation {
  private status: any;
  private config: ProgressConfig;
  private updateInterval: NodeJS.Timer | null = null;

  constructor(config: ProgressConfig) {
    this.config = {
      updateInterval: 1000,
      displayInConsole: true,
      persistentHistory: false,
      ...config
    };

    this.status = {
      startTime: Date.now(),
      status: 'initializing',
      steps: [],
      history: []
    };

    this.writeStatus();
  }

  startStep(name: string, metadata: any = {}): void {
    const step = {
      name,
      status: 'running',
      startTime: Date.now(),
      ...metadata
    };

    this.status.steps.push(step);
    this.status.currentStep = name;
    this.status.status = 'running';

    this.writeStatus();

    if (this.config.displayInConsole) {
      console.log(`▶ ${name}...`);
    }
  }

  completeStep(name: string, result: any = {}): void {
    const step = this.status.steps.find(s => s.name === name);
    if (!step) return;

    step.status = 'complete';
    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.result = result;

    this.writeStatus();

    if (this.config.displayInConsole) {
      console.log(`✓ ${name} complete (${step.duration}ms)`);
    }
  }

  failStep(name: string, error: Error): void {
    const step = this.status.steps.find(s => s.name === name);
    if (!step) return;

    step.status = 'failed';
    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.error = error.message;

    this.status.status = 'failed';
    this.writeStatus();

    if (this.config.displayInConsole) {
      console.log(`✗ ${name} failed: ${error.message}`);
    }
  }

  updateProgress(percentage: number, message?: string): void {
    this.status.progress = percentage;
    if (message) {
      this.status.message = message;
    }

    this.writeStatus();

    if (this.config.displayInConsole) {
      console.log(`  Progress: ${percentage}% ${message || ''}`);
    }
  }

  complete(result: any = {}): void {
    this.status.status = 'complete';
    this.status.endTime = Date.now();
    this.status.totalDuration = this.status.endTime - this.status.startTime;
    this.status.result = result;

    this.writeStatus();

    if (this.config.displayInConsole) {
      console.log(`✓ Complete! (${this.status.totalDuration}ms)`);
    }

    this.stopPolling();
  }

  fail(error: Error): void {
    this.status.status = 'failed';
    this.status.endTime = Date.now();
    this.status.totalDuration = this.status.endTime - this.status.startTime;
    this.status.error = error.message;

    this.writeStatus();

    if (this.config.displayInConsole) {
      console.log(`✗ Failed: ${error.message}`);
    }

    this.stopPolling();
  }

  private writeStatus(): void {
    // Add to history if enabled
    if (this.config.persistentHistory) {
      this.status.history.push({
        timestamp: Date.now(),
        status: JSON.parse(JSON.stringify(this.status))
      });
    }

    // Write to file
    fs.writeFileSync(
      this.config.statusFile,
      JSON.stringify(this.status, null, 2)
    );
  }

  startPolling(pollFn: () => Promise<any>): void {
    this.updateInterval = setInterval(async () => {
      try {
        await pollFn();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, this.config.updateInterval);
  }

  stopPolling(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  getStatus(): any {
    return JSON.parse(JSON.stringify(this.status));
  }
}

// Helper function
export async function executeWithProgress<T>(
  config: ProgressConfig,
  operation: (progress: ProgressiveOperation) => Promise<T>
): Promise<T> {
  const progress = new ProgressiveOperation(config);

  try {
    const result = await operation(progress);
    progress.complete(result);
    return result;
  } catch (error) {
    progress.fail(error);
    throw error;
  }
}
```

## Usage Examples

### Example 1: Basic Progress Tracking

```typescript
import { executeWithProgress } from './streaming-progressive';

await executeWithProgress(
  {
    statusFile: '.claude/cache/operation-status.json',
    displayInConsole: true
  },
  async (progress) => {
    progress.startStep('Initializing');
    await initialize();
    progress.completeStep('Initializing');

    progress.startStep('Processing');
    await process();
    progress.completeStep('Processing');

    progress.startStep('Finalizing');
    await finalize();
    progress.completeStep('Finalizing');

    return { success: true };
  }
);
```

### Example 2: Progress Bar with Percentage

```typescript
async function processLargeDataset(items: any[]) {
  return executeWithProgress(
    {
      statusFile: '.claude/cache/processing-status.json'
    },
    async (progress) => {
      progress.startStep('Processing items');

      for (let i = 0; i < items.length; i++) {
        await processItem(items[i]);

        // Update progress every 10 items
        if (i % 10 === 0) {
          const percentage = Math.round((i / items.length) * 100);
          progress.updateProgress(
            percentage,
            `Processed ${i}/${items.length} items`
          );
        }
      }

      progress.completeStep('Processing items', {
        totalProcessed: items.length
      });

      return { processedCount: items.length };
    }
  );
}
```

### Example 3: Background Task Monitoring

```typescript
// Start background task with progress monitoring
const progress = new ProgressiveOperation({
  statusFile: '.claude/cache/background-task.json',
  updateInterval: 2000,  // Update every 2 seconds
  persistentHistory: true
});

// Start polling for agent status
const agentHandle = await Task({
  description: 'Long-running analysis',
  prompt: '...',
  run_in_background: true
});

progress.startStep('Analysis running');

progress.startPolling(async () => {
  const output = await TaskOutput({
    task_id: agentHandle.task_id,
    block: false
  });

  if (output.complete) {
    progress.completeStep('Analysis running', output.output);
    progress.complete();
  } else {
    progress.updateProgress(50, 'Still running...');
  }
});
```

## User Feedback Strategies

### 1. Console Output (Real-time)
```typescript
// Immediate feedback in console
console.log('▶ Task started...');
console.log('  ⏳ Step 1 running...');
console.log('  ✓ Step 1 complete');
console.log('✓ Task complete!');
```

### 2. File-Based (Queryable)
```typescript
// Write to file, user can check anytime
fs.writeFileSync('status.json', JSON.stringify({
  status: 'running',
  progress: 45,
  currentStep: 'Processing data'
}));

// User runs: cat .claude/cache/status.json
```

### 3. Progress Bar (Visual)
```typescript
// ASCII progress bar
function renderProgressBar(percent: number): string {
  const width = 40;
  const filled = Math.round((percent / 100) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}] ${percent}%`;
}

console.log(renderProgressBar(45));
// → [██████████████████░░░░░░░░░░░░░░░░░░░░] 45%
```

### 4. Notifications (Milestones)
```typescript
// Notify on key milestones
async function notifyOnMilestone(progress: number) {
  if (progress === 25) {
    console.log('🎉 25% complete!');
  } else if (progress === 50) {
    console.log('🎉 Halfway there!');
  } else if (progress === 75) {
    console.log('🎉 75% complete!');
  } else if (progress === 100) {
    console.log('🎉 All done!');
  }
}
```

## Resume After Interruption

```typescript
// Check for existing progress file
async function resumeOrStart(statusFile: string) {
  if (fs.existsSync(statusFile)) {
    const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));

    if (status.status === 'running' || status.status === 'failed') {
      console.log('⚠️ Previous operation interrupted. Resume? (y/n)');
      // Resume from last completed step
      return status;
    }
  }

  // Start fresh
  return null;
}
```

## Anti-Patterns

### 1. Too Frequent Updates
```typescript
// BAD: Update every iteration (spam)
for (let i = 0; i < 10000; i++) {
  progress.updateProgress((i / 10000) * 100);  // 10,000 writes!
}

// GOOD: Update at intervals
for (let i = 0; i < 10000; i++) {
  if (i % 100 === 0) {  // Every 100 iterations
    progress.updateProgress((i / 10000) * 100);
  }
}
```

### 2. Blocking on Status Write
```typescript
// BAD: Synchronous write blocks operation
fs.writeFileSync(statusFile, JSON.stringify(status));

// GOOD: Async write doesn't block (if not critical)
setImmediate(() => {
  fs.writeFile(statusFile, JSON.stringify(status), () => {});
});
```

### 3. No Error States
```typescript
// BAD: No indication of failure
status.complete = true;  // Even on error!

// GOOD: Explicit failure state
status.status = 'failed';
status.error = error.message;
```

## When to Use

Use progressive output when:

- Operations take longer than 5 seconds
- User needs feedback that operation is progressing
- Operation has distinct phases/steps
- Need to resume after interruption
- Debugging long-running processes

## When NOT to Use

Don't use progressive output for:

- Fast operations (< 2 seconds)
- Operations with no distinct steps
- High-frequency loops (update overhead)
- Critical performance paths

## Related Patterns

- **Context-Safe Orchestration**: Uses PROGRESS.json for state
- **Multi-Phase Orchestration**: Writes phase status progressively
- **Fan-Out/Fan-In**: Track parallel worker progress

---

*Streaming/Progressive Output Pattern - CCASP v2.3.0*
*Real-time feedback for long-running operations*
