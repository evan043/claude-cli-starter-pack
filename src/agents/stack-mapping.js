/**
 * Tech Stack to Agent Mapping
 *
 * Maps detected tech stack components to appropriate agent names and configurations.
 */

import { createAgentDefinition } from './schema.js';

/**
 * Framework to agent name mapping
 */
export const FRAMEWORK_AGENT_MAP = {
  // Frontend frameworks
  frontend: {
    react: 'frontend-react-specialist',
    vue: 'frontend-vue-specialist',
    angular: 'frontend-angular-specialist',
    svelte: 'frontend-svelte-specialist',
    nextjs: 'frontend-nextjs-specialist',
    nuxt: 'frontend-nuxt-specialist',
    astro: 'frontend-astro-specialist',
    solid: 'frontend-solid-specialist',
    qwik: 'frontend-qwik-specialist',
  },

  // State managers
  state: {
    zustand: 'state-zustand-specialist',
    redux: 'state-redux-specialist',
    pinia: 'state-pinia-specialist',
    vuex: 'state-vuex-specialist',
    mobx: 'state-mobx-specialist',
    jotai: 'state-jotai-specialist',
    recoil: 'state-recoil-specialist',
    xstate: 'state-xstate-specialist',
  },

  // Backend frameworks
  backend: {
    fastapi: 'backend-fastapi-specialist',
    express: 'backend-express-specialist',
    nestjs: 'backend-nestjs-specialist',
    django: 'backend-django-specialist',
    flask: 'backend-flask-specialist',
    rails: 'backend-rails-specialist',
    gin: 'backend-gin-specialist',
    spring: 'backend-spring-specialist',
    laravel: 'backend-laravel-specialist',
    phoenix: 'backend-phoenix-specialist',
  },

  // Databases
  database: {
    postgresql: 'db-postgresql-specialist',
    mysql: 'db-mysql-specialist',
    mongodb: 'db-mongodb-specialist',
    sqlite: 'db-sqlite-specialist',
    redis: 'db-redis-specialist',
    dynamodb: 'db-dynamodb-specialist',
  },

  // ORMs
  orm: {
    prisma: 'orm-prisma-specialist',
    drizzle: 'orm-drizzle-specialist',
    typeorm: 'orm-typeorm-specialist',
    sequelize: 'orm-sequelize-specialist',
    sqlalchemy: 'orm-sqlalchemy-specialist',
    django: 'orm-django-specialist', // Django ORM
    activerecord: 'orm-activerecord-specialist',
  },

  // Testing frameworks
  testing: {
    playwright: 'test-playwright-specialist',
    cypress: 'test-cypress-specialist',
    puppeteer: 'test-puppeteer-specialist',
    selenium: 'test-selenium-specialist',
    vitest: 'test-vitest-specialist',
    jest: 'test-jest-specialist',
    mocha: 'test-mocha-specialist',
    pytest: 'test-pytest-specialist',
    rspec: 'test-rspec-specialist',
  },

  // Deployment platforms
  deployment: {
    railway: 'deploy-railway-specialist',
    cloudflare: 'deploy-cloudflare-specialist',
    vercel: 'deploy-vercel-specialist',
    netlify: 'deploy-netlify-specialist',
    aws: 'deploy-aws-specialist',
    gcp: 'deploy-gcp-specialist',
    azure: 'deploy-azure-specialist',
    docker: 'deploy-docker-specialist',
    kubernetes: 'deploy-kubernetes-specialist',
    fly: 'deploy-fly-specialist',
    render: 'deploy-render-specialist',
    heroku: 'deploy-heroku-specialist',
  },
};

/**
 * Agent configurations by framework
 * Defines tools, triggers, and file patterns specific to each framework
 */
