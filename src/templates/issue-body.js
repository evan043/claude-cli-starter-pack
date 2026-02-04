/**
 * Issue Body Templates
 *
 * Generates comprehensive GitHub issue bodies with codebase analysis
 */

import {
  getIssueType,
  getTypeSections,
  getTypeAcceptanceCriteria,
} from './issue-types.js';
import { generateCCSAPMeta } from './issue-metadata.js';
import { generateFilesSection, generateFilesList } from './generated-files-section.js';

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
 * Generate type-specific sections based on issue type
 * @param {string} issueType - One of: feature, refactor, bug, testing
 * @param {Object} data - Issue data containing type-specific fields
 * @returns {string|null} Markdown section or null if no type-specific content
 */
function generateTypeSpecificSection(issueType, data) {
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

/**
 * Generate code analysis section
 */
function generateCodeAnalysisSection(analysis) {
  const parts = ['## Code Analysis'];

  // Relevant Files & Functions table
  if (analysis.relevantFiles?.length > 0) {
    parts.push('### Relevant Files & Functions\n');
    parts.push('| File | Line | Function/Component | Purpose |');
    parts.push('|------|------|-------------------|---------|');

    for (const fileInfo of analysis.relevantFiles) {
      for (const def of fileInfo.definitions || []) {
        parts.push(
          `| \`${fileInfo.file}\` | ${def.line} | \`${def.name}()\` | ${def.type} |`
        );
      }
    }
  }

  // Key Functions
  if (analysis.keyFunctions?.length > 0) {
    parts.push('\n### Key Functions to Modify\n');
    for (const func of analysis.keyFunctions.slice(0, 5)) {
      parts.push(`- \`${func.file}:${func.line}\` - \`${func.name}()\``);
    }
  }

  // Patterns to Follow
  if (analysis.patterns?.length > 0) {
    parts.push('\n### Patterns to Follow\n');
    for (const pattern of analysis.patterns.slice(0, 3)) {
      parts.push(`- **${pattern.keyword}**: Found in \`${pattern.file}\``);
    }
  }

  // Code Snippets
  if (analysis.codeSnippets?.length > 0) {
    parts.push('\n### Code Snippets\n');
    for (const snippet of analysis.codeSnippets.slice(0, 2)) {
      const ext = snippet.file.split('.').pop();
      const lang = getLanguageForExt(ext);
      parts.push(`\`\`\`${lang}
// From: ${snippet.file}:${snippet.startLine}-${snippet.endLine}
${snippet.content}
\`\`\``);
    }
  }

  return parts.join('\n');
}

/**
 * Generate API status section for full-stack features
 */
function generateApiStatusSection(apiStatus) {
  const parts = ['## Full-Stack API Status'];

  parts.push('### Stack Verification Matrix\n');
  parts.push('| Layer | Component | Status | File Location |');
  parts.push('|-------|-----------|--------|---------------|');

  for (const layer of apiStatus.layers || []) {
    const status = layer.exists ? '✅' : '❌';
    const location = layer.file ? `\`${layer.file}:${layer.line || ''}\`` : '-';
    parts.push(`| ${layer.layer} | \`${layer.component}\` | ${status} | ${location} |`);
  }

  // Missing layers
  const missing = (apiStatus.layers || []).filter((l) => !l.exists);
  if (missing.length > 0) {
    parts.push('\n### Missing Layers (MUST IMPLEMENT)\n');
    for (const layer of missing) {
      parts.push(`- [ ] **${layer.layer}**: Create \`${layer.component}\``);
    }
  }

  return parts.join('\n');
}

/**
 * Generate todo section
 */
function generateTodoSection(todoList) {
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
function generateTestingSection(scenarios) {
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
function generateAgentRecommendationSection(recommendation) {
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
 * Get language name for syntax highlighting
 */
function getLanguageForExt(ext) {
  const map = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cs: 'csharp',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
  };
  return map[ext] || ext;
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

/**
 * Get agent recommendation from registry based on issue details
 * @param {object} registry - Agent registry from agents.json
 * @param {string} description - Issue description
 * @param {string[]} labels - Issue labels
 * @param {string[]} files - Affected files
 * @returns {object|null} Agent recommendation or null
 */
export function getAgentRecommendation(registry, description, labels = [], files = []) {
  if (!registry || !registry.agents || registry.agents.length === 0) {
    return null;
  }

  const descLower = description.toLowerCase();
  const labelStr = labels.join(' ').toLowerCase();
  const combined = descLower + ' ' + labelStr;

  const domainScores = {};
  const matchedKeywords = [];

  // Score based on keywords
  const keywords = registry.delegationRules?.keywords || {};
  for (const [keyword, domain] of Object.entries(keywords)) {
    if (combined.includes(keyword.toLowerCase())) {
      domainScores[domain] = (domainScores[domain] || 0) + 1;
      matchedKeywords.push(keyword);
    }
  }

  // Score based on file patterns
  const matchedFiles = [];
  const filePatterns = registry.delegationRules?.filePatterns || {};
  for (const [domain, patterns] of Object.entries(filePatterns)) {
    for (const file of files) {
      for (const pattern of patterns) {
        if (file.match(new RegExp(pattern.replace(/\*/g, '.*')))) {
          domainScores[domain] = (domainScores[domain] || 0) + 2;
          matchedFiles.push(file);
        }
      }
    }
  }

  // Score based on labels
  const labelDomains = {
    frontend: 'frontend',
    ui: 'frontend',
    backend: 'backend',
    api: 'backend',
    database: 'database',
    db: 'database',
    testing: 'testing',
    test: 'testing',
    deploy: 'deployment',
    ci: 'deployment',
  };

  for (const label of labels) {
    const labelLower = label.toLowerCase();
    if (labelDomains[labelLower]) {
      domainScores[labelDomains[labelLower]] = (domainScores[labelDomains[labelLower]] || 0) + 3;
    }
  }

  // Find best domain
  let bestDomain = null;
  let bestScore = 0;
  for (const [domain, score] of Object.entries(domainScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  if (!bestDomain) {
    return null;
  }

  const agent = registry.agents.find((a) => a.domain === bestDomain);
  if (!agent) {
    return null;
  }

  return {
    name: agent.name,
    domain: agent.domain,
    framework: agent.framework,
    confidence: Math.min(100, bestScore * 15),
    reason: `Matched ${bestDomain} domain based on issue content`,
    matchedKeywords: [...new Set(matchedKeywords)],
    matchedFiles: [...new Set(matchedFiles)],
  };
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

// Re-export useful functions from new modules for convenience
export {
  getIssueType,
  getTypeSections,
  getTypeLabels,
  getTypeAcceptanceCriteria,
  getRequiredFields,
  validateIssueData,
  getAvailableTypes,
  isValidType,
} from './issue-types.js';

export {
  generateCCSAPMeta,
  parseCCSAPMeta,
  updateCCSAPMeta,
  hasCCSAPMeta,
  extractCCSAPMetaBlock,
} from './issue-metadata.js';

export {
  generateFilesSection,
  generateFilesList,
  generateCompactFilesSection,
  generateGroupedFilesSection,
  generateFileLinksSection,
  formatFilePath,
  createFileObject,
} from './generated-files-section.js';
