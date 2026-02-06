/**
 * Orchestrator Planning - Roadmap Breakdown Analysis
 * Pure logic for analyzing scope and breaking down into roadmaps
 */

/**
 * Analyze scope and break down into roadmaps
 */
export function analyzeRoadmapBreakdown(orchestrator, features, _technologies, _complexity) {
  const roadmaps = [];

  // Group features by domain
  const frontendFeatures = features.filter(f =>
    f.type === 'ui' || f.name?.toLowerCase().includes('ui') ||
    f.name?.toLowerCase().includes('component') || f.name?.toLowerCase().includes('page')
  );
  const backendFeatures = features.filter(f =>
    f.type === 'api' || f.name?.toLowerCase().includes('api') ||
    f.name?.toLowerCase().includes('endpoint') || f.name?.toLowerCase().includes('service')
  );
  const dataFeatures = features.filter(f =>
    f.type === 'data' || f.name?.toLowerCase().includes('database') ||
    f.name?.toLowerCase().includes('model') || f.name?.toLowerCase().includes('schema')
  );
  const otherFeatures = features.filter(f =>
    !frontendFeatures.includes(f) && !backendFeatures.includes(f) && !dataFeatures.includes(f)
  );

  // Create roadmaps based on domain groupings
  if (frontendFeatures.length > 0) {
    roadmaps.push({
      title: 'Frontend Implementation',
      description: 'UI components, pages, and user interactions',
      phases: [{
        title: 'Frontend Setup & Components',
        tasks: frontendFeatures.map(f => ({
          name: f.name || f,
          description: f.description || ''
        }))
      }],
      depends_on: dataFeatures.length > 0 ? ['data-setup'] : []
    });
  }

  if (backendFeatures.length > 0) {
    roadmaps.push({
      title: 'Backend Implementation',
      description: 'APIs, services, and business logic',
      phases: [{
        title: 'Backend APIs & Services',
        tasks: backendFeatures.map(f => ({
          name: f.name || f,
          description: f.description || ''
        }))
      }],
      depends_on: dataFeatures.length > 0 ? ['data-setup'] : []
    });
  }

  if (dataFeatures.length > 0) {
    roadmaps.unshift({
      title: 'Data & Infrastructure Setup',
      description: 'Database schemas, models, and foundational setup',
      roadmap_id: 'data-setup',
      phases: [{
        title: 'Data Layer Setup',
        tasks: dataFeatures.map(f => ({
          name: f.name || f,
          description: f.description || ''
        }))
      }],
      depends_on: []
    });
  }

  // Add remaining features to a general roadmap
  if (otherFeatures.length > 0) {
    roadmaps.push({
      title: 'Additional Features',
      description: 'Additional functionality and integrations',
      phases: [{
        title: 'Additional Implementation',
        tasks: otherFeatures.map(f => ({
          name: f.name || f,
          description: f.description || ''
        }))
      }],
      depends_on: []
    });
  }

  // If no features detected, create a single roadmap
  if (roadmaps.length === 0) {
    roadmaps.push({
      title: 'MVP Implementation',
      description: `Implementation roadmap for ${orchestrator.vision.title}`,
      phases: [{
        title: 'Core Implementation',
        tasks: [{
          name: 'Implement core functionality',
          description: 'Main implementation tasks'
        }]
      }],
      depends_on: []
    });
  }

  return roadmaps;
}
