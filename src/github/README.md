# GitHub Integration Modules

This directory contains modules for managing GitHub issues across the CCASP hierarchy.

## Modules

### client.js
Core GitHub CLI wrapper with safe command execution.

**Key Functions:**
- `createIssue(owner, repo, options)` - Create GitHub issue
- `addIssueComment(owner, repo, issueNumber, body)` - Add comment to issue
- `updateIssueBody(owner, repo, issueNumber, body)` - Update issue body
- `closeIssue(owner, repo, issueNumber, comment)` - Close issue with comment
- `getIssue(owner, repo, issueNumber)` - Get issue details

### issue-hierarchy-manager.js
Ensures GitHub issues exist at all hierarchy levels (Epic → Roadmap → Plan).

**Key Functions:**
- `ensureHierarchyIssues(projectRoot, level, slug)` - Main entry point
- `ensureEpicIssue(projectRoot, epicSlug, epicData, githubConfig)` - Create/verify epic issue
- `ensureRoadmapIssue(projectRoot, roadmapSlug, roadmapData, githubConfig, epicContext)` - Create/verify roadmap issue
- `ensurePlanIssue(projectRoot, planSlug, progressData, githubConfig, roadmapContext, epicContext)` - Create/verify plan issue
- `generateCcaspMeta(options)` - Generate CCASP-META header
- `generateBreadcrumb(context, githubConfig)` - Generate navigation breadcrumb

**Usage:**
```javascript
import { ensureHierarchyIssues } from './src/github/issue-hierarchy-manager.js';

// Auto-create missing parent issues when starting from plan
const results = await ensureHierarchyIssues(projectRoot, 'plan', 'my-feature');
// Returns: { epic: {...}, roadmap: {...}, plan: {...}, created: ['Epic #120', 'Roadmap #123'] }
```

### issue-linker.js (NEW)
Manages parent/child relationships between GitHub issues.

**Key Functions:**
- `linkParentToChild(parentIssue, childIssue, config)` - Add child ref to parent
- `linkChildToParent(childIssue, parentIssue, config)` - Add parent ref to child
- `updateEpicWithRoadmapLinks(epicSlug, projectRoot)` - Link epic to all roadmaps
- `updateRoadmapWithPlanLinks(roadmapSlug, projectRoot)` - Link roadmap to all plans
- `ensureAllIssuesLinked(projectRoot, level, slug)` - Ensure complete hierarchy linking

**Usage:**
```javascript
import { ensureAllIssuesLinked } from './src/github/issue-linker.js';

// Link all issues starting from epic
const results = await ensureAllIssuesLinked(projectRoot, 'epic', 'epic-hierarchy-refactor');
// Returns: { success: true, epicToRoadmaps: 2, roadmapsToPlans: 5, plansToParents: 0 }

// Link plan to parent roadmap/epic
const results = await ensureAllIssuesLinked(projectRoot, 'plan', 'github-hierarchy-sync');
// Returns: { success: true, epicToRoadmaps: 0, roadmapsToPlans: 0, plansToParents: 1 }
```

### issue-body-generator.js (NEW)
Generates standardized issue bodies with CCASP-META headers and breadcrumbs.

**Key Functions:**
- `generateCcaspMeta(options)` - Generate CCASP-META header
- `generateBreadcrumb(context, githubConfig)` - Generate breadcrumb navigation
- `generateEpicBody(epicData, context)` - Generate epic issue body
- `generateRoadmapBody(roadmapData, context)` - Generate roadmap issue body
- `generatePlanBody(progressData, context)` - Generate plan issue body
- `updateIssueBody(options)` - Universal body updater

**Usage:**
```javascript
import { generatePlanBody, generateBreadcrumb } from './src/github/issue-body-generator.js';

const context = {
  epic: { slug: 'epic-hierarchy-refactor', title: 'Epic Title', github_issue: 120 },
  roadmap: { slug: 'my-roadmap', title: 'Roadmap Title', github_issue: 123 },
  githubConfig: { owner: 'myorg', repo: 'myrepo' }
};

// Generate breadcrumb only
const breadcrumb = generateBreadcrumb(context, context.githubConfig);
// Returns: "**Hierarchy:** [Epic #120](link) > [Roadmap #123](link)\n\n"

// Generate full plan body
const body = generatePlanBody(progressData, context);
// Returns complete markdown with CCASP-META, breadcrumb, phases, files table
```

### completion-commenter.js
Posts completion summary comments to GitHub issues.

**Key Functions:**
- `postCompletionComment(issueNumber, metrics, githubConfig)` - Post completion summary
- `generateCompletionMetrics(progressData)` - Calculate completion metrics

## Integration Examples

### Creating a New Plan with Full Hierarchy

