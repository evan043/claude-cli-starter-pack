/**
 * Vision Schema Constants
 * Enums and schema definitions for VISION.json structure.
 */

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

  // Requirements Document (PRD)
  requirements_document: {
    title: 'string',
    generated_at: 'ISO8601',
    confidence: 'number (0-1)',
    sections: {
      overview: {
        title: 'string',
        objective: 'string',
        intent: 'VisionIntent enum',
        scope: 'string'
      },
      user_stories: {
        title: 'string',
        stories: ['string']
      },
      functional_requirements: {
        title: 'string',
        must_have: ['string'],
        should_have: ['string'],
        could_have: ['string'],
        wont_have: ['string']
      },
      non_functional: {
        title: 'string',
        quality_attributes: ['string'],
        performance: 'string | null',
        security: 'string | null',
        accessibility: 'string | null'
      },
      technical_constraints: {
        title: 'string',
        technologies: ['string'],
        constraints: ['string']
      },
      acceptance_criteria: {
        title: 'string',
        criteria: [{
          feature: 'string',
          given: 'string',
          when: 'string',
          then: 'string'
        }]
      },
      out_of_scope: {
        title: 'string',
        items: ['string']
      }
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
