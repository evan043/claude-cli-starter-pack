/**
 * Model Resolver Module (MODEL_RESOLVER)
 *
 * Central module for resolving model names based on agent level and current mode.
 * Reads configuration from config/model-modes.json and provides caching for performance.
 *
 * Usage:
 *   import { resolveModel, getModelMode, setModelMode } from './utils/model-resolver.js';
 *
 *   const model = resolveModel('L2');  // Returns 'sonnet' in default mode
 *   setModelMode('efficiency');
 *   const model2 = resolveModel('L1'); // Returns 'sonnet' in efficiency mode
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to config file (relative to package root)
const CONFIG_PATH = join(__dirname, '..', '..', 'config', 'model-modes.json');

// Cache for configuration
let configCache = null;
let configCacheTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds cache TTL

/**
 * Default configuration used when no config file exists
 */
const DEFAULT_CONFIG = {
  version: '1.0.0',
  mode: 'default',
  modes: {
    efficiency: {
      L1: 'sonnet',
      L2: 'sonnet',
      L3: 'haiku',
    },
    default: {
      L1: 'opus',
      L2: 'sonnet',
      L3: 'haiku',
    },
    performance: {
      L1: 'opus',
      L2: 'opus',
      L3: 'opus',
    },
  },
  modelMetadata: {
    opus: { fullName: 'claude-opus-4-5-20251101', tier: 'flagship' },
    sonnet: { fullName: 'claude-sonnet-4-20250514', tier: 'balanced' },
    haiku: { fullName: 'claude-haiku-3-20240307', tier: 'fast' },
  },
};

/**
 * Load configuration from file with caching
 * @param {boolean} forceReload - Force reload from disk
 * @returns {object} Configuration object
 */
export function loadConfig(forceReload = false) {
  const now = Date.now();

  // Return cached config if valid
  if (!forceReload && configCache && now - configCacheTime < CACHE_TTL_MS) {
    return configCache;
  }

  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, 'utf8');
      configCache = JSON.parse(content);
      configCacheTime = now;
      return configCache;
    }
  } catch (error) {
    console.warn(`[MODEL_RESOLVER] Error loading config: ${error.message}`);
  }

  // Return default config if file doesn't exist or has errors
  configCache = { ...DEFAULT_CONFIG };
  configCacheTime = now;
  return configCache;
}

/**
 * Save configuration to file
 * @param {object} config - Configuration to save
 * @returns {boolean} Whether save was successful
 */
