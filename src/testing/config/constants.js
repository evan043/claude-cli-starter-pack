/**
 * Testing Configuration Constants
 *
 * Presets, modes, environments, and default values.
 */

import { join } from 'path';

// Default paths - now uses tech-stack.json
export const TECH_STACK_PATHS = [
  join(process.cwd(), '.claude', 'tech-stack.json'),
  join(process.cwd(), 'tech-stack.json'),
];
export const RULES_DIR = join(process.cwd(), '.claude', 'task-lists');
export const TESTING_RULES_FILE = 'TESTING_RULES.md';
export const ENV_PATH = join(process.cwd(), '.env');
export const ENV_EXAMPLE_PATH = join(process.cwd(), '.env.example');

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
