/**
 * Document loading and reading utilities for exploration docs
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getExplorationDir } from './directory.js';

/**
 * Load all exploration docs for execution phase
 * @param {string} slug - Project slug
 * @param {string} cwd - Current working directory
 * @returns {Object|null} Loaded exploration data or null if not found
 */
export function loadExplorationDocs(slug, cwd = process.cwd()) {
  const dir = getExplorationDir(slug, cwd);

  if (!existsSync(dir)) {
    return null;
  }

  const result = {
    slug,
    path: dir,
    exists: true,
  };

  // Load findings.json (machine-readable)
  const findingsPath = join(dir, 'findings.json');
  if (existsSync(findingsPath)) {
    try {
      result.findings = JSON.parse(readFileSync(findingsPath, 'utf8'));
    } catch {
      result.findings = null;
    }
  }

  // Load markdown files (for reference/display)
  const mdFiles = [
    'EXPLORATION_SUMMARY.md',
    'CODE_SNIPPETS.md',
    'REFERENCE_FILES.md',
    'AGENT_DELEGATION.md',
    'PHASE_BREAKDOWN.md',
  ];

  result.markdownFiles = {};
  for (const file of mdFiles) {
    const filePath = join(dir, file);
    if (existsSync(filePath)) {
      try {
        result.markdownFiles[file] = readFileSync(filePath, 'utf8');
      } catch {
        result.markdownFiles[file] = null;
      }
    }
  }

  return result;
}
