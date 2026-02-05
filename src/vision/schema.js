/**
 * Vision Schema Definition
 *
 * Defines the VISION.json structure for autonomous feature development.
 * Vision sits above the Epic hierarchy (L0+) and orchestrates complete MVP development.
 */

import { v4 as uuidv4 } from 'uuid';

// Vision Status States
export const VisionStatus = {
  PLANNING: 'planning',
  ANALYZING: 'analyzing',
  ARCHITECTING: 'architecting',
  ORCHESTRATING: 'orchestrating',
  EXECUTING: 'executing',
  VALIDATING: 'validating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused'
};

// Vision Intent Types
export const VisionIntent = {
  BUILD: 'build',
  MODIFY: 'modify',
  REFACTOR: 'refactor',
  MIGRATE: 'migrate',
  OPTIMIZE: 'optimize'
};

// Drift Severity Levels
export const DriftSeverity = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * VISION.json Schema Definition
 */
export const VISION_SCHEMA = {
  // Identity
  vision_id: 'string (uuid)',
  slug: 'string (kebab-case)',
  title: 'string',
  status: 'VisionStatus enum',

  // Original Input
  prompt: {
    original: 'string (user input)',
    parsed: {
      intent: 'VisionIntent enum',
      features: ['string'],
      constraints: ['string'],
      quality_attributes: ['string']
    },
    confidence: 'number (0-1)',
    parsed_at: 'ISO8601'
  },

  // Analysis Results
  analysis: {
    web_search: {
      similar_apps: [{
        name: 'string',
        url: 'string',
        relevance: 'High | Medium | Low',
        features_to_adopt: ['string'],
        screenshot_url: 'string | null'
      }],
      ui_inspiration: [{
        source: 'string',
        url: 'string',
        pattern: 'string',
        image_url: 'string | null'
      }],
      open_source_tools: [{
        name: 'string',
        package_manager: 'npm | pip | cargo | go',
        package_name: 'string',
        stars: 'number',
        security_status: 'clean | warning | critical | unknown',
        license: 'string',
        last_updated: 'ISO8601'
      }]
    },
    mcp_servers: [{
      name: 'string',
      description: 'string',
      relevance: 'High | Medium | Low',
      requires_setup: 'boolean',
      setup_instructions: 'string | null'
    }],
    account_requirements: [{
      service: 'string',
      type: 'oauth | api_key | token | credentials',
      required: 'boolean',
      setup_steps: ['string'],
      env_var_name: 'string'
    }],
    completed_at: 'ISO8601 | null'
  },

  // UI Wireframes
  wireframes: {
    ascii_ui: 'string (ASCII art)',
    components: [{
      name: 'string',
      type: 'layout | navigation | form | display | interactive | draggable',
      children: ['component_name'],
      props: 'object'
    }],
    screens: [{
      name: 'string',
      ascii: 'string',
      components: ['component_name']
    }]
  },

  // Architecture Plan
  architecture: {
    mermaid_diagrams: {
      component: 'string (mermaid syntax)',
      data_flow: 'string (mermaid syntax)',
      sequence: 'string (mermaid syntax)',
      deployment: 'string (mermaid syntax)'
    },
    tech_decisions: {
      frontend: { framework: 'string', reason: 'string' },
      state: { library: 'string', reason: 'string' },
      backend: { framework: 'string', reason: 'string' },
      database: { type: 'string', reason: 'string' },
      additional: [{ category: 'string', choice: 'string', reason: 'string' }]
    },
    api_contracts: [{
      method: 'GET | POST | PUT | PATCH | DELETE',
      path: 'string',
      description: 'string',
      request_schema: 'object | null',
      response_schema: 'object',
      auth_required: 'boolean'
    }],
    state_design: {
      stores: [{
        name: 'string',
        purpose: 'string',
        shape: 'object'
      }],
      actions: [{
        store: 'string',
        name: 'string',
        description: 'string'
      }]
    }
  },

  // Execution Plan
  execution_plan: {
    epic_id: 'string (uuid) | null',
    epic_slug: 'string | null',
    roadmaps: [{
      order: 'number',
      title: 'string',
      roadmap_id: 'string (uuid)',
      roadmap_slug: 'string',
      status: 'pending | in_progress | completed',
      completion_percentage: 'number (0-100)'
    }],
    estimated_phases: 'number',
    estimated_tasks: 'number',
    token_budget: {
      total: 'number',
      allocated: 'number',
      used: 'number',
      per_roadmap: 'number'
    },
    agents_created: [{
      name: 'string',
      domain: 'string',
      created_at: 'ISO8601'
    }]
  },

  // Observer State
  observer: {
    enabled: 'boolean',
    last_observation: 'ISO8601 | null',
    observation_count: 'number',
    drift_events: [{
      detected_at: 'ISO8601',
      severity: 'DriftSeverity enum',
      area: 'string',
      expected: 'string',
      actual: 'string',
      resolution: 'adjusted | ignored | escalated'
    }],
    adjustments_made: 'number',
    current_alignment: 'number (0-1)',
    alignment_history: [{
      timestamp: 'ISO8601',
      alignment: 'number (0-1)'
    }]
  },

  // Security Status
  security: {
    enabled: 'boolean',
    last_scan: 'ISO8601 | null',
    scan_count: 'number',
    vulnerabilities_found: 'number',
    vulnerabilities_blocked: 'number',
    packages_scanned: 'number',
    blocked_packages: [{
      name: 'string',
      reason: 'string',
      severity: 'string',
      blocked_at: 'ISO8601'
    }]
  },

  // Metadata
  metadata: {
    created: 'ISO8601',
    updated: 'ISO8601',
    created_by: 'string',
    completion_percentage: 'number (0-100)',
    tags: ['string'],
    priority: 'low | medium | high | critical'
  }
};

