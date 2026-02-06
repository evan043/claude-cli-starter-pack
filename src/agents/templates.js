/**
 * Agent Creation Templates
 *
 * Base templates for creating Claude Code components:
 * - Individual agents
 * - Hooks (PreToolUse, UserPromptSubmit, etc.)
 * - Slash commands
 * - Skills with RAG
 *
 * This file is a thin re-export wrapper around submodules.
 */

// Component creation templates (hooks, commands)
export {
  generateHookTemplate,
  generateCommandTemplate,
} from './templates/component-templates.js';

// Agent creation templates (agents, orchestrators)
export {
  generateAgentTemplate,
  generateOrchestratorTemplate,
} from './templates/agent-templates.js';

// Skill creation templates (skills, context, workflows)
export {
  generateSkillTemplate,
  generateSkillContextReadme,
  generateSkillWorkflowsReadme,
} from './templates/skill-templates.js';

// Constants (event types, tools, complexity levels, agent levels)
export {
  HOOK_EVENT_TYPES,
  HOOK_TOOLS,
  COMPLEXITY_LEVELS,
  AGENT_LEVELS,
} from './templates/constants.js';
