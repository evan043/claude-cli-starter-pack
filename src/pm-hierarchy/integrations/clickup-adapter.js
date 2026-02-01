/**
 * ClickUp Integration Adapter
 *
 * Uses ClickUp REST API v2 for all operations.
 * Supports: Folders (as Epics), Lists (as Roadmaps), Tasks
 */

import { IntegrationAdapter, createSyncResult } from './adapter-interface.js';

const CLICKUP_API_URL = 'https://api.clickup.com/api/v2';

export class ClickUpAdapter extends IntegrationAdapter {
  constructor(config) {
    super(config);
    this.name = 'clickup';
    this.workspaceId = config?.workspace_id || '';
    this.spaceId = config?.space_id || '';
    this.defaultListId = config?.default_list_id || '';
  }

  /**
   * Make API request to ClickUp
   */
  async request(endpoint, options = {}) {
    if (!this.config?.api_key) {
      throw new Error('ClickUp API key not configured');
    }

    const url = `${CLICKUP_API_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.config.api_key,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ClickUp API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Test connection to ClickUp
   */
  async testConnection() {
    if (!this.config?.api_key) {
      return {
        success: false,
        message: 'ClickUp not configured. Set api_key.',
      };
    }

    try {
      const result = await this.request('/user');
      this.authenticated = true;

      return {
        success: true,
        message: `Connected to ClickUp as ${result.user?.username}`,
      };
    } catch (e) {
      this.authenticated = false;
      return {
        success: false,
        message: `ClickUp connection failed: ${e.message}`,
      };
    }
  }

  async authenticate() {
    return this.testConnection();
  }

  // ========================================
  // EPIC OPERATIONS (ClickUp Folders)
  // ========================================

  async createEpic(epic) {
    if (!this.spaceId) {
      return { success: false, external_id: null, url: null, error: 'Space ID not configured' };
    }

    try {
      // Create a folder to represent the epic
      const result = await this.request(`/space/${this.spaceId}/folder`, {
        method: 'POST',
        body: JSON.stringify({
          name: epic.title,
        }),
      });

      // Create a description task as first item
      if (epic.business_objective || epic.description) {
        const listResult = await this.request(`/folder/${result.id}/list`, {
          method: 'POST',
          body: JSON.stringify({
            name: 'Overview',
          }),
        });

        await this.request(`/list/${listResult.id}/task`, {
          method: 'POST',
          body: JSON.stringify({
            name: 'Epic Overview',
            description: this.formatDescription(epic),
            priority: this.mapPriority(epic.priority),
          }),
        });
      }

      return {
        success: true,
        external_id: result.id,
        url: `https://app.clickup.com/${this.workspaceId}/v/f/${result.id}`,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async updateEpic(externalId, updates) {
    try {
      const payload = {};
      if (updates.title) payload.name = updates.title;

      await this.request(`/folder/${externalId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getEpic(externalId) {
    try {
      return await this.request(`/folder/${externalId}`);
    } catch {
      return null;
    }
  }

  async listEpics(filters = {}) {
    if (!this.spaceId) return [];

    try {
      const result = await this.request(`/space/${this.spaceId}/folder`);
      return result.folders || [];
    } catch {
      return [];
    }
  }

  async closeEpic(externalId) {
    // ClickUp folders don't have a closed state
    // We could archive or update the name with [COMPLETED] prefix
    try {
      const folder = await this.getEpic(externalId);
      if (folder) {
        await this.request(`/folder/${externalId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: `[COMPLETED] ${folder.name}`,
          }),
        });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ========================================
  // ROADMAP OPERATIONS (ClickUp Lists)
  // ========================================

