/**
 * Enhancement Templates
 *
 * Template generators for CLAUDE.md content based on detected tech stack.
 * Each function generates a specific section of the CLAUDE.md file.
 *
 * Extracted from claude-audit.js for maintainability.
 */

/**
 * Generate Quick Start section
 * @param {Object} techStack - Detected tech stack
 * @returns {string} Generated markdown content
 */
export function quickStart(techStack) {
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
}

/**
 * Generate Tech Stack table section
 * @param {Object} techStack - Detected tech stack
 * @returns {string} Generated markdown content
 */
export function techStackTable(techStack) {
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
}

/**
 * Generate Key Locations section
 * @param {Object} techStack - Detected tech stack
 * @returns {string} Generated markdown content
 */
export function keyLocations(techStack) {
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
}

/**
 * Generate Import Patterns section
 * @param {Object} techStack - Detected tech stack
 * @returns {string} Generated markdown content
 */
export function importPatterns(techStack) {
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
}

/**
 * Generate Testing section
 * @param {Object} techStack - Detected tech stack
 * @returns {string} Generated markdown content
 */
export function testingInstructions(techStack) {
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
}

/**
 * Generate Deployment section
 * @param {Object} techStack - Detected tech stack
 * @returns {string} Generated markdown content
 */
export function deploymentSection(techStack) {
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
}

/**
 * Generate Reference Documentation links section
 * @param {Object} techStack - Detected tech stack
 * @returns {string} Generated markdown content
 */
export function referenceLinks(techStack) {
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
}

/**
 * Generate Architecture Rules section
 * @param {Object} techStack - Detected tech stack
 * @returns {string} Generated markdown content
 */
export function architectureRules(techStack) {
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
}

/**
 * Generate Critical Rules section
 * @returns {string} Generated markdown content
 */
export function criticalRules() {
  return `## Critical Rules

**IMPORTANT**: These rules MUST be followed:

1. **NEVER commit secrets** - Use environment variables
2. **Run tests before committing** - All tests must pass
3. **Use conventional commits** - feat:, fix:, chore:, etc.

`;
}

/**
 * Generate full CLAUDE.md template
 * @param {Object} techStack - Detected tech stack
 * @param {string} projectName - Project name
 * @returns {string} Complete generated CLAUDE.md content
 */
export function fullTemplate(techStack, projectName) {
  const sections = [];

  sections.push(`# ${projectName || 'Project'} - Quick Reference`);
  sections.push('');
  sections.push(quickStart(techStack));
  sections.push(techStackTable(techStack));
  sections.push(keyLocations(techStack));
  sections.push(importPatterns(techStack));
  sections.push(testingInstructions(techStack));
  sections.push(deploymentSection(techStack));
  sections.push(architectureRules(techStack));
  sections.push(criticalRules());
  sections.push(referenceLinks(techStack));

  return sections.filter(s => s.trim()).join('\n');
}

/**
 * Enhancement templates object for backwards compatibility
 */
export const ENHANCEMENT_TEMPLATES = {
  quickStart,
  techStackTable,
  keyLocations,
  importPatterns,
  testingInstructions,
  deploymentSection,
  referenceLinks,
  architectureRules,
  criticalRules,
  fullTemplate,
};
