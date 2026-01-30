/**
 * Checklist Parser Module
 *
 * Parses GitHub issue markdown to extract task lists, checklists,
 * file references, and dependencies.
 */

/**
 * Parse a GitHub issue body into structured task data
 */
export function parseIssueBody(body) {
  const result = {
    problemStatement: '',
    expectedBehavior: '',
    actualBehavior: '',
    acceptanceCriteria: [],
    codeAnalysis: {
      files: [],
      functions: [],
      patterns: [],
    },
    todoList: [],
    testScenarios: [],
    dependencies: [],
    raw: body,
  };

  if (!body) return result;

  const sections = splitIntoSections(body);

  // Parse each section
  for (const [title, content] of Object.entries(sections)) {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('problem') || titleLower.includes('description')) {
      result.problemStatement = content.trim();
    } else if (titleLower.includes('expected')) {
      result.expectedBehavior = extractBehavior(content, 'expected');
    } else if (titleLower.includes('actual')) {
      result.actualBehavior = extractBehavior(content, 'actual');
    } else if (titleLower.includes('acceptance') || titleLower.includes('criteria')) {
      result.acceptanceCriteria = parseChecklist(content);
    } else if (titleLower.includes('code analysis') || titleLower.includes('relevant files')) {
      result.codeAnalysis = parseCodeAnalysis(content);
    } else if (titleLower.includes('todo') || titleLower.includes('recommended approach')) {
      result.todoList = parseTodoList(content);
    } else if (titleLower.includes('test')) {
      result.testScenarios = parseTestScenarios(content);
    } else if (titleLower.includes('dependencies')) {
      result.dependencies = parseDependencies(content);
    }
  }

  // Also parse top-level checklists
  const topLevelChecklists = parseChecklist(body);
  if (topLevelChecklists.length > 0 && result.todoList.length === 0) {
    result.todoList = topLevelChecklists;
  }

  return result;
}

/**
 * Split markdown into sections by ## headers
 */
function splitIntoSections(body) {
  const sections = {};
  const lines = body.split('\n');
  let currentSection = '_intro';
  let currentContent = [];

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headerMatch) {
      // Save previous section
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n');
      }
      currentSection = headerMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n');
  }

  return sections;
}

/**
 * Parse a checklist from markdown content
 * Supports: - [ ], - [x], * [ ], * [x], numbered lists
 */
export function parseChecklist(content) {
  const items = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match checkbox patterns
    const checkboxMatch = line.match(/^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/);
    if (checkboxMatch) {
      const [, checked, text] = checkboxMatch;
      const item = parseChecklistItem(text, checked.toLowerCase() === 'x');
      item.lineNumber = i + 1;
      items.push(item);
      continue;
    }

    // Match numbered list with checkbox
    const numberedMatch = line.match(/^[\s]*(\d+)[.)]\s*\[([ xX])\]\s*(.+)$/);
    if (numberedMatch) {
      const [, num, checked, text] = numberedMatch;
      const item = parseChecklistItem(text, checked.toLowerCase() === 'x');
      item.number = parseInt(num, 10);
      item.lineNumber = i + 1;
      items.push(item);
      continue;
    }

    // Match bold step format: **Step N**: description
    const stepMatch = line.match(/\*\*Step\s*(\d+)\*\*[:\s]*(.+)/i);
    if (stepMatch) {
      const [, num, text] = stepMatch;
      const isChecked = line.includes('[x]') || line.includes('[X]');
      const item = parseChecklistItem(text.replace(/^\[([ xX])\]\s*/, ''), isChecked);
      item.number = parseInt(num, 10);
      item.lineNumber = i + 1;
      items.push(item);
    }
  }

  return items;
}

/**
 * Parse a single checklist item for metadata
 */
