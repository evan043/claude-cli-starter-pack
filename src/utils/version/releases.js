/**
 * Release Management Module
 *
 * Handles release notes, features tracking, and availability checks.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { compareVersions } from './checker.js';
import { loadUpdateState } from './state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load release notes from the releases.json file
 */
export function loadReleaseNotes() {
  try {
    const releasesPath = join(__dirname, '..', '..', 'data', 'releases.json');
    if (existsSync(releasesPath)) {
      return JSON.parse(readFileSync(releasesPath, 'utf8'));
    }
  } catch {
    // Fall through to default
  }

  return { releases: [] };
}

/**
 * Get release notes for a specific version
 */
export function getReleaseNotes(version) {
  const { releases } = loadReleaseNotes();
  return releases.find((r) => r.version === version) || null;
}

/**
 * Get all release notes since a specific version
 */
export function getReleasesSince(sinceVersion) {
  const { releases } = loadReleaseNotes();

  return releases.filter((r) => compareVersions(r.version, sinceVersion) > 0);
}

/**
 * Get new features available since a specific version
 */
export function getNewFeaturesSince(sinceVersion) {
  const releases = getReleasesSince(sinceVersion);

  const features = {
    commands: [],
    agents: [],
    skills: [],
    hooks: [],
    other: [],
  };

  for (const release of releases) {
    if (release.newFeatures) {
      if (release.newFeatures.commands) {
        features.commands.push(...release.newFeatures.commands);
      }
      if (release.newFeatures.agents) {
        features.agents.push(...release.newFeatures.agents);
      }
      if (release.newFeatures.skills) {
        features.skills.push(...release.newFeatures.skills);
      }
      if (release.newFeatures.hooks) {
        features.hooks.push(...release.newFeatures.hooks);
      }
      if (release.newFeatures.other) {
        features.other.push(...release.newFeatures.other);
      }
    }
  }

  return features;
}

/**
 * Get features that are available but not yet installed or skipped
 */
export function getAvailableFeatures(projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  const allNewFeatures = getNewFeaturesSince('0.0.0'); // Get all features ever added

  const installed = state.installedFeatures || [];
  const skipped = state.skippedFeatures || [];

  const available = {
    commands: allNewFeatures.commands.filter((f) => !installed.includes(f.name) && !skipped.includes(f.name)),
    agents: allNewFeatures.agents.filter((f) => !installed.includes(f.name) && !skipped.includes(f.name)),
    skills: allNewFeatures.skills.filter((f) => !installed.includes(f.name) && !skipped.includes(f.name)),
    hooks: allNewFeatures.hooks.filter((f) => !installed.includes(f.name) && !skipped.includes(f.name)),
    other: allNewFeatures.other.filter((f) => !installed.includes(f.name) && !skipped.includes(f.name)),
  };

  return available;
}
