/**
 * Epic Issue Operations
 */

import fs from 'fs';
import path from 'path';
import { createGitHubIssue, generateCcaspMeta } from './config.js';

/**
 * Create epic issue if it doesn't exist
 */
export async function ensureEpicIssue(projectRoot, epicSlug, epicData, githubConfig) {
  // Check if issue already exists
  if (epicData.github_epic_number) {
    return {
      success: true,
      issueNumber: epicData.github_epic_number,
      created: false,
    };
  }

  // Generate issue body
  const meta = generateCcaspMeta({
    source: '/create-github-epic',
    slug: epicSlug,
    issueType: 'epic',
    progressFile: `.claude/epics/${epicSlug}/EPIC.json`,
  });

  const roadmapList = (epicData.roadmaps || [])
    .map((r, i) => `- [ ] **Roadmap ${i + 1}:** ${r.title}`)
    .join('\n');

  const body = `${meta}
## Business Objective

${epicData.business_objective || 'N/A'}

## Roadmaps

${roadmapList || '_No roadmaps defined yet_'}

## Success Criteria

${(epicData.success_criteria || []).map(c => `- [ ] ${c}`).join('\n') || '_No success criteria defined_'}

---

**Generated Files:**
| File | Type | Path |
|------|------|------|
| Epic Definition | JSON | \`.claude/epics/${epicSlug}/EPIC.json\` |

---
_Auto-created by CCASP GitHub Issue Hierarchy Manager_`;

  const result = createGitHubIssue({
    ...githubConfig,
    title: `[Epic] ${epicData.title}`,
    body,
    labels: ['epic'],
  });

  if (result.success) {
    // Update epic with issue number
    epicData.github_epic_number = result.issueNumber;
    epicData.github_epic_url = result.issueUrl;

    const epicPath = path.join(projectRoot, '.claude', 'epics', epicSlug, 'EPIC.json');
    fs.writeFileSync(epicPath, JSON.stringify(epicData, null, 2), 'utf8');

    return {
      success: true,
      issueNumber: result.issueNumber,
      created: true,
    };
  }

  return { success: false, error: result.error };
}
