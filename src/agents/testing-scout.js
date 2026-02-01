/**
 * TestingScout Agent
 *
 * Discovers and recommends testing tools based on tech stack.
 * Part of Phase 6: Testing Framework (Issue #31)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

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
 * Get inventory path
 * @param {string} projectRoot - Project root
 * @returns {string} Path to inventory
 */
export function getInventoryPath(projectRoot = process.cwd()) {
  return join(projectRoot, 'repo-settings', 'Testing-Tool-Inventory.json');
}

/**
 * Load inventory
 * @param {string} projectRoot - Project root
 * @returns {object} Inventory data
 */
export function loadInventory(projectRoot = process.cwd()) {
  const inventoryPath = getInventoryPath(projectRoot);

  if (!existsSync(inventoryPath)) {
    return { runs: [] };
  }

  try {
    return JSON.parse(readFileSync(inventoryPath, 'utf8'));
  } catch {
    return { runs: [] };
  }
}

/**
 * Save to inventory
 * @param {object} entry - Entry to save
 * @param {string} projectRoot - Project root
 */
export function saveToInventory(entry, projectRoot = process.cwd()) {
  const inventoryPath = getInventoryPath(projectRoot);
  const dir = dirname(inventoryPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const inventory = loadInventory(projectRoot);
  inventory.runs.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });

  writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2), 'utf8');
}

/**
 * Classify tech stack for testing
 * @param {object} techStack - Tech stack config
 * @returns {object} Classification result
 */
export function classifyTechStack(techStack) {
  const result = {
    primaryLanguage: null,
    runtime: null,
    framework: null,
    appType: null,
    recommendations: [],
  };

  // Detect primary language
  if (techStack.primaryLanguage) {
    result.primaryLanguage = techStack.primaryLanguage.toLowerCase();
  } else if (techStack.frontend?.framework) {
    result.primaryLanguage = 'javascript';
  } else if (techStack.backend?.framework) {
    const framework = techStack.backend.framework.toLowerCase();
    if (['fastapi', 'django', 'flask'].includes(framework)) {
      result.primaryLanguage = 'python';
    } else if (['express', 'nestjs', 'fastify'].includes(framework)) {
      result.primaryLanguage = 'javascript';
    } else if (['gin', 'echo', 'fiber'].includes(framework)) {
      result.primaryLanguage = 'go';
    }
  }

  // Detect runtime
  if (techStack.runtime) {
    result.runtime = techStack.runtime;
  } else if (result.primaryLanguage === 'javascript') {
    result.runtime = 'node';
  } else if (result.primaryLanguage === 'python') {
    result.runtime = 'python';
  }

  // Detect framework
  result.framework = techStack.frontend?.framework?.toLowerCase() ||
                     techStack.backend?.framework?.toLowerCase();

  // Detect app type
  if (techStack.frontend?.framework) {
    result.appType = 'web';
  } else if (techStack.cli) {
    result.appType = 'cli';
  } else if (techStack.backend?.framework) {
    result.appType = 'api';
  }

  return result;
}

/**
 * Get testing recommendations for a tech stack
 * @param {object} techStack - Tech stack config
 * @returns {object} Recommendations
 */
export function getRecommendations(techStack) {
  const classification = classifyTechStack(techStack);
  const recommendations = {
    primary: null,
    unit: [],
    component: [],
    e2e: [],
    integration: [],
  };

  // Check for framework-specific recommendations first
  if (classification.framework && FRAMEWORK_RECOMMENDATIONS[classification.framework]) {
    recommendations.primary = FRAMEWORK_RECOMMENDATIONS[classification.framework];
  }

  // Get language-specific tools
  const languageTools = TESTING_TOOLS[classification.primaryLanguage];
  if (languageTools) {
    if (languageTools.unit) {
      recommendations.unit = languageTools.unit;
    }
    if (languageTools.e2e) {
      recommendations.e2e = languageTools.e2e;
    }
    if (languageTools.component) {
      recommendations.component = languageTools.component;
    }
  }

  return recommendations;
}

/**
 * Generate recommendation table
 * @param {object} recommendations - Recommendations
 * @returns {object} Table data
 */
export function generateRecommendationTable(recommendations) {
  const rows = [];

  // Add primary recommendation
  if (recommendations.primary) {
    rows.push({
      tool: '⭐ Primary Stack',
      ecosystem: '-',
      useCase: recommendations.primary.reason,
      maintenance: '-',
      adoption: '-',
    });
  }

  // Add unit test recommendations
  for (const tool of recommendations.unit.slice(0, 2)) {
    rows.push({
      tool: tool.name,
      ecosystem: tool.npm || tool.pip || 'built-in',
      useCase: 'Unit Testing',
      maintenance: tool.maintenance,
      adoption: tool.adoption,
    });
  }

  // Add E2E recommendations
  for (const tool of recommendations.e2e.slice(0, 2)) {
    rows.push({
      tool: tool.name,
      ecosystem: tool.npm || tool.pip || 'built-in',
      useCase: 'E2E Testing',
      maintenance: tool.maintenance,
      adoption: tool.adoption,
    });
  }

  // Add component recommendations
  for (const tool of recommendations.component.slice(0, 1)) {
    rows.push({
      tool: tool.name,
      ecosystem: tool.npm || tool.pip || 'built-in',
      useCase: 'Component Testing',
      maintenance: tool.maintenance,
      adoption: tool.adoption,
    });
  }

  return {
    headers: ['Tool', 'Ecosystem', 'Use Case', 'Maintenance', 'Adoption'],
    rows,
  };
}

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

/**
 * Generate config file for a testing tool
 * @param {string} configFile - Config file name
 * @returns {string|null} Config content
 */
export function generateConfigFile(configFile) {
  return CONFIG_TEMPLATES[configFile] || null;
}

/**
 * Create TestingScout agent prompt
 * @param {object} techStack - Tech stack config
 * @param {object} classification - Classification result
 * @returns {string} Agent prompt
 */
export function createScoutPrompt(techStack, classification) {
  return `# TestingScout - Testing Tool Discovery Agent

## Tech Stack Analysis
${JSON.stringify(classification, null, 2)}

## Instructions

1. **Verify Tech Stack**
   Confirm the tech stack classification is accurate.

2. **Search for Tools**
   For each testing category (unit, e2e, component):
   - Search for "\${classification.primaryLanguage} \${category} testing framework 2024"
   - Evaluate maintenance (recent commits, releases)
   - Check adoption (npm downloads, GitHub stars)

3. **Evaluate Each Tool**
   - Wide adoption (downloads, stars)
   - Recent maintenance (< 3 months)
   - Strong documentation
   - Framework compatibility
   - Low friction to integrate

4. **Output Format**
   Return a markdown table:
   | Tool | Ecosystem | Use Case | Why Recommended | Maintenance | Adoption |

5. **Final Recommendation**
   Recommend a primary testing stack with:
   - Unit testing tool
   - E2E testing tool
   - Component testing tool (if applicable)
   - Installation commands
   - Config file suggestions

## Response Limits
Maximum 2000 tokens for this search task.
`;
}

export default {
  TESTING_TOOLS,
  FRAMEWORK_RECOMMENDATIONS,
  CONFIG_TEMPLATES,
  classifyTechStack,
  getRecommendations,
  generateRecommendationTable,
  generateConfigFile,
  createScoutPrompt,
  loadInventory,
  saveToInventory,
  getInventoryPath,
};
