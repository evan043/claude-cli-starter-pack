/**
 * VDB Task Queue Module
 *
 * Manages the queue of tasks to be executed:
 * - Prioritization strategies (FIFO, Priority, Balanced)
 * - Deduplication
 * - Retry handling
 * - Queue persistence
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const QUEUE_FILE = '.claude/vdb/queue.json';
const HISTORY_FILE = '.claude/vdb/queue-history.json';

export class TaskQueue {
  constructor(config, projectRoot) {
    this.config = config.queue || {};
    this.projectRoot = projectRoot;
    this.queuePath = join(projectRoot, QUEUE_FILE);
    this.historyPath = join(projectRoot, HISTORY_FILE);
  }

  /**
   * Add task to queue
   */
  async enqueue(task) {
    const queue = this.loadQueue();

    // Check for duplicate
    if (queue.some(t => t.id === task.id)) {
      return { queued: false, reason: 'duplicate' };
    }

    // Add queue metadata
    const queuedTask = {
      ...task,
      queued_at: new Date().toISOString(),
      status: 'queued',
      attempts: 0
    };

    queue.push(queuedTask);

    // Apply strategy ordering
    const ordered = this.applyStrategy(queue);

    // Trim to max size
    const maxSize = this.config.maxSize || 20;
    const trimmed = ordered.slice(0, maxSize);

    this.saveQueue(trimmed);

    const position = trimmed.findIndex(t => t.id === task.id) + 1;
    return { queued: true, position, queueSize: trimmed.length };
  }

  /**
   * Get and remove next task from queue
   */
  async dequeue() {
    const queue = this.loadQueue();

    // Find first queued item
    const index = queue.findIndex(t => t.status === 'queued');
    if (index === -1) {
      return null;
    }

    const task = queue[index];
    task.status = 'executing';
    task.started_at = new Date().toISOString();
    task.attempts = (task.attempts || 0) + 1;

    this.saveQueue(queue);

    return task;
  }

  /**
   * Mark task as complete
   */
  async markComplete(taskId, result = {}) {
    const queue = this.loadQueue();
    const index = queue.findIndex(t => t.id === taskId);

    if (index === -1) {
      return false;
    }

    const task = queue[index];
    task.status = 'completed';
    task.completed_at = new Date().toISOString();
    task.result = result;

    // Calculate duration
    if (task.started_at) {
      task.duration_ms = new Date(task.completed_at) - new Date(task.started_at);
    }

    // Move to history
    this.addToHistory(task);

    // Remove from queue
    queue.splice(index, 1);
    this.saveQueue(queue);

    return true;
  }

  /**
   * Mark task as failed
   */
  async markFailed(taskId, error) {
    const queue = this.loadQueue();
    const index = queue.findIndex(t => t.id === taskId);

    if (index === -1) {
      return false;
    }

    const task = queue[index];
    task.status = 'failed';
    task.failed_at = new Date().toISOString();
    task.error = error?.message || String(error);

    // Move to history
    this.addToHistory(task);

    // Remove from queue
    queue.splice(index, 1);
    this.saveQueue(queue);

    return true;
  }

  /**
   * Requeue a task for retry
   */
  async requeue(taskOrId, updates = {}) {
    const queue = this.loadQueue();
    const taskId = typeof taskOrId === 'string' ? taskOrId : taskOrId.id;
    const index = queue.findIndex(t => t.id === taskId);

    if (index === -1) {
      // Task not in queue, add it back
      const task = typeof taskOrId === 'object' ? taskOrId : null;
      if (task) {
        return this.enqueue({
          ...task,
          ...updates,
          requeued_at: new Date().toISOString()
        });
      }
      return false;
    }

    const task = queue[index];
    Object.assign(task, updates, {
      status: 'queued',
      requeued_at: new Date().toISOString()
    });

    // Re-sort queue
    const ordered = this.applyStrategy(queue);
    this.saveQueue(ordered);

    return true;
  }

  /**
   * Get queue status
   */
  async getStatus() {
    const queue = this.loadQueue();

    return {
      total: queue.length,
      queued: queue.filter(t => t.status === 'queued').length,
      executing: queue.filter(t => t.status === 'executing').length,
      items: queue.map(t => ({
        id: t.id,
        phase_title: t.phase_title,
        priority: t.priority,
        status: t.status,
        attempts: t.attempts
      }))
    };
  }

  /**
   * Get next task without removing
   */
  async peek() {
    const queue = this.loadQueue();
    return queue.find(t => t.status === 'queued') || null;
  }

  /**
   * Clear all queued items
   */
  async clear() {
    this.saveQueue([]);
    return true;
  }

  /**
   * Apply prioritization strategy
   */
  applyStrategy(queue) {
    const strategy = this.config.strategy || 'priority';

    switch (strategy) {
      case 'priority':
        return this.sortByPriority(queue);

      case 'balanced':
        return this.sortBalanced(queue);

      case 'fifo':
      default:
        return this.sortByTime(queue);
    }
  }

  /**
   * Sort by priority (highest first)
   */
  sortByPriority(queue) {
    return [...queue].sort((a, b) => {
      // Executing items first
      if (a.status === 'executing' && b.status !== 'executing') return -1;
      if (b.status === 'executing' && a.status !== 'executing') return 1;

      // Then by priority
      return (b.priority || 0) - (a.priority || 0);
    });
  }

  /**
   * Sort by queue time (FIFO)
   */
  sortByTime(queue) {
    return [...queue].sort((a, b) => {
      // Executing items first
      if (a.status === 'executing' && b.status !== 'executing') return -1;
      if (b.status === 'executing' && a.status !== 'executing') return 1;

      // Then by queue time
      return new Date(a.queued_at) - new Date(b.queued_at);
    });
  }

  /**
   * Sort balanced (alternate feature/platform)
   */
  sortBalanced(queue) {
    const executing = queue.filter(t => t.status === 'executing');
    const queued = queue.filter(t => t.status === 'queued');

    // Group by type
    const features = queued.filter(t => t.epic_type === 'feature');
    const platform = queued.filter(t => t.epic_type === 'platform');
    const techDebt = queued.filter(t => t.epic_type === 'techDebt');
    const other = queued.filter(t =>
      !['feature', 'platform', 'techDebt'].includes(t.epic_type)
    );

    // Sort each group by priority
    [features, platform, techDebt, other].forEach(group => {
      group.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    });

    // Interleave based on ratio
    const ratio = this.config.balanceRatio || { feature: 3, platform: 1, techDebt: 1 };
    const balanced = [];

    let fi = 0, pi = 0, ti = 0, oi = 0;
    while (fi < features.length || pi < platform.length || ti < techDebt.length || oi < other.length) {
      // Add features
      for (let i = 0; i < ratio.feature && fi < features.length; i++) {
        balanced.push(features[fi++]);
      }
      // Add platform
      for (let i = 0; i < ratio.platform && pi < platform.length; i++) {
        balanced.push(platform[pi++]);
      }
      // Add tech debt
      for (let i = 0; i < (ratio.techDebt || 1) && ti < techDebt.length; i++) {
        balanced.push(techDebt[ti++]);
      }
      // Add other
      if (oi < other.length) {
        balanced.push(other[oi++]);
      }
    }

    return [...executing, ...balanced];
  }

  /**
   * Load queue from disk
   */
  loadQueue() {
    if (!existsSync(this.queuePath)) {
      return [];
    }

    try {
      return JSON.parse(readFileSync(this.queuePath, 'utf8'));
    } catch {
      return [];
    }
  }

  /**
   * Save queue to disk
   */
  saveQueue(queue) {
    const dir = join(this.projectRoot, '.claude/vdb');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(this.queuePath, JSON.stringify(queue, null, 2), 'utf8');
  }

  /**
   * Add completed/failed task to history
   */
  addToHistory(task) {
    let history = [];

    if (existsSync(this.historyPath)) {
      try {
        history = JSON.parse(readFileSync(this.historyPath, 'utf8'));
      } catch {
        history = [];
      }
    }

    history.push(task);

    // Keep last 500 items
    if (history.length > 500) {
      history = history.slice(-500);
    }

    const dir = join(this.projectRoot, '.claude/vdb');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(this.historyPath, JSON.stringify(history, null, 2), 'utf8');
  }

  /**
   * Get execution history
   */
  async getHistory(limit = 50) {
    if (!existsSync(this.historyPath)) {
      return [];
    }

    try {
      const history = JSON.parse(readFileSync(this.historyPath, 'utf8'));
      return history.slice(-limit);
    } catch {
      return [];
    }
  }

  /**
   * Get statistics from history
   */
  async getStats() {
    const history = await this.getHistory(500);

    const completed = history.filter(t => t.status === 'completed');
    const failed = history.filter(t => t.status === 'failed');

    const avgDuration = completed.length > 0
      ? completed.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / completed.length
      : 0;

    return {
      total: history.length,
      completed: completed.length,
      failed: failed.length,
      successRate: history.length > 0
        ? (completed.length / history.length * 100).toFixed(1) + '%'
        : 'N/A',
      avgDurationMs: Math.round(avgDuration),
      avgDurationMinutes: (avgDuration / 60000).toFixed(1)
    };
  }
}

export default TaskQueue;
