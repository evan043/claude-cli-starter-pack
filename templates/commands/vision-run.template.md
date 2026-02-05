---
description: Start or resume autonomous execution of a Vision
options:
  - label: "Run"
    description: "Start autonomous execution"
  - label: "Resume"
    description: "Resume paused Vision"
  - label: "Manual"
    description: "Step-by-step guided execution"
---

# Vision Run - Autonomous Execution

Start or resume autonomous execution of a Vision. The orchestrator manages the execution loop, self-healing, and completion verification.

**Execution Flow:**
```
EXECUTE → TEST → HEAL (if needed) → VERIFY → COMPLETE
    ↑                                   |
    └───────────────────────────────────┘
         (until 100% or intervention needed)
```

---

## Execution Protocol

### Step 1: Load Vision

```javascript
import { createOrchestrator, loadVision } from '${CWD}/node_modules/claude-cli-advanced-starter-pack/src/vision/index.js';

// Get vision slug from arguments
const visionSlug = args[0];

if (!visionSlug) {
  // List available visions
  const { listVisions } = await import('${CWD}/node_modules/claude-cli-advanced-starter-pack/src/vision/index.js');
  const visions = listVisions(projectRoot);

  console.log('Available Visions:');
  for (const v of visions) {
    console.log(`  - ${v.slug}: ${v.title}`);
  }

  // Ask user to select
  // Use AskUserQuestion...
  return;
}

// Load vision
const vision = await loadVision(projectRoot, visionSlug);

if (!vision) {
  console.error(`Vision not found: ${visionSlug}`);
  return;
}
```

### Step 2: Create Orchestrator and Resume

```javascript
const orchestrator = createOrchestrator(projectRoot, {
  autonomous: {
    enabled: true,
    maxIterations: 100,
    selfHealingEnabled: true,
    escalationThreshold: 3
  },
  observer: {
    enabled: true,
    autoAdjust: true
  }
});

// Resume from saved state
const resumeResult = await orchestrator.resume(visionSlug);

if (!resumeResult.success) {
  console.error(`Failed to resume: ${resumeResult.error}`);
  return;
}

console.log(`Resuming Vision: ${resumeResult.vision.title}`);
console.log(`Current stage: ${resumeResult.stage}`);
console.log(`Status: ${resumeResult.vision.status}`);
```

### Step 3: Display Pre-Execution Status

```
╔════════════════════════════════════════════════════════════════════════════╗
║                        VISION EXECUTION                                     ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Vision: {{title}}                                                          ║
║  Slug: {{slug}}                                                             ║
║  Current Status: {{status}}                                                 ║
║                                                                             ║
║  Progress: [{{progressBar}}] {{completion}}%                                ║
║  Alignment: [{{alignmentBar}}] {{alignment}}%                               ║
║                                                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Roadmaps                                                                   ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
{{#each roadmaps}}
║  {{order}}. {{title}}                                                       ║
║     Status: {{statusBadge}} | Progress: {{completion}}%                     ║
║                                                                             ║
{{/each}}
╠════════════════════════════════════════════════════════════════════════════╣
║  Configuration                                                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Autonomous Mode: {{autonomous ? 'ENABLED' : 'DISABLED'}}                   ║
║  Self-Healing: {{selfHealing ? 'ENABLED' : 'DISABLED'}}                     ║
║  Max Iterations: {{maxIterations}}                                          ║
║  Security Scan: {{securityEnabled ? 'ENABLED' : 'DISABLED'}}                ║
║                                                                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Start execution? (yes/no)
```

### Step 4: Execute

```javascript
console.log('Starting autonomous execution...\n');

const execResult = await orchestrator.execute();

if (execResult.success) {
  console.log('\n✓ Execution completed');
  console.log(`  Iterations: ${execResult.result.iterations}`);
  console.log(`  Reason: ${execResult.result.reason}`);
} else {
  console.log(`\n⚠️ Execution stopped: ${execResult.result?.reason || execResult.error}`);

  if (execResult.result?.reason === 'escalation_required') {
    console.log('\nManual intervention required.');
    console.log('Review failures and use /vision-adjust to fix issues.');
  }

  if (execResult.result?.reason === 'max_iterations_reached') {
    console.log('\nMax iterations reached. Vision may need restructuring.');
    console.log('Use /vision-adjust to review and modify the plan.');
  }
}
```

### Step 5: Run Validation

```javascript
if (execResult.success || execResult.result?.reason === 'max_iterations_reached') {
  console.log('\nRunning validation...');

  const validateResult = await orchestrator.validate();

  if (validateResult.success) {
    console.log(`\nValidation Results:`);
    console.log(`  Tests Passed: ${validateResult.result.tests.passed ? 'YES' : 'NO'}`);
    console.log(`  MVP Complete: ${validateResult.result.mvp.complete ? 'YES' : 'NO'}`);
    console.log(`  Completion: ${validateResult.result.completion_percentage}%`);

    if (!validateResult.result.mvp.complete && validateResult.result.mvp.missing?.length > 0) {
      console.log('\nMissing Items:');
      for (const item of validateResult.result.mvp.missing) {
        console.log(`  - ${item}`);
      }
    }
  }
}
```

