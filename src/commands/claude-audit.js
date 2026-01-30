/**
 * Claude Audit Command
 *
 * Audits CLAUDE.md files and .claude/ folder structure against
 * Anthropic's Claude Code CLI best practices.
 *
 * Reference: https://code.claude.com/docs/en/best-practices
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { showHeader } from '../cli/menu.js';
import { detectTechStack } from './detect-tech-stack.js';

/**
 * Audit rules based on Anthropic documentation
 */
const AUDIT_RULES = {
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
      { pattern: /@[\w\/\.-]+\.(md|json|txt)/g, message: 'Uses @import syntax for modularity' },
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
 * Enhancement templates for generating CLAUDE.md content
 */
const ENHANCEMENT_TEMPLATES = {
  // Quick Start section - most important
  quickStart: (techStack) => {
    const lines = ['## Quick Start', ''];

    // Build commands based on detected stack
    if (techStack.devEnvironment?.packageManager) {
      const pm = techStack.devEnvironment.packageManager;
      const installCmd = pm === 'yarn' ? 'yarn' : pm === 'pnpm' ? 'pnpm install' : pm === 'bun' ? 'bun install' : 'npm install';
      lines.push('```bash');
      lines.push(`# Install dependencies`);
      lines.push(installCmd);
      lines.push('');
    }

    if (techStack.frontend?.framework) {
      lines.push(`# Run frontend (${techStack.frontend.framework})`);
      lines.push(`${techStack.devEnvironment?.packageManager || 'npm'} run dev`);
      lines.push('');
    }

    if (techStack.backend?.framework) {
      lines.push(`# Run backend (${techStack.backend.framework})`);
      if (techStack.backend.language === 'python') {
        lines.push('python -m uvicorn main:app --reload  # or python run_api.py');
      } else {
        lines.push(`${techStack.devEnvironment?.packageManager || 'npm'} run server`);
      }
      lines.push('');
    }

    if (techStack.testing?.e2e?.framework) {
      lines.push(`# Run E2E tests (${techStack.testing.e2e.framework})`);
      if (techStack.testing.e2e.framework === 'playwright') {
        lines.push('npx playwright test');
      } else if (techStack.testing.e2e.framework === 'cypress') {
        lines.push('npx cypress run');
      }
    }

    lines.push('```');
    lines.push('');
    return lines.join('\n');
  },

  // Tech stack overview table
  techStackTable: (techStack) => {
    const lines = ['## Tech Stack', '', '| Layer | Technology |', '|-------|------------|'];

    if (techStack.frontend?.framework) {
      let frontend = techStack.frontend.framework;
      if (techStack.frontend.buildTool) frontend += ` + ${techStack.frontend.buildTool}`;
      if (techStack.frontend.stateManager) frontend += ` + ${techStack.frontend.stateManager}`;
      lines.push(`| Frontend | ${frontend} |`);
    }

    if (techStack.backend?.framework) {
      lines.push(`| Backend | ${techStack.backend.framework} (${techStack.backend.language || 'unknown'}) |`);
    }

    if (techStack.database?.primary) {
      let db = techStack.database.primary;
      if (techStack.database.orm) db += ` + ${techStack.database.orm}`;
      lines.push(`| Database | ${db} |`);
    }

    if (techStack.testing?.e2e?.framework) {
      lines.push(`| E2E Testing | ${techStack.testing.e2e.framework} |`);
    }

    if (techStack.testing?.unit?.framework) {
      lines.push(`| Unit Testing | ${techStack.testing.unit.framework} |`);
    }

    lines.push('');
    return lines.join('\n');
  },

  // Key locations section
  keyLocations: (techStack) => {
    const lines = ['## Key Locations', '', '| Type | Path |', '|------|------|'];

    if (techStack.frontend?.framework) {
      lines.push('| Frontend Entry | `src/main.tsx` or `src/index.tsx` |');
      lines.push('| Components | `src/components/` |');
    }

    if (techStack.backend?.framework) {
      if (techStack.backend.language === 'python') {
        lines.push('| Backend Entry | `main.py` or `run_api.py` |');
        lines.push('| API Routes | `routes/` or `routers/` |');
      } else {
        lines.push('| Backend Entry | `src/index.ts` or `server.js` |');
        lines.push('| API Routes | `src/routes/` |');
      }
    }

    if (techStack.testing?.e2e?.framework) {
      lines.push('| E2E Tests | `tests/` or `e2e/` |');
    }

    lines.push('| Config | `.env`, `package.json` |');
    lines.push('');
    return lines.join('\n');
  },

  // Import patterns based on language/framework
  importPatterns: (techStack) => {
    const lines = ['## Import Patterns', ''];

    if (techStack.frontend?.framework === 'react') {
      lines.push('**React/TypeScript:**');
      lines.push('```typescript');
      lines.push("import { useState, useEffect } from 'react';");
      lines.push("import { Button } from '@/components/ui';");
      if (techStack.frontend.stateManager === 'zustand') {
        lines.push("import { useStore } from '@/store';");
      } else if (techStack.frontend.stateManager === 'redux') {
        lines.push("import { useSelector, useDispatch } from 'react-redux';");
      }
      lines.push('```');
      lines.push('');
    }

    if (techStack.backend?.language === 'python') {
      lines.push('**Python (FastAPI):**');
      lines.push('```python');
      lines.push('from fastapi import APIRouter, Depends, HTTPException');
      lines.push('from sqlalchemy.orm import Session');
      lines.push('from app.database import get_db');
      lines.push('```');
      lines.push('');
    } else if (techStack.backend?.framework === 'express') {
      lines.push('**Node.js (Express):**');
      lines.push('```typescript');
      lines.push("import express from 'express';");
      lines.push("import { Router } from 'express';");
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  },

  // Testing section
  testingInstructions: (techStack) => {
    const lines = ['## Testing', ''];

    if (techStack.testing?.e2e?.framework === 'playwright') {
      lines.push('**Playwright E2E:**');
      lines.push('```bash');
      lines.push('npx playwright test              # Run all tests');
      lines.push('npx playwright test --ui         # Open UI mode');
      lines.push('npx playwright test --headed     # Show browser');
      lines.push('npx playwright codegen           # Generate tests');
      lines.push('```');
      lines.push('');
    } else if (techStack.testing?.e2e?.framework === 'cypress') {
      lines.push('**Cypress E2E:**');
      lines.push('```bash');
      lines.push('npx cypress run                  # Run headless');
      lines.push('npx cypress open                 # Open UI');
      lines.push('```');
      lines.push('');
    }

    if (techStack.testing?.unit?.framework === 'vitest') {
      lines.push('**Vitest Unit Tests:**');
      lines.push('```bash');
      lines.push('npm run test                     # Run tests');
      lines.push('npm run test -- --coverage       # With coverage');
      lines.push('```');
      lines.push('');
    } else if (techStack.testing?.unit?.framework === 'jest') {
      lines.push('**Jest Unit Tests:**');
      lines.push('```bash');
      lines.push('npm test                         # Run tests');
      lines.push('npm test -- --coverage           # With coverage');
      lines.push('```');
      lines.push('');
    } else if (techStack.testing?.unit?.framework === 'pytest') {
      lines.push('**Pytest:**');
      lines.push('```bash');
      lines.push('pytest                           # Run all tests');
      lines.push('pytest -v                        # Verbose');
      lines.push('pytest --cov=app                 # With coverage');
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  },

  // Deployment section
  deploymentSection: (techStack) => {
    const lines = ['## Deployment', ''];

    if (techStack.deployment?.frontend?.platform) {
      lines.push(`**Frontend (${techStack.deployment.frontend.platform}):**`);
      lines.push('```bash');

      if (techStack.deployment.frontend.platform === 'cloudflare') {
        lines.push('npm run build');
        lines.push('npx wrangler pages deploy dist --project-name=YOUR_PROJECT');
      } else if (techStack.deployment.frontend.platform === 'vercel') {
        lines.push('vercel --prod');
      } else if (techStack.deployment.frontend.platform === 'netlify') {
        lines.push('netlify deploy --prod');
      }

      lines.push('```');
      lines.push('');
    }

    if (techStack.deployment?.backend?.platform) {
      lines.push(`**Backend (${techStack.deployment.backend.platform}):**`);
      lines.push('```bash');

      if (techStack.deployment.backend.platform === 'railway') {
        lines.push('# Use Railway MCP or dashboard');
        lines.push('# railway up');
      } else if (techStack.deployment.backend.platform === 'docker') {
        lines.push('docker build -t app .');
        lines.push('docker push registry/app');
      }

      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  },

  // Reference documentation links
  referenceLinks: (techStack) => {
    const lines = ['## Reference Documentation', ''];
    const links = [];

    // Frontend
    if (techStack.frontend?.framework === 'react') {
      links.push('- [React Docs](https://react.dev/)');
    } else if (techStack.frontend?.framework === 'vue') {
      links.push('- [Vue.js Docs](https://vuejs.org/)');
    } else if (techStack.frontend?.framework === 'angular') {
      links.push('- [Angular Docs](https://angular.io/docs)');
    } else if (techStack.frontend?.framework === 'svelte') {
      links.push('- [Svelte Docs](https://svelte.dev/docs)');
    } else if (techStack.frontend?.framework === 'nextjs') {
      links.push('- [Next.js Docs](https://nextjs.org/docs)');
    }

    // Build tools
    if (techStack.frontend?.buildTool === 'vite') {
      links.push('- [Vite Docs](https://vitejs.dev/)');
    }

    // State
    if (techStack.frontend?.stateManager === 'zustand') {
      links.push('- [Zustand Docs](https://github.com/pmndrs/zustand)');
    } else if (techStack.frontend?.stateManager === 'redux') {
      links.push('- [Redux Toolkit](https://redux-toolkit.js.org/)');
    }

    // Styling
    if (techStack.frontend?.styling === 'tailwind') {
      links.push('- [Tailwind CSS](https://tailwindcss.com/docs)');
    }

    // Backend
    if (techStack.backend?.framework === 'fastapi') {
      links.push('- [FastAPI Docs](https://fastapi.tiangolo.com/)');
    } else if (techStack.backend?.framework === 'express') {
      links.push('- [Express.js Docs](https://expressjs.com/)');
    } else if (techStack.backend?.framework === 'nestjs') {
      links.push('- [NestJS Docs](https://docs.nestjs.com/)');
    }

    // Database/ORM
    if (techStack.database?.orm === 'prisma') {
      links.push('- [Prisma Docs](https://www.prisma.io/docs)');
    } else if (techStack.database?.orm === 'sqlalchemy') {
      links.push('- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)');
    }

    // Testing
    if (techStack.testing?.e2e?.framework === 'playwright') {
      links.push('- [Playwright Docs](https://playwright.dev/)');
    } else if (techStack.testing?.e2e?.framework === 'cypress') {
      links.push('- [Cypress Docs](https://docs.cypress.io/)');
    }

    if (links.length === 0) {
      return '';
    }

    lines.push(...links, '');
    return lines.join('\n');
  },

  // Architecture rules based on stack
  architectureRules: (techStack) => {
    const lines = ['## Architecture Rules', ''];

    if (techStack.frontend?.framework === 'react') {
      lines.push('**React Guidelines:**');
      lines.push('- Use functional components with hooks');
      lines.push('- Colocate component styles and tests');
      lines.push('- Extract shared logic into custom hooks');
      lines.push('');
    }

    if (techStack.backend?.language === 'python') {
      lines.push('**Python Guidelines:**');
      lines.push('- Use type hints for all function signatures');
      lines.push('- Keep route handlers thin - delegate to services');
      lines.push('- Use dependency injection for database sessions');
      lines.push('');
    }

    if (techStack.database?.primary === 'postgresql') {
      lines.push('**Database Guidelines:**');
      lines.push('- Use migrations for schema changes');
      lines.push('- Index frequently queried columns');
      lines.push('- Use connection pooling in production');
      lines.push('');
    }

    return lines.join('\n');
  },

  // Critical rules with emphasis
  criticalRules: () => {
    return `## Critical Rules

**IMPORTANT**: These rules MUST be followed:

1. **NEVER commit secrets** - Use environment variables
2. **Run tests before committing** - All tests must pass
3. **Use conventional commits** - feat:, fix:, chore:, etc.

`;
  },

  // Full CLAUDE.md template
  fullTemplate: (techStack, projectName) => {
    const sections = [];

    sections.push(`# ${projectName || 'Project'} - Quick Reference`);
    sections.push('');
    sections.push(ENHANCEMENT_TEMPLATES.quickStart(techStack));
    sections.push(ENHANCEMENT_TEMPLATES.techStackTable(techStack));
    sections.push(ENHANCEMENT_TEMPLATES.keyLocations(techStack));
    sections.push(ENHANCEMENT_TEMPLATES.importPatterns(techStack));
    sections.push(ENHANCEMENT_TEMPLATES.testingInstructions(techStack));
    sections.push(ENHANCEMENT_TEMPLATES.deploymentSection(techStack));
    sections.push(ENHANCEMENT_TEMPLATES.architectureRules(techStack));
    sections.push(ENHANCEMENT_TEMPLATES.criticalRules());
    sections.push(ENHANCEMENT_TEMPLATES.referenceLinks(techStack));

    return sections.filter(s => s.trim()).join('\n');
  },
};

/**
 * Audit result structure
 */
function createAuditResult() {
  return {
    passed: [],
    warnings: [],
    errors: [],
    suggestions: [],
    score: 100,
  };
}

/**
 * Main audit runner
 */
export async function runClaudeAudit(options = {}) {
  const cwd = options.cwd || process.cwd();

  showHeader('Claude Code Audit');

  console.log(chalk.dim('Auditing against Anthropic best practices...'));
  console.log(chalk.dim('Reference: https://code.claude.com/docs/en/best-practices'));
  console.log('');

  const spinner = ora('Scanning project...').start();

  const results = {
    claudeMd: createAuditResult(),
    claudeFolder: createAuditResult(),
    overall: createAuditResult(),
  };

  // Audit CLAUDE.md files
  spinner.text = 'Auditing CLAUDE.md files...';
  auditClaudeMdFiles(cwd, results.claudeMd);

  // Audit .claude folder
  spinner.text = 'Auditing .claude/ folder structure...';
  auditClaudeFolder(cwd, results.claudeFolder);

  // Calculate overall score
  calculateOverallScore(results);

  spinner.succeed('Audit complete');
  console.log('');

  // Display results
  displayAuditResults(results);

  // Show fix suggestions
  if (options.interactive !== false) {
    await showFixSuggestions(results, cwd);
  }

  return results;
}

/**
 * Audit CLAUDE.md files at various locations
 */
function auditClaudeMdFiles(cwd, result) {
  const locations = [
    { path: join(cwd, 'CLAUDE.md'), name: 'Root CLAUDE.md', required: true },
    { path: join(cwd, 'CLAUDE.local.md'), name: 'Local CLAUDE.md', required: false },
  ];

  // Check for CLAUDE.md in parent directories (monorepo support)
  let parentDir = join(cwd, '..');
  const checkedPaths = new Set([cwd]);
  while (parentDir !== cwd && !checkedPaths.has(parentDir)) {
    checkedPaths.add(parentDir);
    const parentClaudeMd = join(parentDir, 'CLAUDE.md');
    if (existsSync(parentClaudeMd)) {
      locations.push({ path: parentClaudeMd, name: `Parent CLAUDE.md (${basename(parentDir)})`, required: false });
    }
    cwd = parentDir;
    parentDir = join(cwd, '..');
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
 */
function auditSingleClaudeMd(filePath, name, result) {
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
  const imports = content.match(/@[\w\/\.-]+/g) || [];
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
 */
function auditClaudeFolder(cwd, result) {
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
    } else {
      if (spec.type === 'dir') {
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
  }

  // Check for common misconfigurations
  checkCommonMisconfigurations(claudeDir, result);
}

/**
 * Audit contents of .claude subdirectories
 */
function auditClaudeFolderContents(dirPath, type, result) {
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
 */
function validateSkillOrAgent(filePath, displayPath, type, result) {
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
 */
function validateJsonFile(filePath, displayPath, result) {
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
 */
function checkCommonMisconfigurations(claudeDir, result) {
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
    } catch (e) {
      // Already reported in JSON validation
    }
  }
}

/**
 * Calculate overall score
 */
function calculateOverallScore(results) {
  let totalPassed = 0;
  let totalWarnings = 0;
  let totalErrors = 0;

  for (const key of ['claudeMd', 'claudeFolder']) {
    totalPassed += results[key].passed.length;
    totalWarnings += results[key].warnings.length;
    totalErrors += results[key].errors.length;
  }

  // Score calculation: start at 100, -5 per warning, -15 per error
  let score = 100 - (totalWarnings * 5) - (totalErrors * 15);
  score = Math.max(0, Math.min(100, score));

  results.overall = {
    passed: totalPassed,
    warnings: totalWarnings,
    errors: totalErrors,
    suggestions: results.claudeMd.suggestions.length + results.claudeFolder.suggestions.length,
    score,
  };
}

/**
 * Display audit results
 */
function displayAuditResults(results) {
  const { overall } = results;

  // Score display with color
  let scoreColor = chalk.green;
  let scoreEmoji = '✅';
  if (overall.score < 50) {
    scoreColor = chalk.red;
    scoreEmoji = '❌';
  } else if (overall.score < 75) {
    scoreColor = chalk.yellow;
    scoreEmoji = '⚠️';
  }

  console.log(chalk.bold('━'.repeat(60)));
  console.log(`${scoreEmoji} ${chalk.bold('Audit Score:')} ${scoreColor.bold(overall.score + '/100')}`);
  console.log(chalk.bold('━'.repeat(60)));
  console.log('');

  console.log(`  ${chalk.green('✓')} Passed: ${overall.passed}`);
  console.log(`  ${chalk.yellow('⚠')} Warnings: ${overall.warnings}`);
  console.log(`  ${chalk.red('✗')} Errors: ${overall.errors}`);
  console.log(`  ${chalk.blue('💡')} Suggestions: ${overall.suggestions}`);
  console.log('');

  // Display errors first
  if (results.claudeMd.errors.length > 0 || results.claudeFolder.errors.length > 0) {
    console.log(chalk.red.bold('Errors (must fix):'));
    for (const err of [...results.claudeMd.errors, ...results.claudeFolder.errors]) {
      console.log(`  ${chalk.red('✗')} ${chalk.dim(err.file)} - ${err.message}`);
      if (err.fix) {
        console.log(`    ${chalk.dim('Fix:')} ${err.fix}`);
      }
    }
    console.log('');
  }

  // Display warnings
  if (results.claudeMd.warnings.length > 0 || results.claudeFolder.warnings.length > 0) {
    console.log(chalk.yellow.bold('Warnings (should fix):'));
    for (const warn of [...results.claudeMd.warnings, ...results.claudeFolder.warnings]) {
      console.log(`  ${chalk.yellow('⚠')} ${chalk.dim(warn.file)} - ${warn.message}`);
      if (warn.fix) {
        console.log(`    ${chalk.dim('Fix:')} ${warn.fix}`);
      }
    }
    console.log('');
  }

  // Display suggestions (collapsed by default)
  if (overall.suggestions > 0) {
    console.log(chalk.blue.bold('Suggestions (optional):'));
    for (const sug of [...results.claudeMd.suggestions, ...results.claudeFolder.suggestions]) {
      console.log(`  ${chalk.blue('💡')} ${chalk.dim(sug.file)} - ${sug.message}`);
    }
    console.log('');
  }

  // Display passes (summarized)
  if (overall.passed > 0) {
    console.log(chalk.green.bold(`Passed Checks (${overall.passed}):`));
    const passedItems = [...results.claudeMd.passed, ...results.claudeFolder.passed];
    // Show first 5, summarize rest
    const toShow = passedItems.slice(0, 5);
    for (const pass of toShow) {
      console.log(`  ${chalk.green('✓')} ${chalk.dim(pass.file)} - ${pass.message}`);
    }
    if (passedItems.length > 5) {
      console.log(`  ${chalk.dim(`... and ${passedItems.length - 5} more`)}`);
    }
    console.log('');
  }
}

/**
 * Show fix suggestions interactively
 */
async function showFixSuggestions(results, cwd) {
  const { overall } = results;

  if (overall.errors === 0 && overall.warnings === 0) {
    console.log(chalk.green.bold('🎉 Great job! Your Claude configuration follows best practices.'));
    console.log('');

    // Still offer enhancement even if passing
    const { wantEnhance } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'wantEnhance',
        message: 'Would you like to enhance CLAUDE.md with additional sections based on your tech stack?',
        default: false,
      },
    ]);

    if (wantEnhance) {
      await runEnhancement(cwd);
    }
    return;
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: chalk.cyan('✨ Auto-enhance CLAUDE.md (Recommended)'), value: 'enhance' },
        { name: 'Show detailed fix instructions', value: 'details' },
        { name: 'Show best practices reference', value: 'reference' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  if (action === 'enhance') {
    await runEnhancement(cwd);
  } else if (action === 'details') {
    showDetailedFixes(results);
  } else if (action === 'reference') {
    showBestPracticesReference();
  }
}

/**
 * Show detailed fix instructions
 */
function showDetailedFixes(results) {
  console.log('');
  console.log(chalk.bold('━'.repeat(60)));
  console.log(chalk.bold('Detailed Fix Instructions'));
  console.log(chalk.bold('━'.repeat(60)));
  console.log('');

  const allIssues = [
    ...results.claudeMd.errors.map(e => ({ ...e, type: 'error' })),
    ...results.claudeFolder.errors.map(e => ({ ...e, type: 'error' })),
    ...results.claudeMd.warnings.map(w => ({ ...w, type: 'warning' })),
    ...results.claudeFolder.warnings.map(w => ({ ...w, type: 'warning' })),
  ];

  for (let i = 0; i < allIssues.length; i++) {
    const issue = allIssues[i];
    const icon = issue.type === 'error' ? chalk.red('✗') : chalk.yellow('⚠');
    console.log(`${i + 1}. ${icon} ${chalk.bold(issue.file)}`);
    console.log(`   Issue: ${issue.message}`);
    if (issue.fix) {
      console.log(`   ${chalk.green('Fix:')} ${issue.fix}`);
    }
    console.log('');
  }
}

/**
 * Show best practices reference
 */
function showBestPracticesReference() {
  console.log('');
  console.log(chalk.bold('━'.repeat(60)));
  console.log(chalk.bold('Claude Code Best Practices Reference'));
  console.log(chalk.bold('━'.repeat(60)));
  console.log('');

  console.log(chalk.cyan.bold('CLAUDE.md Best Practices:'));
  console.log('');
  console.log(`  ${chalk.green('✓')} Keep under 60-150 lines (max 300)`);
  console.log(`  ${chalk.green('✓')} Include bash commands Claude can't guess`);
  console.log(`  ${chalk.green('✓')} Document code style rules that differ from defaults`);
  console.log(`  ${chalk.green('✓')} Add testing instructions and preferred runners`);
  console.log(`  ${chalk.green('✓')} Use emphasis (IMPORTANT, YOU MUST) for critical rules`);
  console.log(`  ${chalk.green('✓')} Use @imports to keep files modular`);
  console.log('');
  console.log(`  ${chalk.red('✗')} Avoid long code blocks (link to docs instead)`);
  console.log(`  ${chalk.red('✗')} Skip obvious/generic advice ("write clean code")`);
  console.log(`  ${chalk.red('✗')} Don't include API docs (link instead)`);
  console.log(`  ${chalk.red('✗')} Remove anything Claude does correctly without instruction`);
  console.log('');

  console.log(chalk.cyan.bold('.claude/ Folder Structure:'));
  console.log('');
  console.log('  .claude/');
  console.log('  ├── commands/        # Slash commands (.md files)');
  console.log('  ├── skills/          # Skills with SKILL.md');
  console.log('  ├── agents/          # Subagent definitions');
  console.log('  ├── hooks/           # Hook scripts');
  console.log('  ├── settings.json    # Shared settings (git-tracked)');
  console.log('  └── settings.local.json  # Local settings (gitignored)');
  console.log('');

  console.log(chalk.cyan.bold('Skill/Agent Frontmatter:'));
  console.log('');
  console.log('  ---');
  console.log('  name: my-skill');
  console.log('  description: What this skill does');
  console.log('  tools: Read, Grep, Glob, Bash  # agents only');
  console.log('  model: opus                     # optional');
  console.log('  ---');
  console.log('');

  console.log(chalk.dim('Reference: https://code.claude.com/docs/en/best-practices'));
  console.log('');
}

/**
 * Run CLAUDE.md enhancement
 */
async function runEnhancement(cwd) {
  console.log('');
  console.log(chalk.bold('━'.repeat(60)));
  console.log(chalk.bold.cyan('🚀 CLAUDE.md Enhancement Mode'));
  console.log(chalk.bold('━'.repeat(60)));
  console.log('');

  const spinner = ora('Detecting tech stack...').start();

  // Detect tech stack
  const techStack = await detectTechStack(cwd, { silent: true });

  spinner.succeed('Tech stack detected');

  // Show what was detected
  console.log('');
  console.log(chalk.cyan('Detected Technologies:'));
  const detected = techStack._detected || [];
  for (const item of detected.slice(0, 8)) {
    console.log(`  ${chalk.green('✓')} ${item}`);
  }
  if (detected.length > 8) {
    console.log(chalk.dim(`  ... and ${detected.length - 8} more`));
  }
  console.log('');

  // Get project name
  const projectName = techStack.project?.name || basename(cwd);

  // Ask what to enhance
  const { enhanceMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'enhanceMode',
      message: 'What would you like to do?',
      choices: [
        { name: 'Generate full CLAUDE.md from scratch', value: 'full' },
        { name: 'Add missing sections to existing CLAUDE.md', value: 'add' },
        { name: 'Generate specific section', value: 'section' },
        { name: 'Preview generated content', value: 'preview' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (enhanceMode === 'back') return;

  if (enhanceMode === 'preview') {
    console.log('');
    console.log(chalk.bold('━'.repeat(60)));
    console.log(chalk.bold('Generated CLAUDE.md Preview:'));
    console.log(chalk.bold('━'.repeat(60)));
    console.log('');
    console.log(ENHANCEMENT_TEMPLATES.fullTemplate(techStack, projectName));
    console.log(chalk.bold('━'.repeat(60)));
    console.log('');

    const { savePreview } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'savePreview',
        message: 'Save this to CLAUDE.md?',
        default: false,
      },
    ]);

    if (savePreview) {
      await saveClaudeMd(cwd, techStack, projectName, 'full');
    }
    return;
  }

  if (enhanceMode === 'section') {
    const { section } = await inquirer.prompt([
      {
        type: 'list',
        name: 'section',
        message: 'Which section to generate?',
        choices: [
          { name: 'Quick Start (commands to run)', value: 'quickStart' },
          { name: 'Tech Stack Table', value: 'techStackTable' },
          { name: 'Key Locations', value: 'keyLocations' },
          { name: 'Import Patterns', value: 'importPatterns' },
          { name: 'Testing Instructions', value: 'testingInstructions' },
          { name: 'Deployment Section', value: 'deploymentSection' },
          { name: 'Architecture Rules', value: 'architectureRules' },
          { name: 'Critical Rules', value: 'criticalRules' },
          { name: 'Reference Documentation Links', value: 'referenceLinks' },
        ],
      },
    ]);

    const content = ENHANCEMENT_TEMPLATES[section](techStack);
    console.log('');
    console.log(chalk.bold('Generated Content:'));
    console.log(chalk.bold('━'.repeat(60)));
    console.log(content);
    console.log(chalk.bold('━'.repeat(60)));
    console.log('');

    const { appendSection } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'appendSection',
        message: 'Append this section to CLAUDE.md?',
        default: true,
      },
    ]);

    if (appendSection) {
      await appendToClaudeMd(cwd, content);
    }
    return;
  }

  if (enhanceMode === 'full') {
    await saveClaudeMd(cwd, techStack, projectName, 'full');
    return;
  }

  if (enhanceMode === 'add') {
    await addMissingSections(cwd, techStack, projectName);
    return;
  }
}

/**
 * Save full CLAUDE.md
 */
async function saveClaudeMd(cwd, techStack, projectName, mode) {
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  const backupPath = join(cwd, 'CLAUDE.md.backup');

  // Check for existing file
  if (existsSync(claudeMdPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'list',
        name: 'overwrite',
        message: 'CLAUDE.md already exists. What would you like to do?',
        choices: [
          { name: 'Backup existing and replace', value: 'backup' },
          { name: 'Merge with existing (add missing sections)', value: 'merge' },
          { name: 'Cancel', value: 'cancel' },
        ],
      },
    ]);

    if (overwrite === 'cancel') {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }

    if (overwrite === 'backup') {
      const existingContent = readFileSync(claudeMdPath, 'utf8');
      writeFileSync(backupPath, existingContent, 'utf8');
      console.log(chalk.dim(`Backed up to ${backupPath}`));
    }

    if (overwrite === 'merge') {
      await addMissingSections(cwd, techStack, projectName);
      return;
    }
  }

  // Generate and save
  const content = ENHANCEMENT_TEMPLATES.fullTemplate(techStack, projectName);
  writeFileSync(claudeMdPath, content, 'utf8');

  console.log(chalk.green.bold('✓ CLAUDE.md generated successfully!'));
  console.log(chalk.dim(`  Path: ${claudeMdPath}`));
  console.log('');

  // Show stats
  const lines = content.split('\n').length;
  console.log(chalk.cyan('Stats:'));
  console.log(`  Lines: ${lines} (recommended: <60, max: 300)`);
  console.log(`  Size: ${(content.length / 1024).toFixed(1)} KB`);
  console.log('');
}

/**
 * Append content to existing CLAUDE.md
 */
async function appendToClaudeMd(cwd, content) {
  const claudeMdPath = join(cwd, 'CLAUDE.md');

  let existingContent = '';
  if (existsSync(claudeMdPath)) {
    existingContent = readFileSync(claudeMdPath, 'utf8');
  }

  const newContent = existingContent.trim() + '\n\n' + content;
  writeFileSync(claudeMdPath, newContent, 'utf8');

  console.log(chalk.green.bold('✓ Section appended to CLAUDE.md'));
}

/**
 * Add missing sections to existing CLAUDE.md
 */
async function addMissingSections(cwd, techStack, projectName) {
  const claudeMdPath = join(cwd, 'CLAUDE.md');

  let existingContent = '';
  if (existsSync(claudeMdPath)) {
    existingContent = readFileSync(claudeMdPath, 'utf8');
  }

  const missingSections = [];

  // Check which sections are missing
  const sectionChecks = [
    { pattern: /##\s*quick\s*start/i, name: 'Quick Start', key: 'quickStart' },
    { pattern: /##\s*tech\s*stack/i, name: 'Tech Stack', key: 'techStackTable' },
    { pattern: /##\s*key\s*locations/i, name: 'Key Locations', key: 'keyLocations' },
    { pattern: /##\s*import\s*patterns/i, name: 'Import Patterns', key: 'importPatterns' },
    { pattern: /##\s*testing/i, name: 'Testing', key: 'testingInstructions' },
    { pattern: /##\s*deploy/i, name: 'Deployment', key: 'deploymentSection' },
    { pattern: /##\s*architecture/i, name: 'Architecture Rules', key: 'architectureRules' },
    { pattern: /##\s*critical/i, name: 'Critical Rules', key: 'criticalRules' },
    { pattern: /##\s*reference/i, name: 'Reference Links', key: 'referenceLinks' },
  ];

  for (const check of sectionChecks) {
    if (!check.pattern.test(existingContent)) {
      missingSections.push(check);
    }
  }

  if (missingSections.length === 0) {
    console.log(chalk.green.bold('✓ CLAUDE.md already has all recommended sections!'));
    return;
  }

  console.log('');
  console.log(chalk.yellow(`Found ${missingSections.length} missing sections:`));
  for (const section of missingSections) {
    console.log(`  ${chalk.dim('-')} ${section.name}`);
  }
  console.log('');

  const { sectionsToAdd } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'sectionsToAdd',
      message: 'Select sections to add:',
      choices: missingSections.map((s) => ({
        name: s.name,
        value: s.key,
        checked: true,
      })),
    },
  ]);

  if (sectionsToAdd.length === 0) {
    console.log(chalk.yellow('No sections selected.'));
    return;
  }

  // Generate and append selected sections
  let newContent = existingContent.trim();

  for (const key of sectionsToAdd) {
    const sectionContent = ENHANCEMENT_TEMPLATES[key](techStack);
    if (sectionContent.trim()) {
      newContent += '\n\n' + sectionContent;
    }
  }

  writeFileSync(claudeMdPath, newContent, 'utf8');

  console.log(chalk.green.bold(`✓ Added ${sectionsToAdd.length} sections to CLAUDE.md`));
}

/**
 * Suggest enhancements based on audit results
 */
function generateEnhancementSuggestions(results, techStack) {
  const suggestions = [];

  // Check if missing Quick Start
  const hasQuickStart = results.claudeMd.passed.some((p) =>
    p.message?.includes('Quick Start')
  );
  if (!hasQuickStart) {
    suggestions.push({
      type: 'section',
      name: 'Quick Start',
      priority: 'high',
      reason: 'Every CLAUDE.md should have runnable commands',
      content: ENHANCEMENT_TEMPLATES.quickStart(techStack),
    });
  }

  // Check if file is too short
  const veryShort = results.claudeMd.warnings.some((w) =>
    w.message?.includes('Very little content')
  );
  if (veryShort) {
    suggestions.push({
      type: 'full',
      name: 'Full Enhancement',
      priority: 'high',
      reason: 'CLAUDE.md has minimal content',
    });
  }

  // Suggest reference docs based on tech stack
  if (techStack.frontend?.framework || techStack.backend?.framework) {
    suggestions.push({
      type: 'section',
      name: 'Reference Links',
      priority: 'medium',
      reason: 'Add framework documentation links',
      content: ENHANCEMENT_TEMPLATES.referenceLinks(techStack),
    });
  }

  return suggestions;
}

/**
 * Interactive menu entry point
 */
export async function showClaudeAuditMenu() {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Claude Code Configuration Audit:',
      choices: [
        { name: 'Run Full Audit', value: 'full' },
        { name: 'Audit CLAUDE.md only', value: 'claudemd' },
        { name: 'Audit .claude/ folder only', value: 'folder' },
        { name: chalk.cyan('✨ Enhance CLAUDE.md (NEW)'), value: 'enhance' },
        { name: 'Show Best Practices Reference', value: 'reference' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (mode === 'back') return;

  if (mode === 'reference') {
    showBestPracticesReference();
    return;
  }

  if (mode === 'enhance') {
    await runEnhancement(process.cwd());
    return;
  }

  await runClaudeAudit({ mode });
}

// Export enhancement templates for use by other modules
export { ENHANCEMENT_TEMPLATES, runEnhancement };
