/**
 * @fileoverview Example Usage of Vision Mode Architecture Planning Module
 * Demonstrates how to use the architecture planning tools
 */

import {
  generateComponentDiagram,
  generateDataFlowDiagram,
  generateSequenceDiagram,
  generateDeploymentDiagram,
  generateRESTEndpoints,
  generateRequestSchema,
  generateResponseSchema,
  formatOpenAPISpec,
  designStores,
  generateActions,
  generateStateShape
} from './index.js';

// Example tech stack
const techStack = {
  frontend: {
    framework: 'React',
    bundler: 'Vite',
    deployment: { platform: 'Cloudflare Pages' }
  },
  backend: {
    framework: 'FastAPI',
    auth: 'JWT',
    deployment: { platform: 'Railway' }
  },
  database: {
    type: 'PostgreSQL',
    deployment: { platform: 'Railway' }
  }
};

// Example components
const components = [
  {
    name: 'React Frontend',
    type: 'React',
    dependencies: ['Backend API']
  },
  {
    name: 'Backend API',
    type: 'FastAPI',
    dependencies: ['Database', 'Auth Service']
  },
  {
    name: 'Auth Service',
    type: 'Service',
    dependencies: ['Database']
  },
  {
    name: 'Database',
    type: 'Database',
    dependencies: []
  }
];

// Example features
const features = [
  {
    name: 'User Management',
    actions: ['create', 'read', 'update', 'delete', 'list'],
    flows: [
      'User -> Frontend',
      'Frontend -> Backend API -> Validate',
      'Backend API -> Database -> Query',
      'Database -> Backend API -> Process',
      'Backend API -> Frontend -> Display'
    ],
    entities: ['user'],
    operations: ['login', 'logout', 'register'],
    fields: ['id', 'email', 'name', 'created_at']
  },
  {
    name: 'Task Management',
    actions: ['create', 'read', 'update', 'delete', 'list'],
    flows: [
      'User -> Frontend',
      'Frontend -> Backend API',
      'Backend API -> Database'
    ],
    entities: ['task'],
    operations: ['complete', 'archive'],
    fields: ['id', 'title', 'description', 'status', 'created_at']
  }
];

// Generate component diagram
console.log('=== COMPONENT DIAGRAM ===');
const componentDiagram = generateComponentDiagram(components, techStack);
console.log(componentDiagram);
console.log('\n');

// Generate data flow diagram
console.log('=== DATA FLOW DIAGRAM ===');
const dataFlowDiagram = generateDataFlowDiagram(features, techStack);
console.log(dataFlowDiagram);
console.log('\n');

// Generate REST endpoints
console.log('=== REST ENDPOINTS ===');
const endpoints = generateRESTEndpoints(features);
console.log(JSON.stringify(endpoints.slice(0, 3), null, 2)); // Show first 3
console.log(`... and ${endpoints.length - 3} more endpoints\n`);

// Generate API contracts
console.log('=== API CONTRACT EXAMPLE ===');
const exampleEndpoint = endpoints.find(e => e.method === 'POST');
const requestSchema = generateRequestSchema(exampleEndpoint);
const responseSchema = generateResponseSchema(exampleEndpoint);
console.log('Request Schema:', JSON.stringify(requestSchema, null, 2));
console.log('Response Schema:', JSON.stringify(responseSchema, null, 2));
console.log('\n');

// Generate sequence diagram
console.log('=== SEQUENCE DIAGRAM ===');
const apiContracts = [
  {
    path: '/api/users',
    method: 'POST',
    caller: 'Frontend',
    handler: 'Backend',
    usesDatabase: true,
    processing: 'Hash password'
  },
  {
    path: '/api/users/login',
    method: 'POST',
    caller: 'Frontend',
    handler: 'Backend',
    usesDatabase: true,
    processing: 'Generate JWT token'
  }
];
const sequenceDiagram = generateSequenceDiagram(apiContracts);
console.log(sequenceDiagram);
console.log('\n');

// Generate deployment diagram
console.log('=== DEPLOYMENT DIAGRAM ===');
const deploymentDiagram = generateDeploymentDiagram(techStack);
console.log(deploymentDiagram);
console.log('\n');

// Design stores
console.log('=== STATE STORE DESIGN (Zustand) ===');
const stores = designStores(features, 'zustand');
console.log(JSON.stringify(stores[0], null, 2)); // Show first store
console.log('\n');

// Generate actions
console.log('=== STORE ACTIONS ===');
const actions = generateActions(features[0], 'zustand');
console.log(JSON.stringify(actions.slice(0, 5), null, 2)); // Show first 5 actions
console.log('\n');

// Generate state shape
console.log('=== STATE SHAPE ===');
const stateShape = generateStateShape(features[0], 'zustand');
console.log(JSON.stringify(stateShape, null, 2));
console.log('\n');

// Generate OpenAPI spec
console.log('=== OPENAPI SPEC (excerpt) ===');
const openApiSpec = formatOpenAPISpec(endpoints, {
  title: 'Example API',
  version: '1.0.0',
  description: 'Auto-generated API documentation'
});
console.log(JSON.stringify({
  openapi: openApiSpec.openapi,
  info: openApiSpec.info,
  pathCount: Object.keys(openApiSpec.paths).length
}, null, 2));
console.log('\n');

console.log('=== USAGE EXAMPLES COMPLETE ===');
