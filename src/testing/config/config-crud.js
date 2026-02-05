/**
 * Testing Configuration CRUD Operations
 *
 * Create, read, update, delete testing configuration in tech-stack.json.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { loadTechStackJson, saveTechStackJson, getEnvironmentConfig } from './tech-stack-io.js';
import { RULES_DIR, TESTING_RULES_FILE } from './constants.js';

/**
 * Testing configuration structure (compatible with tech-stack.json `testing` section)
 *
 * This structure maps to tech-stack.json testing fields:
 * - testing.e2e.framework -> e2e framework
 * - testing.e2e.configFile -> playwright config
 * - testing.selectors.* -> login selectors
 * - testing.credentials.* -> env var names
 */
export function createTestingConfig(options = {}) {
  return {
    // E2E testing configuration
    e2e: {
      framework: options.playwrightEnabled ? 'playwright' : 'none',
      configFile: options.playwrightConfig || 'playwright.config.ts',
      testCommand: 'npx playwright test',
      browser: options.browser || 'chromium',
      headless: options.headless ?? true,
      timeout: options.timeout || 30000,
    },

    // Unit testing (preserved from existing config)
    unit: {
      framework: 'none',
      testCommand: 'npm test',
    },

    // Test selectors for login flow
    selectors: {
      strategy: 'data-testid',
      username: options.usernameSelector || '[data-testid="username-input"]',
      password: options.passwordSelector || '[data-testid="password-input"]',
      loginButton: options.loginButtonSelector || '[data-testid="login-submit"]',
      loginSuccess: options.loginSuccessSelector || '[data-testid="dashboard"]',
    },

    // Credentials (env var names, never actual credentials)
    credentials: {
      usernameEnvVar: options.envVars?.username || 'TEST_USER_USERNAME',
      passwordEnvVar: options.envVars?.password || 'TEST_USER_PASSWORD',
      source: options.credentialSource || 'env',
    },

    // Environment configuration - prioritizes tunnel URL over localhost
    environment: getEnvironmentConfig(options),

    // Testing mode (ralph loop, manual, minimal)
    mode: options.mode || 'manual',
    ralphConfig: options.mode === 'ralph' ? {
      maxIterations: options.maxIterations || 10,
      completionPromise: options.completionPromise || 'all tasks complete and tests passing',
      autoRetry: true,
    } : null,

    // Persistent rules file path
    rulesFile: options.rulesFile || null,

    // Configuration metadata
    _configuredAt: new Date().toISOString(),
    _configuredBy: 'ccasp-test-setup',
  };
}

/**
 * Save testing configuration to tech-stack.json
 */
export function saveTestingConfig(config) {
  // Load existing tech-stack or create default
  const techStack = loadTechStackJson() || {
    version: '2.0.0',
    project: { name: 'unnamed', description: '' },
    frontend: {},
    backend: {},
    testing: {},
  };

  // Merge testing config into tech-stack
  techStack.testing = {
    ...techStack.testing,
    ...config,
  };

  const configPath = saveTechStackJson(techStack);

  // Also save to legacy location for backwards compatibility
  // (will be removed in future version)
  const legacyDir = join(process.cwd(), '.gtask');
  if (existsSync(legacyDir)) {
    try {
      writeFileSync(
        join(legacyDir, 'testing.json'),
        JSON.stringify(config, null, 2),
        'utf8'
      );
    } catch {
      // Ignore legacy save errors
    }
  }

  return configPath;
}

/**
 * Load testing configuration from tech-stack.json
 */
