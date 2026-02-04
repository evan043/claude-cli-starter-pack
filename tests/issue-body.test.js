/**
 * Issue Body Template Tests
 *
 * Tests for src/templates/issue-*.js modules:
 * - issue-types.js (type configurations and validation)
 * - issue-metadata.js (CCASP-META generation and parsing)
 * - generated-files-section.js (file table generation)
 * - issue-body.js (backwards compatibility)
 */

import { strictEqual, ok, deepStrictEqual, throws } from 'assert';

// Import issue-types.js
import {
  ISSUE_TYPES,
  getIssueType,
  getTypeSections,
  getTypeLabels,
  getTypeAcceptanceCriteria,
  getRequiredFields,
  validateIssueData,
  getAvailableTypes,
  isValidType,
} from '../src/templates/issue-types.js';

// Import issue-metadata.js
import {
  generateCCSAPMeta,
  parseCCSAPMeta,
  updateCCSAPMeta,
  hasCCSAPMeta,
  extractCCSAPMetaBlock,
} from '../src/templates/issue-metadata.js';

// Import generated-files-section.js
import {
  generateFilesSection,
  generateFilesList,
  formatFilePath,
  createFileObject,
  generateCompactFilesSection,
  generateGroupedFilesSection,
  generateFileLinksSection,
} from '../src/templates/generated-files-section.js';

// Import issue-body.js for backwards compatibility testing
import { generateIssueBody } from '../src/templates/issue-body.js';

console.log('Running issue body template tests...\n');

// ============================================================
// Test Group 1: Issue Types (issue-types.js)
// ============================================================

console.log('Test 1: Issue Types - All 4 types exist...');

ok(ISSUE_TYPES.feature, 'Feature type should exist');
ok(ISSUE_TYPES.refactor, 'Refactor type should exist');
ok(ISSUE_TYPES.bug, 'Bug type should exist');
ok(ISSUE_TYPES.testing, 'Testing type should exist');

strictEqual(Object.keys(ISSUE_TYPES).length, 4, 'Should have exactly 4 issue types');

console.log('  ✓ All 4 issue types exist\n');

// ============================================================
// Test 2: Issue Types - getIssueType() returns correct config
// ============================================================

console.log('Test 2: getIssueType() returns correct config...');

const featureType = getIssueType('feature');
strictEqual(featureType.name, 'Feature Request', 'Feature type name should match');
ok(Array.isArray(featureType.sections), 'Feature should have sections array');
ok(Array.isArray(featureType.defaultLabels), 'Feature should have defaultLabels array');

const bugType = getIssueType('bug');
strictEqual(bugType.name, 'Bug Report', 'Bug type name should match');

console.log('  ✓ getIssueType() returns correct config\n');

// ============================================================
// Test 3: Issue Types - getTypeSections() returns correct sections
// ============================================================

console.log('Test 3: getTypeSections() returns correct sections...');

const featureSections = getTypeSections('feature');
ok(featureSections.includes('User Story'), 'Feature should include User Story section');
ok(featureSections.includes('API Contract'), 'Feature should include API Contract section');
ok(featureSections.includes('Implementation Plan'), 'Feature should include Implementation Plan section');

const refactorSections = getTypeSections('refactor');
ok(refactorSections.includes('Current State'), 'Refactor should include Current State section');
ok(refactorSections.includes('Target State'), 'Refactor should include Target State section');

console.log('  ✓ getTypeSections() returns correct sections\n');

// ============================================================
// Test 4: Issue Types - getTypeLabels() returns correct labels
// ============================================================

console.log('Test 4: getTypeLabels() returns correct labels...');

const featureLabels = getTypeLabels('feature');
ok(featureLabels.includes('feature'), 'Feature should have "feature" label');
ok(featureLabels.includes('enhancement'), 'Feature should have "enhancement" label');

const bugLabels = getTypeLabels('bug');
ok(bugLabels.includes('bug'), 'Bug should have "bug" label');
ok(bugLabels.includes('needs-triage'), 'Bug should have "needs-triage" label');

const testingLabels = getTypeLabels('testing');
ok(testingLabels.includes('testing'), 'Testing should have "testing" label');
ok(testingLabels.includes('qa'), 'Testing should have "qa" label');

console.log('  ✓ getTypeLabels() returns correct labels\n');

// ============================================================
// Test 5: Issue Types - getTypeAcceptanceCriteria() returns suggestions
// ============================================================

