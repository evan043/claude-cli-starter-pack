/**
 * Mock GitHub API for Testing
 *
 * Mocks the `gh` CLI for testing GitHub hierarchy sync without real API calls.
 * Tracks created issues, comments, edits, and closures in memory.
 */

export class MockGitHubAPI {
  constructor() {
    this.issues = new Map(); // issueNumber => { title, body, state, labels, createdAt, updatedAt }
    this.comments = new Map(); // issueNumber => [comment1, comment2, ...]
    this.edits = new Map(); // issueNumber => [{ timestamp, changes }, ...]
    this.closures = new Set(); // Set of closed issue numbers
    this.nextIssueNumber = 1;
  }

  /**
   * Reset all mock state
   */
  reset() {
    this.issues.clear();
    this.comments.clear();
    this.edits.clear();
    this.closures.clear();
    this.nextIssueNumber = 1;
  }

  /**
   * Create a new GitHub issue
   * Simulates: gh issue create --repo "owner/repo" --title "..." --body "..." --label "..."
   */
  createIssue({ owner, repo, title, body, labels = [] }) {
    const issueNumber = this.nextIssueNumber++;
    const url = `https://github.com/${owner}/${repo}/issues/${issueNumber}`;

    this.issues.set(issueNumber, {
      number: issueNumber,
      title,
      body,
      state: 'OPEN',
      labels: Array.isArray(labels) ? labels : [],
      url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.comments.set(issueNumber, []);
    this.edits.set(issueNumber, []);

    // Return URL as gh CLI would
    return url;
  }

  /**
   * Add a comment to an issue
   * Simulates: gh issue comment <number> --repo "owner/repo" --body "..."
   */
  addComment(issueNumber, body) {
    if (!this.issues.has(issueNumber)) {
      throw new Error(`Issue #${issueNumber} not found`);
    }

    const comments = this.comments.get(issueNumber) || [];
    comments.push({
      body,
      createdAt: new Date().toISOString(),
    });
    this.comments.set(issueNumber, comments);

    return { success: true };
  }

  /**
   * Edit an issue (title or body)
   * Simulates: gh issue edit <number> --repo "owner/repo" --title "..." --body "..."
   */
  editIssue(issueNumber, changes) {
    if (!this.issues.has(issueNumber)) {
      throw new Error(`Issue #${issueNumber} not found`);
    }

    const issue = this.issues.get(issueNumber);
    const edits = this.edits.get(issueNumber) || [];

    const edit = {
      timestamp: new Date().toISOString(),
      changes: {},
    };

    if (changes.title !== undefined) {
      edit.changes.title = { from: issue.title, to: changes.title };
      issue.title = changes.title;
    }

    if (changes.body !== undefined) {
      edit.changes.body = { from: issue.body, to: changes.body };
      issue.body = changes.body;
    }

    if (changes.labels !== undefined) {
      edit.changes.labels = { from: [...issue.labels], to: changes.labels };
      issue.labels = changes.labels;
    }

    issue.updatedAt = new Date().toISOString();
    edits.push(edit);

    this.issues.set(issueNumber, issue);
    this.edits.set(issueNumber, edits);

    return { success: true };
  }

  /**
   * Close an issue
   * Simulates: gh issue close <number> --repo "owner/repo" --comment "..."
   */
  closeIssue(issueNumber, comment = null) {
    if (!this.issues.has(issueNumber)) {
      throw new Error(`Issue #${issueNumber} not found`);
    }

    const issue = this.issues.get(issueNumber);
    issue.state = 'CLOSED';
    issue.updatedAt = new Date().toISOString();

    this.issues.set(issueNumber, issue);
    this.closures.add(issueNumber);

    if (comment) {
      this.addComment(issueNumber, comment);
    }

    return { success: true };
  }

  /**
   * Get issue details
   * Simulates: gh issue view <number> --repo "owner/repo" --json number,title,body,state,labels,url
   */
  getIssue(issueNumber) {
    if (!this.issues.has(issueNumber)) {
      return null;
    }

    return this.issues.get(issueNumber);
  }

  /**
   * Get all created issues
   */
  getCreatedIssues() {
    return Array.from(this.issues.values());
  }

  /**
   * Get comments for an issue
   */
  getIssueComments(issueNumber) {
    return this.comments.get(issueNumber) || [];
  }

  /**
   * Get edit history for an issue
   */
  getIssueEdits(issueNumber) {
    return this.edits.get(issueNumber) || [];
  }

  /**
   * Get all closed issues
   */
  getClosedIssues() {
    return Array.from(this.closures);
  }

  /**
   * Check if an issue is closed
   */
  isIssueClosed(issueNumber) {
    return this.closures.has(issueNumber);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalIssues: this.issues.size,
      openIssues: Array.from(this.issues.values()).filter(i => i.state === 'OPEN').length,
      closedIssues: this.closures.size,
      totalComments: Array.from(this.comments.values()).reduce((sum, comments) => sum + comments.length, 0),
      totalEdits: Array.from(this.edits.values()).reduce((sum, edits) => sum + edits.length, 0),
    };
  }

  /**
   * Get issues by label
   */
  getIssuesByLabel(label) {
    return Array.from(this.issues.values()).filter(issue =>
      issue.labels.includes(label)
    );
  }

  /**
   * Search issue body for text
   */
  searchIssueBody(issueNumber, searchText) {
    const issue = this.getIssue(issueNumber);
    if (!issue) return false;
    return issue.body.includes(searchText);
  }

  /**
   * Parse CCASP-META from issue body
   */
  parseCcaspMeta(issueNumber) {
    const issue = this.getIssue(issueNumber);
    if (!issue) return null;

    const metaMatch = issue.body.match(/<!-- CCASP-META\n([\s\S]*?)\n-->/);
    if (!metaMatch) return null;

    const metaContent = metaMatch[1];
    const meta = {};

    metaContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        meta[key.trim()] = valueParts.join(':').trim();
      }
    });

    return meta;
  }

  /**
   * Check if issue has parent link in body
   */
  hasParentLink(issueNumber, parentNumber) {
    const issue = this.getIssue(issueNumber);
    if (!issue) return false;
    return issue.body.includes(`#${parentNumber}`);
  }

  /**
   * Mock execFileSync for gh CLI commands
   * Returns a function that can be used to replace child_process.execFileSync
   */
  createExecMock() {
    return (command, args, options) => {
      if (command !== 'gh') {
        throw new Error(`Unexpected command: ${command}`);
      }

      const [subcommand, action, ...rest] = args;

      if (subcommand === 'issue' && action === 'create') {
        // Parse create arguments
        let owner, repo, title, body, labels = [];
        for (let i = 0; i < rest.length; i++) {
          if (rest[i] === '--repo') {
            [owner, repo] = rest[++i].split('/');
          } else if (rest[i] === '--title') {
            title = rest[++i];
          } else if (rest[i] === '--body') {
            body = rest[++i];
          } else if (rest[i] === '--label') {
            labels = rest[++i].split(',');
          }
        }

        return this.createIssue({ owner, repo, title, body, labels });
      }

      if (subcommand === 'issue' && action === 'comment') {
        // Parse comment arguments
        const issueNumber = parseInt(rest[0], 10);
        let body;
        for (let i = 1; i < rest.length; i++) {
          if (rest[i] === '--body') {
            body = rest[++i];
          }
        }

        this.addComment(issueNumber, body);
        return '';
      }

      if (subcommand === 'issue' && action === 'edit') {
        // Parse edit arguments
        const issueNumber = parseInt(rest[0], 10);
        const changes = {};
        for (let i = 1; i < rest.length; i++) {
          if (rest[i] === '--title') {
            changes.title = rest[++i];
          } else if (rest[i] === '--body') {
            changes.body = rest[++i];
          }
        }

        this.editIssue(issueNumber, changes);
        return '';
      }

      if (subcommand === 'issue' && action === 'close') {
        // Parse close arguments
        const issueNumber = parseInt(rest[0], 10);
        let comment = null;
        for (let i = 1; i < rest.length; i++) {
          if (rest[i] === '--comment') {
            comment = rest[++i];
          }
        }

        this.closeIssue(issueNumber, comment);
        return '';
      }

      if (subcommand === 'issue' && action === 'view') {
        // Parse view arguments
        const issueNumber = parseInt(rest[0], 10);
        const issue = this.getIssue(issueNumber);
        if (!issue) {
          throw new Error(`Issue not found: ${issueNumber}`);
        }
        return JSON.stringify(issue);
      }

      throw new Error(`Unsupported gh command: ${subcommand} ${action}`);
    };
  }
}

/**
 * Create a mock GitHub API instance
 */
export function createMockGitHubAPI() {
  return new MockGitHubAPI();
}

/**
 * Helper to inject mock into issue-hierarchy-manager
 * Returns a patched version of execFileSync
 */
export function patchExecFileSync(mockApi) {
  return mockApi.createExecMock();
}

export default {
  MockGitHubAPI,
  createMockGitHubAPI,
  patchExecFileSync,
};
