/**
 * Vision Schema Factories
 * Factory functions for creating and generating Vision objects.
 */

import { v4 as uuidv4 } from 'uuid';
import { VisionStatus } from './constants.js';

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
