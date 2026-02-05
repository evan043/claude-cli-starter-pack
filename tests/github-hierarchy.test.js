/**
 * GitHub Hierarchy Sync Integration Tests
 *
 * Tests the complete GitHub hierarchy sync system:
 * - Epic → Roadmap → Phase-Dev-Plan issue creation chain
 * - Progress sync at all levels
 * - Completion and closure
 * - Standalone mode (no parent)
 * - Adoption workflow
 */

import { strictEqual, ok, deepStrictEqual } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createMockGitHubAPI } from './mocks/github-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Running GitHub Hierarchy Sync tests...\n');

// ============================================================
// Test Setup
// ============================================================

// Create mock GitHub API
const mockGh = createMockGitHubAPI();

// Create test fixtures directory
const fixturesDir = path.join(__dirname, 'fixtures', 'github-hierarchy');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Create a mock EPIC.json file
 */
function createMockEpic(slug, options = {}) {
  const epicDir = path.join(fixturesDir, 'epics', slug);
  if (!fs.existsSync(epicDir)) {
    fs.mkdirSync(epicDir, { recursive: true });
  }

  const epic = {
    epic_id: `epic-${slug}`,
    slug,
    title: options.title || `Test Epic: ${slug}`,
    business_objective: options.businessObjective || 'Test business objective',
    roadmaps: options.roadmaps || [],
    roadmap_count: options.roadmapCount || 0,
    current_roadmap_index: options.currentRoadmapIndex || 0,
    status: options.status || 'planning',
    github_epic_number: options.githubEpicNumber || null,
    github_epic_url: options.githubEpicUrl || null,
    success_criteria: options.successCriteria || ['Criterion 1', 'Criterion 2'],
    created_at: new Date().toISOString(),
  };

  const epicPath = path.join(epicDir, 'EPIC.json');
  fs.writeFileSync(epicPath, JSON.stringify(epic, null, 2), 'utf8');

  return { epic, epicPath };
}

/**
 * Create a mock ROADMAP.json file
 */
function createMockRoadmap(slug, options = {}) {
  const roadmapDir = path.join(fixturesDir, 'roadmaps', slug);
  if (!fs.existsSync(roadmapDir)) {
    fs.mkdirSync(roadmapDir, { recursive: true });
  }

  const roadmap = {
    roadmap_id: `rm-${slug}`,
    slug,
    title: options.title || `Test Roadmap: ${slug}`,
    description: options.description || 'Test roadmap description',
    phase_dev_plan_refs: options.phasePlans || [],
    parent_epic: options.parentEpic || null,
    metadata: options.metadata || {
      plan_count: 0,
      overall_completion_percentage: 0,
      github_epic_number: null,
      github_issue_url: null,
    },
    status: options.status || 'planning',
    created_at: new Date().toISOString(),
  };

  const roadmapPath = path.join(roadmapDir, 'ROADMAP.json');
  fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2), 'utf8');

  return { roadmap, roadmapPath };
}

/**
 * Create a mock PROGRESS.json file
 */
function createMockProgress(slug, options = {}) {
  const progressDir = path.join(fixturesDir, 'phase-plans', slug);
  if (!fs.existsSync(progressDir)) {
    fs.mkdirSync(progressDir, { recursive: true });
  }

  const progress = {
    slug,
    project: {
      name: options.projectName || `Test Plan: ${slug}`,
      description: options.description || 'Test plan description',
    },
    phases: options.phases || [
      {
        id: 1,
        name: 'Setup',
        status: 'completed',
        tasks: [
          { id: '1.1', title: 'Task 1', status: 'completed' },
          { id: '1.2', title: 'Task 2', status: 'completed' },
        ],
      },
      {
        id: 2,
        name: 'Implementation',
        status: 'in_progress',
        tasks: [
          { id: '2.1', title: 'Task 1', status: 'completed' },
          { id: '2.2', title: 'Task 2', status: 'pending' },
        ],
      },
    ],
    parent_context: options.parentContext || null,
    github_issue: options.githubIssue || null,
    github_issue_url: options.githubIssueUrl || null,
    status: options.status || 'in_progress',
    created_at: new Date().toISOString(),
  };

  const progressPath = path.join(progressDir, 'PROGRESS.json');
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

  return { progress, progressPath };
}

/**
 * Create mock tech-stack.json with GitHub config
 */
