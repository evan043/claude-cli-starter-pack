/**
 * Claude Skills Format Importer
 *
 * Import adapter for skills from the Jeffallan/claude-skills repository format.
 * Converts SKILL.md + references/ structure to CCASP's skill.md + skill.json format.
 *
 * External format:
 *   SKILL.md — Main skill definition (natural language instructions)
 *   references/ — Directory with reference docs (*.md)
 *
 * CCASP format:
 *   skill.md — Main skill definition
 *   skill.json — Manifest with metadata
 *   references/ — Directory with reference docs
 */

import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, cpSync } from 'fs';
import { join, basename, dirname } from 'path';
import { execSync } from 'child_process';

/**
 * Validate that a directory contains a valid claude-skills format skill
 * @param {string} skillDir - Path to the skill directory
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateClaudeSkillsFormat(skillDir) {
  const errors = [];

  if (!existsSync(skillDir)) {
    errors.push(`Directory does not exist: ${skillDir}`);
    return { valid: false, errors };
  }

  const skillMdPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMdPath)) {
    errors.push('Missing required SKILL.md file');
  }

  const refsDir = join(skillDir, 'references');
  if (!existsSync(refsDir)) {
    errors.push('Missing references/ directory');
  } else {
    const refs = readdirSync(refsDir).filter((f) => f.endsWith('.md'));
    if (refs.length === 0) {
      errors.push('No .md files found in references/ directory');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parse a SKILL.md file to extract metadata for the manifest
 * @param {string} skillMdContent - Content of SKILL.md
 * @returns {Object} Extracted metadata
 */
export function parseSkillMd(skillMdContent) {
  const metadata = {
    name: '',
    description: '',
    category: 'general',
    tags: [],
  };

  // Extract title from first H1
  const titleMatch = skillMdContent.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    metadata.name = titleMatch[1]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Extract description from first paragraph after title
  const descMatch = skillMdContent.match(/^#\s+.+\n+(.+?)(?:\n\n|\n#)/s);
  if (descMatch) {
    metadata.description = descMatch[1].trim().substring(0, 200);
  }

  // Detect category from content keywords
  const categories = {
    devops: /\b(ci[/-]?cd|deploy|docker|kubernetes|github actions|pipeline)\b/i,
    frontend: /\b(react|vue|angular|css|html|ui|component|frontend)\b/i,
    backend: /\b(api|server|database|backend|rest|graphql)\b/i,
    testing: /\b(test|testing|e2e|unit test|integration test)\b/i,
    security: /\b(security|auth|encryption|vulnerability|owasp)\b/i,
    documentation: /\b(documentation|docs|readme|technical writing)\b/i,
  };

  for (const [cat, pattern] of Object.entries(categories)) {
    if (pattern.test(skillMdContent)) {
      metadata.category = cat;
      break;
    }
  }

  // Extract tags from headers and bold text
  const headerMatches = skillMdContent.match(/^##\s+(.+)$/gm) || [];
  const boldMatches = skillMdContent.match(/\*\*(.+?)\*\*/g) || [];

  const tagCandidates = [
    ...headerMatches.map((h) => h.replace(/^##\s+/, '').toLowerCase()),
    ...boldMatches.map((b) => b.replace(/\*\*/g, '').toLowerCase()),
  ];

  metadata.tags = [...new Set(tagCandidates)]
    .filter((t) => t.length > 2 && t.length < 30)
    .slice(0, 10);

  return metadata;
}

/**
 * Generate a CCASP skill.json manifest from parsed metadata
 * @param {Object} metadata - Parsed metadata
 * @param {string[]} referenceFiles - List of reference file names
 * @returns {Object} CCASP skill.json content
 */
export function generateManifest(metadata, referenceFiles = []) {
  return {
    name: metadata.name || 'imported-skill',
    description: metadata.description || 'Imported from external claude-skills format',
    category: metadata.category || 'general',
    portability: 90,
    source: 'claude-skills-import',
    importedAt: new Date().toISOString(),
    references: referenceFiles,
    tags: metadata.tags || [],
  };
}

/**
 * Import a skill from claude-skills format into CCASP format
 * @param {string} sourceDir - Path to the source skill directory (with SKILL.md)
 * @param {string} targetDir - Path to install the skill (e.g., .claude/skills/skill-name)
 * @returns {{ success: boolean, skillName: string, errors: string[] }}
 */
export function importSkill(sourceDir, targetDir) {
  const errors = [];

  // Validate source
  const validation = validateClaudeSkillsFormat(sourceDir);
  if (!validation.valid) {
    return { success: false, skillName: '', errors: validation.errors };
  }

  try {
    // Read SKILL.md
    const skillMdContent = readFileSync(join(sourceDir, 'SKILL.md'), 'utf8');
    const metadata = parseSkillMd(skillMdContent);
    const skillName = metadata.name || basename(sourceDir);

    // Create target directory
    const skillTargetDir = targetDir.endsWith(skillName) ? targetDir : join(targetDir, skillName);
    mkdirSync(skillTargetDir, { recursive: true });

    // Copy SKILL.md as skill.md (CCASP convention)
    writeFileSync(join(skillTargetDir, 'skill.md'), skillMdContent, 'utf8');

    // Copy references directory
    const refsSourceDir = join(sourceDir, 'references');
    const refsTargetDir = join(skillTargetDir, 'references');
    let referenceFiles = [];

    if (existsSync(refsSourceDir)) {
      mkdirSync(refsTargetDir, { recursive: true });
      cpSync(refsSourceDir, refsTargetDir, { recursive: true });
      referenceFiles = readdirSync(refsTargetDir).filter((f) => f.endsWith('.md'));
    }

    // Generate and write skill.json manifest
    const manifest = generateManifest(metadata, referenceFiles);
    writeFileSync(
      join(skillTargetDir, 'skill.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    return { success: true, skillName, errors: [] };
  } catch (error) {
    errors.push(`Import failed: ${error.message}`);
    return { success: false, skillName: '', errors };
  }
}

/**
 * Clone a GitHub repo to a temporary directory and import a specific skill
 * @param {string} repoUrl - GitHub repo URL or owner/repo format
 * @param {string} skillPath - Path within the repo to the skill directory
 * @param {string} targetDir - Where to install the skill
 * @returns {Promise<{ success: boolean, skillName: string, errors: string[] }>}
 */
export async function importFromRepo(repoUrl, skillPath, targetDir) {
  const errors = [];

  // Normalize repo URL
  let normalizedUrl = repoUrl;
  if (!repoUrl.startsWith('http') && !repoUrl.startsWith('git@')) {
    normalizedUrl = `https://github.com/${repoUrl}`;
  }

  // Create temp directory
  const tmpDir = join(process.env.TEMP || process.env.TMPDIR || '/tmp', `ccasp-skill-import-${Date.now()}`);

  try {
    mkdirSync(tmpDir, { recursive: true });

    // Shallow clone
    execSync(`git clone --depth 1 "${normalizedUrl}" "${tmpDir}"`, {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 30000,
    });

    // Find the skill directory
    const fullSkillPath = join(tmpDir, skillPath);
    if (!existsSync(fullSkillPath)) {
      errors.push(`Skill path not found in repo: ${skillPath}`);
      return { success: false, skillName: '', errors };
    }

    // Import using the standard function
    return importSkill(fullSkillPath, targetDir);
  } catch (error) {
    errors.push(`Repo import failed: ${error.message}`);
    return { success: false, skillName: '', errors };
  }
}
