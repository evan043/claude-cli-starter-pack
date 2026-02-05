/**
 * Planning/phase section generators
 */

import { getIssueType } from '../issue-types.js';

/**
 * Generate type-specific sections based on issue type
 * @param {string} issueType - One of: feature, refactor, bug, testing
 * @param {Object} data - Issue data containing type-specific fields
 * @returns {string|null} Markdown section or null if no type-specific content
 */
export function generateTypeSpecificSection(issueType, data) {
  const type = getIssueType(issueType);
  const sections = type.sections || [];
  const parts = [];

  // Feature-specific sections
  if (issueType === 'feature') {
    if (data.userStory) {
      parts.push(`## User Story\n\n${data.userStory}`);
    }
    if (data.apiContract) {
      parts.push(`## API Contract\n\n${data.apiContract}`);
    }
    if (data.implementationPlan) {
      parts.push(`## Implementation Plan\n\n${data.implementationPlan}`);
    }
  }

  // Refactor-specific sections
  if (issueType === 'refactor') {
    if (data.currentState) {
      parts.push(`## Current State\n\n${data.currentState}`);
    }
    if (data.targetState) {
      parts.push(`## Target State\n\n${data.targetState}`);
    }
    if (data.codeSmells) {
      parts.push(`## Code Smells\n\n${data.codeSmells}`);
    }
    if (data.affectedFiles && data.affectedFiles.length > 0) {
      const fileList = data.affectedFiles.map((f) => `- \`${f}\``).join('\n');
      parts.push(`## Affected Files\n\n${fileList}`);
    }
    if (data.migrationSteps) {
      parts.push(`## Migration Steps\n\n${data.migrationSteps}`);
    }
    if (data.riskAssessment) {
      parts.push(`## Risk Assessment\n\n${data.riskAssessment}`);
    }
  }

  // Bug-specific sections
  if (issueType === 'bug') {
    if (data.rootCause) {
      parts.push(`## Root Cause\n\n${data.rootCause}`);
    }
    if (data.evidence) {
      parts.push(`## Evidence\n\n${data.evidence}`);
    }
    if (data.solutionOptions) {
      parts.push(`## Solution Options\n\n${data.solutionOptions}`);
    }
    if (data.regressionTests) {
      parts.push(`## Regression Tests\n\n${data.regressionTests}`);
    }
  }

  // Testing-specific sections
  if (issueType === 'testing') {
    if (data.testScope) {
      parts.push(`## Test Scope\n\n${data.testScope}`);
    }
    if (data.coverageGaps) {
      parts.push(`## Coverage Gaps\n\n${data.coverageGaps}`);
    }
    if (data.testScenariosMatrix) {
      parts.push(`## Test Scenarios Matrix\n\n${data.testScenariosMatrix}`);
    }
    if (data.testDataRequirements) {
      parts.push(`## Test Data Requirements\n\n${data.testDataRequirements}`);
    }
    if (data.environmentSetup) {
      parts.push(`## Environment Setup\n\n${data.environmentSetup}`);
    }
  }

  return parts.length > 0 ? parts.join('\n\n---\n\n') : null;
}