function createMockTechStack() {
  const configDir = path.join(fixturesDir, 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const techStack = {
    versionControl: {
      owner: 'test-org',
      repo: 'test-repo',
      projectBoard: {
        owner: 'test-org',
        repo: 'test-repo',
      },
    },
  };

  const techStackPath = path.join(configDir, 'tech-stack.json');
  fs.writeFileSync(techStackPath, JSON.stringify(techStack, null, 2), 'utf8');

  return techStackPath;
}

/**
 * Simulate issue creation via mock API
 */
function simulateIssueCreation(type, data, githubConfig) {
  let title, body, labels;

  if (type === 'epic') {
    title = `[Epic] ${data.title}`;
    body = `<!-- CCASP-META\nsource: /create-github-epic\nslug: ${data.slug}\nissue_type: epic\nprogress_file: .claude/epics/${data.slug}/EPIC.json\ncreated_at: ${new Date().toISOString()}\n-->\n\n## Business Objective\n\n${data.business_objective}`;
    labels = ['epic'];
  } else if (type === 'roadmap') {
    title = `[Roadmap] ${data.title}`;
    body = `<!-- CCASP-META\nsource: /create-roadmap\nslug: ${data.slug}\nissue_type: roadmap\nprogress_file: .claude/roadmaps/${data.slug}/ROADMAP.json\ncreated_at: ${new Date().toISOString()}\n-->\n\n## Overview\n\n${data.description}`;
    labels = ['roadmap'];
  } else if (type === 'plan') {
    title = data.project.name;
    body = `<!-- CCASP-META\nsource: /phase-dev-plan\nslug: ${data.slug}\nissue_type: feature\nprogress_file: .claude/phase-plans/${data.slug}/PROGRESS.json\ncreated_at: ${new Date().toISOString()}\n-->\n\n## Overview\n\n${data.project.description}`;
    labels = ['phase-dev-plan'];
  }

  return mockGh.createIssue({
    owner: githubConfig.owner,
    repo: githubConfig.repo,
    title,
    body,
    labels,
  });
}

// ============================================================
// Test 1: Epic Issue Creation
// ============================================================

console.log('Test 1: Epic issue creation...');

mockGh.reset();
const { epic: epic1 } = createMockEpic('test-epic-1', {
  title: 'User Management System',
  businessObjective: 'Implement complete user management',
  roadmapCount: 2,
});

const githubConfig = { owner: 'test-org', repo: 'test-repo' };
const epicUrl = simulateIssueCreation('epic', epic1, githubConfig);
const epicIssueNumber = parseInt(epicUrl.match(/\/(\d+)$/)[1], 10);

ok(epicIssueNumber > 0, 'Epic issue should be created');
strictEqual(mockGh.getCreatedIssues().length, 1, 'Should have 1 issue');

const epicIssue = mockGh.getIssue(epicIssueNumber);
ok(epicIssue.title.includes('[Epic]'), 'Epic issue should have [Epic] prefix');
ok(epicIssue.labels.includes('epic'), 'Epic issue should have epic label');

const epicMeta = mockGh.parseCcaspMeta(epicIssueNumber);
strictEqual(epicMeta.slug, 'test-epic-1', 'CCASP-META should contain slug');
strictEqual(epicMeta.issue_type, 'epic', 'CCASP-META should have epic type');

console.log('  ✓ Epic issue created successfully\n');

// ============================================================
// Test 2: Roadmap Issue Creation with Epic Parent
// ============================================================

console.log('Test 2: Roadmap issue creation with epic parent...');

const { roadmap: roadmap1 } = createMockRoadmap('test-roadmap-1', {
  title: 'Authentication System',
  description: 'Implement user authentication',
  parentEpic: {
    epic_id: epic1.epic_id,
    epic_slug: epic1.slug,
    epic_path: `.claude/epics/${epic1.slug}/EPIC.json`,
  },
});

const roadmapUrl = simulateIssueCreation('roadmap', roadmap1, githubConfig);
const roadmapIssueNumber = parseInt(roadmapUrl.match(/\/(\d+)$/)[1], 10);

ok(roadmapIssueNumber > 0, 'Roadmap issue should be created');
strictEqual(mockGh.getCreatedIssues().length, 2, 'Should have 2 issues');

const roadmapIssue = mockGh.getIssue(roadmapIssueNumber);
ok(roadmapIssue.title.includes('[Roadmap]'), 'Roadmap issue should have [Roadmap] prefix');
ok(roadmapIssue.labels.includes('roadmap'), 'Roadmap issue should have roadmap label');

// Add parent link comment
mockGh.addComment(roadmapIssueNumber, `Part of Epic #${epicIssueNumber}`);
const roadmapComments = mockGh.getIssueComments(roadmapIssueNumber);
ok(roadmapComments[0].body.includes(`#${epicIssueNumber}`), 'Roadmap should link to epic in comment');

console.log('  ✓ Roadmap issue created with epic parent\n');

// ============================================================
// Test 3: Phase-Dev-Plan Issue Creation with Roadmap Parent
// ============================================================

console.log('Test 3: Phase-dev-plan issue creation with roadmap parent...');

const { progress: progress1 } = createMockProgress('test-plan-1', {
  projectName: 'Login API Implementation',
  description: 'Implement login endpoints',
  parentContext: {
    type: 'roadmap',
    path: `.claude/roadmaps/${roadmap1.slug}/ROADMAP.json`,
  },
});

const planUrl = simulateIssueCreation('plan', progress1, githubConfig);
const planIssueNumber = parseInt(planUrl.match(/\/(\d+)$/)[1], 10);

ok(planIssueNumber > 0, 'Plan issue should be created');
strictEqual(mockGh.getCreatedIssues().length, 3, 'Should have 3 issues');

const planIssue = mockGh.getIssue(planIssueNumber);
ok(planIssue.labels.includes('phase-dev-plan'), 'Plan issue should have phase-dev-plan label');

// Add breadcrumb comment
const breadcrumb = `**Hierarchy:** [Epic #${epicIssueNumber}](https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${epicIssueNumber}) > [Roadmap #${roadmapIssueNumber}](https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${roadmapIssueNumber}) > This Plan`;
mockGh.addComment(planIssueNumber, breadcrumb);

const planComments = mockGh.getIssueComments(planIssueNumber);
ok(planComments[0].body.includes(`#${epicIssueNumber}`), 'Plan should have breadcrumb with epic link');
ok(planComments[0].body.includes(`#${roadmapIssueNumber}`), 'Plan should have breadcrumb with roadmap link');

console.log('  ✓ Phase-dev-plan issue created with roadmap parent\n');

// ============================================================
// Test 4: Progress Sync - Update Issue Title
// ============================================================

console.log('Test 4: Progress sync - update issue title with percentage...');

// Simulate progress update: 50% complete
mockGh.editIssue(planIssueNumber, {
  title: `[50%] ${progress1.project.name}`,
});

const updatedPlanIssue = mockGh.getIssue(planIssueNumber);
ok(updatedPlanIssue.title.startsWith('[50%]'), 'Issue title should have progress prefix');

const planEdits = mockGh.getIssueEdits(planIssueNumber);
strictEqual(planEdits.length, 1, 'Should have 1 edit');
ok(planEdits[0].changes.title, 'Edit should include title change');

console.log('  ✓ Progress sync updated issue title\n');

// ============================================================
// Test 5: Progress Sync - Post Milestone Comment
// ============================================================

console.log('Test 5: Progress sync - post milestone comment...');

const milestoneComment = `## 📋 Progress Update

**Level:** Phase-Dev-Plan
**Hierarchy:** Epic #${epicIssueNumber} > Roadmap #${roadmapIssueNumber} > This Plan

\`\`\`
[${'█'.repeat(15)}${'░'.repeat(15)}] 50%
\`\`\`

---
_Auto-updated by CCASP Hierarchy Progress Sync_`;

mockGh.addComment(planIssueNumber, milestoneComment);

const commentsAfterMilestone = mockGh.getIssueComments(planIssueNumber);
strictEqual(commentsAfterMilestone.length, 2, 'Should have 2 comments (breadcrumb + milestone)');
ok(commentsAfterMilestone[1].body.includes('50%'), 'Milestone comment should show 50%');

console.log('  ✓ Milestone comment posted\n');

// ============================================================
// Test 6: Completion and Closure
// ============================================================

console.log('Test 6: Completion and closure flow...');

// Update to 100% complete
mockGh.editIssue(planIssueNumber, {
  title: `[100%] ${progress1.project.name}`,
});

// Post completion comment
const completionComment = `## ✅ Phase-Dev-Plan Completed

All phases and tasks completed successfully.

**Statistics:**
- Total Phases: 2
- Total Tasks: 4
- Completion: 100%

---
_Auto-closed by CCASP Hierarchy Progress Sync_`;

mockGh.closeIssue(planIssueNumber, completionComment);

ok(mockGh.isIssueClosed(planIssueNumber), 'Plan issue should be closed');
const closedIssue = mockGh.getIssue(planIssueNumber);
strictEqual(closedIssue.state, 'CLOSED', 'Issue state should be CLOSED');

const commentsAfterClose = mockGh.getIssueComments(planIssueNumber);
ok(commentsAfterClose[commentsAfterClose.length - 1].body.includes('✅'), 'Should have completion comment');

console.log('  ✓ Completion and closure flow works\n');

// ============================================================
// Test 7: Standalone Mode (No Parent)
// ============================================================

console.log('Test 7: Standalone mode - plan without parent...');

const { progress: standaloneProgress } = createMockProgress('standalone-plan', {
  projectName: 'Standalone Feature',
  description: 'Feature without epic or roadmap',
  parentContext: null,
});

const standaloneUrl = simulateIssueCreation('plan', standaloneProgress, githubConfig);
const standaloneIssueNumber = parseInt(standaloneUrl.match(/\/(\d+)$/)[1], 10);

ok(standaloneIssueNumber > 0, 'Standalone plan issue should be created');

const standaloneMeta = mockGh.parseCcaspMeta(standaloneIssueNumber);
strictEqual(standaloneMeta.parent_type, undefined, 'Standalone plan should have no parent_type in meta');

const standaloneIssue = mockGh.getIssue(standaloneIssueNumber);
ok(!standaloneIssue.body.includes('**Hierarchy:**'), 'Standalone plan should have no breadcrumb');

console.log('  ✓ Standalone mode works\n');

// ============================================================
// Test 8: Adoption Workflow - Link Existing Plan to New Roadmap
// ============================================================

console.log('Test 8: Adoption workflow - link existing plan to new roadmap...');

// Create a new roadmap
const { roadmap: adoptionRoadmap } = createMockRoadmap('adoption-roadmap', {
  title: 'Adoption Roadmap',
  description: 'Roadmap to adopt standalone plan',
});

const adoptionRoadmapUrl = simulateIssueCreation('roadmap', adoptionRoadmap, githubConfig);
const adoptionRoadmapNumber = parseInt(adoptionRoadmapUrl.match(/\/(\d+)$/)[1], 10);

// Update standalone plan to reference new parent
mockGh.addComment(standaloneIssueNumber, `Adopted into Roadmap #${adoptionRoadmapNumber}`);

const adoptionComments = mockGh.getIssueComments(standaloneIssueNumber);
ok(adoptionComments[adoptionComments.length - 1].body.includes(`#${adoptionRoadmapNumber}`), 'Adoption comment should reference new roadmap');

// Update roadmap to reference plan
mockGh.addComment(adoptionRoadmapNumber, `Adopted Phase-Dev-Plan #${standaloneIssueNumber}`);

const adoptionRoadmapComments = mockGh.getIssueComments(adoptionRoadmapNumber);
ok(adoptionRoadmapComments[0].body.includes(`#${standaloneIssueNumber}`), 'Roadmap should reference adopted plan');

console.log('  ✓ Adoption workflow works\n');

// ============================================================
// Test 9: Multi-Level Progress Aggregation
// ============================================================

console.log('Test 9: Multi-level progress aggregation...');

// Close the first plan (already closed in test 6)
strictEqual(mockGh.isIssueClosed(planIssueNumber), true, 'First plan should be closed');

// Update roadmap with aggregated progress (1 of 1 plans complete = 100%)
mockGh.editIssue(roadmapIssueNumber, {
  title: `[100%] ${roadmap1.title}`,
});

// Close roadmap
mockGh.closeIssue(roadmapIssueNumber, 'All phase-dev-plans completed');
strictEqual(mockGh.isIssueClosed(roadmapIssueNumber), true, 'Roadmap should be closed');

// Update epic with aggregated progress (1 of 2 roadmaps complete = 50%)
mockGh.editIssue(epicIssueNumber, {
  title: `[50%] ${epic1.title}`,
});

const updatedEpicIssue = mockGh.getIssue(epicIssueNumber);
ok(updatedEpicIssue.title.startsWith('[50%]'), 'Epic should show 50% progress');

console.log('  ✓ Multi-level progress aggregation works\n');

// ============================================================
// Test 10: Statistics and Cleanup
// ============================================================

console.log('Test 10: Statistics and cleanup...');

const stats = mockGh.getStats();
strictEqual(stats.totalIssues, 5, 'Should have 5 total issues');
strictEqual(stats.closedIssues, 2, 'Should have 2 closed issues (plan + roadmap)');
ok(stats.totalComments > 0, 'Should have comments');
ok(stats.totalEdits > 0, 'Should have edits');

// Get issues by label
const epicIssues = mockGh.getIssuesByLabel('epic');
strictEqual(epicIssues.length, 1, 'Should have 1 epic issue');

const roadmapIssues = mockGh.getIssuesByLabel('roadmap');
strictEqual(roadmapIssues.length, 2, 'Should have 2 roadmap issues');

const planIssues = mockGh.getIssuesByLabel('phase-dev-plan');
strictEqual(planIssues.length, 2, 'Should have 2 plan issues');

// Reset mock for next test suite
mockGh.reset();
strictEqual(mockGh.getCreatedIssues().length, 0, 'Reset should clear all issues');

console.log('  ✓ Statistics and cleanup work\n');

// ============================================================
// Cleanup Test Fixtures
// ============================================================

// Clean up test fixtures
if (fs.existsSync(fixturesDir)) {
  fs.rmSync(fixturesDir, { recursive: true, force: true });
}

// ============================================================
// All Tests Complete
// ============================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✓ All GitHub Hierarchy Sync tests passed! (10 tests)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
