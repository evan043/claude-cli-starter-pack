/**
 * Issue Normalizer
 *
 * Enhances GitHub issues to have proper roadmap structure.
 * Additive only - never overwrites existing content.
 */

import { getPrimaryDomain, estimateComplexity } from './intelligence.js';

/**
 * Template for normalized issue structure
 */
const NORMALIZATION_TEMPLATE = `

---
## 📋 Roadmap Metadata

### Classification
- **Domain:** {{domain}}
- **Complexity:** {{complexity}}
- **Estimated Effort:** {{effort}}

### Acceptance Criteria
{{#each criteria}}
- [ ] {{this}}
{{/each}}

### Code Analysis
- **Files to Modify:** {{files}}
- **New Files:** {{newFiles}}
- **Tests Needed:** {{tests}}

### Dependencies
{{#if dependencies}}
{{#each dependencies}}
- Requires: {{this}}
{{/each}}
{{else}}
- None identified
{{/if}}

---
*Normalized by CCASP for roadmap integration*
`;

/**
 * Check if an issue has proper roadmap structure
 *
 * @param {Object} issue - Issue object with body
 * @returns {Object} { isNormalized: boolean, sections: string[] }
 */
export function checkNormalizationStatus(issue) {
  const body = issue.body || '';

  const requiredSections = [
    'Acceptance Criteria',
    'Code Analysis',
    'Dependencies',
  ];

  const foundSections = [];

  for (const section of requiredSections) {
    if (body.includes(`### ${section}`) || body.includes(`## ${section}`)) {
      foundSections.push(section);
    }
  }

  return {
    isNormalized: foundSections.length === requiredSections.length,
    sections: foundSections,
    missingSections: requiredSections.filter(s => !foundSections.includes(s)),
  };
}

/**
 * Normalize an issue by adding structured metadata
 *
 * @param {Object} issue - Issue object
 * @param {Object} options - Normalization options
 * @returns {Object} Normalized issue with updated body
 */
export function normalizeIssue(issue, options = {}) {
  const status = checkNormalizationStatus(issue);

  if (status.isNormalized && !options.force) {
    return {
      ...issue,
      _normalized: true,
      _alreadyNormalized: true,
    };
  }

  // Analyze the issue
  const text = `${issue.title || ''} ${issue.body || ''}`;
  const domain = getPrimaryDomain(text) || 'general';
  const complexity = estimateComplexity({
    goal: issue.title,
    description: issue.body,
  });

  // Generate acceptance criteria from issue body
  const criteria = extractAcceptanceCriteria(issue);

  // Estimate files and tests
  const fileAnalysis = analyzeFileReferences(issue);

  // Find dependency mentions
  const dependencies = extractDependencies(issue);

  // Build normalization section
  const normalizationSection = buildNormalizationSection({
    domain,
    complexity,
    criteria,
    files: fileAnalysis.existingFiles,
    newFiles: fileAnalysis.newFiles,
    tests: fileAnalysis.tests,
    dependencies,
  });

  // Append to body (never overwrite)
  const newBody = (issue.body || '') + normalizationSection;

  return {
    ...issue,
    body: newBody,
    _normalized: true,
    _metadata: {
      domain,
      complexity,
      criteria,
      fileAnalysis,
      dependencies,
    },
  };
}

/**
 * Extract or generate acceptance criteria
 */
