import { test } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'assert';
import {
  parseChecklist,
  toMarkdownChecklist,
  getCompletionStats,
  parseIssueBody,
  toClaudeTaskList,
} from '../src/analysis/checklist-parser.js';

console.log('Running checklist-parser tests...\n');

// ============================================================================
// parseChecklist() Tests
// ============================================================================

test('parseChecklist - handles empty content', () => {
  const result = parseChecklist('');
  deepStrictEqual(result, []);
});

test('parseChecklist - parses single unchecked item', () => {
  const content = '- [ ] Fix the login bug';
  const result = parseChecklist(content);

  strictEqual(result.length, 1);
  strictEqual(result[0].text, 'Fix the login bug');
  strictEqual(result[0].completed, false);
  strictEqual(result[0].lineNumber, 1);
});

test('parseChecklist - parses single checked item', () => {
  const content = '- [x] Implement authentication';
  const result = parseChecklist(content);

  strictEqual(result.length, 1);
  strictEqual(result[0].text, 'Implement authentication');
  strictEqual(result[0].completed, true);
  strictEqual(result[0].lineNumber, 1);
});

test('parseChecklist - parses mixed checked/unchecked items', () => {
  const content = `- [x] First task completed
- [ ] Second task pending
- [X] Third task completed (uppercase)
- [ ] Fourth task pending`;

  const result = parseChecklist(content);

  strictEqual(result.length, 4);
  strictEqual(result[0].completed, true);
  strictEqual(result[1].completed, false);
  strictEqual(result[2].completed, true); // uppercase X
  strictEqual(result[3].completed, false);
});

test('parseChecklist - handles numbered checklist items', () => {
  const content = `1. [x] First step
2) [ ] Second step
3. [X] Third step`;

  const result = parseChecklist(content);

  strictEqual(result.length, 3);
  strictEqual(result[0].number, 1);
  strictEqual(result[0].completed, true);
  strictEqual(result[1].number, 2);
  strictEqual(result[1].completed, false);
  strictEqual(result[2].number, 3);
  strictEqual(result[2].completed, true);
});

test('parseChecklist - extracts file references', () => {
  const content = '- [ ] Update `auth.js:45` and `config.json`';
  const result = parseChecklist(content);

  strictEqual(result.length, 1);
  strictEqual(result[0].fileRefs.length, 2);
  strictEqual(result[0].fileRefs[0].file, 'auth.js');
  strictEqual(result[0].fileRefs[0].line, 45);
  strictEqual(result[0].fileRefs[1].file, 'config.json');
  strictEqual(result[0].fileRefs[1].line, null);
});

test('parseChecklist - extracts function references', () => {
  const content = '- [ ] Fix `validateUser()` and `hashPassword()` functions';
  const result = parseChecklist(content);

  strictEqual(result.length, 1);
  deepStrictEqual(result[0].functionRefs, ['validateUser', 'hashPassword']);
});

test('parseChecklist - extracts priority markers', () => {
  const content = `- [ ] Critical bug fix (P0)
- [ ] High priority feature (P1)
- [ ] Medium priority (P2)
- [ ] Low priority enhancement (P3)`;

  const result = parseChecklist(content);

  strictEqual(result[0].priority, 'P0');
  strictEqual(result[1].priority, 'P1');
  strictEqual(result[2].priority, 'P2');
  strictEqual(result[3].priority, 'P3');
});

test('parseChecklist - extracts dependencies', () => {
  const content = '- [ ] Setup database (depends on step 2)';
  const result = parseChecklist(content);

  strictEqual(result.length, 1);
  strictEqual(result[0].dependsOn, 2);
});

test('parseChecklist - handles **Step N** format', () => {
  const content = `**Step 1**: Initialize project
**Step 2**: [x] Configure settings`;

  const result = parseChecklist(content);

  strictEqual(result.length, 2);
  strictEqual(result[0].number, 1);
  strictEqual(result[0].completed, false);
  strictEqual(result[1].number, 2);
  strictEqual(result[1].completed, true);
});

// ============================================================================
// toMarkdownChecklist() Tests
// ============================================================================

test('toMarkdownChecklist - handles empty tasks array', () => {
  const result = toMarkdownChecklist([]);
  strictEqual(result, '');
});

test('toMarkdownChecklist - generates markdown for pending tasks', () => {
  const tasks = [
    { content: 'First task', status: 'pending' },
    { content: 'Second task', status: 'pending' },
  ];

  const result = toMarkdownChecklist(tasks);
  const expected = `- [ ] **Step 1**: First task
- [ ] **Step 2**: Second task`;

  strictEqual(result, expected);
});