export const AGENT_CONFIGS = {
  // Frontend agents
  'frontend-react-specialist': {
    level: 'L2',
    domain: 'frontend',
    framework: 'react',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['component', 'hook', 'jsx', 'tsx', 'react', 'useState', 'useEffect', 'context'],
    filePatterns: ['src/components/**', 'src/hooks/**', 'src/pages/**', '*.tsx', '*.jsx'],
    description: 'React component and hooks specialist with TypeScript support',
  },
  'frontend-vue-specialist': {
    level: 'L2',
    domain: 'frontend',
    framework: 'vue',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['component', 'vue', 'composable', 'ref', 'reactive', 'computed'],
    filePatterns: ['src/components/**', 'src/composables/**', 'src/views/**', '*.vue'],
    description: 'Vue 3 component and composables specialist',
  },
  'frontend-angular-specialist': {
    level: 'L2',
    domain: 'frontend',
    framework: 'angular',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['component', 'angular', 'service', 'directive', 'pipe', 'module'],
    filePatterns: ['src/app/**', '*.component.ts', '*.service.ts', '*.module.ts'],
    description: 'Angular component, service, and module specialist',
  },
  'frontend-svelte-specialist': {
    level: 'L2',
    domain: 'frontend',
    framework: 'svelte',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['component', 'svelte', 'store', 'reactive'],
    filePatterns: ['src/**/*.svelte', 'src/lib/**'],
    description: 'Svelte/SvelteKit component specialist',
  },
  'frontend-nextjs-specialist': {
    level: 'L2',
    domain: 'frontend',
    framework: 'nextjs',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['page', 'api route', 'server component', 'client component', 'nextjs', 'app router'],
    filePatterns: ['app/**', 'pages/**', 'src/app/**', 'src/pages/**'],
    description: 'Next.js App Router and Pages specialist',
  },

  // State management agents
  'state-zustand-specialist': {
    level: 'L2',
    domain: 'state',
    framework: 'zustand',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob'],
    triggers: ['store', 'zustand', 'state', 'create', 'persist'],
    filePatterns: ['src/store/**', 'src/stores/**', '**/store.ts', '**/stores/**'],
    description: 'Zustand store and state management specialist',
  },
  'state-redux-specialist': {
    level: 'L2',
    domain: 'state',
    framework: 'redux',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob'],
    triggers: ['store', 'redux', 'slice', 'reducer', 'action', 'dispatch', 'selector'],
    filePatterns: ['src/store/**', 'src/redux/**', '**/slice.ts', '**/slices/**'],
    description: 'Redux Toolkit slice and state specialist',
  },
  'state-pinia-specialist': {
    level: 'L2',
    domain: 'state',
    framework: 'pinia',
    tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob'],
    triggers: ['store', 'pinia', 'state', 'getters', 'actions'],
    filePatterns: ['src/stores/**', '**/store.ts'],
    description: 'Pinia store specialist for Vue 3',
  },

  // Backend agents
  'backend-fastapi-specialist': {
    level: 'L2',
    domain: 'backend',
    framework: 'fastapi',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['api', 'endpoint', 'route', 'fastapi', 'pydantic', 'dependency'],
    filePatterns: ['backend/**', 'api/**', 'app/**/*.py', 'routers/**'],
    description: 'FastAPI endpoint and Pydantic model specialist',
  },
  'backend-express-specialist': {
    level: 'L2',
    domain: 'backend',
    framework: 'express',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['api', 'endpoint', 'route', 'express', 'middleware', 'controller'],
    filePatterns: ['server/**', 'api/**', 'routes/**', 'controllers/**'],
    description: 'Express.js route and middleware specialist',
  },
  'backend-nestjs-specialist': {
    level: 'L2',
    domain: 'backend',
    framework: 'nestjs',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['api', 'controller', 'service', 'module', 'nestjs', 'decorator'],
    filePatterns: ['src/**/*.controller.ts', 'src/**/*.service.ts', 'src/**/*.module.ts'],
    description: 'NestJS controller, service, and module specialist',
  },
  'backend-django-specialist': {
    level: 'L2',
    domain: 'backend',
    framework: 'django',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['view', 'model', 'serializer', 'django', 'admin', 'url'],
    filePatterns: ['**/views.py', '**/models.py', '**/serializers.py', '**/urls.py'],
    description: 'Django view, model, and DRF specialist',
  },

  // Database/ORM agents
  'db-postgresql-specialist': {
    level: 'L2',
    domain: 'database',
    framework: 'postgresql',
    tools: ['Read', 'Edit', 'Bash', 'Grep'],
    triggers: ['query', 'sql', 'postgresql', 'postgres', 'index', 'constraint'],
    filePatterns: ['migrations/**', 'sql/**', '*.sql'],
    description: 'PostgreSQL query and schema specialist',
  },
  'orm-prisma-specialist': {
    level: 'L2',
    domain: 'database',
    framework: 'prisma',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['prisma', 'schema', 'migration', 'model', 'relation'],
    filePatterns: ['prisma/**', 'prisma/schema.prisma'],
    description: 'Prisma schema and migration specialist',
  },
  'orm-sqlalchemy-specialist': {
    level: 'L2',
    domain: 'database',
    framework: 'sqlalchemy',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['sqlalchemy', 'model', 'session', 'query', 'alembic', 'migration'],
    filePatterns: ['models/**', 'alembic/**', '**/models.py'],
    description: 'SQLAlchemy model and Alembic migration specialist',
  },

  // Testing agents
  'test-playwright-specialist': {
    level: 'L2',
    domain: 'testing',
    framework: 'playwright',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['test', 'e2e', 'playwright', 'page', 'locator', 'expect'],
    filePatterns: ['tests/**', 'e2e/**', '*.spec.ts', '*.test.ts'],
    description: 'Playwright E2E test specialist',
  },
  'test-vitest-specialist': {
    level: 'L2',
    domain: 'testing',
    framework: 'vitest',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['test', 'unit', 'vitest', 'describe', 'it', 'expect', 'mock'],
    filePatterns: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    description: 'Vitest unit test specialist',
  },
  'test-pytest-specialist': {
    level: 'L2',
    domain: 'testing',
    framework: 'pytest',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
    triggers: ['test', 'pytest', 'fixture', 'parametrize', 'assert'],
    filePatterns: ['tests/**', 'test_*.py', '*_test.py'],
    description: 'pytest test and fixture specialist',
  },

  // Deployment agents
  'deploy-railway-specialist': {
    level: 'L2',
    domain: 'deployment',
    framework: 'railway',
    tools: ['Read', 'Edit', 'Bash', 'Grep'],
    triggers: ['deploy', 'railway', 'environment', 'service', 'variable'],
    filePatterns: ['railway.json', 'railway.toml', 'Procfile'],
    description: 'Railway deployment and configuration specialist',
  },
  'deploy-cloudflare-specialist': {
    level: 'L2',
    domain: 'deployment',
    framework: 'cloudflare',
    tools: ['Read', 'Edit', 'Bash', 'Grep'],
    triggers: ['deploy', 'cloudflare', 'pages', 'workers', 'wrangler'],
    filePatterns: ['wrangler.toml', 'wrangler.json'],
    description: 'Cloudflare Pages and Workers specialist',
  },
  'deploy-docker-specialist': {
    level: 'L2',
    domain: 'deployment',
    framework: 'docker',
    tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep'],
    triggers: ['docker', 'container', 'image', 'dockerfile', 'compose'],
    filePatterns: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'],
    description: 'Docker and container specialist',
  },
  'deploy-vercel-specialist': {
    level: 'L2',
    domain: 'deployment',
    framework: 'vercel',
    tools: ['Read', 'Edit', 'Bash', 'Grep'],
    triggers: ['deploy', 'vercel', 'serverless', 'edge'],
    filePatterns: ['vercel.json'],
    description: 'Vercel deployment specialist',
  },
};

