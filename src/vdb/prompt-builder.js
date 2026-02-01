/**
 * VDB Prompt Builder
 *
 * Builds execution prompts for Claude Code CLI.
 * Creates context-rich prompts that enable autonomous task completion.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export class PromptBuilder {
  constructor(config, projectRoot) {
    this.config = config;
    this.projectRoot = projectRoot;
  }

  /**
   * Build execution prompt for a task
   */
  async build(task) {
    const sections = [];

    // Header
    sections.push(this.buildHeader(task));

    // Task details
    sections.push(this.buildTaskSection(task));

    // Phase inputs
    sections.push(await this.buildInputsSection(task));

    // Expected outputs
    sections.push(this.buildOutputsSection(task));

    // Shipping criteria
    sections.push(this.buildCriteriaSection(task));

    // Codebase context
    sections.push(await this.buildCodebaseContext(task));

    // Execution instructions
    sections.push(this.buildInstructions(task));

    // Constraints
    sections.push(this.buildConstraints(task));

    // Progress signals
    sections.push(this.buildSignals(task));

    return sections.filter(Boolean).join('\n\n');
  }

  buildHeader(task) {
    return `# Vision Driver Bot - Autonomous Task Execution

You are executing a task from the project's Vision Board autonomously.
Complete the task fully without asking for user input.

---`;
  }

  buildTaskSection(task) {
    return `## Current Task

| Field | Value |
|-------|-------|
| **Epic** | ${task.epic_title || task.epic_id} |
| **Phase** | ${task.phase_title || task.phase_id} |
| **Complexity** | ${task.complexity || 'M'} |
| **Priority** | ${task.metadata?.epic_priority || 'P2'} |
| **Type** | ${task.epic_type || 'feature'} |

### Goal
${task.phase_goal || 'Complete the phase as specified.'}`;
  }

  async buildInputsSection(task) {
    const inputs = task.inputs || {};
    const sections = ['## Phase Inputs'];

    // Issues
    if (inputs.issues?.length > 0) {
      sections.push('### Related Issues');
      for (const issue of inputs.issues) {
        sections.push(`- ${issue}`);
      }
    }

    // Documentation
    if (inputs.docs?.length > 0) {
      sections.push('### Documentation References');
      for (const doc of inputs.docs) {
        const content = await this.loadDoc(doc);
        if (content) {
          sections.push(`**${doc}:**`);
          sections.push('```');
          sections.push(content.substring(0, 2000));
          if (content.length > 2000) sections.push('...(truncated)');
          sections.push('```');
        } else {
          sections.push(`- ${doc}`);
        }
      }
    }

    // Prompts/Requirements
    if (inputs.prompts?.length > 0) {
      sections.push('### Requirements');
      for (const prompt of inputs.prompts) {
        sections.push(`- ${prompt}`);
      }
    }

    return sections.length > 1 ? sections.join('\n') : null;
  }

  async loadDoc(docPath) {
    const fullPath = join(this.projectRoot, docPath);
    if (existsSync(fullPath)) {
      try {
        return readFileSync(fullPath, 'utf8');
      } catch {
        return null;
      }
    }
    return null;
  }

  buildOutputsSection(task) {
    const outputs = task.outputs || [];
    if (outputs.length === 0) return null;

    return `## Expected Outputs

${outputs.map(o => `- [ ] ${o}`).join('\n')}`;
  }

  buildCriteriaSection(task) {
    const criteria = task.shipping_criteria || [];
    if (criteria.length === 0) {
      return `## Shipping Criteria

- [ ] Code compiles without errors
- [ ] Tests pass
- [ ] No linting errors
- [ ] Changes committed with descriptive message`;
    }

    return `## Shipping Criteria

${criteria.map(c => `- [ ] ${c}`).join('\n')}`;
  }

  async buildCodebaseContext(task) {
    const sections = ['## Codebase Context'];

    // Try to load tech stack
    const techStackPath = join(this.projectRoot, '.claude/config/tech-stack.json');
    if (existsSync(techStackPath)) {
      try {
        const techStack = JSON.parse(readFileSync(techStackPath, 'utf8'));
        sections.push('### Tech Stack');
        sections.push('```json');
        sections.push(JSON.stringify({
          languages: techStack.languages,
          frameworks: techStack.frameworks,
          testing: techStack.testing,
          buildTools: techStack.buildTools
        }, null, 2));
        sections.push('```');
      } catch { /* ignore */ }
    }

    // Try to load relevant files based on phase
    const relevantPatterns = this.inferRelevantPatterns(task);
    if (relevantPatterns.length > 0) {
      sections.push('### Likely Relevant Directories');
      sections.push(relevantPatterns.map(p => `- \`${p}\``).join('\n'));
    }

    // Agent recommendations
    const agents = task.agents_assigned || [];
    if (agents.length > 0) {
      sections.push('### Recommended Agents');
      sections.push(agents.map(a => `- ${a}`).join('\n'));
    }

    return sections.length > 1 ? sections.join('\n\n') : null;
  }

  inferRelevantPatterns(task) {
    const patterns = [];
    const title = (task.phase_title || '').toLowerCase();
    const goal = (task.phase_goal || '').toLowerCase();
    const combined = `${title} ${goal}`;

    // Infer from keywords
    if (combined.includes('frontend') || combined.includes('ui') || combined.includes('component')) {
      patterns.push('src/components/', 'src/pages/', 'src/views/');
    }
    if (combined.includes('backend') || combined.includes('api') || combined.includes('endpoint')) {
      patterns.push('src/api/', 'src/routes/', 'src/controllers/');
    }
    if (combined.includes('test')) {
      patterns.push('tests/', '__tests__/', 'src/**/*.test.*');
    }
    if (combined.includes('database') || combined.includes('model') || combined.includes('schema')) {
      patterns.push('src/models/', 'src/db/', 'prisma/', 'migrations/');
    }
    if (combined.includes('auth')) {
      patterns.push('src/auth/', 'src/middleware/');
    }
    if (combined.includes('deploy') || combined.includes('ci')) {
      patterns.push('.github/workflows/', 'Dockerfile', 'docker-compose.yml');
    }

    return patterns;
  }

  buildInstructions(task) {
    const execConfig = this.config.execution || {};

    return `## Execution Instructions

1. **Research Phase**
   - Read relevant code to understand existing patterns
   - Check for related implementations to follow conventions
   - Identify files that need to be created or modified

2. **Implementation Phase**
   - Implement the required changes following existing patterns
   - Write clean, maintainable code
   - Add appropriate error handling
   - Include inline comments for complex logic only

3. **Testing Phase**
   - Write tests for new functionality
   - Run existing tests to ensure no regressions
   - Fix any failing tests before proceeding
   - Use RALPH loop if needed for test-fix cycles

4. **Documentation Phase**
   - Update relevant documentation if needed
   - Add JSDoc/docstrings for public APIs
   - Update README if adding new features

5. **Completion Phase**
   - Run linter and fix any issues
   - Commit changes with descriptive message
   ${execConfig.autoCommit ? '- Commits will be made automatically' : '- Prepare commit message for review'}
   - Update PROGRESS.json with completion signals`;
  }

  buildConstraints(task) {
    const safety = this.config.safety || {};
    const execution = this.config.execution || {};

    const constraints = [
      'Do NOT ask for user input - make reasonable decisions autonomously',
      'Do NOT modify files matching protected patterns',
      'Focus only on this phase\'s scope - don\'t refactor unrelated code',
      'If blocked by external dependency, document and skip',
      'Keep changes minimal and focused'
    ];

    if (safety.maxFilesPerTask) {
      constraints.push(`Maximum ${safety.maxFilesPerTask} files per task`);
    }

    if (execution.timeoutMinutes) {
      constraints.push(`Time limit: ${execution.timeoutMinutes} minutes`);
    }

    // Protected patterns
    if (safety.protectedPatterns?.length > 0) {
      constraints.push(`Protected patterns: ${safety.protectedPatterns.join(', ')}`);
    }

    return `## Constraints

${constraints.map(c => `- ${c}`).join('\n')}`;
  }

  buildSignals(task) {
    return `## Progress Signals

Emit these signals in your output to communicate progress:

| Signal | When to Use |
|--------|-------------|
| \`TASK_COMPLETE:<task-id>\` | After completing a subtask |
| \`TASK_BLOCKED:<task-id>:<reason>\` | When unable to proceed |
| \`PHASE_COMPLETE\` | When all phase work is done |
| \`NEEDS_REVIEW:<description>\` | When human review recommended |
| \`ERROR:<description>\` | When an error occurs |

### Task ID for this phase: \`${task.phase_id}\`

---

## Begin Execution

Start by reading the relevant code to understand the codebase context.
Then implement the required changes to complete this phase.`;
  }
}

