/**
 * Symlink Sync Engine
 *
 * Replaces smart-sync's file copying with compiled cache + OS symlinks.
 * Templates are compiled per-project (with tech-stack.json values) into
 * ~/.ccasp/compiled/{project-slug}/, then symlinks are created from
 * .claude/commands/, .claude/hooks/, etc. pointing to the compiled cache.
 *
 * Benefits over file copying:
 * - Always in sync: recompile cache → symlinks auto-update
 * - No drift: can't accidentally edit a symlinked file
 * - Clear ownership: user-created files are real, CCASP files are symlinks
 *
 * Fallback: On Windows without Developer Mode, falls back to file copying.
 */

import {
  existsSync, readFileSync, writeFileSync, mkdirSync,
  readdirSync, statSync, symlinkSync, unlinkSync,
  lstatSync, readlinkSync, copyFileSync, rmSync
} from 'fs';
import { join, basename, dirname, relative, resolve } from 'path';
import { createHash } from 'crypto';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { getHomeDir, isWindows } from './paths.js';
import { replacePlaceholders } from './template-engine/processor.js';

/**
 * Sync categories for .claude/ directories
 */
export const SYNC_CATEGORIES = [
  { category: 'commands', templateDir: 'templates/commands', projectDir: '.claude/commands', glob: '*.md', templateSuffix: '.template.md', projectSuffix: '.md' },
  { category: 'hooks', templateDir: 'templates/hooks', projectDir: '.claude/hooks', glob: '*.cjs', templateSuffix: '.template.cjs', projectSuffix: '.cjs' },
  { category: 'agents', templateDir: 'templates/agents', projectDir: '.claude/agents', glob: '*.md', templateSuffix: '.template.md', projectSuffix: '.md' },
  { category: 'skills', templateDir: 'templates/skills', projectDir: '.claude/skills', glob: '*.md', templateSuffix: '.template.md', projectSuffix: '.md' }
];

/**
 * Files that are dynamically generated (not from templates) and should never be symlinked
 */
const DYNAMIC_FILES = ['menu.md', 'INDEX.md', 'README.md'];

/**
 * Get the compiled cache root for a project
 * @param {string} projectSlug - Project slug (derived from project name)
 * @returns {string} Path to ~/.ccasp/compiled/{project-slug}/
 */
export function getCompiledCacheDir(projectSlug) {
  return join(getHomeDir(), '.ccasp', 'compiled', projectSlug);
}

/**
 * Derive a filesystem-safe slug from a project path
 * @param {string} projectPath - Absolute project path
 * @returns {string} Safe slug for directory naming
 */
export function projectSlugFromPath(projectPath) {
  // Normalize path for cross-platform consistency
  const normalizedPath = projectPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const name = basename(normalizedPath)
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  // Add a short hash of the normalized path to avoid collisions
  const hash = createHash('md5').update(normalizedPath).digest('hex').slice(0, 6);
  return `${name}-${hash}`;
}

/**
 * Convert template filename to project filename
 * @param {string} templateName - e.g. "menu.template.md"
 * @returns {string} e.g. "menu.md"
 */
function templateToProjectName(templateName) {
  return templateName
    .replace('.template.md', '.md')
    .replace('.template.cjs', '.cjs')
    .replace('.template.js', '.js');
}

/**
 * Hash a string for comparison
 * @param {string} content - Content to hash
 * @returns {string} MD5 hex hash
 */
function hashContent(content) {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  return createHash('md5').update(normalized).digest('hex');
}

/**
 * Get the CCASP package root directory (where templates/ lives)
 * Works whether installed globally via npm or running from a worktree
 * @returns {string} Package root path
 */
export function getCcaspPackageRoot() {
  // Navigate from this file: src/utils/symlink-sync.js → package root
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(dirname(thisFile), '..', '..');
}

/**
 * Load a project's tech-stack.json for template compilation
 * @param {string} projectPath - Project root path
 * @returns {Object|null} Parsed tech-stack or null
 */
function loadProjectTechStack(projectPath) {
  const techStackPath = join(projectPath, '.claude', 'config', 'tech-stack.json');
  if (!existsSync(techStackPath)) return null;
  try {
    return JSON.parse(readFileSync(techStackPath, 'utf8'));
  } catch {
    return null;
  }
}

// ============================================================
// PHASE 1 TASK 1.1: compileTemplates()
// ============================================================