/**
 * Get the agent name for a specific technology
 * @param {string} domain - Domain (frontend, backend, state, database, testing, deployment)
 * @param {string} tech - Technology/framework name
 * @returns {string|null} Agent name or null if not mapped
 */
export function getAgentNameForTech(domain, tech) {
  if (!tech) return null;

  const techLower = tech.toLowerCase();
  const domainMap = FRAMEWORK_AGENT_MAP[domain];

  if (domainMap && domainMap[techLower]) {
    return domainMap[techLower];
  }

  // Check ORM separately since it's often nested
  if (domain === 'database' && FRAMEWORK_AGENT_MAP.orm[techLower]) {
    return FRAMEWORK_AGENT_MAP.orm[techLower];
  }

  return null;
}

/**
 * Get default agents for a detected tech stack
 * @param {object} techStack - Tech stack from detect-tech-stack
 * @returns {Array} Array of agent definitions
 */
export function getDefaultAgentsForStack(techStack) {
  const agents = [];

  // Frontend agent
  if (techStack.frontend?.framework) {
    const agentName = getAgentNameForTech('frontend', techStack.frontend.framework);
    if (agentName && AGENT_CONFIGS[agentName]) {
      agents.push(createAgentDefinition({
        ...AGENT_CONFIGS[agentName],
        name: agentName,
      }));
    }
  }

  // State manager agent
  if (techStack.frontend?.stateManager) {
    const agentName = getAgentNameForTech('state', techStack.frontend.stateManager);
    if (agentName && AGENT_CONFIGS[agentName]) {
      agents.push(createAgentDefinition({
        ...AGENT_CONFIGS[agentName],
        name: agentName,
      }));
    }
  }

  // Backend agent
  if (techStack.backend?.framework) {
    const agentName = getAgentNameForTech('backend', techStack.backend.framework);
    if (agentName && AGENT_CONFIGS[agentName]) {
      agents.push(createAgentDefinition({
        ...AGENT_CONFIGS[agentName],
        name: agentName,
      }));
    }
  }

  // Database agent
  if (techStack.database?.primary) {
    const agentName = getAgentNameForTech('database', techStack.database.primary);
    if (agentName && AGENT_CONFIGS[agentName]) {
      agents.push(createAgentDefinition({
        ...AGENT_CONFIGS[agentName],
        name: agentName,
      }));
    }
  }

  // ORM agent
  if (techStack.database?.orm) {
    const agentName = getAgentNameForTech('database', techStack.database.orm);
    if (agentName && AGENT_CONFIGS[agentName]) {
      agents.push(createAgentDefinition({
        ...AGENT_CONFIGS[agentName],
        name: agentName,
      }));
    }
  }

  // E2E Testing agent
  if (techStack.testing?.e2e?.framework) {
    const agentName = getAgentNameForTech('testing', techStack.testing.e2e.framework);
    if (agentName && AGENT_CONFIGS[agentName]) {
      agents.push(createAgentDefinition({
        ...AGENT_CONFIGS[agentName],
        name: agentName,
      }));
    }
  }

  // Unit testing agent
  if (techStack.testing?.unit?.framework) {
    const agentName = getAgentNameForTech('testing', techStack.testing.unit.framework);
    if (agentName && AGENT_CONFIGS[agentName]) {
      agents.push(createAgentDefinition({
        ...AGENT_CONFIGS[agentName],
        name: agentName,
      }));
    }
  }

  // Frontend deployment agent
  if (techStack.deployment?.frontend?.platform) {
    const agentName = getAgentNameForTech('deployment', techStack.deployment.frontend.platform);
    if (agentName && AGENT_CONFIGS[agentName]) {
      agents.push(createAgentDefinition({
        ...AGENT_CONFIGS[agentName],
        name: agentName,
      }));
    }
  }

  // Backend deployment agent (if different from frontend)
  if (techStack.deployment?.backend?.platform &&
      techStack.deployment.backend.platform !== techStack.deployment?.frontend?.platform) {
    const agentName = getAgentNameForTech('deployment', techStack.deployment.backend.platform);
    if (agentName && AGENT_CONFIGS[agentName]) {
      agents.push(createAgentDefinition({
        ...AGENT_CONFIGS[agentName],
        name: agentName,
      }));
    }
  }

  return agents;
}

/**
 * Get all available agent configurations
 * @returns {object} All agent configurations
 */
export function getAllAgentConfigs() {
  return AGENT_CONFIGS;
}

/**
 * Get all supported frameworks by domain
 * @returns {object} Framework mapping
 */
export function getSupportedFrameworks() {
  return FRAMEWORK_AGENT_MAP;
}

/**
 * Check if a framework is supported
 * @param {string} domain - Domain to check
 * @param {string} framework - Framework name
 * @returns {boolean} Whether framework is supported
 */
export function isFrameworkSupported(domain, framework) {
  if (!framework) return false;
  const frameworkLower = framework.toLowerCase();
  const domainMap = FRAMEWORK_AGENT_MAP[domain];
  return domainMap ? !!domainMap[frameworkLower] : false;
}
