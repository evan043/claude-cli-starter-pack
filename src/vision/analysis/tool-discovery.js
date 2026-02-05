/**
 * Open Source Tool Discovery
 *
 * Discovers and ranks npm/pip packages based on feature requirements.
 * Provides package recommendations with installation commands.
 *
 * @module vision/analysis/tool-discovery
 */

/**
 * Discover relevant npm packages for features
 *
 * @param {Array<string>} features - Features to implement
 * @returns {Promise<Array<Object>>} Ranked npm packages
 *
 * @example
 * const packages = await discoverNpmPackages(['authentication', 'form validation']);
 * // [
 * //   { name: 'next-auth', score: 0.95, category: 'authentication', ... },
 * //   { name: 'react-hook-form', score: 0.92, category: 'forms', ... }
 * // ]
 */
export async function discoverNpmPackages(features) {
  if (!features || features.length === 0) {
    return [];
  }

  // Known high-quality packages by category
  const packageIndex = {
    authentication: [
      { name: 'next-auth', description: 'Authentication for Next.js', stars: 20000 },
      { name: 'passport', description: 'Simple authentication middleware', stars: 22000 },
      { name: '@auth/core', description: 'Framework agnostic auth', stars: 8000 },
      { name: 'lucia', description: 'Simple auth library', stars: 5000 }
    ],
    'form validation': [
      { name: 'react-hook-form', description: 'Performant forms with validation', stars: 38000 },
      { name: 'formik', description: 'Build forms in React', stars: 33000 },
      { name: 'zod', description: 'TypeScript-first schema validation', stars: 28000 },
      { name: 'yup', description: 'Schema validation', stars: 22000 }
    ],
    'state management': [
      { name: 'zustand', description: 'Small, fast state management', stars: 40000 },
      { name: 'jotai', description: 'Primitive and flexible state', stars: 16000 },
      { name: '@tanstack/react-query', description: 'Powerful data sync', stars: 38000 },
      { name: 'redux-toolkit', description: 'Official Redux toolset', stars: 10000 }
    ],
    'file upload': [
      { name: 'react-dropzone', description: 'Drag and drop file uploads', stars: 10000 },
      { name: 'uppy', description: 'Modular file uploader', stars: 28000 },
      { name: 'multer', description: 'Node.js multipart/form-data', stars: 11000 },
      { name: 'filepond', description: 'File upload library', stars: 15000 }
    ],
    'data visualization': [
      { name: 'recharts', description: 'Composable charting library', stars: 22000 },
      { name: 'chart.js', description: 'Simple HTML5 charts', stars: 63000 },
      { name: 'victory', description: 'React chart components', stars: 11000 },
      { name: 'd3', description: 'Data visualization primitives', stars: 107000 }
    ],
    notifications: [
      { name: 'react-hot-toast', description: 'Lightweight notifications', stars: 9000 },
      { name: 'sonner', description: 'Opinionated toast component', stars: 6000 },
      { name: 'notistack', description: 'Snackbar notifications', stars: 4000 }
    ],
    routing: [
      { name: 'react-router', description: 'Declarative routing', stars: 52000 },
      { name: 'tanstack-router', description: 'Type-safe routing', stars: 6000 },
      { name: 'wouter', description: 'Minimalist router', stars: 6000 }
    ],
    'date/time': [
      { name: 'date-fns', description: 'Modern date utility', stars: 33000 },
      { name: 'dayjs', description: 'Fast 2kB date library', stars: 46000 },
      { name: 'luxon', description: 'DateTime library', stars: 15000 }
    ],
    'UI components': [
      { name: 'shadcn/ui', description: 'Beautifully designed components', stars: 50000 },
      { name: '@radix-ui/react', description: 'Unstyled accessible components', stars: 13000 },
      { name: '@headlessui/react', description: 'Unstyled UI components', stars: 24000 },
      { name: 'react-aria', description: 'Adobe accessible components', stars: 11000 }
    ],
    styling: [
      { name: 'tailwindcss', description: 'Utility-first CSS', stars: 78000 },
      { name: 'styled-components', description: 'CSS-in-JS', stars: 40000 },
      { name: 'emotion', description: 'CSS-in-JS library', stars: 17000 }
    ],
    testing: [
      { name: 'vitest', description: 'Vite-native testing', stars: 12000 },
      { name: 'playwright', description: 'E2E testing', stars: 60000 },
      { name: '@testing-library/react', description: 'React testing utilities', stars: 18000 }
    ],
    'API client': [
      { name: 'axios', description: 'Promise based HTTP client', stars: 104000 },
      { name: 'ky', description: 'Tiny HTTP client', stars: 11000 },
      { name: '@tanstack/query', description: 'Data fetching hooks', stars: 38000 }
    ]
  };

  const matches = [];

  // Match features to packages
  features.forEach(feature => {
    const featureLower = feature.toLowerCase();

    // Direct category match
    Object.keys(packageIndex).forEach(category => {
      if (featureLower.includes(category) || category.includes(featureLower)) {
        packageIndex[category].forEach(pkg => {
          matches.push({
            ...pkg,
            category,
            matchedFeature: feature,
            type: 'npm'
          });
        });
      }
    });
  });

  // Remove duplicates
  const uniqueMatches = Array.from(
    new Map(matches.map(m => [m.name, m])).values()
  );

  return uniqueMatches;
}