/**
 * Create a new Vision object
 * @param {Object} options - Vision creation options
 * @returns {Object} New Vision object
 */
export function createVision(options = {}) {
  const {
    title = 'Untitled Vision',
    prompt = '',
    tags = [],
    priority = 'medium'
  } = options;

  const now = new Date().toISOString();
  const visionId = options.vision_id || `vis-${uuidv4()}`;
  const slug = options.slug || generateSlug(title);

  return {
    vision_id: visionId,
    slug,
    title,
    status: VisionStatus.PLANNING,

    prompt: {
      original: prompt,
      parsed: {
        intent: null,
        features: [],
        constraints: [],
        quality_attributes: []
      },
      confidence: 0,
      parsed_at: null
    },

    analysis: {
      web_search: {
        similar_apps: [],
        ui_inspiration: [],
        open_source_tools: []
      },
      mcp_servers: [],
      account_requirements: [],
      completed_at: null
    },

    wireframes: {
      ascii_ui: '',
      components: [],
      screens: []
    },

    architecture: {
      mermaid_diagrams: {
        component: '',
        data_flow: '',
        sequence: '',
        deployment: ''
      },
      tech_decisions: {
        frontend: { framework: '', reason: '' },
        state: { library: '', reason: '' },
        backend: { framework: '', reason: '' },
        database: { type: '', reason: '' },
        additional: []
      },
      api_contracts: [],
      state_design: {
        stores: [],
        actions: []
      }
    },

    execution_plan: {
      epic_id: null,
      epic_slug: null,
      roadmaps: [],
      estimated_phases: 0,
      estimated_tasks: 0,
      token_budget: {
        total: 200000,
        allocated: 0,
        used: 0,
        per_roadmap: 50000
      },
      agents_created: []
    },

    observer: {
      enabled: true,
      last_observation: null,
      observation_count: 0,
      drift_events: [],
      adjustments_made: 0,
      current_alignment: 1.0,
      alignment_history: []
    },

    security: {
      enabled: true,
      last_scan: null,
      scan_count: 0,
      vulnerabilities_found: 0,
      vulnerabilities_blocked: 0,
      packages_scanned: 0,
      blocked_packages: []
    },

    metadata: {
      created: now,
      updated: now,
      created_by: 'vision-orchestrator',
      completion_percentage: 0,
      tags,
      priority
    }
  };
}

/**
 * Generate slug from title
 * @param {string} title - Vision title
 * @returns {string} Kebab-case slug
 */
