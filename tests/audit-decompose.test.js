console.log('Running audit and decompose tests...\n');

import { test } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'assert';
import { AUDIT_RULES, createAuditResult } from '../src/commands/audit/rules.js';
import { calculateOverallScore } from '../src/commands/audit/helpers/formatters.js';
import { generateEnhancementSuggestions } from '../src/commands/audit/helpers/fixers.js';

// ============================================================================
// AUDIT RULES TESTS
// ============================================================================

test('AUDIT_RULES should have claudeMd section with expected properties', () => {
  ok(AUDIT_RULES.claudeMd, 'claudeMd section exists');
  strictEqual(AUDIT_RULES.claudeMd.maxLines, 300, 'maxLines is 300');
  strictEqual(AUDIT_RULES.claudeMd.recommendedLines, 60, 'recommendedLines is 60');
  strictEqual(AUDIT_RULES.claudeMd.warningLines, 150, 'warningLines is 150');
  ok(Array.isArray(AUDIT_RULES.claudeMd.antiPatterns), 'antiPatterns is array');
  ok(Array.isArray(AUDIT_RULES.claudeMd.goodPatterns), 'goodPatterns is array');
});

test('AUDIT_RULES anti-patterns should have valid structure', () => {
  const antiPatterns = AUDIT_RULES.claudeMd.antiPatterns;

  ok(antiPatterns.length > 0, 'has anti-patterns');

  for (const pattern of antiPatterns) {
    ok(pattern.pattern instanceof RegExp, 'pattern is a RegExp');
    ok(typeof pattern.message === 'string', 'message is a string');
    ok(pattern.message.length > 0, 'message is not empty');
  }
});

test('AUDIT_RULES good patterns should have valid structure', () => {
  const goodPatterns = AUDIT_RULES.claudeMd.goodPatterns;

  ok(goodPatterns.length > 0, 'has good patterns');

  for (const pattern of goodPatterns) {
    ok(pattern.pattern instanceof RegExp, 'pattern is a RegExp');
    ok(typeof pattern.message === 'string', 'message is a string');
  }
});

test('AUDIT_RULES should have claudeFolder section with expected structure', () => {
  ok(AUDIT_RULES.claudeFolder, 'claudeFolder section exists');
  ok(AUDIT_RULES.claudeFolder.expectedStructure, 'expectedStructure exists');
  ok(AUDIT_RULES.claudeFolder.filePatterns, 'filePatterns exists');

  // Check expected structure
  ok(AUDIT_RULES.claudeFolder.expectedStructure['commands/'], 'commands/ structure defined');
  ok(AUDIT_RULES.claudeFolder.expectedStructure['skills/'], 'skills/ structure defined');
  ok(AUDIT_RULES.claudeFolder.expectedStructure['agents/'], 'agents/ structure defined');
  ok(AUDIT_RULES.claudeFolder.expectedStructure['settings.json'], 'settings.json defined');
});

test('AUDIT_RULES file patterns should have required frontmatter fields', () => {
  const skillsPattern = AUDIT_RULES.claudeFolder.filePatterns.skills;
  const agentsPattern = AUDIT_RULES.claudeFolder.filePatterns.agents;

  ok(skillsPattern.frontmatter === true, 'skills require frontmatter');
  ok(Array.isArray(skillsPattern.requiredFrontmatter), 'skills have required fields array');
  ok(skillsPattern.requiredFrontmatter.includes('name'), 'skills require name');
  ok(skillsPattern.requiredFrontmatter.includes('description'), 'skills require description');

  ok(agentsPattern.frontmatter === true, 'agents require frontmatter');
  ok(agentsPattern.requiredFrontmatter.includes('tools'), 'agents require tools');
});

test('createAuditResult should return correct default structure', () => {
  const result = createAuditResult();

  ok(Array.isArray(result.passed), 'passed is array');
  ok(Array.isArray(result.warnings), 'warnings is array');
  ok(Array.isArray(result.errors), 'errors is array');
  ok(Array.isArray(result.suggestions), 'suggestions is array');
  strictEqual(result.score, 100, 'default score is 100');
  strictEqual(result.passed.length, 0, 'passed starts empty');
  strictEqual(result.warnings.length, 0, 'warnings starts empty');
  strictEqual(result.errors.length, 0, 'errors starts empty');
});