/**
 * Compile all templates for a project into the compiled cache.
 * Reads templates from CCASP package, processes through template engine
 * with the project's tech-stack.json, writes to ~/.ccasp/compiled/{slug}/.
 *
 * @param {string} projectPath - Absolute path to the project
 * @param {Object} options - Compilation options
 * @param {string} options.ccaspRoot - Override CCASP package root (for dev-mode worktree)
 * @param {boolean} options.force - Recompile even if cache is fresh
 * @returns {Object} { success, compiledDir, fileCount, categories }
 */
export function compileTemplates(projectPath, options = {}) {
  const ccaspRoot = options.ccaspRoot || getCcaspPackageRoot();
  const techStack = loadProjectTechStack(projectPath);
  const slug = projectSlugFromPath(projectPath);
  const compiledDir = getCompiledCacheDir(slug);

  // Check if recompile is needed (unless forced)
  if (!options.force) {
    const meta = loadCacheMeta(slug);
    if (meta && !needsRecompile(meta, ccaspRoot, techStack)) {
      return {
        success: true,
        compiledDir,
        fileCount: meta.totalFiles || 0,
        categories: meta.categories || {},
        skipped: true,
        reason: 'Cache is fresh'
      };
    }
  }

  const result = {
    success: true,
    compiledDir,
    fileCount: 0,
    categories: {}
  };

  for (const cat of SYNC_CATEGORIES) {
    const templateDir = join(ccaspRoot, cat.templateDir);
    const outputDir = join(compiledDir, cat.category);
    const categoryResult = { compiled: 0, files: [] };

    if (!existsSync(templateDir)) {
      result.categories[cat.category] = categoryResult;
      continue;
    }

    // Ensure output directory exists
    mkdirSync(outputDir, { recursive: true });

    // Find template files
    const files = readdirSync(templateDir).filter(f => {
      if (cat.category === 'skills') {
        // Skills can be directories — handle them specially
        return f.endsWith(cat.templateSuffix) || statSync(join(templateDir, f)).isDirectory();
      }
      return f.endsWith(cat.templateSuffix);
    });

    for (const file of files) {
      const templatePath = join(templateDir, file);

      // Handle skill directories
      if (cat.category === 'skills' && statSync(templatePath).isDirectory()) {
        compileSkillDirectory(templatePath, join(outputDir, file), techStack);
        categoryResult.compiled++;
        categoryResult.files.push(file);
        continue;
      }

      const projectName = templateToProjectName(file);

      // Skip dynamically generated files
      if (DYNAMIC_FILES.includes(projectName)) continue;

      try {
        let content = readFileSync(templatePath, 'utf8');

        // Process through template engine if we have a tech stack
        if (techStack) {
          const processed = replacePlaceholders(content, techStack, {
            preserveUnknown: true,
            processConditionals: true
          });
          content = processed.content || processed;
        }

        // Clean up .template references in content
        content = content.replace(/\.template\.md/g, '.md');
        content = content.replace(/\.template\.cjs/g, '.cjs');

        const outputPath = join(outputDir, projectName);
        writeFileSync(outputPath, content, 'utf8');

        categoryResult.compiled++;
        categoryResult.files.push(projectName);
        result.fileCount++;
      } catch (err) {
        console.error(`  Warning: Failed to compile ${file}: ${err.message}`);
      }
    }

    result.categories[cat.category] = categoryResult;
  }

  // Write cache metadata
  saveCacheMeta(slug, {
    projectPath,
    ccaspRoot,
    ccaspVersion: getCcaspVersion(ccaspRoot),
    compiledAt: new Date().toISOString(),
    totalFiles: result.fileCount,
    categories: Object.fromEntries(
      Object.entries(result.categories).map(([k, v]) => [k, v.files])
    ),
    techStackHash: techStack ? hashContent(JSON.stringify(techStackForHashing(techStack))) : null
  });

  return result;
}

/**
 * Compile a skill directory (recursively copy + template process)
 */
function compileSkillDirectory(srcDir, destDir, techStack) {
  mkdirSync(destDir, { recursive: true });
  const entries = readdirSync(srcDir);

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      compileSkillDirectory(srcPath, destPath, techStack);
    } else {
      let content = readFileSync(srcPath, 'utf8');
      if (techStack && (entry.endsWith('.md') || entry.endsWith('.json'))) {
        const processed = replacePlaceholders(content, techStack, {
          preserveUnknown: true,
          processConditionals: true
        });
        content = processed.content || processed;
      }
      writeFileSync(destPath, content, 'utf8');
    }
  }
}

