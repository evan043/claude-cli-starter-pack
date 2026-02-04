/**
 * Issue Metadata Template Generator
 *
 * Generates and parses CCASP-META HTML comment blocks for GitHub issues.
 * These blocks contain agent-parseable metadata linking issues to phase-dev plans.
 */

/**
 * Valid issue types
 */
const VALID_ISSUE_TYPES = ['feature', 'refactor', 'bug', 'testing'];

/**
 * Generate CCASP-META HTML comment block
 *
 * @param {Object} options - Metadata options
 * @param {string} options.source - Slash command that created this (e.g., /phase-dev-plan)
 * @param {string} options.slug - Plan/roadmap slug
 * @param {number} [options.phase] - Current phase number
 * @param {string} [options.task] - Current task ID (e.g., "2.3")
 * @param {string} options.progressFile - Path to PROGRESS.json
 * @param {string} options.issueType - One of: feature, refactor, bug, testing
 * @param {string} [options.createdAt] - ISO timestamp (defaults to now)
 * @param {string} [options.lastSynced] - ISO timestamp
 * @returns {string} CCASP-META HTML comment block
 * @throws {Error} If required fields are missing or invalid
 *
 * @example
 * const meta = generateCCSAPMeta({
 *   source: '/phase-dev-plan',
 *   slug: 'auth-system',
 *   phase: 2,
 *   task: '2.3',
 *   progressFile: '.claude/docs/auth-system/PROGRESS.json',
 *   issueType: 'feature'
 * });
 */
export function generateCCSAPMeta(options) {
  // Validate required fields
  if (!options.source) {
    throw new Error('CCASP-META generation error: source is required');
  }
  if (!options.slug) {
    throw new Error('CCASP-META generation error: slug is required');
  }
  if (!options.progressFile) {
    throw new Error('CCASP-META generation error: progressFile is required');
  }
  if (!options.issueType) {
    throw new Error('CCASP-META generation error: issueType is required');
  }

  // Validate issue type
  if (!VALID_ISSUE_TYPES.includes(options.issueType)) {
    throw new Error(
      `CCASP-META generation error: issueType must be one of: ${VALID_ISSUE_TYPES.join(', ')}`
    );
  }

  // Default timestamps
  const createdAt = options.createdAt || new Date().toISOString();
  const lastSynced = options.lastSynced || '';

  // Build metadata lines
  const lines = [
    '<!-- CCASP-META',
    `source: ${options.source}`,
    `slug: ${options.slug}`,
  ];

  if (options.phase !== undefined && options.phase !== null) {
    lines.push(`phase: ${options.phase}`);
  }

  if (options.task) {
    lines.push(`task: ${options.task}`);
  }

  lines.push(`progress_file: ${options.progressFile}`);
  lines.push(`issue_type: ${options.issueType}`);
  lines.push(`created_at: ${createdAt}`);

  if (lastSynced) {
    lines.push(`last_synced: ${lastSynced}`);
  }

  lines.push('-->');

  return lines.join('\n');
}

/**
 * Parse CCASP-META from issue body
 *
 * @param {string} issueBody - GitHub issue body text
 * @returns {Object|null} Parsed metadata object or null if not found
 *
 * @example
 * const meta = parseCCSAPMeta(issueBody);
 * if (meta) {
 *   console.log(`Issue for phase ${meta.phase}, task ${meta.task}`);
 * }
 */
export function parseCCSAPMeta(issueBody) {
  if (!issueBody || typeof issueBody !== 'string') {
    return null;
  }

  // Match CCASP-META block
  const metaRegex = /<!-- CCASP-META\s+([\s\S]*?)\s+-->/;
  const match = issueBody.match(metaRegex);

  if (!match) {
    return null;
  }

  const metaContent = match[1];
  const metadata = {};

  // Parse key-value pairs
  const lines = metaContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    const value = trimmed.substring(colonIndex + 1).trim();

    // Convert phase to number if present
    if (key === 'phase') {
      metadata[key] = parseInt(value, 10);
      continue;
    }

    metadata[key] = value;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

/**
 * Update CCASP-META in issue body
 *
 * @param {string} issueBody - Current issue body
 * @param {Object} updates - Fields to update
 * @returns {string} Updated issue body
 * @throws {Error} If CCASP-META not found in issue body
 *
 * @example
 * const updated = updateCCSAPMeta(issueBody, {
 *   last_synced: new Date().toISOString(),
 *   phase: 3
 * });
 */
export function updateCCSAPMeta(issueBody, updates) {
  if (!issueBody || typeof issueBody !== 'string') {
    throw new Error('CCASP-META update error: issueBody must be a non-empty string');
  }

  if (!updates || typeof updates !== 'object') {
    throw new Error('CCASP-META update error: updates must be an object');
  }

  // Find existing metadata
  const metaRegex = /<!-- CCASP-META\s+([\s\S]*?)\s+-->/;
  const match = issueBody.match(metaRegex);

  if (!match) {
    throw new Error('CCASP-META update error: no CCASP-META block found in issue body');
  }

  // Parse existing metadata
  const existing = parseCCSAPMeta(issueBody);
  if (!existing) {
    throw new Error('CCASP-META update error: failed to parse existing metadata');
  }

  // Merge updates
  const merged = { ...existing, ...updates };

  // Validate issue_type if it was updated
  if (updates.issueType && !VALID_ISSUE_TYPES.includes(updates.issueType)) {
    throw new Error(
      `CCASP-META update error: issueType must be one of: ${VALID_ISSUE_TYPES.join(', ')}`
    );
  }

  // Rebuild metadata block
  const lines = ['<!-- CCASP-META'];

  // Maintain consistent field order
  const fieldOrder = [
    'source',
    'slug',
    'phase',
    'task',
    'progress_file',
    'issue_type',
    'created_at',
    'last_synced',
  ];

  for (const field of fieldOrder) {
    if (merged[field] !== undefined && merged[field] !== null && merged[field] !== '') {
      lines.push(`${field}: ${merged[field]}`);
    }
  }

  lines.push('-->');

  const newMeta = lines.join('\n');

  // Replace old metadata with new
  return issueBody.replace(metaRegex, newMeta);
}

/**
 * Check if issue body contains CCASP-META
 *
 * @param {string} issueBody - Issue body text
 * @returns {boolean} True if CCASP-META is present
 */
export function hasCCSAPMeta(issueBody) {
  return parseCCSAPMeta(issueBody) !== null;
}

/**
 * Extract CCASP-META block as raw string
 *
 * @param {string} issueBody - Issue body text
 * @returns {string|null} Raw CCASP-META block or null if not found
 */
export function extractCCSAPMetaBlock(issueBody) {
  if (!issueBody || typeof issueBody !== 'string') {
    return null;
  }

  const metaRegex = /<!-- CCASP-META\s+([\s\S]*?)\s+-->/;
  const match = issueBody.match(metaRegex);

  return match ? match[0] : null;
}
