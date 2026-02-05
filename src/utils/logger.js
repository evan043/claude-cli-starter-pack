/**
 * Structured Logger
 * Centralized logging with levels, colors, and TTY detection.
 */
import chalk from 'chalk';

/**
 * Log levels in order of verbosity
 */
export const LOG_LEVELS = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

let currentLevel = LOG_LEVELS.INFO;
let isTTY = process.stdout.isTTY !== false;

/**
 * Set the current log level
 * @param {number} level - Log level from LOG_LEVELS
 */
export function setLogLevel(level) {
  currentLevel = level;
}

/**
 * Set TTY mode (affects color output)
 * @param {boolean} tty - Whether output is a TTY
 */
export function setTTY(tty) {
  isTTY = tty;
}

/**
 * Get the current log level
 * @returns {number} Current log level
 */
export function getLogLevel() {
  return currentLevel;
}

/**
 * Log an error message (always shown unless SILENT)
 */
export function logError(...args) {
  if (currentLevel >= LOG_LEVELS.ERROR) {
    const prefix = isTTY ? chalk.red('ERROR') : 'ERROR';
    console.error(`[${prefix}]`, ...args);
  }
}

/**
 * Log a warning message
 */
export function logWarn(...args) {
  if (currentLevel >= LOG_LEVELS.WARN) {
    const prefix = isTTY ? chalk.yellow('WARN') : 'WARN';
    console.warn(`[${prefix}]`, ...args);
  }
}

/**
 * Log an info message (default level)
 */
export function logInfo(...args) {
  if (currentLevel >= LOG_LEVELS.INFO) {
    if (isTTY) {
      console.log(...args);
    } else {
      console.log('[INFO]', ...args);
    }
  }
}

/**
 * Log a debug message (only with --debug or --verbose)
 */
export function logDebug(...args) {
  if (currentLevel >= LOG_LEVELS.DEBUG) {
    const prefix = isTTY ? chalk.dim('DEBUG') : 'DEBUG';
    console.log(`[${prefix}]`, ...args);
  }
}

/**
 * Create a namespaced logger
 * @param {string} namespace - Logger namespace (e.g., 'init', 'detect')
 * @returns {object} Logger with bound namespace
 */
export function createLogger(namespace) {
  return {
    error: (...args) => logError(`[${namespace}]`, ...args),
    warn: (...args) => logWarn(`[${namespace}]`, ...args),
    info: (...args) => logInfo(...args),
    debug: (...args) => logDebug(`[${namespace}]`, ...args),
  };
}

export default {
  LOG_LEVELS,
  setLogLevel,
  setTTY,
  getLogLevel,
  logError,
  logWarn,
  logInfo,
  logDebug,
  createLogger,
};
