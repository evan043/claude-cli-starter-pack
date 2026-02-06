/**
 * Testing tool recommendation engine
 * Part of TestingScout agent
 */

import { TESTING_TOOLS, FRAMEWORK_RECOMMENDATIONS, CONFIG_TEMPLATES } from './data.js';

/**
 * Classify tech stack for testing
 * @param {object} techStack - Tech stack config
 * @returns {object} Classification result
 */
export function classifyTechStack(techStack) {
  const result = {
    primaryLanguage: null,
    runtime: null,
    framework: null,
    appType: null,
    recommendations: [],
  };

  // Detect primary language
  if (techStack.primaryLanguage) {
    result.primaryLanguage = techStack.primaryLanguage.toLowerCase();
  } else if (techStack.frontend?.framework) {
    result.primaryLanguage = 'javascript';
  } else if (techStack.backend?.framework) {
    const framework = techStack.backend.framework.toLowerCase();
    if (['fastapi', 'django', 'flask'].includes(framework)) {
      result.primaryLanguage = 'python';
    } else if (['express', 'nestjs', 'fastify'].includes(framework)) {
      result.primaryLanguage = 'javascript';
    } else if (['gin', 'echo', 'fiber'].includes(framework)) {
      result.primaryLanguage = 'go';
    }
  }

  // Detect runtime
  if (techStack.runtime) {
    result.runtime = techStack.runtime;
  } else if (result.primaryLanguage === 'javascript') {
    result.runtime = 'node';
  } else if (result.primaryLanguage === 'python') {
    result.runtime = 'python';
  }

  // Detect framework
  result.framework = techStack.frontend?.framework?.toLowerCase() ||
                     techStack.backend?.framework?.toLowerCase();

  // Detect app type
  if (techStack.frontend?.framework) {
    result.appType = 'web';
  } else if (techStack.cli) {
    result.appType = 'cli';
  } else if (techStack.backend?.framework) {
    result.appType = 'api';
  }

  return result;
}

/**
 * Get testing recommendations for a tech stack
 * @param {object} techStack - Tech stack config
 * @returns {object} Recommendations
 */
export function getRecommendations(techStack) {
  const classification = classifyTechStack(techStack);
  const recommendations = {
    primary: null,
    unit: [],
    component: [],
    e2e: [],
    integration: [],
  };

  // Check for framework-specific recommendations first
  if (classification.framework && FRAMEWORK_RECOMMENDATIONS[classification.framework]) {
    recommendations.primary = FRAMEWORK_RECOMMENDATIONS[classification.framework];
  }

  // Get language-specific tools
  const languageTools = TESTING_TOOLS[classification.primaryLanguage];
  if (languageTools) {
    if (languageTools.unit) {
      recommendations.unit = languageTools.unit;
    }
    if (languageTools.e2e) {
      recommendations.e2e = languageTools.e2e;
    }
    if (languageTools.component) {
      recommendations.component = languageTools.component;
    }
  }

  return recommendations;
}

/**
 * Generate recommendation table
 * @param {object} recommendations - Recommendations
 * @returns {object} Table data
 */
export function generateRecommendationTable(recommendations) {
  const rows = [];

  // Add primary recommendation
  if (recommendations.primary) {
    rows.push({
      tool: '⭐ Primary Stack',
      ecosystem: '-',
      useCase: recommendations.primary.reason,
      maintenance: '-',
      adoption: '-',
    });
  }

  // Add unit test recommendations
  for (const tool of recommendations.unit.slice(0, 2)) {
    rows.push({
      tool: tool.name,
      ecosystem: tool.npm || tool.pip || 'built-in',
      useCase: 'Unit Testing',
      maintenance: tool.maintenance,
      adoption: tool.adoption,
    });
  }

  // Add E2E recommendations
  for (const tool of recommendations.e2e.slice(0, 2)) {
    rows.push({
      tool: tool.name,
      ecosystem: tool.npm || tool.pip || 'built-in',
      useCase: 'E2E Testing',
      maintenance: tool.maintenance,
      adoption: tool.adoption,
    });
  }

  // Add component recommendations
  for (const tool of recommendations.component.slice(0, 1)) {
    rows.push({
      tool: tool.name,
      ecosystem: tool.npm || tool.pip || 'built-in',
      useCase: 'Component Testing',
      maintenance: tool.maintenance,
      adoption: tool.adoption,
    });
  }

  return {
    headers: ['Tool', 'Ecosystem', 'Use Case', 'Maintenance', 'Adoption'],
    rows,
  };
}

/**
 * Generate config file for a testing tool
 * @param {string} configFile - Config file name
 * @returns {string|null} Config content
 */
export function generateConfigFile(configFile) {
  return CONFIG_TEMPLATES[configFile] || null;
}

/**
 * Create TestingScout agent prompt
 * @param {object} techStack - Tech stack config
 * @param {object} classification - Classification result
 * @returns {string} Agent prompt
 */
export function createScoutPrompt(techStack, classification) {
  return `# TestingScout - Testing Tool Discovery Agent

## Tech Stack Analysis
${JSON.stringify(classification, null, 2)}

## Instructions

1. **Verify Tech Stack**
   Confirm the tech stack classification is accurate.

2. **Search for Tools**
   For each testing category (unit, e2e, component):
   - Search for "\${classification.primaryLanguage} \${category} testing framework 2024"
   - Evaluate maintenance (recent commits, releases)
   - Check adoption (npm downloads, GitHub stars)

3. **Evaluate Each Tool**
   - Wide adoption (downloads, stars)
   - Recent maintenance (< 3 months)
   - Strong documentation
   - Framework compatibility
   - Low friction to integrate

4. **Output Format**
   Return a markdown table:
   | Tool | Ecosystem | Use Case | Why Recommended | Maintenance | Adoption |

5. **Final Recommendation**
   Recommend a primary testing stack with:
   - Unit testing tool
   - E2E testing tool
   - Component testing tool (if applicable)
   - Installation commands
   - Config file suggestions

## Response Limits
Maximum 2000 tokens for this search task.
`;
}
