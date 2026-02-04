/**
 * Code Snippet Extractor
 *
 * Extracts relevant code snippets from identified files during L2 exploration.
 * Supports multiple languages and pattern-based extraction.
 */

import { existsSync, readFileSync } from 'fs';
import { extname } from 'path';

/**
 * Language detection based on file extension
 */
const EXTENSION_TO_LANGUAGE = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.cs': 'csharp',
  '.php': 'php',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.html': 'html',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.sql': 'sql',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
};

/**
 * Patterns for detecting code structures
 */
const CODE_PATTERNS = {
  javascript: {
    function: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g,
    arrowFunction: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
    class: /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{/g,
    interface: /(?:export\s+)?interface\s+(\w+)\s*\{/g,
    type: /(?:export\s+)?type\s+(\w+)\s*=/g,
    component: /(?:export\s+)?(?:const|function)\s+(\w+)\s*[=:]\s*(?:\([^)]*\)|React\.FC)/g,
  },
  python: {
    function: /(?:async\s+)?def\s+(\w+)\s*\([^)]*\)\s*(?:->\s*\w+)?\s*:/g,
    class: /class\s+(\w+)(?:\([^)]*\))?\s*:/g,
    decorator: /@(\w+)(?:\([^)]*\))?\s*$/gm,
  },
  typescript: {
    function: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g,
    arrowFunction: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g,
    class: /(?:export\s+)?class\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+\w+(?:<[^>]*>)?)?(?:\s+implements\s+\w+(?:<[^>]*>)?)?\s*\{/g,
    interface: /(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?\s*(?:extends\s+\w+)?\s*\{/g,
    type: /(?:export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=/g,
  },
};

/**
 * Extract snippets from a file
 * @param {string} filePath - Path to file
 * @param {Object} options - Extraction options
 * @returns {Array} Array of snippet objects
 */
export async function extractSnippets(filePath, options = {}) {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf8');
  const ext = extname(filePath).toLowerCase();
  const language = EXTENSION_TO_LANGUAGE[ext] || 'text';
  const lines = content.split('\n');

  const snippets = [];

  // Apply patterns based on options
  if (options.patterns) {
    const patternSnippets = extractPatternSnippets(content, options.patterns, language);
    snippets.push(...patternSnippets.map(s => ({
      ...s,
      file: filePath,
      language,
    })));
  }

  // Extract by line range if specified
  if (options.lineRange) {
    const { start, end } = options.lineRange;
    const snippet = formatSnippet(content, start, end, language);
    if (snippet) {
      snippets.push({
        file: filePath,
        language,
        ...snippet,
        description: options.description || `Lines ${start}-${end}`,
        relevance: options.relevance || 'Reference',
      });
    }
  }

  // Extract specific structures based on language
  if (options.extractStructures !== false) {
    const langPatterns = CODE_PATTERNS[language] || CODE_PATTERNS.javascript;
    const structures = extractCodeStructures(content, lines, langPatterns, filePath, language);
    snippets.push(...structures);
  }

  // Extract by keywords if specified
  if (options.keywords && options.keywords.length > 0) {
    const keywordSnippets = extractByKeywords(content, lines, options.keywords, language);
    snippets.push(...keywordSnippets.map(s => ({
      ...s,
      file: filePath,
      language,
    })));
  }

  // Limit number of snippets if specified
  if (options.maxSnippets) {
    return snippets.slice(0, options.maxSnippets);
  }

  return snippets;
}

/**
 * Extract snippets matching specific patterns
 * @param {string} content - File content
 * @param {Array} patterns - Array of regex patterns or pattern objects
 * @param {string} language - Language identifier
 * @returns {Array} Array of snippets
 */
export function extractPatternSnippets(content, patterns, language) {
  const snippets = [];
  const lines = content.split('\n');

  for (const pattern of patterns) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern.pattern, pattern.flags || 'g');
    const description = pattern.description || 'Pattern match';
    const relevance = pattern.relevance || 'Match';

    let match;
    while ((match = regex.exec(content)) !== null) {
      const matchStart = match.index;
      const lineNumber = content.substring(0, matchStart).split('\n').length;

      // Get context around match (5 lines before and after by default)
      const contextBefore = pattern.contextBefore || 2;
      const contextAfter = pattern.contextAfter || 10;

      const startLine = Math.max(1, lineNumber - contextBefore);
      const endLine = Math.min(lines.length, lineNumber + contextAfter);

      const snippet = formatSnippet(content, startLine, endLine, language);
      if (snippet) {
        snippets.push({
          ...snippet,
          description: `${description}: ${match[1] || match[0].substring(0, 50)}`,
          relevance,
          matchedText: match[0].substring(0, 100),
        });
      }
    }
  }

  return snippets;
}

