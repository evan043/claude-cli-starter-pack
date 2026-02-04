/**
 * Generated Files Section Templates
 *
 * Creates markdown sections showing source and generated files for documentation.
 * Used in issue templates, phase development plans, and roadmap documentation.
 */

import { relative } from 'path';

/**
 * Standard exploration files created by phase-dev-plan
 * @param {string} slug - Project slug (kebab-case)
 * @returns {Array<{name: string, type: string, path: string}>}
 */
function getStandardExplorationFiles(slug) {
  return [
    {
      name: 'Exploration Summary',
      type: 'MD',
      path: `.claude/exploration/${slug}/EXPLORATION_SUMMARY.md`,
    },
    {
      name: 'Code Snippets',
      type: 'MD',
      path: `.claude/exploration/${slug}/CODE_SNIPPETS.md`,
    },
    {
      name: 'Reference Files',
      type: 'MD',
      path: `.claude/exploration/${slug}/REFERENCE_FILES.md`,
    },
    {
      name: 'Agent Delegation',
      type: 'MD',
      path: `.claude/exploration/${slug}/AGENT_DELEGATION.md`,
    },
    {
      name: 'Phase Breakdown',
      type: 'MD',
      path: `.claude/exploration/${slug}/PHASE_BREAKDOWN.md`,
    },
    {
      name: 'Findings',
      type: 'JSON',
      path: `.claude/exploration/${slug}/findings.json`,
    },
  ];
}

/**
 * Standard docs files created by phase-dev-plan
 * @param {string} slug - Project slug (kebab-case)
 * @returns {Array<{name: string, type: string, path: string}>}
 */
function getStandardDocsFiles(slug) {
  return [
    {
      name: 'Progress Tracking',
      type: 'JSON',
      path: `.claude/docs/${slug}/PROGRESS.json`,
    },
    {
      name: 'Executive Summary',
      type: 'MD',
      path: `.claude/docs/${slug}/EXECUTIVE_SUMMARY.md`,
    },
  ];
}

/**
 * Generate a complete list of standard files for a plan
 *
 * @param {string} slug - Project slug (kebab-case)
 * @param {Object} options - Configuration options
 * @param {boolean} [options.includeExploration=true] - Include exploration files
 * @param {boolean} [options.includeDocs=true] - Include docs files
 * @param {Array<{name: string, type: string, path: string}>} [options.customFiles=[]] - Additional custom files
 * @returns {Array<{name: string, type: string, path: string}>}
 *
 * @example
 * const files = generateFilesList('auth-system', {
 *   includeExploration: true,
 *   includeDocs: true,
 *   customFiles: [
 *     { name: 'Test Plan', type: 'MD', path: '.claude/docs/auth-system/TEST_PLAN.md' }
 *   ]
 * });
 */
export function generateFilesList(slug, options = {}) {
  const {
    includeExploration = true,
    includeDocs = true,
    customFiles = [],
  } = options;

  const files = [];

  // Add docs files first (higher priority)
  if (includeDocs) {
    files.push(...getStandardDocsFiles(slug));
  }

  // Add exploration files
  if (includeExploration) {
    files.push(...getStandardExplorationFiles(slug));
  }

  // Add custom files
  if (customFiles.length > 0) {
    files.push(...customFiles);
  }

  return files;
}

/**
 * Format a file path for markdown display
 *
 * @param {string} path - Absolute or relative file path
 * @param {string} [projectRoot] - Project root for relative path conversion
 * @returns {string} Backtick-wrapped relative path
 *
 * @example
 * formatFilePath('/home/user/project/.claude/docs/plan.md', '/home/user/project')
 * // Returns: '`.claude/docs/plan.md`'
 *
 * @example
 * formatFilePath('.claude/docs/plan.md')
 * // Returns: '`.claude/docs/plan.md`'
 */
export function formatFilePath(path, projectRoot = process.cwd()) {
  let relativePath = path;

  // Convert absolute to relative if needed
  if (path.startsWith('/') || path.match(/^[A-Z]:\\/)) {
    relativePath = relative(projectRoot, path);
  }

  // Normalize path separators for cross-platform consistency
  relativePath = relativePath.replace(/\\/g, '/');

  return `\`${relativePath}\``;
}

/**
 * Generate a "Source & Generated Files" section with file table
 *
 * @param {Array<{name: string, type: string, path: string}>} files - List of files to display
 * @param {Object} options - Configuration options
 * @param {string} [options.source] - Source command (e.g., "/phase-dev-plan")
 * @param {string} [options.project] - Project/plan name
 * @param {string} [options.phase] - Current phase (optional)
 * @param {boolean} [options.showExplorationFiles=true] - Include exploration files
 * @param {boolean} [options.showDocsFiles=true] - Include docs files
 * @param {Array<{name: string, type: string, path: string}>} [options.customFiles=[]] - Additional custom files
 * @param {string} [options.projectRoot] - Project root for path formatting
 * @returns {string} Markdown section with file table
 *
 * @example
 * const section = generateFilesSection(files, {
 *   source: '/phase-dev-plan',
 *   project: 'auth-system',
 *   phase: 'Phase 2',
 *   showExplorationFiles: true,
 *   showDocsFiles: true
 * });
 */
