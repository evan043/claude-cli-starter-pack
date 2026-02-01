/**
 * Linear Integration Adapter
 *
 * Uses Linear GraphQL API for all operations.
 * Supports: Projects (as Epics), Issues, Sub-issues
 */

import { IntegrationAdapter, createSyncResult } from './adapter-interface.js';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

export class LinearAdapter extends IntegrationAdapter {
  constructor(config) {
    super(config);
    this.name = 'linear';
    this.teamKey = config?.team_key || '';
    this.teamId = null; // Resolved on first request
  }

  /**
   * Make GraphQL request to Linear
   */
  async request(query, variables = {}) {
    if (!this.config?.api_key) {
      throw new Error('Linear API key not configured');
    }

    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.config.api_key,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(`Linear API error: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return result.data;
  }

  /**
   * Get team ID from team key
   */
  async resolveTeamId() {
    if (this.teamId) return this.teamId;

    const query = `
      query GetTeam($key: String!) {
        team(key: $key) {
          id
          name
        }
      }
    `;

    const data = await this.request(query, { key: this.teamKey });
    this.teamId = data.team?.id;
    return this.teamId;
  }

  /**
   * Test connection to Linear
   */
  async testConnection() {
    if (!this.config?.api_key) {
      return {
        success: false,
        message: 'Linear not configured. Set api_key.',
      };
    }

    try {
      const query = `
        query Me {
          viewer {
            id
            name
            email
          }
        }
      `;

      const data = await this.request(query);
      this.authenticated = true;

      return {
        success: true,
        message: `Connected to Linear as ${data.viewer.name}`,
      };
    } catch (e) {
      this.authenticated = false;
      return {
        success: false,
        message: `Linear connection failed: ${e.message}`,
      };
    }
  }

  async authenticate() {
    return this.testConnection();
  }

  // ========================================
  // EPIC OPERATIONS (Linear Projects)
  // ========================================

  async createEpic(epic) {
    try {
      const teamId = await this.resolveTeamId();
      if (!teamId) {
        return { success: false, external_id: null, url: null, error: 'Team not found' };
      }

      const query = `
        mutation CreateProject($input: ProjectCreateInput!) {
          projectCreate(input: $input) {
            success
            project {
              id
              name
              url
            }
          }
        }
      `;

      const input = {
        name: epic.title,
        description: epic.business_objective || epic.description,
        teamIds: [teamId],
      };

      const data = await this.request(query, { input });

      if (!data.projectCreate?.success) {
        return { success: false, external_id: null, url: null, error: 'Failed to create project' };
      }

      return {
        success: true,
        external_id: data.projectCreate.project.id,
        url: data.projectCreate.project.url,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async updateEpic(externalId, updates) {
    try {
      const query = `
        mutation UpdateProject($id: String!, $input: ProjectUpdateInput!) {
          projectUpdate(id: $id, input: $input) {
            success
          }
        }
      `;

      const input = {};
      if (updates.title) input.name = updates.title;
      if (updates.description) input.description = updates.description;

      const data = await this.request(query, { id: externalId, input });

      return { success: data.projectUpdate?.success || false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getEpic(externalId) {
    try {
      const query = `
        query GetProject($id: String!) {
          project(id: $id) {
            id
            name
            description
            state
            url
            issues {
              nodes {
                id
                title
                state {
                  name
                }
              }
            }
          }
        }
      `;

      const data = await this.request(query, { id: externalId });
      return data.project;
    } catch {
      return null;
    }
  }

  async listEpics(filters = {}) {
    try {
      const teamId = await this.resolveTeamId();
      if (!teamId) return [];

      const query = `
        query GetProjects($teamId: String!) {
          team(id: $teamId) {
            projects {
              nodes {
                id
                name
                description
                state
                url
              }
            }
          }
        }
      `;

      const data = await this.request(query, { teamId });
      return data.team?.projects?.nodes || [];
    } catch {
      return [];
    }
  }

  async closeEpic(externalId) {
    try {
      const query = `
        mutation UpdateProject($id: String!, $input: ProjectUpdateInput!) {
          projectUpdate(id: $id, input: $input) {
            success
          }
        }
      `;

      const data = await this.request(query, {
        id: externalId,
        input: { state: 'completed' },
      });

      return { success: data.projectUpdate?.success || false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ========================================
  // ROADMAP OPERATIONS (Linear Issues)
  // ========================================

  async createRoadmapItem(roadmap, epicExternalId = null) {
    try {
      const teamId = await this.resolveTeamId();
      if (!teamId) {
        return { success: false, external_id: null, url: null, error: 'Team not found' };
      }

      const query = `
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              identifier
              url
            }
          }
        }
      `;

      const input = {
        title: `[Roadmap] ${roadmap.title}`,
        description: roadmap.description,
        teamId: teamId,
      };

      if (epicExternalId) {
        input.projectId = epicExternalId;
      }

      const data = await this.request(query, { input });

      if (!data.issueCreate?.success) {
        return { success: false, external_id: null, url: null, error: 'Failed to create issue' };
      }

      return {
        success: true,
        external_id: data.issueCreate.issue.id,
        url: data.issueCreate.issue.url,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async updateRoadmapItem(externalId, updates) {
    try {
      const query = `
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
          }
        }
      `;

      const input = {};
      if (updates.title) input.title = updates.title;
      if (updates.description) input.description = updates.description;

      const data = await this.request(query, { id: externalId, input });

      return { success: data.issueUpdate?.success || false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async linkToEpic(roadmapExternalId, epicExternalId) {
    try {
      const query = `
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
          }
        }
      `;

      const data = await this.request(query, {
        id: roadmapExternalId,
        input: { projectId: epicExternalId },
      });

      return { success: data.issueUpdate?.success || false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ========================================
  // PHASE/TASK OPERATIONS
  // ========================================

  async createPhaseItem(phase, parentExternalId = null) {
    try {
      const teamId = await this.resolveTeamId();
      if (!teamId) {
        return { success: false, external_id: null, url: null, error: 'Team not found' };
      }

      const query = `
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              identifier
              url
            }
          }
        }
      `;

      const input = {
        title: `[Phase] ${phase.phase_title}`,
        description: phase.goal,
        teamId: teamId,
      };

      if (parentExternalId) {
        input.parentId = parentExternalId;
      }

      const data = await this.request(query, { input });

      if (!data.issueCreate?.success) {
        return { success: false, external_id: null, url: null, error: 'Failed to create issue' };
      }

      return {
        success: true,
        external_id: data.issueCreate.issue.id,
        url: data.issueCreate.issue.url,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async createTaskItem(task, parentExternalId = null) {
    try {
      const teamId = await this.resolveTeamId();
      if (!teamId) {
        return { success: false, external_id: null, url: null, error: 'Team not found' };
      }

      const query = `
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              identifier
              url
            }
          }
        }
      `;

      const input = {
        title: task.content,
        teamId: teamId,
      };

      if (parentExternalId) {
        input.parentId = parentExternalId;
      }

      const data = await this.request(query, { input });

      return {
        success: data.issueCreate?.success || false,
        external_id: data.issueCreate?.issue?.id,
        url: data.issueCreate?.issue?.url,
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async updateTaskStatus(externalId, status) {
    try {
      // First, get workflow states for the team
      const statesQuery = `
        query GetStates($teamId: String!) {
          team(id: $teamId) {
            states {
              nodes {
                id
                name
              }
            }
          }
        }
      `;

      const teamId = await this.resolveTeamId();
      const statesData = await this.request(statesQuery, { teamId });
      const states = statesData.team?.states?.nodes || [];

      // Find matching state
      const targetStateName = this.mapStatus(status);
      const state = states.find(s => s.name.toLowerCase() === targetStateName.toLowerCase());

      if (!state) {
        return { success: false, error: `State not found: ${targetStateName}` };
      }

      // Update issue state
      const query = `
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
          }
        }
      `;

      const data = await this.request(query, {
        id: externalId,
        input: { stateId: state.id },
      });

      return { success: data.issueUpdate?.success || false };
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
          if (epic.external_links?.linear?.id) {
            await this.updateEpic(epic.external_links.linear.id, {
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
      const projects = await this.listEpics(options);
      result.items = projects.map(project => ({
        type: 'epic',
        external_id: project.id,
        title: project.name,
        description: project.description,
        status: project.state === 'completed' ? 'completed' : 'active',
        url: project.url,
      }));
      result.success = true;
    } catch (e) {
      result.errors.push(this.formatError(e, 'syncFromExternal'));
    }

    return result;
  }

  async postComment(externalId, comment) {
    try {
      const query = `
        mutation CreateComment($input: CommentCreateInput!) {
          commentCreate(input: $input) {
            success
          }
        }
      `;

      const data = await this.request(query, {
        input: {
          issueId: externalId,
          body: comment,
        },
      });

      return { success: data.commentCreate?.success || false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

/**
 * Create Linear adapter instance
 */
export function createLinearAdapter(config) {
  return new LinearAdapter(config);
}
