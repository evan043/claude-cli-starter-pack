/**
 * PRD Template Generator
 *
 * Generates structured Product Requirements Documents from parsed Vision prompts.
 * Cherry-picked from dredozubov/prd-generator patterns, adapted to CCASP Vision system.
 */

/**
 * PRD section templates
 */
const PRD_SECTIONS = {
  overview: {
    title: '1. Overview & Objectives',
    prompt: 'What is the project and what are its main goals?',
  },
  userStories: {
    title: '2. User Stories / Use Cases',
    prompt: 'Who uses this and what do they need to accomplish?',
  },
  functional: {
    title: '3. Functional Requirements (MoSCoW)',
    prompt: 'What must, should, could, and won\'t the system do?',
  },
  nonFunctional: {
    title: '4. Non-Functional Requirements',
    prompt: 'What quality attributes matter (performance, security, etc.)?',
  },
  technical: {
    title: '5. Technical Constraints',
    prompt: 'What technologies, platforms, or integrations are required?',
  },
  acceptance: {
    title: '6. Acceptance Criteria',
    prompt: 'How do we know each feature is complete and correct?',
  },
  outOfScope: {
    title: '7. Out of Scope',
    prompt: 'What is explicitly not included in this project?',
  },
};

/**
 * Map features to MoSCoW priority levels based on confidence and domain
 * @param {Array} features - Parsed features from vision prompt
 * @returns {Object} MoSCoW categorization
 */
export function categorizeFeaturesMoSCoW(features) {
  const moscow = {
    must: [],
    should: [],
    could: [],
    wont: [],
  };

  for (const feature of features) {
    const confidence = feature.confidence || 0.8;
    if (confidence >= 0.8) {
      moscow.must.push(feature.feature || feature);
    } else if (confidence >= 0.6) {
      moscow.should.push(feature.feature || feature);
    } else {
      moscow.could.push(feature.feature || feature);
    }
  }

  return moscow;
}

/**
 * Generate user stories from parsed features
 * @param {Array} features - Feature details from parser
 * @returns {Array} User story strings
 */
export function generateUserStories(features) {
  const stories = [];
  const domainActors = {
    frontend: 'a user',
    backend: 'the system',
    database: 'the application',
    testing: 'a developer',
    deployment: 'an operator',
  };

  for (const feature of features) {
    const actor = domainActors[feature.domain] || 'a user';
    const verb = feature.feature?.replace(/-/g, ' ') || 'interact with the feature';
    stories.push(`As ${actor}, I want to ${verb}, so that I can accomplish my goal efficiently.`);
  }

  return stories;
}

/**
 * Generate acceptance criteria from features and constraints
 * @param {Array} features - Parsed features
 * @param {Array} constraints - Parsed constraints
 * @returns {Array} Acceptance criteria objects
 */
export function generateAcceptanceCriteria(features, constraints = []) {
  const criteria = [];

  for (const feature of features) {
    const featureName = feature.feature || feature;
    criteria.push({
      feature: featureName,
      given: `the ${featureName} feature is implemented`,
      when: `a user interacts with ${featureName}`,
      then: `the system responds correctly and meets functional requirements`,
    });
  }

  // Add constraint-based criteria
  for (const constraint of constraints) {
    if (constraint.type === 'requirement') {
      criteria.push({
        feature: 'constraint',
        given: 'the system is deployed',
        when: 'the constraint is evaluated',
        then: constraint.value || constraint,
      });
    }
  }

  return criteria;
}

/**
 * Generate a complete PRD from a parsed vision prompt
 * @param {Object} parsedPrompt - Output from parseVisionPrompt()
 * @returns {Object} Structured PRD document
 */
