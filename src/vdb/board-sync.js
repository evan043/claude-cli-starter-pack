/**
 * VDB Board Sync Module
 *
 * Bidirectional sync with project management boards:
 * - GitHub Projects (via GraphQL API)
 * - Jira (via REST API)
 * - Local JSON (offline mode)
 *
 * This file is now a wrapper for backward compatibility.
 * Implementation moved to src/vdb/board/
 */

import { BoardSync } from './board/sync.js';
import { GitHubProjectAdapter } from './board/github-adapter.js';
import { JiraAdapter } from './board/jira-adapter.js';
import { LocalAdapter } from './board/local-adapter.js';

export { BoardSync, GitHubProjectAdapter, JiraAdapter, LocalAdapter };
export default BoardSync;
