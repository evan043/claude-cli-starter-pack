/**
 * Website Intelligence - Layer 1: Discovery
 *
 * Exports for the Discovery Engine.
 */

export { crawlSite, normalizeUrl, isInternalUrl, shouldIgnoreUrl } from './crawler.js';
export { extractComponents, detectSharedComponents } from './component-extractor.js';