export function generateFilesSection(files, options = {}) {
  const {
    source = '/phase-dev-plan',
    project = 'project',
    phase = null,
    showExplorationFiles = true,
    showDocsFiles = true,
    customFiles = [],
    projectRoot = process.cwd(),
  } = options;

  const parts = [];

  // Header separator
  parts.push('---');
  parts.push('');

  // Section title
  parts.push('## 📁 Source & Generated Files');
  parts.push('');

  // Source attribution
  let sourceText = `**Created from:** \`${source}\``;
  if (project) {
    sourceText += ` → Project: \`${project}\``;
  }
  if (phase) {
    sourceText += ` → ${phase}`;
  }
  parts.push(sourceText);
  parts.push('');

  // File table header
  parts.push('| File | Type | Path |');
  parts.push('|------|------|------|');

  // Generate file list if not provided
  let fileList = files;
  if (!files || files.length === 0) {
    fileList = generateFilesList(project, {
      includeExploration: showExplorationFiles,
      includeDocs: showDocsFiles,
      customFiles,
    });
  }

  // Add rows for each file
  for (const file of fileList) {
    const formattedPath = formatFilePath(file.path, projectRoot);
    parts.push(`| ${file.name} | ${file.type} | ${formattedPath} |`);
  }

  return parts.join('\n');
}

/**
 * Generate a compact files section (single line per file, no table)
 *
 * @param {Array<{name: string, type: string, path: string}>} files - List of files
 * @param {Object} options - Configuration options
 * @param {string} [options.title='Generated Files'] - Section title
 * @param {string} [options.projectRoot] - Project root for path formatting
 * @returns {string} Markdown section with bullet list
 *
 * @example
 * const section = generateCompactFilesSection(files, {
 *   title: 'Related Documentation',
 *   projectRoot: process.cwd()
 * });
 */
export function generateCompactFilesSection(files, options = {}) {
  const {
    title = 'Generated Files',
    projectRoot = process.cwd(),
  } = options;

  const parts = [];

  parts.push(`### ${title}`);
  parts.push('');

  for (const file of files) {
    const formattedPath = formatFilePath(file.path, projectRoot);
    parts.push(`- **${file.name}** (${file.type}): ${formattedPath}`);
  }

  return parts.join('\n');
}

/**
 * Generate a files section grouped by type (docs, exploration, custom)
 *
 * @param {string} slug - Project slug
 * @param {Object} options - Configuration options
 * @param {string} [options.source] - Source command
 * @param {Array<{name: string, type: string, path: string}>} [options.customFiles=[]] - Additional custom files
 * @param {string} [options.projectRoot] - Project root for path formatting
 * @returns {string} Markdown section with grouped file lists
 *
 * @example
 * const section = generateGroupedFilesSection('auth-system', {
 *   source: '/phase-dev-plan',
 *   customFiles: [{ name: 'Test Plan', type: 'MD', path: '.claude/docs/auth-system/TEST_PLAN.md' }]
 * });
 */
export function generateGroupedFilesSection(slug, options = {}) {
  const {
    source = '/phase-dev-plan',
    customFiles = [],
    projectRoot = process.cwd(),
  } = options;

  const parts = [];

  // Header
  parts.push('---');
  parts.push('');
  parts.push('## 📁 Generated Files');
  parts.push('');
  if (source) {
    parts.push(`**Created by:** \`${source}\` → Project: \`${slug}\``);
    parts.push('');
  }

  // Docs files
  const docsFiles = getStandardDocsFiles(slug);
  if (docsFiles.length > 0) {
    parts.push('### 📊 Documentation');
    parts.push('');
    for (const file of docsFiles) {
      const formattedPath = formatFilePath(file.path, projectRoot);
      parts.push(`- **${file.name}**: ${formattedPath}`);
    }
    parts.push('');
  }

  // Exploration files
  const explorationFiles = getStandardExplorationFiles(slug);
  if (explorationFiles.length > 0) {
    parts.push('### 🔍 Exploration Artifacts');
    parts.push('');
    for (const file of explorationFiles) {
      const formattedPath = formatFilePath(file.path, projectRoot);
      parts.push(`- **${file.name}**: ${formattedPath}`);
    }
    parts.push('');
  }

  // Custom files
  if (customFiles.length > 0) {
    parts.push('### 📋 Additional Files');
    parts.push('');
    for (const file of customFiles) {
      const formattedPath = formatFilePath(file.path, projectRoot);
      parts.push(`- **${file.name}**: ${formattedPath}`);
    }
  }

  return parts.join('\n');
}

/**
 * Create a file object for use in generateFilesSection
 *
 * @param {string} name - Display name
 * @param {string} type - File type (MD, JSON, etc.)
 * @param {string} path - File path (relative or absolute)
 * @returns {{name: string, type: string, path: string}}
 *
 * @example
 * const file = createFileObject('Test Plan', 'MD', '.claude/docs/test-plan.md');
 */
export function createFileObject(name, type, path) {
  return { name, type, path };
}

/**
 * Generate file links section for issue body or documentation
 *
 * @param {string} slug - Project slug
 * @param {Object} options - Configuration options
 * @param {string} [options.baseUrl] - Base URL for linking files (GitHub repo URL)
 * @param {string} [options.branch='main'] - Git branch for links
 * @returns {string} Markdown section with clickable file links
 *
 * @example
 * const section = generateFileLinksSection('auth-system', {
 *   baseUrl: 'https://github.com/user/repo/blob',
 *   branch: 'main'
 * });
 */
export function generateFileLinksSection(slug, options = {}) {
  const {
    baseUrl = null,
    branch = 'main',
  } = options;

  const parts = [];
  parts.push('### 📄 Related Files');
  parts.push('');

  const allFiles = [
    ...getStandardDocsFiles(slug),
    ...getStandardExplorationFiles(slug),
  ];

  for (const file of allFiles) {
    if (baseUrl) {
      const url = `${baseUrl}/${branch}/${file.path}`;
      parts.push(`- [${file.name}](${url}) (${file.type})`);
    } else {
      parts.push(`- ${file.name}: \`${file.path}\` (${file.type})`);
    }
  }

  return parts.join('\n');
}