export class Executor {
  constructor(config, projectRoot) {
    this.config = config;
    this.projectRoot = projectRoot;
    this.promptBuilder = new PromptBuilder(config, projectRoot);
  }

  /**
   * Build prompt for a task
   */
  async buildPrompt(task) {
    return await this.promptBuilder.build(task);
  }

  /**
   * Execute task via Claude Code CLI
   */
  async execute(task, prompt) {
    const { spawn } = await import('child_process');
    const execConfig = this.config.execution || {};

    return new Promise((resolve, reject) => {
      const timeout = (execConfig.claudeCode?.timeoutMinutes || 60) * 60 * 1000;
      const command = execConfig.claudeCode?.command || 'claude';
      const args = [
        ...(execConfig.claudeCode?.args || ['--print', '--dangerously-skip-permissions']),
        '-p', prompt
      ];

      const child = spawn(command, args, {
        cwd: this.projectRoot,
        env: {
          ...process.env,
          VDB_TASK_ID: task.phase_id,
          VDB_EPIC_ID: task.epic_id,
          VDB_SESSION: 'autonomous',
          VDB_MODE: 'execution'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      const signals = [];

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;

        // Parse progress signals
        const newSignals = this.parseSignals(chunk);
        signals.push(...newSignals);
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Execution timed out after ${execConfig.claudeCode?.timeoutMinutes || 60} minutes`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);

        const result = {
          success: code === 0,
          exit_code: code,
          stdout,
          stderr,
          signals,
          duration_ms: Date.now() - child.spawnargs?.startTime || 0,
          phase_complete: signals.some(s => s.type === 'PHASE_COMPLETE'),
          tasks_completed: signals.filter(s => s.type === 'TASK_COMPLETE').length,
          blocked: signals.filter(s => s.type === 'TASK_BLOCKED'),
          errors: signals.filter(s => s.type === 'ERROR')
        };

        if (code === 0) {
          resolve(result);
        } else {
          reject(new Error(`Execution failed with code ${code}: ${stderr.substring(0, 500)}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Parse progress signals from output
   */
  parseSignals(output) {
    const signals = [];

    // TASK_COMPLETE:<id>
    const taskComplete = output.matchAll(/TASK_COMPLETE:(\S+)/g);
    for (const match of taskComplete) {
      signals.push({ type: 'TASK_COMPLETE', task_id: match[1], timestamp: new Date().toISOString() });
    }

    // TASK_BLOCKED:<id>:<reason>
    const taskBlocked = output.matchAll(/TASK_BLOCKED:(\S+):(.+?)(?:\n|$)/g);
    for (const match of taskBlocked) {
      signals.push({ type: 'TASK_BLOCKED', task_id: match[1], reason: match[2], timestamp: new Date().toISOString() });
    }

    // PHASE_COMPLETE
    if (output.includes('PHASE_COMPLETE')) {
      signals.push({ type: 'PHASE_COMPLETE', timestamp: new Date().toISOString() });
    }

    // NEEDS_REVIEW:<description>
    const needsReview = output.matchAll(/NEEDS_REVIEW:(.+?)(?:\n|$)/g);
    for (const match of needsReview) {
      signals.push({ type: 'NEEDS_REVIEW', description: match[1], timestamp: new Date().toISOString() });
    }

    // ERROR:<description>
    const errors = output.matchAll(/ERROR:(.+?)(?:\n|$)/g);
    for (const match of errors) {
      signals.push({ type: 'ERROR', description: match[1], timestamp: new Date().toISOString() });
    }

    return signals;
  }

  /**
   * Execute in dry-run mode (no actual execution)
   */
  async dryRun(task) {
    const prompt = await this.buildPrompt(task);
    return {
      mode: 'dry-run',
      prompt,
      would_execute: true,
      command: this.config.execution?.claudeCode?.command || 'claude',
      args: this.config.execution?.claudeCode?.args || []
    };
  }
}

export default { PromptBuilder, Executor };
