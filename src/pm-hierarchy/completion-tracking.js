/**
 * Completion Tracking Module
 *
 * Tracks actual development time and calculates velocity metrics.
 * Used for:
 * - Timeline scaling (daily/weekly/monthly/quarterly)
 * - Vision generation reminders (when ahead of schedule)
 * - Estimated completion dates
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createEmptyCompletionTracking, DEFAULTS } from './schema.js';

const TRACKING_FILE = '.claude/completion-tracking.json';

/**
 * Load completion tracking data
 * @param {string} cwd - Working directory
 * @returns {Object}
 */
export function loadCompletionTracking(cwd = process.cwd()) {
  const trackingPath = join(cwd, TRACKING_FILE);

  if (!existsSync(trackingPath)) {
    return createEmptyCompletionTracking();
  }

  try {
    return JSON.parse(readFileSync(trackingPath, 'utf8'));
  } catch {
    return createEmptyCompletionTracking();
  }
}

/**
 * Save completion tracking data
 * @param {Object} tracking - Tracking data
 * @param {string} cwd - Working directory
 */
export function saveCompletionTracking(tracking, cwd = process.cwd()) {
  const trackingPath = join(cwd, TRACKING_FILE);
  const dir = dirname(trackingPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  tracking.last_updated = new Date().toISOString();
  writeFileSync(trackingPath, JSON.stringify(tracking, null, 2), 'utf8');
}

/**
 * Record a completion event
 * @param {Object} completion - Completion data
 * @param {string} cwd - Working directory
 */
export function recordCompletion(completion, cwd = process.cwd()) {
  const tracking = loadCompletionTracking(cwd);

  const record = {
    type: completion.type, // 'task' | 'phase' | 'roadmap' | 'epic'
    id: completion.id,
    title: completion.title || '',
    estimated_duration: completion.estimated_duration || null,
    actual_duration: completion.actual_duration || null,
    completed_at: new Date().toISOString(),
    complexity: completion.complexity || null,
  };

  tracking.completions.push(record);

  // Recalculate velocity
  recalculateVelocity(tracking);

  // Update schedule status
  updateScheduleStatus(tracking);

  // Check for vision reminder
  checkVisionReminder(tracking);

  saveCompletionTracking(tracking, cwd);

  return record;
}

/**
 * Recalculate velocity metrics from completions
 * @param {Object} tracking - Tracking data
 */
function recalculateVelocity(tracking) {
  const now = new Date();
  const completions = tracking.completions || [];

  // Get completions from different time periods
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentDay = completions.filter(c => new Date(c.completed_at) >= oneDayAgo);
  const recentWeek = completions.filter(c => new Date(c.completed_at) >= oneWeekAgo);
  const recentMonth = completions.filter(c => new Date(c.completed_at) >= oneMonthAgo);

  // Daily velocity
  const tasksLastDay = recentDay.filter(c => c.type === 'task').length;
  tracking.velocity.daily = {
    tasks_per_day: tasksLastDay || tracking.velocity.daily.tasks_per_day || DEFAULTS.velocity.tasks_per_day,
    phases_per_week: recentWeek.filter(c => c.type === 'phase').length / 7 * 7,
    data_points: recentDay.length,
  };

  // Weekly velocity
  const tasksLastWeek = recentWeek.filter(c => c.type === 'task').length;
  const phasesLastWeek = recentWeek.filter(c => c.type === 'phase').length;
  tracking.velocity.weekly = {
    tasks_per_week: tasksLastWeek || 0,
    phases_per_month: phasesLastWeek * 4,
    data_points: recentWeek.length,
  };

  // Monthly velocity
  const roadmapsLastMonth = recentMonth.filter(c => c.type === 'roadmap').length;
  const epicsLastMonth = recentMonth.filter(c => c.type === 'epic').length;
  tracking.velocity.monthly = {
    roadmaps_per_month: roadmapsLastMonth || 0,
    epics_per_quarter: epicsLastMonth * 3,
    data_points: recentMonth.length,
  };
}

/**
 * Update schedule status based on actual vs estimated
 * @param {Object} tracking - Tracking data
 */
function updateScheduleStatus(tracking) {
  const completions = tracking.completions || [];

  if (completions.length === 0) {
    tracking.schedule_status = {
      current_position: 'on_track',
      deviation_percent: 0,
      last_calculated: new Date().toISOString(),
    };
    return;
  }

  // Calculate average deviation
  const withBothDurations = completions.filter(c => c.estimated_duration && c.actual_duration);

  if (withBothDurations.length === 0) {
    tracking.schedule_status.last_calculated = new Date().toISOString();
    return;
  }

  let totalDeviation = 0;
  for (const c of withBothDurations) {
    // Positive = ahead, negative = behind
    const deviation = ((c.estimated_duration - c.actual_duration) / c.estimated_duration) * 100;
    totalDeviation += deviation;
  }

  const avgDeviation = totalDeviation / withBothDurations.length;

  let position = 'on_track';
  if (avgDeviation > 10) position = 'ahead';
  if (avgDeviation < -10) position = 'behind';

  tracking.schedule_status = {
    current_position: position,
    deviation_percent: Math.round(avgDeviation * 10) / 10,
    last_calculated: new Date().toISOString(),
  };
}

/**
 * Check if vision reminder should be triggered
 * @param {Object} tracking - Tracking data
 */
function checkVisionReminder(tracking) {
  if (!tracking.vision_reminders?.enabled) return;

  const threshold = tracking.vision_reminders.ahead_threshold_percent || DEFAULTS.velocity.ahead_threshold_percent;
  const deviation = tracking.schedule_status.deviation_percent;

  // Check if we're ahead by the threshold
  if (deviation >= threshold) {
    // Check if we've already reminded recently (within 7 days)
    const lastReminder = tracking.vision_reminders.last_reminder;
    const dismissedUntil = tracking.vision_reminders.dismissed_until;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Skip if dismissed
    if (dismissedUntil && new Date(dismissedUntil) > now) {
      return;
    }

    // Skip if reminded recently
    if (lastReminder && new Date(lastReminder) > sevenDaysAgo) {
      return;
    }

    // Mark reminder triggered
    tracking.vision_reminders.should_remind = true;
    tracking.vision_reminders.last_reminder = now.toISOString();
  }
}

/**
 * Dismiss vision reminder for a period
 * @param {number} days - Days to dismiss
 * @param {string} cwd - Working directory
 */
export function dismissVisionReminder(days = 7, cwd = process.cwd()) {
  const tracking = loadCompletionTracking(cwd);

  const dismissUntil = new Date();
  dismissUntil.setDate(dismissUntil.getDate() + days);

  tracking.vision_reminders.dismissed_until = dismissUntil.toISOString();
  tracking.vision_reminders.should_remind = false;

  saveCompletionTracking(tracking, cwd);
}

/**
 * Calculate estimated completion date based on velocity
 * @param {number} remainingTasks - Number of tasks remaining
 * @param {string} cwd - Working directory
 * @returns {Date|null}
 */
export function estimateCompletionDate(remainingTasks, cwd = process.cwd()) {
  const tracking = loadCompletionTracking(cwd);

  const tasksPerDay = tracking.velocity.daily.tasks_per_day || DEFAULTS.velocity.tasks_per_day;

  if (tasksPerDay <= 0) return null;

  const daysRemaining = Math.ceil(remainingTasks / tasksPerDay);
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + daysRemaining);

  return completionDate;
}

