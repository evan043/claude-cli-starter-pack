/**
 * Tech Stack Persistence
 *
 * Read and write tech-stack.json to/from .claude/config/
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load tech-stack.json
 */
export function loadTechStack() {
  const techStackPath = join(process.cwd(), '.claude', 'config', 'tech-stack.json');
  if (!existsSync(techStackPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(techStackPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save tech-stack.json
 */
export function saveTechStack(techStack) {
  const configDir = join(process.cwd(), '.claude', 'config');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  const techStackPath = join(configDir, 'tech-stack.json');
  writeFileSync(techStackPath, JSON.stringify(techStack, null, 2), 'utf8');
  return techStackPath;
}