console.log('Test 5: getTypeAcceptanceCriteria() returns suggestions...');

const featureCriteria = getTypeAcceptanceCriteria('feature');
ok(Array.isArray(featureCriteria), 'Should return array');
ok(featureCriteria.length > 0, 'Feature should have acceptance criteria');
ok(featureCriteria.some((c) => c.includes('test')), 'Feature criteria should mention testing');

const refactorCriteria = getTypeAcceptanceCriteria('refactor');
ok(refactorCriteria.some((c) => c.includes('behavior')), 'Refactor criteria should mention behavior preservation');

console.log('  ✓ getTypeAcceptanceCriteria() returns suggestions\n');

// ============================================================
// Test 6: Issue Types - Fallback to feature for unknown types
// ============================================================

console.log('Test 6: Issue Types - Fallback to feature for unknown types...');

const unknownType = getIssueType('nonexistent');
strictEqual(unknownType.name, 'Feature Request', 'Unknown type should fallback to feature');

const nullType = getIssueType(null);
strictEqual(nullType.name, 'Feature Request', 'Null type should fallback to feature');

const undefinedType = getIssueType();
strictEqual(undefinedType.name, 'Feature Request', 'Undefined type should fallback to feature');

console.log('  ✓ Fallback to feature for unknown types works\n');

// ============================================================
// Test 7: Issue Types - getAvailableTypes() and isValidType()
// ============================================================

console.log('Test 7: getAvailableTypes() and isValidType()...');

const availableTypes = getAvailableTypes();
strictEqual(availableTypes.length, 4, 'Should return 4 types');
ok(availableTypes.includes('feature'), 'Should include feature');
ok(availableTypes.includes('bug'), 'Should include bug');
ok(availableTypes.includes('refactor'), 'Should include refactor');
ok(availableTypes.includes('testing'), 'Should include testing');

strictEqual(isValidType('feature'), true, 'feature should be valid');
strictEqual(isValidType('bug'), true, 'bug should be valid');
strictEqual(isValidType('nonexistent'), false, 'nonexistent should be invalid');
strictEqual(isValidType(null), false, 'null should be invalid');

console.log('  ✓ getAvailableTypes() and isValidType() work correctly\n');

// ============================================================
// Test 8: Issue Types - validateIssueData()
// ============================================================

console.log('Test 8: validateIssueData() validates required fields...');

const validFeatureData = {
  userStory: 'As a user...',
  apiContract: 'GET /api/users',
  implementationPlan: 'Step 1: Create component',
};

const featureValidation = validateIssueData('feature', validFeatureData);
strictEqual(featureValidation.valid, true, 'Valid feature data should pass');
strictEqual(featureValidation.missing.length, 0, 'Should have no missing fields');

const invalidFeatureData = {
  userStory: 'As a user...',
  // Missing apiContract and implementationPlan
};

const invalidValidation = validateIssueData('feature', invalidFeatureData);
strictEqual(invalidValidation.valid, false, 'Invalid feature data should fail');
ok(invalidValidation.missing.includes('apiContract'), 'Should identify missing apiContract');
ok(invalidValidation.missing.includes('implementationPlan'), 'Should identify missing implementationPlan');

console.log('  ✓ validateIssueData() validates required fields\n');

// ============================================================
// Test 9: Issue Metadata - generateCCSAPMeta() produces valid HTML comment
// ============================================================

console.log('Test 9: generateCCSAPMeta() produces valid HTML comment...');

const meta = generateCCSAPMeta({
  source: '/phase-dev-plan',
  slug: 'auth-system',
  phase: 2,
  task: '2.3',
  progressFile: '.claude/docs/auth-system/PROGRESS.json',
  issueType: 'feature',
});

ok(meta.startsWith('<!-- CCASP-META'), 'Should start with CCASP-META comment');
ok(meta.endsWith('-->'), 'Should end with comment close');
ok(meta.includes('source: /phase-dev-plan'), 'Should include source');
ok(meta.includes('slug: auth-system'), 'Should include slug');
ok(meta.includes('phase: 2'), 'Should include phase');
ok(meta.includes('task: 2.3'), 'Should include task');
ok(meta.includes('issue_type: feature'), 'Should include issue type');
ok(meta.includes('created_at:'), 'Should include created_at timestamp');

