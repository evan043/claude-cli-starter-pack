/**
 * Roadmap Integration Command
 *
 * Bridges /create-roadmap with GitHub Project Board:
 * - Import: Create GitHub issues from ROADMAP.json projects
 * - Sync: Update GitHub issues with project completion status
 * - Create: Generate ROADMAP.json from existing GitHub issues
 * - Status: Show sync status between local roadmap and GitHub
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - roadmap/display.js - Menu display, shared helpers (findRoadmaps, selectRoadmap, etc.)
 * - roadmap/import.js - Import roadmap to GitHub (create issues)
 * - roadmap/sync.js - Sync roadmap progress with GitHub issues
 * - roadmap/status.js - Show sync status dashboard
 * - roadmap/create.js - Generate ROADMAP.json from GitHub issues
 */

import { showRoadmapMenu } from './roadmap/display.js';
import { runRoadmapImport } from './roadmap/import.js';
import { runRoadmapSync } from './roadmap/sync.js';
import { runRoadmapStatus } from './roadmap/status.js';
import { runRoadmapCreate } from './roadmap/create.js';

export async function runRoadmap(options = {}) {
  const { subcommand } = options;

  switch (subcommand) {
    case 'import':
      return await runRoadmapImport(options);
    case 'sync':
      return await runRoadmapSync(options);
    case 'create':
      return await runRoadmapCreate(options);
    case 'status':
      return await runRoadmapStatus(options);
    default:
      return await showRoadmapMenu();
  }
}

export { showRoadmapMenu } from './roadmap/display.js';
