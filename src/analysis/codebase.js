/**
 * Codebase Analysis Module
 *
 * Finds relevant files, functions, and patterns for issue documentation
 *
 * This file serves as a wrapper for the codebase analysis submodules.
 */

export { searchFiles, searchContent, findSimilarPatterns } from './codebase/search.js';
export { findDefinitions, extractSnippet } from './codebase/definitions.js';
export { analyzeForIssue, detectProjectType } from './codebase/project.js';