/**
 * Format a snippet with line numbers
 * @param {string} content - Full file content
 * @param {number} startLine - Start line (1-indexed)
 * @param {number} endLine - End line (1-indexed)
 * @param {string} language - Language identifier
 * @returns {Object|null} Formatted snippet object
 */
export function formatSnippet(content, startLine, endLine, language) {
  const lines = content.split('\n');

  // Validate line numbers
  const actualStart = Math.max(1, startLine);
  const actualEnd = Math.min(lines.length, endLine);

  if (actualStart > actualEnd || actualStart > lines.length) {
    return null;
  }

  const snippetLines = lines.slice(actualStart - 1, actualEnd);
  const snippetContent = snippetLines.join('\n');

  // Skip very small or empty snippets
  if (snippetContent.trim().length < 10) {
    return null;
  }

  return {
    startLine: actualStart,
    endLine: actualEnd,
    content: snippetContent,
    lineCount: actualEnd - actualStart + 1,
  };
}

/**
 * Extract code structures (functions, classes, etc.)
 */
function extractCodeStructures(content, lines, patterns, filePath, language) {
  const snippets = [];

  for (const [type, regex] of Object.entries(patterns)) {
    // Reset regex state
    regex.lastIndex = 0;

    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1] || 'anonymous';
      const matchStart = match.index;
      const startLineNum = content.substring(0, matchStart).split('\n').length;

      // Find the end of the structure (simplified heuristic)
      const endLineNum = findStructureEnd(lines, startLineNum - 1, language);

      // Limit snippet size
      const maxLines = 50;
      const actualEnd = Math.min(endLineNum, startLineNum + maxLines - 1);

      const snippet = formatSnippet(content, startLineNum, actualEnd, language);
      if (snippet) {
        snippets.push({
          ...snippet,
          file: filePath,
          language,
          description: `${type}: ${name}`,
          relevance: 'Structure definition',
          structureType: type,
          structureName: name,
        });
      }
    }
  }

  return snippets;
}

/**
 * Find the end of a code structure using brace/indent counting
 */
function findStructureEnd(lines, startLineIndex, language) {
  // For Python, use indentation
  if (language === 'python') {
    const startLine = lines[startLineIndex] || '';
    const startIndent = startLine.match(/^(\s*)/)?.[1]?.length || 0;

    for (let i = startLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (trimmed === '' || trimmed.startsWith('#')) {
        continue;
      }

      const currentIndent = line.match(/^(\s*)/)?.[1]?.length || 0;

      // If we find a line with same or less indentation that's not empty
      if (currentIndent <= startIndent && trimmed !== '') {
        return i; // Return previous line as end
      }
    }

    return lines.length;
  }

  // For brace-based languages
  let braceCount = 0;
  let foundOpen = false;

  for (let i = startLineIndex; i < lines.length; i++) {
    const line = lines[i];

    for (const char of line) {
      if (char === '{') {
        braceCount++;
        foundOpen = true;
      } else if (char === '}') {
        braceCount--;
      }

      if (foundOpen && braceCount === 0) {
        return i + 1; // Return 1-indexed line number
      }
    }

    // Safety limit
    if (i - startLineIndex > 100) {
      return startLineIndex + 50;
    }
  }

  return Math.min(startLineIndex + 30, lines.length);
}

/**
 * Extract snippets containing specific keywords
 */
function extractByKeywords(content, lines, keywords, language) {
  const snippets = [];
  const foundLines = new Set();

  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    let match;

    while ((match = regex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;

      // Skip if we already have a snippet for nearby lines
      let tooClose = false;
      for (const foundLine of foundLines) {
        if (Math.abs(foundLine - lineNum) < 5) {
          tooClose = true;
          break;
        }
      }

      if (tooClose) continue;
      foundLines.add(lineNum);

      // Get context around the keyword
      const startLine = Math.max(1, lineNum - 3);
      const endLine = Math.min(lines.length, lineNum + 12);

      const snippet = formatSnippet(content, startLine, endLine, language);
      if (snippet) {
        snippets.push({
          ...snippet,
          description: `Keyword match: ${keyword}`,
          relevance: `Contains "${keyword}"`,
          matchedKeyword: keyword,
        });
      }
    }
  }

  return snippets;
}

