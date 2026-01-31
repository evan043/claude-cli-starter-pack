/**
 * Codebase Analysis Module
 *
 * Finds relevant files, functions, and patterns for issue documentation
 */

import { execCommand } from '../utils.js';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { glob } from 'glob';

/**
 * File extensions to analyze by language
 */
const LANGUAGE_EXTENSIONS = {
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  python: ['.py', '.pyw'],
  rust: ['.rs'],
  go: ['.go'],
  java: ['.java'],
  csharp: ['.cs'],
  cpp: ['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp'],
  ruby: ['.rb'],
  php: ['.php'],
  swift: ['.swift'],
  kotlin: ['.kt', '.kts'],
};

/**
 * Common source directories to search
 */
const SOURCE_DIRS = [
  'src',
  'lib',
  'app',
  'apps',
  'packages',
  'components',
  'views',
  'pages',
  'services',
  'utils',
  'helpers',
  'hooks',
  'store',
  'stores',
  'api',
  'routes',
  'routers',
  'controllers',
  'models',
  'schemas',
  'types',
];

/**
 * Directories to ignore
 */
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  'coverage',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'target',
  'vendor',
];

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
 */
export function searchContent(pattern, options = {}) {
  const { cwd = process.cwd(), maxResults = 20, contextLines = 2 } = options;

  // Try ripgrep first (faster)
  let cmd = `rg -n -C ${contextLines} --max-count 50 "${pattern}"`;
  let result = execCommand(cmd, { cwd });

  // Fall back to grep
  if (!result.success) {
    cmd = `grep -rn -C ${contextLines} "${pattern}" .`;
    result = execCommand(cmd, { cwd });
  }

  if (result.success && result.output) {
    const matches = parseGrepOutput(result.output);
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

/**
 * Analyze codebase for issue context
 */
export async function analyzeForIssue(keywords, options = {}) {
  const { cwd = process.cwd(), maxFiles = 5, maxFunctions = 10 } = options;

  const analysis = {
    relevantFiles: [],
    keyFunctions: [],
    patterns: [],
    codeSnippets: [],
  };

  // 1. Search for relevant files
  const files = await searchFiles(keywords, { cwd, maxResults: maxFiles * 2 });

  // 2. For each file, find relevant definitions
  for (const file of files.slice(0, maxFiles)) {
    const definitions = findDefinitions(file, { cwd });

    analysis.relevantFiles.push({
      file,
      definitions: definitions.slice(0, 5),
    });

    // Add key functions
    for (const def of definitions) {
      if (
        def.type === 'function' ||
        def.type === 'class' ||
        def.type === 'component'
      ) {
        // Check if function name matches any keyword
        const defLower = def.name.toLowerCase();
        const isRelevant = keywords.some(
          (k) => defLower.includes(k.toLowerCase()) || k.toLowerCase().includes(defLower)
        );

        if (isRelevant) {
          analysis.keyFunctions.push({
            file,
            ...def,
          });
        }
      }
    }
  }

  // 3. Search content for specific patterns
  for (const keyword of keywords) {
    const contentMatches = searchContent(keyword, {
      cwd,
      maxResults: 5,
      contextLines: 1,
    });

    for (const match of contentMatches) {
      analysis.patterns.push({
        keyword,
        file: match.file,
        matches: match.matches.slice(0, 3),
      });
    }
  }

  // 4. Extract code snippets for key functions
  for (const func of analysis.keyFunctions.slice(0, 3)) {
    const snippet = extractSnippet(func.file, func.line, func.line + 15, { cwd });
    if (snippet) {
      analysis.codeSnippets.push(snippet);
    }
  }

  return analysis;
}

/**
 * Detect project type and tech stack
 */
export function detectProjectType(cwd = process.cwd()) {
  const stack = {
    languages: [],
    frameworks: [],
    tools: [],
  };

  // Check package.json for JS/TS projects
  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      stack.languages.push('javascript');

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.typescript) stack.languages.push('typescript');
      if (deps.react) stack.frameworks.push('react');
      if (deps.vue) stack.frameworks.push('vue');
      if (deps.angular) stack.frameworks.push('angular');
      if (deps.next) stack.frameworks.push('nextjs');
      if (deps.express) stack.frameworks.push('express');
      if (deps.fastify) stack.frameworks.push('fastify');
      if (deps.jest || deps.vitest) stack.tools.push('testing');
      if (deps.playwright) stack.tools.push('e2e-testing');
    } catch { /* ignore parse errors */ }
  }

  // Check for Python
  if (existsSync(join(cwd, 'requirements.txt')) || existsSync(join(cwd, 'pyproject.toml'))) {
    stack.languages.push('python');
  }

  // Check for Rust
  if (existsSync(join(cwd, 'Cargo.toml'))) {
    stack.languages.push('rust');
  }

  // Check for Go
  if (existsSync(join(cwd, 'go.mod'))) {
    stack.languages.push('go');
  }

  return stack;
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