function extractAcceptanceCriteria(issue) {
  const body = issue.body || '';
  const criteria = [];

  // Limit input size to prevent ReDoS (max 50KB)
  const safeBody = body.length > 50000 ? body.slice(0, 50000) : body;

  // Look for existing checklist items
  // Using [^\n]+ instead of .+ to prevent catastrophic backtracking
  const checklistRegex = /^[\s-]*\[[ x]\]\s*([^\n]+)$/gim;
  let match;
  while ((match = checklistRegex.exec(safeBody)) !== null) {
    criteria.push(match[1].trim());
  }

  // Look for bullet points that look like requirements
  // Using [^\n]+ instead of .+ to prevent catastrophic backtracking
  const bulletRegex = /^[\s-]*•?\s*(?:must|should|shall|need to|requires?)\s+([^\n]+)$/gim;
  while ((match = bulletRegex.exec(safeBody)) !== null) {
    const criterion = match[1].trim();
    if (!criteria.includes(criterion)) {
      criteria.push(criterion);
    }
  }

  // If no criteria found, generate from title
  if (criteria.length === 0) {
    const title = issue.title || '';

    // Common patterns
    if (title.toLowerCase().includes('add')) {
      criteria.push(`Feature is implemented and functional`);
      criteria.push(`Tests are passing`);
    } else if (title.toLowerCase().includes('fix')) {
      criteria.push(`Bug is resolved`);
      criteria.push(`Regression test added`);
    } else if (title.toLowerCase().includes('update') || title.toLowerCase().includes('refactor')) {
      criteria.push(`Changes are complete`);
      criteria.push(`No regressions introduced`);
    } else {
      criteria.push(`Implementation complete`);
      criteria.push(`Tested and verified`);
    }
  }

  return criteria;
}

/**
 * Analyze file references in the issue
 */
function analyzeFileReferences(issue) {
  const body = issue.body || '';
  const title = issue.title || '';
  const text = `${title} ${body}`;

  const result = {
    existingFiles: [],
    newFiles: [],
    tests: [],
  };

  // Look for file path patterns
  const filePatterns = [
    /`([^`]+\.[a-z]{2,4})`/gi,           // `file.ts`
    /\b([a-z][a-z0-9_/-]*\.[a-z]{2,4})\b/gi, // path/to/file.ts
  ];

  const foundFiles = new Set();

  for (const pattern of filePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const file = match[1];
      // Filter out common non-file patterns
      if (!file.includes('example.') && !file.includes('placeholder') && file.length > 3) {
        foundFiles.add(file);
      }
    }
  }

  // Categorize files
  for (const file of foundFiles) {
    if (file.includes('test') || file.includes('spec')) {
      result.tests.push(file);
    } else if (file.includes('new') || body.includes(`create ${file}`)) {
      result.newFiles.push(file);
    } else {
      result.existingFiles.push(file);
    }
  }

  // Estimate tests needed if none mentioned
  if (result.tests.length === 0) {
    if (result.existingFiles.length > 0 || result.newFiles.length > 0) {
      result.tests.push('Unit tests for new/modified code');
    }
    if (title.toLowerCase().includes('ui') || title.toLowerCase().includes('component')) {
      result.tests.push('Integration/E2E tests for UI changes');
    }
  }

  return result;
}

/**
 * Extract dependency mentions from issue
 */
function extractDependencies(issue) {
  const body = issue.body || '';
  const dependencies = [];

  // Look for issue references with dependency indicators
  const depPatterns = [
    /(?:depends? on|requires?|after|blocked by|waiting for)\s*#(\d+)/gi,
    /(?:depends? on|requires?|after|blocked by)\s*([a-z][a-z0-9-]+)/gi,
  ];

  for (const pattern of depPatterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const dep = match[1];
      if (!dependencies.includes(dep)) {
        dependencies.push(dep.startsWith('#') ? dep : `#${dep}`);
      }
    }
  }

  return dependencies;
}

/**
 * Build the normalization section to append
 */
function buildNormalizationSection(data) {
  const effortMap = { S: '2-4 hours', M: '8-16 hours', L: '24-40 hours' };

  let section = '\n\n---\n';
  section += '## 📋 Roadmap Metadata\n\n';

  section += '### Classification\n';
  section += `- **Domain:** ${data.domain}\n`;
  section += `- **Complexity:** ${data.complexity}\n`;
  section += `- **Estimated Effort:** ${effortMap[data.complexity] || 'TBD'}\n\n`;

  section += '### Acceptance Criteria\n';
  for (const criterion of data.criteria) {
    section += `- [ ] ${criterion}\n`;
  }
  section += '\n';

  section += '### Code Analysis\n';
  section += `- **Files to Modify:** ${data.files.length > 0 ? data.files.join(', ') : 'TBD'}\n`;
  section += `- **New Files:** ${data.newFiles.length > 0 ? data.newFiles.join(', ') : 'None identified'}\n`;
  section += `- **Tests Needed:** ${data.tests.length > 0 ? data.tests.join(', ') : 'TBD'}\n\n`;

  section += '### Dependencies\n';
  if (data.dependencies.length > 0) {
    for (const dep of data.dependencies) {
      section += `- Requires: ${dep}\n`;
    }
  } else {
    section += '- None identified\n';
  }

  section += '\n---\n';
  section += '*Normalized by CCASP for roadmap integration*\n';

  return section;
}

