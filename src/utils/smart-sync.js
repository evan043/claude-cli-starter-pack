/**
 * Smart Sync Utility
 *
 * Intelligently syncs project .claude/ files from worktree templates while
 * preserving user customizations. Uses file hashing to detect changes.
 *
 * File Categories:
 * - UNCHANGED: File matches worktree template → Safe to update
 * - CUSTOMIZED: File differs from template → Preserve (don't overwrite)
 * - USER_CREATED: File not in templates → Preserve (user's custom file)
 * - NEW: Template not in project → Add to project
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, lstatSync } from 'fs';
import { join, basename, dirname } from 'path';
import { createHash } from 'crypto';
import { glob } from 'glob';

/**
 * Sync action types
 */
export const SyncAction = {
  UPDATE: 'update',       // Unchanged from template, safe to update
  PRESERVE: 'preserve',   // Customized or user-created, don't overwrite
  ADD: 'add',             // New template, add to project
  SKIP: 'skip'            // Explicitly skipped
};

/**
 * File categories for sync decisions
 */
export const FileCategory = {
  UNCHANGED: 'unchanged',
  CUSTOMIZED: 'customized',
  USER_CREATED: 'user_created',
  NEW: 'new',
  SYMLINKED: 'symlinked'  // File is a symlink (managed by symlink-sync)
};

/**
 * Directories to sync
 */
const SYNC_DIRS = [
  { projectDir: '.claude/commands', templateDir: 'templates/commands', glob: '**/*.md' },
  { projectDir: '.claude/hooks', templateDir: 'templates/hooks', glob: '**/*.cjs' },
  { projectDir: '.claude/agents', templateDir: 'templates/agents', glob: '**/*.md' },
  { projectDir: '.claude/skills', templateDir: 'templates/skills', glob: '**/*.md' }
];

/**
 * Hash a file's contents for comparison
 * Normalizes line endings for cross-platform consistency
 * @param {string} filePath - Path to file
 * @returns {string|null} MD5 hash or null if file doesn't exist
 */
