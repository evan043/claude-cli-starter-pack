/**
 * @fileoverview API Contract Definition and OpenAPI Spec Generation
 * Generates REST endpoints, request/response schemas, and OpenAPI specifications
 */

/**
 * Generate REST API endpoints from feature descriptions
 * @param {Array<Object>} features - Array of feature objects
 * @returns {Array<Object>} Array of endpoint definitions
 * @example
 * generateRESTEndpoints([
 *   { name: 'User Management', actions: ['create', 'read', 'update', 'delete'] }
 * ])
 * // Returns: [
 * //   { path: '/api/users', method: 'POST', feature: 'User Management', action: 'create' },
 * //   { path: '/api/users/{id}', method: 'GET', feature: 'User Management', action: 'read' },
 * //   ...
 * // ]
 */
export function generateRESTEndpoints(features) {
  const endpoints = [];

  features.forEach(feature => {
    const resourceName = inferResourceName(feature.name);
    const basePath = `/api/${resourceName}`;

    // Generate CRUD endpoints if actions are specified
    if (feature.actions && Array.isArray(feature.actions)) {
      feature.actions.forEach(action => {
        const endpoint = mapActionToEndpoint(basePath, action, feature);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      });
    } else {
      // Default to basic CRUD
      endpoints.push(
        {
          path: basePath,
          method: 'POST',
          feature: feature.name,
          action: 'create',
          description: `Create a new ${resourceName}`,
          tags: [resourceName]
        },
        {
          path: `${basePath}/{id}`,
          method: 'GET',
          feature: feature.name,
          action: 'read',
          description: `Get a ${resourceName} by ID`,
          parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }],
          tags: [resourceName]
        },
        {
          path: basePath,
          method: 'GET',
          feature: feature.name,
          action: 'list',
          description: `List all ${resourceName}`,
          parameters: [
            { name: 'page', in: 'query', required: false, type: 'integer', default: 1 },
            { name: 'limit', in: 'query', required: false, type: 'integer', default: 20 }
          ],
          tags: [resourceName]
        },
        {
          path: `${basePath}/{id}`,
          method: 'PUT',
          feature: feature.name,
          action: 'update',
          description: `Update a ${resourceName}`,
          parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }],
          tags: [resourceName]
        },
        {
          path: `${basePath}/{id}`,
          method: 'DELETE',
          feature: feature.name,
          action: 'delete',
          description: `Delete a ${resourceName}`,
          parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }],
          tags: [resourceName]
        }
      );
    }

    // Add custom endpoints from feature definition
    if (feature.customEndpoints && Array.isArray(feature.customEndpoints)) {
      feature.customEndpoints.forEach(custom => {
        endpoints.push({
          ...custom,
          feature: feature.name,
          tags: custom.tags || [resourceName]
        });
      });
    }
  });

  return endpoints;
}

/**
 * Generate request body schema for an endpoint
 * @param {Object} endpoint - Endpoint definition object
 * @returns {Object} JSON Schema for request body
 * @example
 * generateRequestSchema({
 *   path: '/api/users',
 *   method: 'POST',
 *   action: 'create',
 *   fields: ['name', 'email', 'password']
 * })
 */
export function generateRequestSchema(endpoint) {
  const schema = {
    type: 'object',
    properties: {},
    required: []
  };

  // No request body for GET and DELETE
  if (endpoint.method === 'GET' || endpoint.method === 'DELETE') {
    return null;
  }

  // Use provided schema if available
  if (endpoint.requestSchema) {
    return endpoint.requestSchema;
  }

  // Generate schema from fields
  if (endpoint.fields && Array.isArray(endpoint.fields)) {
    endpoint.fields.forEach(field => {
      const fieldSchema = inferFieldSchema(field);
      schema.properties[fieldSchema.name] = fieldSchema.schema;

      if (fieldSchema.required) {
        schema.required.push(fieldSchema.name);
      }
    });
  } else {
    // Infer fields from endpoint action
    const inferredFields = inferFieldsFromAction(endpoint);
    inferredFields.forEach(field => {
      schema.properties[field.name] = field.schema;
      if (field.required) {
        schema.required.push(field.name);
      }
    });
  }

  return schema;
}

/**
 * Generate response schema for an endpoint
 * @param {Object} endpoint - Endpoint definition object
 * @returns {Object} Response schema with status codes
 * @example
 * generateResponseSchema({
 *   path: '/api/users/{id}',
 *   method: 'GET',
 *   action: 'read'
 * })
 */
export function generateResponseSchema(endpoint) {
  const responses = {};

  // Use provided response schema if available
  if (endpoint.responseSchema) {
    return endpoint.responseSchema;
  }

  // Success responses
  if (endpoint.method === 'POST') {
    responses['201'] = {
      description: 'Resource created successfully',
      schema: generateSuccessResponseSchema(endpoint, 'create')
    };
  } else if (endpoint.method === 'DELETE') {
    responses['204'] = {
      description: 'Resource deleted successfully'
    };
  } else {
    responses['200'] = {
      description: 'Successful operation',
      schema: generateSuccessResponseSchema(endpoint, endpoint.action)
    };
  }

  // Error responses
  responses['400'] = {
    description: 'Bad request - Invalid input',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        details: { type: 'object' }
      }
    }
  };

  if (endpoint.method !== 'POST' && endpoint.path.includes('{id}')) {
    responses['404'] = {
      description: 'Resource not found',
      schema: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Resource not found' }
        }
      }
    };
  }

  responses['500'] = {
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  };

  return responses;
}

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
 * Infer resource name from feature name
 * @param {string} featureName - Feature name
 * @returns {string} Resource name (lowercase, plural)
 * @private
 */
