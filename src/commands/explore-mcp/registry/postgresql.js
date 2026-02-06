/**
 * PostgreSQL MCP Registry Entry (Enhanced)
 *
 * Enhanced PostgreSQL MCP configuration with DATABASE_URL prompt,
 * auto-detection from tech-stack.json, and connection string validation.
 * Complements the basic @bytebase/dbhub entry in catalog.js.
 */

/**
 * PostgreSQL MCP server definition (official MCP protocol server)
 * Uses npx to run the official @modelcontextprotocol/server-postgres
 */
export const POSTGRESQL_MCP = {
  id: 'postgres-official',
  name: 'PostgreSQL MCP (Official)',
  description: 'Direct PostgreSQL queries via official MCP protocol server with schema introspection',
  npmPackage: '@modelcontextprotocol/server-postgres',
  category: 'database',
  requiredEnv: {
    DATABASE_URL: { description: 'PostgreSQL connection string (postgresql://user:pass@host:5432/db)' },
  },
  optionalEnv: {},
  relevantFor: ['postgresql', 'postgres', 'sqlalchemy', 'prisma', 'sequelize', 'typeorm', 'drizzle', 'fastapi', 'django'],
  recommended: false,
  tools: ['query', 'list_tables', 'describe_table', 'list_schemas'],
  note: 'Auto-recommended when database.type is PostgreSQL in tech-stack.json.',
  // API Key metadata (uses DATABASE_URL, not a traditional API key)
  apiKeyRequired: true,
  apiKeyName: 'DATABASE_URL',
  apiKeyUrl: null,
  apiKeyFree: true,
  apiKeyNote: 'Use your PostgreSQL connection string. Format: postgresql://user:password@host:5432/database',
};

/**
 * Database detection patterns for PostgreSQL
 * Used by tech-stack detection to auto-recommend this MCP
 */
export const POSTGRES_DETECTION_PATTERNS = {
  techStack: ['postgresql', 'postgres'],
  orm: ['sqlalchemy', 'prisma', 'sequelize', 'typeorm', 'drizzle', 'django-orm'],
  npm: ['pg', 'postgres', 'knex', '@prisma/client', 'sequelize', 'typeorm', 'drizzle-orm'],
  pip: ['psycopg2', 'psycopg', 'asyncpg', 'sqlalchemy', 'databases'],
};

/**
 * Validate a PostgreSQL connection string format
 * @param {string} url - Connection string to validate
 * @returns {boolean} True if format is valid
 */
export function validatePostgresUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /^postgres(ql)?:\/\/.+/.test(url);
}
