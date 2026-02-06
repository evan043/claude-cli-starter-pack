/**
 * GitHub Projects Adapter
 * Uses gh CLI for API access (avoids token management)
 */

import { execSync } from 'child_process';

export class GitHubProjectAdapter {
  constructor(config, projectRoot) {
    this.config = config;
    this.projectRoot = projectRoot;
    this.owner = config.owner;
    this.repo = config.repo;
    this.projectNumber = config.projectNumber;
  }

  /**
   * Fetch state from GitHub
   */
  async fetchState() {
    const epics = [];

    // Fetch issues labeled as epics
    const epicLabel = this.config.labels?.epic || 'epic';
    const issues = this.ghCli(`issue list --repo ${this.owner}/${this.repo} --label "${epicLabel}" --json number,title,body,state,labels,assignees --limit 100`);

    for (const issue of issues) {
      const epic = this.parseEpicFromIssue(issue);
      if (epic) {
        // Fetch phases (child issues)
        epic.phases = await this.fetchPhases(epic);
        epics.push(epic);
      }
    }

    // If using Project Board, fetch from there too
    if (this.projectNumber) {
      const projectItems = await this.fetchProjectItems();
      this.enrichEpicsFromProject(epics, projectItems);
    }

    return { epics, source: 'github' };
  }

  /**
   * Fetch phases for an epic
   */
  async fetchPhases(epic) {
    const phaseLabel = this.config.labels?.phase || 'phase-dev';
    const epicSlug = epic.slug || `epic-${epic.github_issue}`;

    // Search for phase issues linked to this epic
    const issues = this.ghCli(
      `issue list --repo ${this.owner}/${this.repo} --label "${phaseLabel}" --label "epic:${epicSlug}" --json number,title,body,state,labels --limit 50`
    );

    return issues.map(issue => this.parsePhaseFromIssue(issue));
  }

  /**
   * Fetch items from GitHub Project
   */
  async fetchProjectItems() {
    if (!this.projectNumber) return [];

    try {
      const items = this.ghCli(
        `project item-list ${this.projectNumber} --owner ${this.owner} --format json --limit 200`
      );
      return items.items || items || [];
    } catch {
      return [];
    }
  }

  /**
   * Enrich epics with project board data
   */
  enrichEpicsFromProject(epics, projectItems) {
    for (const item of projectItems) {
      const issueNumber = item.content?.number;
      if (!issueNumber) continue;

      const epic = epics.find(e => e.github_issue === issueNumber);
      if (epic) {
        // Extract custom field values
        epic.project_item_id = item.id;
        if (item.status) epic.project_status = item.status;
        if (item.priority) epic.priority = this.mapPriority(item.priority);
      }
    }
  }

  /**
   * Parse epic from GitHub issue
   */
  parseEpicFromIssue(issue) {
    // Extract metadata from issue body
    const metadata = this.parseIssueBody(issue.body);

    return {
      epic_id: metadata.epic_id || `github-${issue.number}`,
      slug: metadata.slug || `epic-${issue.number}`,
      title: issue.title,
      description: metadata.description || '',
      status: this.mapIssueState(issue.state),
      type: metadata.type || 'feature',
      priority: metadata.priority || 'P2',
      github_issue: issue.number,
      external_links: {
        github: {
          issue_number: issue.number,
          url: `https://github.com/${this.owner}/${this.repo}/issues/${issue.number}`
        }
      },
      phases: [],
      source: 'github'
    };
  }

  /**
   * Parse phase from GitHub issue
   */
  parsePhaseFromIssue(issue) {
    const metadata = this.parseIssueBody(issue.body);

    return {
      phase_id: metadata.phase_id || `phase-${issue.number}`,
      phase_title: issue.title,
      goal: metadata.goal || '',
      status: this.mapIssueState(issue.state),
      complexity: metadata.complexity || 'M',
      github_issue_number: issue.number,
      inputs: metadata.inputs || {},
      outputs: metadata.outputs || [],
      dependencies: metadata.dependencies || []
    };
  }

