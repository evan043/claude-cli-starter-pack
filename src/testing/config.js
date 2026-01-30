/**
 * Testing Configuration Module
 *
 * Manages testing modes, credentials, and environment configuration.
 * Testing config is stored in tech-stack.json under the `testing` section
 * for unified configuration management.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// Default paths - now uses tech-stack.json
const TECH_STACK_PATHS = [
  join(process.cwd(), '.claude', 'tech-stack.json'),
  join(process.cwd(), 'tech-stack.json'),
];
const RULES_DIR = join(process.cwd(), '.claude', 'task-lists');
const TESTING_RULES_FILE = 'TESTING_RULES.md';

/**
 * Get path to tech-stack.json (prefers .claude/tech-stack.json)
 */
function getTechStackPath() {
  for (const path of TECH_STACK_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return TECH_STACK_PATHS[0];
}

/**
 * Load tech-stack.json
 */
function loadTechStackJson() {
  const techStackPath = getTechStackPath();
  if (existsSync(techStackPath)) {
    try {
      return JSON.parse(readFileSync(techStackPath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Save tech-stack.json
 */
function saveTechStackJson(techStack) {
  const techStackPath = getTechStackPath();
  const configDir = dirname(techStackPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  techStack._lastModified = new Date().toISOString();
  writeFileSync(techStackPath, JSON.stringify(techStack, null, 2), 'utf8');
  return techStackPath;
}

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

    // Environment configuration
    environment: {
      type: options.envType || 'localhost',
      baseUrl: options.baseUrl || 'http://localhost:5173',
      port: options.port || 5173,
      requiresSetup: options.requiresSetup || [],
    },

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
  let techStack = loadTechStackJson() || {
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
 * Get credentials based on config (uses new tech-stack.json structure)
 */
export function getCredentials(config) {
  if (!config || config.credentials?.source === 'none') {
    return null;
  }

  if (config.credentials?.source === 'env') {
    const usernameVar = config.credentials.usernameEnvVar || config.credentials.envVars?.username;
    const passwordVar = config.credentials.passwordEnvVar || config.credentials.envVars?.password;
    return {
      username: process.env[usernameVar] || null,
      password: process.env[passwordVar] || null,
    };
  }

  // 'prompt' returns null - caller should prompt user
  return null;
}

/**
 * Validate testing configuration (works with tech-stack.json structure)
 */
export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config.environment?.baseUrl) {
    errors.push('Base URL is required');
  }

  if (config.credentials?.source === 'env') {
    const creds = getCredentials(config);
    const usernameVar = config.credentials.usernameEnvVar || config.credentials.envVars?.username;
    const passwordVar = config.credentials.passwordEnvVar || config.credentials.envVars?.password;

    if (!creds?.username || !creds?.password) {
      warnings.push(
        `Environment variables not set: ${usernameVar}, ${passwordVar}`
      );
    }
  }

  if (config.mode === 'ralph' && !config.ralphConfig) {
    errors.push('Ralph configuration missing');
  }

  if (config.e2e?.framework === 'none') {
    warnings.push('No E2E testing framework configured');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
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