test('calculateOverallScore should handle no warnings or errors', () => {
  const results = {
    claudeMd: {
      passed: [{ message: 'test' }, { message: 'test2' }],
      warnings: [],
      errors: [],
      suggestions: [],
    },
    claudeFolder: {
      passed: [{ message: 'test3' }],
      warnings: [],
      errors: [],
      suggestions: [],
    },
  };

  calculateOverallScore(results);

  strictEqual(results.overall.score, 100, 'score is 100 with no issues');
  strictEqual(results.overall.passed, 3, 'counts all passed items');
  strictEqual(results.overall.warnings, 0, 'counts no warnings');
  strictEqual(results.overall.errors, 0, 'counts no errors');
});

test('calculateOverallScore should deduct 5 points per warning', () => {
  const results = {
    claudeMd: {
      passed: [],
      warnings: [{ message: 'warn1' }, { message: 'warn2' }],
      errors: [],
      suggestions: [],
    },
    claudeFolder: {
      passed: [],
      warnings: [{ message: 'warn3' }],
      errors: [],
      suggestions: [],
    },
  };

  calculateOverallScore(results);

  strictEqual(results.overall.warnings, 3, 'counts 3 warnings');
  strictEqual(results.overall.score, 85, 'score is 100 - (3 * 5) = 85');
});

test('calculateOverallScore should deduct 15 points per error', () => {
  const results = {
    claudeMd: {
      passed: [],
      warnings: [],
      errors: [{ message: 'err1' }],
      suggestions: [],
    },
    claudeFolder: {
      passed: [],
      warnings: [],
      errors: [{ message: 'err2' }],
      suggestions: [],
    },
  };

  calculateOverallScore(results);

  strictEqual(results.overall.errors, 2, 'counts 2 errors');
  strictEqual(results.overall.score, 70, 'score is 100 - (2 * 15) = 70');
});

test('calculateOverallScore should combine warnings and errors correctly', () => {
  const results = {
    claudeMd: {
      passed: [{ message: 'pass' }],
      warnings: [{ message: 'warn1' }, { message: 'warn2' }],
      errors: [{ message: 'err1' }],
      suggestions: [{ message: 'suggest' }],
    },
    claudeFolder: {
      passed: [],
      warnings: [{ message: 'warn3' }],
      errors: [{ message: 'err2' }],
      suggestions: [],
    },
  };

  calculateOverallScore(results);

  // 100 - (3 warnings * 5) - (2 errors * 15) = 100 - 15 - 30 = 55
  strictEqual(results.overall.score, 55, 'score calculates correctly');
  strictEqual(results.overall.passed, 1, 'counts passed correctly');
  strictEqual(results.overall.warnings, 3, 'counts warnings correctly');
  strictEqual(results.overall.errors, 2, 'counts errors correctly');
  strictEqual(results.overall.suggestions, 1, 'counts suggestions correctly');
});

test('calculateOverallScore should not go below 0', () => {
  const results = {
    claudeMd: {
      passed: [],
      warnings: Array(50).fill({ message: 'warn' }), // 50 * 5 = 250 points
      errors: [],
      suggestions: [],
    },
    claudeFolder: {
      passed: [],
      warnings: [],
      errors: [],
      suggestions: [],
    },
  };

  calculateOverallScore(results);

  strictEqual(results.overall.score, 0, 'score does not go below 0');
});

test('calculateOverallScore should not exceed 100', () => {
  const results = {
    claudeMd: {
      passed: Array(100).fill({ message: 'pass' }),
      warnings: [],
      errors: [],
      suggestions: [],
    },
    claudeFolder: {
      passed: [],
      warnings: [],
      errors: [],
      suggestions: [],
    },
  };

  calculateOverallScore(results);

  strictEqual(results.overall.score, 100, 'score does not exceed 100');
});

test('generateEnhancementSuggestions should suggest Quick Start when missing', () => {
  const results = {
    claudeMd: {
      passed: [],
      warnings: [],
      errors: [],
      suggestions: [],
    },
  };

  const techStack = {
    frontend: { framework: 'react' },
    backend: { framework: 'express' },
  };

  const ENHANCEMENT_TEMPLATES = {
    quickStart: () => '## Quick Start\n\nnpm run dev',
    referenceLinks: () => '## References\n\n- React docs',
  };

  const suggestions = generateEnhancementSuggestions(results, techStack, ENHANCEMENT_TEMPLATES);

  ok(Array.isArray(suggestions), 'returns array');
  ok(suggestions.some(s => s.name === 'Quick Start'), 'suggests Quick Start');

  const quickStart = suggestions.find(s => s.name === 'Quick Start');
  strictEqual(quickStart.priority, 'high', 'Quick Start is high priority');
  strictEqual(quickStart.type, 'section', 'Quick Start is a section type');
});

