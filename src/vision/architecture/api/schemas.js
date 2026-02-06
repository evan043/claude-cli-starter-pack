/**
 * @fileoverview Request and Response Schema Generation
 * Generates JSON schemas for API request/response payloads
 */

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
