/**
 * Local JSON Adapter
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

export class LocalAdapter {
  constructor(config, projectRoot) {
    this.config = config;
    this.projectRoot = projectRoot;
    this.epicDir = join(projectRoot, config.epicDir || '.claude/github-epics');
    this.roadmapDir = join(projectRoot, config.roadmapDir || '.claude/roadmaps');
  }

  async fetchState() {
    const epics = [];

    // Load epics
    if (existsSync(this.epicDir)) {
      const files = readdirSync(this.epicDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(readFileSync(join(this.epicDir, file), 'utf8'));
          epics.push({ ...data, source: 'local' });
        } catch { /* skip */ }
      }
    }

    // Load roadmaps (legacy format)
    if (existsSync(this.roadmapDir)) {
      const files = readdirSync(this.roadmapDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(readFileSync(join(this.roadmapDir, file), 'utf8'));
          epics.push({
            epic_id: data.roadmap_id,
            slug: data.slug,
            title: data.title,
            status: data.status,
            type: 'feature',
            priority: 'P2',
            phases: data.phases || [],
            source: 'local-roadmap'
          });
        } catch { /* skip */ }
      }
    }

    return { epics, source: 'local' };
  }

  async updateStatus(task, status, metadata) {
    // Update local epic/roadmap file
    const epicId = task.epic_id;
    const phaseId = task.phase_id;

    // Try epic file first
    const epicPath = join(this.epicDir, `${epicId}.json`);
    if (existsSync(epicPath)) {
      try {
        const epic = JSON.parse(readFileSync(epicPath, 'utf8'));
        const phase = epic.phases?.find(p => p.phase_id === phaseId);
        if (phase) {
          phase.status = status;
          phase.updated = new Date().toISOString();
          if (metadata.error) phase.error = metadata.error;
          writeFileSync(epicPath, JSON.stringify(epic, null, 2), 'utf8');
          return { success: true };
        }
      } catch { /* ignore */ }
    }

    // Try roadmap file
    const roadmapPath = join(this.roadmapDir, `${epicId}.json`);
    if (existsSync(roadmapPath)) {
      try {
        const roadmap = JSON.parse(readFileSync(roadmapPath, 'utf8'));
        const phase = roadmap.phases?.find(p => p.phase_id === phaseId);
        if (phase) {
          phase.status = status;
          phase.updated = new Date().toISOString();
          writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2), 'utf8');
          return { success: true };
        }
      } catch { /* ignore */ }
    }

    return { success: false, error: 'Epic/phase not found locally' };
  }

  async postProgress(task, progress) {
    // Local doesn't need progress comments
    return { success: true, skipped: true };
  }

  async createEpic(epicData) {
    const path = join(this.epicDir, `${epicData.slug}.json`);

    if (!existsSync(this.epicDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(this.epicDir, { recursive: true });
    }

    writeFileSync(path, JSON.stringify(epicData, null, 2), 'utf8');
    return { success: true, path };
  }
}