function inferResourceName(featureName) {
  let resource = featureName
    .toLowerCase()
    .replace(/management|module|feature/gi, '')
    .trim()
    .replace(/\s+/g, '-');

  // Pluralize if not already plural
  if (!resource.endsWith('s') && !resource.endsWith('data')) {
    resource += 's';
  }

  return resource;
}

/**
 * Map action to REST endpoint
 * @param {string} basePath - Base API path
 * @param {string} action - Action name
 * @param {Object} feature - Feature object
 * @returns {Object|null} Endpoint definition
 * @private
 */
function mapActionToEndpoint(basePath, action, feature) {
  const actionMap = {
    create: { method: 'POST', path: basePath, description: `Create a new ${feature.name}` },
    read: { method: 'GET', path: `${basePath}/{id}`, description: `Get ${feature.name} by ID` },
    update: { method: 'PUT', path: `${basePath}/{id}`, description: `Update ${feature.name}` },
    delete: { method: 'DELETE', path: `${basePath}/{id}`, description: `Delete ${feature.name}` },
    list: { method: 'GET', path: basePath, description: `List all ${feature.name}` },
    search: { method: 'GET', path: `${basePath}/search`, description: `Search ${feature.name}` }
  };

  const endpoint = actionMap[action.toLowerCase()];
  if (!endpoint) return null;

  return {
    ...endpoint,
    feature: feature.name,
    action,
    tags: [inferResourceName(feature.name)]
  };
}

/**
 * Infer field schema from field definition
 * @param {string|Object} field - Field name or field object
 * @returns {Object} Field schema with name, type, and required flag
 * @private
 */
function inferFieldSchema(field) {
  if (typeof field === 'string') {
    return {
      name: field,
      schema: inferTypeFromName(field),
      required: !field.endsWith('?')
    };
  }

  return {
    name: field.name,
    schema: field.schema || inferTypeFromName(field.name),
    required: field.required !== false
  };
}

/**
 * Infer JSON Schema type from field name
 * @param {string} fieldName - Field name
 * @returns {Object} JSON Schema type definition
 * @private
 */
function inferTypeFromName(fieldName) {
  const lowerName = fieldName.toLowerCase().replace(/\?$/, '');

  if (lowerName.includes('email')) {
    return { type: 'string', format: 'email' };
  }
  if (lowerName.includes('password')) {
    return { type: 'string', format: 'password', minLength: 8 };
  }
  if (lowerName.includes('url') || lowerName.includes('link')) {
    return { type: 'string', format: 'uri' };
  }
  if (lowerName.includes('date') || lowerName.includes('created') || lowerName.includes('updated')) {
    return { type: 'string', format: 'date-time' };
  }
  if (lowerName.includes('count') || lowerName.includes('age') || lowerName.includes('number')) {
    return { type: 'integer' };
  }
  if (lowerName.includes('price') || lowerName.includes('amount') || lowerName.includes('total')) {
    return { type: 'number', format: 'float' };
  }
  if (lowerName.includes('active') || lowerName.includes('enabled') || lowerName.includes('is')) {
    return { type: 'boolean' };
  }

  return { type: 'string' };
}

/**
 * Infer fields from endpoint action
 * @param {Object} endpoint - Endpoint definition
 * @returns {Array<Object>} Array of field definitions
 * @private
 */
function inferFieldsFromAction(endpoint) {
  const resourceName = endpoint.path.split('/').pop().replace('{id}', '').replace(/-/g, '_');

  const commonFields = [
    { name: 'id', schema: { type: 'string' }, required: false },
    { name: 'created_at', schema: { type: 'string', format: 'date-time' }, required: false },
    { name: 'updated_at', schema: { type: 'string', format: 'date-time' }, required: false }
  ];

  if (endpoint.action === 'create') {
    return [
      { name: 'name', schema: { type: 'string' }, required: true },
      { name: 'description', schema: { type: 'string' }, required: false }
    ];
  }

  if (endpoint.action === 'update') {
    return [
      { name: 'name', schema: { type: 'string' }, required: false },
      { name: 'description', schema: { type: 'string' }, required: false }
    ];
  }

  return commonFields;
}

/**
 * Generate success response schema based on action
 * @param {Object} endpoint - Endpoint definition
 * @param {string} action - Action type
 * @returns {Object} Response schema
 * @private
 */
function generateSuccessResponseSchema(endpoint, action) {
  const resourceName = endpoint.path.split('/').pop().replace('{id}', '').replace(/-/g, '_');

  if (action === 'list') {
    return {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            }
          }
        },
        total: { type: 'integer' },
        page: { type: 'integer' },
        limit: { type: 'integer' }
      }
    };
  }

  return {
    type: 'object',
    properties: {
      id: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  };
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
