/**
 * Testing Configuration Module
 *
 * Thin re-export wrapper for focused submodules.
 * All configuration logic is now split across:
 * - config/constants.js - Presets, modes, environments
 * - config/tech-stack-io.js - Tech stack file I/O
 * - config/config-crud.js - Create, read, update, delete config
 * - config/validation.js - Config validators
 * - config/credentials.js - Credential management
 */

// Constants and presets
export {
  TECH_STACK_PATHS,
  RULES_DIR,
  TESTING_RULES_FILE,
  ENV_PATH,
  ENV_EXAMPLE_PATH,
  TESTING_MODES,
  ENVIRONMENTS,
  CREDENTIAL_SOURCES,
} from './config/constants.js';

// Tech stack I/O
export {
  getTechStackPath,
  loadTechStackJson,
  saveTechStackJson,
  getEnvironmentConfig,
} from './config/tech-stack-io.js';

// Config CRUD
export {
  createTestingConfig,
  saveTestingConfig,
  loadTestingConfig,
  hasTestingConfig,
  getTestingConfigSummary,
  generateTestingRules,
  saveTestingRules,
} from './config/config-crud.js';

// Validation
export {
  validateConfig,
} from './config/validation.js';

// Credentials
export {
  getCredentials,
  injectCredentialsToEnv,
  ensureEnvInGitignore,
  readCredentialsFromEnv,
  validateCredentialsExist,
  createEnvExample,
} from './config/credentials.js';
