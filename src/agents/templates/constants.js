/**
 * Constants for Agent Template System
 *
 * Defines available event types, tools, complexity levels, and agent levels.
 */

/**
 * Event types for hooks
 */
export const HOOK_EVENT_TYPES = {
  PreToolUse: {
    name: 'PreToolUse',
    description: 'Triggers before a tool is executed (can block)',
    canBlock: true,
    useCase: 'Enforce patterns, validate inputs, prevent operations',
  },
  PostToolUse: {
    name: 'PostToolUse',
    description: 'Triggers after a tool completes (cannot block)',
    canBlock: false,
    useCase: 'Log operations, verify results, cleanup',
  },
  UserPromptSubmit: {
    name: 'UserPromptSubmit',
    description: 'Triggers when user sends a message (cannot block)',
    canBlock: false,
    useCase: 'Inject context, modify prompts, trigger workflows',
  },
  SessionStart: {
    name: 'SessionStart',
    description: 'Triggers when a session begins',
    canBlock: false,
    useCase: 'Initialize state, load context, set up environment',
  },
  SessionStop: {
    name: 'SessionStop',
    description: 'Triggers when a session ends',
    canBlock: false,
    useCase: 'Save state, cleanup, generate reports',
  },
};

/**
 * Available tools for hooks
 */
export const HOOK_TOOLS = [
  'Edit',
  'Write',
  'Read',
  'Bash',
  'Grep',
  'Glob',
  'Task',
  'WebFetch',
  'WebSearch',
];

/**
 * Complexity levels
 */
export const COMPLEXITY_LEVELS = {
  low: {
    name: 'Low',
    description: 'Simple, quick tasks',
    duration: '< 5 minutes',
  },
  medium: {
    name: 'Medium',
    description: 'Multi-step tasks',
    duration: '5-20 minutes',
  },
  high: {
    name: 'High',
    description: 'Complex, multi-agent tasks',
    duration: '20-60+ minutes',
  },
};

/**
 * Agent levels
 */
export const AGENT_LEVELS = {
  L1: {
    name: 'L1 - Orchestrator',
    description: 'Routes and coordinates L2 specialists',
    tokenLimit: 'Full context',
  },
  L2: {
    name: 'L2 - Specialist',
    description: 'Deep domain expertise',
    tokenLimit: '1-8K tokens',
  },
  L3: {
    name: 'L3 - Worker',
    description: 'Parallel atomic tasks',
    tokenLimit: '500 tokens',
  },
};
