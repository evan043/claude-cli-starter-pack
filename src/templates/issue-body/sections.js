/**
 * Section builders (task lists, metadata, etc.)
 */

/**
 * Generate todo section
 */
export function generateTodoSection(todoList) {
  const parts = ['## Recommended Approach'];

  parts.push('### Todo List\n');
  for (let i = 0; i < todoList.length; i++) {
    const item = todoList[i];
    parts.push(`- [ ] **Step ${i + 1}**: ${item.task}`);
    if (item.details) {
      parts.push(`  - ${item.details}`);
    }
    if (item.file) {
      parts.push(`  - File: \`${item.file}\``);
    }
  }

  // Dependencies
  const deps = todoList.filter((t) => t.dependsOn);
  if (deps.length > 0) {
    parts.push('\n### Dependencies\n');
    for (const dep of deps) {
      parts.push(`- Step ${todoList.indexOf(dep) + 1} depends on Step ${dep.dependsOn}`);
    }
  }

  return parts.join('\n');
}

/**
 * Generate testing section
 */
export function generateTestingSection(scenarios) {
  const parts = ['## Testing'];

  parts.push('### Test Scenarios\n');
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    parts.push(`${i + 1}. [ ] **${scenario.name}**`);
    if (scenario.steps) {
      for (const step of scenario.steps) {
        parts.push(`   - ${step}`);
      }
    }
    if (scenario.expected) {
      parts.push(`   - Expected: ${scenario.expected}`);
    }
  }

  return parts.join('\n');
}

/**
 * Generate agent recommendation section
 */
export function generateAgentRecommendationSection(recommendation) {
  const parts = ['## 🤖 Recommended Agent'];

  if (recommendation.name) {
    parts.push(`\n**Agent**: \`${recommendation.name}\``);
  }
  if (recommendation.domain) {
    parts.push(`**Domain**: ${recommendation.domain}`);
  }
  if (recommendation.confidence) {
    parts.push(`**Confidence**: ${recommendation.confidence}%`);
  }
  if (recommendation.reason) {
    parts.push(`\n**Reasoning**: ${recommendation.reason}`);
  }
  if (recommendation.matchedKeywords?.length > 0) {
    parts.push(`**Matched Keywords**: ${recommendation.matchedKeywords.join(', ')}`);
  }
  if (recommendation.matchedFiles?.length > 0) {
    parts.push(`**Matched Files**: ${recommendation.matchedFiles.slice(0, 5).map(f => `\`${f}\``).join(', ')}`);
  }

  parts.push('\n> 💡 When starting this task, deploy the recommended agent for domain-specific expertise.');
  parts.push('> Run `ccasp generate-agents` if agents are not yet configured.');

  return parts.join('\n');
}

/**
 * Default acceptance criteria suggestions based on issue type
 * @deprecated Use getTypeAcceptanceCriteria from issue-types.js instead
 */
export function suggestAcceptanceCriteria(issueType, keywords = []) {
  const suggestions = {
    bug: [
      'Bug is reproducible and root cause identified',
      'Fix implemented and tested locally',
      'No regression in related functionality',
      'Error handling covers edge cases',
    ],
    feature: [
      'Feature implemented according to requirements',
      'UI matches design specifications (if applicable)',
      'Unit tests added for new functionality',
      'Documentation updated',
    ],
    refactor: [
      'Code refactored without changing behavior',
      'All existing tests still pass',
      'Code follows project style guidelines',
      'No new warnings or errors introduced',
    ],
    documentation: [
      'Documentation is accurate and complete',
      'Examples are working and tested',
      'Links are valid and accessible',
    ],
  };

  return suggestions[issueType] || suggestions.feature;
}
