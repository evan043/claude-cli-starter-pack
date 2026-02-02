/**
 * Audit Rules Configuration
 *
 * Defines audit rules based on Anthropic's Claude Code CLI best practices.
 * Reference: https://code.claude.com/docs/en/best-practices
 *
 * Extracted from claude-audit.js for maintainability.
 */

/**
 * Audit rules based on Anthropic documentation
 */
export const AUDIT_RULES = {
  claudeMd: {
    maxLines: 300,
    recommendedLines: 60,
    warningLines: 150,
    requiredSections: [],
    antiPatterns: [
      { pattern: /```[\s\S]{500,}```/g, message: 'Long code blocks (>500 chars) bloat context - link to docs instead' },
      { pattern: /\b(obvious|obviously|of course|everyone knows)\b/gi, message: 'Self-evident statements waste tokens' },
      { pattern: /^\s*-\s*Write clean code/mi, message: 'Generic advice like "write clean code" adds no value' },
      { pattern: /^\s*-\s*Follow best practices/mi, message: 'Vague instructions get ignored - be specific' },
      { pattern: /^#{1,6}\s+.{100,}/gm, message: 'Headers over 100 chars are too long' },
    ],
    goodPatterns: [
      { pattern: /IMPORTANT|YOU MUST|CRITICAL|NEVER|ALWAYS/i, message: 'Has emphasis keywords for critical rules' },
      { pattern: /```(bash|sh|shell)/i, message: 'Includes runnable bash commands' },
      { pattern: /@[\w/.-]+\.(md|json|txt)/g, message: 'Uses @import syntax for modularity' },
    ],
  },
  claudeFolder: {
    expectedStructure: {
      'commands/': { type: 'dir', description: 'Slash commands (.md files)' },
      'skills/': { type: 'dir', description: 'Skills with SKILL.md files' },
      'agents/': { type: 'dir', description: 'Subagent definitions' },
      'hooks/': { type: 'dir', description: 'Hook scripts and configs' },
      'settings.json': { type: 'file', description: 'Project settings (git-tracked)' },
      'settings.local.json': { type: 'file', description: 'Local settings (gitignored)' },
    },
    filePatterns: {
      commands: { ext: '.md', frontmatter: false },
      skills: { ext: '.md', frontmatter: true, requiredFrontmatter: ['name', 'description'] },
      agents: { ext: '.md', frontmatter: true, requiredFrontmatter: ['name', 'description', 'tools'] },
    },
  },
};

/**
 * Create a new audit result structure
 */
export function createAuditResult() {
  return {
    passed: [],
    warnings: [],
    errors: [],
    suggestions: [],
    score: 100,
  };
}
