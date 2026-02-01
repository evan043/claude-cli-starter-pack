/**
 * Jira Integration Adapter
 *
 * Uses Jira REST API v3 for all operations.
 * Supports: Epics, Stories, Tasks, Subtasks, Boards
 */

import { IntegrationAdapter, createSyncResult } from './adapter-interface.js';

export class JiraAdapter extends IntegrationAdapter {
  constructor(config) {
    super(config);
    this.name = 'jira';
    this.baseUrl = config?.base_url || '';
    this.projectKey = config?.project_key || '';
  }

  /**
   * Get authorization header
   */
  getAuthHeader() {
    const email = this.config?.email || '';
    const token = this.config?.api_token || '';
    const credentials = Buffer.from(`${email}:${token}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Make API request to Jira
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/rest/api/3${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Test connection to Jira
   */
  async testConnection() {
    if (!this.baseUrl || !this.config?.api_token) {
      return {
        success: false,
        message: 'Jira not configured. Set base_url and api_token.',
      };
    }

    try {
      const result = await this.request('/myself');
      this.authenticated = true;
      return {
        success: true,
        message: `Connected to Jira as ${result.displayName}`,
      };
    } catch (e) {
      this.authenticated = false;
      return {
        success: false,
        message: `Jira connection failed: ${e.message}`,
      };
    }
  }

  async authenticate() {
    // Jira uses API tokens, no interactive auth needed
    return this.testConnection();
  }

  // ========================================
  // EPIC OPERATIONS
  // ========================================

  async createEpic(epic) {
    if (!this.projectKey) {
      return { success: false, external_id: null, url: null, error: 'Project key not configured' };
    }

    try {
      const issueType = this.mapType('epic');

      const payload = {
        fields: {
          project: { key: this.projectKey },
          issuetype: { name: issueType },
          summary: epic.title,
          description: this.formatDescription(epic.business_objective || epic.description),
          priority: { name: this.mapPriority(epic.priority) },
        },
      };

      // Add custom fields if configured
      if (this.config?.custom_fields?.epic_name) {
        payload.fields[this.config.custom_fields.epic_name] = epic.title;
      }

      const result = await this.request('/issue', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return {
        success: true,
        external_id: result.key,
        url: `${this.baseUrl}/browse/${result.key}`,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async updateEpic(externalId, updates) {
    try {
      const payload = { fields: {} };

      if (updates.title) {
        payload.fields.summary = updates.title;
      }

      if (updates.description || updates.body) {
        payload.fields.description = this.formatDescription(updates.description || updates.body);
      }

      if (updates.status) {
        // Status updates require transitions API
        await this.transitionIssue(externalId, updates.status);
      }

      if (Object.keys(payload.fields).length > 0) {
        await this.request(`/issue/${externalId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getEpic(externalId) {
    try {
      return await this.request(`/issue/${externalId}`);
    } catch {
      return null;
    }
  }

  async listEpics(filters = {}) {
    try {
      const jql = `project = ${this.projectKey} AND issuetype = Epic ORDER BY created DESC`;
      const result = await this.request(`/search?jql=${encodeURIComponent(jql)}&maxResults=100`);
      return result.issues || [];
    } catch {
      return [];
    }
  }

  async closeEpic(externalId) {
    return this.transitionIssue(externalId, 'completed');
  }

  // ========================================
  // ROADMAP OPERATIONS (Stories in Jira)
  // ========================================

  async createRoadmapItem(roadmap, epicExternalId = null) {
    if (!this.projectKey) {
      return { success: false, external_id: null, url: null, error: 'Project key not configured' };
    }

    try {
      const issueType = this.mapType('roadmap');

      const payload = {
        fields: {
          project: { key: this.projectKey },
          issuetype: { name: issueType },
          summary: roadmap.title,
          description: this.formatDescription(roadmap.description),
        },
      };

      // Link to epic if provided
      if (epicExternalId && this.config?.custom_fields?.epic_link) {
        payload.fields[this.config.custom_fields.epic_link] = epicExternalId;
      }

      const result = await this.request('/issue', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return {
        success: true,
        external_id: result.key,
        url: `${this.baseUrl}/browse/${result.key}`,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async updateRoadmapItem(externalId, updates) {
    return this.updateEpic(externalId, updates);
  }

  async linkToEpic(roadmapExternalId, epicExternalId) {
    try {
      // Create issue link
      await this.request('/issueLink', {
        method: 'POST',
        body: JSON.stringify({
          type: { name: 'Epic-Story Link' },
          inwardIssue: { key: roadmapExternalId },
          outwardIssue: { key: epicExternalId },
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
    if (!this.projectKey) {
      return { success: false, external_id: null, url: null, error: 'Project key not configured' };
    }

    try {
      const issueType = this.mapType('phase');

      const payload = {
        fields: {
          project: { key: this.projectKey },
          issuetype: { name: issueType },
          summary: phase.phase_title,
          description: this.formatDescription(phase.goal),
        },
      };

      if (parentExternalId) {
        payload.fields.parent = { key: parentExternalId };
      }

      const result = await this.request('/issue', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return {
        success: true,
        external_id: result.key,
        url: `${this.baseUrl}/browse/${result.key}`,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async createTaskItem(task, parentExternalId = null) {
    if (!this.projectKey) {
      return { success: false, external_id: null, url: null, error: 'Project key not configured' };
    }

    try {
      const issueType = this.mapType('task');

      const payload = {
        fields: {
          project: { key: this.projectKey },
          issuetype: { name: issueType },
          summary: task.content,
        },
      };

      if (parentExternalId) {
        payload.fields.parent = { key: parentExternalId };
      }

      const result = await this.request('/issue', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return {
        success: true,
        external_id: result.key,
        url: `${this.baseUrl}/browse/${result.key}`,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async updateTaskStatus(externalId, status) {
    return this.transitionIssue(externalId, status);
  }

  // ========================================
  // TRANSITION HELPER
  // ========================================

  async transitionIssue(issueKey, targetStatus) {
    try {
      // Get available transitions
      const transitions = await this.request(`/issue/${issueKey}/transitions`);

      // Map local status to Jira status
      const jiraStatus = this.mapStatus(targetStatus);

      // Find matching transition
      const transition = transitions.transitions?.find(
        t => t.name.toLowerCase() === jiraStatus.toLowerCase()
      );

      if (!transition) {
        return { success: false, error: `No transition found for status: ${jiraStatus}` };
      }

      // Execute transition
      await this.request(`/issue/${issueKey}/transitions`, {
        method: 'POST',
        body: JSON.stringify({ transition: { id: transition.id } }),
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
          if (epic.external_links?.jira?.key) {
            await this.updateEpic(epic.external_links.jira.key, {
              title: epic.title,
              description: epic.business_objective,
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
      const epics = await this.listEpics(options);
      result.items = epics.map(issue => ({
        type: 'epic',
        external_id: issue.key,
        title: issue.fields.summary,
        description: issue.fields.description,
        status: this.reverseMapStatus(issue.fields.status?.name),
        url: `${this.baseUrl}/browse/${issue.key}`,
      }));
      result.success = true;
    } catch (e) {
      result.errors.push(this.formatError(e, 'syncFromExternal'));
    }

    return result;
  }

  async postComment(externalId, comment) {
    try {
      await this.request(`/issue/${externalId}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          body: this.formatDescription(comment),
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

  /**
   * Format description for Jira's ADF (Atlassian Document Format)
   */
  formatDescription(text) {
    if (!text) return null;

    // Simple ADF document
    return {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: text,
            },
          ],
        },
      ],
    };
  }
}

/**
 * Create Jira adapter instance
 */
export function createJiraAdapter(config) {
  return new JiraAdapter(config);
}
