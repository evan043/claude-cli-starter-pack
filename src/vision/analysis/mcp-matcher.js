/**
 * MCP Server Matcher
 *
 * Matches application features to available MCP servers.
 * Provides capability index and recommendations for MCP integration.
 *
 * @module vision/analysis/mcp-matcher
 */

/**
 * Match features to relevant MCP servers
 *
 * @param {Array<string>} features - Application features
 * @param {Object} techStack - Detected tech stack
 * @returns {Array<Object>} Matched MCP servers with integration suggestions
 *
 * @example
 * const mcpServers = await matchMCPServers(
 *   ['authentication', 'database', 'deployment'],
 *   { backend: 'fastapi', frontend: 'react' }
 * );
 * // [
 *   { server: 'railway-mcp-server', features: ['deployment'], setup: '...' },
 *   { server: 'postgres-mcp', features: ['database'], setup: '...' }
 * // ]
 */
export async function matchMCPServers(features, techStack = {}) {
  const capabilities = getMCPCapabilities();
  const matches = [];

  features.forEach(feature => {
    const featureLower = feature.toLowerCase();

    Object.entries(capabilities).forEach(([serverName, config]) => {
      const { categories, techCompatibility, requiresAuth } = config;

      // Check if feature matches any category
      const categoryMatch = categories.some(cat =>
        featureLower.includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(featureLower)
      );

      if (categoryMatch) {
        // Check tech stack compatibility
        const techMatch = isTechStackCompatible(techStack, techCompatibility);

        matches.push({
          server: serverName,
          matchedFeature: feature,
          categories: categories,
          compatibilityScore: techMatch ? 1.0 : 0.5,
          requiresAuth: requiresAuth,
          setupComplexity: config.setupComplexity || 'medium',
          integrationGuide: config.integrationGuide,
          capabilities: config.capabilities
        });
      }
    });
  });

  // Remove duplicates and sort by compatibility
  const uniqueMatches = Array.from(
    new Map(matches.map(m => [m.server, m])).values()
  );

  return uniqueMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

/**
 * Get MCP server capabilities index
 *
 * @returns {Object} MCP servers with their capabilities
 *
 * @example
 * const capabilities = getMCPCapabilities();
 * // {
 * //   'railway-mcp-server': {
 * //     categories: ['deployment', 'infrastructure'],
 * //     capabilities: ['deploy', 'logs', 'status'],
 * //     ...
 * //   }
 * // }
 */
export function getMCPCapabilities() {
  return {
    'railway-mcp-server': {
      categories: ['deployment', 'infrastructure', 'backend', 'CI/CD'],
      capabilities: [
        'deployment_trigger',
        'deployment_logs',
        'deployment_status',
        'environment_variables',
        'service_management'
      ],
      techCompatibility: {
        backend: ['fastapi', 'express', 'django', 'flask', 'nestjs', 'rails', 'any'],
        deployment: ['railway']
      },
      requiresAuth: true,
      authType: 'api-token',
      setupComplexity: 'low',
      integrationGuide: 'Add Railway API token to .env, configure in MCP settings',
      docs: 'https://railway.app/mcp'
    },

    'cloudflare-mcp-server': {
      categories: ['deployment', 'frontend', 'edge computing', 'CI/CD'],
      capabilities: [
        'pages_deploy',
        'workers_deploy',
        'dns_management',
        'analytics',
        'kv_storage'
      ],
      techCompatibility: {
        frontend: ['react', 'vue', 'svelte', 'static', 'any'],
        deployment: ['cloudflare']
      },
      requiresAuth: true,
      authType: 'api-token',
      setupComplexity: 'low',
      integrationGuide: 'Generate Cloudflare API token with Pages permissions',
      docs: 'https://developers.cloudflare.com/mcp'
    },

    'postgres-mcp': {
      categories: ['database', 'SQL', 'data persistence'],
      capabilities: [
        'query_execution',
        'schema_inspection',
        'migration_support',
        'connection_pooling'
      ],
      techCompatibility: {
        database: ['postgresql', 'postgres'],
        backend: ['any']
      },
      requiresAuth: true,
      authType: 'connection-string',
      setupComplexity: 'medium',
      integrationGuide: 'Provide PostgreSQL connection string in MCP config',
      docs: 'https://github.com/modelcontextprotocol/servers/tree/main/postgres'
    },

    'github-mcp-server': {
      categories: ['version control', 'CI/CD', 'project management', 'collaboration'],
      capabilities: [
        'repository_operations',
        'issue_management',
        'pull_request_management',
        'actions_workflow',
        'project_boards'
      ],
      techCompatibility: {
        vcs: ['git'],
        platform: ['github']
      },
      requiresAuth: true,
      authType: 'personal-access-token',
      setupComplexity: 'low',
      integrationGuide: 'Generate GitHub PAT with repo and workflow permissions',
      docs: 'https://github.com/modelcontextprotocol/servers/tree/main/github'
    },

    'filesystem-mcp': {
      categories: ['file management', 'local development', 'storage'],
      capabilities: [
        'file_read',
        'file_write',
        'directory_operations',
        'file_search'
      ],
      techCompatibility: {
        platform: ['any']
      },
      requiresAuth: false,
      setupComplexity: 'low',
      integrationGuide: 'Configure allowed directories in MCP settings',
      docs: 'https://github.com/modelcontextprotocol/servers/tree/main/filesystem'
    },

    'brave-search-mcp': {
      categories: ['web search', 'research', 'data discovery'],
      capabilities: [
        'web_search',
        'news_search',
        'image_search',
        'local_search'
      ],
      techCompatibility: {
        platform: ['any']
      },
      requiresAuth: true,
      authType: 'api-key',
      setupComplexity: 'low',
      integrationGuide: 'Sign up for Brave Search API and add key to config',
      docs: 'https://brave.com/search/api/'
    },

    'slack-mcp-server': {
      categories: ['notifications', 'collaboration', 'messaging'],
      capabilities: [
        'send_message',
        'channel_management',
        'user_lookup',
        'file_upload'
      ],
      techCompatibility: {
        platform: ['any']
      },
      requiresAuth: true,
      authType: 'oauth-token',
      setupComplexity: 'medium',
      integrationGuide: 'Create Slack app and install to workspace',
      docs: 'https://api.slack.com/mcp'
    },

    'stripe-mcp-server': {
      categories: ['payments', 'subscriptions', 'billing'],
      capabilities: [
        'payment_processing',
        'subscription_management',
        'customer_management',
        'invoice_generation'
      ],
      techCompatibility: {
        platform: ['any']
      },
      requiresAuth: true,
      authType: 'api-key',
      setupComplexity: 'medium',
      integrationGuide: 'Add Stripe API keys (test and live) to environment',
      docs: 'https://stripe.com/docs/mcp'
    },

    'sendgrid-mcp-server': {
      categories: ['email', 'notifications', 'transactional email'],
      capabilities: [
        'send_email',
        'template_management',
        'email_validation',
        'delivery_tracking'
      ],
      techCompatibility: {
        platform: ['any']
      },
      requiresAuth: true,
      authType: 'api-key',
      setupComplexity: 'low',
      integrationGuide: 'Generate SendGrid API key with Mail Send permission',
      docs: 'https://sendgrid.com/docs/mcp'
    },

    'aws-s3-mcp': {
      categories: ['file storage', 'cloud storage', 'media hosting'],
      capabilities: [
        'file_upload',
        'file_download',
        'bucket_management',
        'presigned_urls'
      ],
      techCompatibility: {
        platform: ['any']
      },
      requiresAuth: true,
      authType: 'aws-credentials',
      setupComplexity: 'medium',
      integrationGuide: 'Configure AWS credentials with S3 access',
      docs: 'https://aws.amazon.com/s3/mcp'
    },

    'redis-mcp': {
      categories: ['caching', 'session storage', 'real-time data'],
      capabilities: [
        'cache_operations',
        'pub_sub',
        'session_management',
        'rate_limiting'
      ],
      techCompatibility: {
        database: ['redis'],
        backend: ['any']
      },
      requiresAuth: true,
      authType: 'connection-string',
      setupComplexity: 'low',
      integrationGuide: 'Provide Redis connection URL',
      docs: 'https://redis.io/mcp'
    },

    'openai-mcp-server': {
      categories: ['AI', 'machine learning', 'natural language'],
      capabilities: [
        'text_generation',
        'embeddings',
        'image_generation',
        'function_calling'
      ],
      techCompatibility: {
        platform: ['any']
      },
      requiresAuth: true,
      authType: 'api-key',
      setupComplexity: 'low',
      integrationGuide: 'Add OpenAI API key to environment',
      docs: 'https://platform.openai.com/docs/mcp'
    },

    'anthropic-mcp-server': {
      categories: ['AI', 'machine learning', 'natural language'],
      capabilities: [
        'text_generation',
        'vision',
        'tool_use',
        'prompt_caching'
      ],
      techCompatibility: {
        platform: ['any']
      },
      requiresAuth: true,
      authType: 'api-key',
      setupComplexity: 'low',
      integrationGuide: 'Add Anthropic API key to environment',
      docs: 'https://docs.anthropic.com/mcp'
    }
  };
}

/**
 * Check if tech stack is compatible with MCP server
 * @private
 */
function isTechStackCompatible(techStack, mcpTechCompatibility) {
  if (!mcpTechCompatibility) return true;

  // Check each compatibility dimension
  for (const [dimension, compatibleValues] of Object.entries(mcpTechCompatibility)) {
    if (techStack[dimension]) {
      const stackValue = techStack[dimension].toLowerCase();
      const hasMatch = compatibleValues.some(val =>
        val === 'any' ||
        stackValue.includes(val.toLowerCase()) ||
        val.toLowerCase().includes(stackValue)
      );

      if (!hasMatch) return false;
    }
  }

  return true;
}

/**
 * Generate MCP configuration snippet
 *
 * @param {string} serverName - MCP server name
 * @param {Object} options - Configuration options
 * @returns {string} Configuration snippet
 */
export function generateMCPConfig(serverName, options = {}) {
  const capabilities = getMCPCapabilities();
  const config = capabilities[serverName];

  if (!config) {
    return `# Unknown MCP server: ${serverName}`;
  }

  const configSnippet = `
# ${serverName} Configuration
# Category: ${config.categories.join(', ')}
# Setup Complexity: ${config.setupComplexity}

{
  "mcpServers": {
    "${serverName}": {
      "command": "npx",
      "args": ["-y", "${serverName}"],
      ${config.requiresAuth ? `"env": {\n        "${config.authType.toUpperCase().replace('-', '_')}": "your-${config.authType}-here"\n      }` : '"env": {}'}
    }
  }
}

# Integration Guide:
# ${config.integrationGuide}

# Documentation: ${config.docs}

# Capabilities:
${config.capabilities.map(cap => `# - ${cap}`).join('\n')}
`.trim();

  return configSnippet;
}
