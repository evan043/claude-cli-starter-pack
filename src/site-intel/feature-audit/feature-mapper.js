/**
 * Feature Audit - Feature Mapper
 *
 * Reads the CCASP planning hierarchy (EPIC.json → ROADMAP.json → PROGRESS.json)
 * and maps tasks to verifiable features.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Infrastructure task keywords - these are NOT user-facing features
 */
const INFRA_KEYWORDS = [
  'setup', 'configure', 'install', 'scaffold', 'initialize', 'init',
  'refactor', 'migrate', 'upgrade', 'update dependencies', 'ci/cd',
  'linting', 'formatting', 'documentation', 'readme', 'changelog',
  'devops', 'docker', 'deployment pipeline', 'env variables',
];

/**
 * Check if a task name indicates infrastructure work (not a testable feature)
 */
function isInfrastructureTask(taskName) {
  const lower = taskName.toLowerCase();
  return INFRA_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Get recency data for a feature based on git history
 */
function getRecencyData(projectRoot, completedAt) {
  if (!completedAt) {
    return { last_completed_at: null, days_since_completion: null, git_commits_since: 0 };
  }

  const now = new Date();
  const completed = new Date(completedAt);
  const daysSince = Math.floor((now - completed) / (1000 * 60 * 60 * 24));

  let commitsSince = 0;
  try {
    const result = execSync(
      `git rev-list --count --since="${completedAt}" HEAD`,
      { cwd: projectRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    commitsSince = parseInt(result) || 0;
  } catch {
    // Git not available or not a git repo
  }

  return {
    last_completed_at: completedAt,
    days_since_completion: daysSince,
    git_commits_since: commitsSince,
  };
}

/**
 * Get recency weight based on days since completion
 */
function getRecencyWeight(daysSince) {
  if (daysSince === null) return 'Low';
  if (daysSince <= 7) return 'High';
  if (daysSince <= 14) return 'Medium';
  return 'Low';
}

/**
 * Get recency multiplier for confidence scoring
 */
export function getRecencyMultiplier(daysSince) {
  if (daysSince === null) return 0.9;
  if (daysSince <= 7) return 1.2;
  if (daysSince <= 14) return 1.1;
  if (daysSince <= 30) return 1.0;
  return 0.9;
}

/**
 * Read all PROGRESS.json files from the project
 * Structure: .claude/phase-plans/<roadmap-slug>/<phase-slug>/PROGRESS.json
 */
function findProgressFiles(projectRoot) {
  const phasePlansDir = path.join(projectRoot, '.claude', 'phase-plans');
  const files = [];

  if (!fs.existsSync(phasePlansDir)) return files;

  try {
    const roadmapDirs = fs.readdirSync(phasePlansDir, { withFileTypes: true });
    for (const roadmapDir of roadmapDirs) {
      if (!roadmapDir.isDirectory()) continue;
      const roadmapPath = path.join(phasePlansDir, roadmapDir.name);

      // Check for PROGRESS.json directly in the roadmap dir (flat structure)
      const directProgress = path.join(roadmapPath, 'PROGRESS.json');
      if (fs.existsSync(directProgress)) {
        files.push({ dir: roadmapDir.name, path: directProgress });
        continue;
      }

      // Check for PROGRESS.json in phase subdirectories (nested structure)
      try {
        const phaseDirs = fs.readdirSync(roadmapPath, { withFileTypes: true });
        for (const phaseDir of phaseDirs) {
          if (!phaseDir.isDirectory()) continue;
          const progressPath = path.join(roadmapPath, phaseDir.name, 'PROGRESS.json');
          if (fs.existsSync(progressPath)) {
            files.push({ dir: `${roadmapDir.name}/${phaseDir.name}`, path: progressPath });
          }
        }
      } catch {
        // Phase subdirectory not accessible
      }
    }
  } catch {
    // Directory not accessible
  }

  return files;
}

/**
 * Read all ROADMAP.json files from the project
 */
function findRoadmapFiles(projectRoot) {
  const roadmapsDir = path.join(projectRoot, '.claude', 'roadmaps');
  const files = [];

  if (!fs.existsSync(roadmapsDir)) return files;

  try {
    const dirs = fs.readdirSync(roadmapsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const roadmapPath = path.join(roadmapsDir, dir.name, 'ROADMAP.json');
        if (fs.existsSync(roadmapPath)) {
          files.push({ dir: dir.name, path: roadmapPath });
        }
      }
    }
  } catch {
    // Directory not accessible
  }

  return files;
}

/**
 * Read all epic files from the project
 * Structure: .claude/github-epics/<slug>.json (flat JSON files)
 * Legacy fallback: .claude/epics/<slug>/EPIC.json
 */
function findEpicFiles(projectRoot) {
  const files = [];

  // Primary location: .claude/github-epics/ (flat JSON files)
  const githubEpicsDir = path.join(projectRoot, '.claude', 'github-epics');
  if (fs.existsSync(githubEpicsDir)) {
    try {
      const entries = fs.readdirSync(githubEpicsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const slug = entry.name.replace('.json', '');
          files.push({ dir: slug, path: path.join(githubEpicsDir, entry.name) });
        }
      }
    } catch {
      // Directory not accessible
    }
  }

  // Legacy fallback: .claude/epics/<slug>/EPIC.json
  if (files.length === 0) {
    const legacyDir = path.join(projectRoot, '.claude', 'epics');
    if (fs.existsSync(legacyDir)) {
      try {
        const dirs = fs.readdirSync(legacyDir, { withFileTypes: true });
        for (const dir of dirs) {
          if (dir.isDirectory()) {
            const epicPath = path.join(legacyDir, dir.name, 'EPIC.json');
            if (fs.existsSync(epicPath)) {
              files.push({ dir: dir.name, path: epicPath });
            }
          }
        }
      } catch {
        // Directory not accessible
      }
    }
  }

  return files;
}

/**
 * Extract tasks from a PROGRESS.json file
 */
function extractTasksFromProgress(progressData, progressDir) {
  const tasks = [];
  const phases = progressData.phases || [];

  for (const phase of phases) {
    const phaseId = phase.phase || phase.id || 0;
    const phaseTasks = phase.tasks || [];

    for (let i = 0; i < phaseTasks.length; i++) {
      const task = phaseTasks[i];
      const taskName = task.name || task.title || task.description || `Task ${i + 1}`;
      // Handle both formats: task.status (string) and task.completed (boolean)
      const taskStatus = task.status || (task.completed === true ? 'completed' : (task.completed === false ? 'pending' : 'pending'));

      // Skip infrastructure tasks
      if (isInfrastructureTask(taskName)) continue;

      tasks.push({
        phase_id: phaseId,
        task_id: i + 1,
        name: taskName,
        status: taskStatus,
        completed_at: task.completed_at || task.completedAt || null,
        progress_dir: progressDir,
      });
    }
  }

  return tasks;
}

/**
 * Map planning hierarchy to a flat feature list
 *
 * @param {string} projectRoot - Project root path
 * @param {Object} options - Options
 * @param {boolean} options.includeInfra - Include infrastructure tasks (default false)
 * @param {string} options.epicSlug - Filter to specific epic
 * @param {string} options.roadmapSlug - Filter to specific roadmap
 * @returns {Object} { features, source }
 */
export function mapPlanningToFeatures(projectRoot, options = {}) {
  const progressFiles = findProgressFiles(projectRoot);
  const roadmapFiles = findRoadmapFiles(projectRoot);
  const epicFiles = findEpicFiles(projectRoot);

  // Build roadmap slug lookup
  const roadmapLookup = {};
  const roadmapSlugs = [];
  for (const rf of roadmapFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(rf.path, 'utf8'));
      roadmapLookup[rf.dir] = {
        name: data.name || data.title || rf.dir,
        slug: data.slug || rf.dir,
        phase_dev_plan_refs: data.phase_dev_plan_refs || [],
      };
      roadmapSlugs.push(data.slug || rf.dir);
    } catch {
      // Malformed roadmap
    }
  }

  // Build epic slug
  let epicSlug = null;
  for (const ef of epicFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(ef.path, 'utf8'));
      epicSlug = data.slug || ef.dir;
      if (options.epicSlug && epicSlug !== options.epicSlug) continue;
      break;
    } catch {
      // Malformed epic
    }
  }

  // Extract features from all progress files
  const features = [];
  let featureCounter = 0;

  for (const pf of progressFiles) {
    // Filter by roadmap if specified
    if (options.roadmapSlug) {
      const roadmap = Object.values(roadmapLookup).find(r =>
        r.phase_dev_plan_refs.some(ref => pf.dir.includes(ref))
      );
      if (!roadmap || roadmap.slug !== options.roadmapSlug) continue;
    }

    try {
      const progressData = JSON.parse(fs.readFileSync(pf.path, 'utf8'));
      const tasks = extractTasksFromProgress(progressData, pf.dir);

      // Find which roadmap this progress file belongs to
      let roadmapSlug = null;
      for (const [dir, roadmap] of Object.entries(roadmapLookup)) {
        if (roadmap.phase_dev_plan_refs.some(ref => pf.dir.includes(ref)) || pf.dir.includes(dir)) {
          roadmapSlug = roadmap.slug;
          break;
        }
      }

      for (const task of tasks) {
        featureCounter++;
        const recency = getRecencyData(projectRoot, task.completed_at);

        features.push({
          id: `feature-${String(featureCounter).padStart(3, '0')}`,
          name: task.name,
          source_task: {
            phase_id: task.phase_id,
            task_id: task.task_id,
            roadmap_slug: roadmapSlug,
            progress_file: path.relative(projectRoot, path.join(projectRoot, '.claude', 'phase-plans', pf.dir, 'PROGRESS.json')),
            status: task.status,
            completed_at: task.completed_at,
          },
          recency: {
            ...recency,
            weight: getRecencyWeight(recency.days_since_completion),
          },
          // Placeholders - filled by truth-verifier
          truth_table: {},
          confidence: {},
          tests: {},
          gap_analysis: {},
        });
      }
    } catch {
      // Malformed progress file
    }
  }

  return {
    features,
    source: {
      epic_slug: epicSlug,
      roadmap_slugs: roadmapSlugs,
      progress_files_read: progressFiles.length,
      vision_slug: null, // Set by caller if applicable
    },
  };
}

export default {
  mapPlanningToFeatures,
  getRecencyMultiplier,
};