console.log('  ✓ generateCCSAPMeta() produces valid HTML comment\n');

// ============================================================
// Test 10: Issue Metadata - All required fields are included
// ============================================================

console.log('Test 10: Issue Metadata - All required fields are included...');

throws(
  () => generateCCSAPMeta({ slug: 'test', progressFile: 'path', issueType: 'feature' }),
  /source is required/,
  'Should require source field'
);

throws(
  () => generateCCSAPMeta({ source: '/test', progressFile: 'path', issueType: 'feature' }),
  /slug is required/,
  'Should require slug field'
);

throws(
  () => generateCCSAPMeta({ source: '/test', slug: 'test', issueType: 'feature' }),
  /progressFile is required/,
  'Should require progressFile field'
);

throws(
  () => generateCCSAPMeta({ source: '/test', slug: 'test', progressFile: 'path' }),
  /issueType is required/,
  'Should require issueType field'
);

throws(
  () => generateCCSAPMeta({ source: '/test', slug: 'test', progressFile: 'path', issueType: 'invalid' }),
  /issueType must be one of/,
  'Should validate issueType value'
);

console.log('  ✓ All required fields are validated\n');

// ============================================================
// Test 11: Issue Metadata - parseCCSAPMeta() extracts metadata correctly
// ============================================================

console.log('Test 11: parseCCSAPMeta() extracts metadata correctly...');

const issueBody = `# Test Issue

<!-- CCASP-META
source: /phase-dev-plan
slug: auth-system
phase: 2
task: 2.3
progress_file: .claude/docs/auth-system/PROGRESS.json
issue_type: feature
created_at: 2024-01-15T10:00:00.000Z
-->

This is the issue description.`;

const parsed = parseCCSAPMeta(issueBody);

ok(parsed, 'Should parse metadata');
strictEqual(parsed.source, '/phase-dev-plan', 'Should extract source');
strictEqual(parsed.slug, 'auth-system', 'Should extract slug');
strictEqual(parsed.phase, 2, 'Should extract phase as number');
strictEqual(parsed.task, '2.3', 'Should extract task');
strictEqual(parsed.issue_type, 'feature', 'Should extract issue_type');
strictEqual(parsed.created_at, '2024-01-15T10:00:00.000Z', 'Should extract created_at');

console.log('  ✓ parseCCSAPMeta() extracts metadata correctly\n');

// ============================================================
// Test 12: Issue Metadata - updateCCSAPMeta() updates fields without losing others
// ============================================================

console.log('Test 12: updateCCSAPMeta() updates fields without losing others...');

const originalBody = `# Test Issue

<!-- CCASP-META
source: /phase-dev-plan
slug: auth-system
phase: 2
task: 2.3
progress_file: .claude/docs/auth-system/PROGRESS.json
issue_type: feature
created_at: 2024-01-15T10:00:00.000Z
-->

Issue content here.`;

const updatedBody = updateCCSAPMeta(originalBody, {
  phase: 3,
  last_synced: '2024-01-16T12:00:00.000Z',
});

const updatedParsed = parseCCSAPMeta(updatedBody);

strictEqual(updatedParsed.phase, 3, 'Phase should be updated');
strictEqual(updatedParsed.last_synced, '2024-01-16T12:00:00.000Z', 'last_synced should be added');
strictEqual(updatedParsed.source, '/phase-dev-plan', 'Original source should be preserved');
strictEqual(updatedParsed.slug, 'auth-system', 'Original slug should be preserved');
strictEqual(updatedParsed.task, '2.3', 'Original task should be preserved');

console.log('  ✓ updateCCSAPMeta() updates fields without losing others\n');

// ============================================================
// Test 13: Issue Metadata - Null handling for missing metadata
// ============================================================

console.log('Test 13: Issue Metadata - Null handling for missing metadata...');

const bodyWithoutMeta = `# Test Issue

This is an issue without CCASP-META.`;

const noMeta = parseCCSAPMeta(bodyWithoutMeta);
strictEqual(noMeta, null, 'Should return null for missing metadata');

const hasMeta1 = hasCCSAPMeta(bodyWithoutMeta);
strictEqual(hasMeta1, false, 'hasCCSAPMeta should return false');

const hasMeta2 = hasCCSAPMeta(issueBody);
strictEqual(hasMeta2, true, 'hasCCSAPMeta should return true for valid metadata');