export function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Validate a Vision object against schema
 * @param {Object} vision - Vision object to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateVision(vision) {
  const errors = [];

  // Required fields
  if (!vision.vision_id) {
    errors.push('Missing required field: vision_id');
  }
  if (!vision.slug) {
    errors.push('Missing required field: slug');
  }
  if (!vision.title || vision.title.trim() === '') {
    errors.push('Missing required field: title');
  }
  if (!Object.values(VisionStatus).includes(vision.status)) {
    errors.push(`Invalid status: ${vision.status}`);
  }

  // Validate prompt
  if (!vision.prompt || typeof vision.prompt.original !== 'string') {
    errors.push('Missing or invalid prompt.original');
  }

  // Validate observer
  if (vision.observer) {
    if (typeof vision.observer.current_alignment !== 'number' ||
        vision.observer.current_alignment < 0 ||
        vision.observer.current_alignment > 1) {
      errors.push('observer.current_alignment must be a number between 0 and 1');
    }
  }

  // Validate token budget
  if (vision.execution_plan?.token_budget) {
    const budget = vision.execution_plan.token_budget;
    if (budget.used > budget.total) {
      errors.push('Token budget exceeded: used > total');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Update Vision status with timestamp
 * @param {Object} vision - Vision object to update
 * @param {string} newStatus - New status value
 * @returns {Object} Updated vision
 */
export function updateVisionStatus(vision, newStatus) {
  if (!Object.values(VisionStatus).includes(newStatus)) {
    throw new Error(`Invalid vision status: ${newStatus}`);
  }

  vision.status = newStatus;
  vision.metadata.updated = new Date().toISOString();

  return vision;
}

/**
 * Update Vision completion percentage
 * @param {Object} vision - Vision object
 * @returns {number} Calculated completion percentage
 */
export function calculateVisionCompletion(vision) {
  if (!vision.execution_plan?.roadmaps?.length) {
    return 0;
  }

  const roadmaps = vision.execution_plan.roadmaps;
  const totalCompletion = roadmaps.reduce((sum, rm) => sum + (rm.completion_percentage || 0), 0);
  const completion = Math.round(totalCompletion / roadmaps.length);

  vision.metadata.completion_percentage = completion;
  vision.metadata.updated = new Date().toISOString();

  return completion;
}

/**
 * Record a drift event
 * @param {Object} vision - Vision object
 * @param {Object} driftEvent - Drift event details
 */
export function recordDriftEvent(vision, driftEvent) {
  const event = {
    detected_at: new Date().toISOString(),
    severity: driftEvent.severity || DriftSeverity.LOW,
    area: driftEvent.area,
    expected: driftEvent.expected,
    actual: driftEvent.actual,
    resolution: driftEvent.resolution || 'adjusted'
  };

  vision.observer.drift_events.push(event);
  vision.observer.observation_count++;
  vision.observer.last_observation = event.detected_at;

  if (event.resolution === 'adjusted') {
    vision.observer.adjustments_made++;
  }

  vision.metadata.updated = event.detected_at;
}

/**
 * Update alignment score
 * @param {Object} vision - Vision object
 * @param {number} alignment - New alignment score (0-1)
 */
export function updateAlignment(vision, alignment) {
  const timestamp = new Date().toISOString();

  vision.observer.current_alignment = alignment;
  vision.observer.alignment_history.push({ timestamp, alignment });
  vision.observer.last_observation = timestamp;
  vision.metadata.updated = timestamp;

  // Keep only last 100 alignment records
  if (vision.observer.alignment_history.length > 100) {
    vision.observer.alignment_history = vision.observer.alignment_history.slice(-100);
  }
}

/**
 * Record security scan results
 * @param {Object} vision - Vision object
 * @param {Object} scanResults - Security scan results
 */
export function recordSecurityScan(vision, scanResults) {
  const timestamp = new Date().toISOString();

  vision.security.last_scan = timestamp;
  vision.security.scan_count++;
  vision.security.packages_scanned += scanResults.packages_scanned || 0;
  vision.security.vulnerabilities_found += scanResults.vulnerabilities_found || 0;

  if (scanResults.blocked_packages?.length > 0) {
    for (const pkg of scanResults.blocked_packages) {
      vision.security.blocked_packages.push({
        name: pkg.name,
        reason: pkg.reason,
        severity: pkg.severity,
        blocked_at: timestamp
      });
      vision.security.vulnerabilities_blocked++;
    }
  }

  vision.metadata.updated = timestamp;
}

/**
 * Add agent to execution plan
 * @param {Object} vision - Vision object
 * @param {Object} agent - Agent details
 */
export function addCreatedAgent(vision, agent) {
  vision.execution_plan.agents_created.push({
    name: agent.name,
    domain: agent.domain,
    created_at: new Date().toISOString()
  });

  vision.metadata.updated = new Date().toISOString();
}

/**
 * Update roadmap progress in execution plan
 * @param {Object} vision - Vision object
 * @param {string} roadmapId - Roadmap ID to update
 * @param {Object} updates - Updates to apply
 */
export function updateRoadmapProgress(vision, roadmapId, updates) {
  const roadmap = vision.execution_plan.roadmaps.find(rm => rm.roadmap_id === roadmapId);

  if (roadmap) {
    if (updates.status) roadmap.status = updates.status;
    if (typeof updates.completion_percentage === 'number') {
      roadmap.completion_percentage = updates.completion_percentage;
    }

    // Recalculate overall completion
    calculateVisionCompletion(vision);
  }
}

export default {
  VisionStatus,
  VisionIntent,
  DriftSeverity,
  VISION_SCHEMA,
  createVision,
  generateSlug,
  validateVision,
  updateVisionStatus,
  calculateVisionCompletion,
  recordDriftEvent,
  updateAlignment,
  recordSecurityScan,
  addCreatedAgent,
  updateRoadmapProgress
};
