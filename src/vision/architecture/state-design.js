/**
 * @fileoverview State Management Planning and Design
 * Generates store structures, actions, and TypeScript-compatible state shapes
 * Supports Zustand, Redux, Pinia, and other state libraries
 */

/**
 * Design store structure from features and state library
 * @param {Array<Object>} features - Array of feature objects
 * @param {string} stateLibrary - State management library (zustand, redux, pinia, vuex, mobx)
 * @returns {Array<Object>} Array of store definitions
 * @example
 * designStores([
 *   { name: 'User Management', entities: ['user'], operations: ['login', 'logout'] }
 * ], 'zustand')
 */
export function designStores(features, stateLibrary = 'zustand') {
  const stores = [];
  const library = stateLibrary.toLowerCase();

  features.forEach(feature => {
    const storeName = inferStoreName(feature.name);
    const entities = feature.entities || [storeName];

    const store = {
      name: storeName,
      feature: feature.name,
      library,
      state: generateStateShape(feature, library),
      actions: generateActions(feature, library),
      selectors: generateSelectors(feature, library)
    };

    // Add library-specific configuration
    if (library === 'zustand') {
      store.pattern = 'slice';
      store.middleware = ['devtools', 'persist'];
    } else if (library === 'redux') {
      store.pattern = 'slice';
      store.middleware = ['thunk', 'devtools'];
      store.reducers = generateReducers(feature);
    } else if (library === 'pinia') {
      store.pattern = 'store';
      store.getters = generateGetters(feature);
    } else if (library === 'mobx') {
      store.pattern = 'observable';
      store.computed = generateComputed(feature);
    }

    stores.push(store);
  });

  return stores;
}

/**
 * Generate actions/mutations for a store
 * @param {Object} feature - Feature object or store definition
 * @param {string} library - State management library
 * @returns {Array<Object>} Array of action definitions
 * @example
 * generateActions({ name: 'User', operations: ['login', 'logout'] }, 'zustand')
 */
export function generateActions(feature, library = 'zustand') {
  const actions = [];
  const operations = feature.operations || [];
  const storeName = feature.store || inferStoreName(feature.name);

  // CRUD operations
  const crudOps = ['create', 'read', 'update', 'delete', 'list'];
  const hasCrud = operations.some(op => crudOps.includes(op.toLowerCase()));

  if (hasCrud || operations.length === 0) {
    // Add standard CRUD actions
    actions.push(
      {
        name: `fetch${capitalize(storeName)}`,
        type: 'async',
        description: `Fetch ${storeName} data from API`,
        params: ['id'],
        updates: ['loading', 'data', 'error']
      },
      {
        name: `fetch${capitalize(storeName)}List`,
        type: 'async',
        description: `Fetch list of ${storeName}`,
        params: ['filters'],
        updates: ['loading', 'items', 'error']
      },
      {
        name: `create${capitalize(storeName)}`,
        type: 'async',
        description: `Create new ${storeName}`,
        params: ['data'],
        updates: ['loading', 'data', 'error']
      },
      {
        name: `update${capitalize(storeName)}`,
        type: 'async',
        description: `Update existing ${storeName}`,
        params: ['id', 'data'],
        updates: ['loading', 'data', 'error']
      },
      {
        name: `delete${capitalize(storeName)}`,
        type: 'async',
        description: `Delete ${storeName}`,
        params: ['id'],
        updates: ['loading', 'error']
      }
    );
  }

  // Custom operations
  operations.forEach(op => {
    if (!crudOps.includes(op.toLowerCase())) {
      actions.push({
        name: `${op}${capitalize(storeName)}`,
        type: inferActionType(op),
        description: `${capitalize(op)} ${storeName}`,
        params: inferActionParams(op),
        updates: inferActionUpdates(op)
      });
    }
  });

  // Synchronous state updates
  actions.push(
    {
      name: `set${capitalize(storeName)}`,
      type: 'sync',
      description: `Set ${storeName} data`,
      params: ['data'],
      updates: ['data']
    },
    {
      name: 'setLoading',
      type: 'sync',
      description: 'Set loading state',
      params: ['loading'],
      updates: ['loading']
    },
    {
      name: 'setError',
      type: 'sync',
      description: 'Set error state',
      params: ['error'],
      updates: ['error']
    },
    {
      name: 'reset',
      type: 'sync',
      description: 'Reset store to initial state',
      params: [],
      updates: ['all']
    }
  );

  return actions;
}

