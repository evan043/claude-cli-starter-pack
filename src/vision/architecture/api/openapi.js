/**
 * @fileoverview OpenAPI 3.0 Specification Generation
 * Formats endpoints as OpenAPI 3.0 specification with schemas
 */

import { generateRequestSchema, generateResponseSchema } from './schemas.js';

/**
 * Format endpoints as OpenAPI 3.0 specification
 * @param {Array<Object>} endpoints - Array of endpoint definitions
 * @param {Object} options - OpenAPI metadata options
 * @returns {Object} Complete OpenAPI 3.0 specification
 * @example
 * formatOpenAPISpec(endpoints, {
 *   title: 'My API',
 *   version: '1.0.0',
 *   description: 'API for my application'
 * })
 */
export function formatOpenAPISpec(endpoints, options = {}) {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: options.title || 'API Documentation',
      version: options.version || '1.0.0',
      description: options.description || 'Auto-generated API documentation',
      contact: options.contact || {}
    },
    servers: options.servers || [
      { url: 'http://localhost:8000', description: 'Development server' },
      { url: 'https://api.example.com', description: 'Production server' }
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: options.securitySchemes || {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  };

  // Group endpoints by path
  endpoints.forEach(endpoint => {
    const path = endpoint.path;
    const method = endpoint.method.toLowerCase();

    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }

    spec.paths[path][method] = {
      summary: endpoint.description || `${endpoint.method} ${endpoint.path}`,
      description: endpoint.longDescription || endpoint.description,
      tags: endpoint.tags || ['default'],
      operationId: endpoint.operationId || generateOperationId(endpoint),
      parameters: endpoint.parameters || [],
      responses: generateResponseSchema(endpoint)
    };

    // Add request body for methods that support it
    const requestSchema = generateRequestSchema(endpoint);
    if (requestSchema) {
      spec.paths[path][method].requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: requestSchema
          }
        }
      };
    }

    // Add security if endpoint requires auth
    if (endpoint.requiresAuth !== false) {
      spec.paths[path][method].security = [{ bearerAuth: [] }];
    }
  });

  return spec;
}

/**
 * Generate operation ID from endpoint
 * @param {Object} endpoint - Endpoint definition
 * @returns {string} Operation ID
 * @private
 */
function generateOperationId(endpoint) {
  const resource = endpoint.path.split('/').pop().replace('{id}', '').replace(/-/g, '_');
  const method = endpoint.method.toLowerCase();

  const methodMap = {
    get: endpoint.path.includes('{id}') ? 'get' : 'list',
    post: 'create',
    put: 'update',
    patch: 'patch',
    delete: 'delete'
  };

  return `${methodMap[method] || method}_${resource}`;
}
