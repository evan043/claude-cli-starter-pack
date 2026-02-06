/**
 * L2 Orchestrator - Code Explorer
 *
 * Scans codebase directories, discovers relevant files,
 * scores them by relevance, and extracts code snippets.
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { extractSnippets } from '../code-snippet-extractor.js';

/**
 * Run code explorer L2 agent
 */
export async function runCodeExplorer(cwd, keywords, architecture) {
  const results = {
    files: [],
    directories: [],
    snippets: [],
    imports: new Map(),
    exports: new Map(),
  };

  const keyDirs = determineKeyDirectories(cwd, architecture);

  for (const dir of keyDirs) {
    const fullDir = join(cwd, dir);
    if (!existsSync(fullDir)) continue;

    const files = scanDirectory(fullDir, cwd);
    results.files.push(...files);
  }

  results.files = scoreFileRelevance(results.files, keywords, architecture);

  const topFiles = results.files
    .filter(f => f.relevanceScore > 0.3)
    .slice(0, 20);

  for (const file of topFiles) {
    const snippets = await extractSnippets(file.fullPath, {
      keywords,
      maxSnippets: 3,
      extractStructures: true,
    });
    results.snippets.push(...snippets);
  }

  return results;
}

/**
 * Determine key directories to explore based on architecture
 */
function determineKeyDirectories(cwd, architecture) {
  const dirs = new Set(['src', 'lib', 'app', 'components', 'pages']);

  if (architecture?.backend) {
    dirs.add('backend');
    dirs.add('server');
    dirs.add('api');
    dirs.add('routes');
    dirs.add('controllers');
    dirs.add('services');
    dirs.add('models');
  }

  if (architecture?.frontend) {
    dirs.add('components');
    dirs.add('pages');
    dirs.add('views');
    dirs.add('hooks');
    dirs.add('store');
    dirs.add('stores');
  }

  dirs.add('tests');
  dirs.add('test');
  dirs.add('__tests__');
  dirs.add('e2e');

  return Array.from(dirs).filter(d => existsSync(join(cwd, d)));
}

/**
 * Scan a directory recursively for relevant files
 */
function scanDirectory(dir, cwd, depth = 0, maxDepth = 5) {
  const files = [];

  if (depth > maxDepth) return files;

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', 'venv', '.next', '.cache'].includes(entry)) {
        continue;
      }

      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        files.push(...scanDirectory(fullPath, cwd, depth + 1, maxDepth));
      } else if (stats.isFile()) {
        const ext = extname(entry).toLowerCase();
        const relevantExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.vue', '.svelte', '.go', '.rs', '.java'];

        if (relevantExtensions.includes(ext)) {
          files.push({
            fullPath,
            relativePath: relative(cwd, fullPath),
            name: entry,
            ext,
            size: stats.size,
          });
        }
      }
    }
  } catch {
    // Ignore permission errors
  }

  return files;
}

/**
 * Score files by relevance to keywords and architecture
 */
function scoreFileRelevance(files, keywords, architecture) {
  return files.map(file => {
    let score = 0;
    const path = file.relativePath.toLowerCase();
    const name = file.name.toLowerCase();

    for (const keyword of keywords) {
      if (path.includes(keyword)) score += 0.2;
      if (name.includes(keyword)) score += 0.3;
    }

    if (architecture?.backend) {
      if (path.includes('api') || path.includes('route') || path.includes('controller') || path.includes('service')) {
        score += 0.2;
      }
    }
    if (architecture?.frontend) {
      if (path.includes('component') || path.includes('page') || path.includes('hook')) {
        score += 0.2;
      }
    }

    if (path.includes('test') || path.includes('spec')) {
      file.relevance = 'test';
      score += 0.1;
    } else if (path.includes('util') || path.includes('helper') || path.includes('lib')) {
      file.relevance = 'reference';
      score += 0.1;
    } else {
      file.relevance = score > 0.3 ? 'primary' : 'reference';
    }

    return {
      ...file,
      relevanceScore: Math.min(1, score),
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}
