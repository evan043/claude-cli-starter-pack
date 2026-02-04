/**
 * Issue Type Templates
 *
 * Defines 4 core issue types with their unique sections, labels, and validation rules.
 * Used by issue template generation and GitHub integration commands.
 */

/**
 * Issue type definitions
 * @typedef {Object} IssueType
 * @property {string} name - Display name
 * @property {string[]} sections - Section names to include in issue body
 * @property {string[]} defaultLabels - GitHub labels to apply
 * @property {string[]} acceptanceCriteria - Default acceptance criteria suggestions
 * @property {string[]} requiredFields - Fields that must be provided
 */

/**
 * Core issue type templates
 * @type {Object.<string, IssueType>}
 */
export const ISSUE_TYPES = {
  feature: {
    name: 'Feature Request',
    sections: [
      'User Story',
      'API Contract',
      'Implementation Plan',
      'Acceptance Criteria',
      'Testing Strategy',
    ],
    defaultLabels: ['feature', 'enhancement'],
    acceptanceCriteria: [
      'Feature implemented according to requirements',
      'UI matches design specifications (if applicable)',
      'Unit tests added for new functionality',
      'Integration tests cover happy path and edge cases',
      'API documentation updated (OpenAPI/Swagger)',
      'User-facing documentation updated',
      'Code review approved by at least one team member',
      'Accessibility requirements met (WCAG 2.1 AA)',
    ],
    requiredFields: ['userStory', 'apiContract', 'implementationPlan'],
  },

  refactor: {
    name: 'Code Refactoring',
    sections: [
      'Current State',
      'Target State',
      'Code Smells',
      'Affected Files',
      'Migration Steps',
      'Risk Assessment',
    ],
    defaultLabels: ['refactor', 'technical-debt'],
    acceptanceCriteria: [
      'Code refactored without changing external behavior',
      'All existing tests still pass (100% green)',
      'Code follows project style guidelines and conventions',
      'No new warnings or errors introduced',
      'Code complexity metrics improved (cyclomatic complexity, LOC)',
      'Performance benchmarks maintained or improved',
      'Documentation updated to reflect new structure',
      'Migration path documented for dependent code',
    ],
    requiredFields: ['currentState', 'targetState', 'affectedFiles'],
  },

  bug: {
    name: 'Bug Report',
    sections: [
      'Problem Statement',
      'Expected vs Actual',
      'Root Cause',
      'Evidence',
      'Solution Options',
      'Regression Tests',
    ],
    defaultLabels: ['bug', 'needs-triage'],
    acceptanceCriteria: [
      'Bug is reproducible and root cause identified',
      'Fix implemented and tested locally',
      'No regression in related functionality',
      'Error handling covers edge cases',
      'Regression test added to prevent future occurrences',
      'Fix verified in staging environment',
      'Monitoring/alerts added if applicable',
      'Root cause documented for knowledge base',
    ],
    requiredFields: ['problemStatement', 'expectedBehavior', 'actualBehavior'],
  },

  testing: {
    name: 'Testing Task',
    sections: [
      'Test Scope',
      'Coverage Gaps',
      'Test Scenarios Matrix',
      'Test Data Requirements',
      'Environment Setup',
    ],
    defaultLabels: ['testing', 'qa'],
    acceptanceCriteria: [
      'Test coverage increased to target percentage',
      'All identified test scenarios implemented',
      'Tests pass in CI/CD pipeline',
      'Test data fixtures created and documented',
      'Edge cases and error paths covered',
      'Performance tests added for critical paths',
      'Test documentation updated',
      'Flaky tests identified and fixed or marked',
    ],
    requiredFields: ['testScope', 'coverageGaps', 'testScenarios'],
  },
};

/**
 * Get issue type configuration
 * @param {string} typeName - Type name (feature, refactor, bug, testing)
 * @returns {IssueType} Type configuration, defaults to feature if not found
 */
export function getIssueType(typeName) {
  const normalizedType = typeName?.toLowerCase().trim();
  return ISSUE_TYPES[normalizedType] || ISSUE_TYPES.feature;
}

/**
 * Get sections for an issue type
 * @param {string} typeName - Type name
 * @returns {string[]} Array of section names
 */
export function getTypeSections(typeName) {
  const type = getIssueType(typeName);
  return type.sections || [];
}

/**
 * Get default labels for an issue type
 * @param {string} typeName - Type name
 * @returns {string[]} Array of GitHub label names
 */
export function getTypeLabels(typeName) {
  const type = getIssueType(typeName);
  return type.defaultLabels || [];
}

/**
 * Get acceptance criteria suggestions for an issue type
 * @param {string} typeName - Type name
 * @returns {string[]} Array of acceptance criteria strings
 */
export function getTypeAcceptanceCriteria(typeName) {
  const type = getIssueType(typeName);
  return type.acceptanceCriteria || [];
}

/**
 * Get required fields for an issue type
 * @param {string} typeName - Type name
 * @returns {string[]} Array of required field names
 */
export function getRequiredFields(typeName) {
  const type = getIssueType(typeName);
  return type.requiredFields || [];
}

/**
 * Validate issue data against type requirements
 * @param {string} typeName - Type name
 * @param {Object} data - Issue data to validate
 * @returns {{valid: boolean, missing: string[]}} Validation result
 */
export function validateIssueData(typeName, data) {
  const requiredFields = getRequiredFields(typeName);
  const missing = requiredFields.filter((field) => !data[field] || data[field].trim() === '');

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get all available issue type names
 * @returns {string[]} Array of type names
 */
export function getAvailableTypes() {
  return Object.keys(ISSUE_TYPES);
}

/**
 * Check if a type name is valid
 * @param {string} typeName - Type name to check
 * @returns {boolean} True if type exists
 */
export function isValidType(typeName) {
  const normalizedType = typeName?.toLowerCase().trim();
  return normalizedType in ISSUE_TYPES;
}
