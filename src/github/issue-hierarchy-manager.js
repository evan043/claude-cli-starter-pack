/**
 * GitHub Issue Hierarchy Manager
 *
 * Ensures GitHub issues exist at all levels of the hierarchy:
 * - Epic → Roadmap → Phase-Dev-Plan
 *
 * When starting from a lower level (e.g., Phase-Dev-Plan without Roadmap),
 * this module auto-creates the missing parent issues.
 *
 * This file is a thin re-export wrapper around focused submodules.
 */

import { getGitHubConfig, createGitHubIssue, generateCcaspMeta, generateBreadcrumb } from './issue-hierarchy/config.js';
import { ensureEpicIssue } from './issue-hierarchy/epic.js';
import { ensureRoadmapIssue } from './issue-hierarchy/roadmap.js';
import { ensurePlanIssue } from './issue-hierarchy/plan.js';
import { ensureHierarchyIssues } from './issue-hierarchy/orchestrator.js';

export {
  getGitHubConfig,
  createGitHubIssue,
  generateCcaspMeta,
  generateBreadcrumb,
  ensureEpicIssue,
  ensureRoadmapIssue,
  ensurePlanIssue,
  ensureHierarchyIssues,
};

export default {
  getGitHubConfig,
  createGitHubIssue,
  generateCcaspMeta,
  generateBreadcrumb,
  ensureEpicIssue,
  ensureRoadmapIssue,
  ensurePlanIssue,
  ensureHierarchyIssues,
};
