/**
 * Orchestrator Agent Management
 * Handles creation and registration of specialized agents
 */

import { loadVision, updateVision } from '../state-manager.js';
import { createSpecializedAgent, registerAgent, allocateAgentContext } from '../agent-factory.js';
import { log } from './lifecycle.js';

/**
 * Create specialized agents for the vision
 */
export async function createAgents(orchestrator) {
  if (!orchestrator.vision) {
    throw new Error('Vision not initialized. Call initialize() first.');
  }

  try {
    log(orchestrator, 'info', 'Creating specialized agents...');

    const features = orchestrator.vision.metadata?.features || [];
    const technologies = orchestrator.vision.prompt?.technologies || [];

    const createdAgents = [];

    // Determine which agents to create based on features and tech
    const agentSpecs = determineRequiredAgents(orchestrator, features, technologies);

    for (const spec of agentSpecs) {
      log(orchestrator, 'info', `Creating ${spec.domain} agent...`);

      const agent = await createSpecializedAgent(spec.domain, {
        visionSlug: orchestrator.vision.slug,
        features: spec.features,
        technologies: spec.technologies,
        contextBudget: orchestrator.config.agents.defaultContextBudget
      });

      // Register and allocate context
      registerAgent(agent);
      allocateAgentContext(agent, spec.contextBudget || orchestrator.config.agents.defaultContextBudget);

      orchestrator.agents.set(spec.domain, agent);
      createdAgents.push(agent);
    }

    // Save agent info to vision
    await updateVision(orchestrator.projectRoot, orchestrator.vision.slug, (vision) => {
      vision.agents = createdAgents.map(a => ({
        id: a.id,
        domain: a.domain,
        status: 'ready'
      }));
      return vision;
    });

    orchestrator.vision = await loadVision(orchestrator.projectRoot, orchestrator.vision.slug);

    log(orchestrator, 'info', `Created ${createdAgents.length} agents`);

    return {
      success: true,
      agents: createdAgents
    };

  } catch (error) {
    log(orchestrator, 'error', `Agent creation failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Determine which agents are needed
 */
export function determineRequiredAgents(orchestrator, features, technologies) {
  const specs = [];

  // Always create an orchestrator agent
  specs.push({
    domain: 'orchestrator',
    features: features.slice(0, 5),
    technologies,
    contextBudget: 100000
  });

  // Frontend agent if React/Vue/Angular detected
  if (technologies.some(t => ['react', 'vue', 'angular', 'svelte'].includes(t?.toLowerCase()))) {
    specs.push({
      domain: 'frontend',
      features: features.filter(f => f.type === 'ui' || f.name?.includes('ui')),
      technologies: technologies.filter(t => ['react', 'vue', 'angular', 'svelte', 'tailwind', 'css'].includes(t?.toLowerCase())),
      contextBudget: 75000
    });
  }

  // Backend agent if backend framework detected
  if (technologies.some(t => ['fastapi', 'express', 'django', 'flask', 'nest'].includes(t?.toLowerCase()))) {
    specs.push({
      domain: 'backend',
      features: features.filter(f => f.type === 'api' || f.name?.includes('api')),
      technologies: technologies.filter(t => ['fastapi', 'express', 'django', 'flask', 'nest', 'postgresql', 'mongodb'].includes(t?.toLowerCase())),
      contextBudget: 75000
    });
  }

  // Testing agent
  specs.push({
    domain: 'testing',
    features: features,
    technologies: technologies.filter(t => ['playwright', 'vitest', 'jest', 'pytest'].includes(t?.toLowerCase())),
    contextBudget: 50000
  });

  return specs;
}
