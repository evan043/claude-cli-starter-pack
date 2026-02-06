/**
 * Codebase Detectors - Tech Stack Detection
 *
 * Pure file-system detection functions for frontend, backend,
 * database, testing, deployment, services, structure, package manager, and monorepo.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Detect frontend framework
 */
export function detectFrontend(cwd) {
  const result = {
    detected: false,
    framework: null,
    language: null,
    bundler: null,
    styling: null,
    version: null,
  };

  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.react) {
        result.detected = true;
        result.framework = 'react';
        result.version = deps.react.replace(/[\^~]/, '');
      } else if (deps.vue) {
        result.detected = true;
        result.framework = 'vue';
        result.version = deps.vue.replace(/[\^~]/, '');
      } else if (deps['@angular/core']) {
        result.detected = true;
        result.framework = 'angular';
        result.version = deps['@angular/core'].replace(/[\^~]/, '');
      } else if (deps.svelte) {
        result.detected = true;
        result.framework = 'svelte';
        result.version = deps.svelte.replace(/[\^~]/, '');
      } else if (deps.next) {
        result.detected = true;
        result.framework = 'nextjs';
        result.version = deps.next.replace(/[\^~]/, '');
      } else if (deps.nuxt) {
        result.detected = true;
        result.framework = 'nuxt';
        result.version = deps.nuxt.replace(/[\^~]/, '');
      }

      if (deps.typescript || existsSync(join(cwd, 'tsconfig.json'))) {
        result.language = 'typescript';
      } else {
        result.language = 'javascript';
      }

      if (deps.vite) {
        result.bundler = 'vite';
      } else if (deps.webpack) {
        result.bundler = 'webpack';
      } else if (deps.parcel) {
        result.bundler = 'parcel';
      } else if (deps.esbuild) {
        result.bundler = 'esbuild';
      }

      if (deps.tailwindcss) {
        result.styling = 'tailwind';
      } else if (deps['styled-components']) {
        result.styling = 'styled-components';
      } else if (deps['@emotion/react']) {
        result.styling = 'emotion';
      } else if (deps.sass || deps['node-sass']) {
        result.styling = 'sass';
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return result;
}

/**
 * Detect backend framework
 */
export function detectBackend(cwd) {
  const result = {
    detected: false,
    framework: null,
    language: null,
    version: null,
  };

  const requirementsPath = join(cwd, 'requirements.txt');
  const pyprojectPath = join(cwd, 'pyproject.toml');

  if (existsSync(requirementsPath)) {
    const content = readFileSync(requirementsPath, 'utf8').toLowerCase();
    result.language = 'python';

    if (content.includes('fastapi')) {
      result.detected = true;
      result.framework = 'fastapi';
    } else if (content.includes('django')) {
      result.detected = true;
      result.framework = 'django';
    } else if (content.includes('flask')) {
      result.detected = true;
      result.framework = 'flask';
    }
  }

  if (existsSync(pyprojectPath)) {
    const content = readFileSync(pyprojectPath, 'utf8').toLowerCase();
    result.language = 'python';

    if (content.includes('fastapi')) {
      result.detected = true;
      result.framework = 'fastapi';
    } else if (content.includes('django')) {
      result.detected = true;
      result.framework = 'django';
    }
  }

  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath) && !result.detected) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.express) {
        result.detected = true;
        result.framework = 'express';
        result.language = 'node';
      } else if (deps.fastify) {
        result.detected = true;
        result.framework = 'fastify';
        result.language = 'node';
      } else if (deps['@nestjs/core']) {
        result.detected = true;
        result.framework = 'nestjs';
        result.language = 'node';
      } else if (deps.koa) {
        result.detected = true;
        result.framework = 'koa';
        result.language = 'node';
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  const goModPath = join(cwd, 'go.mod');
  if (existsSync(goModPath)) {
    const content = readFileSync(goModPath, 'utf8').toLowerCase();
    result.language = 'go';

    if (content.includes('gin-gonic')) {
      result.detected = true;
      result.framework = 'gin';
    } else if (content.includes('echo')) {
      result.detected = true;
      result.framework = 'echo';
    } else if (content.includes('fiber')) {
      result.detected = true;
      result.framework = 'fiber';
    } else {
      result.detected = true;
      result.framework = 'go-std';
    }
  }

  const cargoPath = join(cwd, 'Cargo.toml');
  if (existsSync(cargoPath)) {
    const content = readFileSync(cargoPath, 'utf8').toLowerCase();
    result.language = 'rust';

    if (content.includes('actix')) {
      result.detected = true;
      result.framework = 'actix';
    } else if (content.includes('axum')) {
      result.detected = true;
      result.framework = 'axum';
    } else if (content.includes('rocket')) {
      result.detected = true;
      result.framework = 'rocket';
    }
  }

  const gemfilePath = join(cwd, 'Gemfile');
  if (existsSync(gemfilePath)) {
    const content = readFileSync(gemfilePath, 'utf8').toLowerCase();
    result.language = 'ruby';

    if (content.includes('rails')) {
      result.detected = true;
      result.framework = 'rails';
    } else if (content.includes('sinatra')) {
      result.detected = true;
      result.framework = 'sinatra';
    }
  }

  return result;
}

