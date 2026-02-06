/**
 * VDB Decision Engine
 *
 * AI-powered strategic decision making for Vision Driver Bot:
 * - Gap analysis and recommendations
 * - Feature/platform balance checks
 * - Priority adjustments
 * - Escalation decisions
 * - Vision alignment evaluation
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  classifyFailure,
  analyzeVelocityTrend,
  calculateBalanceRatios,
  getBalanceRecommendation,
  analyzeEpicGaps,
  calculatePhaseProgress,
  calculateVisionProgress,
  findNextPhase,
  suggestNextEpic,
  countStaleTasks
} from './analyzers.js';
import { logDecision, formatNotification } from './formatters.js';

export class DecisionEngine {
  constructor(config, projectRoot) {
    this.config = config.decisionEngine || {};
    this.projectRoot = projectRoot;
    this.enabled = this.config.enabled !== false;
  }

  /**
   * Evaluate an event and make strategic decisions
   */
  async evaluate(event) {
    if (!this.enabled) {
      return { decision: 'continue', reason: 'Decision engine disabled' };
    }

    const context = await this.buildContext(event);
    const decision = await this.makeDecision(event, context);

    // Log decision
    await logDecision(event, context, decision, this.projectRoot);

    // Execute automatic actions
    if (decision.actions?.length > 0) {
      await this.executeActions(decision.actions);
    }

    return decision;
  }

  /**
   * Build context for decision making
   */
  async buildContext(event) {
    return {
      timestamp: new Date().toISOString(),
      event_type: event.type,

      // Board state summary
      board: await this.getBoardSummary(),

      // Queue status
      queue: await this.getQueueStatus(),

      // Velocity metrics
      velocity: await this.getVelocityMetrics(),

      // Balance analysis
      balance: await this.calculateBalance(),

      // Recent history
      recentCompletions: await this.getRecentCompletions(7),
      recentFailures: await this.getRecentFailures(7),

      // Active blockers
      blockers: await this.getActiveBlockers()
    };
  }

  /**
   * Make decision based on event and context
   */
  async makeDecision(event, context) {
    // Check for automatic decisions first
    const autoDecision = this.checkAutomaticDecisions(event, context);
    if (autoDecision) {
      return autoDecision;
    }

    // Event-specific decision logic
    switch (event.type) {
      case 'task_complete':
        return this.handleTaskComplete(event, context);

      case 'task_failed':
        return this.handleTaskFailed(event, context);

      case 'phase_complete':
        return this.handlePhaseComplete(event, context);

      case 'epic_complete':
        return this.handleEpicComplete(event, context);

      case 'board_scan':
        return this.handleBoardScan(event, context);

      case 'balance_check':
        return this.handleBalanceCheck(event, context);

      case 'daily_summary':
        return this.handleDailySummary(event, context);

      default:
        return { decision: 'continue', reason: 'Unknown event type' };
    }
  }

  /**
   * Check for automatic/safety decisions
   */
  checkAutomaticDecisions(event, context) {
    const safety = this.config.safety || {};

    // Pause if too many recent failures
    const pauseThreshold = safety.pauseOnErrorCount || 3;
    if (context.recentFailures?.length >= pauseThreshold) {
      return {
        decision: 'pause',
        reason: `Too many recent failures (${context.recentFailures.length})`,
        actions: [
          { action: 'notify_human', params: { urgency: 'high', reason: 'Multiple failures detected' } }
        ]
      };
    }

    // Check queue health
    if (context.queue?.stuck) {
      return {
        decision: 'investigate',
        reason: 'Queue appears stuck',
        actions: [
          { action: 'clear_stuck_tasks' },
          { action: 'notify_human', params: { reason: 'Queue stuck - cleared' } }
        ]
      };
    }

    return null;
  }

  /**
   * Handle task completion
   */
  async handleTaskComplete(event, context) {
    const { task } = event;
    const recommendations = [];

    // Check if phase is now complete
    const phaseProgress = calculatePhaseProgress(task, context);
    if (phaseProgress >= 100) {
      recommendations.push({
        type: 'milestone',
        priority: 'P1',
        description: `Phase "${task.phase_title}" completed`,
        action: 'celebrate_and_advance'
      });
    }

    // Check balance after completion
    const balanceStatus = context.balance?.recommendation?.status;
    if (balanceStatus === 'imbalanced') {
      recommendations.push({
        type: 'balance',
        priority: 'P2',
        description: context.balance.recommendation.message,
        action: context.balance.recommendation.suggestedAction
      });
    }

    // Check velocity trend
    const velocityTrend = analyzeVelocityTrend(context.velocity);
    if (velocityTrend === 'improving') {
      recommendations.push({
        type: 'opportunity',
        priority: 'P3',
        description: 'Velocity improving - consider taking on larger tasks',
        action: 'increase_complexity_threshold'
      });
    }

    return {
      decision: 'continue',
      reason: 'Task completed successfully',
      recommendations,
      next_action: 'execute_next_queued',
      metrics: {
        phase_progress: phaseProgress,
        queue_size: context.queue?.total || 0,
        velocity_trend: velocityTrend
      }
    };
  }

  /**
   * Handle task failure
   */
  async handleTaskFailed(event, context) {
    const { task, error, escalate } = event;
    const actions = [];
    const recommendations = [];

    // Analyze failure type
    const failureType = classifyFailure(error);

    switch (failureType) {
      case 'timeout':
        recommendations.push({
          type: 'adjustment',
          priority: 'P2',
          description: 'Task timed out - consider breaking into smaller tasks',
          action: 'split_task'
        });
        break;

      case 'dependency':
        actions.push({
          action: 'check_dependencies',
          target: task.phase_id
        });
        break;

      case 'test_failure':
        recommendations.push({
          type: 'quality',
          priority: 'P1',
          description: 'Tests failing - needs investigation',
          action: 'investigate_tests'
        });
        break;

      case 'permission':
        actions.push({
          action: 'notify_human',
          params: { reason: 'Permission error - needs manual intervention', urgency: 'medium' }
        });
        break;
    }

    // Should we escalate?
    const shouldEscalate = escalate ||
      (task.attempts || 0) >= (this.config.maxRetries || 3) ||
      failureType === 'permission';

    if (shouldEscalate) {
      actions.push({
        action: 'escalate_to_human',
        params: { task_id: task.id, error, failure_type: failureType }
      });
    }

    return {
      decision: shouldEscalate ? 'escalate' : 'retry',
      reason: `Task failed: ${failureType}`,
      failure_type: failureType,
      actions,
      recommendations,
      retry_eligible: !shouldEscalate
    };
  }

  /**
   * Handle phase completion
   */
  async handlePhaseComplete(event, context) {
    const { epic_id, phase_id } = event;
    const recommendations = [];
    const actions = [];

    // Check if there are more phases
    const epic = context.board?.epics?.find(e => e.epic_id === epic_id);
    const remainingPhases = epic?.phases?.filter(p => p.status !== 'completed') || [];

    if (remainingPhases.length === 0) {
      // Epic complete!
      actions.push({
        action: 'trigger_event',
        params: { type: 'epic_complete', epic_id }
      });
    } else {
      // Queue next phase
      const nextPhase = findNextPhase(remainingPhases, epic);
      if (nextPhase) {
        actions.push({
          action: 'queue_phase',
          target: nextPhase.phase_id,
          params: { priority: 'high' }
        });
      }
    }

    // Gap analysis on phase completion
    const checkAreas = this.config.gapAnalysis?.checkAreas;
    const gaps = analyzeEpicGaps(epic, checkAreas);
    if (gaps.length > 0) {
      recommendations.push(...gaps.map(gap => ({
        type: 'gap',
        priority: gap.severity === 'high' ? 'P1' : 'P2',
        description: gap.description,
        action: gap.suggestedAction
      })));
    }

    return {
      decision: 'advance',
      reason: `Phase ${phase_id} completed`,
      remaining_phases: remainingPhases.length,
      actions,
      recommendations
    };
  }

  /**
   * Handle epic completion
   */
  async handleEpicComplete(event, context) {
    const { epic_id } = event;
    const actions = [];
    const recommendations = [];

    // Post summary
    actions.push({
      action: 'post_epic_summary',
      target: epic_id
    });

    // Check vision progress
    const visionProgress = calculateVisionProgress(context.board?.epics || []);
    if (visionProgress >= 100) {
      actions.push({
        action: 'notify_human',
        params: { reason: 'Vision complete! Time to plan next phase.', urgency: 'low' }
      });
    }

    // Suggest next epic
    const nextEpic = suggestNextEpic(context.board?.epics || []);
    if (nextEpic) {
      recommendations.push({
        type: 'next_work',
        priority: 'P1',
        description: `Recommended next epic: ${nextEpic.title}`,
        action: 'start_epic',
        target: nextEpic.epic_id
      });
    }

    // Balance check after epic
    const balance = context.balance;
    if (balance?.recommendation?.status === 'imbalanced') {
      recommendations.push({
        type: 'balance',
        priority: 'P1',
        description: balance.recommendation.message,
        action: balance.recommendation.suggestedAction
      });
    }

    return {
      decision: 'celebrate',
      reason: `Epic ${epic_id} completed!`,
      vision_progress: visionProgress,
      actions,
      recommendations
    };
  }

  /**
   * Handle board scan results
   */
  async handleBoardScan(event, context) {
    const { actionable } = event;
    const recommendations = [];

    // Analyze what was found
    if (actionable.length === 0) {
      // Nothing to do - check for gaps
      const gaps = await this.analyzeGapsFromBoard(context.board);
      recommendations.push(...gaps);

      if (gaps.length > 0) {
        return {
          decision: 'suggest',
          reason: 'No actionable items found, but gaps identified',
          recommendations
        };
      }

      return {
        decision: 'idle',
        reason: 'No actionable items found',
        suggestions: ['Check if all epics are completed', 'Consider adding new epics']
      };
    }

    // Items found - queue them
    return {
      decision: 'continue',
      reason: `Found ${actionable.length} actionable items`,
      queued: actionable.length
    };
  }

  /**
   * Handle balance check
   */
  async handleBalanceCheck(event, context) {
    const balance = context.balance;

    if (balance.recommendation.status === 'healthy') {
      return {
        decision: 'continue',
        reason: 'Balance is healthy',
        balance: balance.ratios
      };
    }

    return {
      decision: 'rebalance',
      reason: balance.recommendation.message,
      current_balance: balance.ratios,
      recommendations: [{
        type: 'balance',
        priority: 'P1',
        description: balance.recommendation.message,
        action: balance.recommendation.suggestedAction
      }]
    };
  }

  /**
   * Handle daily summary
   */
  async handleDailySummary(event, context) {
    const recommendations = [];

    // Velocity analysis
    const velocity = context.velocity;
    const trend = analyzeVelocityTrend(velocity);

    if (trend === 'declining') {
      recommendations.push({
        type: 'velocity',
        priority: 'P2',
        description: 'Velocity declining - consider reviewing blocking factors'
      });
    }

    // Balance check
    if (context.balance?.recommendation?.status === 'imbalanced') {
      recommendations.push({
        type: 'balance',
        priority: 'P2',
        description: context.balance.recommendation.message
      });
    }

    // Stale tasks
    const staleCount = countStaleTasks(context.board?.epics || []);

    if (staleCount > 0) {
      recommendations.push({
        type: 'attention',
        priority: 'P2',
        description: `${staleCount} stale tasks need attention`
      });
    }

    return {
      decision: 'report',
      reason: 'Daily summary generated',
      summary: {
        velocity_trend: trend,
        completions_today: velocity?.daily?.count || 0,
        queue_size: context.queue?.total || 0,
        active_epics: context.board?.epics?.filter(e => e.status === 'active')?.length || 0,
        stale_tasks: staleCount
      },
      recommendations
    };
  }

  /**
   * Calculate feature/platform balance
   */
  async calculateBalance() {
    const { BoardSync } = await import('../board-sync.js');
    const boardSync = new BoardSync(this.config, this.projectRoot);
    const state = await boardSync.fetchState();

    const { counts, ratios } = calculateBalanceRatios(state.epics);

    if (Object.values(counts).reduce((a, b) => a + b, 0) === 0) {
      return { counts, ratios: {}, recommendation: { status: 'empty' } };
    }

    const thresholds = this.config.balance;
    return {
      counts,
      ratios,
      recommendation: getBalanceRecommendation(ratios, thresholds)
    };
  }

  /**
   * Execute decided actions
   */
  async executeActions(actions) {
    for (const action of actions) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error(`[VDB Decision] Failed to execute action ${action.action}:`, error.message);
      }
    }
  }

  async executeAction(action) {
    switch (action.action) {
      case 'notify_human':
        await this.notifyHuman(action.params);
        break;

      case 'queue_phase': {
        const { TaskQueue } = await import('../queue.js');
        const queue = new TaskQueue(this.config, this.projectRoot);
        await queue.enqueue({ phase_id: action.target, ...action.params });
        break;
      }

      case 'post_epic_summary':
        // Will be handled by reporter
        break;

      case 'clear_stuck_tasks': {
        const { TaskQueue: TQ } = await import('../queue.js');
        const q = new TQ(this.config, this.projectRoot);
        await q.clear();
        break;
      }
    }
  }

  async notifyHuman(params) {
    // For now, just log. In production, send to Slack/Discord/email
    console.log(formatNotification(params));

    // Could integrate with notification webhooks here
    const webhooks = this.config.reporting?.notifications || {};

    if (webhooks.slack?.enabled && webhooks.slack.webhookUrl) {
      // Send to Slack
    }
    if (webhooks.discord?.enabled && webhooks.discord.webhookUrl) {
      // Send to Discord
    }
  }

  // Helper methods for context building
  async getBoardSummary() {
    try {
      const { BoardSync } = await import('../board-sync.js');
      const boardSync = new BoardSync(this.config, this.projectRoot);
      return await boardSync.fetchState();
    } catch {
      return { epics: [] };
    }
  }

  async getQueueStatus() {
    try {
      const { TaskQueue } = await import('../queue.js');
      const queue = new TaskQueue(this.config, this.projectRoot);
      return await queue.getStatus();
    } catch {
      return { total: 0 };
    }
  }

  async getVelocityMetrics() {
    // Load from completion tracking
    const path = join(this.projectRoot, '.claude/pm-hierarchy/completion-tracking.json');
    if (!existsSync(path)) return null;

    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      return null;
    }
  }

  async getRecentCompletions(days) {
    try {
      const { TaskQueue } = await import('../queue.js');
      const queue = new TaskQueue(this.config, this.projectRoot);
      const history = await queue.getHistory(100);

      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      return history.filter(t =>
        t.status === 'completed' &&
        new Date(t.completed_at) > cutoff
      );
    } catch {
      return [];
    }
  }

  async getRecentFailures(days) {
    try {
      const { TaskQueue } = await import('../queue.js');
      const queue = new TaskQueue(this.config, this.projectRoot);
      const history = await queue.getHistory(100);

      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      return history.filter(t =>
        t.status === 'failed' &&
        new Date(t.failed_at) > cutoff
      );
    } catch {
      return [];
    }
  }

  async getActiveBlockers() {
    // Check for blocked items in queue and board
    return [];
  }

  async analyzeGapsFromBoard(board) {
    // Analyze overall board for gaps
    return [];
  }
}

export default DecisionEngine;