/**
 * Generate TypeScript-compatible state shape
 * @param {Object} feature - Feature object or store definition
 * @param {string} library - State management library
 * @returns {Object} State shape with TypeScript types
 * @example
 * generateStateShape({ name: 'User', fields: ['id', 'name', 'email'] }, 'zustand')
 */
export function generateStateShape(feature, library = 'zustand') {
  const storeName = feature.store || inferStoreName(feature.name);
  const fields = feature.fields || [];

  const stateShape = {
    // Common state properties
    loading: {
      type: 'boolean',
      default: false,
      description: 'Loading state for async operations'
    },
    error: {
      type: 'string | null',
      default: null,
      description: 'Error message if operation failed'
    },
    data: {
      type: `${capitalize(storeName)} | null`,
      default: null,
      description: `Single ${storeName} entity`
    },
    items: {
      type: `${capitalize(storeName)}[]`,
      default: '[]',
      description: `Array of ${storeName} entities`
    }
  };

  // Add entity-specific fields
  if (fields.length > 0) {
    fields.forEach(field => {
      const fieldDef = typeof field === 'string' ? { name: field } : field;
      stateShape[fieldDef.name] = {
        type: fieldDef.type || inferTypeFromFieldName(fieldDef.name),
        default: fieldDef.default || getDefaultValue(fieldDef.type || inferTypeFromFieldName(fieldDef.name)),
        description: fieldDef.description || `${capitalize(fieldDef.name)} property`
      };
    });
  }

  // Library-specific additions
  if (library === 'redux') {
    stateShape.status = {
      type: "'idle' | 'loading' | 'succeeded' | 'failed'",
      default: "'idle'",
      description: 'Request status for Redux async thunks'
    };
  }

  if (library === 'zustand' && feature.persist) {
    stateShape._hasHydrated = {
      type: 'boolean',
      default: false,
      description: 'Zustand persist hydration status'
    };
  }

  return stateShape;
}

/**
 * Generate selectors for state access
 * @param {Object} feature - Feature object
 * @param {string} library - State management library
 * @returns {Array<Object>} Array of selector definitions
 * @private
 */
function generateSelectors(feature, library) {
  const storeName = inferStoreName(feature.name);
  const selectors = [];

  if (library === 'zustand' || library === 'redux') {
    selectors.push(
      {
        name: `select${capitalize(storeName)}`,
        returns: `${capitalize(storeName)} | null`,
        description: `Select current ${storeName} data`
      },
      {
        name: `select${capitalize(storeName)}List`,
        returns: `${capitalize(storeName)}[]`,
        description: `Select ${storeName} list`
      },
      {
        name: 'selectLoading',
        returns: 'boolean',
        description: 'Select loading state'
      },
      {
        name: 'selectError',
        returns: 'string | null',
        description: 'Select error state'
      }
    );
  }

  return selectors;
}

/**
 * Generate reducers for Redux
 * @param {Object} feature - Feature object
 * @returns {Array<Object>} Array of reducer definitions
 * @private
 */
function generateReducers(feature) {
  const storeName = inferStoreName(feature.name);

  return [
    {
      name: `${storeName}Loaded`,
      description: `Handle ${storeName} load success`,
      updates: { data: 'action.payload', loading: false, error: null }
    },
    {
      name: `${storeName}LoadFailed`,
      description: `Handle ${storeName} load failure`,
      updates: { error: 'action.payload', loading: false }
    },
    {
      name: `${storeName}Loading`,
      description: `Set ${storeName} loading state`,
      updates: { loading: true, error: null }
    }
  ];
}

/**
 * Generate getters for Pinia
 * @param {Object} feature - Feature object
 * @returns {Array<Object>} Array of getter definitions
 * @private
 */
function generateGetters(feature) {
  const storeName = inferStoreName(feature.name);

  return [
    {
      name: `${storeName}Count`,
      returns: 'number',
      description: `Count of ${storeName} items`
    },
    {
      name: `has${capitalize(storeName)}`,
      returns: 'boolean',
      description: `Check if ${storeName} data exists`
    },
    {
      name: 'isLoading',
      returns: 'boolean',
      description: 'Check if store is loading'
    }
  ];
}

