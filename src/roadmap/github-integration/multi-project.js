/**
 * Multi-Project GitHub Integration
 *
 * Create and manage GitHub issues for multi-project roadmaps.
 */

import { safeCreateIssue } from '../../utils/safe-exec.js';
import { getRepoInfo } from './cli.js';
import { addProgressComment, closeIssue } from './phase-sync.js';

/**
 * Create a GitHub issue for a project within a multi-project roadmap
 * @param {Object} project - Project object
 * @param {Object} roadmap - Parent roadmap
 * @param {Object} options - Creation options
 * @returns {Object} Created issue info
 */
export async function createProjectIssue(project, roadmap, options = {}) {
  const repoInfo = getRepoInfo();
  const owner = options.owner || repoInfo?.owner;
  const repo = options.repo || repoInfo?.repo;

  if (!owner || !repo) {
    return { success: false, error: 'Could not determine repository' };
  }

  const title = `[Project] ${project.project_title}`;
  const body = generateProjectIssueBody(project, roadmap);
  const labels = ['project', `roadmap:${roadmap.slug}`, `domain:${project.domain || 'general'}`];

  if (project.complexity) {
    labels.push(`complexity:${project.complexity.toLowerCase()}`);
  }

  return safeCreateIssue({
    owner,
    repo,
    title,
    body,
    labels,
  });
}

/**
 * Generate issue body for a project with FULL phase/task breakdown
 * @param {Object} project - Project object
 * @param {Object} roadmap - Parent roadmap
 * @returns {string} Issue body markdown
 */
