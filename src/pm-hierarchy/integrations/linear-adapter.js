/**
 * Linear Integration Adapter (Re-export)
 * Implementation: ./linear/adapter.js
 */

import { LinearAdapter } from './linear/adapter.js';

export { LinearAdapter };

/**
 * Create Linear adapter instance
 */
export function createLinearAdapter(config) {
  return new LinearAdapter(config);
}