```javascript
import { ensureHierarchyIssues } from './src/github/issue-hierarchy-manager.js';
import { ensureAllIssuesLinked } from './src/github/issue-linker.js';

// Step 1: Ensure all parent issues exist
const hierarchyResults = await ensureHierarchyIssues(projectRoot, 'plan', 'my-feature');

if (hierarchyResults.created.length > 0) {
  console.log('Auto-created missing issues:', hierarchyResults.created.join(', '));
}

// Step 2: Link all issues
const linkResults = await ensureAllIssuesLinked(projectRoot, 'plan', 'my-feature');
console.log(`Linked ${linkResults.plansToParents} plan to parent`);
```

### Updating Issue Body After Progress Change

```javascript
import { generatePlanBody } from './src/github/issue-body-generator.js';
import { updateIssueBody } from './src/github/client.js';

// Load updated progress data
const progressPath = path.join(projectRoot, '.claude', 'phase-plans', planSlug, 'PROGRESS.json');
const progressData = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

// Generate new body with updated progress
const body = generatePlanBody(progressData, {
  epic: epicContext,
  roadmap: roadmapContext,
  githubConfig
});

// Update GitHub issue
updateIssueBody(githubConfig.owner, githubConfig.repo, progressData.github_issue, body);
```

### Posting Milestone Comment

```javascript
import { addIssueComment } from './src/github/client.js';

const milestone = 50; // 50% completion
const comment = `## 📋 Progress Update

**Level:** Phase-Dev-Plan
**Hierarchy:** Epic #120 > Roadmap #123 > This Plan

\`\`\`
[${'█'.repeat(15)}${'░'.repeat(15)}] ${milestone}%
\`\`\`

---
_Auto-updated by CCASP Hierarchy Progress Sync_`;

addIssueComment(githubConfig.owner, githubConfig.repo, issueNumber, comment);
```

## CCASP-META Format

All GitHub issues created by CCASP include a CCASP-META HTML comment at the top:

```markdown
<!-- CCASP-META
source: /phase-dev-plan
slug: github-hierarchy-sync
issue_type: feature
progress_file: .claude/phase-plans/github-hierarchy-sync/PROGRESS.json
created_at: 2026-02-04T12:00:00.000Z
parent_type: roadmap
parent_slug: my-roadmap
parent_issue: #123
-->
```

This metadata enables:
- Machine parsing of hierarchy relationships
- Automated issue updates based on file changes
- Bidirectional navigation between parent/child issues
- Progress tracking and reporting

## Breadcrumb Format

Breadcrumbs provide clickable navigation across the hierarchy:

```markdown
**Hierarchy:** [Epic #120](https://github.com/owner/repo/issues/120) > [Roadmap #123](https://github.com/owner/repo/issues/123) > This Plan
```

Format varies by level:
- **Epic**: No breadcrumb (top level)
- **Roadmap**: `Epic #120 > This Roadmap`
- **Plan**: `Epic #120 > Roadmap #123 > This Plan`

## Progress Prefix Format

Issue titles are automatically updated with progress prefixes:

```
[0%] GitHub Issue Sync Across Hierarchy    (initial)
[25%] GitHub Issue Sync Across Hierarchy   (25% tasks complete)
[50%] GitHub Issue Sync Across Hierarchy   (50% tasks complete)
[100%] GitHub Issue Sync Across Hierarchy  (all tasks complete)
```

The prefix is automatically updated by the `hierarchy-progress-sync` hook when:
- EPIC.json changes (epic level)
- ROADMAP.json changes (roadmap level)
- PROGRESS.json changes (plan level)
- Tasks are completed via TodoWrite

## Error Handling

All modules use safe GitHub CLI execution:

```javascript
function safeGhExec(args, options = {}) {
  const defaultOptions = {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  };
  return execFileSync('gh', args, defaultOptions);
}
```

Benefits:
- No shell injection vulnerabilities
- Direct argument passing (not string interpolation)
- Proper error handling with try/catch
- Timeout protection (30s default)

## Testing

Run syntax validation:
```bash
node --check src/github/issue-linker.js
node --check src/github/issue-body-generator.js
```

Run integration tests (when available):
```bash
npm test -- tests/github-hierarchy-linking.test.js
```

## Dependencies

- `gh` CLI (v2.40+) - Must be installed and authenticated
- Node.js 18+ - For ES modules support
- `child_process.execFileSync` - For safe command execution
- `fs` and `path` - For file operations

## See Also

- `templates/hooks/hierarchy-progress-sync.template.js` - Progress tracking hook
- `templates/commands/create-github-epic.template.md` - Epic creation command
- `templates/commands/create-roadmap.template.md` - Roadmap creation command
- `templates/commands/phase-dev-plan.template.md` - Plan creation command
