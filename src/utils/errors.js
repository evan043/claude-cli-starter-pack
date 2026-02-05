/**
 * CCASP Custom Error Classes
 * Provides structured error types for better debugging and error handling.
 */

/**
 * Base error for all CCASP errors
 */
export class CcaspError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'CcaspError';
    this.code = options.code || 'CCASP_ERROR';
    this.context = options.context || {};
  }
}

/**
 * Configuration-related errors (tech-stack.json, settings, etc.)
 */
export class CcaspConfigError extends CcaspError {
  constructor(message, options = {}) {
    super(message, { code: 'CCASP_CONFIG_ERROR', ...options });
    this.name = 'CcaspConfigError';
  }
}

/**
 * File operation errors (read, write, path resolution)
 */
export class CcaspFileError extends CcaspError {
  constructor(message, options = {}) {
    super(message, { code: 'CCASP_FILE_ERROR', ...options });
    this.name = 'CcaspFileError';
    this.filePath = options.filePath || null;
  }
}

/**
 * Template processing errors
 */
export class CcaspTemplateError extends CcaspError {
  constructor(message, options = {}) {
    super(message, { code: 'CCASP_TEMPLATE_ERROR', ...options });
    this.name = 'CcaspTemplateError';
    this.template = options.template || null;
  }
}

/**
 * Git/GitHub operation errors
 */
export class CcaspGitError extends CcaspError {
  constructor(message, options = {}) {
    super(message, { code: 'CCASP_GIT_ERROR', ...options });
    this.name = 'CcaspGitError';
  }
}

/**
 * Format an error for user-friendly display
 * @param {Error} error - The error to format
 * @returns {string} Formatted error message
 */
export function formatError(error) {
  if (error instanceof CcaspError) {
    return `[${error.code}] ${error.message}`;
  }
  return error.message || String(error);
}