/**
 * Generate computed properties for MobX
 * @param {Object} feature - Feature object
 * @returns {Array<Object>} Array of computed property definitions
 * @private
 */
function generateComputed(feature) {
  const storeName = inferStoreName(feature.name);

  return [
    {
      name: `${storeName}Count`,
      returns: 'number',
      description: `Computed count of ${storeName} items`
    },
    {
      name: 'hasData',
      returns: 'boolean',
      description: 'Computed flag for data existence'
    }
  ];
}

/**
 * Infer store name from feature name
 * @param {string} featureName - Feature name
 * @returns {string} Store name (lowercase, singular)
 * @private
 */
function inferStoreName(featureName) {
  let name = featureName
    .toLowerCase()
    .replace(/management|module|feature|store/gi, '')
    .trim()
    .replace(/\s+/g, '_');

  // Singularize if plural
  if (name.endsWith('s') && !name.endsWith('ss')) {
    name = name.slice(0, -1);
  }

  return name;
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 * @private
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Infer action type from operation name
 * @param {string} operation - Operation name
 * @returns {string} Action type (sync or async)
 * @private
 */
function inferActionType(operation) {
  const asyncOps = ['fetch', 'load', 'save', 'create', 'update', 'delete', 'submit', 'send'];
  return asyncOps.some(op => operation.toLowerCase().includes(op)) ? 'async' : 'sync';
}

/**
 * Infer action parameters from operation name
 * @param {string} operation - Operation name
 * @returns {Array<string>} Parameter names
 * @private
 */
function inferActionParams(operation) {
  const op = operation.toLowerCase();

  if (op.includes('fetch') || op.includes('load')) {
    return ['id'];
  }
  if (op.includes('create') || op.includes('add')) {
    return ['data'];
  }
  if (op.includes('update') || op.includes('edit')) {
    return ['id', 'data'];
  }
  if (op.includes('delete') || op.includes('remove')) {
    return ['id'];
  }
  if (op.includes('search') || op.includes('filter')) {
    return ['query'];
  }

  return ['params'];
}

/**
 * Infer state updates from operation name
 * @param {string} operation - Operation name
 * @returns {Array<string>} State properties that will be updated
 * @private
 */
function inferActionUpdates(operation) {
  const op = operation.toLowerCase();

  if (op.includes('fetch') || op.includes('load')) {
    return ['loading', 'data', 'error'];
  }
  if (op.includes('list') || op.includes('search')) {
    return ['loading', 'items', 'error'];
  }
  if (op.includes('create') || op.includes('update')) {
    return ['loading', 'data', 'error'];
  }
  if (op.includes('delete')) {
    return ['loading', 'items', 'error'];
  }

  return ['data'];
}

/**
 * Infer TypeScript type from field name
 * @param {string} fieldName - Field name
 * @returns {string} TypeScript type
 * @private
 */
function inferTypeFromFieldName(fieldName) {
  const lower = fieldName.toLowerCase();

  if (lower.includes('id')) return 'string';
  if (lower.includes('count') || lower.includes('age') || lower.includes('number')) return 'number';
  if (lower.includes('price') || lower.includes('amount')) return 'number';
  if (lower.includes('active') || lower.includes('enabled') || lower.includes('is')) return 'boolean';
  if (lower.includes('date') || lower.includes('created') || lower.includes('updated')) return 'Date | string';
  if (lower.includes('list') || lower.includes('items') || lower.includes('array')) return 'any[]';
  if (lower.includes('data') || lower.includes('config') || lower.includes('options')) return 'Record<string, any>';

  return 'string';
}

/**
 * Get default value for TypeScript type
 * @param {string} type - TypeScript type
 * @returns {string} Default value as string
 * @private
 */
function getDefaultValue(type) {
  if (type.includes('boolean')) return 'false';
  if (type.includes('number')) return '0';
  if (type.includes('[]')) return '[]';
  if (type.includes('Record') || type.includes('object')) return '{}';
  if (type.includes('null')) return 'null';
  if (type.includes('string')) return "''";

  return 'null';
}