function hashFile(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    const content = readFileSync(filePath, 'utf8');
    // Normalize line endings and trim whitespace for consistent hashing
    const normalized = content.replace(/\r\n/g, '\n').trim();
    return createHash('md5').update(normalized).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Get line count difference between two files
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
 * Map template file names to project file names
 * Templates use .template.md suffix, projects use .md
 * @param {string} templateName - Template filename
 * @returns {string} Project filename
 */
function templateToProjectName(templateName) {
  // Convert template.md to just .md
  return templateName.replace('.template.md', '.md').replace('.template.cjs', '.cjs');
}

/**
 * Map project file names to template file names
 * @param {string} projectName - Project filename
 * @returns {string} Template filename
 */
function projectToTemplateName(projectName) {
  if (projectName.endsWith('.md')) {
    return projectName.replace('.md', '.template.md');
  }
  if (projectName.endsWith('.cjs')) {
    return projectName.replace('.cjs', '.template.cjs');
  }
  return projectName;
}

/**
 * Analyze all sync actions needed for a project
 * @param {string} projectPath - Path to project root
 * @param {string} worktreePath - Path to CCASP worktree
 * @returns {Object} Analysis results with categorized files
 */
export async function analyzeSyncActions(projectPath, worktreePath) {
  const results = {
    projectPath,
    worktreePath,
    files: [],
    summary: {
      update: 0,
      preserve: 0,
      add: 0,
      skip: 0
    }
  };

  for (const dir of SYNC_DIRS) {
    const projectDir = join(projectPath, dir.projectDir);
    const templateDir = join(worktreePath, dir.templateDir);

    if (!existsSync(templateDir)) continue;

    // Get all template files
    let templateFiles;
    try {
      templateFiles = glob.sync(dir.glob, {
        cwd: templateDir,
        nodir: true
      });
    } catch {
      templateFiles = [];
    }

    // Get all project files
    let projectFiles = [];
    if (existsSync(projectDir)) {
      try {
        projectFiles = glob.sync(dir.glob.replace('.template', ''), {
          cwd: projectDir,
          nodir: true
        });
      } catch {
        projectFiles = [];
      }
    }

    // Create lookup maps
    const templateMap = new Map();
    for (const tf of templateFiles) {
      const projectName = templateToProjectName(basename(tf));
      templateMap.set(projectName, join(templateDir, tf));
    }

    const projectMap = new Map();
    for (const pf of projectFiles) {
      projectMap.set(basename(pf), join(projectDir, pf));
    }

    // Analyze each template file
    for (const [projectName, templatePath] of templateMap) {
      const projectFilePath = join(projectDir, projectName);
      const relativePath = join(dir.projectDir, projectName);

      if (!projectMap.has(projectName)) {
        // NEW: Template exists but project doesn't have it
        results.files.push({
          relativePath,
          projectPath: projectFilePath,
          templatePath,
          category: FileCategory.NEW,
          action: SyncAction.ADD,
          description: `New ${dir.projectDir.split('/').pop().slice(0, -1)}`
        });
        results.summary.add++;
      } else {
        // Check if file is a symlink (managed by symlink-sync)
        let isSymlink = false;
        try {
          isSymlink = lstatSync(projectFilePath).isSymbolicLink();
        } catch {
          // ignore
        }

        if (isSymlink) {
          // SYMLINKED: Skip — managed by symlink-sync engine
          results.files.push({
            relativePath,
            projectPath: projectFilePath,
            templatePath,
            category: FileCategory.SYMLINKED,
            action: SyncAction.SKIP,
            description: 'Managed by symlink-sync (auto-updates)'
          });
          results.summary.skip++;
        } else {
          // File exists in both - compare hashes
          const projectHash = hashFile(projectFilePath);
          const templateHash = hashFile(templatePath);

          if (projectHash === templateHash) {
            // UNCHANGED: Hashes match, safe to update
            results.files.push({
              relativePath,
              projectPath: projectFilePath,
              templatePath,
              category: FileCategory.UNCHANGED,
              action: SyncAction.UPDATE,
              description: 'Unchanged from template'
            });
            results.summary.update++;
          } else {
            // CUSTOMIZED: Hashes differ, preserve user changes
            const diff = getLineDiff(projectFilePath, templatePath);
            results.files.push({
              relativePath,
              projectPath: projectFilePath,
              templatePath,
              category: FileCategory.CUSTOMIZED,
              action: SyncAction.PRESERVE,
              linesAdded: diff.added,
              linesRemoved: diff.removed,
              description: 'User customizations detected'
            });
            results.summary.preserve++;
          }
        }
      }
    }

    // Find user-created files (not in templates)
    for (const [projectName, projectFilePath] of projectMap) {
      const templateBasenames = Array.from(templateMap.keys());

      if (!templateBasenames.includes(projectName)) {
        results.files.push({
          relativePath: join(dir.projectDir, projectName),
          projectPath: projectFilePath,
          templatePath: null,
          category: FileCategory.USER_CREATED,
          action: SyncAction.PRESERVE,
          description: 'User-created file'
        });
        results.summary.preserve++;
      }
    }
  }

  return results;
}

/**
 * Execute sync actions for a project
 * @param {string} projectPath - Path to project root
 * @param {string} worktreePath - Path to CCASP worktree
 * @param {Object} options - Execution options
 * @param {boolean} options.dryRun - Don't actually modify files
 * @param {boolean} options.preserveCustomizations - Preserve customized files (default: true)
 * @param {boolean} options.force - Force overwrite all files (ignore customizations)
 * @returns {Object} Execution results
 */
export async function executeSyncActions(projectPath, worktreePath, options = {}) {
  const {
    dryRun = false,
    preserveCustomizations = true,
    force = false
  } = options;

  const analysis = await analyzeSyncActions(projectPath, worktreePath);

  const results = {
    projectPath,
    worktreePath,
    dryRun,
    executed: [],
    skipped: [],
    errors: []
  };

  for (const file of analysis.files) {
    try {
      let shouldSync = false;
      let action = file.action;

      // Determine if we should sync this file
      if (force) {
        // Force mode: sync everything except user-created files
        shouldSync = file.category !== FileCategory.USER_CREATED;
        if (file.category === FileCategory.CUSTOMIZED) {
          action = SyncAction.UPDATE; // Override to update
        }
      } else if (preserveCustomizations) {
        // Normal mode: only sync UNCHANGED and NEW
        shouldSync = file.action === SyncAction.UPDATE || file.action === SyncAction.ADD;
      } else {
        // All templates mode: sync UNCHANGED, NEW, and CUSTOMIZED
        shouldSync = file.category !== FileCategory.USER_CREATED;
      }

      if (!shouldSync) {
        results.skipped.push({
          ...file,
          reason: file.category === FileCategory.CUSTOMIZED
            ? 'Customizations preserved'
            : 'User-created file'
        });
        continue;
      }

      // Execute the sync
      if (!dryRun && file.templatePath) {
        // Ensure directory exists
        const targetDir = dirname(file.projectPath);
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }

        // Read template and process it
        let content = readFileSync(file.templatePath, 'utf8');

        // Remove .template from any self-references in the content
        content = content.replace(/\.template\.md/g, '.md');
        content = content.replace(/\.template\.cjs/g, '.cjs');

        writeFileSync(file.projectPath, content, 'utf8');
      }

      results.executed.push({
        ...file,
        action
      });
    } catch (error) {
      results.errors.push({
        ...file,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Get sync status summary for display (used by menu)
 * @param {string} projectPath - Path to project root
 * @param {string} worktreePath - Path to CCASP worktree
 * @returns {Object} Status summary for display
 */
export async function getWorktreeSyncStatus(projectPath, worktreePath) {
  const analysis = await analyzeSyncActions(projectPath, worktreePath);

  return {
    canUpdate: analysis.summary.update + analysis.summary.add,
    willPreserve: analysis.summary.preserve,
    hasNew: analysis.summary.add > 0,
    hasCustomizations: analysis.files.some(f => f.category === FileCategory.CUSTOMIZED),
    totalFiles: analysis.files.length,
    summary: analysis.summary
  };
}

/**
 * Get sync status for all registered projects
 * @param {string} worktreePath - Path to CCASP worktree
 * @param {Array} projects - Array of project objects with path property
 * @returns {Array} Array of status objects per project
 */
export async function getAllProjectsSyncStatus(worktreePath, projects) {
  const statuses = [];

  for (const project of projects) {
    if (!existsSync(project.path)) continue;
    if (!existsSync(join(project.path, '.claude'))) continue;

    try {
      const status = await getWorktreeSyncStatus(project.path, worktreePath);
      statuses.push({
        name: project.name || basename(project.path),
        path: project.path,
        ...status
      });
    } catch {
      // Skip projects with errors
    }
  }

  return statuses;
}

/**
 * Format sync results for terminal display
 * @param {Object} results - Results from executeSyncActions
 * @returns {string} Formatted string
 */
export function formatSyncResults(results) {
  const lines = [];

  lines.push(`Project: ${basename(results.projectPath)}`);

  if (results.executed.length > 0) {
    const updated = results.executed.filter(f => f.action === SyncAction.UPDATE);
    const added = results.executed.filter(f => f.action === SyncAction.ADD);

    if (updated.length > 0) {
      lines.push(`├── Updated: ${updated.length} files (unchanged from worktree)`);
    }
    if (added.length > 0) {
      lines.push(`├── Added: ${added.length} new files`);
      for (const file of added) {
        lines.push(`│   └── ${file.relativePath}`);
      }
    }
  }

  if (results.skipped.length > 0) {
    const customized = results.skipped.filter(f => f.category === FileCategory.CUSTOMIZED);
    const userCreated = results.skipped.filter(f => f.category === FileCategory.USER_CREATED);

    if (customized.length > 0) {
      lines.push(`├── Preserved: ${customized.length} files (user customizations)`);
      for (const file of customized) {
        const diffStr = file.linesAdded || file.linesRemoved
          ? `(+${file.linesAdded}/-${file.linesRemoved} lines)`
          : '';
        lines.push(`│   └── ${file.relativePath} ${diffStr}`);
      }
    }

    if (userCreated.length > 0) {
      lines.push(`├── Kept: ${userCreated.length} user-created files`);
    }

    const symlinked = results.skipped.filter(f => f.category === FileCategory.SYMLINKED);
    if (symlinked.length > 0) {
      lines.push(`├── Symlinked: ${symlinked.length} files (auto-synced)`);
    }
  }

  if (results.errors.length > 0) {
    lines.push(`└── Errors: ${results.errors.length} files`);
    for (const file of results.errors) {
      lines.push(`    └── ${file.relativePath}: ${file.error}`);
    }
  }

  if (results.executed.length === 0 && results.skipped.length === 0) {
    lines.push(`└── No changes needed`);
  }

  return lines.join('\n');
}

/**
 * Format sync status for menu banner
 * @param {Object} status - Status from getWorktreeSyncStatus
 * @returns {Object} Banner lines and metadata
 */
export function formatSyncStatusBanner(status) {
  if (!status || status.totalFiles === 0) {
    return null;
  }

  const lines = [];

  if (status.canUpdate > 0 || status.hasNew) {
    lines.push(`${status.canUpdate} files can be updated`);

    if (status.willPreserve > 0) {
      lines.push(`${status.willPreserve} customizations will be preserved`);
    }
  }

  return {
    lines,
    hasUpdates: status.canUpdate > 0,
    hasNew: status.hasNew,
    hasCustomizations: status.hasCustomizations
  };
}

export default {
  SyncAction,
  FileCategory,
  analyzeSyncActions,
  executeSyncActions,
  getWorktreeSyncStatus,
  getAllProjectsSyncStatus,
  formatSyncResults,
  formatSyncStatusBanner
};
