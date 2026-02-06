/**
 * Audit Validators
 *
 * Validation functions for CLAUDE.md files and .claude/ folder structure.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { AUDIT_RULES } from '../rules.js';

/**
 * Audit CLAUDE.md files at various locations
 * @param {string} cwd - Current working directory
 * @param {Object} result - Audit result object to populate
 */
export function auditClaudeMdFiles(cwd, result) {
  const locations = [
    { path: join(cwd, 'CLAUDE.md'), name: 'Root CLAUDE.md', required: true },
    { path: join(cwd, 'CLAUDE.local.md'), name: 'Local CLAUDE.md', required: false },
  ];

  // Check for CLAUDE.md in parent directories (monorepo support)
  let parentDir = join(cwd, '..');
  const checkedPaths = new Set([cwd]);
  let currentDir = cwd;
  while (parentDir !== currentDir && !checkedPaths.has(parentDir)) {
    checkedPaths.add(parentDir);
    const parentClaudeMd = join(parentDir, 'CLAUDE.md');
    if (existsSync(parentClaudeMd)) {
      locations.push({ path: parentClaudeMd, name: `Parent CLAUDE.md (${basename(parentDir)})`, required: false });
    }
    currentDir = parentDir;
    parentDir = join(currentDir, '..');
  }

  let foundAny = false;

  for (const loc of locations) {
    if (existsSync(loc.path)) {
      foundAny = true;
      auditSingleClaudeMd(loc.path, loc.name, result);
    } else if (loc.required) {
      result.errors.push({
        file: loc.path,
        message: `Missing ${loc.name} - run /init to generate one`,
        fix: 'Run `claude /init` to generate a starter CLAUDE.md',
      });
    }
  }

  if (!foundAny) {
    result.errors.push({
      file: 'CLAUDE.md',
      message: 'No CLAUDE.md found in project',
      fix: 'Create a CLAUDE.md file with project-specific instructions',
    });
  }
}

/**
 * Audit a single CLAUDE.md file
 * @param {string} filePath - Path to the CLAUDE.md file
 * @param {string} name - Display name for the file
 * @param {Object} result - Audit result object to populate
 */
export function auditSingleClaudeMd(filePath, name, result) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const lineCount = lines.length;

  // Line count checks
  if (lineCount > AUDIT_RULES.claudeMd.maxLines) {
    result.errors.push({
      file: name,
      message: `${lineCount} lines exceeds max recommended ${AUDIT_RULES.claudeMd.maxLines}`,
      fix: 'Prune ruthlessly - if Claude already does it correctly, remove the instruction',
    });
  } else if (lineCount > AUDIT_RULES.claudeMd.warningLines) {
    result.warnings.push({
      file: name,
      message: `${lineCount} lines is getting long (recommended: <${AUDIT_RULES.claudeMd.recommendedLines})`,
      fix: 'Consider moving domain-specific content to skills',
    });
  } else if (lineCount <= AUDIT_RULES.claudeMd.recommendedLines) {
    result.passed.push({
      file: name,
      message: `Good length: ${lineCount} lines`,
    });
  }

  // Check for anti-patterns
  for (const anti of AUDIT_RULES.claudeMd.antiPatterns) {
    const matches = content.match(anti.pattern);
    if (matches) {
      result.warnings.push({
        file: name,
        message: anti.message,
        fix: `Found ${matches.length} occurrence(s)`,
      });
    }
  }

  // Check for good patterns
  for (const good of AUDIT_RULES.claudeMd.goodPatterns) {
    const matches = content.match(good.pattern);
    if (matches) {
      result.passed.push({
        file: name,
        message: good.message,
      });
    }
  }

  // Check for common content issues
  if (content.length > 15000) {
    result.errors.push({
      file: name,
      message: `File is ${Math.round(content.length / 1000)}KB - too large for efficient loading`,
      fix: 'Split into skills or use @imports',
    });
  }

  // Check for gitignore mention if .local.md
  if (name.includes('local') && !content.includes('.gitignore')) {
    result.suggestions.push({
      file: name,
      message: 'Local files should be gitignored',
      fix: 'Add CLAUDE.local.md to .gitignore',
    });
  }

  // Check for import usage
  const imports = content.match(/@[\w/.-]+/g) || [];
  if (imports.length > 0) {
    result.passed.push({
      file: name,
      message: `Uses ${imports.length} @imports for modularity`,
    });
  }

  // Check for empty or minimal content
  const meaningfulContent = content.replace(/^#.*$/gm, '').replace(/\s+/g, '').length;
  if (meaningfulContent < 100) {
    result.warnings.push({
      file: name,
      message: 'Very little content - might not be useful',
      fix: 'Add bash commands, code style rules, and workflow instructions',
    });
  }
}

