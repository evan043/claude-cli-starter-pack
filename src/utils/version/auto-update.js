/**
 * Auto-Update System Module
 *
 * Manages automatic update checking and notification scheduling.
 */

import { loadUpdateState, saveUpdateState } from './state.js';

/**
 * Get auto-update settings
 */
export function getAutoUpdateSettings(projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  return state.autoUpdate || {
    enabled: false,
    frequency: 'weekly',
    lastAutoCheck: 0,
    notificationMode: 'banner',
    handleCustomizations: 'ask',
    skippedFiles: [],
    backupBeforeUpdate: true,
    dismissedNotifications: [],
  };
}

/**
 * Update auto-update settings
 */
export function updateAutoUpdateSettings(settings, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  state.autoUpdate = {
    ...state.autoUpdate,
    ...settings,
  };
  saveUpdateState(state, projectDir);
}

/**
 * Check if auto-update check is due based on frequency setting
 */
export function isAutoUpdateCheckDue(projectDir = process.cwd()) {
  const settings = getAutoUpdateSettings(projectDir);

  if (!settings.enabled) {
    return false;
  }

  const now = Date.now();
  const lastCheck = settings.lastAutoCheck || 0;
  const timeSinceCheck = now - lastCheck;

  const frequencies = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };

  const interval = frequencies[settings.frequency] || frequencies.weekly;
  return timeSinceCheck >= interval;
}

/**
 * Record that auto-update check was performed
 */
export function recordAutoUpdateCheck(projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  if (!state.autoUpdate) {
    state.autoUpdate = {};
  }
  state.autoUpdate.lastAutoCheck = Date.now();
  saveUpdateState(state, projectDir);
}

/**
 * Add a skipped file to the auto-update state
 */
export function addSkippedFile(assetType, assetName, reason, templateVersion, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  if (!state.autoUpdate) {
    state.autoUpdate = { skippedFiles: [] };
  }
  if (!state.autoUpdate.skippedFiles) {
    state.autoUpdate.skippedFiles = [];
  }

  const skippedEntry = {
    path: `${assetType}/${assetName}`,
    assetType,
    assetName,
    reason,
    templateVersion,
    timestamp: Date.now(),
  };

  // Remove existing entry if present
  state.autoUpdate.skippedFiles = state.autoUpdate.skippedFiles.filter(
    (f) => f.path !== skippedEntry.path
  );

  // Add new entry
  state.autoUpdate.skippedFiles.push(skippedEntry);

  saveUpdateState(state, projectDir);
}

/**
 * Remove a skipped file from the auto-update state
 */
export function removeSkippedFile(assetType, assetName, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  if (!state.autoUpdate || !state.autoUpdate.skippedFiles) {
    return;
  }
  const path = `${assetType}/${assetName}`;

  state.autoUpdate.skippedFiles = state.autoUpdate.skippedFiles.filter(
    (f) => f.path !== path
  );

  saveUpdateState(state, projectDir);
}

/**
 * Get all currently skipped files
 */
export function getSkippedFiles(projectDir = process.cwd()) {
  const settings = getAutoUpdateSettings(projectDir);
  return settings.skippedFiles || [];
}

/**
 * Dismiss a notification
 */
export function dismissAutoUpdateNotification(notificationId, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);

  if (!state.autoUpdate) {
    state.autoUpdate = {};
  }
  if (!state.autoUpdate.dismissedNotifications) {
    state.autoUpdate.dismissedNotifications = [];
  }

  state.autoUpdate.dismissedNotifications.push({
    id: notificationId,
    timestamp: Date.now(),
  });

  saveUpdateState(state, projectDir);
}

/**
 * Check if notification should be shown
 */
export function shouldShowAutoUpdateNotification(notificationId, projectDir = process.cwd()) {
  const settings = getAutoUpdateSettings(projectDir);
  const dismissed = settings.dismissedNotifications || [];

  // Check if dismissed in last 7 days
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentlyDismissed = dismissed.some(
    (d) => d.id === notificationId && d.timestamp > sevenDaysAgo
  );

  return !recentlyDismissed;
}
