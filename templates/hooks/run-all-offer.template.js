/**
 * Execution Options Hook
 *
 * After artifact creation (phase plan, roadmap, epic), suggests
 * the appropriate execution command to the user.
 *
 * Event: PostToolUse
 * Triggers: When Write tool creates PROGRESS.json, ROADMAP.json, or EPIC.json
 */

const fs = require('fs');
const path = require('path');

const ARTIFACT_PATTERNS = [
  {
    pattern: /\.claude\/phase-plans\/([^/]+)\/PROGRESS\.json$/,
    type: 'Phase Plan',
    seqCmd: slug => `/phase-track ${slug} --run-all`,
    parallelNote: 'Run tasks 2 at a time (background agents), auto-compact at 40% remaining context',
    statusCmd: slug => `/phase-track ${slug}`,
  },
  {
    pattern: /\.claude\/roadmaps\/([^/]+)\/ROADMAP\.json$/,
    type: 'Roadmap',
    seqCmd: slug => `/roadmap-track ${slug} run-all`,
    parallelNote: 'Run up to 2 plans in parallel (background agents), auto-compact at 40% remaining context',
    statusCmd: slug => `/roadmap-status ${slug}`,
  },
  {
    pattern: /\.claude\/epics\/([^/]+)\/EPIC\.json$/,
    type: 'Epic',
    seqCmd: slug => `/github-epic-status ${slug}`,
    parallelNote: 'Run up to 2 roadmaps in parallel (background agents), auto-compact at 40% remaining context',
    statusCmd: slug => `/github-epic-status ${slug}`,
  },
];

const STATE_FILE = '.claude/config/run-all-offered.json';

function loadOffered(projectRoot) {
  const p = path.join(projectRoot, STATE_FILE);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { offered: [] };
  }
}

function saveOffered(projectRoot, state) {
  const p = path.join(projectRoot, STATE_FILE);
  const dir = path.dirname(p);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(state, null, 2), 'utf8');
  } catch { /* non-critical */ }
}

function getTitle(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data.title || data.projectName || data.project_name || data.name || 'Untitled';
  } catch {
    return 'Untitled';
  }
}

async function runAllOfferHook(context) {
  const { toolName, toolInput, projectRoot, hookType } = context;

  if (hookType !== 'PostToolUse' || toolName !== 'Write') {
    return { continue: true };
  }

  const filePath = toolInput?.file_path || toolInput?.path;
  if (!filePath) return { continue: true };

  const normalized = filePath.replace(/\\/g, '/');

  for (const { pattern, type, seqCmd, parallelNote, statusCmd } of ARTIFACT_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const slug = match[1];

    // De-duplicate
    const state = loadOffered(projectRoot);
    if (state.offered.includes(slug)) return { continue: true };
    state.offered.push(slug);
    saveOffered(projectRoot, state);

    const abs = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
    const title = getTitle(abs);

    const message = [
      '',
      `${type} created: ${title}`,
      '',
      'How would you like to proceed?',
      '',
      `  1. ${seqCmd(slug)}`,
      '     Sequential - one task at a time (safe, predictable)',
      '',
      `  2. ${seqCmd(slug)} --parallel`,
      `     ${parallelNote}`,
      '',
      `  3. ${statusCmd(slug)}`,
      '     View status first before deciding',
      '',
      '  4. I\'ll run tasks manually',
      '',
    ].join('\n');

    return { continue: true, message };
  }

  return { continue: true };
}

module.exports = runAllOfferHook;
module.exports.ARTIFACT_PATTERNS = ARTIFACT_PATTERNS;