const extractedBlock = extractCCSAPMetaBlock(issueBody);
ok(extractedBlock.startsWith('<!-- CCASP-META'), 'Should extract block');
ok(extractedBlock.endsWith('-->'), 'Extracted block should end properly');

const noBlock = extractCCSAPMetaBlock(bodyWithoutMeta);
strictEqual(noBlock, null, 'Should return null for missing block');

console.log('  ✓ Null handling for missing metadata works\n');

// ============================================================
// Test 14: Issue Metadata - updateCCSAPMeta() error handling
// ============================================================

console.log('Test 14: Issue Metadata - updateCCSAPMeta() error handling...');

throws(
  () => updateCCSAPMeta(bodyWithoutMeta, { phase: 3 }),
  /no CCASP-META block found/,
  'Should throw if no metadata exists'
);

throws(
  () => updateCCSAPMeta(null, { phase: 3 }),
  /issueBody must be a non-empty string/,
  'Should throw for null issueBody'
);

throws(
  () => updateCCSAPMeta(issueBody, null),
  /updates must be an object/,
  'Should throw for null updates'
);

console.log('  ✓ updateCCSAPMeta() error handling works\n');

// ============================================================
// Test 15: Generated Files Section - generateFilesSection() produces valid markdown table
// ============================================================

console.log('Test 15: generateFilesSection() produces valid markdown table...');

const files = [
  { name: 'Progress Tracking', type: 'JSON', path: '.claude/docs/auth-system/PROGRESS.json' },
  { name: 'Exploration Summary', type: 'MD', path: '.claude/exploration/auth-system/EXPLORATION_SUMMARY.md' },
];

const section = generateFilesSection(files, {
  source: '/phase-dev-plan',
  project: 'auth-system',
  phase: 'Phase 2',
});

ok(section.includes('## 📁 Source & Generated Files'), 'Should have section header');
ok(section.includes('| File | Type | Path |'), 'Should have table header');
ok(section.includes('|------|------|------|'), 'Should have table separator');
ok(section.includes('Progress Tracking'), 'Should include file name');
ok(section.includes('JSON'), 'Should include file type');
ok(section.includes('`.claude/docs/auth-system/PROGRESS.json`'), 'Should include formatted path');
ok(section.includes('Project: `auth-system`'), 'Should include project name');
ok(section.includes('Phase 2'), 'Should include phase');

console.log('  ✓ generateFilesSection() produces valid markdown table\n');

// ============================================================
// Test 16: Generated Files Section - generateFilesList() returns all standard files
// ============================================================

console.log('Test 16: generateFilesList() returns all standard files...');

const filesList = generateFilesList('auth-system');

ok(Array.isArray(filesList), 'Should return array');
ok(filesList.length >= 8, 'Should have at least 8 standard files (6 exploration + 2 docs)');

const hasProgress = filesList.some((f) => f.name === 'Progress Tracking');
const hasExploration = filesList.some((f) => f.name === 'Exploration Summary');
const hasCodeSnippets = filesList.some((f) => f.name === 'Code Snippets');
const hasReferenceFiles = filesList.some((f) => f.name === 'Reference Files');
const hasAgentDelegation = filesList.some((f) => f.name === 'Agent Delegation');
const hasPhaseBreakdown = filesList.some((f) => f.name === 'Phase Breakdown');
const hasFindings = filesList.some((f) => f.name === 'Findings');
const hasExecutiveSummary = filesList.some((f) => f.name === 'Executive Summary');

ok(hasProgress, 'Should include Progress Tracking');
ok(hasExploration, 'Should include Exploration Summary');
ok(hasCodeSnippets, 'Should include Code Snippets');
ok(hasReferenceFiles, 'Should include Reference Files');
ok(hasAgentDelegation, 'Should include Agent Delegation');
ok(hasPhaseBreakdown, 'Should include Phase Breakdown');
ok(hasFindings, 'Should include Findings');
ok(hasExecutiveSummary, 'Should include Executive Summary');

console.log('  ✓ generateFilesList() returns all 8 standard files\n');

// ============================================================
// Test 17: Generated Files Section - formatFilePath() converts absolute to relative
// ============================================================

console.log('Test 17: formatFilePath() converts absolute to relative...');

const relativePath = formatFilePath('.claude/docs/plan.md');
strictEqual(relativePath, '`.claude/docs/plan.md`', 'Should wrap relative path in backticks');