export function saveConfig(config) {
  try {
    const dir = dirname(CONFIG_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    configCache = config;
    configCacheTime = Date.now();
    return true;
  } catch (error) {
    console.error(`[MODEL_RESOLVER] Error saving config: ${error.message}`);
    return false;
  }
}

/**
 * Clear the configuration cache
 */
export function clearCache() {
  configCache = null;
  configCacheTime = 0;
}

/**
 * Get the current model mode
 * @returns {string} Current mode name (e.g., 'default', 'efficiency', 'performance')
 */
export function getModelMode() {
  const config = loadConfig();
  return config.mode || 'default';
}

/**
 * Set the model mode
 * @param {string} mode - Mode name to set
 * @returns {boolean} Whether the mode was set successfully
 */
export function setModelMode(mode) {
  const config = loadConfig();

  if (!config.modes[mode]) {
    const validModes = Object.keys(config.modes).join(', ');
    console.error(`[MODEL_RESOLVER] Invalid mode: ${mode}. Valid modes: ${validModes}`);
    return false;
  }

  config.mode = mode;
  return saveConfig(config);
}

/**
 * Get all available modes
 * @returns {object} Object with mode names as keys and their configurations as values
 */
export function getAvailableModes() {
  const config = loadConfig();
  return config.modes || DEFAULT_CONFIG.modes;
}

/**
 * Resolve the model name for a given agent level
 * @param {string} level - Agent level ('L1', 'L2', 'L3')
 * @param {string} [modeOverride] - Optional mode override (uses current mode if not specified)
 * @returns {string} Model name (e.g., 'opus', 'sonnet', 'haiku')
 */
export function resolveModel(level, modeOverride = null) {
  const config = loadConfig();
  const mode = modeOverride || config.mode || 'default';

  // Validate level
  const normalizedLevel = level.toUpperCase();
  if (!['L1', 'L2', 'L3'].includes(normalizedLevel)) {
    console.warn(`[MODEL_RESOLVER] Invalid level: ${level}. Defaulting to L2.`);
    return resolveModel('L2', modeOverride);
  }

  // Get mode configuration
  const modeConfig = config.modes[mode];
  if (!modeConfig) {
    console.warn(`[MODEL_RESOLVER] Unknown mode: ${mode}. Using default.`);
    return config.modes.default[normalizedLevel] || 'sonnet';
  }

  return modeConfig[normalizedLevel] || 'sonnet';
}

/**
 * Get the full model identifier for API calls
 * @param {string} modelShortName - Short model name (e.g., 'opus', 'sonnet', 'haiku')
 * @returns {string} Full model identifier for API calls
 */
export function getFullModelName(modelShortName) {
  const config = loadConfig();
  const metadata = config.modelMetadata?.[modelShortName];
  return metadata?.fullName || modelShortName;
}

/**
 * Get model metadata
 * @param {string} modelShortName - Short model name
 * @returns {object|null} Model metadata or null if not found
 */
export function getModelMetadata(modelShortName) {
  const config = loadConfig();
  return config.modelMetadata?.[modelShortName] || null;
}

/**
 * Resolve model with full metadata
 * @param {string} level - Agent level
 * @param {string} [modeOverride] - Optional mode override
 * @returns {object} Object with model name, full name, and metadata
 */
export function resolveModelWithMetadata(level, modeOverride = null) {
  const modelName = resolveModel(level, modeOverride);
  const metadata = getModelMetadata(modelName);

  return {
    shortName: modelName,
    fullName: getFullModelName(modelName),
    level,
    mode: modeOverride || getModelMode(),
    metadata,
  };
}

/**
 * Get a summary of the current model configuration
 * @returns {object} Summary object with current mode and all level mappings
 */
export function getConfigSummary() {
  const config = loadConfig();
  const mode = config.mode || 'default';
  const modeConfig = config.modes[mode] || {};

  return {
    currentMode: mode,
    availableModes: Object.keys(config.modes),
    levelMappings: {
      L1: modeConfig.L1 || 'unknown',
      L2: modeConfig.L2 || 'unknown',
      L3: modeConfig.L3 || 'unknown',
    },
    modeDescriptions: Object.fromEntries(
      Object.entries(config.modes).map(([name, cfg]) => [name, cfg.description || ''])
    ),
  };
}

/**
 * Validate a model configuration
 * @param {object} config - Configuration to validate
 * @returns {object} Validation result with isValid and errors array
 */
export function validateConfig(config) {
  const errors = [];

  if (!config.mode) {
    errors.push('Missing "mode" field');
  }

  if (!config.modes || typeof config.modes !== 'object') {
    errors.push('Missing or invalid "modes" field');
  } else {
    for (const [modeName, modeConfig] of Object.entries(config.modes)) {
      if (!modeConfig.L1) errors.push(`Mode "${modeName}" missing L1 mapping`);
      if (!modeConfig.L2) errors.push(`Mode "${modeName}" missing L2 mapping`);
      if (!modeConfig.L3) errors.push(`Mode "${modeName}" missing L3 mapping`);
    }

    if (config.mode && !config.modes[config.mode]) {
      errors.push(`Current mode "${config.mode}" not found in modes`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Export DEFAULT_CONFIG for reference
export { DEFAULT_CONFIG };

// Default export for convenience
export default {
  resolveModel,
  resolveModelWithMetadata,
  getModelMode,
  setModelMode,
  getAvailableModes,
  getFullModelName,
  getModelMetadata,
  getConfigSummary,
  loadConfig,
  saveConfig,
  clearCache,
  validateConfig,
  DEFAULT_CONFIG,
};