/**
 * Audit .claude folder structure
 * @param {string} cwd - Current working directory
 * @param {Object} result - Audit result object to populate
 */
export function auditClaudeFolder(cwd, result) {
  const claudeDir = join(cwd, '.claude');

  if (!existsSync(claudeDir)) {
    result.errors.push({
      file: '.claude/',
      message: 'No .claude folder found',
      fix: 'Create .claude/ directory for commands, skills, hooks, and settings',
    });
    return;
  }

  result.passed.push({
    file: '.claude/',
    message: '.claude folder exists',
  });

  // Check expected structure
  for (const [name, spec] of Object.entries(AUDIT_RULES.claudeFolder.expectedStructure)) {
    const itemPath = join(claudeDir, name);
    const exists = existsSync(itemPath);

    if (!exists) {
      result.suggestions.push({
        file: `.claude/${name}`,
        message: `Missing ${spec.description}`,
        fix: `Create .claude/${name}`,
      });
    } else if (spec.type === 'dir') {
        const isDir = statSync(itemPath).isDirectory();
        if (isDir) {
          result.passed.push({
            file: `.claude/${name}`,
            message: `${spec.description} exists`,
          });
          // Audit contents
          auditClaudeFolderContents(itemPath, name.replace('/', ''), result);
        } else {
          result.errors.push({
            file: `.claude/${name}`,
            message: `Expected directory, found file`,
          });
        }
      } else {
        result.passed.push({
          file: `.claude/${name}`,
          message: `${spec.description} exists`,
        });
        // Validate JSON files
        if (name.endsWith('.json')) {
          validateJsonFile(itemPath, `.claude/${name}`, result);
        }
      }
  }

  // Check for common misconfigurations
  checkCommonMisconfigurations(claudeDir, result);
}

/**
 * Audit contents of .claude subdirectories
 * @param {string} dirPath - Path to the subdirectory
 * @param {string} type - Type of directory (commands, skills, agents)
 * @param {Object} result - Audit result object to populate
 */
export function auditClaudeFolderContents(dirPath, type, result) {
  const files = readdirSync(dirPath);
  const spec = AUDIT_RULES.claudeFolder.filePatterns[type];

  if (!spec) return;

  for (const file of files) {
    const filePath = join(dirPath, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skills can have subdirectories with SKILL.md
      if (type === 'skills') {
        const skillMdPath = join(filePath, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          validateSkillOrAgent(skillMdPath, `.claude/skills/${file}/SKILL.md`, 'skill', result);
        } else {
          result.warnings.push({
            file: `.claude/skills/${file}/`,
            message: 'Skill directory missing SKILL.md',
            fix: 'Add SKILL.md with name, description frontmatter',
          });
        }
      }
      continue;
    }

    const ext = extname(file);

    if (ext !== spec.ext) {
      result.warnings.push({
        file: `.claude/${type}/${file}`,
        message: `Unexpected file extension (expected ${spec.ext})`,
      });
      continue;
    }

    if (spec.frontmatter) {
      if (type === 'skills') {
        validateSkillOrAgent(filePath, `.claude/${type}/${file}`, 'skill', result);
      } else if (type === 'agents') {
        validateSkillOrAgent(filePath, `.claude/${type}/${file}`, 'agent', result);
      }
    } else {
      // Commands just need to be valid markdown
      result.passed.push({
        file: `.claude/${type}/${file}`,
        message: 'Command file found',
      });
    }
  }

  if (files.length === 0) {
    result.suggestions.push({
      file: `.claude/${type}/`,
      message: `Empty ${type} directory`,
      fix: `Add ${type} to extend Claude's capabilities`,
    });
  }
}

/**
 * Validate skill or agent markdown file
 * @param {string} filePath - Path to the file
 * @param {string} displayPath - Display path for messages
 * @param {string} type - 'skill' or 'agent'
 * @param {Object} result - Audit result object to populate
 */
