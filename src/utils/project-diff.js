/**
 * Project Diff Utility
 *
 * Compares a project's .claude/ files against CCASP worktree templates
 * to detect customizations that should potentially be merged back.
 *
 * Categories:
 * - Commands (.claude/commands/*.md)
 * - Hooks (.claude/hooks/*.cjs)
 * - Agents (.claude/agents/*.md)
 * - Skills (.claude/skills/ nested *.md files)
 * - Settings (.claude/settings.json)
 * - CLAUDE.md
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, relative } from 'path';
import { createHash } from 'crypto';
import { glob } from 'glob';
import { loadRegistry } from './global-registry.js';
import { loadDevState } from './dev-mode-state.js';

/**
 * Categories to compare
 */
const CATEGORIES = [
  {
    name: 'Commands',
    projectGlob: '.claude/commands/*.md',
    templateDir: 'templates/commands',
    fileExtension: '.md'
  },
  {
    name: 'Hooks',
    projectGlob: '.claude/hooks/*.cjs',
    templateDir: 'templates/hooks',
    fileExtension: '.cjs'
  },
  {
    name: 'Agents',
    projectGlob: '.claude/agents/*.md',
    templateDir: 'templates/agents',
    fileExtension: '.md'
  },
  {
    name: 'Skills',
    projectGlob: '.claude/skills/**/*.md',
    templateDir: 'templates/skills',
    fileExtension: '.md'
  }
];

/**
 * Hash file contents for comparison
 * @param {string} filePath - Path to file
 * @returns {string|null} MD5 hash or null if file doesn't exist
 */
