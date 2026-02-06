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