  /**
   * Parse structured data from issue body
   */
  parseIssueBody(body) {
    if (!body) return {};

    const metadata = {};

    // Look for YAML front matter or JSON block
    const yamlMatch = body.match(/```yaml\n([\s\S]*?)\n```/);
    const jsonMatch = body.match(/```json\n([\s\S]*?)\n```/);

    if (jsonMatch) {
      try {
        Object.assign(metadata, JSON.parse(jsonMatch[1]));
      } catch { /* ignore */ }
    }

    // Look for key: value patterns
    const patterns = [
      /epic_id:\s*(\S+)/,
      /phase_id:\s*(\S+)/,
      /slug:\s*(\S+)/,
      /complexity:\s*([SML])/i,
      /priority:\s*(P[0-4])/i,
      /type:\s*(\w+)/
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match) {
        const key = pattern.source.split(':')[0].replace(/[\\(]/g, '');
        metadata[key] = match[1];
      }
    }

    return metadata;
  }

  /**
   * Update issue status
   */
  async updateStatus(task, status, metadata = {}) {
    const issueNumber = task.metadata?.github_issue || task.github_issue_number;
    if (!issueNumber) {
      return { success: false, error: 'No GitHub issue number' };
    }

    const labels = this.config.labels || {};

    // Update labels based on status
    const labelsToRemove = [labels.inProgress, labels.completed, labels.blocked].filter(Boolean);
    const labelToAdd = status === 'completed' ? labels.completed :
                       status === 'blocked' ? labels.blocked :
                       status === 'in_progress' ? labels.inProgress : null;

    try {
      // Remove old status labels
      for (const label of labelsToRemove) {
        try {
          this.ghCli(`issue edit ${issueNumber} --repo ${this.owner}/${this.repo} --remove-label "${label}"`, true);
        } catch { /* label might not exist */ }
      }

      // Add new status label
      if (labelToAdd) {
        this.ghCli(`issue edit ${issueNumber} --repo ${this.owner}/${this.repo} --add-label "${labelToAdd}"`);
      }

      // Close issue if completed
      if (status === 'completed') {
        this.ghCli(`issue close ${issueNumber} --repo ${this.owner}/${this.repo}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Post progress comment
   */
  async postProgress(task, progress) {
    const issueNumber = task.metadata?.github_issue || task.github_issue_number;
    if (!issueNumber) {
      return { success: false, error: 'No GitHub issue number' };
    }

    const bar = this.generateProgressBar(progress.percentage);
    const comment = `## 🤖 Vision Driver Bot - Progress Update

\`\`\`
[${bar}] ${progress.percentage}%
\`\`\`

**Phase:** ${task.phase_title}
**Tasks:** ${progress.completedTasks}/${progress.totalTasks}
**Status:** ${progress.status}

${progress.lastAction ? `**Last Action:** ${progress.lastAction}` : ''}
${progress.error ? `**Error:** ${progress.error}` : ''}

---
_Automated by Vision Driver Bot_`;

    try {
      this.ghCli(`issue comment ${issueNumber} --repo ${this.owner}/${this.repo} --body "${this.escapeForShell(comment)}"`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create epic issue
   */
  async createEpic(epicData) {
    const labels = [
      this.config.labels?.epic || 'epic',
      this.config.labels?.vdbManaged || 'vdb-managed'
    ].join(',');

    const body = `## ${epicData.title}

${epicData.description || ''}

---

\`\`\`json
${JSON.stringify({
  epic_id: epicData.epic_id,
  slug: epicData.slug,
  type: epicData.type,
  priority: epicData.priority
}, null, 2)}
\`\`\`

---
_Created by Vision Driver Bot_`;

    try {
      const result = this.ghCli(
        `issue create --repo ${this.owner}/${this.repo} --title "${this.escapeForShell(epicData.title)}" --body "${this.escapeForShell(body)}" --label "${labels}" --json number,url`
      );

      return {
        success: true,
        issue_number: result.number,
        url: result.url
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute gh CLI command
   */
  ghCli(command, ignoreErrors = false) {
    try {
      const result = execSync(`gh ${command}`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Try to parse as JSON
      try {
        return JSON.parse(result);
      } catch {
        return result.trim();
      }
    } catch (error) {
      if (ignoreErrors) return null;
      throw new Error(`gh CLI error: ${error.message}`);
    }
  }

  mapIssueState(state) {
    return state === 'OPEN' || state === 'open' ? 'active' : 'completed';
  }

  mapPriority(priority) {
    const map = {
      'Urgent': 'P0', 'High': 'P1', 'Medium': 'P2', 'Low': 'P3', 'None': 'P4'
    };
    return map[priority] || 'P2';
  }

  generateProgressBar(percentage) {
    const filled = Math.round(percentage / 5);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
  }

  escapeForShell(str) {
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/`/g, '\\`');
  }
}
