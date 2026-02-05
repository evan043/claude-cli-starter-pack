/**
 * Code analysis section generators
 */

import { getLanguageForExt } from './formatters.js';

/**
 * Generate code analysis section
 */
export function generateCodeAnalysisSection(analysis) {
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
export function generateApiStatusSection(apiStatus) {
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