export function generateProjectIssueBody(project, roadmap) {
  const totalTasks = (project.phases || []).reduce(
    (sum, p) => sum + (p.tasks?.length || 0),
    0
  );

  let body = `## ${project.project_title}

**Roadmap:** ${roadmap.title}
**Project ID:** \`${project.project_id}\`
**Complexity:** ${project.complexity || 'M'}
**Domain:** ${project.domain || 'general'}
**Exploration Docs:** \`${project.exploration_path || `.claude/exploration/${  project.slug  }/`}\`

### Description
${project.description || 'No description provided.'}

---

`;

  // Add L2 findings if available
  if (project.l2_findings) {
    body += `## Codebase Analysis

### Key Code Patterns
`;

    const snippets = project.l2_findings.code_snippets || [];
    if (snippets.length > 0) {
      snippets.slice(0, 5).forEach(s => {
        body += `- **\`${s.file}\`** (lines ${s.lines?.start || '?'}-${s.lines?.end || '?'}): ${s.relevance || 'Reference'}\n`;
      });
    } else {
      body += `*No code snippets extracted.*\n`;
    }

    body += `
### Files to Modify
`;

    const modifyFiles = project.l2_findings.reference_files?.modify || [];
    if (modifyFiles.length > 0) {
      modifyFiles.forEach(f => {
        body += `- \`${f.path}\` - ${f.reason || 'Primary implementation'} (${f.complexity || 'M'})\n`;
      });
    } else {
      body += `*No files identified.*\n`;
    }

    body += `
### Recommended Agents
`;

    const delegation = project.l2_findings.agent_delegation || {};
    body += `**Primary:** ${delegation.primary_agent || 'general-implementation-agent'}\n`;

    const assignments = delegation.task_assignments || [];
    if (assignments.length > 0) {
      body += `\n| Phase | Task | Agent |\n|-------|------|-------|\n`;
      assignments.slice(0, 10).forEach(a => {
        body += `| ${a.phase} | ${a.task} | ${a.agent} |\n`;
      });
    }

    body += `
---

`;
  }

  // Add full phase breakdown
  body += `## Phase Breakdown

`;

  const phases = project.phases || [];

  if (phases.length === 0) {
    body += `*No phases defined yet. Run L2 discovery to generate phase breakdown.*\n\n`;
  } else {
    phases.forEach((phase, phaseIdx) => {
      const phaseNum = phase.id || phaseIdx + 1;
      const tasks = phase.tasks || [];

      body += `### Phase ${phaseNum}: ${phase.name || 'Untitled'}
**Objective:** ${phase.objective || phase.description || 'Not specified'}
**Complexity:** ${phase.complexity || 'M'}
**Agent:** ${phase.assigned_agent || phase.assignedAgent || 'TBD'}
**Dependencies:** ${formatDependencies(phase.dependencies)}

#### Tasks
`;

      if (tasks.length === 0) {
        body += `*No tasks defined.*\n\n`;
      } else {
        tasks.forEach((task, taskIdx) => {
          const taskId = task.id || `${phaseNum}.${taskIdx + 1}`;
          body += `- [ ] **${taskId}** ${task.title}\n`;

          // Add file info if available
          const taskFiles = task.files || {};
          const modifyFiles = taskFiles.modify || [];
          if (modifyFiles.length > 0) {
            body += `  - Files: ${modifyFiles.map(f => `\`${f.path}\``).slice(0, 3).join(', ')}\n`;
          }

          // Add agent if specified
          if (task.assigned_agent) {
            body += `  - Agent: ${task.assigned_agent}\n`;
          }

          // Add criteria summary
          const criteria = task.acceptance_criteria || [];
          if (criteria.length > 0) {
            body += `  - Criteria: ${criteria.slice(0, 2).join(', ')}\n`;
          }
        });
      }

      body += `
#### Phase ${phaseNum} Validation
`;

      const validationCriteria = phase.validation_criteria || ['All tasks complete', 'No blocking issues'];
      validationCriteria.forEach(c => {
        body += `- [ ] ${c}\n`;
      });

      body += `
---

`;
    });
  }

  // Execution checklist
  body += `## Execution Checklist
- [ ] Review exploration docs in \`${project.exploration_path || `.claude/exploration/${  project.slug  }/`}\`
- [ ] Start Phase 1
`;

  phases.forEach((p, i) => {
    body += `- [ ] Complete Phase ${i + 1} validation\n`;
  });

  body += `- [ ] Final testing (Ralph Loop if enabled)
- [ ] Close this issue with summary

---
*Part of [${roadmap.title}] roadmap*
*Exploration docs: \`${project.exploration_path || `.claude/exploration/${  project.slug  }/`}\`*
*Generated by CCASP Multi-Project Orchestration*
`;

  return body;
}

/**
 * Format dependencies for display
 */
export function formatDependencies(deps) {
  if (!deps || deps.length === 0) return 'None';
  return deps.join(', ');
}

/**
 * Create roadmap Epic AFTER all project issues are created
 * Links to all project issues
 * @param {Object} roadmap - Multi-project roadmap
 * @param {Object} options - Creation options
 * @returns {Object} Created epic info
 */
export async function createRoadmapEpicAfterProjects(roadmap, options = {}) {
  const repoInfo = getRepoInfo();
  const owner = options.owner || repoInfo?.owner;
  const repo = options.repo || repoInfo?.repo;

  if (!owner || !repo) {
    return { success: false, error: 'Could not determine repository' };
  }

  const title = `[Roadmap Epic] ${roadmap.title}`;
  const body = generateMultiProjectEpicBody(roadmap);
  const labels = ['roadmap', 'epic', 'multi-project'];

  return safeCreateIssue({
    owner,
    repo,
    title,
    body,
    labels,
  });
}

/**
 * Generate epic body for multi-project roadmap
 */
export function generateMultiProjectEpicBody(roadmap) {
  const projects = roadmap.projects || [];

  let body = `## ${roadmap.title}

**Type:** Multi-Project Roadmap
**Projects:** ${projects.length}
**Status:** ${roadmap.status || 'planning'}

`;

  if (roadmap.description) {
    body += `### Description\n\n${roadmap.description}\n\n`;
  }

  // Progress tracking
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  body += `### Progress

| Metric | Value |
|--------|-------|
| Total Projects | ${projects.length} |
| Completed | ${completedProjects} |
| Completion | ${projects.length > 0 ? Math.round((completedProjects / projects.length) * 100) : 0}% |

`;

  // Mermaid dependency graph
  if (projects.length > 1) {
    body += `### Project Dependency Graph

\`\`\`mermaid
graph LR
`;

    for (const project of projects) {
      const nodeId = project.project_id.replace(/-/g, '_');
      const statusIcon = project.status === 'completed' ? '✅' :
                        project.status === 'in_progress' ? '🔄' :
                        project.status === 'ready' ? '⬜' : '⏳';
      body += `  ${nodeId}["${statusIcon} ${project.project_title}"]\n`;
    }

    // Add links if projects have dependencies
    // (For now, projects are independent but could add inter-project deps)

    body += `\`\`\`

`;
  }

  // Project list with issue links
  body += `### Projects

`;

  for (const project of projects) {
    const statusIcon = project.status === 'completed' ? '✅' :
                      project.status === 'in_progress' ? '🔄' :
                      project.status === 'ready' ? '⬜' :
                      project.status === 'discovering' ? '🔍' : '⏳';

    const totalTasks = (project.phases || []).reduce(
      (sum, p) => sum + (p.tasks?.length || 0),
      0
    );

    body += `${statusIcon} **${project.project_title}** (${project.complexity || 'M'})\n`;
    body += `   Domain: ${project.domain || 'general'} | Tasks: ${totalTasks}\n`;

    if (project.github_issue_number) {
      body += `   Issue: #${project.github_issue_number}\n`;
    }

    body += `\n`;
  }

  // Execution config
  body += `### Execution Configuration

| Setting | Value |
|---------|-------|
| Parallel Discovery | ${roadmap.execution_config?.parallel_discovery ? 'Yes' : 'No'} |
| Sequential Execution | ${roadmap.execution_config?.sequential_execution ? 'Yes' : 'No'} |
| Ralph Loop | ${roadmap.execution_config?.ralph_loop_enabled ? 'Enabled' : 'Disabled'} |
| Testing Strategy | ${roadmap.execution_config?.testing_strategy || 'per-project'} |

---
*Generated by CCASP Multi-Project Roadmap Orchestration*
`;

  return body;
}

/**
 * Link all project issues to the roadmap Epic
 * @param {Array} projects - Projects with github_issue_number set
 * @param {number} epicNumber - Epic issue number
 * @param {Object} options - Options
 * @returns {Object} Link results
 */
export async function linkProjectsToEpic(projects, epicNumber, options = {}) {
  const results = { linked: 0, failed: 0, errors: [] };

  for (const project of projects) {
    if (!project.github_issue_number) continue;

    const comment = `Parent Epic: #${epicNumber}`;

    try {
      const success = addProgressComment(project.github_issue_number, comment, options);
      if (success) {
        results.linked++;
      } else {
        results.failed++;
      }
    } catch (e) {
      results.failed++;
      results.errors.push(`Project ${project.project_id}: ${e.message}`);
    }
  }

  return results;
}

/**
 * Update project issue with task completion
 * @param {number} issueNumber - Issue number
 * @param {Object} task - Completed task
 * @param {Object} options - Options
 * @returns {boolean} Success status
 */
export function updateProjectIssueTask(issueNumber, task, options = {}) {
  const comment = `✅ Task **${task.id}** completed: ${task.title}`;
  return addProgressComment(issueNumber, comment, options);
}

/**
 * Close project issue with summary
 * @param {number} issueNumber - Issue number
 * @param {Object} summary - Completion summary
 * @param {Object} options - Options
 * @returns {boolean} Success status
 */
export function closeProjectIssue(issueNumber, summary = {}, options = {}) {
  const completionMessage = `
## Project Completed 🎉

### Summary
${summary.message || 'Project completed successfully.'}

### Statistics
- Tasks Completed: ${summary.tasksCompleted || 'All'}
- Duration: ${summary.duration || 'Not tracked'}
- Test Results: ${summary.testResults || 'N/A'}

### Manual Testing Recommendations
${summary.manualTestingRecommendations || '- Review UI/UX\n- Test edge cases\n- Verify performance'}

---
*Closed by CCASP Multi-Project Orchestration*
`;

  return closeIssue(issueNumber, completionMessage, options);
}