export function validateSkillOrAgent(filePath, displayPath, type, result) {
  const content = readFileSync(filePath, 'utf8');

  // Check for frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    result.errors.push({
      file: displayPath,
      message: `Missing frontmatter (required for ${type}s)`,
      fix: `Add ---\\nname: ...\\ndescription: ...\\n--- at top of file`,
    });
    return;
  }

  const frontmatter = frontmatterMatch[1];
  const required = AUDIT_RULES.claudeFolder.filePatterns[type === 'skill' ? 'skills' : 'agents'].requiredFrontmatter;

  for (const field of required) {
    if (!frontmatter.includes(`${field}:`)) {
      result.errors.push({
        file: displayPath,
        message: `Missing required frontmatter field: ${field}`,
        fix: `Add ${field}: value to frontmatter`,
      });
    }
  }

  // Check for tools in agents
  if (type === 'agent' && !frontmatter.includes('tools:')) {
    result.errors.push({
      file: displayPath,
      message: 'Agent missing tools specification',
      fix: 'Add tools: Read, Grep, Glob, Bash (or specific tools)',
    });
  }

  // Check for model specification in agents (optional but recommended)
  if (type === 'agent' && !frontmatter.includes('model:')) {
    result.suggestions.push({
      file: displayPath,
      message: 'Agent has no model specified (will use default)',
      fix: 'Add model: opus, sonnet, or haiku',
    });
  }

  // Content length check
  const body = content.replace(/^---[\s\S]*?---\n?/, '').trim();
  if (body.length < 50) {
    result.warnings.push({
      file: displayPath,
      message: `${type} has minimal instructions`,
      fix: 'Add detailed instructions for the skill/agent',
    });
  } else {
    result.passed.push({
      file: displayPath,
      message: `Valid ${type} with frontmatter`,
    });
  }
}

/**
 * Validate JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {string} displayPath - Display path for messages
 * @param {Object} result - Audit result object to populate
 */
export function validateJsonFile(filePath, displayPath, result) {
  try {
    const content = readFileSync(filePath, 'utf8');
    JSON.parse(content);
    result.passed.push({
      file: displayPath,
      message: 'Valid JSON',
    });
  } catch (e) {
    result.errors.push({
      file: displayPath,
      message: `Invalid JSON: ${e.message}`,
    });
  }
}

/**
 * Check for common misconfigurations
 * @param {string} claudeDir - Path to .claude directory
 * @param {Object} result - Audit result object to populate
 */
export function checkCommonMisconfigurations(claudeDir, result) {
  // Check if settings.local.json is gitignored
  const gitignorePath = join(claudeDir, '..', '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf8');
    if (!gitignore.includes('settings.local.json') && !gitignore.includes('.claude/settings.local.json')) {
      const localSettingsPath = join(claudeDir, 'settings.local.json');
      if (existsSync(localSettingsPath)) {
        result.warnings.push({
          file: '.claude/settings.local.json',
          message: 'Local settings may not be gitignored',
          fix: 'Add .claude/settings.local.json to .gitignore',
        });
      }
    }
  }

  // Check for MCP configuration
  const mcpPath = join(claudeDir, '..', '.mcp.json');
  if (existsSync(mcpPath)) {
    validateJsonFile(mcpPath, '.mcp.json', result);
  }

  // Check for hooks configuration
  const hooksDir = join(claudeDir, 'hooks');
  if (existsSync(hooksDir)) {
    const hookFiles = readdirSync(hooksDir).filter(f => f.endsWith('.js') || f.endsWith('.sh'));
    if (hookFiles.length > 0) {
      result.passed.push({
        file: '.claude/hooks/',
        message: `${hookFiles.length} hook script(s) configured`,
      });
    }
  }

  // Check settings.json for permissions
  const settingsPath = join(claudeDir, 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (settings.permissions?.allow?.length > 0) {
        result.passed.push({
          file: '.claude/settings.json',
          message: `${settings.permissions.allow.length} allowed tool patterns configured`,
        });
      }
      if (settings.permissions?.deny?.length > 0) {
        result.passed.push({
          file: '.claude/settings.json',
          message: `${settings.permissions.deny.length} denied patterns configured`,
        });
      }
    } catch {
      // Already reported in JSON validation
    }
  }
}