### Step 6: Complete or Report Status

```javascript
if (validateResult?.success && validateResult.result.mvp.complete) {
  console.log('\nCompleting vision...');

  const completeResult = await orchestrator.complete();

  if (completeResult.success) {
    // Display completion summary
  }
} else {
  // Display current status
  const status = orchestrator.getStatus();
  // Display what's left to do
}
```

### Step 7: Display Completion Summary

```
╔════════════════════════════════════════════════════════════════════════════╗
║                   VISION COMPLETED SUCCESSFULLY! 🎉                         ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Vision: {{title}}                                                          ║
║  Slug: {{slug}}                                                             ║
║  Final Status: COMPLETED                                                    ║
║                                                                             ║
║  Progress: [████████████████████] 100%                                      ║
║                                                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Execution Summary                                                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Total Iterations: {{iterations}}                                           ║
║  Roadmaps Completed: {{roadmaps_completed}}                                 ║
║  Tests Passed: {{tests_passed}}                                             ║
║  Self-Heals Applied: {{self_heals}}                                         ║
║  Drift Events: {{drift_events}}                                             ║
║                                                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Final Metrics                                                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Alignment: {{final_alignment}}%                                            ║
║  Security: {{security_status}}                                              ║
║  Duration: {{duration}}                                                     ║
║                                                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Files Created                                                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Vision: .claude/visions/{{slug}}/VISION.json                               ║
║  Checkpoint: .claude/visions/{{slug}}/checkpoints/completed/                ║
║                                                                             ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Step 8: Handle Paused/Failed State

If execution was paused or failed:

```
╔════════════════════════════════════════════════════════════════════════════╗
║                        EXECUTION PAUSED                                     ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Vision: {{title}}                                                          ║
║  Status: {{status}}                                                         ║
║  Reason: {{pause_reason}}                                                   ║
║                                                                             ║
║  Progress: [{{progressBar}}] {{completion}}%                                ║
║                                                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Current State                                                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Roadmaps Completed: {{completed}} / {{total}}                              ║
║  Current Roadmap: {{current_roadmap}}                                       ║
║  Iterations Used: {{iterations}} / {{max_iterations}}                       ║
║                                                                             ║
{{#if failures}}
╠════════════════════════════════════════════════════════════════════════════╣
║  Failures Detected                                                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
{{#each failures}}
║  • {{type}}: {{message}}                                                    ║
{{/each}}
║                                                                             ║
{{/if}}
╠════════════════════════════════════════════════════════════════════════════╣
║  Next Steps                                                                 ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  1. Review failures and fix manually                                        ║
║                                                                             ║
║  2. Adjust vision if needed:                                                ║
║     /vision-adjust {{slug}}                                                 ║
║                                                                             ║
║  3. Resume execution:                                                       ║
║     /vision-run {{slug}}                                                    ║
║                                                                             ║
║  4. View detailed status:                                                   ║
║     /vision-status {{slug}}                                                 ║
║                                                                             ║
╚════════════════════════════════════════════════════════════════════════════╝
```

## Manual Execution Mode

For step-by-step guided execution:

```javascript
const orchestrator = createOrchestrator(projectRoot, {
  autonomous: {
    enabled: false  // Disable autonomous loop
  }
});

await orchestrator.resume(visionSlug);

// Execute single step
const stepResult = await orchestrator.executeNextTasks();

// Check progress
const progress = orchestrator.getStatus();

// User reviews and approves next step...
```

## CLI Alternative

```bash
# Run vision
ccasp vision run <slug>

# Run with max iterations
ccasp vision run <slug> --max-iterations 50

# Run in manual mode
ccasp vision run <slug> --manual

# Resume paused vision
ccasp vision resume <slug>
```

## Argument Handling

- `/vision-run` - List visions and select
- `/vision-run {slug}` - Run specific vision
- `/vision-run {slug} --manual` - Step-by-step mode
- `/vision-run {slug} --max-iterations {n}` - Limit iterations

## Observer Integration

During execution, the observer monitors for drift:

```javascript
// Observer is automatically integrated in orchestrator
// Drift is detected after each task batch

// Manual observation (if needed):
const observation = orchestrator.observe(updateEvent);

if (observation.observation?.requires_replan) {
  console.log('⚠️ Replan recommended');
  // Use /vision-adjust
}
```

## Error Recovery

If execution fails:

1. **Test Failures**: Self-healer attempts to generate fixes
2. **Self-Heal Failures**: After 3 retries, escalates to manual
3. **Drift Detection**: Observer recommends adjustments
4. **Max Iterations**: Pauses for manual review

**Recovery Options:**
- `/vision-adjust {slug}` - Modify plan
- `/vision-run {slug}` - Retry execution
- `/vision-status {slug}` - View detailed status

## Related Commands

- `/vision-init` - Initialize new Vision
- `/vision-status` - View status
- `/vision-adjust` - Adjust plan
- `/roadmap-track` - Track specific roadmap

---

*Vision Run - Part of CCASP Vision Mode Autonomous Development Framework (Phase 7)*
