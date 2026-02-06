/**
 * VDB Board Sync Module
 *
 * Bidirectional sync with project management boards:
 * - GitHub Projects (via GraphQL API)
 * - Jira (via REST API)
 * - Local JSON (offline mode)
 */

import { GitHubProjectAdapter } from './github-adapter.js';
import { JiraAdapter } from './jira-adapter.js';
import { LocalAdapter } from './local-adapter.js';

export class BoardSync {
  constructor(config, projectRoot) {
    this.config = config;
    this.projectRoot = projectRoot;
    this.adapters = {};

    // Initialize enabled adapters
    if (config.boards?.github?.enabled) {
      this.adapters.github = new GitHubProjectAdapter(config.boards.github, projectRoot);
    }

    if (config.boards?.jira?.enabled) {
      this.adapters.jira = new JiraAdapter(config.boards.jira, projectRoot);
    }

    // Local adapter always enabled
    this.adapters.local = new LocalAdapter(config.boards?.local || {}, projectRoot);
  }

  /**
   * Fetch unified board state from all sources
   */
  async fetchState() {
    const states = {};
    const errors = [];

    // Fetch from each adapter
    for (const [name, adapter] of Object.entries(this.adapters)) {
      try {
        states[name] = await adapter.fetchState();
      } catch (error) {
        errors.push({ adapter: name, error: error.message });
      }
    }

    // Merge into unified state
    const unified = this.mergeStates(states);

    return {
      ...unified,
      sources: Object.keys(states),
      errors: errors.length > 0 ? errors : undefined,
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Merge states from multiple sources
   */
  mergeStates(states) {
    const epicMap = new Map();

    // Process each source, preferring primary
    const primary = this.config.boards?.primary || 'github';
    const sources = [primary, ...Object.keys(states).filter(s => s !== primary)];

    for (const source of sources) {
      const state = states[source];
      if (!state?.epics) continue;

      for (const epic of state.epics) {
        const key = epic.epic_id || epic.slug;

        if (!epicMap.has(key)) {
          epicMap.set(key, { ...epic, sources: [source] });
        } else {
          // Merge with existing
          const existing = epicMap.get(key);
          existing.sources.push(source);

          // Merge external links
          existing.external_links = {
            ...existing.external_links,
            ...epic.external_links
          };
        }
      }
    }

    return {
      epics: Array.from(epicMap.values()),
      phases: Array.from(epicMap.values()).flatMap(e => e.phases || [])
    };
  }

  /**
   * Update task status on all enabled boards
   */
  async updateStatus(task, status, metadata = {}) {
    const results = {};

    for (const [name, adapter] of Object.entries(this.adapters)) {
      try {
        results[name] = await adapter.updateStatus(task, status, metadata);
      } catch (error) {
        results[name] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Post progress update to boards
   */
  async postProgress(task, progress) {
    const results = {};

    for (const [name, adapter] of Object.entries(this.adapters)) {
      try {
        results[name] = await adapter.postProgress(task, progress);
      } catch (error) {
        results[name] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Create epic on boards
   */
  async createEpic(epicData) {
    const results = {};

    for (const [name, adapter] of Object.entries(this.adapters)) {
      try {
        results[name] = await adapter.createEpic(epicData);
      } catch (error) {
        results[name] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Get adapter for specific board
   */
  getAdapter(boardName) {
    return this.adapters[boardName];
  }
}