export function loadTestingConfig() {
  const techStack = loadTechStackJson();

  if (techStack?.testing && Object.keys(techStack.testing).length > 0) {
    return techStack.testing;
  }

  // Fallback to legacy .gtask/testing.json for backwards compatibility
  const legacyPath = join(process.cwd(), '.gtask', 'testing.json');
  if (existsSync(legacyPath)) {
    try {
      return JSON.parse(readFileSync(legacyPath, 'utf8'));
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Check if testing is configured (checks tech-stack.json and legacy location)
 */
export function hasTestingConfig() {
  const techStack = loadTechStackJson();

  // Check if tech-stack.json has meaningful testing config
  if (techStack?.testing) {
    const testing = techStack.testing;
    // Consider configured if has e2e framework or selectors
    if (testing.e2e?.framework && testing.e2e.framework !== 'none') {
      return true;
    }
    if (testing.selectors?.username) {
      return true;
    }
  }

  // Fallback to legacy location
  return existsSync(join(process.cwd(), '.gtask', 'testing.json'));
}

/**
 * Get a summary of what testing features are configured
 */
export function getTestingConfigSummary() {
  const config = loadTestingConfig();

  if (!config) {
    return {
      configured: false,
      e2eFramework: null,
      hasSelectors: false,
      hasCredentials: false,
      environment: null,
      mode: null,
    };
  }

  return {
    configured: true,
    e2eFramework: config.e2e?.framework || config.playwright?.enabled ? 'playwright' : null,
    hasSelectors: !!(config.selectors?.username || config.selectors?.usernameInput),
    hasCredentials: !!(config.credentials?.usernameEnvVar || config.credentials?.envVars?.username),
    environment: config.environment?.type || 'localhost',
    baseUrl: config.environment?.baseUrl,
    mode: config.mode || 'manual',
  };
}

/**
 * Generate TESTING_RULES.md template
 */
export function generateTestingRules(config) {
  const envSection = config.environment.type === 'ngrok'
    ? `
## Environment
- **Testing URL**: ${config.environment.baseUrl}
- **Environment Type**: ngrok tunnel
- **Requires**: npm run dev + ngrok running
- **Backend**: Railway (not local Vite proxy)
`
    : config.environment.type === 'localhost'
    ? `
## Environment
- **Testing URL**: ${config.environment.baseUrl}
- **Environment Type**: Local development
- **Requires**: npm run dev
- **Port**: ${config.environment.port}
`
    : `
## Environment
- **Testing URL**: ${config.environment.baseUrl}
- **Environment Type**: Custom/Production
`;

  const credentialSection = config.credentials.source === 'env'
    ? `
## Credentials (Environment Variables)
- **Username env var**: \`${config.credentials.envVars.username}\`
- **Password env var**: \`${config.credentials.envVars.password}\`

Set these in your .env file or system environment before running tests.
`
    : config.credentials.source === 'config'
    ? `
## Credentials (Stored in config)
Credentials are stored in .gtask/testing.json (gitignored).
`
    : config.credentials.source === 'prompt'
    ? `
## Credentials (Prompt)
You will be prompted for credentials each time tests run.
`
    : `
## Credentials
No authentication required for these tests.
`;

  const selectorSection = `
## Login Selectors
- **Username input**: \`${config.selectors.usernameInput}\`
- **Password input**: \`${config.selectors.passwordInput}\`
- **Login button**: \`${config.selectors.loginButton}\`
- **Success indicator**: \`${config.selectors.loginSuccessIndicator}\`
`;

  const modeSection = config.mode === 'ralph'
    ? `
## Testing Mode: Ralph Loop
- **Max iterations**: ${config.ralphConfig.maxIterations}
- **Completion promise**: "${config.ralphConfig.completionPromise}"
- **Behavior**: Automatically retry tests after fixes until all pass
`
    : config.mode === 'manual'
    ? `
## Testing Mode: Manual
Run tests manually when ready: \`gtask test\`
`
    : `
## Testing Mode: Minimal
Tests will only run after all tasks are complete.
`;

  return `# Testing Rules

This file contains persistent testing rules for this project.
Generated by GitHub Task Kit.

---
${envSection}
---
${credentialSection}
---
${selectorSection}
---
${modeSection}
---

## Playwright Commands

\`\`\`bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test auth-login.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with UI mode
npx playwright test --ui
\`\`\`

## Important Notes

1. **Never commit credentials** to git
2. **Always check the testing URL** before running tests
3. **Ralph Loop will auto-retry** up to ${config.ralphConfig?.maxIterations || 10} times
4. **Stop tests with Ctrl+C** if stuck in a loop

---
*Generated by GitHub Task Kit - ${new Date().toISOString()}*
`;
}

/**
 * Save testing rules markdown file to .claude/task-lists/
 */
export function saveTestingRules(config, filename = TESTING_RULES_FILE) {

  if (!existsSync(RULES_DIR)) {
    mkdirSync(RULES_DIR, { recursive: true });
  }

  const rulesPath = join(RULES_DIR, filename);
  const content = generateTestingRules(config);

  writeFileSync(rulesPath, content, 'utf8');

  // Update config with rules file path
  config.rulesFile = rulesPath;

  return rulesPath;
}
