/**
 * VDB Reporter Module
 *
 * Reports progress and results back to boards and notifications.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

const EXECUTION_LOG = '.claude/vdb/execution-log.jsonl';
const SUMMARY_DIR = '.claude/vdb/summaries';

export class Reporter {
  constructor(config, projectRoot) {
    this.config = config;
    this.projectRoot = projectRoot;
    this.reportingConfig = config.reporting || {};
  }

  /**
   * Report task completion
   */
  async reportCompletion(task, result) {
    // Log execution
    await this.logExecution(task, result, 'completed');

    // Post progress to boards
    if (this.reportingConfig.progressComments) {
      await this.postProgressComment(task, {
        percentage: 100,
        status: 'completed',
        completedTasks: result.tasks_completed || 1,
        totalTasks: result.tasks_completed || 1,
        lastAction: 'Phase completed successfully',
        duration_ms: result.duration_ms
      });
    }

    // Send notifications
    await this.sendNotifications('completion', {
      task,
      result,
      message: `✅ Completed: ${task.phase_title}`
    });

    // Update completion tracking
    await this.updateCompletionTracking(task, result);

    return { reported: true };
  }

  /**
   * Report task failure
   */
  async reportFailure(task, error) {
    // Log execution
    await this.logExecution(task, { error: error.message }, 'failed');

    // Post failure to boards
    if (this.reportingConfig.progressComments) {
      await this.postProgressComment(task, {
        percentage: task.progress || 0,
        status: 'failed',
        error: error.message,
        lastAction: 'Execution failed'
      });
    }

    // Send notifications
    await this.sendNotifications('failure', {
      task,
      error: error.message,
      message: `❌ Failed: ${task.phase_title}`
    });

    return { reported: true };
  }

  /**
   * Report progress update
   */
  async reportProgress(task, progress) {
    // Check if we should post based on interval
    const interval = this.reportingConfig.progressInterval || 25;
    const thresholds = [25, 50, 75, 100];
    const shouldPost = thresholds
      .filter(t => t <= progress.percentage && t % interval === 0)
      .length > 0;

    if (shouldPost && this.reportingConfig.progressComments) {
      await this.postProgressComment(task, progress);
    }

    return { reported: shouldPost };
  }

  /**
   * Post progress comment to boards
   */
  async postProgressComment(task, progress) {
    const { BoardSync } = await import('./board-sync.js');
    const boardSync = new BoardSync(this.config, this.projectRoot);

    return await boardSync.postProgress(task, progress);
  }

  /**
   * Send notifications via configured channels
   */
  async sendNotifications(type, data) {
    const notifications = this.reportingConfig.notifications || {};

    // Slack
    if (notifications.slack?.enabled) {
      await this.sendSlackNotification(type, data);
    }

    // Discord
    if (notifications.discord?.enabled) {
      await this.sendDiscordNotification(type, data);
    }
  }

  async sendSlackNotification(type, data) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL ||
      this.reportingConfig.notifications?.slack?.webhookUrl;

    if (!webhookUrl) return;

    const colors = {
      completion: '#36a64f',
      failure: '#cc0000',
      progress: '#2196F3'
    };

    const payload = {
      attachments: [{
        color: colors[type] || '#cccccc',
        title: data.message,
        fields: [
          { title: 'Phase', value: data.task?.phase_title || 'Unknown', short: true },
          { title: 'Epic', value: data.task?.epic_title || 'Unknown', short: true }
        ],
        footer: 'Vision Driver Bot',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    if (data.error) {
      payload.attachments[0].fields.push({
        title: 'Error',
        value: data.error.substring(0, 200),
        short: false
      });
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('[VDB Reporter] Slack notification failed:', error.message);
    }
  }

  async sendDiscordNotification(type, data) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL ||
      this.reportingConfig.notifications?.discord?.webhookUrl;

    if (!webhookUrl) return;

    const colors = {
      completion: 0x36a64f,
      failure: 0xcc0000,
      progress: 0x2196F3
    };

    const payload = {
      embeds: [{
        title: data.message,
        color: colors[type] || 0xcccccc,
        fields: [
          { name: 'Phase', value: data.task?.phase_title || 'Unknown', inline: true },
          { name: 'Epic', value: data.task?.epic_title || 'Unknown', inline: true }
        ],
        footer: { text: 'Vision Driver Bot' },
        timestamp: new Date().toISOString()
      }]
    };

    if (data.error) {
      payload.embeds[0].fields.push({
        name: 'Error',
        value: data.error.substring(0, 200),
        inline: false
      });
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('[VDB Reporter] Discord notification failed:', error.message);
    }
  }

  /**
   * Log execution to file
   */
  async logExecution(task, result, status) {
    const logPath = join(this.projectRoot, EXECUTION_LOG);
    const logDir = join(this.projectRoot, '.claude/vdb');

    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      task_id: task.id || task.phase_id,
      phase_id: task.phase_id,
      epic_id: task.epic_id,
      phase_title: task.phase_title,
      status,
      duration_ms: result.duration_ms,
      tasks_completed: result.tasks_completed,
      signals_count: result.signals?.length,
      error: result.error,
      exit_code: result.exit_code
    };

    appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');

    // Rotate log if needed
    await this.rotateLogIfNeeded(logPath);
  }

  async rotateLogIfNeeded(logPath) {
    const maxSizeMB = this.config.logging?.rotateAfterMB || 10;
    const maxBytes = maxSizeMB * 1024 * 1024;

    try {
      const { statSync, renameSync } = await import('fs');
      const stats = statSync(logPath);

      if (stats.size > maxBytes) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = logPath.replace('.jsonl', `-${timestamp}.jsonl`);
        renameSync(logPath, archivePath);
      }
    } catch {
      // Ignore rotation errors
    }
  }

  /**
   * Update completion tracking for velocity
   */
  async updateCompletionTracking(task, result) {
    const trackingPath = join(this.projectRoot, '.claude/pm-hierarchy/completion-tracking.json');
    const trackingDir = join(this.projectRoot, '.claude/pm-hierarchy');

    if (!existsSync(trackingDir)) {
      mkdirSync(trackingDir, { recursive: true });
    }

    let tracking = {
      velocity: { daily: { count: 0 }, weekly: { count: 0 }, history: [] },
      completions: []
    };

    if (existsSync(trackingPath)) {
      try {
        tracking = JSON.parse(readFileSync(trackingPath, 'utf8'));
      } catch { /* use default */ }
    }

    // Add completion
    tracking.completions = tracking.completions || [];
    tracking.completions.push({
      type: 'phase',
      id: task.phase_id,
      title: task.phase_title,
      complexity: task.complexity,
      duration_ms: result.duration_ms,
      completed_at: new Date().toISOString()
    });

    // Keep last 500 completions
    if (tracking.completions.length > 500) {
      tracking.completions = tracking.completions.slice(-500);
    }

    // Update velocity
    tracking.velocity = tracking.velocity || {};
    tracking.velocity.history = tracking.velocity.history || [];
    tracking.velocity.history.push(1);
    if (tracking.velocity.history.length > 30) {
      tracking.velocity.history = tracking.velocity.history.slice(-30);
    }

    tracking.velocity.daily = {
      count: tracking.velocity.history.slice(-1).reduce((a, b) => a + b, 0)
    };
    tracking.velocity.weekly = {
      count: tracking.velocity.history.slice(-7).reduce((a, b) => a + b, 0)
    };

    tracking.last_updated = new Date().toISOString();

    writeFileSync(trackingPath, JSON.stringify(tracking, null, 2), 'utf8');
  }

  /**
   * Generate daily summary
   */
  async generateDailySummary() {
    const summaryDir = join(this.projectRoot, SUMMARY_DIR);
    if (!existsSync(summaryDir)) {
      mkdirSync(summaryDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const logPath = join(this.projectRoot, EXECUTION_LOG);

    let executions = [];
    if (existsSync(logPath)) {
      const lines = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      executions = lines
        .map(line => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(e => e && e.timestamp?.startsWith(today));
    }

    const summary = {
      date: today,
      total_executions: executions.length,
      successful: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      total_duration_ms: executions.reduce((sum, e) => sum + (e.duration_ms || 0), 0),
      phases_completed: [...new Set(executions.filter(e => e.status === 'completed').map(e => e.phase_id))],
      errors: executions.filter(e => e.error).map(e => ({
        phase: e.phase_title,
        error: e.error
      })),
      generated_at: new Date().toISOString()
    };

    const summaryPath = join(summaryDir, `${today}.json`);
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

    return summary;
  }

  /**
   * Generate epic completion summary
   */
  async generateEpicSummary(epicId) {
    const summaryDir = join(this.projectRoot, SUMMARY_DIR);
    if (!existsSync(summaryDir)) {
      mkdirSync(summaryDir, { recursive: true });
    }

    const logPath = join(this.projectRoot, EXECUTION_LOG);
    let executions = [];

    if (existsSync(logPath)) {
      const lines = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      executions = lines
        .map(line => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(e => e && e.epic_id === epicId);
    }

    const summary = {
      epic_id: epicId,
      total_phases: [...new Set(executions.map(e => e.phase_id))].length,
      total_executions: executions.length,
      successful: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      total_duration_ms: executions.reduce((sum, e) => sum + (e.duration_ms || 0), 0),
      total_duration_hours: (executions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / 3600000).toFixed(2),
      phases: executions
        .filter(e => e.status === 'completed')
        .map(e => ({
          phase_id: e.phase_id,
          phase_title: e.phase_title,
          completed_at: e.timestamp
        })),
      generated_at: new Date().toISOString()
    };

    const summaryPath = join(summaryDir, `epic-${epicId}.json`);
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

    return summary;
  }

  /**
   * Get execution statistics
   */
  async getStats(days = 7) {
    const logPath = join(this.projectRoot, EXECUTION_LOG);

    if (!existsSync(logPath)) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        success_rate: 'N/A',
        avg_duration_minutes: 0
      };
    }

    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const lines = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);

    const executions = lines
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(e => e && new Date(e.timestamp) > cutoff);

    const successful = executions.filter(e => e.status === 'completed');
    const failed = executions.filter(e => e.status === 'failed');
    const avgDuration = successful.length > 0
      ? successful.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / successful.length
      : 0;

    return {
      period_days: days,
      total: executions.length,
      successful: successful.length,
      failed: failed.length,
      success_rate: executions.length > 0
        ? ((successful.length / executions.length) * 100).toFixed(1) + '%'
        : 'N/A',
      avg_duration_minutes: (avgDuration / 60000).toFixed(1),
      phases_completed: [...new Set(successful.map(e => e.phase_id))].length
    };
  }
}

export default Reporter;
