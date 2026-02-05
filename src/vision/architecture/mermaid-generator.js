/**
 * @fileoverview Mermaid Diagram Generation for Architecture Planning
 * Generates valid Mermaid syntax for component, data flow, sequence, and deployment diagrams
 */

/**
 * Generate a component diagram showing relationships between system components
 * @param {Array<Object>} components - Array of component objects
 * @param {Object} techStack - Technology stack from tech-stack.json
 * @returns {string} Mermaid component diagram syntax
 * @example
 * generateComponentDiagram([
 *   { name: 'Frontend', type: 'React', dependencies: ['Backend API'] },
 *   { name: 'Backend API', type: 'FastAPI', dependencies: ['Database'] }
 * ], techStack)
 */
export function generateComponentDiagram(components, techStack) {
  const lines = ['graph TB'];
  const processedEdges = new Set();

  // Define nodes
  components.forEach((comp, idx) => {
    const nodeId = sanitizeNodeId(comp.name);
    const label = comp.type ? `${comp.name}<br/>[${comp.type}]` : comp.name;

    // Style based on component type
    let nodeStyle = '[]'; // Default rectangle
    if (comp.type === 'Database' || comp.type?.includes('DB')) {
      nodeStyle = '[(Database)]';
    } else if (comp.type === 'API' || comp.name?.includes('API')) {
      nodeStyle = '{{API}}';
    } else if (comp.type === 'Frontend' || comp.type?.includes('React') || comp.type?.includes('Vue')) {
      nodeStyle = '[/Frontend\\]';
    } else if (comp.type === 'Service') {
      nodeStyle = '(Service)';
    }

    lines.push(`    ${nodeId}${nodeStyle.replace('[]', `["${label}"]`).replace(/\(.*?\)|\{.*?\}|\[.*?\]/g, (match) => {
      if (match === '[]') return `["${label}"]`;
      return match.replace(/\w+/, label);
    })}`);
  });

  lines.push('');

  // Define relationships
  components.forEach(comp => {
    const sourceId = sanitizeNodeId(comp.name);

    if (comp.dependencies && Array.isArray(comp.dependencies)) {
      comp.dependencies.forEach(dep => {
        const targetId = sanitizeNodeId(dep);
        const edgeKey = `${sourceId}->${targetId}`;

        if (!processedEdges.has(edgeKey)) {
          lines.push(`    ${sourceId} --> ${targetId}`);
          processedEdges.add(edgeKey);
        }
      });
    }
  });

  // Add styling
  lines.push('');
  lines.push('    classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px,color:#000');
  lines.push('    classDef backend fill:#009688,stroke:#333,stroke-width:2px,color:#fff');
  lines.push('    classDef database fill:#336791,stroke:#333,stroke-width:2px,color:#fff');

  return lines.join('\n');
}

/**
 * Generate a data flow diagram showing how data moves through the system
 * @param {Array<Object>} features - Array of feature objects with data flows
 * @param {Object} techStack - Technology stack from tech-stack.json
 * @returns {string} Mermaid flowchart syntax
 * @example
 * generateDataFlowDiagram([
 *   { name: 'User Login', flows: ['User -> Auth Service', 'Auth Service -> Database'] }
 * ], techStack)
 */
export function generateDataFlowDiagram(features, techStack) {
  const lines = ['flowchart LR'];
  const nodes = new Set();
  const edges = [];

  features.forEach(feature => {
    if (feature.flows && Array.isArray(feature.flows)) {
      feature.flows.forEach(flow => {
        const parts = flow.split('->').map(p => p.trim());
        if (parts.length >= 2) {
          const source = sanitizeNodeId(parts[0]);
          const target = sanitizeNodeId(parts[1]);
          const label = parts[2] || '';

          nodes.add(source);
          nodes.add(target);

          if (label) {
            edges.push(`    ${source} -->|${label}| ${target}`);
          } else {
            edges.push(`    ${source} --> ${target}`);
          }
        }
      });
    }
  });

  // Add feature grouping if features exist
  if (features.length > 0) {
    features.forEach((feature, idx) => {
      if (feature.flows && feature.flows.length > 0) {
        lines.push('');
        lines.push(`    subgraph feature${idx}["${feature.name}"]`);

        feature.flows.forEach(flow => {
          const parts = flow.split('->').map(p => p.trim());
          if (parts.length >= 2) {
            const source = sanitizeNodeId(parts[0]);
            const target = sanitizeNodeId(parts[1]);
            const label = parts[2] || '';

            if (label) {
              lines.push(`        ${source} -->|${label}| ${target}`);
            } else {
              lines.push(`        ${source} --> ${target}`);
            }
          }
        });

        lines.push('    end');
      }
    });
  } else {
    // If no features, just add edges
    edges.forEach(edge => lines.push(edge));
  }

  return lines.join('\n');
}

/**
 * Generate a sequence diagram showing API call sequences
 * @param {Array<Object>} apiContracts - Array of API endpoint objects
 * @returns {string} Mermaid sequence diagram syntax
 * @example
 * generateSequenceDiagram([
 *   { path: '/api/users', method: 'GET', caller: 'Frontend', handler: 'Backend' }
 * ])
 */
