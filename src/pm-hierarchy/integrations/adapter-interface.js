/**
 * Integration Adapter Interface
 *
 * Base interface for all external PM tool integrations.
 * Implementations: GitHub, Jira, Linear, ClickUp
 *
 * HIERARCHY RULES (same for all integrations):
 *
 * OPTIONAL (disabled by default):
 *   - Vision: AI-managed strategic direction with OKRs
 *   - Epics: User-managed initiatives CONTAINED within Vision
 *   - Both must be enabled via /menu -> settings -> Vision & Epics
 *
 * ALWAYS AVAILABLE (work independently):
 *   - Roadmaps: Timeline and sequencing of phases
 *   - Phases: Collections of related tasks
 *   - Tasks: Individual work units
 *
 * When Vision/Epics are enabled, they can optionally link to Roadmaps.
 * When disabled, Roadmaps, Phase Dev Plans, and Task Lists work independently.
 */

/**
 * Abstract base class for integration adapters
 * Each adapter implements these methods for their specific service
 */
export class IntegrationAdapter {
  constructor(config) {
    if (new.target === IntegrationAdapter) {
      throw new Error('IntegrationAdapter is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this.name = 'base';
    this.authenticated = false;
  }

  /**
   * Get adapter name
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Check if adapter is enabled in config
   * @returns {boolean}
   */
  isEnabled() {
    return this.config?.enabled === true;
  }

  /**
   * Test connection and authentication
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by adapter');
  }

  /**
   * Authenticate with the service
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async authenticate() {
    throw new Error('authenticate() must be implemented by adapter');
  }

  // ========================================
  // EPIC OPERATIONS
  // ========================================

  /**
   * Create an epic in the external system
   * @param {Object} epic - Epic object from schema
   * @returns {Promise<{success: boolean, external_id: string, url: string}>}
   */
  async createEpic(epic) {
    throw new Error('createEpic() must be implemented by adapter');
  }

  /**
   * Update an existing epic
   * @param {string} externalId - External system ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<{success: boolean}>}
   */
  async updateEpic(externalId, updates) {
    throw new Error('updateEpic() must be implemented by adapter');
  }

  /**
   * Get an epic from external system
   * @param {string} externalId
   * @returns {Promise<Object>}
   */
  async getEpic(externalId) {
    throw new Error('getEpic() must be implemented by adapter');
  }

  /**
   * List all epics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>}
   */
  async listEpics(filters = {}) {
    throw new Error('listEpics() must be implemented by adapter');
  }

  /**
   * Close/complete an epic
   * @param {string} externalId
   * @returns {Promise<{success: boolean}>}
   */
  async closeEpic(externalId) {
    throw new Error('closeEpic() must be implemented by adapter');
  }

  // ========================================
  // ROADMAP/STORY OPERATIONS
  // ========================================

  /**
   * Create a roadmap item (story/issue) in external system
   * @param {Object} roadmap - Roadmap object
   * @param {string} epicExternalId - Parent epic ID (optional)
   * @returns {Promise<{success: boolean, external_id: string, url: string}>}
   */
  async createRoadmapItem(roadmap, epicExternalId = null) {
    throw new Error('createRoadmapItem() must be implemented by adapter');
  }

  /**
   * Update a roadmap item
   * @param {string} externalId
   * @param {Object} updates
   * @returns {Promise<{success: boolean}>}
   */
  async updateRoadmapItem(externalId, updates) {
    throw new Error('updateRoadmapItem() must be implemented by adapter');
  }

  /**
   * Link roadmap item to epic
   * @param {string} roadmapExternalId
   * @param {string} epicExternalId
   * @returns {Promise<{success: boolean}>}
   */
  async linkToEpic(roadmapExternalId, epicExternalId) {
    throw new Error('linkToEpic() must be implemented by adapter');
  }

  // ========================================
  // PHASE/TASK OPERATIONS
  // ========================================

  /**
   * Create a phase item (task/subtask) in external system
   * @param {Object} phase - Phase object
   * @param {string} parentExternalId - Parent roadmap ID
   * @returns {Promise<{success: boolean, external_id: string, url: string}>}
   */
  async createPhaseItem(phase, parentExternalId = null) {
    throw new Error('createPhaseItem() must be implemented by adapter');
  }

  /**
   * Create a task item (subtask) in external system
   * @param {Object} task - Task object
   * @param {string} parentExternalId - Parent phase ID
   * @returns {Promise<{success: boolean, external_id: string, url: string}>}
   */
  async createTaskItem(task, parentExternalId = null) {
    throw new Error('createTaskItem() must be implemented by adapter');
  }

  /**
   * Update task status
   * @param {string} externalId
   * @param {string} status - Local status (pending, in_progress, completed, blocked)
   * @returns {Promise<{success: boolean}>}
   */
  async updateTaskStatus(externalId, status) {
    throw new Error('updateTaskStatus() must be implemented by adapter');
  }

  // ========================================
  // SYNC OPERATIONS
  // ========================================

  /**
   * Sync local state to external system
   * @param {Object} localData - Local epic/roadmap/phase data
   * @returns {Promise<{success: boolean, synced: number, errors: Array}>}
   */
  async syncToExternal(localData) {
    throw new Error('syncToExternal() must be implemented by adapter');
  }

  /**
   * Sync from external system to local state
   * @param {Object} options - Sync options (filters, etc.)
   * @returns {Promise<{success: boolean, items: Array, errors: Array}>}
   */
  async syncFromExternal(options = {}) {
    throw new Error('syncFromExternal() must be implemented by adapter');
  }

  /**
   * Post a comment/update to external item
   * @param {string} externalId
   * @param {string} comment
   * @returns {Promise<{success: boolean}>}
   */
  async postComment(externalId, comment) {
    throw new Error('postComment() must be implemented by adapter');
  }

  // ========================================
  // FIELD MAPPING
  // ========================================

  /**
   * Map local status to external status
   * @param {string} localStatus
   * @returns {string}
   */
  mapStatus(localStatus) {
    const mapping = this.config?.field_mapping?.status || {};
    return mapping[localStatus] || localStatus;
  }

  /**
   * Map external status to local status
   * @param {string} externalStatus
   * @returns {string}
   */
  reverseMapStatus(externalStatus) {
    const mapping = this.config?.field_mapping?.status || {};
    for (const [local, external] of Object.entries(mapping)) {
      if (external === externalStatus) return local;
    }
    return externalStatus;
  }

  /**
   * Map local priority to external priority
   * @param {string} localPriority
   * @returns {string}
   */
  mapPriority(localPriority) {
    const mapping = this.config?.field_mapping?.priority || {};
    return mapping[localPriority] || localPriority;
  }

  /**
   * Map local type to external type
   * @param {string} localType - epic, roadmap, phase, task
   * @returns {string}
   */
  mapType(localType) {
    const mapping = this.config?.field_mapping?.type || {};
    return mapping[localType] || localType;
  }

  // ========================================
  // UTILITIES
  // ========================================

  /**
   * Format error for logging
   * @param {Error} error
   * @param {string} operation
   * @returns {Object}
   */
  formatError(error, operation) {
    return {
      adapter: this.name,
      operation,
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if bidirectional sync is enabled
   * @returns {boolean}
   */
  isBidirectional() {
    return this.config?.sync_direction === 'bidirectional';
  }
}

/**
 * Adapter registry - manages all integration adapters
 */
export class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
  }

  /**
   * Register an adapter
   * @param {string} name
   * @param {IntegrationAdapter} adapter
   */
  register(name, adapter) {
    this.adapters.set(name, adapter);
  }

  /**
   * Get adapter by name
   * @param {string} name
   * @returns {IntegrationAdapter|null}
   */
  get(name) {
    return this.adapters.get(name) || null;
  }

  /**
   * Get all enabled adapters
   * @returns {Array<IntegrationAdapter>}
   */
  getEnabled() {
    return Array.from(this.adapters.values()).filter(a => a.isEnabled());
  }

  /**
   * Get primary adapter
   * @param {Object} config - Integration config
   * @returns {IntegrationAdapter|null}
   */
  getPrimary(config) {
    if (!config?.primary || config.primary === 'none') return null;
    return this.get(config.primary);
  }

  /**
   * Test all enabled adapters
   * @returns {Promise<Object>}
   */
  async testAll() {
    const results = {};
    for (const adapter of this.getEnabled()) {
      try {
        results[adapter.getName()] = await adapter.testConnection();
      } catch (e) {
        results[adapter.getName()] = { success: false, message: e.message };
      }
    }
    return results;
  }
}

/**
 * Sync result structure
 */
export const SyncResult = {
  success: true,
  created: [],
  updated: [],
  skipped: [],
  errors: [],
  timestamp: new Date().toISOString(),
};

/**
 * Create a sync result object
 */
export function createSyncResult(overrides = {}) {
  return {
    ...SyncResult,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}