/**
 * Calculate timeline scaling factor based on actual velocity
 * @param {string} cwd - Working directory
 * @returns {number} Multiplier (< 1 = faster than expected, > 1 = slower)
 */
export function calculateTimelineScaling(cwd = process.cwd()) {
  const tracking = loadCompletionTracking(cwd);
  const deviation = tracking.schedule_status.deviation_percent;

  // Convert deviation to scaling factor
  // +20% ahead → 0.8 scaling (finish 20% faster)
  // -20% behind → 1.2 scaling (finish 20% slower)
  const scaling = 1 - (deviation / 100);

  // Clamp between 0.5 and 2.0
  return Math.max(0.5, Math.min(2.0, scaling));
}

/**
 * Get velocity summary for display
 * @param {string} cwd - Working directory
 * @returns {Object}
 */
export function getVelocitySummary(cwd = process.cwd()) {
  const tracking = loadCompletionTracking(cwd);

  return {
    daily: {
      tasks: tracking.velocity.daily.tasks_per_day,
      label: `${tracking.velocity.daily.tasks_per_day} tasks/day`,
    },
    weekly: {
      tasks: tracking.velocity.weekly.tasks_per_week,
      phases: tracking.velocity.weekly.phases_per_month / 4,
      label: `${tracking.velocity.weekly.tasks_per_week} tasks/week`,
    },
    monthly: {
      roadmaps: tracking.velocity.monthly.roadmaps_per_month,
      epics: tracking.velocity.monthly.epics_per_quarter / 3,
      label: `${tracking.velocity.monthly.roadmaps_per_month} roadmaps/month`,
    },
    schedule: {
      position: tracking.schedule_status.current_position,
      deviation: tracking.schedule_status.deviation_percent,
      label: formatScheduleStatus(tracking.schedule_status),
    },
    scaling: calculateTimelineScaling(cwd),
    shouldRemindVision: tracking.vision_reminders?.should_remind || false,
    totalCompletions: tracking.completions?.length || 0,
  };
}

/**
 * Format schedule status for display
 * @param {Object} status
 * @returns {string}
 */
function formatScheduleStatus(status) {
  const deviation = Math.abs(status.deviation_percent);
  const direction = status.deviation_percent >= 0 ? 'ahead' : 'behind';

  if (status.current_position === 'on_track') {
    return 'On track';
  }

  return `${deviation}% ${direction} of schedule`;
}

/**
 * Get recent completions for display
 * @param {number} limit - Max completions to return
 * @param {string} cwd - Working directory
 * @returns {Array}
 */
export function getRecentCompletions(limit = 10, cwd = process.cwd()) {
  const tracking = loadCompletionTracking(cwd);
  const completions = tracking.completions || [];

  // Sort by completed_at descending
  const sorted = [...completions].sort((a, b) =>
    new Date(b.completed_at) - new Date(a.completed_at)
  );

  return sorted.slice(0, limit);
}

/**
 * Clear all completion tracking data
 * @param {string} cwd - Working directory
 */
export function clearCompletionTracking(cwd = process.cwd()) {
  saveCompletionTracking(createEmptyCompletionTracking(), cwd);
}

/**
 * Enable or disable vision reminders
 * @param {boolean} enabled
 * @param {Object} options - Optional settings
 * @param {string} cwd - Working directory
 */
export function configureVisionReminders(enabled, options = {}, cwd = process.cwd()) {
  const tracking = loadCompletionTracking(cwd);

  tracking.vision_reminders = {
    ...tracking.vision_reminders,
    enabled,
    ahead_threshold_percent: options.threshold || DEFAULTS.velocity.ahead_threshold_percent,
  };

  saveCompletionTracking(tracking, cwd);
}
