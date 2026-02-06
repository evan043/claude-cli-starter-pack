/**
 * API Contract Definition and OpenAPI Spec Generation
 * Thin re-export wrapper for organized submodules.
 */

export { generateRESTEndpoints } from './api/endpoints.js';
export { generateRequestSchema, generateResponseSchema } from './api/schemas.js';
export { formatOpenAPISpec } from './api/openapi.js';