/**
 * Discover relevant Python packages (pip)
 *
 * @param {Array<string>} features - Features to implement
 * @returns {Promise<Array<Object>>} Ranked pip packages
 *
 * @example
 * const packages = await discoverPipPackages(['authentication', 'database']);
 * // [
 * //   { name: 'fastapi-users', score: 0.93, category: 'authentication', ... },
 * //   { name: 'sqlalchemy', score: 0.98, category: 'database', ... }
 * // ]
 */
export async function discoverPipPackages(features) {
  if (!features || features.length === 0) {
    return [];
  }

  // Known high-quality Python packages by category
  const packageIndex = {
    authentication: [
      { name: 'fastapi-users', description: 'Ready-to-use user auth for FastAPI', stars: 4000 },
      { name: 'authlib', description: 'Ultimate Python auth library', stars: 4000 },
      { name: 'python-jose', description: 'JOSE implementation', stars: 1500 },
      { name: 'pyjwt', description: 'JSON Web Tokens', stars: 5000 }
    ],
    database: [
      { name: 'sqlalchemy', description: 'SQL toolkit and ORM', stars: 8000 },
      { name: 'alembic', description: 'Database migrations', stars: 2000 },
      { name: 'psycopg2', description: 'PostgreSQL adapter', stars: 3000 },
      { name: 'pymongo', description: 'MongoDB driver', stars: 4000 }
    ],
    'API framework': [
      { name: 'fastapi', description: 'Modern web framework', stars: 70000 },
      { name: 'flask', description: 'Lightweight web framework', stars: 66000 },
      { name: 'django', description: 'High-level web framework', stars: 76000 },
      { name: 'starlette', description: 'ASGI framework', stars: 9000 }
    ],
    validation: [
      { name: 'pydantic', description: 'Data validation', stars: 18000 },
      { name: 'marshmallow', description: 'Object serialization', stars: 7000 },
      { name: 'cerberus', description: 'Schema validation', stars: 3000 }
    ],
    'file upload': [
      { name: 'python-multipart', description: 'Multipart form parser', stars: 300 },
      { name: 'aiofiles', description: 'Async file operations', stars: 2500 }
    ],
    email: [
      { name: 'fastapi-mail', description: 'Email sending for FastAPI', stars: 600 },
      { name: 'sendgrid', description: 'SendGrid API client', stars: 1500 },
      { name: 'python-email-validator', description: 'Email validation', stars: 1000 }
    ],
    'task queue': [
      { name: 'celery', description: 'Distributed task queue', stars: 23000 },
      { name: 'rq', description: 'Simple job queues', stars: 9500 },
      { name: 'arq', description: 'Async job queue', stars: 2000 }
    ],
    testing: [
      { name: 'pytest', description: 'Testing framework', stars: 11000 },
      { name: 'httpx', description: 'HTTP client for testing', stars: 12000 },
      { name: 'factory-boy', description: 'Test fixtures', stars: 3500 }
    ],
    'data processing': [
      { name: 'pandas', description: 'Data analysis', stars: 41000 },
      { name: 'numpy', description: 'Numerical computing', stars: 26000 },
      { name: 'polars', description: 'Fast DataFrame library', stars: 25000 }
    ],
    caching: [
      { name: 'redis', description: 'Redis client', stars: 12000 },
      { name: 'aiocache', description: 'Async caching', stars: 1000 }
    ],
    monitoring: [
      { name: 'sentry-sdk', description: 'Error tracking', stars: 1700 },
      { name: 'prometheus-client', description: 'Metrics client', stars: 1000 }
    ]
  };

  const matches = [];

  // Match features to packages
  features.forEach(feature => {
    const featureLower = feature.toLowerCase();

    Object.keys(packageIndex).forEach(category => {
      if (featureLower.includes(category) || category.includes(featureLower)) {
        packageIndex[category].forEach(pkg => {
          matches.push({
            ...pkg,
            category,
            matchedFeature: feature,
            type: 'pip'
          });
        });
      }
    });
  });

  // Remove duplicates
  const uniqueMatches = Array.from(
    new Map(matches.map(m => [m.name, m])).values()
  );

  return uniqueMatches;
}

