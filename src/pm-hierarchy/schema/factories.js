/**
 * Project Management Hierarchy Schema Factories
 */

import { DEFAULTS } from './definitions.js';

/**
 * Create empty epic with defaults
 */
export function createEmptyEpic(overrides = {}) {
  const id = crypto.randomUUID ? crypto.randomUUID() : `epic-${Date.now()}`;

  return {
    epic_id: id,
    slug: '',
    title: '',
    description: '',
    type: DEFAULTS.epic.type,
    business_objective: '',
    success_criteria: [],
    scope: { in: [], out: [] },
    status: DEFAULTS.epic.status,
    priority: DEFAULTS.epic.priority,
    timeline: {
      target_start: null,
      target_end: null,
      actual_start: null,
      actual_end: null,
      estimated_completion: null,
    },
    vision_id: null,
    roadmaps: [],
    external_links: {
      github: { issue_number: null, project_number: null, url: null },
      jira: { key: null, board_id: null, url: null },
      linear: { id: null, team_key: null, url: null },
      clickup: { task_id: null, list_id: null, space_id: null, url: null },
    },
    progress: {
      total_roadmaps: 0,
      completed_roadmaps: 0,
      completion_percentage: 0,
    },
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    created_by: 'user',
    ...overrides,
  };
}

/**
 * Create empty vision with defaults
 */
export function createEmptyVision(overrides = {}) {
  const id = crypto.randomUUID ? crypto.randomUUID() : `vision-${Date.now()}`;

  return {
    vision_id: id,
    title: '',
    description: '',
    status: 'draft',
    enabled: DEFAULTS.vision.enabled,
    okrs: [],
    timeline: {
      period: 'quarterly',
      start_date: null,
      end_date: null,
      velocity_adjustment: 1.0,
    },
    epics: [],
    ai_settings: {
      auto_generate_suggestions: false,
      reminder_threshold_percent: DEFAULTS.vision.reminder_threshold_percent,
      last_generated: null,
      generation_trigger: DEFAULTS.vision.generation_trigger,
    },
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create empty completion tracking
 */
export function createEmptyCompletionTracking() {
  return {
    velocity: {
      daily: { tasks_per_day: DEFAULTS.velocity.tasks_per_day, phases_per_week: 0, data_points: 0 },
      weekly: { tasks_per_week: 0, phases_per_month: 0, data_points: 0 },
      monthly: { roadmaps_per_month: 0, epics_per_quarter: 0, data_points: 0 },
    },
    completions: [],
    schedule_status: {
      current_position: 'on_track',
      deviation_percent: 0,
      last_calculated: new Date().toISOString(),
    },
    vision_reminders: {
      enabled: false,
      ahead_threshold_percent: DEFAULTS.velocity.ahead_threshold_percent,
      last_reminder: null,
      dismissed_until: null,
    },
    last_updated: new Date().toISOString(),
  };
}

/**
 * Create empty integration config
 */
export function createEmptyIntegrationConfig(overrides = {}) {
  return {
    primary: DEFAULTS.integration.primary,
    enabled: ['github'],
    github: {
      enabled: true,
      owner: '',
      repo: '',
      project_number: null,
      default_labels: [],
      sync_direction: DEFAULTS.integration.sync_direction,
    },
    jira: {
      enabled: false,
      base_url: '',
      project_key: '',
      board_id: null,
      api_token: '',
      email: '',
      sync_direction: DEFAULTS.integration.sync_direction,
      field_mapping: {
        status: { pending: 'To Do', in_progress: 'In Progress', completed: 'Done', blocked: 'Blocked' },
        priority: { P0: 'Highest', P1: 'High', P2: 'Medium', P3: 'Low', P4: 'Lowest' },
        type: { epic: 'Epic', roadmap: 'Story', phase: 'Task', task: 'Sub-task' },
      },
    },
    linear: {
      enabled: false,
      api_key: '',
      team_key: '',
      sync_direction: DEFAULTS.integration.sync_direction,
      field_mapping: {
        status: { pending: 'Backlog', in_progress: 'In Progress', completed: 'Done', blocked: 'Blocked' },
        priority: { P0: 'Urgent', P1: 'High', P2: 'Medium', P3: 'Low', P4: 'No Priority' },
      },
    },
    clickup: {
      enabled: false,
      api_key: '',
      workspace_id: '',
      space_id: '',
      default_list_id: null,
      sync_direction: DEFAULTS.integration.sync_direction,
      field_mapping: {
        status: { pending: 'to do', in_progress: 'in progress', completed: 'complete', blocked: 'blocked' },
        priority: { P0: '1', P1: '2', P2: '3', P3: '4', P4: null },
      },
    },
    sync: {
      auto_sync: false,
      sync_frequency: DEFAULTS.integration.sync_frequency,
      conflict_resolution: DEFAULTS.integration.conflict_resolution,
      last_sync: null,
    },
    configured_at: new Date().toISOString(),
    last_modified: new Date().toISOString(),
    ...overrides,
  };
}
