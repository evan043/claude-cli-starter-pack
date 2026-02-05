/**
 * Web Search Integration
 *
 * Provides web search capabilities for discovering similar apps,
 * UI patterns, and open source tools. Uses WebSearch tool patterns.
 *
 * @module vision/analysis/web-search
 */

/**
 * Search for similar applications based on features
 *
 * @param {Array<string>} features - List of app features to match
 * @returns {Promise<Array<Object>>} Similar apps with descriptions and URLs
 *
 * @example
 * const apps = await searchSimilarApps(['task management', 'calendar', 'notifications']);
 * // [
 * //   { name: 'Todoist', url: '...', description: '...', relevance: 0.9 },
 * //   { name: 'Asana', url: '...', description: '...', relevance: 0.85 }
 * // ]
 */
export async function searchSimilarApps(features) {
  if (!features || features.length === 0) {
    return [];
  }

  const searchQueries = [
    // Primary: Direct feature search
    `${features.slice(0, 3).join(' ')} web application examples`,

    // Secondary: Add "app" or "software" context
    `best ${features[0]} ${features[1] || ''} apps`,

    // Tertiary: Open source alternatives
    `open source ${features[0]} software`
  ];

  const results = [];

  // In actual implementation, this would use WebSearch tool
  // For now, return structure that agents can populate
  const searchPlan = {
    type: 'web-search',
    intent: 'find-similar-apps',
    queries: searchQueries,
    features: features,
    expectedResults: [
      {
        name: 'string',
        url: 'string',
        description: 'string',
        relevance: 'number (0-1)',
        matchedFeatures: ['array', 'of', 'features']
      }
    ],
    instructions: [
      'Search for production apps that implement similar features',
      'Focus on well-known, established applications',
      'Include both SaaS and open source examples',
      'Extract key features and architecture patterns',
      'Score relevance based on feature overlap'
    ]
  };

  return {
    searchPlan,
    results,
    _requiresAgent: true,
    _agentSkill: 'web-research'
  };
}

/**
 * Search for UI design patterns and inspiration
 *
 * @param {Array<string>} features - Features that need UI design
 * @returns {Promise<Array<Object>>} UI pattern examples with screenshots and descriptions
 *
 * @example
 * const patterns = await searchUIPatterns(['dashboard', 'data visualization']);
 * // [
 * //   { pattern: 'Analytics Dashboard', source: 'dribbble', url: '...', tags: [...] },
 * //   { pattern: 'Chart Components', source: 'mobbin', url: '...', tags: [...] }
 * // ]
 */
export async function searchUIPatterns(features) {
  if (!features || features.length === 0) {
    return [];
  }

  // Target design inspiration sources
  const sources = [
    'dribbble.com',
    'mobbin.com',
    'behance.net',
    'awwwards.com',
    'uigarage.net'
  ];

  const searchQueries = features.map(feature => {
    return [
      `${feature} UI design pattern`,
      `${feature} interface design examples site:${sources[0]}`,
      `best ${feature} UX patterns`
    ];
  }).flat();

  const searchPlan = {
    type: 'web-search',
    intent: 'find-ui-patterns',
    queries: searchQueries,
    features: features,
    targetSources: sources,
    expectedResults: [
      {
        pattern: 'string (pattern name)',
        feature: 'string (which feature)',
        source: 'string (website)',
        url: 'string',
        description: 'string',
        tags: ['array', 'of', 'design', 'tags'],
        imageAvailable: 'boolean'
      }
    ],
    instructions: [
      'Focus on modern, production-ready UI patterns',
      'Look for responsive design examples',
      'Include accessibility considerations',
      'Note component libraries that implement patterns',
      'Extract color schemes and layout structures'
    ]
  };

  return {
    searchPlan,
    results: [],
    _requiresAgent: true,
    _agentSkill: 'web-research'
  };
}

/**
 * Search for open source tools and libraries
 *
 * @param {Array<string>} features - Features to implement
 * @param {Object} techStack - Detected tech stack from vision
 * @returns {Promise<Array<Object>>} Relevant packages and libraries
 *
 * @example
 * const tools = await searchOpenSourceTools(
 *   ['authentication', 'file upload'],
 *   { frontend: 'react', backend: 'fastapi' }
 * );
 * // [
 * //   { name: 'react-dropzone', type: 'npm', stars: 9500, downloads: '...' },
 * //   { name: 'python-jose', type: 'pip', stars: 1200, downloads: '...' }
 * // ]
 */
export async function searchOpenSourceTools(features, techStack = {}) {
  if (!features || features.length === 0) {
    return [];
  }

  const { frontend, backend, database } = techStack;

  // Build context-aware search queries
  const searchQueries = [];

  // Frontend libraries
  if (frontend) {
    features.forEach(feature => {
      searchQueries.push(`${frontend} ${feature} library npm`);
      searchQueries.push(`best ${frontend} ${feature} package`);
    });
  }

  // Backend libraries
  if (backend) {
    features.forEach(feature => {
      searchQueries.push(`${backend} ${feature} library`);
      if (backend.includes('python')) {
        searchQueries.push(`${feature} python package pypi`);
      } else if (backend.includes('node') || backend.includes('express')) {
        searchQueries.push(`${feature} nodejs package npm`);
      }
    });
  }

  // Database-specific tools
  if (database) {
    searchQueries.push(`${database} migration tools`);
    searchQueries.push(`${database} ORM libraries`);
  }

  // Generic feature searches
  features.forEach(feature => {
    searchQueries.push(`${feature} open source library github`);
  });

  const searchPlan = {
    type: 'web-search',
    intent: 'find-open-source-tools',
    queries: searchQueries,
    features: features,
    techStack: techStack,
    targetSources: [
      'npmjs.com',
      'pypi.org',
      'github.com',
      'awesome lists'
    ],
    expectedResults: [
      {
        name: 'string',
        type: 'npm|pip|composer|gem|go',
        description: 'string',
        repository: 'string (github url)',
        stars: 'number',
        downloads: 'string',
        license: 'string',
        lastUpdated: 'string',
        relevantFeatures: ['array'],
        installCommand: 'string'
      }
    ],
    instructions: [
      'Prioritize actively maintained packages (updated within 6 months)',
      'Check GitHub stars and npm/pip download counts',
      'Verify license compatibility (prefer MIT, Apache 2.0, BSD)',
      'Look for TypeScript support if frontend is TypeScript',
      'Check for documentation quality and examples',
      'Prefer packages with good test coverage',
      'Note any peer dependencies or requirements'
    ]
  };

  return {
    searchPlan,
    results: [],
    _requiresAgent: true,
    _agentSkill: 'web-research'
  };
}

/**
 * Helper: Extract domain from URL
 * @private
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Helper: Calculate feature overlap score
 * @private
 */
function calculateRelevance(targetFeatures, foundFeatures) {
  if (!targetFeatures || !foundFeatures) return 0;

  const target = targetFeatures.map(f => f.toLowerCase());
  const found = foundFeatures.map(f => f.toLowerCase());

  const matches = target.filter(f =>
    found.some(ff => ff.includes(f) || f.includes(ff))
  );

  return matches.length / target.length;
}