/**
 * Detect database
 */
export function detectDatabase(cwd) {
  const result = {
    detected: false,
    type: null,
    orm: null,
  };

  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.prisma || deps['@prisma/client']) {
        result.detected = true;
        result.orm = 'prisma';
      } else if (deps.sequelize) {
        result.detected = true;
        result.orm = 'sequelize';
      } else if (deps.typeorm) {
        result.detected = true;
        result.orm = 'typeorm';
      } else if (deps.mongoose) {
        result.detected = true;
        result.type = 'mongodb';
        result.orm = 'mongoose';
      } else if (deps.pg) {
        result.detected = true;
        result.type = 'postgresql';
      } else if (deps.mysql || deps.mysql2) {
        result.detected = true;
        result.type = 'mysql';
      } else if (deps['better-sqlite3'] || deps.sqlite3) {
        result.detected = true;
        result.type = 'sqlite';
      }

      if (deps['@supabase/supabase-js'] || deps['@supabase/ssr']) {
        result.detected = true;
        result.type = 'postgresql';
        result.baas = 'supabase';
      }
    } catch (e) {
      // Ignore
    }
  }

  const requirementsPath = join(cwd, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    const content = readFileSync(requirementsPath, 'utf8').toLowerCase();

    if (content.includes('sqlalchemy')) {
      result.detected = true;
      result.orm = 'sqlalchemy';
    } else if (content.includes('django')) {
      result.detected = true;
      result.orm = 'django-orm';
    } else if (content.includes('tortoise')) {
      result.detected = true;
      result.orm = 'tortoise';
    }

    if (content.includes('psycopg') || content.includes('asyncpg')) {
      result.type = 'postgresql';
    } else if (content.includes('pymysql') || content.includes('mysqlclient')) {
      result.type = 'mysql';
    } else if (content.includes('pymongo')) {
      result.type = 'mongodb';
    }
  }

  const dockerComposePath = join(cwd, 'docker-compose.yml');
  const dockerComposeAltPath = join(cwd, 'docker-compose.yaml');
  const composePath = existsSync(dockerComposePath)
    ? dockerComposePath
    : existsSync(dockerComposeAltPath)
    ? dockerComposeAltPath
    : null;

  if (composePath) {
    const content = readFileSync(composePath, 'utf8').toLowerCase();
    if (content.includes('postgres')) {
      result.detected = true;
      result.type = result.type || 'postgresql';
    } else if (content.includes('mysql') || content.includes('mariadb')) {
      result.detected = true;
      result.type = result.type || 'mysql';
    } else if (content.includes('mongo')) {
      result.detected = true;
      result.type = result.type || 'mongodb';
    } else if (content.includes('redis')) {
      result.cache = 'redis';
    }
  }

  return result;
}

/**
 * Detect testing framework
 */
