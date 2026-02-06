/**
 * Documentation Generator - Backend Configuration
 *
 * Generates backend configuration (middleware, API endpoints, DB schema)
 * adapted to the user's detected/specified stack.
 */

/**
 * Generate backend configuration based on architecture
 * Adapts to user's detected/specified stack - no hardcoded defaults
 */
export function generateBackendConfig(architecture) {
  if (!architecture?.backend || architecture.backend === 'none') {
    return {};
  }

  const deploymentPlatform = architecture.deployment?.platform || null;
  const databaseType = architecture.database?.type || null;

  const config = {
    middleware: ['Authentication', 'Rate Limiting', 'Error Handling', 'CORS'],
    apiEndpoints: [],
    databaseTables: [],
    websocketEvents: [],
    deployment: {
      platform: deploymentPlatform,
      database: databaseType,
    },
  };

  if (architecture.needsAuth) {
    config.apiEndpoints.push(
      {
        method: 'POST',
        path: '/auth/login',
        description: 'User login',
        auth: 'None',
        request: { email: 'string', password: 'string' },
        response: { token: 'string', user: 'object' },
      },
      {
        method: 'POST',
        path: '/auth/logout',
        description: 'User logout',
        auth: 'Required',
        request: {},
        response: { success: true },
      },
      {
        method: 'GET',
        path: '/auth/me',
        description: 'Get current user',
        auth: 'Required',
        request: {},
        response: { user: 'object' },
      }
    );

    const idType = getIdType(databaseType);
    const timestampType = getTimestampType(databaseType);
    const timestampDefault = getTimestampDefault(databaseType);

    config.databaseTables.push({
      name: 'users',
      purpose: 'User accounts and authentication',
      columns: [
        { name: 'id', type: idType, constraints: 'PRIMARY KEY' },
        { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE NOT NULL' },
        { name: 'password_hash', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
        { name: 'created_at', type: timestampType, constraints: timestampDefault },
        { name: 'updated_at', type: timestampType, constraints: timestampDefault },
      ],
      indexes: databaseType === 'mongodb' ? [] : ['CREATE UNIQUE INDEX idx_users_email ON users(email)'],
      relationships: [],
    });
  }

  if (architecture.needsRealtime) {
    config.websocketEvents.push(
      { name: 'connect', description: 'Client connected' },
      { name: 'disconnect', description: 'Client disconnected' },
      { name: 'update', description: 'Data update broadcast' }
    );
  }

  return config;
}

/**
 * Get appropriate ID type for database
 */
function getIdType(databaseType) {
  switch (databaseType) {
    case 'mongodb':
      return 'ObjectId';
    case 'mysql':
    case 'mariadb':
      return 'INT AUTO_INCREMENT';
    case 'sqlite':
      return 'INTEGER';
    default:
      return 'UUID';
  }
}

/**
 * Get appropriate timestamp type for database
 */
function getTimestampType(databaseType) {
  switch (databaseType) {
    case 'mongodb':
      return 'Date';
    case 'mysql':
    case 'mariadb':
      return 'DATETIME';
    case 'sqlite':
      return 'TEXT';
    default:
      return 'TIMESTAMP';
  }
}

/**
 * Get appropriate timestamp default for database
 */
function getTimestampDefault(databaseType) {
  switch (databaseType) {
    case 'mongodb':
      return '';
    case 'mysql':
    case 'mariadb':
      return 'DEFAULT CURRENT_TIMESTAMP';
    case 'sqlite':
      return "DEFAULT (datetime('now'))";
    default:
      return 'DEFAULT NOW()';
  }
}