export function generatePRD(parsedPrompt) {
  const { parsed, original, confidence } = parsedPrompt;
  const featureDetails = parsed.feature_details || parsed.features?.map((f) => ({ feature: f, domain: 'general', confidence: 0.8 })) || [];
  const constraintDetails = parsed.constraint_details || parsed.constraints?.map((c) => ({ type: 'requirement', value: c })) || [];

  const moscow = categorizeFeaturesMoSCoW(featureDetails);
  const userStories = generateUserStories(featureDetails);
  const acceptanceCriteria = generateAcceptanceCriteria(featureDetails, constraintDetails);

  return {
    title: `PRD: ${original?.substring(0, 80) || 'Untitled Project'}`,
    generated_at: new Date().toISOString(),
    confidence,
    sections: {
      overview: {
        title: PRD_SECTIONS.overview.title,
        objective: original || '',
        intent: parsed.intent,
        scope: parsed.features?.length > 0 ? `${parsed.features.length} features identified` : 'Scope to be defined',
      },
      user_stories: {
        title: PRD_SECTIONS.userStories.title,
        stories: userStories,
      },
      functional_requirements: {
        title: PRD_SECTIONS.functional.title,
        must_have: moscow.must,
        should_have: moscow.should,
        could_have: moscow.could,
        wont_have: moscow.wont,
      },
      non_functional: {
        title: PRD_SECTIONS.nonFunctional.title,
        quality_attributes: parsed.quality_attributes || [],
        performance: parsed.quality_attributes?.includes('performance') ? 'Performance optimization required' : null,
        security: parsed.quality_attributes?.includes('security') ? 'Security hardening required' : null,
        accessibility: parsed.quality_attributes?.includes('accessibility') ? 'WCAG compliance required' : null,
      },
      technical_constraints: {
        title: PRD_SECTIONS.technical.title,
        technologies: parsed.technologies || [],
        constraints: parsed.constraints || [],
      },
      acceptance_criteria: {
        title: PRD_SECTIONS.acceptance.title,
        criteria: acceptanceCriteria,
      },
      out_of_scope: {
        title: PRD_SECTIONS.outOfScope.title,
        items: constraintDetails
          .filter((c) => c.type === 'exclusion')
          .map((c) => c.value),
      },
    },
  };
}

/**
 * Format a PRD as markdown text
 * @param {Object} prd - PRD object from generatePRD()
 * @returns {string} Markdown-formatted PRD
 */
export function formatPRDAsMarkdown(prd) {
  let md = `# ${prd.title}\n\n`;
  md += `> Generated: ${prd.generated_at} | Confidence: ${Math.round((prd.confidence || 0) * 100)}%\n\n`;

  const { sections } = prd;

  // Overview
  md += `## ${sections.overview.title}\n\n`;
  md += `**Objective:** ${sections.overview.objective}\n`;
  md += `**Intent:** ${sections.overview.intent}\n`;
  md += `**Scope:** ${sections.overview.scope}\n\n`;

  // User Stories
  md += `## ${sections.user_stories.title}\n\n`;
  for (const story of sections.user_stories.stories) {
    md += `- ${story}\n`;
  }
  md += '\n';

  // Functional Requirements
  md += `## ${sections.functional_requirements.title}\n\n`;
  if (sections.functional_requirements.must_have.length > 0) {
    md += `### Must Have\n`;
    for (const item of sections.functional_requirements.must_have) {
      md += `- [ ] ${item}\n`;
    }
  }
  if (sections.functional_requirements.should_have.length > 0) {
    md += `### Should Have\n`;
    for (const item of sections.functional_requirements.should_have) {
      md += `- [ ] ${item}\n`;
    }
  }
  if (sections.functional_requirements.could_have.length > 0) {
    md += `### Could Have\n`;
    for (const item of sections.functional_requirements.could_have) {
      md += `- [ ] ${item}\n`;
    }
  }
  md += '\n';

  // Non-Functional
  md += `## ${sections.non_functional.title}\n\n`;
  if (sections.non_functional.quality_attributes.length > 0) {
    md += `Quality attributes: ${sections.non_functional.quality_attributes.join(', ')}\n\n`;
  }

  // Technical Constraints
  md += `## ${sections.technical_constraints.title}\n\n`;
  if (sections.technical_constraints.technologies.length > 0) {
    md += `**Technologies:** ${sections.technical_constraints.technologies.join(', ')}\n`;
  }
  if (sections.technical_constraints.constraints.length > 0) {
    md += `**Constraints:**\n`;
    for (const c of sections.technical_constraints.constraints) {
      md += `- ${c}\n`;
    }
  }
  md += '\n';

  // Acceptance Criteria
  md += `## ${sections.acceptance_criteria.title}\n\n`;
  for (const ac of sections.acceptance_criteria.criteria) {
    md += `### ${ac.feature}\n`;
    md += `- **Given** ${ac.given}\n`;
    md += `- **When** ${ac.when}\n`;
    md += `- **Then** ${ac.then}\n\n`;
  }

  // Out of Scope
  md += `## ${sections.out_of_scope.title}\n\n`;
  if (sections.out_of_scope.items.length > 0) {
    for (const item of sections.out_of_scope.items) {
      md += `- ${item}\n`;
    }
  } else {
    md += `_No explicit exclusions identified._\n`;
  }

  return md;
}

export default {
  generatePRD,
  formatPRDAsMarkdown,
  categorizeFeaturesMoSCoW,
  generateUserStories,
  generateAcceptanceCriteria,
};
