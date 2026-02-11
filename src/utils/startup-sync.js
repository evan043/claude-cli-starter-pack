/**
 * Startup Sync Check
 *
 * Runs on every `ccasp` command invocation (via preAction hook).
 * Checks if the CCASP package version has changed since last compile
 * and auto-recompiles all registered projects with sync enabled.
 *
 * Designed to be fast (< 50ms) when no recompile is needed.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getHomeDir } from './paths.js';
import { getRegisteredProjects } from './global-registry.js';
import {
  syncProject,
  projectSlugFromPath,
  loadCacheMeta,
  getCcaspPackageRoot
} from './symlink-sync.js';

/**
 * Path to the last-known-version file
 */
function getVersionCheckPath() {
  return join(getHomeDir(), '.ccasp', 'last-sync-version.txt');
}

/**
 * Get current CCASP version
 */
function getCurrentVersion() {
  try {
    const root = getCcaspPackageRoot();
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Check if any registered projects need recompilation and sync them.
 * Called from the preAction hook in bin/gtask.js.
 *
 * @param {Object} options
 * @param {boolean} options.silent - Suppress output
 */
export async function checkStartupSync(options = {}) {
  const versionPath = getVersionCheckPath();
  const currentVersion = getCurrentVersion();

  // Fast path: check if version has changed
  if (existsSync(versionPath)) {
    const lastVersion = readFileSync(versionPath, 'utf8').trim();
    if (lastVersion === currentVersion) {
      return; // No change, skip
    }
  }

  // Version changed — check registered projects
  const projects = getRegisteredProjects({ existsOnly: true });
  if (projects.length === 0) {
    // Still update version marker
    saveVersionMarker(currentVersion);
    return;
  }

  let recompiledCount = 0;

  for (const project of projects) {
    // Check if project has sync enabled
    const tsPath = join(project.path, '.claude', 'config', 'tech-stack.json');
    if (!existsSync(tsPath)) continue;

    let techStack;
    try {
      techStack = JSON.parse(readFileSync(tsPath, 'utf8'));
    } catch {
      continue;
    }

    // Only sync if sync.enabled (default true if sync section missing)
    if (techStack.sync?.enabled === false) continue;

    // Check if this project's cache is stale
    const slug = projectSlugFromPath(project.path);
    const meta = loadCacheMeta(slug);
    if (meta && meta.ccaspVersion === currentVersion) continue;

    // Needs recompile
    try {
      const result = syncProject(project.path, { force: false });
      if (result.success) {
        recompiledCount++;

        // Update tech stack sync info
        if (!techStack.sync) techStack.sync = {};
        techStack.sync.lastSyncAt = new Date().toISOString();
        techStack.sync.ccaspVersionAtSync = currentVersion;
        writeFileSync(tsPath, JSON.stringify(techStack, null, 2), 'utf8');
      }
    } catch {
      // Non-critical
    }
  }

  if (recompiledCount > 0 && !options.silent) {
    const chalk = (await import('chalk')).default;
    console.log(chalk.dim(`  CCASP ${currentVersion}: templates recompiled for ${recompiledCount} project(s)`));
  }

  // Update version marker
  saveVersionMarker(currentVersion);
}

function saveVersionMarker(version) {
  const versionPath = getVersionCheckPath();
  const dir = join(getHomeDir(), '.ccasp');
  mkdirSync(dir, { recursive: true });
  writeFileSync(versionPath, version, 'utf8');
}
