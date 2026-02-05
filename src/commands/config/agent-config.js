/**
 * Agent-Only Mode Configuration
 *
 * Create Agent-Only mode launcher scripts and policy files.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - launchers.js - Script generation (Windows batch, PowerShell, Bash)
 * - policy.js - Policy and agents.json generators
 * - templates.js - Main orchestration logic
 */

export { createAgentOnlyLauncher } from './agent-config/templates.js';
export { generateAgentOnlyPolicy, generateAgentsJson } from './agent-config/policy.js';
export { generateWindowsBatch, generatePowerShellLauncher, generateBashLauncher } from './agent-config/launchers.js';
