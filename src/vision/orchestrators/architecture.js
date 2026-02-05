/**
 * Orchestrator Architecture Phase
 * Handles diagram generation, API contracts, and state design
 */

import { loadVision, updateVision } from '../state-manager.js';
import {
  generateComponentDiagram,
  generateDataFlowDiagram,
  generateSequenceDiagram
} from '../architecture/index.js';
import { generateRESTEndpoints, formatOpenAPISpec } from '../architecture/api-contracts.js';
import { designStores, generateStateShape } from '../architecture/state-design.js';
import { generateASCIIWireframe, extractComponentList } from '../ui/index.js';
import { log, transitionStage, OrchestratorStage } from './lifecycle.js';

/**
 * Run architecture phase
 */
export async function architect(orchestrator) {
  transitionStage(orchestrator, OrchestratorStage.ARCHITECTURE);

  if (!orchestrator.vision) {
    throw new Error('Vision not initialized. Call initialize() first.');
  }

  try {
    const artifacts = {
      diagrams: {},
      apiContracts: null,
      stateDesign: null,
      wireframes: null,
      componentList: []
    };

    const prompt = orchestrator.vision.prompt;
    const features = orchestrator.vision.metadata?.features || [];

    // Generate component diagram
    log(orchestrator, 'info', 'Generating component diagram...');
    artifacts.diagrams.component = await generateComponentDiagram({
      title: orchestrator.vision.title,
      features,
      technologies: prompt.technologies || []
    });

    // Generate data flow diagram
    log(orchestrator, 'info', 'Generating data flow diagram...');
    artifacts.diagrams.dataFlow = await generateDataFlowDiagram({
      features,
      intent: prompt.intent
    });

    // Generate sequence diagrams for key flows
    log(orchestrator, 'info', 'Generating sequence diagrams...');
    artifacts.diagrams.sequences = [];
    for (const feature of features.slice(0, 3)) { // Top 3 features
      const sequence = await generateSequenceDiagram({
        feature: feature.name || feature,
        actors: ['User', 'Frontend', 'Backend', 'Database']
      });
      artifacts.diagrams.sequences.push({
        feature: feature.name || feature,
        diagram: sequence
      });
    }

    // Generate REST endpoints if backend detected
    if (prompt.technologies?.some(t =>
      ['fastapi', 'express', 'django', 'flask', 'nest'].includes(t?.toLowerCase())
    )) {
      log(orchestrator, 'info', 'Generating API contracts...');
      const endpoints = await generateRESTEndpoints(features);
      artifacts.apiContracts = formatOpenAPISpec({
        title: orchestrator.vision.title,
        endpoints
      });
    }

    // Generate state design if frontend detected
    if (prompt.technologies?.some(t =>
      ['react', 'vue', 'angular', 'svelte'].includes(t?.toLowerCase())
    )) {
      log(orchestrator, 'info', 'Designing state management...');
      artifacts.stateDesign = {
        stores: await designStores(features),
        stateShape: await generateStateShape(features)
      };
    }

    // Generate ASCII wireframes
    log(orchestrator, 'info', 'Generating ASCII wireframes...');
    artifacts.wireframes = await generateASCIIWireframe({
      title: orchestrator.vision.title,
      features,
      layout: prompt.constraints?.layout || 'standard'
    });

    // Extract component list from wireframes
    artifacts.componentList = extractComponentList(artifacts.wireframes);

    // Save architecture artifacts
    orchestrator.architectureArtifacts = artifacts;

    await updateVision(orchestrator.projectRoot, orchestrator.vision.slug, (vision) => {
      vision.architecture = artifacts;
      vision.orchestrator.stage = orchestrator.stage;
      return vision;
    });

    orchestrator.vision = await loadVision(orchestrator.projectRoot, orchestrator.vision.slug);

    log(orchestrator, 'info', 'Architecture complete', {
      diagrams: Object.keys(artifacts.diagrams).length,
      hasApiContracts: !!artifacts.apiContracts,
      hasStateDesign: !!artifacts.stateDesign,
      componentCount: artifacts.componentList.length
    });

    return {
      success: true,
      stage: orchestrator.stage,
      artifacts
    };

  } catch (error) {
    log(orchestrator, 'error', `Architecture failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      stage: orchestrator.stage
    };
  }
}
