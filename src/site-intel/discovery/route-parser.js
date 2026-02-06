/**
 * Website Intelligence - Route Parser
 *
 * Uses ts-morph AST analysis to extract React Router v6 route configurations,
 * mapping routes → components → hooks → API calls.
 * Gracefully degrades if ts-morph is not installed.
 */

import path from 'path';
import fs from 'fs';

let tsMorphModule = null;

/**
 * Load ts-morph dynamically (optional dependency)
 */
async function loadTsMorph() {
  if (tsMorphModule) return tsMorphModule;
  try {
    tsMorphModule = await import('ts-morph');
    return tsMorphModule;
  } catch {
    return null;
  }
}

/**
 * Check if ts-morph is available
 */
export async function isTsMorphAvailable() {
  return !!(await loadTsMorph());
}

/**
 * Find tsconfig.json in project root
 */
function findTsConfig(projectRoot) {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    return tsconfigPath;
  }
  return null;
}

/**
 * Extract route path from various AST patterns
 */
function extractRoutePath(node) {
  // Look for 'path' property in object literal or JSX attribute
  if (node.getKind && typeof node.getKind === 'function') {
    const kind = node.getKind();
    const SyntaxKind = tsMorphModule.SyntaxKind;

    if (kind === SyntaxKind.ObjectLiteralExpression) {
      const pathProp = node.getProperty('path');
      if (pathProp && pathProp.getInitializer) {
        const initializer = pathProp.getInitializer();
        if (initializer && initializer.getLiteralText) {
          return initializer.getLiteralText();
        }
        if (initializer && initializer.getText) {
          const text = initializer.getText();
          // Remove quotes
          return text.replace(/^['"`]|['"`]$/g, '');
        }
      }
    }
  }
  return null;
}

/**
 * Extract component reference from route definition
 */
function extractComponent(node, SyntaxKind) {
  // Look for 'element' property (JSX) or 'Component' property (component ref)
  if (node.getKind && node.getKind() === SyntaxKind.ObjectLiteralExpression) {
    const elementProp = node.getProperty('element');
    const componentProp = node.getProperty('Component');

    if (elementProp && elementProp.getInitializer) {
      const initializer = elementProp.getInitializer();
      // Handle JSX: element: <ComponentName />
      if (initializer.getKind() === SyntaxKind.JsxElement ||
          initializer.getKind() === SyntaxKind.JsxSelfClosingElement) {
        const tagName = initializer.getTagNameNode?.() || initializer.getFirstChildByKind?.(SyntaxKind.Identifier);
        if (tagName) {
          return tagName.getText();
        }
      }
    }

    if (componentProp && componentProp.getInitializer) {
      const initializer = componentProp.getInitializer();
      return initializer.getText();
    }

    // Handle lazy imports: lazy(() => import('./Component'))
    const lazyElement = node.getProperty('element') || node.getProperty('Component');
    if (lazyElement) {
      const text = lazyElement.getText();
      if (text.includes('lazy(') || text.includes('React.lazy(')) {
        const importMatch = text.match(/import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
        if (importMatch) {
          return `lazy:${importMatch[1]}`;
        }
      }
    }
  }

  return null;
}

/**
 * Extract children routes from route definition
 */
function extractChildren(node, SyntaxKind) {
  if (node.getKind && node.getKind() === SyntaxKind.ObjectLiteralExpression) {
    const childrenProp = node.getProperty('children');
    if (childrenProp && childrenProp.getInitializer) {
      const initializer = childrenProp.getInitializer();
      if (initializer.getKind() === SyntaxKind.ArrayLiteralExpression) {
        return initializer.getElements();
      }
    }
  }
  return [];
}

/**
 * Parse component file to extract hooks and API calls
 */
function parseComponentFile(sourceFile, componentName) {
  const hooks = new Set();
  const apiCalls = new Set();

  if (!sourceFile) {
    return { hooks: [], apiCalls: [] };
  }

  try {
    const text = sourceFile.getFullText();

    // Extract hooks (useXxx pattern)
    const hookMatches = text.matchAll(/\b(use[A-Z][a-zA-Z0-9]*)\s*\(/g);
    for (const match of hookMatches) {
      hooks.add(match[1]);
    }

    // Extract API calls
    // Pattern 1: fetch('/api/...')
    const fetchMatches = text.matchAll(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g);
    for (const match of fetchMatches) {
      if (match[1].includes('/api/') || match[1].startsWith('/')) {
        apiCalls.add(match[1]);
      }
    }

    // Pattern 2: axios.get/post/put/delete('/api/...')
    const axiosMatches = text.matchAll(/axios\s*\.\s*(?:get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
    for (const match of axiosMatches) {
      apiCalls.add(match[1]);
    }

    // Pattern 3: Custom API client patterns
    const apiMatches = text.matchAll(/(?:api|client)\s*\.\s*\w+\s*\(\s*['"`]([^'"`]+)['"`]/g);
    for (const match of apiMatches) {
      apiCalls.add(match[1]);
    }
  } catch (error) {
    // Silently fail - component analysis is best-effort
  }

  return {
    hooks: Array.from(hooks),
    apiCalls: Array.from(apiCalls)
  };
}

/**
 * Resolve component file from import
 */
function resolveComponentFile(project, sourceFile, componentName) {
  if (!sourceFile) return null;

  try {
    // Check if it's a lazy import
    if (componentName.startsWith('lazy:')) {
      const importPath = componentName.slice(5);
      const resolved = resolveImportPath(sourceFile, importPath);
      return resolved ? project.getSourceFile(resolved) : null;
    }

    // Find the import declaration for this component
    const importDeclarations = sourceFile.getImportDeclarations();

    for (const importDecl of importDeclarations) {
      const namedImports = importDecl.getNamedImports();
      const defaultImport = importDecl.getDefaultImport();

      // Check named imports
      for (const namedImport of namedImports) {
        if (namedImport.getName() === componentName) {
          const moduleSpecifier = importDecl.getModuleSpecifierValue();
          const resolved = resolveImportPath(sourceFile, moduleSpecifier);
          return resolved ? project.getSourceFile(resolved) : null;
        }
      }

      // Check default import
      if (defaultImport && defaultImport.getText() === componentName) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        const resolved = resolveImportPath(sourceFile, moduleSpecifier);
        return resolved ? project.getSourceFile(resolved) : null;
      }
    }
  } catch (error) {
    // Silently fail
  }

  return null;
}

/**
 * Resolve import path to absolute file path
 */
function resolveImportPath(sourceFile, importPath) {
  try {
    const sourceDir = path.dirname(sourceFile.getFilePath());

    // Handle relative imports
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(sourceDir, importPath);

      // Try with various extensions
      const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
      for (const ext of extensions) {
        const fullPath = resolved + ext;
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }

      // Try without extension (might already have it)
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }
  } catch (error) {
    // Silently fail
  }

  return null;
}

/**
 * Parse a route object recursively
 */
function parseRouteObject(project, sourceFile, routeNode, SyntaxKind) {
  const route = {
    path: extractRoutePath(routeNode) || '/',
    component: null,
    componentFile: null,
    hooks: [],
    apiCalls: [],
    children: []
  };

  const componentName = extractComponent(routeNode, SyntaxKind);
  if (componentName) {
    route.component = componentName.replace(/^lazy:/, '');

    const componentSourceFile = resolveComponentFile(project, sourceFile, componentName);
    if (componentSourceFile) {
      route.componentFile = componentSourceFile.getFilePath();
      const analysis = parseComponentFile(componentSourceFile, componentName);
      route.hooks = analysis.hooks;
      route.apiCalls = analysis.apiCalls;
    }
  }

  // Parse children routes
  const children = extractChildren(routeNode, SyntaxKind);
  for (const child of children) {
    const childRoute = parseRouteObject(project, sourceFile, child, SyntaxKind);
    route.children.push(childRoute);
  }

  return route;
}

/**
 * Find route configuration files in project
 */
function findRouteConfigFiles(project, srcDir, extensions) {
  const routeFiles = [];
  const sourceFiles = project.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();

    // Skip node_modules
    if (filePath.includes('node_modules')) continue;

    // Check if file is in srcDir
    if (srcDir && !filePath.includes(path.sep + srcDir + path.sep)) continue;

    // Check extension
    const ext = path.extname(filePath);
    if (!extensions.includes(ext)) continue;

    const text = sourceFile.getFullText();

    // Look for router creation patterns
    if (text.includes('createBrowserRouter') ||
        text.includes('createHashRouter') ||
        text.includes('createMemoryRouter') ||
        text.includes('<Routes>') ||
        text.includes('<Route ')) {
      routeFiles.push(sourceFile);
    }
  }

  return routeFiles;
}

/**
 * Parse routes from createBrowserRouter/createHashRouter calls
 */
function parseRouterCreationCall(project, sourceFile) {
  const SyntaxKind = tsMorphModule.SyntaxKind;
  const routes = [];

  try {
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExpressions) {
      const expression = call.getExpression();
      const expressionText = expression.getText();

      if (expressionText === 'createBrowserRouter' ||
          expressionText === 'createHashRouter' ||
          expressionText === 'createMemoryRouter') {

        const args = call.getArguments();
        if (args.length > 0) {
          const routesArg = args[0];

          if (routesArg.getKind() === SyntaxKind.ArrayLiteralExpression) {
            const routeElements = routesArg.getElements();

            for (const routeElement of routeElements) {
              const route = parseRouteObject(project, sourceFile, routeElement, SyntaxKind);
              routes.push(route);
            }
          }
        }
      }
    }
  } catch (error) {
    // Silently fail - best effort parsing
  }

  return routes;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(routes) {
  const summary = {
    totalRoutes: 0,
    totalComponents: 0,
    totalHooks: 0,
    totalApiCalls: 0
  };

  const countRecursive = (routeList) => {
    for (const route of routeList) {
      summary.totalRoutes++;
      if (route.component) summary.totalComponents++;
      summary.totalHooks += route.hooks.length;
      summary.totalApiCalls += route.apiCalls.length;

      if (route.children.length > 0) {
        countRecursive(route.children);
      }
    }
  };

  countRecursive(routes);
  return summary;
}

/**
 * Parse React Router v6 routes from project
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {Object} options - Parser options
 * @param {string} options.framework - Router framework ('react-router-v6')
 * @param {string} options.srcDir - Source directory to scan (default: 'src')
 * @param {string[]} options.extensions - File extensions to scan
 * @returns {Promise<Object>} Route map with components, hooks, and API calls
 */
export async function parseRoutes(projectRoot, options = {}) {
  const {
    framework = 'react-router-v6',
    srcDir = 'src',
    extensions = ['.tsx', '.ts', '.jsx', '.js']
  } = options;

  // Check if ts-morph is available
  const tsMorph = await loadTsMorph();
  if (!tsMorph) {
    return {
      success: false,
      error: 'ts-morph not installed. Install with: npm install -D ts-morph',
      routes: []
    };
  }

  // Validate project root
  if (!fs.existsSync(projectRoot)) {
    return {
      success: false,
      error: `Project root does not exist: ${projectRoot}`,
      routes: []
    };
  }

  // Only React Router v6 is supported for now
  if (framework !== 'react-router-v6') {
    return {
      success: false,
      error: `Unsupported framework: ${framework}. Only 'react-router-v6' is currently supported.`,
      routes: []
    };
  }

  try {
    const { Project } = tsMorph;

    // Find tsconfig.json
    const tsconfigPath = findTsConfig(projectRoot);

    // Create ts-morph project
    const project = new Project({
      tsConfigFilePath: tsconfigPath || undefined,
      skipAddingFilesFromTsConfig: !tsconfigPath,
      compilerOptions: tsconfigPath ? undefined : {
        allowJs: true,
        jsx: tsMorph.ts.JsxEmit.React,
        target: tsMorph.ts.ScriptTarget.ESNext,
        module: tsMorph.ts.ModuleKind.ESNext
      }
    });

    // Add source files if no tsconfig
    if (!tsconfigPath) {
      const srcPath = path.join(projectRoot, srcDir);
      if (fs.existsSync(srcPath)) {
        project.addSourceFilesAtPaths(`${srcPath}/**/*{${extensions.join(',')}}`);
      } else {
        return {
          success: false,
          error: `Source directory does not exist: ${srcPath}`,
          routes: []
        };
      }
    }

    // Find route configuration files
    const routeFiles = findRouteConfigFiles(project, srcDir, extensions);

    if (routeFiles.length === 0) {
      return {
        success: true,
        framework,
        routes: [],
        summary: { totalRoutes: 0, totalComponents: 0, totalHooks: 0, totalApiCalls: 0 },
        message: 'No route configuration files found in project'
      };
    }

    // Parse routes from each file
    const allRoutes = [];
    for (const routeFile of routeFiles) {
      const routes = parseRouterCreationCall(project, routeFile);
      allRoutes.push(...routes);
    }

    // Calculate summary
    const summary = calculateSummary(allRoutes);

    return {
      success: true,
      framework,
      routes: allRoutes,
      summary
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to parse routes: ${error.message}`,
      routes: [],
      stack: error.stack
    };
  }
}