/**
 * Extract exports/API surface from a file
 * @param {string} filePath - Path to file
 * @returns {Array} Array of exported items
 */
export function extractExports(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf8');
  const ext = extname(filePath).toLowerCase();
  const exports = [];

  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    // ES module exports
    const namedExports = content.matchAll(/export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g);
    for (const match of namedExports) {
      exports.push({ name: match[1], type: 'named' });
    }

    // Default export
    if (/export\s+default\s+/.test(content)) {
      const defaultMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)?/);
      exports.push({ name: defaultMatch?.[1] || 'default', type: 'default' });
    }

    // Re-exports
    const reExports = content.matchAll(/export\s+\{([^}]+)\}\s+from/g);
    for (const match of reExports) {
      const items = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
      items.forEach(name => exports.push({ name, type: 're-export' }));
    }
  }

  if (ext === '.py') {
    // Python exports (__all__ or top-level definitions)
    const allMatch = content.match(/__all__\s*=\s*\[([^\]]+)\]/);
    if (allMatch) {
      const items = allMatch[1].match(/['"](\w+)['"]/g) || [];
      items.forEach(item => exports.push({ name: item.replace(/['"]/g, ''), type: 'named' }));
    } else {
      // Top-level functions/classes
      const defs = content.matchAll(/^(?:def|class)\s+(\w+)/gm);
      for (const match of defs) {
        if (!match[1].startsWith('_')) {
          exports.push({ name: match[1], type: 'named' });
        }
      }
    }
  }

  return exports;
}

/**
 * Detect the primary purpose of a file from its content
 * @param {string} filePath - Path to file
 * @returns {Object} File analysis
 */
export function analyzeFileContent(filePath) {
  if (!existsSync(filePath)) {
    return { exists: false };
  }

  const content = readFileSync(filePath, 'utf8');
  const ext = extname(filePath).toLowerCase();
  const language = EXTENSION_TO_LANGUAGE[ext] || 'unknown';

  const analysis = {
    exists: true,
    path: filePath,
    language,
    lineCount: content.split('\n').length,
    charCount: content.length,
    exports: extractExports(filePath),
  };

  // Detect file type/purpose
  const purposes = [];

  if (/(?:test|spec)\.(js|ts|jsx|tsx|py)$/.test(filePath)) {
    purposes.push('test');
  }
  if (/(config|\.config\.)\.(js|ts|json)$/.test(filePath)) {
    purposes.push('config');
  }
  if (/types?\.(ts|d\.ts)$/.test(filePath) || content.includes('export interface') || content.includes('export type')) {
    purposes.push('types');
  }
  if (/router|routes/.test(filePath) || content.includes('createBrowserRouter') || content.includes('app.get(')) {
    purposes.push('routing');
  }
  if (/component/i.test(filePath) || content.includes('return (') && content.includes('React')) {
    purposes.push('component');
  }
  if (/hook/i.test(filePath) || /^use[A-Z]/.test(content)) {
    purposes.push('hook');
  }
  if (/store|state/i.test(filePath) || content.includes('createStore') || content.includes('create(')) {
    purposes.push('state');
  }
  if (/util|helper/i.test(filePath)) {
    purposes.push('utility');
  }
  if (/model|schema/i.test(filePath) || content.includes('@Entity') || content.includes('model(')) {
    purposes.push('model');
  }
  if (/service/i.test(filePath)) {
    purposes.push('service');
  }
  if (/middleware/i.test(filePath)) {
    purposes.push('middleware');
  }

  analysis.purposes = purposes.length > 0 ? purposes : ['general'];
  analysis.primaryPurpose = purposes[0] || 'general';

  return analysis;
}

export default {
  extractSnippets,
  extractPatternSnippets,
  formatSnippet,
  extractExports,
  analyzeFileContent,
  EXTENSION_TO_LANGUAGE,
  CODE_PATTERNS,
};