function parseChecklistItem(text, completed = false) {
  const item = {
    text: text.trim(),
    completed,
    fileRefs: [],
    functionRefs: [],
    priority: null,
    dependsOn: null,
  };

  // Extract file references (path:line format)
  const fileRefPattern = /`([^`]+\.[a-z]+):(\d+)`|`([^`]+\.[a-z]+)`/gi;
  let match;
  while ((match = fileRefPattern.exec(text)) !== null) {
    if (match[1]) {
      item.fileRefs.push({ file: match[1], line: parseInt(match[2], 10) });
    } else if (match[3]) {
      item.fileRefs.push({ file: match[3], line: null });
    }
  }

  // Extract function references
  const funcPattern = /`(\w+)\(\)`/g;
  while ((match = funcPattern.exec(text)) !== null) {
    item.functionRefs.push(match[1]);
  }

  // Extract priority markers
  if (text.match(/\b(P0|critical)\b/i)) item.priority = 'P0';
  else if (text.match(/\b(P1|high)\b/i)) item.priority = 'P1';
  else if (text.match(/\b(P2|medium)\b/i)) item.priority = 'P2';
  else if (text.match(/\b(P3|low)\b/i)) item.priority = 'P3';

  // Extract dependency
  const depMatch = text.match(/depends?\s+on\s+(?:step\s+)?(\d+)/i);
  if (depMatch) {
    item.dependsOn = parseInt(depMatch[1], 10);
  }

  return item;
}

/**
 * Parse code analysis section
 */
function parseCodeAnalysis(content) {
  const result = {
    files: [],
    functions: [],
    patterns: [],
  };

  // Parse markdown table
  const tableRows = content.match(/\|[^|]+\|[^|]+\|[^|]+\|[^|]*\|/g) || [];
  for (const row of tableRows) {
    if (row.includes('---') || row.toLowerCase().includes('file')) continue;

    const cells = row.split('|').filter(Boolean).map((c) => c.trim());
    if (cells.length >= 3) {
      const file = cells[0].replace(/`/g, '');
      const line = parseInt(cells[1], 10) || null;
      const func = cells[2].replace(/`/g, '').replace(/\(\)$/, '');
      const purpose = cells[3] || '';

      if (file && !file.includes('File')) {
        result.files.push({ file, line, function: func, purpose });
        if (func) {
          result.functions.push({ name: func, file, line });
        }
      }
    }
  }

  // Parse bullet points for patterns
  const patternLines = content.match(/^[-*]\s+\*\*([^*]+)\*\*[:\s]*(.+)$/gm) || [];
  for (const line of patternLines) {
    const match = line.match(/\*\*([^*]+)\*\*[:\s]*(.+)/);
    if (match) {
      result.patterns.push({ name: match[1], description: match[2] });
    }
  }

  return result;
}

/**
 * Parse todo list with step structure
 */
function parseTodoList(content) {
  const items = parseChecklist(content);

  // Look for sub-items (indented bullets)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const subItemMatch = line.match(/^\s{2,}[-*]\s+(.+)$/);

    if (subItemMatch && items.length > 0) {
      // Find parent item
      for (let j = items.length - 1; j >= 0; j--) {
        if (items[j].lineNumber && items[j].lineNumber < i + 1) {
          if (!items[j].subItems) items[j].subItems = [];
          items[j].subItems.push(subItemMatch[1].trim());
          break;
        }
      }
    }
  }

  return items;
}

/**
 * Parse test scenarios
 */
function parseTestScenarios(content) {
  const scenarios = [];
  const items = parseChecklist(content);

  for (const item of items) {
    const scenario = {
      name: item.text,
      completed: item.completed,
      steps: item.subItems || [],
      expected: null,
    };

    // Extract "Expected:" from text or sub-items
    const expectedMatch = item.text.match(/expected[:\s]+(.+)/i);
    if (expectedMatch) {
      scenario.expected = expectedMatch[1];
    } else if (scenario.steps.length > 0) {
      const expectedStep = scenario.steps.find((s) =>
        s.toLowerCase().startsWith('expected')
      );
      if (expectedStep) {
        scenario.expected = expectedStep.replace(/^expected[:\s]*/i, '');
      }
    }

    scenarios.push(scenario);
  }

  return scenarios;
}

/**
 * Parse dependencies section
 */
function parseDependencies(content) {
  const deps = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/step\s+(\d+)\s+depends?\s+on\s+step\s+(\d+)/i);
    if (match) {
      deps.push({
        step: parseInt(match[1], 10),
        dependsOn: parseInt(match[2], 10),
      });
    }
  }

  return deps;
}

/**
 * Extract expected or actual behavior from content
 */
function extractBehavior(content, type) {
  // Try to find labeled line
  const pattern = new RegExp(`\\*\\*${type}\\*\\*[:\\s]*(.+)`, 'i');
  const match = content.match(pattern);
  if (match) return match[1].trim();

  // Otherwise return first non-empty line
  const lines = content.split('\n').filter((l) => l.trim());
  return lines[0]?.trim() || '';
}

/**
 * Convert parsed issue to Claude task list format
 */
export function toClaudeTaskList(parsed) {
  const tasks = [];

  // Add todo items as tasks
  for (let i = 0; i < parsed.todoList.length; i++) {
    const item = parsed.todoList[i];
    const taskNum = item.number || i + 1;

    tasks.push({
      content: `Step ${taskNum}: ${cleanTaskText(item.text)}`,
      activeForm: `Working on Step ${taskNum}: ${cleanTaskText(item.text)}`,
      status: item.completed ? 'completed' : 'pending',
      metadata: {
        originalText: item.text,
        fileRefs: item.fileRefs,
        functionRefs: item.functionRefs,
        dependsOn: item.dependsOn,
        subItems: item.subItems,
      },
    });
  }

  // Add test scenarios as final tasks
  if (parsed.testScenarios.length > 0) {
    tasks.push({
      content: 'Run test scenarios to validate changes',
      activeForm: 'Running test scenarios',
      status: 'pending',
      metadata: {
        scenarios: parsed.testScenarios,
      },
    });
  }

  return tasks;
}

/**
 * Clean task text for display
 */
function cleanTaskText(text) {
  return text
    .replace(/\*\*Step\s*\d+\*\*[:\s]*/i, '')
    .replace(/^\[([ xX])\]\s*/, '')
    .trim();
}

/**
 * Generate markdown checklist from tasks
 */
export function toMarkdownChecklist(tasks) {
  const lines = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
    const content = task.content || task.text || '';

    lines.push(`- ${checkbox} **Step ${i + 1}**: ${content}`);

    // Add sub-items if present
    if (task.metadata?.subItems) {
      for (const sub of task.metadata.subItems) {
        lines.push(`  - ${sub}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Calculate completion percentage
 */
export function getCompletionStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(
    (t) => t.status === 'completed' || t.completed
  ).length;

  return {
    total,
    completed,
    pending: total - completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