// ============================================================
// PHASE 1 TASK 1.2: createSymlinks()
// ============================================================

/**
 * Create OS-level symlinks from project's .claude/ dirs to compiled cache.
 * Skips user-created files and dynamically generated files.
 *
 * @param {string} projectPath - Absolute project path
 * @param {Object} options
 * @param {boolean} options.dryRun - Preview without creating symlinks
 * @returns {Object} { success, created, skipped, errors, fallbackToCopy }
 */
export function createSymlinks(projectPath, options = {}) {
  const slug = projectSlugFromPath(projectPath);
  const compiledDir = getCompiledCacheDir(slug);
  const canSymlink = testSymlinkCapability();

  const result = {
    success: true,
    created: [],
    skipped: [],
    errors: [],
    fallbackToCopy: !canSymlink
  };

  if (!existsSync(compiledDir)) {
    result.success = false;
    result.errors.push({ file: compiledDir, error: 'Compiled cache not found. Run compileTemplates() first.' });
    return result;
  }

  // Detect custom files before modifying anything
  const customFiles = detectCustomFiles(projectPath);
  const customSet = new Set(customFiles.map(f => f.relativePath));

  for (const cat of SYNC_CATEGORIES) {
    const compiledCatDir = join(compiledDir, cat.category);
    const projectCatDir = join(projectPath, cat.projectDir);

    if (!existsSync(compiledCatDir)) continue;
    mkdirSync(projectCatDir, { recursive: true });

    // Get compiled files
    const compiledFiles = listFilesRecursive(compiledCatDir);

    for (const relFile of compiledFiles) {
      const compiledFilePath = join(compiledCatDir, relFile);
      const projectFilePath = join(projectCatDir, relFile);
      const relPath = join(cat.projectDir, relFile);

      // Skip dynamic files
      if (DYNAMIC_FILES.includes(relFile)) {
        result.skipped.push({ file: relPath, reason: 'Dynamically generated' });
        continue;
      }

      // Skip user-created files
      if (customSet.has(relPath)) {
        result.skipped.push({ file: relPath, reason: 'User-created file' });
        continue;
      }

      if (options.dryRun) {
        result.created.push({ file: relPath, target: compiledFilePath, dryRun: true });
        continue;
      }

      try {
        // If existing file is already a correct symlink, skip
        if (existsSync(projectFilePath) || isSymlink(projectFilePath)) {
          if (isSymlink(projectFilePath)) {
            const currentTarget = readlinkSync(projectFilePath);
            if (resolve(currentTarget) === resolve(compiledFilePath)) {
              result.skipped.push({ file: relPath, reason: 'Already symlinked correctly' });
              continue;
            }
            // Wrong target — remove and re-create
            unlinkSync(projectFilePath);
          } else {
            // Real file exists — check if it matches the compiled content
            // If customized, skip; if unchanged, replace with symlink
            const existingHash = hashContent(readFileSync(projectFilePath, 'utf8'));
            const compiledHash = hashContent(readFileSync(compiledFilePath, 'utf8'));
            if (existingHash !== compiledHash) {
              result.skipped.push({ file: relPath, reason: 'Customized (hash differs)' });
              continue;
            }
            // Unchanged — safe to replace with symlink
            unlinkSync(projectFilePath);
          }
        }

        // Create symlink or copy
        mkdirSync(dirname(projectFilePath), { recursive: true });
        if (canSymlink) {
          symlinkSync(compiledFilePath, projectFilePath, 'file');
        } else {
          copyFileSync(compiledFilePath, projectFilePath);
        }

        result.created.push({ file: relPath, target: compiledFilePath });
      } catch (err) {
        result.errors.push({ file: relPath, error: err.message });
      }
    }
  }

  if (result.errors.length > 0) {
    result.success = result.errors.length < result.created.length; // Partial success
  }

  return result;
}

// ============================================================
// PHASE 1 TASK 1.3: detectCustomFiles()
// ============================================================

/**
 * Detect user-created files (no matching template) in .claude/ dirs.
 * These files must never be touched by symlink operations.
 *
 * @param {string} projectPath - Project root path
 * @param {Object} options
 * @param {string} options.ccaspRoot - Override CCASP package root
 * @returns {Array<{relativePath: string, category: string, fullPath: string}>}
 */