export function detectTesting(cwd) {
  const result = {
    detected: false,
    framework: null,
    e2e: null,
  };

  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.vitest) {
        result.detected = true;
        result.framework = 'vitest';
      } else if (deps.jest) {
        result.detected = true;
        result.framework = 'jest';
      } else if (deps.mocha) {
        result.detected = true;
        result.framework = 'mocha';
      } else if (deps.ava) {
        result.detected = true;
        result.framework = 'ava';
      }

      if (deps['@playwright/test'] || deps.playwright) {
        result.e2e = 'playwright';
      } else if (deps.cypress) {
        result.e2e = 'cypress';
      } else if (deps.puppeteer) {
        result.e2e = 'puppeteer';
      }
    } catch (e) {
      // Ignore
    }
  }

  const requirementsPath = join(cwd, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    const content = readFileSync(requirementsPath, 'utf8').toLowerCase();
    if (content.includes('pytest')) {
      result.detected = true;
      result.framework = 'pytest';
    }
  }

  if (existsSync(join(cwd, 'vitest.config.ts')) || existsSync(join(cwd, 'vitest.config.js'))) {
    result.detected = true;
    result.framework = 'vitest';
  }
  if (existsSync(join(cwd, 'jest.config.js')) || existsSync(join(cwd, 'jest.config.ts'))) {
    result.detected = true;
    result.framework = 'jest';
  }
  if (existsSync(join(cwd, 'playwright.config.ts')) || existsSync(join(cwd, 'playwright.config.js'))) {
    result.e2e = 'playwright';
  }
  if (existsSync(join(cwd, 'cypress.config.ts')) || existsSync(join(cwd, 'cypress.config.js'))) {
    result.e2e = 'cypress';
  }

  return result;
}

/**
 * Detect deployment platform
 */
export function detectDeployment(cwd) {
  const result = {
    detected: false,
    platform: null,
    containerized: false,
  };

  if (existsSync(join(cwd, 'vercel.json')) || existsSync(join(cwd, '.vercel'))) {
    result.detected = true;
    result.platform = 'vercel';
  }
  if (existsSync(join(cwd, 'netlify.toml'))) {
    result.detected = true;
    result.platform = 'netlify';
  }
  if (existsSync(join(cwd, 'railway.json')) || existsSync(join(cwd, 'railway.toml'))) {
    result.detected = true;
    result.platform = 'railway';
  }
  if (existsSync(join(cwd, 'fly.toml'))) {
    result.detected = true;
    result.platform = 'fly';
  }
  if (existsSync(join(cwd, 'render.yaml'))) {
    result.detected = true;
    result.platform = 'render';
  }
  if (existsSync(join(cwd, 'heroku.yml')) || existsSync(join(cwd, 'Procfile'))) {
    result.detected = true;
    result.platform = 'heroku';
  }
  if (existsSync(join(cwd, 'wrangler.toml'))) {
    result.detected = true;
    result.platform = 'cloudflare';
  }

  if (existsSync(join(cwd, 'Dockerfile')) || existsSync(join(cwd, 'docker-compose.yml'))) {
    result.containerized = true;
  }

  if (existsSync(join(cwd, 'k8s')) || existsSync(join(cwd, 'kubernetes'))) {
    result.detected = true;
    result.platform = 'kubernetes';
    result.containerized = true;
  }

  if (existsSync(join(cwd, 'serverless.yml')) || existsSync(join(cwd, 'serverless.yaml'))) {
    result.detected = true;
    result.platform = 'aws-serverless';
  }
  if (existsSync(join(cwd, 'cdk.json'))) {
    result.detected = true;
    result.platform = 'aws-cdk';
  }

  return result;
}

/**
 * Detect external services and integrations
 */