test('toMarkdownChecklist - generates markdown for completed tasks', () => {
  const tasks = [
    { content: 'Done task', status: 'completed' },
    { content: 'Pending task', status: 'pending' },
  ];

  const result = toMarkdownChecklist(tasks);
  const expected = `- [x] **Step 1**: Done task
- [ ] **Step 2**: Pending task`;

  strictEqual(result, expected);
});

test('toMarkdownChecklist - includes sub-items when present', () => {
  const tasks = [
    {
      content: 'Main task',
      status: 'pending',
      metadata: {
        subItems: ['Sub-task 1', 'Sub-task 2'],
      },
    },
  ];

  const result = toMarkdownChecklist(tasks);
  const expected = `- [ ] **Step 1**: Main task
  - Sub-task 1
  - Sub-task 2`;

  strictEqual(result, expected);
});

test('toMarkdownChecklist - handles tasks with text property instead of content', () => {
  const tasks = [
    { text: 'Task with text property', status: 'pending' },
  ];

  const result = toMarkdownChecklist(tasks);
  strictEqual(result, '- [ ] **Step 1**: Task with text property');
});

// ============================================================================
// getCompletionStats() Tests
// ============================================================================

test('getCompletionStats - handles empty task list', () => {
  const stats = getCompletionStats([]);

  deepStrictEqual(stats, {
    total: 0,
    completed: 0,
    pending: 0,
    percentage: 0,
  });
});

test('getCompletionStats - calculates stats for all pending', () => {
  const tasks = [
    { status: 'pending' },
    { status: 'pending' },
    { status: 'pending' },
  ];

  const stats = getCompletionStats(tasks);

  strictEqual(stats.total, 3);
  strictEqual(stats.completed, 0);
  strictEqual(stats.pending, 3);
  strictEqual(stats.percentage, 0);
});

test('getCompletionStats - calculates stats for all completed', () => {
  const tasks = [
    { status: 'completed' },
    { status: 'completed' },
  ];

  const stats = getCompletionStats(tasks);

  strictEqual(stats.total, 2);
  strictEqual(stats.completed, 2);
  strictEqual(stats.pending, 0);
  strictEqual(stats.percentage, 100);
});

test('getCompletionStats - calculates percentage correctly for mixed tasks', () => {
  const tasks = [
    { status: 'completed' },
    { status: 'pending' },
    { status: 'completed' },
    { status: 'pending' },
  ];

  const stats = getCompletionStats(tasks);

  strictEqual(stats.total, 4);
  strictEqual(stats.completed, 2);
  strictEqual(stats.pending, 2);
  strictEqual(stats.percentage, 50);
});

test('getCompletionStats - rounds percentage correctly', () => {
  const tasks = [
    { status: 'completed' },
    { completed: true }, // supports alternate field name
    { status: 'pending' },
  ];

  const stats = getCompletionStats(tasks);

  strictEqual(stats.total, 3);
  strictEqual(stats.completed, 2);
  strictEqual(stats.percentage, 67); // 2/3 = 0.666... -> 67
});

// ============================================================================
// parseIssueBody() Tests
// ============================================================================

test('parseIssueBody - handles empty body', () => {
  const result = parseIssueBody('');

  ok(result.problemStatement === '');
  ok(Array.isArray(result.acceptanceCriteria));
  ok(Array.isArray(result.todoList));
  ok(result.raw === '');
});

test('parseIssueBody - handles null/undefined body', () => {
  const result = parseIssueBody(null);

  strictEqual(result.problemStatement, '');
  strictEqual(result.expectedBehavior, '');
  strictEqual(result.actualBehavior, '');
});

test('parseIssueBody - extracts problem statement', () => {
  const body = `## Problem Description

The login form does not validate email addresses properly.`;

  const result = parseIssueBody(body);

  ok(result.problemStatement.includes('login form'));
  ok(result.problemStatement.includes('validate email'));
});

test('parseIssueBody - extracts acceptance criteria as checklist', () => {
  const body = `## Acceptance Criteria

- [ ] Email validation works correctly
- [x] Password meets requirements
- [ ] Error messages are clear`;

  const result = parseIssueBody(body);

  strictEqual(result.acceptanceCriteria.length, 3);
  strictEqual(result.acceptanceCriteria[0].completed, false);
  strictEqual(result.acceptanceCriteria[1].completed, true);
  strictEqual(result.acceptanceCriteria[2].completed, false);
});

test('parseIssueBody - extracts todo list from section', () => {
  const body = `## TODO

- [ ] Update validation logic
- [x] Add tests
- [ ] Update documentation`;

  const result = parseIssueBody(body);

  strictEqual(result.todoList.length, 3);
  strictEqual(result.todoList[0].text, 'Update validation logic');
  strictEqual(result.todoList[1].completed, true);
});

