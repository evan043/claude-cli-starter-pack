/**
 * Roadmap Manager - Query Operations
 *
 * Search, filter, aggregation, reporting functions and path utilities.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import {
  generateSlug,
  calculateCompletion,
  getNextAvailablePhases,
  checkPlanDependencies,
  migrateLegacyRoadmap,
} from '../schema.js';

/**
 * Default roadmap storage directory
 * New structure: .claude/roadmaps/{slug}/ contains:
 *   - ROADMAP.json (main definition)
 *   - phase-*.json (phase plans)
 *   - exploration/ (exploration docs)
 */
const DEFAULT_ROADMAP_DIR = '.claude/roadmaps';

/**
 * Get the consolidated roadmap directory for a slug
 */
export function getRoadmapDir(roadmapSlug, cwd = process.cwd()) {
  return join(cwd, DEFAULT_ROADMAP_DIR, roadmapSlug);
}

/**
 * Ensure roadmap directory exists (for new consolidated structure)
 */
export function ensureRoadmapDir(roadmapSlug, cwd = process.cwd()) {
  const dir = getRoadmapDir(roadmapSlug, cwd);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Get the roadmaps directory path
 *
 * @param {string} cwd - Current working directory
 * @returns {string} Path to roadmaps directory
 */
export function getRoadmapsDir(cwd = process.cwd()) {
  return join(cwd, DEFAULT_ROADMAP_DIR);
}

/**
 * Ensure roadmaps directory exists
 *
 * @param {string} cwd - Current working directory
 * @returns {string} Path to roadmaps directory
 */
export function ensureRoadmapsDir(cwd = process.cwd()) {
  const dir = getRoadmapsDir(cwd);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Get the path to a specific roadmap file
 * Supports both new consolidated structure and legacy flat structure
 *
 * New structure: .claude/roadmaps/{slug}/ROADMAP.json
 * Legacy structure: .claude/roadmaps/{slug}.json
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} cwd - Current working directory
 * @param {boolean} preferConsolidated - Prefer new consolidated structure for new roadmaps
 * @returns {string} Path to roadmap JSON file
 */
export function getRoadmapPath(roadmapName, cwd = process.cwd(), preferConsolidated = true) {
  const slug = generateSlug(roadmapName);

  // Check for new consolidated structure first
  const consolidatedPath = join(getRoadmapsDir(cwd), slug, 'ROADMAP.json');
  if (existsSync(consolidatedPath)) {
    return consolidatedPath;
  }

  // Check for legacy flat structure
  const legacyPath = join(getRoadmapsDir(cwd), `${slug}.json`);
  if (existsSync(legacyPath)) {
    return legacyPath;
  }

  // For new roadmaps, return consolidated path if preferred
  if (preferConsolidated) {
    return consolidatedPath;
  }

  // Default to legacy path for backwards compatibility
  return legacyPath;
}

/**
 * List all roadmaps in the project
 * Supports both new consolidated structure and legacy flat structure
 *
 * @param {string} cwd - Current working directory
 * @returns {Array} Array of roadmap objects with path info
 */
export function listRoadmaps(cwd = process.cwd()) {
  const roadmapsDir = getRoadmapsDir(cwd);

  if (!existsSync(roadmapsDir)) {
    return [];
  }

  const roadmaps = [];
  const seenSlugs = new Set();

  try {
    const entries = readdirSync(roadmapsDir, { withFileTypes: true });

    for (const entry of entries) {
      // New consolidated structure: {slug}/ROADMAP.json
      if (entry.isDirectory() && entry.name !== 'README') {
        const consolidatedPath = join(roadmapsDir, entry.name, 'ROADMAP.json');
        if (existsSync(consolidatedPath)) {
          try {
            const content = readFileSync(consolidatedPath, 'utf8');
            const roadmap = JSON.parse(content);
            seenSlugs.add(roadmap.slug || entry.name);
            roadmaps.push({
              ...roadmap,
              _path: consolidatedPath,
              _filename: 'ROADMAP.json',
              _directory: entry.name,
              _structure: 'consolidated',
            });
          } catch (e) {
            console.error(chalk.dim(`Skipping invalid roadmap: ${entry.name}/ROADMAP.json`));
          }
        }
      }

      // Legacy flat structure: {slug}.json
      if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'README.json') {
        const filePath = join(roadmapsDir, entry.name);
        try {
          const content = readFileSync(filePath, 'utf8');
          const roadmap = JSON.parse(content);
          const slug = roadmap.slug || entry.name.replace('.json', '');

          // Skip if we already found this roadmap in consolidated structure
          if (seenSlugs.has(slug)) {
            continue;
          }

          roadmaps.push({
            ...roadmap,
            _path: filePath,
            _filename: entry.name,
            _structure: 'legacy',
          });
        } catch (e) {
          console.error(chalk.dim(`Skipping invalid roadmap file: ${entry.name}`));
        }
      }
    }
  } catch (e) {
    // Directory read error
  }

  // Sort by updated date (most recent first)
  roadmaps.sort((a, b) => {
    const dateA = new Date(a.updated || a.created || 0);
    const dateB = new Date(b.updated || b.created || 0);
    return dateB - dateA;
  });

  return roadmaps;
}

