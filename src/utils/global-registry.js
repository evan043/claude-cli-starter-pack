/**
 * Global Project Registry
 * Tracks all projects configured with CCASP across the system
 * Location: ~/.claude/ccasp-registry.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  globalClaudePath,
  getHomeDir,
  toForwardSlashes,
  pathsEqual,
  getPathSegment
} from './paths.js';

/**
 * Get the path to the global registry file
 * @returns {string} Path to ~/.claude/ccasp-registry.json
 */
export function getRegistryPath() {
  return globalClaudePath('ccasp-registry.json');
}

/**
 * Get the global .claude directory path
 * @returns {string} Path to ~/.claude/
 */
export function getGlobalClaudeDir() {
  return join(getHomeDir(), '.claude');
}

/**
 * Ensure the global .claude directory exists
 */
function ensureGlobalDir() {
  const globalDir = getGlobalClaudeDir();
  if (!existsSync(globalDir)) {
    mkdirSync(globalDir, { recursive: true });
  }
}

/**
 * Load the global registry
 * @returns {Object} Registry object with projects array and metadata
 */
export function loadRegistry() {
  const registryPath = getRegistryPath();

  if (!existsSync(registryPath)) {
    return {
      version: '1.0.0',
      projects: [],
      lastModified: null
    };
  }

  try {
    const content = readFileSync(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Warning: Could not parse registry file: ${err.message}`);
    return {
      version: '1.0.0',
      projects: [],
      lastModified: null
    };
  }
}

/**
 * Save the global registry
 * @param {Object} registry - Registry object to save
 */
export function saveRegistry(registry) {
  ensureGlobalDir();
  const registryPath = getRegistryPath();

  registry.lastModified = new Date().toISOString();

  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
}

/**
 * Register a project in the global registry
 * @param {string} projectPath - Absolute path to the project
 * @param {Object} metadata - Optional metadata (name, version, features)
 * @returns {boolean} True if newly registered, false if already existed
 */
export function registerProject(projectPath, metadata = {}) {
  const registry = loadRegistry();

  // Check if already registered (using cross-platform path comparison)
  const existingIndex = registry.projects.findIndex(
    p => pathsEqual(p.path, projectPath)
  );

  const projectEntry = {
    path: projectPath,
    name: metadata.name || getPathSegment(projectPath),
    registeredAt: new Date().toISOString(),
    lastInitAt: new Date().toISOString(),
    ccaspVersion: metadata.version || 'unknown',
    features: metadata.features || []
  };

  if (existingIndex >= 0) {
    // Update existing entry
    registry.projects[existingIndex] = {
      ...registry.projects[existingIndex],
      ...projectEntry,
      registeredAt: registry.projects[existingIndex].registeredAt // Keep original registration date
    };
    saveRegistry(registry);
    return false;
  }

  // Add new entry
  registry.projects.push(projectEntry);
  saveRegistry(registry);
  return true;
}

/**
 * Unregister a project from the global registry
 * @param {string} projectPath - Absolute path to the project
 * @returns {boolean} True if removed, false if not found
 */
export function unregisterProject(projectPath) {
  const registry = loadRegistry();

  const initialLength = registry.projects.length;
  registry.projects = registry.projects.filter(
    p => !pathsEqual(p.path, projectPath)
  );

  if (registry.projects.length < initialLength) {
    saveRegistry(registry);
    return true;
  }

  return false;
}

/**
 * Get all registered projects
 * @param {Object} options - Filter options
 * @param {boolean} options.existsOnly - Only return projects that still exist on disk
 * @returns {Array} Array of project entries
 */
export function getRegisteredProjects(options = {}) {
  const registry = loadRegistry();
  let projects = registry.projects;

  if (options.existsOnly) {
    projects = projects.filter(p => existsSync(p.path));
  }

  return projects;
}

/**
 * Check if a project is registered
 * @param {string} projectPath - Absolute path to the project
 * @returns {boolean} True if registered
 */
export function isProjectRegistered(projectPath) {
  const registry = loadRegistry();

  return registry.projects.some(
    p => pathsEqual(p.path, projectPath)
  );
}

/**
 * Get registry statistics
 * @returns {Object} Stats about registered projects
 */
export function getRegistryStats() {
  const registry = loadRegistry();
  const projects = registry.projects;

  let existingCount = 0;
  let missingCount = 0;

  for (const project of projects) {
    if (existsSync(project.path)) {
      existingCount++;
    } else {
      missingCount++;
    }
  }

  return {
    total: projects.length,
    existing: existingCount,
    missing: missingCount,
    lastModified: registry.lastModified
  };
}

/**
 * Clean up registry by removing projects that no longer exist
 * @returns {number} Number of projects removed
 */
export function cleanupRegistry() {
  const registry = loadRegistry();
  const initialLength = registry.projects.length;

  registry.projects = registry.projects.filter(p => existsSync(p.path));

  const removed = initialLength - registry.projects.length;
  if (removed > 0) {
    saveRegistry(registry);
  }

  return removed;
}

/**
 * Clear the entire registry
 */
export function clearRegistry() {
  const registry = {
    version: '1.0.0',
    projects: [],
    lastModified: new Date().toISOString()
  };
  saveRegistry(registry);
}
