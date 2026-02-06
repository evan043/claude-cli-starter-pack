/**
 * Credential Management
 *
 * Reading, writing, and validating test credentials.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ENV_PATH, ENV_EXAMPLE_PATH } from './constants.js';

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
 * Inject credentials directly to .env file
 *
 * @param {string} username - The test account username
 * @param {string} password - The test account password
 * @param {object} options - Optional configuration
 * @param {string} options.usernameVar - Env var name for username (default: TEST_USER_USERNAME)
 * @param {string} options.passwordVar - Env var name for password (default: TEST_USER_PASSWORD)
 * @returns {object} Result with success status and messages
 */
export function injectCredentialsToEnv(username, password, options = {}) {
  const usernameVar = options.usernameVar || 'TEST_USER_USERNAME';
  const passwordVar = options.passwordVar || 'TEST_USER_PASSWORD';

  const result = {
    success: false,
    envPath: ENV_PATH,
    created: false,
    updated: false,
    gitignoreUpdated: false,
    messages: [],
  };

  try {
    // Read existing .env or create empty content
    let envContent = '';
    if (existsSync(ENV_PATH)) {
      envContent = readFileSync(ENV_PATH, 'utf8');
    } else {
      result.created = true;
    }

    // Parse existing env vars
    const lines = envContent.split('\n');
    const existingVars = new Map();
    const nonVarLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        nonVarLines.push(line);
        continue;
      }

      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        existingVars.set(match[1], match[2]);
      } else {
        nonVarLines.push(line);
      }
    }

    // Check if credentials already exist
    const hadUsername = existingVars.has(usernameVar);
    const hadPassword = existingVars.has(passwordVar);

    // Update/add credentials
    existingVars.set(usernameVar, username);
    existingVars.set(passwordVar, password);

    if (hadUsername || hadPassword) {
      result.updated = true;
      result.messages.push(`Updated existing credentials in .env`);
    } else {
      result.messages.push(`Added new credentials to .env`);
    }

    // Rebuild .env content
    const credentialSection = [
      '',
      '# Test credentials (added by CCASP)',
      `${usernameVar}=${username}`,
      `${passwordVar}=${password}`,
    ];

    // Remove old credential lines if they exist elsewhere
    const finalLines = nonVarLines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith(`${usernameVar}=`) && !trimmed.startsWith(`${passwordVar}=`);
    });

    // Rebuild with other vars first, then credentials at end
    const otherVars = [];
    for (const [key, value] of existingVars) {
      if (key !== usernameVar && key !== passwordVar) {
        otherVars.push(`${key}=${value}`);
      }
    }

    const newContent = [
      ...finalLines.filter(l => l.trim()),
      ...otherVars,
      ...credentialSection,
      '',
    ].join('\n');

    // Write updated .env
    writeFileSync(ENV_PATH, newContent, 'utf8');

    // Ensure .env is in .gitignore
    result.gitignoreUpdated = ensureEnvInGitignore();
    if (result.gitignoreUpdated) {
      result.messages.push('Added .env to .gitignore');
    }

    result.success = true;
    return result;
  } catch (error) {
    result.success = false;
    result.messages.push(`Error: ${error.message}`);
    return result;
  }
}

/**
 * Ensure .env is listed in .gitignore
 *
 * @returns {boolean} True if .gitignore was updated
 */
export function ensureEnvInGitignore() {
  const gitignorePath = join(process.cwd(), '.gitignore');

  // Read existing .gitignore or create default
  let content = '';
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, 'utf8');
  }

  // Check if .env is already listed
  const lines = content.split('\n');
  const hasEnv = lines.some(line => {
    const trimmed = line.trim();
    return trimmed === '.env' || trimmed === '.env*' || trimmed === '*.env';
  });

  if (hasEnv) {
    return false; // Already present
  }

  // Add .env to .gitignore
  const newContent = `${content.trimEnd()  }\n\n# Environment files\n.env\n.env.local\n.env*.local\n`;
  writeFileSync(gitignorePath, newContent, 'utf8');

  return true;
}

/**
 * Read credentials from .env file (not process.env)
 *
 * @param {object} options - Configuration
 * @param {string} options.usernameVar - Env var name for username
 * @param {string} options.passwordVar - Env var name for password
 * @returns {object|null} Credentials object or null if not found
 */
export function readCredentialsFromEnv(options = {}) {
  const usernameVar = options.usernameVar || 'TEST_USER_USERNAME';
  const passwordVar = options.passwordVar || 'TEST_USER_PASSWORD';

  if (!existsSync(ENV_PATH)) {
    return null;
  }

  try {
    const content = readFileSync(ENV_PATH, 'utf8');
    const env = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        // Remove surrounding quotes if present
        let value = match[2];
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[match[1]] = value;
      }
    }

    const username = env[usernameVar];
    const password = env[passwordVar];

    if (!username && !password) {
      return null;
    }

    return {
      username: username || null,
      password: password || null,
      usernameVar,
      passwordVar,
      hasUsername: !!username,
      hasPassword: !!password,
      complete: !!username && !!password,
    };
  } catch {
    return null;
  }
}

/**
 * Validate that credentials exist and are set
 *
 * @param {object} options - Configuration
 * @returns {object} Validation result
 */
export function validateCredentialsExist(options = {}) {
  const credentials = readCredentialsFromEnv(options);

  // Also check process.env as fallback
  const usernameVar = options.usernameVar || 'TEST_USER_USERNAME';
  const passwordVar = options.passwordVar || 'TEST_USER_PASSWORD';

  const envUsername = process.env[usernameVar];
  const envPassword = process.env[passwordVar];

  const hasUsername = credentials?.hasUsername || !!envUsername;
  const hasPassword = credentials?.hasPassword || !!envPassword;

  return {
    valid: hasUsername && hasPassword,
    hasUsername,
    hasPassword,
    source: credentials?.complete ? 'file' : (envUsername || envPassword) ? 'process' : 'none',
    usernameVar,
    passwordVar,
    messages: [
      hasUsername ? `✓ ${usernameVar} is set` : `✗ ${usernameVar} is not set`,
      hasPassword ? `✓ ${passwordVar} is set` : `✗ ${passwordVar} is not set`,
    ],
  };
}

/**
 * Create or update .env.example with placeholder credentials
 *
 * @param {object} options - Configuration
 * @returns {boolean} True if file was created/updated
 */
export function createEnvExample(options = {}) {
  const usernameVar = options.usernameVar || 'TEST_USER_USERNAME';
  const passwordVar = options.passwordVar || 'TEST_USER_PASSWORD';

  const content = `# Test credentials
# Copy this file to .env and fill in real values
${usernameVar}=your_test_username
${passwordVar}=your_test_password
`;

  // Check if .env.example exists and has these vars
  if (existsSync(ENV_EXAMPLE_PATH)) {
    const existing = readFileSync(ENV_EXAMPLE_PATH, 'utf8');
    if (existing.includes(usernameVar) && existing.includes(passwordVar)) {
      return false; // Already has credential placeholders
    }
    // Append to existing
    writeFileSync(ENV_EXAMPLE_PATH, `${existing  }\n${  content}`, 'utf8');
  } else {
    writeFileSync(ENV_EXAMPLE_PATH, content, 'utf8');
  }

  return true;
}