export function detectCustomFiles(projectPath, options = {}) {
  const ccaspRoot = options.ccaspRoot || getCcaspPackageRoot();
  const customFiles = [];

  for (const cat of SYNC_CATEGORIES) {
    const templateDir = join(ccaspRoot, cat.templateDir);
    const projectDir = join(projectPath, cat.projectDir);

    if (!existsSync(projectDir)) continue;

    // Build set of template-sourced filenames
    const templateNames = new Set();
    if (existsSync(templateDir)) {
      const templates = readdirSync(templateDir);
      for (const t of templates) {
        templateNames.add(templateToProjectName(t));
      }
    }
    // Also add dynamic files (they're not "custom" but also not template-sourced)
    DYNAMIC_FILES.forEach(f => templateNames.add(f));

    // Check project files
    const projectFiles = listFilesRecursive(projectDir);
    for (const file of projectFiles) {
      if (!templateNames.has(file)) {
        customFiles.push({
          relativePath: join(cat.projectDir, file),
          category: cat.category,
          fullPath: join(projectDir, file)
        });
      }
    }
  }

  return customFiles;
}

// ============================================================
// PHASE 1 TASK 1.4: Version tracking in compiled cache
// ============================================================

/**
 * Load cache metadata for a project
 * @param {string} slug - Project slug
 * @returns {Object|null} Cache metadata or null
 */
