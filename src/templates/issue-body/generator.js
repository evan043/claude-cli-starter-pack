/**
 * Main issue body generation functions
 */

import { getTypeAcceptanceCriteria } from '../issue-types.js';
import { generateCCSAPMeta } from '../issue-metadata.js';
import { generateFilesSection } from '../generated-files-section.js';
import { generateTypeSpecificSection } from './planning.js';
import { generateCodeAnalysisSection, generateApiStatusSection } from './code-analysis.js';
import {
  generateTodoSection,
  generateTestingSection,
  generateAgentRecommendationSection,
} from './sections.js';

/**
 * Generate a comprehensive issue body
 * @param {Object} data - Issue data
 * @param {string} [data.issueType='feature'] - One of: feature, refactor, bug, testing
 * @param {Array<{name: string, type: string, path: string}>} [data.generatedFiles] - Files to display in Generated Files section
 * @param {Object} [data.metadata] - CCASP-META fields (source, slug, phase, task, progressFile)
 * @param {string} data.description - Problem statement/description
 * @param {string} [data.expectedBehavior] - Expected behavior (for bugs)
 * @param {string} [data.actualBehavior] - Actual behavior (for bugs)
 * @param {Array<string>} [data.acceptanceCriteria] - Acceptance criteria (uses type defaults if empty)
 * @param {Object} [data.codeAnalysis] - Code analysis details
 * @param {Object} [data.apiStatus] - API status details
 * @param {Array<string>} [data.references] - Reference documents
 * @param {Array<Object>} [data.todoList] - Todo items
 * @param {Array<Object>} [data.testScenarios] - Test scenarios
 * @param {string} [data.priority] - Issue priority
 * @param {Array<string>} [data.labels] - GitHub labels
 * @param {Object} [data.agentRecommendation] - Agent recommendation details
 * @returns {string} Formatted issue body markdown
 */
export function generateIssueBody(data) {
  const {
    description,
    expectedBehavior,
    actualBehavior,
    acceptanceCriteria = [],
    codeAnalysis = {},
    apiStatus = {},
    references = [],
    todoList = [],
    testScenarios = [],
    priority,
    labels = [],
    agentRecommendation = null,
    issueType = 'feature',
    generatedFiles = null,
    metadata = null,
  } = data;

  const sections = [];

  // CCASP-META at the very top (if provided)
  if (metadata) {
    try {
      const metaBlock = generateCCSAPMeta({
        source: metadata.source,
        slug: metadata.slug,
        phase: metadata.phase,
        task: metadata.task,
        progressFile: metadata.progressFile,
        issueType: metadata.issueType || issueType,
        createdAt: metadata.createdAt,
        lastSynced: metadata.lastSynced,
      });
      sections.push(metaBlock);
    } catch (error) {
      console.error('Error generating CCASP-META:', error.message);
    }
  }

  // Problem Statement
  sections.push(`## Problem Statement\n\n${description}`);

  // Type-specific sections
  const typeSpecificSection = generateTypeSpecificSection(issueType, data);
  if (typeSpecificSection) {
    sections.push(typeSpecificSection);
  }

  // Expected vs Actual (for bugs)
  if (expectedBehavior || actualBehavior) {
    sections.push(`## Expected vs Actual Behavior

**Expected**: ${expectedBehavior || 'N/A'}
**Actual**: ${actualBehavior || 'N/A'}`);
  }

  // Acceptance Criteria (use type-specific defaults if none provided)
  const finalCriteria = acceptanceCriteria.length > 0
    ? acceptanceCriteria
    : getTypeAcceptanceCriteria(issueType);

  if (finalCriteria.length > 0) {
    const criteria = finalCriteria
      .map((c) => `- [ ] ${c}`)
      .join('\n');
    sections.push(`## Acceptance Criteria\n\n${criteria}`);
  }

  // Code Analysis
  if (codeAnalysis.relevantFiles?.length > 0 || codeAnalysis.keyFunctions?.length > 0) {
    sections.push(generateCodeAnalysisSection(codeAnalysis));
  }

  // API Status (for full-stack features)
  if (apiStatus.layers?.length > 0) {
    sections.push(generateApiStatusSection(apiStatus));
  }

  // Reference Documents
  if (references.length > 0) {
    const refList = references.map((r) => `- ${r}`).join('\n');
    sections.push(`## Reference Documents\n\n${refList}`);
  }

  // Recommended Approach / Todo List
  if (todoList.length > 0) {
    sections.push(generateTodoSection(todoList));
  }

  // Testing
  if (testScenarios.length > 0) {
    sections.push(generateTestingSection(testScenarios));
  }

  // Agent Recommendation
  if (agentRecommendation) {
    sections.push(generateAgentRecommendationSection(agentRecommendation));
  }

  // Generated Files Section (before footer)
  if (generatedFiles && generatedFiles.length > 0) {
    const filesSection = generateFilesSection(generatedFiles, {
      source: metadata?.source || '/phase-dev-plan',
      project: metadata?.slug || 'project',
      phase: metadata?.phase ? `Phase ${metadata.phase}` : null,
    });
    sections.push(filesSection);
  }

  // Metadata footer
  sections.push(`---
*Created by GitHub Task Kit*`);

  return sections.join('\n\n---\n\n');
}

/**
 * Generate a simple issue body (minimal template)
 */
export function generateSimpleIssueBody(data) {
  const { description, acceptanceCriteria = [] } = data;

  let body = `## Description\n\n${description}`;

  if (acceptanceCriteria.length > 0) {
    body += '\n\n## Acceptance Criteria\n\n';
    body += acceptanceCriteria.map((c) => `- [ ] ${c}`).join('\n');
  }

  body += '\n\n---\n*Created by GitHub Task Kit*';

  return body;
}
