/**
 * Code Structure Analysis
 *
 * Functions for finding definitions and extracting code snippets
 */

import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

/**
 * Find function/class definitions in a file
 */
export function findDefinitions(filePath, options = {}) {
  const { cwd = process.cwd() } = options;
  const fullPath = join(cwd, filePath);

  if (!existsSync(fullPath)) {
    return [];
  }

  const ext = extname(filePath).toLowerCase();
  const content = readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const definitions = [];

  // Patterns for different languages
  const patterns = {
    // JavaScript/TypeScript
    '.js': [
      /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
      /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(?/,
      /^(?:export\s+)?class\s+(\w+)/,
      /^\s*(\w+)\s*\([^)]*\)\s*\{/, // Method in object
    ],
    '.ts': [
      /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
      /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(?/,
      /^(?:export\s+)?class\s+(\w+)/,
      /^(?:export\s+)?interface\s+(\w+)/,
      /^(?:export\s+)?type\s+(\w+)/,
    ],
    '.py': [
      /^(?:async\s+)?def\s+(\w+)/,
      /^class\s+(\w+)/,
    ],
    '.go': [
      /^func\s+(?:\([^)]+\)\s+)?(\w+)/,
      /^type\s+(\w+)\s+(?:struct|interface)/,
    ],
    '.rs': [
      /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/,
      /^(?:pub\s+)?struct\s+(\w+)/,
      /^(?:pub\s+)?enum\s+(\w+)/,
      /^(?:pub\s+)?trait\s+(\w+)/,
    ],
    '.java': [
      /^(?:public|private|protected)?\s*(?:static\s+)?(?:class|interface|enum)\s+(\w+)/,
      /^(?:public|private|protected)?\s*(?:static\s+)?[\w<>,\s]+\s+(\w+)\s*\(/,
    ],
  };

  // Use JavaScript patterns for JSX/TSX
  const extPatterns =
    patterns[ext] ||
    patterns['.js'.includes(ext) ? '.js' : '.ts'.includes(ext) ? '.ts' : '.js'];

  if (!extPatterns) {
    return definitions;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of extPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        definitions.push({
          name: match[1],
          line: i + 1,
          type: guessDefinitionType(line),
          snippet: line.trim(),
        });
        break;
      }
    }
  }

  return definitions;
}

/**
 * Guess the type of definition from the line
 */
function guessDefinitionType(line) {
  const lower = line.toLowerCase();

  if (lower.includes('class ')) return 'class';
  if (lower.includes('interface ')) return 'interface';
  if (lower.includes('type ')) return 'type';
  if (lower.includes('struct ')) return 'struct';
  if (lower.includes('enum ')) return 'enum';
  if (lower.includes('trait ')) return 'trait';
  if (lower.includes('function ') || lower.includes('def ') || lower.includes('fn '))
    return 'function';
  if (lower.includes('const ')) return 'constant';

  return 'unknown';
}

/**
 * Extract a code snippet from a file
 */
export function extractSnippet(filePath, startLine, endLine, options = {}) {
  const { cwd = process.cwd(), maxLines = 30 } = options;
  const fullPath = join(cwd, filePath);

  if (!existsSync(fullPath)) {
    return null;
  }

  const content = readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // Clamp line numbers
  const start = Math.max(0, startLine - 1);
  const end = Math.min(lines.length, endLine || start + maxLines);

  const snippet = lines.slice(start, end).join('\n');

  return {
    file: filePath,
    startLine: start + 1,
    endLine: end,
    content: snippet,
  };
}
