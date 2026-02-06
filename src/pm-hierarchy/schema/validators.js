/**
 * Project Management Hierarchy Schema Validators
 */

/**
 * Validate epic structure
 */
export function validateEpic(epic) {
  const errors = [];

  if (!epic.epic_id) errors.push('epic_id is required');
  if (!epic.title) errors.push('title is required');
  if (!epic.slug) errors.push('slug is required');

  const validStatuses = ['backlog', 'planned', 'active', 'paused', 'completed', 'cancelled'];
  if (epic.status && !validStatuses.includes(epic.status)) {
    errors.push(`Invalid status: ${epic.status}`);
  }

  const validPriorities = ['P0', 'P1', 'P2', 'P3', 'P4'];
  if (epic.priority && !validPriorities.includes(epic.priority)) {
    errors.push(`Invalid priority: ${epic.priority}`);
  }

  const validTypes = ['quarterly', 'feature', 'initiative'];
  if (epic.type && !validTypes.includes(epic.type)) {
    errors.push(`Invalid type: ${epic.type}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate vision structure
 */
export function validateVision(vision) {
  const errors = [];

  if (!vision.vision_id) errors.push('vision_id is required');
  if (!vision.title) errors.push('title is required');

  if (vision.okrs) {
    for (let i = 0; i < vision.okrs.length; i++) {
      const okr = vision.okrs[i];
      if (!okr.objective) {
        errors.push(`OKR ${i + 1}: objective is required`);
      }
      if (!okr.key_results || okr.key_results.length === 0) {
        errors.push(`OKR ${i + 1}: at least one key result is required`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate integration config
 */
export function validateIntegrationConfig(config) {
  const errors = [];
  const warnings = [];

  // Check primary integration is enabled
  if (config.primary && config.primary !== 'none') {
    if (!config.enabled?.includes(config.primary)) {
      errors.push(`Primary integration '${config.primary}' is not in enabled list`);
    }
  }

  // Check Jira config if enabled
  if (config.jira?.enabled) {
    if (!config.jira.base_url) errors.push('Jira: base_url is required');
    if (!config.jira.project_key) errors.push('Jira: project_key is required');
    if (!config.jira.api_token) warnings.push('Jira: api_token not set');
    if (!config.jira.email) warnings.push('Jira: email not set');
  }

  // Check Linear config if enabled
  if (config.linear?.enabled) {
    if (!config.linear.api_key) warnings.push('Linear: api_key not set');
    if (!config.linear.team_key) errors.push('Linear: team_key is required');
  }

  // Check ClickUp config if enabled
  if (config.clickup?.enabled) {
    if (!config.clickup.api_key) warnings.push('ClickUp: api_key not set');
    if (!config.clickup.workspace_id) errors.push('ClickUp: workspace_id is required');
    if (!config.clickup.space_id) errors.push('ClickUp: space_id is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
