/**
 * CCASP Shared Constants
 *
 * Centralized constants for .claude directory structure, status enums,
 * and shared configuration values used across the codebase.
 */

/**
 * .claude directory segment names (used with claudeAbsolutePath)
 */
export const CLAUDE_DIRS = {
  ROOT: '.claude',
  CONFIG: 'config',
  HOOKS: 'hooks',
  COMMANDS: 'commands',
  SKILLS: 'skills',
  CACHE: 'cache',
  LOGS: 'logs',
  SESSIONS: 'sessions',
  BACKUPS: 'backups',
  DOCS: 'docs',
  ROADMAPS: 'roadmaps',
  TASK_LISTS: 'task-lists',
  SCRIPTS: 'scripts',
};

/**
 * Well-known config file names within .claude/config/
 */
export const CONFIG_FILES = {
  TECH_STACK: 'tech-stack.json',
  SETTINGS: 'settings.json',
  CCASP_STATE: 'ccasp-state.json',
  DELEGATION: 'delegation.json',
  CONSTITUTION: 'constitution.yaml',
};

/**
 * Roadmap and task status values
 */
export const STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  BLOCKED: 'blocked',
};

/**
 * Phase development scale indicators
 */
export const SCALE = {
  SMALL: 'S',
  MEDIUM: 'M',
  LARGE: 'L',
  EXTRA_LARGE: 'XL',
};

/**
 * Default tech stack version
 */
export const TECH_STACK_VERSION = '2.0.0';