  async createRoadmapItem(roadmap, epicExternalId = null) {
    const folderId = epicExternalId || this.spaceId;
    const endpoint = epicExternalId
      ? `/folder/${folderId}/list`
      : `/space/${this.spaceId}/list`;

    try {
      const result = await this.request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          name: roadmap.title,
          content: roadmap.description,
        }),
      });

      return {
        success: true,
        external_id: result.id,
        url: `https://app.clickup.com/${this.workspaceId}/v/li/${result.id}`,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async updateRoadmapItem(externalId, updates) {
    try {
      const payload = {};
      if (updates.title) payload.name = updates.title;
      if (updates.description) payload.content = updates.description;

      await this.request(`/list/${externalId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async linkToEpic(roadmapExternalId, epicExternalId) {
    // In ClickUp, lists are already in folders (epics)
    // Moving a list to a folder would be the linking operation
    try {
      await this.request(`/list/${roadmapExternalId}`, {
        method: 'PUT',
        body: JSON.stringify({
          folder_id: epicExternalId,
        }),
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ========================================
  // PHASE/TASK OPERATIONS
  // ========================================

  async createPhaseItem(phase, parentExternalId = null) {
    const listId = parentExternalId || this.defaultListId;
    if (!listId) {
      return { success: false, external_id: null, url: null, error: 'List ID not available' };
    }

    try {
      const result = await this.request(`/list/${listId}/task`, {
        method: 'POST',
        body: JSON.stringify({
          name: `[Phase] ${phase.phase_title}`,
          description: phase.goal,
          priority: this.mapComplexityToPriority(phase.complexity),
        }),
      });

      return {
        success: true,
        external_id: result.id,
        url: result.url,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async createTaskItem(task, parentExternalId = null) {
    // If parent is provided, create as subtask
    if (parentExternalId) {
      try {
        const result = await this.request(`/task/${parentExternalId}/subtask`, {
          method: 'POST',
          body: JSON.stringify({
            name: task.content,
          }),
        });

        return {
          success: true,
          external_id: result.id,
          url: result.url,
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // Otherwise create in default list
    const listId = this.defaultListId;
    if (!listId) {
      return { success: false, error: 'Default list ID not configured' };
    }

    try {
      const result = await this.request(`/list/${listId}/task`, {
        method: 'POST',
        body: JSON.stringify({
          name: task.content,
        }),
      });

      return {
        success: true,
        external_id: result.id,
        url: result.url,
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async updateTaskStatus(externalId, status) {
    try {
      const clickupStatus = this.mapStatus(status);

      await this.request(`/task/${externalId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: clickupStatus,
        }),
      });

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ========================================
  // SYNC OPERATIONS
  // ========================================

  async syncToExternal(localData) {
    const result = createSyncResult();

    if (localData.epics) {
      for (const epic of localData.epics) {
        try {
          if (epic.external_links?.clickup?.task_id) {
            // Update folder name
            await this.updateEpic(epic.external_links.clickup.task_id, {
              title: epic.title,
            });
            result.updated.push({ type: 'epic', id: epic.epic_id });
          } else {
            const created = await this.createEpic(epic);
            if (created.success) {
              result.created.push({ type: 'epic', id: epic.epic_id, external_id: created.external_id });
            } else {
              result.errors.push({ type: 'epic', id: epic.epic_id, error: created.error });
            }
          }
        } catch (e) {
          result.errors.push(this.formatError(e, 'syncEpic'));
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  async syncFromExternal(options = {}) {
    const result = {
      success: false,
      items: [],
      errors: [],
    };

    try {
      const folders = await this.listEpics(options);
      result.items = folders.map(folder => ({
        type: 'epic',
        external_id: folder.id,
        title: folder.name.replace('[COMPLETED] ', ''),
        status: folder.name.startsWith('[COMPLETED]') ? 'completed' : 'active',
        url: `https://app.clickup.com/${this.workspaceId}/v/f/${folder.id}`,
      }));
      result.success = true;
    } catch (e) {
      result.errors.push(this.formatError(e, 'syncFromExternal'));
    }

    return result;
  }

  async postComment(externalId, comment) {
    try {
      await this.request(`/task/${externalId}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          comment_text: comment,
        }),
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ========================================
  // FORMATTING HELPERS
  // ========================================

  formatDescription(epic) {
    let desc = '';

    if (epic.business_objective) {
      desc += `## Business Objective\n${epic.business_objective}\n\n`;
    }

    if (epic.success_criteria?.length > 0) {
      desc += `## Success Criteria\n`;
      epic.success_criteria.forEach(c => {
        desc += `- ${c}\n`;
      });
      desc += '\n';
    }

    if (epic.scope?.in?.length > 0) {
      desc += `## In Scope\n`;
      epic.scope.in.forEach(s => {
        desc += `- ${s}\n`;
      });
      desc += '\n';
    }

    if (epic.scope?.out?.length > 0) {
      desc += `## Out of Scope\n`;
      epic.scope.out.forEach(s => {
        desc += `- ${s}\n`;
      });
    }

    return desc;
  }

  /**
   * Map phase complexity to ClickUp priority
   * ClickUp: 1 (urgent) to 4 (low), null = no priority
   */
  mapComplexityToPriority(complexity) {
    switch (complexity) {
      case 'L': return 2; // High
      case 'M': return 3; // Normal
      case 'S': return 4; // Low
      default: return 3;
    }
  }

  /**
   * Override priority mapping for ClickUp's numeric system
   */
  mapPriority(localPriority) {
    const mapping = this.config?.field_mapping?.priority || {
      P0: 1,
      P1: 2,
      P2: 3,
      P3: 4,
      P4: null,
    };
    return mapping[localPriority] ?? 3;
  }
}

/**
 * Create ClickUp adapter instance
 */
export function createClickUpAdapter(config) {
  return new ClickUpAdapter(config);
}