// Test Windows path normalization
const windowsPath = formatFilePath('.claude\\docs\\plan.md');
strictEqual(windowsPath, '`.claude/docs/plan.md`', 'Should normalize Windows backslashes to forward slashes');

console.log('  ✓ formatFilePath() converts absolute to relative\n');

// ============================================================
// Test 18: Generated Files Section - Custom files can be added
// ============================================================

console.log('Test 18: Generated Files Section - Custom files can be added...');

const customFiles = [
  createFileObject('Test Plan', 'MD', '.claude/docs/auth-system/TEST_PLAN.md'),
  createFileObject('API Spec', 'YAML', '.claude/docs/auth-system/API_SPEC.yaml'),
];

const filesWithCustom = generateFilesList('auth-system', {
  includeExploration: true,
  includeDocs: true,
  customFiles,
});

ok(filesWithCustom.length > 8, 'Should have more than standard files');
const hasTestPlan = filesWithCustom.some((f) => f.name === 'Test Plan');
const hasApiSpec = filesWithCustom.some((f) => f.name === 'API Spec');

ok(hasTestPlan, 'Should include custom Test Plan');
ok(hasApiSpec, 'Should include custom API Spec');

console.log('  ✓ Custom files can be added\n');

// ============================================================
// Test 19: Generated Files Section - createFileObject() helper
// ============================================================

console.log('Test 19: createFileObject() helper...');

const fileObj = createFileObject('Test File', 'TXT', '/path/to/file.txt');

strictEqual(fileObj.name, 'Test File', 'Should have name property');
strictEqual(fileObj.type, 'TXT', 'Should have type property');
strictEqual(fileObj.path, '/path/to/file.txt', 'Should have path property');

console.log('  ✓ createFileObject() helper works\n');

// ============================================================
// Test 20: Generated Files Section - Compact section variant
// ============================================================

console.log('Test 20: generateCompactFilesSection()...');

const compactSection = generateCompactFilesSection(files, {
  title: 'Related Documentation',
});

ok(compactSection.includes('### Related Documentation'), 'Should have custom title');
ok(compactSection.includes('- **Progress Tracking**'), 'Should use bullet list format');
ok(compactSection.includes('(JSON)'), 'Should include file type in line');

console.log('  ✓ generateCompactFilesSection() works\n');

// ============================================================
// Test 21: Generated Files Section - Grouped section variant
// ============================================================

console.log('Test 21: generateGroupedFilesSection()...');

const groupedSection = generateGroupedFilesSection('auth-system', {
  source: '/phase-dev-plan',
  customFiles: [createFileObject('Custom File', 'MD', '.claude/custom.md')],
});

ok(groupedSection.includes('### 📊 Documentation'), 'Should have Documentation group');
ok(groupedSection.includes('### 🔍 Exploration Artifacts'), 'Should have Exploration group');
ok(groupedSection.includes('### 📋 Additional Files'), 'Should have Additional Files group');
ok(groupedSection.includes('Custom File'), 'Should include custom file');

console.log('  ✓ generateGroupedFilesSection() works\n');

// ============================================================
// Test 22: Generated Files Section - File links section
// ============================================================

console.log('Test 22: generateFileLinksSection()...');

const linksSection = generateFileLinksSection('auth-system', {
  baseUrl: 'https://github.com/user/repo/blob',
  branch: 'main',
});

ok(linksSection.includes('### 📄 Related Files'), 'Should have section title');
ok(linksSection.includes('[Progress Tracking]'), 'Should have markdown link');
ok(linksSection.includes('https://github.com/user/repo/blob/main/'), 'Should include base URL');

const linksWithoutUrl = generateFileLinksSection('auth-system');
ok(linksWithoutUrl.includes('`.claude/'), 'Should show paths without URLs if no baseUrl');

console.log('  ✓ generateFileLinksSection() works\n');

// ============================================================
// Test 23: Backwards Compatibility - generateIssueBody() without new params
// ============================================================

console.log('Test 23: Backwards Compatibility - generateIssueBody() without new params...');

const simpleIssue = generateIssueBody({
  description: 'This is a test issue',
});

ok(simpleIssue.includes('## Problem Statement'), 'Should include Problem Statement');
ok(simpleIssue.includes('This is a test issue'), 'Should include description');
ok(simpleIssue.includes('Created by GitHub Task Kit'), 'Should include footer');

