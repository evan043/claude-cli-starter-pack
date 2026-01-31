#!/usr/bin/env node
/**
 * Autonomous Decision Logger
 *
 * Creates JSONL audit trail for agent decisions.
 * Tracks reasoning, confidence, and outcomes.
 *
 * Usage:
 *   // Import in your hook or script
 *   import { DecisionLogger } from './autonomous-decision-logger.js';
 *
 *   const logger = new DecisionLogger('.claude/logs/decisions.jsonl');
 *   logger.logDecision({
 *     agent: 'deployment-checker',
 *     decision: 'deploy',
 *     reasoning: 'All tests passed, no conflicts',
 *     confidence: 0.95,
 *   });
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';

export class DecisionLogger {
  constructor(logPath = '.claude/logs/decisions.jsonl') {
    this.logPath = resolve(process.cwd(), logPath);
    this.sessionId = this.generateSessionId();
    this.ensureLogDirectory();
  }

  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  ensureLogDirectory() {
    const dir = dirname(this.logPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Log a decision with full context
   *
   * @param {Object} decision
   * @param {string} decision.agent - Agent/component making decision
   * @param {string} decision.decision - The decision made
   * @param {string} decision.reasoning - Why this decision was made
   * @param {number} decision.confidence - Confidence level 0-1
   * @param {Object} [decision.context] - Additional context
   * @param {string} [decision.outcome] - Result (success/failure/pending)
   * @param {Array} [decision.alternatives] - Other options considered
   */
  logDecision(decision) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      pid: process.pid,
      ...decision,
    };

    this.writeEntry(entry);
    return entry;
  }

  /**
   * Log an action taken by an agent
   */
  logAction(agent, action, details = {}) {
    return this.logDecision({
      agent,
      type: 'action',
      decision: action,
      ...details,
    });
  }

  /**
   * Log an observation or analysis
   */
  logObservation(agent, observation, details = {}) {
    return this.logDecision({
      agent,
      type: 'observation',
      decision: observation,
      ...details,
    });
  }

  /**
   * Log an error or failure
   */
  logError(agent, error, context = {}) {
    return this.logDecision({
      agent,
      type: 'error',
      decision: 'error',
      reasoning: error.message || error,
      outcome: 'failure',
      context: {
        ...context,
        stack: error.stack,
      },
    });
  }

  /**
   * Log a phase transition
   */
  logPhaseTransition(fromPhase, toPhase, reason, validation = {}) {
    return this.logDecision({
      agent: 'phase-controller',
      type: 'phase_transition',
      decision: `${fromPhase} -> ${toPhase}`,
      reasoning: reason,
      context: { fromPhase, toPhase, validation },
      outcome: 'success',
    });
  }

  /**
   * Log agent spawn/delegation
   */
  logDelegation(parentAgent, childAgent, task, options = {}) {
    return this.logDecision({
      agent: parentAgent,
      type: 'delegation',
      decision: `spawn:${childAgent}`,
      reasoning: `Delegating: ${task}`,
      context: {
        childAgent,
        task,
        model: options.model,
        runInBackground: options.runInBackground,
      },
    });
  }

  writeEntry(entry) {
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(this.logPath, line);
  }

  /**
   * Read all decisions for current session
   */
  getSessionDecisions() {
    if (!existsSync(this.logPath)) return [];

    const content = readFileSync(this.logPath, 'utf8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .filter(entry => entry.sessionId === this.sessionId);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const decisions = this.getSessionDecisions();

    const summary = {
      sessionId: this.sessionId,
      totalDecisions: decisions.length,
      byType: {},
      byAgent: {},
      byOutcome: {},
      avgConfidence: 0,
    };

    let confidenceSum = 0;
    let confidenceCount = 0;

    for (const d of decisions) {
      // Count by type
      const type = d.type || 'decision';
      summary.byType[type] = (summary.byType[type] || 0) + 1;

      // Count by agent
      summary.byAgent[d.agent] = (summary.byAgent[d.agent] || 0) + 1;

      // Count by outcome
      if (d.outcome) {
        summary.byOutcome[d.outcome] = (summary.byOutcome[d.outcome] || 0) + 1;
      }

      // Average confidence
      if (typeof d.confidence === 'number') {
        confidenceSum += d.confidence;
        confidenceCount++;
      }
    }

    if (confidenceCount > 0) {
      summary.avgConfidence = (confidenceSum / confidenceCount).toFixed(2);
    }

    return summary;
  }
}

// CLI mode - print summary if run directly
async function main() {
  const args = process.argv.slice(2);
  const logPath = args[0] || '.claude/logs/decisions.jsonl';

  if (!existsSync(logPath)) {
    console.log(`No log file found at: ${logPath}`);
    console.log('\nUsage: node autonomous-decision-logger.js [log-path]');
    console.log('\nTo create logs, import DecisionLogger in your code:');
    console.log("  import { DecisionLogger } from './autonomous-decision-logger.js';");
    console.log("  const logger = new DecisionLogger();");
    console.log("  logger.logDecision({ agent: 'my-agent', decision: 'proceed', confidence: 0.9 });");
    return;
  }

  // Read and summarize log
  const content = readFileSync(logPath, 'utf8');
  const entries = content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  console.log('\n📋 Decision Log Summary\n');
  console.log(`Log file: ${logPath}`);
  console.log(`Total entries: ${entries.length}`);

  // Group by session
  const sessions = {};
  for (const entry of entries) {
    const sid = entry.sessionId || 'unknown';
    if (!sessions[sid]) {
      sessions[sid] = [];
    }
    sessions[sid].push(entry);
  }

  console.log(`Sessions: ${Object.keys(sessions).length}`);

  // Show last 10 decisions
  console.log('\n📜 Last 10 Decisions:\n');
  const recent = entries.slice(-10);
  for (const entry of recent) {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const conf = entry.confidence ? ` (${(entry.confidence * 100).toFixed(0)}%)` : '';
    console.log(`  [${time}] ${entry.agent}: ${entry.decision}${conf}`);
    if (entry.reasoning) {
      console.log(`           └─ ${entry.reasoning.substring(0, 60)}`);
    }
  }

  // By type
  const typeCount = {};
  for (const entry of entries) {
    const type = entry.type || 'decision';
    typeCount[type] = (typeCount[type] || 0) + 1;
  }

  console.log('\n📊 By Type:');
  for (const [type, count] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('');
}

// Export for use as module
export default DecisionLogger;

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch(console.error);
}
