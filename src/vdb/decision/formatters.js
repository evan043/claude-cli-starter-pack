/**
 * Decision Engine Formatters
 *
 * Report generation and formatting utilities
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { DECISION_LOG, RECOMMENDATIONS_FILE } from './constants.js';

/**
 * Log decision to audit trail
 */
export async function logDecision(event, context, decision, projectRoot) {
  const logPath = join(projectRoot, DECISION_LOG);
  const logDir = join(projectRoot, '.claude/vdb');

  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const entry = {
    timestamp: new Date().toISOString(),
    event_type: event.type,
    decision: decision.decision,
    reason: decision.reason,
    actions_count: decision.actions?.length || 0,
    recommendations_count: decision.recommendations?.length || 0
  };

  const line = JSON.stringify(entry) + '\n';
  appendFileSync(logPath, line, 'utf8');

  // Also save current recommendations
  if (decision.recommendations?.length > 0) {
    await saveRecommendations(decision.recommendations, projectRoot);
  }
}

/**
 * Save recommendations to file
 */
export async function saveRecommendations(recommendations, projectRoot) {
  const path = join(projectRoot, RECOMMENDATIONS_FILE);
  const existing = existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8'))
    : { recommendations: [], updated: null };

  // Add new recommendations (dedupe by description)
  for (const rec of recommendations) {
    if (!existing.recommendations.some(r => r.description === rec.description)) {
      existing.recommendations.push({
        ...rec,
        created_at: new Date().toISOString()
      });
    }
  }

  // Keep last 50
  existing.recommendations = existing.recommendations.slice(-50);
  existing.updated = new Date().toISOString();

  writeFileSync(path, JSON.stringify(existing, null, 2), 'utf8');
}

/**
 * Format notification message for human
 */
export function formatNotification(params) {
  const urgency = params.urgency || 'normal';
  return `[VDB] Human notification: ${params.reason} (${urgency})`;
}

/**
 * Build decision summary for logging
 */
export function buildDecisionSummary(decision) {
  return {
    decision: decision.decision,
    reason: decision.reason,
    actions: decision.actions?.map(a => a.action) || [],
    recommendations: decision.recommendations?.map(r => r.description) || []
  };
}
