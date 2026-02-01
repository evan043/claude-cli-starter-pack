/**
 * PM Hierarchy Module
 *
 * 5-Layer Project Management Hierarchy:
 *   Vision (AI-managed, optional) → Epic (User-managed) → Roadmap → Phase → Task
 *
 * Features:
 * - Schema definitions for all layers
 * - Integration adapters (GitHub, Jira, Linear, ClickUp)
 * - Completion tracking with velocity metrics
 * - Timeline scaling based on actual development time
 * - Vision generation with ahead-of-schedule reminders
 */

// Schema exports
export * from './schema.js';

// Integration exports
export * from './integrations/index.js';

// Completion tracking exports
export * from './completion-tracking.js';

// Re-export commonly used functions
import {
  createEmptyEpic,
  createEmptyVision,
  createEmptyIntegrationConfig,
  createEmptyCompletionTracking,
  validateEpic,
  validateVision,
  validateIntegrationConfig,
  DEFAULTS,
} from './schema.js';

import {
  createAdapterRegistry,
  getAdapter,
  SUPPORTED_INTEGRATIONS,
  getIntegrationInfo,
} from './integrations/index.js';

import {
  loadCompletionTracking,
  saveCompletionTracking,
  recordCompletion,
  getVelocitySummary,
  estimateCompletionDate,
  calculateTimelineScaling,
  getRecentCompletions,
  configureVisionReminders,
  dismissVisionReminder,
} from './completion-tracking.js';

/**
 * Initialize PM hierarchy for a project
 * Creates necessary directories and default config files
 * @param {string} cwd - Working directory
 * @param {Object} options - Initialization options
 */
export async function initializePMHierarchy(cwd = process.cwd(), options = {}) {
  const { existsSync, mkdirSync, writeFileSync } = await import('fs');
  const { join } = await import('path');

  const dirs = [
    '.claude/epics',
    '.claude/roadmaps',
    '.claude/phase-plans',
    '.claude/integrations',
  ];

  // Create directories
  for (const dir of dirs) {
    const fullPath = join(cwd, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }

  // Create integration config if not exists
  const integrationConfigPath = join(cwd, '.claude/integrations/config.json');
  if (!existsSync(integrationConfigPath)) {
    const config = createEmptyIntegrationConfig(options.integrations || {});
    writeFileSync(integrationConfigPath, JSON.stringify(config, null, 2), 'utf8');
  }

  // Create completion tracking if not exists
  const trackingPath = join(cwd, '.claude/completion-tracking.json');
  if (!existsSync(trackingPath)) {
    const tracking = createEmptyCompletionTracking();
    writeFileSync(trackingPath, JSON.stringify(tracking, null, 2), 'utf8');
  }

  return {
    success: true,
    created: dirs,
  };
}

/**
 * Load integration config from project
 * @param {string} cwd - Working directory
 * @returns {Object|null}
 */
export function loadIntegrationConfig(cwd = process.cwd()) {
  const { existsSync, readFileSync } = require('fs');
  const { join } = require('path');

  const configPath = join(cwd, '.claude/integrations/config.json');

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save integration config to project
 * @param {Object} config - Integration config
 * @param {string} cwd - Working directory
 */
export function saveIntegrationConfig(config, cwd = process.cwd()) {
  const { existsSync, mkdirSync, writeFileSync } = require('fs');
  const { join, dirname } = require('path');

  const configPath = join(cwd, '.claude/integrations/config.json');
  const dir = dirname(configPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  config.last_modified = new Date().toISOString();
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Get all configured and enabled adapters for the project
 * @param {string} cwd - Working directory
 * @returns {AdapterRegistry}
 */
export function getProjectAdapters(cwd = process.cwd()) {
  const config = loadIntegrationConfig(cwd) || createEmptyIntegrationConfig();
  return createAdapterRegistry(config);
}

/**
 * Module version
 */
export const PM_HIERARCHY_VERSION = '1.0.0';

/**
 * Summary of the 5-layer hierarchy
 */
export const HIERARCHY_SUMMARY = {
  layers: [
    {
      name: 'Vision',
      level: 0,
      scope: 'Years (1-3)',
      managedBy: 'AI (optional, user-triggered)',
      storageDir: '.claude/vision/',
      description: 'Strategic direction with OKRs, auto-generated on manual trigger',
    },
    {
      name: 'Epic',
      level: 1,
      scope: 'Quarterly/Feature (1-4 months)',
      managedBy: 'User with AI assistance',
      storageDir: '.claude/epics/',
      description: 'Strategic initiatives that bundle multiple roadmaps',
    },
    {
      name: 'Roadmap',
      level: 2,
      scope: 'Weeks/Months (2-8 weeks)',
      managedBy: 'User/AI',
      storageDir: '.claude/roadmaps/',
      description: 'Timeline and sequencing of phases',
    },
    {
      name: 'Phase',
      level: 3,
      scope: 'Days/Weeks (3-10 days)',
      managedBy: 'AI executor',
      storageDir: '.claude/phase-plans/',
      description: 'Collection of related tasks with PROGRESS.json',
    },
    {
      name: 'Task',
      level: 4,
      scope: 'Hours (1-8 hours)',
      managedBy: 'AI executor',
      storageDir: 'Inline in phase PROGRESS.json',
      description: 'Individual work units with file/function refs',
    },
  ],
  integrations: SUPPORTED_INTEGRATIONS,
  defaults: DEFAULTS,
};
