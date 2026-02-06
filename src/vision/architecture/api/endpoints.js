/**
 * @fileoverview REST Endpoint Generation
 * Generates REST API endpoints from feature descriptions
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