test('parseIssueBody - extracts top-level checklists when no TODO section', () => {
  const body = `# Bug Fix

- [ ] Fix the issue
- [ ] Add tests`;

  const result = parseIssueBody(body);

  strictEqual(result.todoList.length, 2);
});

test('parseIssueBody - preserves raw body', () => {
  const body = 'Test content';
  const result = parseIssueBody(body);

  strictEqual(result.raw, body);
});

// ============================================================================
// toClaudeTaskList() Tests
// ============================================================================

test('toClaudeTaskList - handles empty parsed issue', () => {
  const parsed = {
    todoList: [],
    testScenarios: [],
  };

  const result = toClaudeTaskList(parsed);
  deepStrictEqual(result, []);
});

test('toClaudeTaskList - converts todo items to Claude tasks', () => {
  const parsed = {
    todoList: [
      { text: 'Implement feature', completed: false },
      { text: 'Write tests', completed: true },
    ],
    testScenarios: [],
  };

  const result = toClaudeTaskList(parsed);

  strictEqual(result.length, 2);
  strictEqual(result[0].content, 'Step 1: Implement feature');
  strictEqual(result[0].status, 'pending');
  strictEqual(result[1].content, 'Step 2: Write tests');
  strictEqual(result[1].status, 'completed');
});

test('toClaudeTaskList - preserves metadata in tasks', () => {
  const parsed = {
    todoList: [
      {
        text: 'Update `auth.js`',
        completed: false,
        number: 1,
        fileRefs: [{ file: 'auth.js', line: null }],
        functionRefs: [],
        dependsOn: null,
        subItems: ['Add validation', 'Add tests'],
      },
    ],
    testScenarios: [],
  };

  const result = toClaudeTaskList(parsed);

  strictEqual(result.length, 1);
  strictEqual(result[0].metadata.originalText, 'Update `auth.js`');
  strictEqual(result[0].metadata.fileRefs.length, 1);
  strictEqual(result[0].metadata.subItems.length, 2);
});

test('toClaudeTaskList - adds test scenarios as final task', () => {
  const parsed = {
    todoList: [
      { text: 'Implement feature', completed: false },
    ],
    testScenarios: [
      { name: 'Test login', completed: false, steps: [] },
    ],
  };

  const result = toClaudeTaskList(parsed);

  strictEqual(result.length, 2);
  strictEqual(result[1].content, 'Run test scenarios to validate changes');
  strictEqual(result[1].status, 'pending');
  ok(result[1].metadata.scenarios);
});

test('toClaudeTaskList - uses item number if present', () => {
  const parsed = {
    todoList: [
      { text: 'First', completed: false, number: 5 },
      { text: 'Second', completed: false, number: 10 },
    ],
    testScenarios: [],
  };

  const result = toClaudeTaskList(parsed);

  strictEqual(result[0].content, 'Step 5: First');
  strictEqual(result[1].content, 'Step 10: Second');
});

// ============================================================================
// Round-trip Tests
// ============================================================================

test('Round-trip: parse → generate → parse preserves structure', () => {
  const original = `- [ ] **Step 1**: First task
- [x] **Step 2**: Second task
- [ ] **Step 3**: Third task`;

  // Parse original
  const parsed = parseChecklist(original);

  // Convert to Claude tasks
  const claudeTasks = parsed.map((item, i) => ({
    content: item.text,
    status: item.completed ? 'completed' : 'pending',
    metadata: {},
  }));

  // Generate markdown
  const generated = toMarkdownChecklist(claudeTasks);

  // Parse generated
  const reParsed = parseChecklist(generated);

  // Verify structure preserved
  strictEqual(reParsed.length, parsed.length);
  strictEqual(reParsed[0].completed, parsed[0].completed);
  strictEqual(reParsed[1].completed, parsed[1].completed);
  strictEqual(reParsed[2].completed, parsed[2].completed);
});

test('Round-trip: completion stats match after round-trip', () => {
  const tasks = [
    { status: 'completed' },
    { status: 'pending' },
    { status: 'completed' },
  ];

  // Get original stats
  const originalStats = getCompletionStats(tasks);

  // Generate markdown
  const markdown = toMarkdownChecklist(tasks);

  // Parse back
  const parsed = parseChecklist(markdown);

  // Get new stats
  const newTasks = parsed.map((item) => ({
    status: item.completed ? 'completed' : 'pending',
  }));
  const newStats = getCompletionStats(newTasks);

  // Verify stats match
  deepStrictEqual(newStats, originalStats);
});

console.log('✓ All checklist-parser tests passed!');
