/**
 * Smart Merge Utility
 *
 * Provides asset comparison, diff generation, and merge exploration
 * for the CCASP update system. When users have customized assets
 * (commands, skills, agents, hooks), this module helps them understand
 * what changes an update would bring and offers intelligent merge options.
 *
 * This module is a thin re-export wrapper around focused submodules.
 */

// Asset loading and path resolution
export {
  ASSET_PATHS,
  getLocalAsset,
  getTemplateAsset,
} from './smart-merge/asset-loader.js';

// Comparison and diff generation
export {
  compareAssetVersions,
  analyzeChangeSignificance,
  generateChangeSummary,
  generateDetailedDiff,
} from './smart-merge/comparator.js';

// Merge strategies and execution
export {
  getAssetsNeedingMerge,
  generateMergeExplanation,
  formatMergeOptions,
  getMergeAttentionCount,
} from './smart-merge/merge-engine.js';

// Backup management
export {
  createBackup,
  listBackups,
  restoreBackup,
} from './smart-merge/backup.js';

// Default export for backwards compatibility
export default {
  getLocalAsset: (await import('./smart-merge/asset-loader.js')).getLocalAsset,
  getTemplateAsset: (await import('./smart-merge/asset-loader.js')).getTemplateAsset,
  compareAssetVersions: (await import('./smart-merge/comparator.js')).compareAssetVersions,
  generateDetailedDiff: (await import('./smart-merge/comparator.js')).generateDetailedDiff,
  getAssetsNeedingMerge: (await import('./smart-merge/merge-engine.js')).getAssetsNeedingMerge,
  generateMergeExplanation: (await import('./smart-merge/merge-engine.js')).generateMergeExplanation,
  formatMergeOptions: (await import('./smart-merge/merge-engine.js')).formatMergeOptions,
  getMergeAttentionCount: (await import('./smart-merge/merge-engine.js')).getMergeAttentionCount,
  createBackup: (await import('./smart-merge/backup.js')).createBackup,
  listBackups: (await import('./smart-merge/backup.js')).listBackups,
  restoreBackup: (await import('./smart-merge/backup.js')).restoreBackup,
};