/**
 * Rank packages by relevance to features
 *
 * @param {Array<Object>} packages - Packages to rank
 * @param {Array<string>} features - Target features
 * @returns {Array<Object>} Sorted packages with scores
 *
 * @example
 * const ranked = rankByRelevance(packages, ['auth', 'database']);
 * // [
 * //   { name: 'fastapi-users', score: 0.95, ... },
 * //   { name: 'sqlalchemy', score: 0.92, ... }
 * // ]
 */
export function rankByRelevance(packages, features) {
  if (!packages || packages.length === 0) {
    return [];
  }

  const scoredPackages = packages.map(pkg => {
    let score = 0;

    // Base score from GitHub stars (normalized)
    if (pkg.stars) {
      score += Math.min(pkg.stars / 100000, 0.3); // Max 0.3 from stars
    }

    // Feature match score
    const featureLower = features.map(f => f.toLowerCase());
    const pkgName = pkg.name.toLowerCase();
    const pkgDesc = (pkg.description || '').toLowerCase();
    const pkgCategory = (pkg.category || '').toLowerCase();

    featureLower.forEach(feature => {
      // Direct name match
      if (pkgName.includes(feature) || feature.includes(pkgName)) {
        score += 0.3;
      }

      // Description match
      if (pkgDesc.includes(feature)) {
        score += 0.2;
      }

      // Category match
      if (pkgCategory.includes(feature) || feature.includes(pkgCategory)) {
        score += 0.2;
      }
    });

    // Recency bonus (if lastUpdated available)
    if (pkg.lastUpdated) {
      const daysSinceUpdate = getDaysSince(pkg.lastUpdated);
      if (daysSinceUpdate < 180) { // Updated in last 6 months
        score += 0.1;
      }
    }

    // Cap score at 1.0
    score = Math.min(score, 1.0);

    return {
      ...pkg,
      score: parseFloat(score.toFixed(2))
    };
  });

  // Sort by score (highest first)
  return scoredPackages.sort((a, b) => b.score - a.score);
}

/**
 * Helper: Get days since date
 * @private
 */
function getDaysSince(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  } catch {
    return Infinity;
  }
}

/**
 * Format package for display with install command
 *
 * @param {Object} pkg - Package object
 * @returns {Object} Formatted package with install command
 */
export function formatPackageWithInstall(pkg) {
  const installCommands = {
    npm: `npm install ${pkg.name}`,
    pip: `pip install ${pkg.name}`,
    composer: `composer require ${pkg.name}`,
    gem: `gem install ${pkg.name}`,
    go: `go get ${pkg.name}`
  };

  return {
    ...pkg,
    installCommand: installCommands[pkg.type] || `# ${pkg.type}: ${pkg.name}`
  };
}