console.log('  ✓ generateIssueBody() works without new params\n');

// ============================================================
// Test 24: Backwards Compatibility - generateIssueBody() with metadata and generatedFiles
// ============================================================

console.log('Test 24: generateIssueBody() with metadata and generatedFiles...');

const fullIssue = generateIssueBody({
  description: 'Full-featured test issue',
  issueType: 'feature',
  metadata: {
    source: '/phase-dev-plan',
    slug: 'auth-system',
    phase: 2,
    task: '2.3',
    progressFile: '.claude/docs/auth-system/PROGRESS.json',
    issueType: 'feature',
  },
  generatedFiles: [
    { name: 'Test File', type: 'MD', path: '.claude/test.md' },
  ],
  acceptanceCriteria: ['Custom criterion 1', 'Custom criterion 2'],
});

ok(fullIssue.includes('<!-- CCASP-META'), 'Should include CCASP-META');
ok(fullIssue.includes('## 📁 Source & Generated Files'), 'Should include generated files section');
ok(fullIssue.includes('Test File'), 'Should include custom file');
ok(fullIssue.includes('Custom criterion 1'), 'Should include custom acceptance criteria');

console.log('  ✓ generateIssueBody() with metadata and generatedFiles works\n');

// ============================================================
// Test 25: Backwards Compatibility - Default values are applied correctly
// ============================================================

console.log('Test 25: Default values are applied correctly...');

const issueWithDefaults = generateIssueBody({
  description: 'Test with defaults',
  issueType: 'bug',
  // No acceptance criteria provided - should use type defaults
});

ok(issueWithDefaults.includes('## Acceptance Criteria'), 'Should include acceptance criteria section');
ok(issueWithDefaults.includes('Bug is reproducible'), 'Should use bug type default criteria');

const featureWithDefaults = generateIssueBody({
  description: 'Feature test',
  // issueType defaults to 'feature'
});

ok(featureWithDefaults.includes('Feature implemented according to requirements'), 'Should use feature type default criteria');

console.log('  ✓ Default values are applied correctly\n');

// ============================================================
// Test 26: Type-specific sections in generateIssueBody()
// ============================================================

console.log('Test 26: Type-specific sections in generateIssueBody()...');

const featureIssue = generateIssueBody({
  description: 'Feature description',
  issueType: 'feature',
  userStory: 'As a user, I want to...',
  apiContract: 'GET /api/endpoint',
  implementationPlan: '1. Create endpoint\n2. Add tests',
});

ok(featureIssue.includes('## User Story'), 'Feature should include User Story section');
ok(featureIssue.includes('As a user, I want to...'), 'Should include user story content');
ok(featureIssue.includes('## API Contract'), 'Feature should include API Contract section');
ok(featureIssue.includes('GET /api/endpoint'), 'Should include API contract content');

const bugIssue = generateIssueBody({
  description: 'Bug description',
  issueType: 'bug',
  expectedBehavior: 'Should work correctly',
  actualBehavior: 'Crashes',
  rootCause: 'Null pointer exception',
});

ok(bugIssue.includes('## Expected vs Actual Behavior'), 'Bug should include Expected vs Actual section');
ok(bugIssue.includes('Should work correctly'), 'Should include expected behavior');
ok(bugIssue.includes('Crashes'), 'Should include actual behavior');
ok(bugIssue.includes('## Root Cause'), 'Bug should include Root Cause section');
ok(bugIssue.includes('Null pointer exception'), 'Should include root cause content');

const refactorIssue = generateIssueBody({
  description: 'Refactor description',
  issueType: 'refactor',
  currentState: 'Legacy code',
  targetState: 'Modern patterns',
  affectedFiles: ['src/old.js', 'src/legacy.js'],
});

ok(refactorIssue.includes('## Current State'), 'Refactor should include Current State section');
ok(refactorIssue.includes('Legacy code'), 'Should include current state content');
ok(refactorIssue.includes('## Target State'), 'Refactor should include Target State section');
ok(refactorIssue.includes('Modern patterns'), 'Should include target state content');
ok(refactorIssue.includes('## Affected Files'), 'Refactor should include Affected Files section');
ok(refactorIssue.includes('`src/old.js`'), 'Should include affected files');

console.log('  ✓ Type-specific sections work in generateIssueBody()\n');

// ============================================================
// All Tests Complete
// ============================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✓ All issue body template tests passed! (26 tests)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
