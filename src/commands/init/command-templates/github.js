/**
 * GitHub integration command templates
 * Commands for GitHub issues, project boards, and roadmap sync
 */

export const GITHUB_TEMPLATES = {
  'github-task': () => `---
description: Create GitHub issues with codebase analysis
options:
  - label: "Bug Report"
    description: "Report a bug with context"
  - label: "Feature Request"
    description: "Propose new functionality"
  - label: "Refactor Task"
    description: "Code improvement task"
---

# GitHub Task Creator

Create well-documented GitHub issues with automatic codebase analysis.

## Features

- Analyzes codebase to find relevant files
- Generates rich issue bodies with code snippets
- Adds to GitHub Project Board
- Sets appropriate labels and priority

## Usage

1. Describe the task or bug
2. Claude analyzes relevant code
3. Review generated issue body
4. Confirm to create issue

## Commands

\`\`\`bash
# Check gh CLI authentication
gh auth status

# Create issue with body
gh issue create --title "Title" --body "Body" --label "type:bug"

# Add to project board
gh project item-add <project-number> --owner <owner> --url <issue-url>
\`\`\`

## Instructions

When invoked:
1. Ask user for task description
2. Search codebase for relevant files using Grep/Glob
3. Generate comprehensive issue body with:
   - Problem description
   - Relevant code snippets
   - Suggested implementation approach
   - Acceptance criteria
4. Create issue via gh CLI
5. Add to project board if configured
`,

  'roadmap-sync': () => `---
description: Sync roadmaps with GitHub Project Board
options:
  - label: "Import Roadmap"
    description: "Create issues from ROADMAP.json"
  - label: "Sync Progress"
    description: "Update GitHub from local progress"
  - label: "Pull Status"
    description: "Fetch status from GitHub"
---

# Roadmap Integration

Bridge local roadmap files with GitHub Project Board for bidirectional sync.

## Workflow

1. Create roadmap with \`/create-roadmap\` or manually
2. Import projects as GitHub issues
3. Track progress locally
4. Sync changes to GitHub

## File Format

Roadmaps are stored as JSON:
\`\`\`json
{
  "title": "Project Roadmap",
  "projects": [
    {
      "name": "Feature X",
      "status": "in_progress",
      "github_issue": 123
    }
  ]
}
\`\`\`

## Instructions

When invoked:
1. Check for ROADMAP.json in .claude/docs/
2. Verify GitHub authentication and project access
3. Perform selected sync operation
4. Report changes made
`,
};
