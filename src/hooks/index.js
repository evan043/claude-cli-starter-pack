/**
 * CCASP Hooks Index
 *
 * Central export for all hook modules.
 */

// Delegation Configuration
export {
  loadDelegationConfig,
  saveDelegationConfig,
  classifyTask,
  getRecommendedAgent,
  shouldDelegateInAgentOnlyMode,
  createDelegationConfigFromStack,
  getDelegationModeDescription,
  DEFAULT_DELEGATION_CONFIG,
} from './delegation-config.js';

// License Tracker Hook (Phase 1 - Issue #26)
export {
  loadRegistry as loadLicenseRegistry,
  saveRegistry as saveLicenseRegistry,
  registerPackage,
  checkLicensePolicy,
  parseNpmInstallOutput,
  parsePipInstallOutput,
  generateLicenseTrackerHook,
} from './license-tracker.js';

// Security Scanner Hook (Phase 1 - Issue #27)
export {
  isToolAvailable,
  runGuardDogScan,
  runOsvScan,
  runSecurityScan,
  generateSarifReport,
  saveScanReport,
  generateSecurityScannerHook,
} from './security-scanner.js';

// Default export for convenient access
export default {
  // Delegation
  delegation: {
    load: async () => (await import('./delegation-config.js')).loadDelegationConfig,
    save: async () => (await import('./delegation-config.js')).saveDelegationConfig,
  },
  // License tracking
  license: {
    load: async () => (await import('./license-tracker.js')).loadRegistry,
    save: async () => (await import('./license-tracker.js')).saveRegistry,
    generateHook: async () => (await import('./license-tracker.js')).generateLicenseTrackerHook,
  },
  // Security scanning
  security: {
    scan: async () => (await import('./security-scanner.js')).runSecurityScan,
    generateHook: async () => (await import('./security-scanner.js')).generateSecurityScannerHook,
  },
};
