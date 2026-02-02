/**
 * VDB Board Sync Module
 *
 * Bidirectional sync with project management boards:
 * - GitHub Projects (via GraphQL API)
 * - Jira (via REST API)
 * - Local JSON (offline mode)
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

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

/**
 * GitHub Projects Adapter
 * Uses gh CLI for API access (avoids token management)
 */
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

/**
 * Jira Adapter
 */
export class JiraAdapter {
  constructor(config, projectRoot) {
    this.config = config;
    this.projectRoot = projectRoot;
    this.baseUrl = config.baseUrl;
    this.projectKey = config.projectKey;
  }

  async fetchState() {
    // Jira API implementation
    const email = process.env.JIRA_EMAIL;
    const token = process.env.JIRA_API_TOKEN;

    if (!email || !token) {
      throw new Error('JIRA_EMAIL and JIRA_API_TOKEN required');
    }

    const auth = Buffer.from(`${email}:${token}`).toString('base64');

    const response = await fetch(
      `${this.baseUrl}/rest/api/3/search?jql=project=${this.projectKey} AND type=Epic`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      epics: data.issues.map(issue => this.parseJiraEpic(issue)),
      source: 'jira'
    };
  }

  parseJiraEpic(issue) {
    return {
      epic_id: issue.key,
      slug: issue.key.toLowerCase(),
      title: issue.fields.summary,
      description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
      status: this.mapJiraStatus(issue.fields.status.name),
      priority: this.mapJiraPriority(issue.fields.priority?.name),
      type: 'feature',
      external_links: {
        jira: {
          key: issue.key,
          url: `${this.baseUrl}/browse/${issue.key}`
        }
      },
      phases: [],
      source: 'jira'
    };
  }

  mapJiraStatus(status) {
    const map = {
      'To Do': 'pending', 'In Progress': 'in_progress', 'Done': 'completed', 'Blocked': 'blocked'
    };
    return map[status] || 'pending';
  }

  mapJiraPriority(priority) {
    const map = {
      'Highest': 'P0', 'High': 'P1', 'Medium': 'P2', 'Low': 'P3', 'Lowest': 'P4'
    };
    return map[priority] || 'P2';
  }

  async updateStatus(task, status, metadata) {
    // Implement Jira status transition
    return { success: false, error: 'Jira update not yet implemented' };
  }

  async postProgress(task, progress) {
    // Implement Jira comment
    return { success: false, error: 'Jira progress not yet implemented' };
  }

  async createEpic(epicData) {
    return { success: false, error: 'Jira epic creation not yet implemented' };
  }
}

/**
 * Local JSON Adapter
 */
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

export default BoardSync;
