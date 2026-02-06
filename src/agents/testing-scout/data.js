/**
 * Testing tool data constants
 * Part of TestingScout agent
 */

/**
 * Testing tool recommendations by ecosystem
 */
export const TESTING_TOOLS = {
  javascript: {
    unit: [
      {
        name: 'Vitest',
        npm: 'vitest',
        description: 'Blazing fast unit testing framework powered by Vite',
        whenToUse: ['Vite projects', 'ESM-first codebases', 'Fast iteration'],
        maintenance: 'Excellent - active development',
        adoption: 'High - growing rapidly',
        configFile: 'vitest.config.ts',
      },
      {
        name: 'Jest',
        npm: 'jest',
        description: 'Delightful JavaScript testing with focus on simplicity',
        whenToUse: ['React projects', 'Existing Jest configs', 'Large ecosystem'],
        maintenance: 'Excellent - Meta maintained',
        adoption: 'Very High - industry standard',
        configFile: 'jest.config.js',
      },
    ],
    e2e: [
      {
        name: 'Playwright',
        npm: '@playwright/test',
        description: 'Cross-browser end-to-end testing',
        whenToUse: ['Cross-browser testing', 'Modern web apps', 'API testing'],
        maintenance: 'Excellent - Microsoft maintained',
        adoption: 'Very High - rapidly growing',
        configFile: 'playwright.config.ts',
      },
      {
        name: 'Cypress',
        npm: 'cypress',
        description: 'Fast, easy, and reliable testing for anything that runs in a browser',
        whenToUse: ['Component testing', 'Visual debugging', 'Time travel'],
        maintenance: 'Excellent - dedicated company',
        adoption: 'Very High - established',
        configFile: 'cypress.config.js',
      },
    ],
    component: [
      {
        name: 'Testing Library',
        npm: '@testing-library/react',
        description: 'Simple and complete testing utilities for UI components',
        whenToUse: ['React components', 'Accessibility-first', 'User-centric tests'],
        maintenance: 'Excellent - Kent C. Dodds + community',
        adoption: 'Very High - standard for React',
      },
      {
        name: 'Storybook Test',
        npm: '@storybook/test',
        description: 'Component testing within Storybook stories',
        whenToUse: ['Existing Storybook setup', 'Visual testing', 'Component docs'],
        maintenance: 'Excellent',
        adoption: 'High',
      },
    ],
  },
  python: {
    unit: [
      {
        name: 'pytest',
        pip: 'pytest',
        description: 'Simple, powerful testing in Python',
        whenToUse: ['All Python projects', 'Plugin ecosystem', 'Fixtures'],
        maintenance: 'Excellent - very active',
        adoption: 'Very High - de facto standard',
        configFile: 'pytest.ini',
      },
      {
        name: 'unittest',
        builtin: true,
        description: 'Python built-in testing framework',
        whenToUse: ['No dependencies', 'Simple projects', 'Legacy code'],
        maintenance: 'Stable - part of Python',
        adoption: 'High - built-in',
      },
    ],
    e2e: [
      {
        name: 'Playwright Python',
        pip: 'playwright',
        description: 'Cross-browser testing for Python',
        whenToUse: ['Python web apps', 'FastAPI/Django', 'Browser automation'],
        maintenance: 'Excellent - Microsoft',
        adoption: 'High - growing',
      },
      {
        name: 'Selenium',
        pip: 'selenium',
        description: 'Browser automation and testing',
        whenToUse: ['Legacy systems', 'Browser compatibility', 'Established'],
        maintenance: 'Good - Selenium project',
        adoption: 'Very High - established',
      },
    ],
  },
  go: {
    unit: [
      {
        name: 'testing (builtin)',
        builtin: true,
        description: 'Go standard library testing package',
        whenToUse: ['All Go projects', 'No dependencies', 'go test'],
        maintenance: 'Excellent - Go team',
        adoption: 'Very High - standard',
      },
      {
        name: 'Testify',
        module: 'github.com/stretchr/testify',
        description: 'Assertions and mocking for Go',
        whenToUse: ['Better assertions', 'Test suites', 'Mocking'],
        maintenance: 'Good - community',
        adoption: 'High',
      },
    ],
  },
  rust: {
    unit: [
      {
        name: 'cargo test',
        builtin: true,
        description: 'Built-in Rust testing',
        whenToUse: ['All Rust projects', 'No dependencies'],
        maintenance: 'Excellent - Rust team',
        adoption: 'Very High - standard',
      },
    ],
  },
};

/**
 * Framework-specific testing recommendations
 */
export const FRAMEWORK_RECOMMENDATIONS = {
  react: {
    unit: 'vitest',
    component: '@testing-library/react',
    e2e: 'playwright',
    reason: 'Vitest + Testing Library + Playwright is the modern React stack',
  },
  vue: {
    unit: 'vitest',
    component: '@vue/test-utils',
    e2e: 'playwright',
    reason: 'Vitest is built by the Vue team, perfect integration',
  },
  angular: {
    unit: 'jest',
    component: '@angular/core/testing',
    e2e: 'playwright',
    reason: 'Angular has built-in testing, Playwright for E2E',
  },
  svelte: {
    unit: 'vitest',
    component: '@testing-library/svelte',
    e2e: 'playwright',
    reason: 'Vitest works great with SvelteKit',
  },
  nextjs: {
    unit: 'vitest',
    component: '@testing-library/react',
    e2e: 'playwright',
    reason: 'Next.js officially recommends this stack',
  },
  fastapi: {
    unit: 'pytest',
    integration: 'pytest-asyncio',
    e2e: 'playwright',
    reason: 'pytest is the Python standard, works great with FastAPI',
  },
  django: {
    unit: 'pytest-django',
    integration: 'pytest',
    e2e: 'playwright',
    reason: 'pytest-django adds Django-specific fixtures',
  },
  express: {
    unit: 'vitest',
    integration: 'supertest',
    e2e: 'playwright',
    reason: 'Supertest for API testing, Playwright for full E2E',
  },
};

/**
 * Config file templates
 */
export const CONFIG_TEMPLATES = {
  'vitest.config.ts': `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,ts}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
`,

  'playwright.config.ts': `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
`,

  'jest.config.js': `/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js', '**/*.spec.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
};
`,

  'pytest.ini': `[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --tb=short
`,
};