function hashFile(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    const content = readFileSync(filePath, 'utf8');
    // Normalize line endings for comparison
    const normalized = content.replace(/\r\n/g, '\n').trim();
    return createHash('md5').update(normalized).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Get line count diff between two files
 * @param {string} file1 - First file path
 * @param {string} file2 - Second file path
 * @returns {Object} { added: number, removed: number }
 */
function getLineDiff(file1, file2) {
  const lines1 = existsSync(file1)
    ? readFileSync(file1, 'utf8').split('\n').length
    : 0;
  const lines2 = existsSync(file2)
    ? readFileSync(file2, 'utf8').split('\n').length
    : 0;

  return {
    added: Math.max(0, lines1 - lines2),
    removed: Math.max(0, lines2 - lines1)
  };
}

/**
 * Get all template file basenames from CCASP
 * @param {string} worktreePath - Path to CCASP worktree
 * @returns {Set<string>} Set of template basenames
 */
function getTemplateFiles(worktreePath) {
  const templates = new Set();

  for (const cat of CATEGORIES) {
    const templatePath = join(worktreePath, cat.templateDir);
    if (!existsSync(templatePath)) continue;

    try {
      const files = glob.sync(`**/*${cat.fileExtension}`, {
        cwd: templatePath,
        nodir: true
      });
      files.forEach(f => templates.add(basename(f)));
    } catch {
      // Ignore errors
    }
  }

  return templates;
}

/**
 * Compare a project's .claude/ files against CCASP worktree
 * @param {string} projectPath - Path to project
 * @param {string} worktreePath - Path to CCASP worktree
 * @returns {Object} Comparison results
 */
export async function compareProjectToWorktree(projectPath, worktreePath) {
  const results = {
    projectName: basename(projectPath),
    projectPath,
    worktreePath,
    customFiles: [],     // Files not in CCASP templates
    modifiedFiles: [],   // Files that differ from CCASP templates
    unchangedFiles: [],  // Files identical to templates
    totalFiles: 0
  };

  // Check CLAUDE.md separately
  const projectClaudeMd = join(projectPath, 'CLAUDE.md');
  const worktreeClaudeMd = join(worktreePath, 'CLAUDE.md');

  if (existsSync(projectClaudeMd)) {
    results.totalFiles++;
    const projectHash = hashFile(projectClaudeMd);
    const worktreeHash = hashFile(worktreeClaudeMd);

    if (projectHash !== worktreeHash) {
      const diff = getLineDiff(projectClaudeMd, worktreeClaudeMd);
      results.modifiedFiles.push({
        relativePath: 'CLAUDE.md',
        fullPath: projectClaudeMd,
        category: 'Root',
        linesAdded: diff.added,
        linesRemoved: diff.removed,
        description: 'Project documentation'
      });
    }
  }

  // Check settings.json separately
  const projectSettings = join(projectPath, '.claude', 'settings.json');
  const worktreeSettings = join(worktreePath, '.claude', 'settings.json');

  if (existsSync(projectSettings)) {
    results.totalFiles++;
    const projectHash = hashFile(projectSettings);
    const worktreeHash = hashFile(worktreeSettings);

    if (!existsSync(worktreeSettings)) {
      results.customFiles.push({
        relativePath: '.claude/settings.json',
        fullPath: projectSettings,
        category: 'Settings',
        description: 'Project settings'
      });
    } else if (projectHash !== worktreeHash) {
      results.modifiedFiles.push({
        relativePath: '.claude/settings.json',
        fullPath: projectSettings,
        category: 'Settings',
        linesAdded: 0,
        linesRemoved: 0,
        description: 'Setting overrides'
      });
    }
  }

  // Check each category
  for (const cat of CATEGORIES) {
    const projectClaudeDir = join(projectPath, '.claude');
    if (!existsSync(projectClaudeDir)) continue;

    // Get project files in this category
    const pattern = cat.projectGlob.replace('.claude/', '');
    let projectFiles;
    try {
      projectFiles = glob.sync(pattern, {
        cwd: projectClaudeDir,
        nodir: true
      });
    } catch {
      projectFiles = [];
    }

    // Get template files in this category
    const templatePath = join(worktreePath, cat.templateDir);
    let templateFiles = [];
    if (existsSync(templatePath)) {
      try {
        templateFiles = glob.sync(`**/*${cat.fileExtension}`, {
          cwd: templatePath,
          nodir: true
        });
      } catch {
        // Ignore errors
      }
    }

    const templateBasenames = new Set(templateFiles.map(f => basename(f)));

    // Compare each project file
    for (const projFile of projectFiles) {
      results.totalFiles++;
      const projBasename = basename(projFile);
      const projFullPath = join(projectClaudeDir, projFile);
      const relativePath = `.claude/${projFile}`;

      // Check if template has this file
      const templateMatch = templateFiles.find(tf => basename(tf) === projBasename);

      if (!templateMatch) {
        // Custom file - not in CCASP
        results.customFiles.push({
          relativePath,
          fullPath: projFullPath,
          category: cat.name,
          description: `Custom ${cat.name.toLowerCase().slice(0, -1)}`
        });
      } else {
        // File exists in both - compare
        const templateFullPath = join(templatePath, templateMatch);
        const projHash = hashFile(projFullPath);
        const templateHash = hashFile(templateFullPath);

        if (projHash !== templateHash) {
          const diff = getLineDiff(projFullPath, templateFullPath);
          results.modifiedFiles.push({
            relativePath,
            fullPath: projFullPath,
            templatePath: templateFullPath,
            category: cat.name,
            linesAdded: diff.added,
            linesRemoved: diff.removed,
            description: `Modified ${cat.name.toLowerCase().slice(0, -1)}`
          });
        } else {
          results.unchangedFiles.push({
            relativePath,
            fullPath: projFullPath,
            category: cat.name
          });
        }
      }
    }
  }

  return results;
}

/**
 * Compare all registered projects against worktree
 * @param {string} worktreePath - Path to CCASP worktree
 * @returns {Array} Array of comparison results per project
 */
export async function compareAllProjects(worktreePath) {
  const registry = loadRegistry();
  const results = [];

  for (const project of registry.projects) {
    if (!existsSync(project.path)) continue;
    if (!existsSync(join(project.path, '.claude'))) continue;

    const comparison = await compareProjectToWorktree(project.path, worktreePath);
    results.push(comparison);
  }

  return results;
}

/**
 * Get connected projects from dev state
 * @returns {Array} Array of project info objects
 */
export function getConnectedProjects() {
  const devState = loadDevState();
  return devState.projects || [];
}

/**
 * Format comparison results for display
 * @param {Object} comparison - Single project comparison result
 * @returns {string} Formatted string for terminal display
 */
export function formatComparisonResult(comparison) {
  const lines = [];

  lines.push(`Project: ${comparison.projectName}`);
  lines.push('');

  if (comparison.customFiles.length > 0) {
    lines.push('──────────────────────────────────────');
    lines.push('Custom Files (not in CCASP):');
    lines.push('──────────────────────────────────────');
    lines.push('');

    comparison.customFiles.forEach((file, idx) => {
      lines.push(`[${idx + 1}] ${file.relativePath}`);
      lines.push(`    → ${file.description}`);
      lines.push('');
    });
  }

  if (comparison.modifiedFiles.length > 0) {
    const startIdx = comparison.customFiles.length + 1;
    lines.push('──────────────────────────────────────');
    lines.push('Modified Files (differ from CCASP):');
    lines.push('──────────────────────────────────────');
    lines.push('');

    comparison.modifiedFiles.forEach((file, idx) => {
      const diffStr = file.linesAdded || file.linesRemoved
        ? `+${file.linesAdded} lines, -${file.linesRemoved} lines`
        : 'content differs';
      lines.push(`[${startIdx + idx}] ${file.relativePath}`);
      lines.push(`    ${diffStr}`);
      lines.push(`    → ${file.description}`);
      lines.push('');
    });
  }

  if (comparison.customFiles.length === 0 && comparison.modifiedFiles.length === 0) {
    lines.push('No customizations detected - all files match CCASP templates.');
  }

  return lines.join('\n');
}

/**
 * Get summary stats across all projects
 * @param {Array} comparisons - Array of comparison results
 * @returns {Object} Summary statistics
 */
export function getSummaryStats(comparisons) {
  return {
    projectCount: comparisons.length,
    totalCustomFiles: comparisons.reduce((sum, c) => sum + c.customFiles.length, 0),
    totalModifiedFiles: comparisons.reduce((sum, c) => sum + c.modifiedFiles.length, 0),
    totalFiles: comparisons.reduce((sum, c) => sum + c.totalFiles, 0),
    projectsWithCustomizations: comparisons.filter(
      c => c.customFiles.length > 0 || c.modifiedFiles.length > 0
    ).length
  };
}
