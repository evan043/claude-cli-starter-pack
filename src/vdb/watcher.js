/**
 * VDB Watcher Module
 *
 * Monitors Vision/Epic boards for actionable items:
 * - Phases ready to work (dependencies resolved)
 * - Stale tasks needing attention
 * - Unblocked items
 * - Priority changes
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export class Watcher {
  constructor(config, projectRoot) {
    this.config = config;
    this.projectRoot = projectRoot;
    this.lastScan = null;
    this.scanHistory = [];
  }

  /**
   * Scan all boards and find actionable items
   */
  async scan(boardState) {
    this.lastScan = new Date().toISOString();

    const actionable = await this.findActionableItems(boardState);

    // Log scan
    this.scanHistory.push({
      timestamp: this.lastScan,
      itemsFound: actionable.length,
      boardState: {
        epics: boardState.epics?.length || 0,
        phases: boardState.phases?.length || 0
      }
    });

    // Keep last 100 scans
    if (this.scanHistory.length > 100) {
      this.scanHistory = this.scanHistory.slice(-100);
    }

    return actionable;
  }

  /**
   * Find all actionable items from board state
   */
  async findActionableItems(boardState) {
    const actionable = [];
    const config = this.config.watcher || {};

    // Process epics
    const epics = boardState.epics || [];

    for (const epic of epics) {
      // Skip non-active epics
      if (!['active', 'in_progress'].includes(epic.status)) {
        continue;
      }

      const phases = epic.phases || [];
      const completedPhaseIds = phases
        .filter(p => p.status === 'completed')
        .map(p => p.phase_id);

      for (const phase of phases) {
        // Check if phase is ready to work
        if (config.scanFor?.readyPhases !== false) {
          if (this.isPhaseReady(phase, completedPhaseIds)) {
            actionable.push(this.createActionableItem(phase, epic, 'ready'));
          }
        }

        // Check for stale phases
        if (config.scanFor?.staleTasks !== false) {
          if (this.isPhaseStale(phase, config.staleThresholdDays || 3)) {
            actionable.push(this.createActionableItem(phase, epic, 'stale'));
          }
        }

        // Check for recently unblocked
        if (config.scanFor?.blockedItems !== false) {
          if (this.wasRecentlyUnblocked(phase)) {
            actionable.push(this.createActionableItem(phase, epic, 'unblocked'));
          }
        }
      }
    }

    // Sort by priority (highest first)
    actionable.sort((a, b) => b.priority - a.priority);

    // Apply max queue limit
    const maxItems = config.maxQueuePerScan || 5;
    return actionable.slice(0, maxItems);
  }

  /**
   * Check if phase is ready to work
   */
  isPhaseReady(phase, completedPhaseIds) {
    // Already completed or in progress
    if (['completed', 'in_progress'].includes(phase.status)) {
      return false;
    }

    // Check dependencies
    const deps = phase.dependencies || [];
    if (deps.length === 0) {
      // No dependencies, ready if pending
      return phase.status === 'pending';
    }

    // All dependencies must be completed
    return deps.every(dep => completedPhaseIds.includes(dep));
  }

  /**
   * Check if phase is stale
   */
  isPhaseStale(phase, thresholdDays) {
    if (phase.status !== 'in_progress') return false;

    const lastUpdate = phase.updated || phase.started_at;
    if (!lastUpdate) return false;

    const daysSinceUpdate = (Date.now() - new Date(lastUpdate)) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > thresholdDays;
  }

  /**
   * Check if phase was recently unblocked
   */
  wasRecentlyUnblocked(phase) {
    if (phase.status !== 'pending') return false;
    if (!phase.previously_blocked) return false;

    // Check if unblocked in last 24 hours
    const unblockedAt = phase.unblocked_at;
    if (!unblockedAt) return false;

    const hoursSinceUnblock = (Date.now() - new Date(unblockedAt)) / (1000 * 60 * 60);
    return hoursSinceUnblock < 24;
  }

  /**
   * Create actionable item object
   */
  createActionableItem(phase, epic, reason) {
    const priority = this.calculatePriority(phase, epic, reason);

    return {
      id: `${epic.epic_id || epic.slug}/${phase.phase_id}`,
      type: 'phase',
      reason,
      priority,
      epic_id: epic.epic_id || epic.slug,
      epic_title: epic.title,
      epic_type: epic.type || 'feature',
      phase_id: phase.phase_id,
      phase_title: phase.phase_title,
      phase_goal: phase.goal,
      complexity: phase.complexity || 'M',
      inputs: phase.inputs || {},
      outputs: phase.outputs || [],
      shipping_criteria: phase.shipping_criteria || [],
      dependencies: phase.dependencies || [],
      agents_assigned: phase.agents_assigned || [],
      metadata: {
        epic_priority: epic.priority || 'P2',
        epic_status: epic.status,
        phase_status: phase.status,
        github_issue: phase.github_issue_number,
        detected_at: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate priority score for an item
   */
  calculatePriority(phase, epic, reason) {
    let score = 0;

    // Epic priority (P0=100, P1=80, P2=60, P3=40, P4=20)
    const priorityScores = { P0: 100, P1: 80, P2: 60, P3: 40, P4: 20 };
    score += priorityScores[epic.priority] || 50;

    // Complexity (smaller = higher priority for quick wins)
    const complexityScores = { S: 30, M: 20, L: 10, XL: 5 };
    score += complexityScores[phase.complexity] || 15;

    // Reason-based adjustment
    const reasonScores = {
      ready: 20, // Ready to work
      stale: 30, // Needs attention
      unblocked: 25 // Recently unblocked
    };
    score += reasonScores[reason] || 10;

    // Epic type (features slightly prioritized for shipping)
    if (epic.type === 'feature') score += 10;
    if (epic.type === 'platform') score += 5;

    // Vision alignment
    if (phase.vision_alignment === 'Core') score += 15;
    if (phase.vision_alignment === 'Strategic') score += 10;

    // Staleness bonus (older = higher priority to clear backlog)
    const lastUpdate = phase.updated || epic.updated;
    if (lastUpdate) {
      const daysSinceUpdate = (Date.now() - new Date(lastUpdate)) / (1000 * 60 * 60 * 24);
      score += Math.min(daysSinceUpdate * 2, 20);
    }

    return Math.round(score);
  }

  /**
   * Load local epics (when GitHub not available)
   */
  async loadLocalEpics() {
    const epics = [];
    const localConfig = this.config.boards?.local || {};

    // Load from github-epics directory
    const epicDir = join(this.projectRoot, localConfig.epicDir || '.claude/github-epics');
    if (existsSync(epicDir)) {
      const files = readdirSync(epicDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(readFileSync(join(epicDir, file), 'utf8'));
          epics.push({
            ...data,
            source: 'local-epic',
            slug: file.replace('.json', '')
          });
        } catch {
          // Skip invalid files
        }
      }
    }

    // Load from roadmaps directory (legacy)
    const roadmapDir = join(this.projectRoot, localConfig.roadmapDir || '.claude/roadmaps');
    if (existsSync(roadmapDir)) {
      const files = readdirSync(roadmapDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(readFileSync(join(roadmapDir, file), 'utf8'));
          // Convert roadmap to epic format if needed
          epics.push({
            epic_id: data.roadmap_id,
            slug: data.slug || file.replace('.json', ''),
            title: data.title,
            status: data.status === 'active' ? 'active' : data.status,
            type: 'feature',
            priority: 'P2',
            phases: data.phases || [],
            source: 'local-roadmap'
          });
        } catch {
          // Skip invalid files
        }
      }
    }

    return epics;
  }

  /**
   * Get scan statistics
   */
  getStats() {
    return {
      lastScan: this.lastScan,
      scanCount: this.scanHistory.length,
      recentScans: this.scanHistory.slice(-10),
      avgItemsFound: this.scanHistory.length > 0
        ? this.scanHistory.reduce((sum, s) => sum + s.itemsFound, 0) / this.scanHistory.length
        : 0
    };
  }
}

export default Watcher;
