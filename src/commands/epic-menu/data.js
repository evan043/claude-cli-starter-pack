import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { listRoadmaps } from '../../roadmap/roadmap-manager.js';

export const EPICS_DIR = '.claude/github-epics';
export const LEGACY_ROADMAPS_DIR = '.claude/roadmaps';
export const INITIALIZED_MARKER = '.claude/github-epics-initialized';

export function needsSessionRestart(cwd = process.cwd()) {
  const markerPath = join(cwd, INITIALIZED_MARKER);
  const epicsDir = join(cwd, EPICS_DIR);

  if (existsSync(epicsDir) && !existsSync(markerPath)) {
    return true;
  }

  return false;
}

export function markSessionInitialized(cwd = process.cwd()) {
  const markerPath = join(cwd, INITIALIZED_MARKER);
  const dir = dirname(markerPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(markerPath, JSON.stringify({
    initialized: new Date().toISOString(),
    version: '1.0.0',
  }, null, 2));
}

export function loadAllEpics(cwd = process.cwd()) {
  const epics = [];

  const epicsDir = join(cwd, EPICS_DIR);
  if (existsSync(epicsDir)) {
    const files = readdirSync(epicsDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const epicPath = join(epicsDir, file);
          const data = JSON.parse(readFileSync(epicPath, 'utf8'));
          epics.push({
            ...data,
            path: epicPath,
            slug: file.replace('.json', ''),
            source: 'epic',
          });
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  const roadmaps = listRoadmaps();
  for (const roadmap of roadmaps) {
    epics.push({
      ...roadmap,
      source: 'legacy',
    });
  }

  return epics;
}

export async function migrateToEpics(cwd = process.cwd()) {
  const legacyDir = join(cwd, LEGACY_ROADMAPS_DIR);
  const newDir = join(cwd, EPICS_DIR);

  if (!existsSync(legacyDir)) {
    return { migrated: 0, errors: [] };
  }

  if (!existsSync(newDir)) {
    mkdirSync(newDir, { recursive: true });
  }

  const files = readdirSync(legacyDir);
  let migrated = 0;
  const errors = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const oldPath = join(legacyDir, file);
        const newPath = join(newDir, file);
        const data = JSON.parse(readFileSync(oldPath, 'utf8'));

        if (data.phases) {
          for (const phase of data.phases) {
            if (phase.phase_dev_config?.progress_json_path) {
              phase.phase_dev_config.progress_json_path =
                phase.phase_dev_config.progress_json_path.replace('roadmaps', 'github-epics');
            }
          }
        }

        writeFileSync(newPath, JSON.stringify(data, null, 2));
        migrated++;
      } catch (e) {
        errors.push({ file, error: e.message });
      }
    }
  }

  return { migrated, errors };
}