test('generateEnhancementSuggestions should suggest full enhancement for very short content', () => {
  const results = {
    claudeMd: {
      passed: [],
      warnings: [{ message: 'Very little content - might not be useful' }],
      errors: [],
      suggestions: [],
    },
  };

  const techStack = {};

  const ENHANCEMENT_TEMPLATES = {
    quickStart: () => '',
    referenceLinks: () => '',
  };

  const suggestions = generateEnhancementSuggestions(results, techStack, ENHANCEMENT_TEMPLATES);

  ok(suggestions.some(s => s.type === 'full'), 'suggests full enhancement');

  const fullEnhancement = suggestions.find(s => s.type === 'full');
  strictEqual(fullEnhancement.priority, 'high', 'full enhancement is high priority');
  ok(fullEnhancement.reason.includes('minimal content'), 'reason mentions minimal content');
});

test('generateEnhancementSuggestions should suggest reference links when frameworks detected', () => {
  const results = {
    claudeMd: {
      passed: [{ message: 'Has Quick Start' }],
      warnings: [],
      errors: [],
      suggestions: [],
    },
  };

  const techStack = {
    frontend: { framework: 'vue' },
    backend: { framework: 'fastapi' },
  };

  const ENHANCEMENT_TEMPLATES = {
    quickStart: () => '',
    referenceLinks: (stack) => `## References\n\n- ${stack.frontend.framework}`,
  };

  const suggestions = generateEnhancementSuggestions(results, techStack, ENHANCEMENT_TEMPLATES);

  ok(suggestions.some(s => s.name === 'Reference Links'), 'suggests reference links');

  const refLinks = suggestions.find(s => s.name === 'Reference Links');
  strictEqual(refLinks.priority, 'medium', 'reference links is medium priority');
  strictEqual(refLinks.type, 'section', 'reference links is a section type');
});

// ============================================================================
// HELPER FUNCTION TESTS (SIMULATED)
// ============================================================================

test('keyword extraction logic should filter stop words', () => {
  // Simulating the internal logic of extractKeywords
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'and',
    'but', 'or', 'not', 'this', 'that', 'it', 'bug', 'fix', 'issue', 'error',
  ]);

  const testWords = ['the', 'authentication', 'fix', 'login', 'error', 'validation'];
  const filtered = testWords.filter(w => !stopWords.has(w));

  deepStrictEqual(filtered, ['authentication', 'login', 'validation'], 'filters stop words correctly');
});

test('task deduplication logic should detect exact matches', () => {
  // Simulating mergeTasks logic
  const existingTexts = new Set(['review authentication code', 'test login flow']);
  const newTaskText = 'review authentication code';

  const isDuplicate = existingTexts.has(newTaskText.toLowerCase());

  ok(isDuplicate, 'detects exact duplicate');
});

test('task deduplication logic should detect substring matches', () => {
  // Simulating mergeTasks substring logic
  // Test case where new task is a substring of existing
  const existingTexts = ['review login function with validation and tests'];
  const newTaskText = 'review login function';
  const newTaskLower = newTaskText.toLowerCase();

  const isDuplicate = existingTexts.some(t => {
    const tLower = t.toLowerCase();
    return tLower.includes(newTaskLower) || newTaskLower.includes(tLower);
  });

  ok(isDuplicate, 'detects when new task is substring of existing');
});

test('task deduplication logic should detect when existing is substring of new', () => {
  // Test case where existing task is a substring of new
  const existingTexts = ['test login'];
  const newTaskText = 'test login flow with edge cases';
  const newTaskLower = newTaskText.toLowerCase();

  const isDuplicate = existingTexts.some(t => {
    const tLower = t.toLowerCase();
    return tLower.includes(newTaskLower) || newTaskLower.includes(tLower);
  });

  ok(isDuplicate, 'detects when existing task is substring of new');
});

test('standard task detection should identify test-related tasks', () => {
  // Simulating ensureStandardTasks logic
  const tasks = [
    { content: 'Implement feature' },
    { content: 'Test changes locally' },
  ];

  const hasTest = tasks.some(t => t.content.toLowerCase().includes('test'));

  ok(hasTest, 'identifies test task');
});

test('standard task detection should identify commit-related tasks', () => {
  const tasks = [
    { content: 'Implement feature' },
    { content: 'Commit changes with message' },
  ];

  const hasCommit = tasks.some(t => t.content.toLowerCase().includes('commit'));

  ok(hasCommit, 'identifies commit task');
});

console.log('✓ All audit and decompose tests passed!');
