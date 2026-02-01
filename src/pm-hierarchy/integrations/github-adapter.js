/**
 * GitHub Integration Adapter
 *
 * Uses GitHub CLI (gh) for all operations.
 * Supports: Issues, Project Boards, Labels, Milestones
 */

import { execSync } from 'child_process';
import { IntegrationAdapter, createSyncResult } from './adapter-interface.js';

export class GitHubAdapter extends IntegrationAdapter {
  constructor(config) {
    super(config);
    this.name = 'github';
    this.ghVersion = null;
  }

  /**
   * Check if gh CLI is available and authenticated
   */
  async testConnection() {
    try {
      // Check gh version
      const version = execSync('gh --version', { encoding: 'utf8' });
      this.ghVersion = version.split('\n')[0];

      // Check auth status
      const authStatus = execSync('gh auth status', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.authenticated = true;

      return {
        success: true,
        message: `GitHub CLI authenticated. ${this.ghVersion}`,
      };
    } catch (error) {
      this.authenticated = false;
      return {
        success: false,
        message: error.message.includes('gh: command not found')
          ? 'GitHub CLI (gh) not installed. Run: brew install gh'
          : `GitHub auth failed: ${error.message}`,
      };
    }
  }

  /**
   * Authenticate with GitHub (triggers gh auth login if needed)
   */
  async authenticate() {
    try {
      execSync('gh auth status', { stdio: 'pipe' });
      this.authenticated = true;
      return { success: true, message: 'Already authenticated' };
    } catch {
      try {
        // This will open browser for OAuth
        execSync('gh auth login', { stdio: 'inherit' });
        this.authenticated = true;
        return { success: true, message: 'Authentication complete' };
      } catch (e) {
        return { success: false, message: e.message };
      }
    }
  }

  /**
   * Get repo string for gh commands
   */
  getRepo() {
    if (this.config?.owner && this.config?.repo) {
      return `${this.config.owner}/${this.config.repo}`;
    }
    return null;
  }

  // ========================================
  // EPIC OPERATIONS (GitHub Issues with 'epic' label)
  // ========================================

  async createEpic(epic) {
    const repo = this.getRepo();
    if (!repo) {
      return { success: false, external_id: null, url: null, error: 'Repository not configured' };
    }

    try {
      const title = `[Epic] ${epic.title}`;
      const body = this.formatEpicBody(epic);
      const labels = ['epic', `priority-${epic.priority || 'P2'}`].join(',');

      const result = execSync(
        `gh issue create --repo "${repo}" --title "${this.escapeQuotes(title)}" --body "${this.escapeQuotes(body)}" --label "${labels}"`,
        { encoding: 'utf8' }
      );

      const url = result.trim();
      const issueNumber = url.match(/\/issues\/(\d+)/)?.[1];

      return {
        success: true,
        external_id: issueNumber,
        url,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async updateEpic(externalId, updates) {
    const repo = this.getRepo();
    if (!repo) return { success: false, error: 'Repository not configured' };

    try {
      const args = [];

      if (updates.title) {
        args.push(`--title "[Epic] ${this.escapeQuotes(updates.title)}"`);
      }

      if (updates.body) {
        args.push(`--body "${this.escapeQuotes(updates.body)}"`);
      }

      if (args.length > 0) {
        execSync(
          `gh issue edit ${externalId} --repo "${repo}" ${args.join(' ')}`,
          { stdio: 'pipe' }
        );
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getEpic(externalId) {
    const repo = this.getRepo();
    if (!repo) return null;

    try {
      const result = execSync(
        `gh issue view ${externalId} --repo "${repo}" --json number,title,body,state,labels,url`,
        { encoding: 'utf8' }
      );
      return JSON.parse(result);
    } catch {
      return null;
    }
  }

  async listEpics(filters = {}) {
    const repo = this.getRepo();
    if (!repo) return [];

    try {
      const state = filters.state || 'open';
      const result = execSync(
        `gh issue list --repo "${repo}" --label epic --state ${state} --json number,title,state,labels,url --limit 100`,
        { encoding: 'utf8' }
      );
      return JSON.parse(result);
    } catch {
      return [];
    }
  }

  async closeEpic(externalId) {
    const repo = this.getRepo();
    if (!repo) return { success: false, error: 'Repository not configured' };

    try {
      execSync(
        `gh issue close ${externalId} --repo "${repo}" --comment "Epic completed!"`,
        { stdio: 'pipe' }
      );
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ========================================
  // ROADMAP OPERATIONS (GitHub Issues linked to epic)
  // ========================================

  async createRoadmapItem(roadmap, epicExternalId = null) {
    const repo = this.getRepo();
    if (!repo) return { success: false, external_id: null, url: null, error: 'Repository not configured' };

    try {
      const title = `[Roadmap] ${roadmap.title}`;
      const body = this.formatRoadmapBody(roadmap, epicExternalId);
      const labels = ['roadmap'].join(',');

      const result = execSync(
        `gh issue create --repo "${repo}" --title "${this.escapeQuotes(title)}" --body "${this.escapeQuotes(body)}" --label "${labels}"`,
        { encoding: 'utf8' }
      );

      const url = result.trim();
      const issueNumber = url.match(/\/issues\/(\d+)/)?.[1];

      return {
        success: true,
        external_id: issueNumber,
        url,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async updateRoadmapItem(externalId, updates) {
    return this.updateEpic(externalId, updates); // Same API for issues
  }

  async linkToEpic(roadmapExternalId, epicExternalId) {
    const repo = this.getRepo();
    if (!repo) return { success: false, error: 'Repository not configured' };

    try {
      // Add a comment linking to the epic
      const comment = `Part of Epic #${epicExternalId}`;
      execSync(
        `gh issue comment ${roadmapExternalId} --repo "${repo}" --body "${comment}"`,
        { stdio: 'pipe' }
      );
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ========================================
  // PHASE/TASK OPERATIONS
  // ========================================

  async createPhaseItem(phase, parentExternalId = null) {
    const repo = this.getRepo();
    if (!repo) return { success: false, external_id: null, url: null, error: 'Repository not configured' };

    try {
      const title = `[Phase] ${phase.phase_title}`;
      const body = this.formatPhaseBody(phase, parentExternalId);
      const labels = ['phase', `complexity-${phase.complexity || 'M'}`].join(',');

      const result = execSync(
        `gh issue create --repo "${repo}" --title "${this.escapeQuotes(title)}" --body "${this.escapeQuotes(body)}" --label "${labels}"`,
        { encoding: 'utf8' }
      );

      const url = result.trim();
      const issueNumber = url.match(/\/issues\/(\d+)/)?.[1];

      return {
        success: true,
        external_id: issueNumber,
        url,
      };
    } catch (e) {
      return { success: false, external_id: null, url: null, error: e.message };
    }
  }

  async createTaskItem(task, parentExternalId = null) {
    // For GitHub, tasks are typically checklist items in the parent issue
    // Rather than separate issues. We update the parent instead.
    const repo = this.getRepo();
    if (!repo || !parentExternalId) {
      return { success: false, error: 'Repository or parent not configured' };
    }

    try {
      const comment = `### Task Added\n- [ ] ${task.content}`;
      execSync(
        `gh issue comment ${parentExternalId} --repo "${repo}" --body "${this.escapeQuotes(comment)}"`,
        { stdio: 'pipe' }
      );
      return { success: true, external_id: parentExternalId, url: null };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async updateTaskStatus(externalId, status) {
    const repo = this.getRepo();
    if (!repo) return { success: false, error: 'Repository not configured' };

    try {
      if (status === 'completed') {
        execSync(`gh issue close ${externalId} --repo "${repo}"`, { stdio: 'pipe' });
      } else if (status === 'in_progress') {
        // Reopen if closed
        execSync(`gh issue reopen ${externalId} --repo "${repo}"`, { stdio: 'pipe' });
      }
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

    // Sync epics
    if (localData.epics) {
      for (const epic of localData.epics) {
        try {
          if (epic.external_links?.github?.issue_number) {
            // Update existing
            await this.updateEpic(epic.external_links.github.issue_number, {
              body: this.formatEpicBody(epic),
            });
            result.updated.push({ type: 'epic', id: epic.epic_id });
          } else {
            // Create new
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
      // Fetch epics
      const epics = await this.listEpics(options);
      result.items = epics.map(issue => ({
        type: 'epic',
        external_id: issue.number,
        title: issue.title.replace('[Epic] ', ''),
        status: issue.state === 'OPEN' ? 'active' : 'completed',
        url: issue.url,
        labels: issue.labels,
      }));
      result.success = true;
    } catch (e) {
      result.errors.push(this.formatError(e, 'syncFromExternal'));
    }

    return result;
  }

  async postComment(externalId, comment) {
    const repo = this.getRepo();
    if (!repo) return { success: false, error: 'Repository not configured' };

    try {
      execSync(
        `gh issue comment ${externalId} --repo "${repo}" --body "${this.escapeQuotes(comment)}"`,
        { stdio: 'pipe' }
      );
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ========================================
  // FORMATTING HELPERS
  // ========================================

  formatEpicBody(epic) {
    let body = `## ${epic.title}\n\n`;

    if (epic.business_objective) {
      body += `### Business Objective\n${epic.business_objective}\n\n`;
    }

    if (epic.success_criteria?.length > 0) {
      body += `### Success Criteria\n`;
      epic.success_criteria.forEach(c => {
        body += `- [ ] ${c}\n`;
      });
      body += '\n';
    }

    if (epic.scope?.in?.length > 0) {
      body += `### In Scope\n`;
      epic.scope.in.forEach(s => {
        body += `- ${s}\n`;
      });
      body += '\n';
    }

    if (epic.scope?.out?.length > 0) {
      body += `### Out of Scope\n`;
      epic.scope.out.forEach(s => {
        body += `- ${s}\n`;
      });
      body += '\n';
    }

    if (epic.roadmaps?.length > 0) {
      body += `### Roadmaps\n`;
      body += `- ${epic.roadmaps.length} roadmap(s) linked\n\n`;
    }

    // Progress tracking
    body += `---\n`;
    body += `**Progress:** ${epic.progress?.completion_percentage || 0}%\n`;
    body += `**Status:** ${epic.status || 'backlog'}\n`;
    body += `**Priority:** ${epic.priority || 'P2'}\n`;

    return body;
  }

  formatRoadmapBody(roadmap, epicExternalId) {
    let body = `## ${roadmap.title}\n\n`;

    if (epicExternalId) {
      body += `**Part of Epic:** #${epicExternalId}\n\n`;
    }

    if (roadmap.description) {
      body += `${roadmap.description}\n\n`;
    }

    if (roadmap.phases?.length > 0) {
      body += `### Phases\n`;
      roadmap.phases.forEach((p, i) => {
        const status = p.status === 'completed' ? '[x]' : '[ ]';
        body += `- ${status} Phase ${i + 1}: ${p.phase_title || 'Untitled'}\n`;
      });
      body += '\n';
    }

    body += `---\n`;
    body += `**Progress:** ${roadmap.progress?.completion_percentage || 0}%\n`;

    return body;
  }

  formatPhaseBody(phase, parentExternalId) {
    let body = `## ${phase.phase_title}\n\n`;

    if (parentExternalId) {
      body += `**Part of:** #${parentExternalId}\n\n`;
    }

    if (phase.goal) {
      body += `### Goal\n${phase.goal}\n\n`;
    }

    if (phase.outputs?.length > 0) {
      body += `### Deliverables\n`;
      phase.outputs.forEach(o => {
        body += `- [ ] ${o}\n`;
      });
      body += '\n';
    }

    body += `---\n`;
    body += `**Complexity:** ${phase.complexity || 'M'}\n`;
    body += `**Status:** ${phase.status || 'pending'}\n`;

    return body;
  }

  escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}

/**
 * Create GitHub adapter instance
 */
export function createGitHubAdapter(config) {
  return new GitHubAdapter(config);
}
