/**
 * High-Level Project Analysis
 *
 * Functions for analyzing project structure and generating issue context
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { searchFiles, searchContent } from './search.js';
import { findDefinitions, extractSnippet } from './definitions.js';

/**
 * Analyze codebase for issue context
 */
export async function analyzeForIssue(keywords, options = {}) {
  const { cwd = process.cwd(), maxFiles = 5, maxFunctions = 10 } = options;

  const analysis = {
    relevantFiles: [],
    keyFunctions: [],
    patterns: [],
    codeSnippets: [],
  };

  // 1. Search for relevant files
  const files = await searchFiles(keywords, { cwd, maxResults: maxFiles * 2 });

  // 2. For each file, find relevant definitions
  for (const file of files.slice(0, maxFiles)) {
    const definitions = findDefinitions(file, { cwd });

    analysis.relevantFiles.push({
      file,
      definitions: definitions.slice(0, 5),
    });

    // Add key functions
    for (const def of definitions) {
      if (
        def.type === 'function' ||
        def.type === 'class' ||
        def.type === 'component'
      ) {
        // Check if function name matches any keyword
        const defLower = def.name.toLowerCase();
        const isRelevant = keywords.some(
          (k) => defLower.includes(k.toLowerCase()) || k.toLowerCase().includes(defLower)
        );

        if (isRelevant) {
          analysis.keyFunctions.push({
            file,
            ...def,
          });
        }
      }
    }
  }

  // 3. Search content for specific patterns
  for (const keyword of keywords) {
    const contentMatches = searchContent(keyword, {
      cwd,
      maxResults: 5,
      contextLines: 1,
    });

    for (const match of contentMatches) {
      analysis.patterns.push({
        keyword,
        file: match.file,
        matches: match.matches.slice(0, 3),
      });
    }
  }

  // 4. Extract code snippets for key functions
  for (const func of analysis.keyFunctions.slice(0, 3)) {
    const snippet = extractSnippet(func.file, func.line, func.line + 15, { cwd });
    if (snippet) {
      analysis.codeSnippets.push(snippet);
    }
  }

  return analysis;
}

/**
 * Detect project type and tech stack
 */
export function detectProjectType(cwd = process.cwd()) {
  const stack = {
    languages: [],
    frameworks: [],
    tools: [],
  };

  // Check package.json for JS/TS projects
  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      stack.languages.push('javascript');

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.typescript) stack.languages.push('typescript');
      if (deps.react) stack.frameworks.push('react');
      if (deps.vue) stack.frameworks.push('vue');
      if (deps.angular) stack.frameworks.push('angular');
      if (deps.next) stack.frameworks.push('nextjs');
      if (deps.express) stack.frameworks.push('express');
      if (deps.fastify) stack.frameworks.push('fastify');
      if (deps.jest || deps.vitest) stack.tools.push('testing');
      if (deps.playwright) stack.tools.push('e2e-testing');
    } catch { /* ignore parse errors */ }
  }

  // Check for Python
  if (existsSync(join(cwd, 'requirements.txt')) || existsSync(join(cwd, 'pyproject.toml'))) {
    stack.languages.push('python');
  }

  // Check for Rust
  if (existsSync(join(cwd, 'Cargo.toml'))) {
    stack.languages.push('rust');
  }

  // Check for Go
  if (existsSync(join(cwd, 'go.mod'))) {
    stack.languages.push('go');
  }

  return stack;
}
