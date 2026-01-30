/**
 * Testing Configuration Module
 *
 * Manages testing modes, credentials, and environment configuration
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Default paths
const CONFIG_DIR = join(process.cwd(), '.gtask');
const TESTING_RULES_FILE = 'TESTING_RULES.md';

/**
 * Testing mode definitions
 */
export const TESTING_MODES = {
  ralph: {
    name: 'Ralph Loop',
    description: 'Continuous test-fix cycle until all tests pass',
    recommended: true,
    defaults: {
      maxIterations: 10,
      completionPromise: 'all tasks complete and tests passing',
    },
  },
  manual: {
    name: 'Manual Testing',
    description: 'You control when tests run',
    recommended: false,
  },
  minimal: {
    name: 'Minimal Testing',
    description: 'Only test at the end of all tasks',
    recommended: false,
  },
};

/**
 * Environment definitions
 */
export const ENVIRONMENTS = {
  localhost: {
    name: 'Localhost',
    description: 'Local development server',
    urlTemplate: 'http://localhost:{port}',
    defaultPort: 5173,
    requiresSetup: ['npm run dev'],
    recommended: true,
  },
  ngrok: {
    name: 'ngrok Tunnel',
    description: 'Expose local server via ngrok',
    urlTemplate: 'https://{subdomain}.ngrok.dev',
    requiresSetup: ['npm run dev', 'ngrok http {port}'],
    recommended: false,
  },
  custom: {
    name: 'Custom URL',
    description: 'Custom deployment URL',
    urlTemplate: '{url}',
    requiresSetup: [],
    recommended: false,
  },
};

/**
 * Credential source options
 */
export const CREDENTIAL_SOURCES = {
  env: {
    name: 'Environment Variables',
    description: 'Read from .env file or system environment',
    envVars: {
      username: 'TEST_USER_USERNAME',
      password: 'TEST_USER_PASSWORD',
    },
    recommended: true,
    secure: true,
  },
  config: {
    name: 'Config File',
    description: 'Store in .gtask/testing.json (gitignored)',
    recommended: false,
    secure: false,
  },
  prompt: {
    name: 'Prompt Each Time',
    description: 'Ask for credentials when tests run',
    recommended: false,
    secure: true,
  },
  none: {
    name: 'No Authentication',
    description: 'Tests do not require login',
    recommended: false,
    secure: true,
  },
};

/**
 * Testing configuration structure
 */
export function createTestingConfig(options = {}) {
  return {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // Testing mode
    mode: options.mode || 'manual',
    ralphConfig: options.mode === 'ralph' ? {
      maxIterations: options.maxIterations || 10,
      completionPromise: options.completionPromise || 'all tasks complete and tests passing',
      autoRetry: true,
    } : null,

    // Environment
    environment: {
      type: options.envType || 'localhost',
      baseUrl: options.baseUrl || 'http://localhost:5173',
      port: options.port || 5173,
      requiresSetup: options.requiresSetup || [],
    },

    // Credentials
    credentials: {
      source: options.credentialSource || 'env',
      envVars: options.envVars || {
        username: 'TEST_USER_USERNAME',
        password: 'TEST_USER_PASSWORD',
      },
      // Only stored if source is 'config'
      username: options.credentialSource === 'config' ? options.username : undefined,
      password: options.credentialSource === 'config' ? options.password : undefined,
    },

    // Playwright configuration
    playwright: {
      enabled: options.playwrightEnabled ?? true,
      configPath: options.playwrightConfig || 'playwright.config.ts',
      browser: options.browser || 'chromium',
      headless: options.headless ?? true,
      timeout: options.timeout || 30000,
    },

    // Test selectors (for login flow)
    selectors: {
      usernameInput: options.usernameSelector || '[data-testid="username-input"]',
      passwordInput: options.passwordSelector || '[data-testid="password-input"]',
      loginButton: options.loginButtonSelector || '[data-testid="login-submit"]',
      loginSuccessIndicator: options.loginSuccessSelector || '[data-testid="dashboard"]',
    },

    // Persistent rules file path
    rulesFile: options.rulesFile || null,
  };
}

/**
 * Save testing configuration
 */
export function saveTestingConfig(config) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const configPath = join(CONFIG_DIR, 'testing.json');
  config.updatedAt = new Date().toISOString();

  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

  // Add to .gitignore if credentials are stored
  if (config.credentials.source === 'config') {
    ensureGitignore('.gtask/testing.json');
  }

  return configPath;
}

/**
 * Load testing configuration
 */
export function loadTestingConfig() {
  const configPath = join(CONFIG_DIR, 'testing.json');

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Check if testing is configured
 */
export function hasTestingConfig() {
  return existsSync(join(CONFIG_DIR, 'testing.json'));
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
 * Save testing rules markdown file
 */
export function saveTestingRules(config, filename = TESTING_RULES_FILE) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const rulesPath = join(CONFIG_DIR, filename);
  const content = generateTestingRules(config);

  writeFileSync(rulesPath, content, 'utf8');

  // Update config with rules file path
  config.rulesFile = rulesPath;

  return rulesPath;
}

/**
 * Ensure .gitignore includes sensitive files
 */
function ensureGitignore(pattern) {
  const gitignorePath = join(process.cwd(), '.gitignore');

  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, `# gtask sensitive files\n${pattern}\n`, 'utf8');
    return;
  }

  const content = readFileSync(gitignorePath, 'utf8');
  if (!content.includes(pattern)) {
    writeFileSync(gitignorePath, content + `\n# gtask sensitive files\n${pattern}\n`, 'utf8');
  }
}

/**
 * Get credentials based on config
 */
export function getCredentials(config) {
  if (!config || config.credentials.source === 'none') {
    return null;
  }

  if (config.credentials.source === 'env') {
    return {
      username: process.env[config.credentials.envVars.username] || null,
      password: process.env[config.credentials.envVars.password] || null,
    };
  }

  if (config.credentials.source === 'config') {
    return {
      username: config.credentials.username,
      password: config.credentials.password,
    };
  }

  // 'prompt' returns null - caller should prompt user
  return null;
}

/**
 * Validate testing configuration
 */
export function validateConfig(config) {
  const errors = [];

  if (!config.environment?.baseUrl) {
    errors.push('Base URL is required');
  }

  if (config.credentials?.source === 'env') {
    const creds = getCredentials(config);
    if (!creds?.username || !creds?.password) {
      errors.push(
        `Environment variables not set: ${config.credentials.envVars.username}, ${config.credentials.envVars.password}`
      );
    }
  }

  if (config.mode === 'ralph' && !config.ralphConfig) {
    errors.push('Ralph configuration missing');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