/**
 * Get roadmap summary statistics
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} cwd - Current working directory
 * @returns {Object} Summary stats
 */
export function getRoadmapSummary(roadmapName, cwd = process.cwd()) {
  // Import loadRoadmap dynamically to avoid circular dependency
  const { loadRoadmap } = require('./crud.js');
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return null;
  }

  const phases = roadmap.phases || [];
  const completedPhases = phases.filter(p => p.status === 'completed');
  const inProgressPhases = phases.filter(p => p.status === 'in_progress');
  const pendingPhases = phases.filter(p => p.status === 'pending');
  const blockedPhases = phases.filter(p => p.status === 'blocked');

  return {
    roadmap_id: roadmap.roadmap_id,
    title: roadmap.title,
    slug: roadmap.slug,
    status: roadmap.status,
    total_phases: phases.length,
    completed_phases: completedPhases.length,
    in_progress_phases: inProgressPhases.length,
    pending_phases: pendingPhases.length,
    blocked_phases: blockedPhases.length,
    completion_percentage: calculateCompletion(roadmap),
    next_available: getNextAvailablePhases(roadmap).map(p => p.phase_id),
    github_integrated: roadmap.metadata?.github_integrated || false,
    created: roadmap.created,
    updated: roadmap.updated,
  };
}

/**
 * Generate a README.md for the roadmaps directory
 *
 * @param {string} cwd - Current working directory
 */
export function generateRoadmapsIndex(cwd = process.cwd()) {
  const roadmaps = listRoadmaps(cwd);
  const roadmapsDir = getRoadmapsDir(cwd);

  let content = `# Roadmaps

This directory contains project roadmaps created with CCASP.

## Active Roadmaps

`;

  if (roadmaps.length === 0) {
    content += `_No roadmaps found. Create one with \`/create-roadmap\`._\n`;
  } else {
    content += `| Roadmap | Status | Phases | Progress |\n`;
    content += `|---------|--------|--------|----------|\n`;

    for (const roadmap of roadmaps) {
      const summary = getRoadmapSummary(roadmap.slug, cwd);
      if (summary) {
        content += `| [${summary.title}](./${roadmap.slug}.json) | ${summary.status} | ${summary.completed_phases}/${summary.total_phases} | ${summary.completion_percentage}% |\n`;
      }
    }
  }

  content += `
## Commands

- \`/create-roadmap\` - Create a new roadmap
- \`/roadmap-status\` - View roadmap status
- \`/roadmap-edit\` - Edit a roadmap
- \`/roadmap-track\` - Track roadmap progress

---
*Generated by CCASP*
`;

  try {
    writeFileSync(join(roadmapsDir, 'README.md'), content);
  } catch (e) {
    // Ignore write errors
  }
}

/**
 * Get next available phase-dev-plans (dependencies satisfied)
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} cwd - Current working directory
 * @returns {Array} Array of plan references that can be started
 */
export function getNextAvailablePlans(roadmapName, cwd = process.cwd()) {
  // Import loadRoadmap dynamically to avoid circular dependency
  const { loadRoadmap } = require('./crud.js');
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap || !roadmap.phase_dev_plan_refs) {
    return [];
  }

  return roadmap.phase_dev_plan_refs.filter(planRef => {
    // Already completed or in progress
    if (planRef.status === 'completed' || planRef.status === 'in_progress') {
      return false;
    }

    // Check dependencies
    const depCheck = checkPlanDependencies(roadmap, planRef.slug);
    return depCheck.satisfied;
  });
}
