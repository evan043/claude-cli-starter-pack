/**
 * Vision Driver Bot (VDB) - Main Entry Point
 *
 * Autonomous development system that monitors Vision/Epic boards
 * and drives development forward without human intervention.
 *
 * Components:
 * - Watcher: Monitors boards for actionable items
 * - Queue: Prioritizes and manages task queue
 * - BoardSync: Bidirectional sync with GitHub Projects
 * - DecisionEngine: AI-powered strategic decisions
 * - Executor: Runs Claude Code sessions autonomously
 * - Reporter: Reports progress back to boards
 */

export { VDBConfig, loadConfig, saveConfig, createDefaultConfig } from './config.js';
export { Watcher } from './watcher.js';
export { TaskQueue } from './queue.js';
export { BoardSync, GitHubProjectAdapter } from './board-sync.js';
export { DecisionEngine } from './decision-engine.js';
export { PromptBuilder } from './prompt-builder.js';
export { Executor } from './executor.js';
export { Reporter } from './reporter.js';

/**
 * VDB Main Controller
 * Coordinates all components for autonomous execution
 */
export class VisionDriverBot {
  constructor(config = {}) {
    this.config = config;
    this.watcher = null;
    this.queue = null;
    this.boardSync = null;
    this.decisionEngine = null;
    this.executor = null;
    this.reporter = null;
    this.running = false;
  }

  async initialize(projectRoot) {
    const { loadConfig } = await import('./config.js');
    const { Watcher } = await import('./watcher.js');
    const { TaskQueue } = await import('./queue.js');
    const { BoardSync } = await import('./board-sync.js');
    const { DecisionEngine } = await import('./decision-engine.js');
    const { Executor } = await import('./executor.js');
    const { Reporter } = await import('./reporter.js');

    this.config = await loadConfig(projectRoot);
    this.projectRoot = projectRoot;

    this.watcher = new Watcher(this.config, projectRoot);
    this.queue = new TaskQueue(this.config, projectRoot);
    this.boardSync = new BoardSync(this.config, projectRoot);
    this.decisionEngine = new DecisionEngine(this.config, projectRoot);
    this.executor = new Executor(this.config, projectRoot);
    this.reporter = new Reporter(this.config, projectRoot);

    return this;
  }

  /**
   * Scan board and queue actionable items
   * Used by GitHub Actions workflow
   */
  async scan() {
    const boardState = await this.boardSync.fetchState();
    const actionable = await this.watcher.findActionableItems(boardState);

    for (const item of actionable) {
      await this.queue.enqueue(item);
    }

    return {
      boardState,
      actionable,
      queueStatus: await this.queue.getStatus()
    };
  }

  /**
   * Execute next task from queue
   * Used by GitHub Actions workflow
   */
  async executeNext() {
    const task = await this.queue.dequeue();
    if (!task) {
      return { executed: false, reason: 'queue_empty' };
    }

    try {
      // Build execution prompt
      const prompt = await this.executor.buildPrompt(task);

      // Execute via Claude Code CLI
      const result = await this.executor.execute(task, prompt);

      // Report results
      await this.reporter.reportCompletion(task, result);

      // Update board
      await this.boardSync.updateStatus(task, 'completed', result);

      // Decision engine evaluation
      const decision = await this.decisionEngine.evaluate({
        type: 'task_complete',
        task,
        result
      });

      return {
        executed: true,
        task,
        result,
        decision
      };
    } catch (error) {
      await this.handleError(task, error);
      return {
        executed: false,
        task,
        error: error.message
      };
    }
  }

  async handleError(task, error) {
    const retries = task.attempts || 0;

    if (retries < this.config.maxRetries) {
      await this.queue.requeue(task, {
        attempts: retries + 1,
        lastError: error.message,
        priority: task.priority - 10
      });
    } else {
      await this.reporter.reportFailure(task, error);
      await this.boardSync.updateStatus(task, 'blocked', {
        error: error.message,
        escalate: true
      });
    }
  }

  /**
   * Run decision engine evaluation
   * Used for strategic planning
   */
  async evaluate(event) {
    return await this.decisionEngine.evaluate(event);
  }

  /**
   * Get current status
   */
  async getStatus() {
    return {
      config: this.config,
      queue: await this.queue.getStatus(),
      lastScan: this.watcher?.lastScan,
      running: this.running
    };
  }
}

export default VisionDriverBot;