export function loadCacheMeta(slug) {
  const metaPath = join(getCompiledCacheDir(slug), '.ccasp-meta.json');
  if (!existsSync(metaPath)) return null;
  try {
    return JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save cache metadata for a project
 * @param {string} slug - Project slug
 * @param {Object} meta - Metadata to save
 */
function saveCacheMeta(slug, meta) {
  const cacheDir = getCompiledCacheDir(slug);
  mkdirSync(cacheDir, { recursive: true });
  const metaPath = join(cacheDir, '.ccasp-meta.json');
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
}

/**
 * Check if the compiled cache needs recompilation
 * @param {Object} meta - Existing cache metadata
 * @param {string} ccaspRoot - Current CCASP root
 * @param {Object|null} techStack - Current tech stack
 * @returns {boolean} True if recompile needed
 */
function needsRecompile(meta, ccaspRoot, techStack) {
  // Version changed
  const currentVersion = getCcaspVersion(ccaspRoot);
  if (meta.ccaspVersion !== currentVersion) return true;

  // Tech stack changed (exclude sync metadata which changes every sync)
  if (techStack) {
    const currentHash = hashContent(JSON.stringify(techStackForHashing(techStack)));
    if (meta.techStackHash !== currentHash) return true;
  }

  return false;
}

/**
 * Strip sync metadata from tech stack before hashing.
 * sync.lastSyncAt and sync.ccaspVersionAtSync change every sync
 * but don't affect template compilation.
 */
function techStackForHashing(techStack) {
  const clone = { ...techStack };
  if (clone.sync) {
    clone.sync = { ...clone.sync };
    delete clone.sync.lastSyncAt;
    delete clone.sync.ccaspVersionAtSync;
  }
  // Also exclude _deployment metadata which is runtime-only
  delete clone._deployment;
  return clone;
}

/**
 * Get CCASP package version
 * @param {string} ccaspRoot - Package root
 * @returns {string} Version string
 */
function getCcaspVersion(ccaspRoot) {
  try {
    const pkg = JSON.parse(readFileSync(join(ccaspRoot, 'package.json'), 'utf8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

// ============================================================
// PHASE 1 TASK 1.5: removeSymlinks() and restoreFiles()
// ============================================================

/**
 * Remove all symlinks in project .claude/ dirs and replace with real file copies.
 * Used when disabling auto-sync or uninstalling.
 *
 * @param {string} projectPath - Project root path
 * @returns {Object} { removed, errors }
 */
export function removeSymlinks(projectPath) {
  const result = { removed: [], errors: [] };

  for (const cat of SYNC_CATEGORIES) {
    const projectDir = join(projectPath, cat.projectDir);
    if (!existsSync(projectDir)) continue;

    const files = listFilesRecursive(projectDir);
    for (const file of files) {
      const filePath = join(projectDir, file);

      if (!isSymlink(filePath)) continue;

      try {
        // Read the symlink target content before removing
        const targetPath = readlinkSync(filePath);
        let content = null;
        if (existsSync(resolve(dirname(filePath), targetPath)) || existsSync(targetPath)) {
          content = readFileSync(filePath, 'utf8'); // reads through symlink
        }

        // Remove symlink
        unlinkSync(filePath);

        // Write real file with the same content
        if (content !== null) {
          writeFileSync(filePath, content, 'utf8');
          result.removed.push({ file: join(cat.projectDir, file), action: 'replaced_with_copy' });
        } else {
          result.removed.push({ file: join(cat.projectDir, file), action: 'removed_broken' });
        }
      } catch (err) {
        result.errors.push({ file: join(cat.projectDir, file), error: err.message });
      }
    }
  }

  return result;
}

/**
 * Restore files from compiled cache to project as real files.
 * Used for initial setup when symlinks aren't available.
 *
 * @param {string} projectPath - Project root path
 * @returns {Object} { restored, errors }
 */
export function restoreFiles(projectPath) {
  const slug = projectSlugFromPath(projectPath);
  const compiledDir = getCompiledCacheDir(slug);
  const customFiles = detectCustomFiles(projectPath);
  const customSet = new Set(customFiles.map(f => f.relativePath));
  const result = { restored: [], errors: [] };

  for (const cat of SYNC_CATEGORIES) {
    const compiledCatDir = join(compiledDir, cat.category);
    const projectCatDir = join(projectPath, cat.projectDir);

    if (!existsSync(compiledCatDir)) continue;
    mkdirSync(projectCatDir, { recursive: true });

    const files = listFilesRecursive(compiledCatDir);
    for (const file of files) {
      const relPath = join(cat.projectDir, file);

      if (DYNAMIC_FILES.includes(file)) continue;
      if (customSet.has(relPath)) continue;

      try {
        const src = join(compiledCatDir, file);
        const dest = join(projectCatDir, file);
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(src, dest);
        result.restored.push(relPath);
      } catch (err) {
        result.errors.push({ file: relPath, error: err.message });
      }
    }
  }

  return result;
}

// ============================================================
// Utility functions
// ============================================================

/**
 * Check if a path is a symlink (doesn't throw on missing files)
 * @param {string} filePath - Path to check
 * @returns {boolean}
 */
export function isSymlink(filePath) {
  try {
    return lstatSync(filePath).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Test if the OS supports symlink creation
 * Caches result to avoid repeated filesystem tests
 * @returns {boolean} True if symlinks work
 */
let _symlinkCapable = null;
export function testSymlinkCapability() {
  if (_symlinkCapable !== null) return _symlinkCapable;

  // Check cached capability
  const capPath = join(getHomeDir(), '.ccasp', 'capabilities.json');
  if (existsSync(capPath)) {
    try {
      const cap = JSON.parse(readFileSync(capPath, 'utf8'));
      if (cap.symlinkCapable !== undefined && cap.testedAt) {
        // Re-test if older than 30 days
        const age = Date.now() - new Date(cap.testedAt).getTime();
        if (age < 30 * 24 * 60 * 60 * 1000) {
          _symlinkCapable = cap.symlinkCapable;
          return _symlinkCapable;
        }
      }
    } catch {
      // ignore
    }
  }

  // Test by creating a temporary symlink
  const testDir = join(tmpdir(), `ccasp-symlink-test-${Date.now()}`);
  const testFile = join(testDir, 'target.txt');
  const testLink = join(testDir, 'link.txt');

  try {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(testFile, 'test', 'utf8');
    symlinkSync(testFile, testLink, 'file');
    // Verify it works
    const content = readFileSync(testLink, 'utf8');
    _symlinkCapable = content === 'test';
  } catch {
    _symlinkCapable = false;
  } finally {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  // Cache result
  try {
    const ccaspDir = join(getHomeDir(), '.ccasp');
    mkdirSync(ccaspDir, { recursive: true });
    const existing = existsSync(capPath) ? JSON.parse(readFileSync(capPath, 'utf8')) : {};
    writeFileSync(capPath, JSON.stringify({
      ...existing,
      symlinkCapable: _symlinkCapable,
      testedAt: new Date().toISOString(),
      platform: process.platform
    }, null, 2), 'utf8');
  } catch {
    // Non-critical
  }

  return _symlinkCapable;
}

/**
 * List files recursively in a directory (returns relative paths)
 * @param {string} dir - Directory to list
 * @param {string} prefix - Internal prefix for recursion
 * @returns {string[]} Array of relative file paths
 */
function listFilesRecursive(dir, prefix = '') {
  const results = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry.startsWith('.')) continue; // Skip hidden files like .ccasp-meta.json
    const fullPath = join(dir, entry);
    const relPath = prefix ? join(prefix, entry) : entry;
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...listFilesRecursive(fullPath, relPath));
      } else {
        results.push(relPath);
      }
    } catch {
      // Skip inaccessible files
    }
  }

  return results;
}

/**
 * Run a full sync: compile + symlink for a project
 * @param {string} projectPath - Project root
 * @param {Object} options - { force, dryRun, ccaspRoot }
 * @returns {Object} Combined result
 */
export function syncProject(projectPath, options = {}) {
  const compileResult = compileTemplates(projectPath, {
    ccaspRoot: options.ccaspRoot,
    force: options.force
  });

  if (!compileResult.success) {
    return { success: false, compile: compileResult, symlink: null };
  }

  const symlinkResult = createSymlinks(projectPath, {
    dryRun: options.dryRun
  });

  return {
    success: symlinkResult.success,
    compile: compileResult,
    symlink: symlinkResult
  };
}

/**
 * Get sync status for a project (for display in flyout/CLI)
 * @param {string} projectPath - Project root
 * @returns {Object} Status info
 */
export function getSyncStatus(projectPath) {
  const slug = projectSlugFromPath(projectPath);
  const meta = loadCacheMeta(slug);
  const customFiles = detectCustomFiles(projectPath);

  // Count symlinked vs real files
  let symlinkCount = 0;
  let realFileCount = 0;
  let brokenSymlinks = 0;

  for (const cat of SYNC_CATEGORIES) {
    const projectDir = join(projectPath, cat.projectDir);
    if (!existsSync(projectDir)) continue;

    const files = listFilesRecursive(projectDir);
    for (const file of files) {
      const filePath = join(projectDir, file);
      if (isSymlink(filePath)) {
        // Check if broken
        try {
          readFileSync(filePath);
          symlinkCount++;
        } catch {
          brokenSymlinks++;
        }
      } else {
        realFileCount++;
      }
    }
  }

  // Read sync config from tech-stack.json
  const techStack = loadProjectTechStack(projectPath);
  const syncEnabled = techStack?.sync?.enabled !== false; // default true

  return {
    enabled: syncEnabled,
    cached: !!meta,
    ccaspVersion: meta?.ccaspVersion || null,
    compiledAt: meta?.compiledAt || null,
    needsRecompile: meta ? needsRecompile(meta, getCcaspPackageRoot(), techStack) : true,
    symlinkCount,
    realFileCount,
    brokenSymlinks,
    customFileCount: customFiles.length,
    method: testSymlinkCapability() ? 'symlink' : 'copy'
  };
}

/**
 * Fix broken symlinks by recompiling and re-linking
 * @param {string} projectPath - Project root
 * @returns {Object} { fixed, errors }
 */
export function repairBrokenSymlinks(projectPath) {
  // Force recompile to regenerate cache
  const compileResult = compileTemplates(projectPath, { force: true });
  if (!compileResult.success) {
    return { fixed: 0, errors: [{ error: 'Recompile failed' }] };
  }

  const slug = projectSlugFromPath(projectPath);
  const compiledDir = getCompiledCacheDir(slug);
  const result = { fixed: 0, errors: [] };

  for (const cat of SYNC_CATEGORIES) {
    const projectDir = join(projectPath, cat.projectDir);
    if (!existsSync(projectDir)) continue;

    const files = listFilesRecursive(projectDir);
    for (const file of files) {
      const filePath = join(projectDir, file);
      if (!isSymlink(filePath)) continue;

      try {
        readFileSync(filePath);
      } catch {
        // Broken symlink — fix it
        const compiledPath = join(compiledDir, cat.category, file);
        if (existsSync(compiledPath)) {
          try {
            unlinkSync(filePath);
            if (testSymlinkCapability()) {
              symlinkSync(compiledPath, filePath, 'file');
            } else {
              copyFileSync(compiledPath, filePath);
            }
            result.fixed++;
          } catch (err) {
            result.errors.push({ file: join(cat.projectDir, file), error: err.message });
          }
        }
      }
    }
  }

  return result;
}

export default {
  SYNC_CATEGORIES,
  compileTemplates,
  createSymlinks,
  detectCustomFiles,
  removeSymlinks,
  restoreFiles,
  syncProject,
  getSyncStatus,
  repairBrokenSymlinks,
  testSymlinkCapability,
  isSymlink,
  projectSlugFromPath,
  getCompiledCacheDir,
  loadCacheMeta
};
