/**
 * Utils Barrel Export
 * Aggregates all shared utility functions for simplified imports.
 *
 * Usage:
 *   import { readJSON, logInfo, safePath } from './utils/index.js';
 */

// Path utilities - Cross-platform path operations
export {
  toForwardSlashes,
  toNativePath,
  pathsEqual,
  getPathSegment,
  claudeRelativePath,
  claudeAbsolutePath,
  getHomeDir,
  homeRelativePath,
  globalClaudePath,
  isWindows,
  getWhichCommand,
  normalizeLineEndings,
  nodeCommand,
  storagePath,
} from './paths.js';

// JSON I/O - Centralized JSON file operations
export {
  readJSON,
  writeJSON,
  readJSONFromPaths,
} from './json-io.js';

// File operations - Safe file I/O with directory creation
export {
  safeWriteFile,
  safeReadJson,
  safeWriteJson,
  ensureDir,
} from './file-ops.js';

// Logger - Structured logging with levels and colors
export {
  LOG_LEVELS,
  setLogLevel,
  setTTY,
  getLogLevel,
  logError,
  logWarn,
  logInfo,
  logDebug,
  createLogger,
} from './logger.js';

// Error classes - Custom error types for CCASP
export {
  CcaspError,
  CcaspConfigError,
  CcaspFileError,
  CcaspTemplateError,
  CcaspGitError,
  formatError,
} from './errors.js';

// Template engine - Handlebars-style placeholder replacement
export {
  loadAgentContext,
  findBestAgent,
  mergeAgentContext,
  getNestedValue,
  flattenObject,
  evaluateCondition,
  processEachBlocks,
  processConditionalBlocks,
  processPathVariables,
  replacePlaceholders,
  extractPlaceholders,
  validateTechStack,
  processFile,
  processDirectory,
  generateTechStack,
} from './template-engine.js';

// Safe execution - Shell injection prevention
export {
  safeGhExec,
  safeCreateIssue,
  safeAddIssueComment,
  safeCloseIssue,
  shellEscape,
  escapeDoubleQuotes,
} from './safe-exec.js';

// Path safety - Path traversal prevention
export {
  safePath,
  safeComponent,
  safeComponents,
} from './safe-path.js';

// Model resolver - Agent level to model mapping
export {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  clearCache,
  getModelMode,
  setModelMode,
  getAvailableModes,
  resolveModel,
  getFullModelName,
  getModelMetadata,
  resolveModelWithMetadata,
  getConfigSummary,
  validateConfig,
} from './model-resolver.js';

// Version check - Update detection and notification
export {
  getCurrentVersion,
  compareVersions,
  checkLatestVersion,
  getPackageInfo,
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
  loadReleaseNotes,
  getReleaseNotes,
  getReleasesSince,
  getNewFeaturesSince,
  getAvailableFeatures,
  shouldShowUpdateNotification,
  performVersionCheck,
  formatUpdateBanner,
  formatUpdateMarkdown,
  getAutoUpdateSettings,
  updateAutoUpdateSettings,
  isAutoUpdateCheckDue,
  recordAutoUpdateCheck,
  addSkippedFile,
  removeSkippedFile,
  getSkippedFiles,
  dismissAutoUpdateNotification,
  shouldShowAutoUpdateNotification,
} from './version-check.js';

// Template validation - Hardcoded value detection
export {
  scanFile,
  scanDirectory,
  formatViolations,
  runValidation,
  FORBIDDEN_PATTERNS,
} from './validate-templates.js';

// Smart merge - Asset comparison and merge strategies
export {
  ASSET_PATHS,
  getLocalAsset,
  getTemplateAsset,
  compareAssetVersions,
  analyzeChangeSignificance,
  generateChangeSummary,
  generateDetailedDiff,
  getAssetsNeedingMerge,
  generateMergeExplanation,
  formatMergeOptions,
  getMergeAttentionCount,
  createBackup,
  listBackups,
  restoreBackup,
} from './smart-merge.js';

// Mobile table - Mobile-friendly table formatting
export {
  wrapText,
  padToWidth,
  createMobileCard,
  createMobileTable,
  createMobileMenu,
  shouldUseMobileFormatting,
} from './mobile-table.js';

// License detector - License identification and compliance
export {
  LICENSE_DATABASE,
  LICENSE_FILES,
  normalizeLicense,
  detectLicenseFromContent,
  getLicenseMetadata,
  getLicenseUrl,
  classifyLicense,
  detectLicenseFromPackage,
  checkLicenseCompatibility,
} from './license-detector.js';

// Inquirer presets - Reusable prompt configurations
export {
  kebabCasePrompt,
  descriptionPrompt,
  outputPathPrompt,
  confirmPrompt,
  promptSequence,
} from './inquirer-presets.js';

// Happy CLI detection - Mobile mode detection
export {
  isHappyConfigured,
  isHappyMode,
  getHappyConfig,
  getMobileWidth,
  shouldUseMobileUI,
  getDetectionDebugInfo,
} from './happy-detect.js';

// Global registry - Project registration tracking
export {
  getRegistryPath,
  getGlobalClaudeDir,
  loadRegistry,
  saveRegistry,
  registerProject,
  unregisterProject,
  getRegisteredProjects,
  isProjectRegistered,
  getRegistryStats,
  cleanupRegistry,
  clearRegistry,
} from './global-registry.js';

// Exploration docs - L2 agent finding documentation
export {
  createExplorationDir,
  getExplorationDir,
  explorationDocsExist,
  saveExplorationSummary,
  saveCodeSnippets,
  saveFindingsJson,
  saveReferenceFiles,
  saveAgentDelegation,
  savePhaseBreakdown,
  generatePhaseBreakdownMarkdown,
  loadExplorationDocs,
  saveAllExplorationDocs,
} from './exploration-docs.js';

// Dev mode state - Development mode tracking
export {
  getDevStatePath,
  loadDevState,
  saveDevState,
  activateDevMode,
  deactivateDevMode,
  clearPendingProjects,
  addBackedUpProject,
  isDevMode,
  hasPendingRestore,
  getDevModeInfo,
  isSymlinkInstall,
  getLinkedWorktreePath,
  syncDevModeState,
} from './dev-mode-state.js';

// Directory picker - Cross-platform folder selection
export {
  validateDirectory,
  pickDirectory,
  changeDirectory,
} from './directory-picker.js';

// Project backup - Backup/restore utilities
export {
  getBackupRoot,
  backupProject,
  getProjectBackups,
  getLatestBackup,
  restoreProject,
  deleteBackup,
  getBackupStorageInfo,
  cleanupAllProjectBackups,
} from './project-backup.js';

// Project diff - Customization detection
export {
  compareProjectToWorktree,
  compareAllProjects,
  getConnectedProjects,
  formatComparisonResult,
  getSummaryStats,
} from './project-diff.js';

// Smart sync - Intelligent file synchronization
export {
  SyncAction,
  FileCategory,
  analyzeSyncActions,
  executeSyncActions,
  getWorktreeSyncStatus,
  getAllProjectsSyncStatus,
  formatSyncResults,
  formatSyncStatusBanner,
} from './smart-sync.js';

// Transcript parser - Claude Code JSONL session analysis
export {
  getTranscriptPath,
  streamTranscript,
  getInitialMessage,
  getAllMessages,
  getConversationHistory,
  getToolUsage,
  getLastNMessages,
  getTranscriptMetadata,
} from './transcript-parser.js';

// All utilities are available via named exports above.
// Use: import { readJSON, claudeAbsolutePath } from './utils/index.js';
