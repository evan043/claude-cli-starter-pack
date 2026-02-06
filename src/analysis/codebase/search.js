/**
 * File and Content Search
 *
 * Functions for searching files by name/path and content
 */

import { glob } from 'glob';
import { spawnSync } from 'child_process';
import { LANGUAGE_EXTENSIONS, IGNORE_DIRS } from './constants.js';

/**
 * Search for files matching keywords
 */
export async function searchFiles(keywords, options = {}) {
  const { cwd = process.cwd(), maxResults = 20, extensions } = options;

  const results = [];
  const searchPatterns = keywords.map((k) => k.toLowerCase());

  // Determine which extensions to search
  let extsToSearch = [];
  if (extensions) {
    extsToSearch = extensions;
  } else {
    // Search all code extensions
    for (const exts of Object.values(LANGUAGE_EXTENSIONS)) {
      extsToSearch.push(...exts);
    }
  }

  // Build glob pattern
  const extPattern =
    extsToSearch.length === 1
      ? extsToSearch[0]
      : `{${extsToSearch.join(',')}}`;

  const ignorePattern = IGNORE_DIRS.map((d) => `**/${d}/**`);

  try {
    const files = await glob(`**/*${extPattern}`, {
      cwd,
      ignore: ignorePattern,
      nodir: true,
      absolute: false,
    });

    // Score files by keyword matches
    for (const file of files) {
      const fileLower = file.toLowerCase();
      let score = 0;

      for (const pattern of searchPatterns) {
        // File path contains keyword
        if (fileLower.includes(pattern)) {
          score += 10;
        }

        // File name starts with keyword
        const fileName = file.split(/[/\\]/).pop().toLowerCase();
        if (fileName.startsWith(pattern)) {
          score += 5;
        }
      }

      if (score > 0) {
        results.push({ file, score });
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults).map((r) => r.file);
  } catch (error) {
    return [];
  }
}

/**
 * Search file contents using grep/ripgrep
 * Uses spawnSync to prevent shell injection from search patterns
 */
export function searchContent(pattern, options = {}) {
  const { cwd = process.cwd(), maxResults = 20, contextLines = 2 } = options;

  // Try ripgrep first (faster) - use spawnSync to prevent shell injection
  let proc = spawnSync('rg', [
    '-n',
    '-C', String(contextLines),
    '--max-count', '50',
    pattern
  ], {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
  });

  let output = proc.status === 0 ? proc.stdout : null;

  // Fall back to grep if ripgrep not available or failed
  if (!output) {
    proc = spawnSync('grep', [
      '-rn',
      '-C', String(contextLines),
      pattern,
      '.'
    ], {
      cwd,
      encoding: 'utf8',
      timeout: 30000,
    });
    output = proc.status === 0 ? proc.stdout : null;
  }

  if (output) {
    const matches = parseGrepOutput(output);
    return matches.slice(0, maxResults);
  }

  return [];
}

/**
 * Parse grep/ripgrep output into structured results
 */
function parseGrepOutput(output) {
  const results = [];
  const lines = output.split('\n');

  let currentFile = null;
  let currentMatches = [];

  for (const line of lines) {
    // Match format: file:line:content or file-line-content (context)
    const match = line.match(/^([^:]+):(\d+)[:-](.*)$/);

    if (match) {
      const [, file, lineNum, content] = match;

      if (file !== currentFile) {
        if (currentFile && currentMatches.length > 0) {
          results.push({
            file: currentFile,
            matches: currentMatches,
          });
        }
        currentFile = file;
        currentMatches = [];
      }

      currentMatches.push({
        line: parseInt(lineNum, 10),
        content: content.trim(),
      });
    }
  }

  // Don't forget the last file
  if (currentFile && currentMatches.length > 0) {
    results.push({
      file: currentFile,
      matches: currentMatches,
    });
  }

  return results;
}

/**
 * Find similar patterns in codebase (for "patterns to follow")
 */
export async function findSimilarPatterns(pattern, options = {}) {
  const { cwd = process.cwd(), maxResults = 3 } = options;

  const matches = searchContent(pattern, { cwd, maxResults: maxResults * 2 });

  // Filter to most relevant matches
  return matches.slice(0, maxResults).map((match) => ({
    file: match.file,
    line: match.matches[0]?.line,
    snippet: match.matches.map((m) => m.content).join('\n'),
  }));
}