/**
 * Batch normalize multiple issues
 *
 * @param {Array} issues - Array of issues
 * @param {Object} options - Normalization options
 * @returns {Object} { normalized: Array, skipped: Array, stats: Object }
 */
export function batchNormalize(issues, options = {}) {
  const normalized = [];
  const skipped = [];

  for (const issue of issues) {
    const result = normalizeIssue(issue, options);

    if (result._alreadyNormalized) {
      skipped.push(result);
    } else {
      normalized.push(result);
    }
  }

  return {
    normalized,
    skipped,
    stats: {
      total: issues.length,
      normalizedCount: normalized.length,
      skippedCount: skipped.length,
    },
  };
}

/**
 * Safely extract a section from markdown body
 * Uses indexOf instead of regex with [\s\S]*? to prevent ReDoS
 *
 * @param {string} body - Full body text
 * @param {string} sectionHeader - Header to find (e.g., "### Acceptance Criteria")
 * @returns {string|null} Section content or null
 */
function extractSection(body, sectionHeader) {
  const startIdx = body.indexOf(sectionHeader);
  if (startIdx === -1) return null;

  const contentStart = startIdx + sectionHeader.length;

  // Find the next section boundary (### or ---)
  let endIdx = body.length;
  const nextHeader = body.indexOf('\n###', contentStart);
  const nextDivider = body.indexOf('\n---', contentStart);

  if (nextHeader !== -1) endIdx = Math.min(endIdx, nextHeader);
  if (nextDivider !== -1) endIdx = Math.min(endIdx, nextDivider);

  return body.slice(contentStart, endIdx);
}

/**
 * Extract metadata from a normalized issue body
 *
 * @param {string} body - Issue body
 * @returns {Object|null} Extracted metadata or null
 */
export function extractNormalizationMetadata(body) {
  if (!body || !body.includes('Roadmap Metadata')) {
    return null;
  }

  // Limit input size to prevent ReDoS (max 50KB)
  const safeBody = body.length > 50000 ? body.slice(0, 50000) : body;

  const metadata = {};

  // Extract domain
  const domainMatch = safeBody.match(/\*\*Domain:\*\*\s*(\w+)/);
  if (domainMatch) metadata.domain = domainMatch[1];

  // Extract complexity
  const complexityMatch = safeBody.match(/\*\*Complexity:\*\*\s*([SML])/);
  if (complexityMatch) metadata.complexity = complexityMatch[1];

  // Extract effort
  const effortMatch = safeBody.match(/\*\*Estimated Effort:\*\*\s*([^\n]+)/);
  if (effortMatch) metadata.effort = effortMatch[1].trim();

  // Extract criteria using safe section extraction (no ReDoS-prone regex)
  const criteriaSection = extractSection(safeBody, '### Acceptance Criteria\n');
  if (criteriaSection) {
    metadata.criteria = [];
    // Using [^\n]+ instead of .+ to prevent backtracking
    const criteriaMatches = criteriaSection.matchAll(/- \[[ x]\] ([^\n]+)/g);
    for (const match of criteriaMatches) {
      metadata.criteria.push({
        text: match[1],
        completed: match[0].includes('[x]'),
      });
    }
  }

  // Extract dependencies using safe section extraction (no ReDoS-prone regex)
  const depsSection = extractSection(safeBody, '### Dependencies\n');
  if (depsSection) {
    metadata.dependencies = [];
    const depMatches = depsSection.matchAll(/- Requires: ([^\n]+)/g);
    for (const match of depMatches) {
      metadata.dependencies.push(match[1].trim());
    }
  }

  return metadata;
}