export function generateSequenceDiagram(apiContracts) {
  const lines = ['sequenceDiagram'];
  const participants = new Set();

  // Extract participants
  apiContracts.forEach(contract => {
    if (contract.caller) participants.add(contract.caller);
    if (contract.handler) participants.add(contract.handler);

    // Add database if mentioned
    if (contract.usesDatabase) participants.add('Database');
  });

  // Define participants
  participants.forEach(p => {
    lines.push(`    participant ${sanitizeNodeId(p)} as ${p}`);
  });

  lines.push('');

  // Generate sequence flows
  apiContracts.forEach(contract => {
    const caller = sanitizeNodeId(contract.caller || 'Client');
    const handler = sanitizeNodeId(contract.handler || 'Server');
    const method = contract.method || 'GET';
    const path = contract.path || '/api';

    lines.push(`    ${caller}->>+${handler}: ${method} ${path}`);

    // Add validation step if schema exists
    if (contract.requestSchema) {
      lines.push(`    ${handler}->>${handler}: Validate request`);
    }

    // Add database interaction
    if (contract.usesDatabase) {
      lines.push(`    ${handler}->>+Database: Query data`);
      lines.push(`    Database-->>-${handler}: Return results`);
    }

    // Add processing step
    if (contract.processing) {
      lines.push(`    ${handler}->>${handler}: ${contract.processing}`);
    }

    // Return response
    const responseCode = contract.responseCode || '200 OK';
    lines.push(`    ${handler}-->>-${caller}: ${responseCode}`);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Generate a deployment architecture diagram
 * @param {Object} techStack - Technology stack from tech-stack.json
 * @returns {string} Mermaid C4 or deployment diagram syntax
 * @example
 * generateDeploymentDiagram({
 *   frontend: { framework: 'React', deployment: { platform: 'Cloudflare' } },
 *   backend: { framework: 'FastAPI', deployment: { platform: 'Railway' } }
 * })
 */
export function generateDeploymentDiagram(techStack) {
  const lines = ['graph TB'];

  // Client/User layer
  lines.push('    User[User/Browser]');
  lines.push('');

  // Frontend deployment
  if (techStack.frontend) {
    const frontendPlatform = techStack.frontend.deployment?.platform || 'Static Hosting';
    const frontendFramework = techStack.frontend.framework || 'Frontend';

    lines.push(`    subgraph Frontend["Frontend - ${frontendPlatform}"]`);
    lines.push(`        FE[${frontendFramework} App]`);
    if (techStack.frontend.bundler) {
      lines.push(`        FE_BUILD[Build: ${techStack.frontend.bundler}]`);
    }
    lines.push('    end');
    lines.push('');
    lines.push('    User --> FE');
    lines.push('');
  }

  // Backend deployment
  if (techStack.backend) {
    const backendPlatform = techStack.backend.deployment?.platform || 'Server';
    const backendFramework = techStack.backend.framework || 'Backend';

    lines.push(`    subgraph Backend["Backend - ${backendPlatform}"]`);
    lines.push(`        BE[${backendFramework} API]`);

    // Add middleware if present
    if (techStack.backend.auth) {
      lines.push(`        AUTH[Auth: ${techStack.backend.auth}]`);
    }

    lines.push('    end');
    lines.push('');

    if (techStack.frontend) {
      lines.push('    FE --> BE');
    } else {
      lines.push('    User --> BE');
    }

    if (techStack.backend.auth) {
      lines.push('    BE --> AUTH');
    }
    lines.push('');
  }

  // Database layer
  if (techStack.database) {
    const dbType = techStack.database.type || 'Database';
    const dbPlatform = techStack.database.deployment?.platform || 'Managed DB';

    lines.push(`    subgraph Database["Database - ${dbPlatform}"]`);
    lines.push(`        DB[(${dbType})]`);
    lines.push('    end');
    lines.push('');

    if (techStack.backend) {
      lines.push('    BE --> DB');
    }
    lines.push('');
  }

  // External services
  if (techStack.externalServices && Array.isArray(techStack.externalServices)) {
    lines.push('    subgraph External["External Services"]');
    techStack.externalServices.forEach((service, idx) => {
      const serviceId = `EXT${idx}`;
      lines.push(`        ${serviceId}[${service.name || service}]`);
    });
    lines.push('    end');
    lines.push('');

    if (techStack.backend) {
      lines.push('    BE --> External');
    }
  }

  // Styling
  lines.push('    classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px');
  lines.push('    classDef backend fill:#009688,stroke:#333,stroke-width:2px');
  lines.push('    classDef database fill:#336791,stroke:#333,stroke-width:2px');
  lines.push('    classDef external fill:#ff9800,stroke:#333,stroke-width:2px');
  lines.push('');
  lines.push('    class FE,FE_BUILD frontend');
  lines.push('    class BE,AUTH backend');
  lines.push('    class DB database');

  return lines.join('\n');
}

/**
 * Sanitize a string to be used as a Mermaid node ID
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized node ID
 * @private
 */
function sanitizeNodeId(str) {
  return str
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
