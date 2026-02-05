/**
 * Version Check Utility
 *
 * Handles npm version checking, comparison, caching, and update state tracking.
 * Designed for background execution with non-blocking checks.
 *
 * This is a thin re-export wrapper. Implementation is split into focused submodules:
 * - checker.js: Version comparison, detection, npm registry queries
 * - state.js: Update state and usage tracking persistence
 * - releases.js: Release notes and features tracking
 * - notifications.js: Update notification logic and formatting
 * - auto-update.js: Auto-update system and scheduling
 */

// Import all functions first
import {
  getCurrentVersion,
  compareVersions,
  checkLatestVersion,
  getPackageInfo,
} from './version/checker.js';

import {
  loadUpdateState,
  saveUpdateState,
  dismissUpdateNotification,
  markFeatureInstalled,
  markFeatureSkipped,
  loadUsageTracking,
  saveUsageTracking,
  trackAssetUsage,
  markAssetCustomized,
  getUsedAssets,
  getCustomizedUsedAssets,
  isAssetCustomized,
  getUsageStats,
} from './version/state.js';

import {
  loadReleaseNotes,
  getReleaseNotes,
  getReleasesSince,
  getNewFeaturesSince,
  getAvailableFeatures,
} from './version/releases.js';

import {
  shouldShowUpdateNotification,
  performVersionCheck,
  formatUpdateBanner,
  formatUpdateMarkdown,
} from './version/notifications.js';

import {
  getAutoUpdateSettings,
  updateAutoUpdateSettings,
  isAutoUpdateCheckDue,
  recordAutoUpdateCheck,
  addSkippedFile,
  removeSkippedFile,
  getSkippedFiles,
  dismissAutoUpdateNotification,
  shouldShowAutoUpdateNotification,
} from './version/auto-update.js';

// Re-export all functions
export {
  // Checker
  getCurrentVersion,
  compareVersions,
  checkLatestVersion,
  getPackageInfo,
  // State
  loadUpdateState,
  saveUpdateState,
  dismissUpdateNotification,
  markFeatureInstalled,
  markFeatureSkipped,
  loadUsageTracking,
  saveUsageTracking,
  trackAssetUsage,
  markAssetCustomized,
  getUsedAssets,
  getCustomizedUsedAssets,
  isAssetCustomized,
  getUsageStats,
  // Releases
  loadReleaseNotes,
  getReleaseNotes,
  getReleasesSince,
  getNewFeaturesSince,
  getAvailableFeatures,
  // Notifications
  shouldShowUpdateNotification,
  performVersionCheck,
  formatUpdateBanner,
  formatUpdateMarkdown,
  // Auto-update
  getAutoUpdateSettings,
  updateAutoUpdateSettings,
  isAutoUpdateCheckDue,
  recordAutoUpdateCheck,
  addSkippedFile,
  removeSkippedFile,
  getSkippedFiles,
  dismissAutoUpdateNotification,
  shouldShowAutoUpdateNotification,
};

// Default export with all functions
export default {
  // Checker
  getCurrentVersion,
  compareVersions,
  checkLatestVersion,
  getPackageInfo,
  // State
  loadUpdateState,
  saveUpdateState,
  dismissUpdateNotification,
  markFeatureInstalled,
  markFeatureSkipped,
  loadUsageTracking,
  saveUsageTracking,
  trackAssetUsage,
  markAssetCustomized,
  getUsedAssets,
  getCustomizedUsedAssets,
  isAssetCustomized,
  getUsageStats,
  // Releases
  loadReleaseNotes,
  getReleaseNotes,
  getReleasesSince,
  getNewFeaturesSince,
  getAvailableFeatures,
  // Notifications
  shouldShowUpdateNotification,
  performVersionCheck,
  formatUpdateBanner,
  formatUpdateMarkdown,
  // Auto-update
  getAutoUpdateSettings,
  updateAutoUpdateSettings,
  isAutoUpdateCheckDue,
  recordAutoUpdateCheck,
  addSkippedFile,
  removeSkippedFile,
  getSkippedFiles,
  dismissAutoUpdateNotification,
  shouldShowAutoUpdateNotification,
};
