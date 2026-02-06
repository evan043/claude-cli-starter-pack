/**
 * Constants for Codebase Analysis
 *
 * Language extensions, source directories, and ignore patterns
 */

/**
 * File extensions to analyze by language
 */
export const LANGUAGE_EXTENSIONS = {
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
export const SOURCE_DIRS = [
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
export const IGNORE_DIRS = [
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