export function detectServices(cwd) {
  const result = {
    detected: false,
    supabase: false,
    n8n: false,
    stripe: false,
    auth0: false,
    clerk: false,
    resend: false,
    twilio: false,
  };

  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['@supabase/supabase-js'] || deps['@supabase/ssr'] || deps['@supabase/auth-helpers-nextjs']) {
        result.detected = true;
        result.supabase = true;
      }
      if (deps['n8n'] || deps['n8n-workflow'] || deps['n8n-core']) {
        result.detected = true;
        result.n8n = true;
      }
      if (deps.stripe || deps['@stripe/stripe-js']) {
        result.detected = true;
        result.stripe = true;
      }
      if (deps['@auth0/auth0-react'] || deps['@auth0/nextjs-auth0']) {
        result.detected = true;
        result.auth0 = true;
      }
      if (deps['@clerk/nextjs'] || deps['@clerk/clerk-react']) {
        result.detected = true;
        result.clerk = true;
      }
      if (deps.resend || deps['@react-email/components']) {
        result.detected = true;
        result.resend = true;
      }
      if (deps.twilio) {
        result.detected = true;
        result.twilio = true;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  const requirementsPath = join(cwd, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    const content = readFileSync(requirementsPath, 'utf8').toLowerCase();
    if (content.includes('supabase')) {
      result.detected = true;
      result.supabase = true;
    }
  }

  if (
    existsSync(join(cwd, 'n8n.config.js')) ||
    existsSync(join(cwd, '.n8n')) ||
    existsSync(join(cwd, 'n8n-custom'))
  ) {
    result.detected = true;
    result.n8n = true;
  }

  const dockerComposePath = join(cwd, 'docker-compose.yml');
  const dockerComposeAltPath = join(cwd, 'docker-compose.yaml');
  const composePath = existsSync(dockerComposePath)
    ? dockerComposePath
    : existsSync(dockerComposeAltPath)
      ? dockerComposeAltPath
      : null;

  if (composePath) {
    const content = readFileSync(composePath, 'utf8').toLowerCase();
    if (content.includes('n8n') || content.includes('n8nio')) {
      result.detected = true;
      result.n8n = true;
    }
  }

  const envFiles = ['.env', '.env.local', '.env.example', '.env.sample'];
  for (const envFile of envFiles) {
    const envPath = join(cwd, envFile);
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf8').toUpperCase();
      if (content.includes('SUPABASE')) {
        result.detected = true;
        result.supabase = true;
      }
      if (content.includes('N8N')) {
        result.detected = true;
        result.n8n = true;
      }
    }
  }

  return result;
}

/**
 * Detect project structure
 */
export function detectProjectStructure(cwd) {
  return {
    hasClaudeDir: existsSync(join(cwd, '.claude')),
    hasSrcDir: existsSync(join(cwd, 'src')),
    hasAppsDir: existsSync(join(cwd, 'apps')),
    hasPackagesDir: existsSync(join(cwd, 'packages')),
    hasDocsDir: existsSync(join(cwd, 'docs')),
    hasTestsDir: existsSync(join(cwd, 'tests')) || existsSync(join(cwd, '__tests__')),
  };
}

/**
 * Detect package manager
 */
export function detectPackageManager(cwd) {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(cwd, 'bun.lockb'))) return 'bun';
  if (existsSync(join(cwd, 'package-lock.json'))) return 'npm';
  return null;
}

/**
 * Detect if it's a monorepo
 */
export function detectMonorepo(cwd) {
  const result = {
    isMonorepo: false,
    tool: null,
    workspaces: [],
  };

  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (pkg.workspaces) {
        result.isMonorepo = true;
        result.workspaces = Array.isArray(pkg.workspaces)
          ? pkg.workspaces
          : pkg.workspaces.packages || [];
      }
    } catch (e) {
      // Ignore
    }
  }

  if (existsSync(join(cwd, 'pnpm-workspace.yaml'))) {
    result.isMonorepo = true;
    result.tool = 'pnpm';
  }
  if (existsSync(join(cwd, 'lerna.json'))) {
    result.isMonorepo = true;
    result.tool = 'lerna';
  }
  if (existsSync(join(cwd, 'nx.json'))) {
    result.isMonorepo = true;
    result.tool = 'nx';
  }
  if (existsSync(join(cwd, 'turbo.json'))) {
    result.isMonorepo = true;
    result.tool = 'turborepo';
  }

  return result;
}
