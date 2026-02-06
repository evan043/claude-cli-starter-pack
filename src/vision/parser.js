/**
 * Vision Prompt Parser
 *
 * Parses natural language prompts into structured intent, features, and constraints.
 * Uses pattern matching and keyword extraction for prompt analysis.
 */

import { VisionIntent } from './schema.js';
import { generatePRD, formatPRDAsMarkdown } from './requirements/prd-template.js';

// Intent detection patterns
const INTENT_PATTERNS = {
  [VisionIntent.BUILD]: [
    /\b(build|create|make|develop|implement|add|new)\b/i,
    /\b(adding|creating|building|developing)\b/i,
    /\bfrom scratch\b/i
  ],
  [VisionIntent.MODIFY]: [
    /\b(modify|change|update|edit|alter|adjust)\b/i,
    /\b(modifying|changing|updating|editing)\b/i
  ],
  [VisionIntent.REFACTOR]: [
    /\b(refactor|restructure|reorganize|clean ?up|improve)\b/i,
    /\b(refactoring|restructuring|improving)\b/i,
    /\btechnical debt\b/i
  ],
  [VisionIntent.MIGRATE]: [
    /\b(migrate|move|transfer|convert|port)\b/i,
    /\b(migrating|moving|converting|porting)\b/i,
    /\bfrom .+ to\b/i
  ],
  [VisionIntent.OPTIMIZE]: [
    /\b(optimize|speed ?up|performance|faster|efficient)\b/i,
    /\b(optimizing|speeding|improving performance)\b/i
  ]
};

// Feature extraction patterns
const FEATURE_PATTERNS = [
  // UI Components
  { pattern: /\b(calendar|scheduler|planner)\b/i, feature: 'calendar', domain: 'frontend' },
  { pattern: /\b(drag[- ]?(?:and[- ]?)?drop)\b/i, feature: 'drag-drop', domain: 'frontend' },
  { pattern: /\b(modal|dialog|popup)\b/i, feature: 'modal', domain: 'frontend' },
  { pattern: /\b(table|grid|list)\b/i, feature: 'data-display', domain: 'frontend' },
  { pattern: /\b(form|input|field)\b/i, feature: 'forms', domain: 'frontend' },
  { pattern: /\b(chart|graph|visualization)\b/i, feature: 'charts', domain: 'frontend' },
  { pattern: /\b(dashboard)\b/i, feature: 'dashboard', domain: 'frontend' },
  { pattern: /\b(sidebar|navigation|menu)\b/i, feature: 'navigation', domain: 'frontend' },

  // Auth & Security
  { pattern: /\b(auth(?:entication)?|login|sign[- ]?in)\b/i, feature: 'authentication', domain: 'backend' },
  { pattern: /\b(oauth|sso|social login)\b/i, feature: 'oauth', domain: 'backend' },
  { pattern: /\b(jwt|token|session)\b/i, feature: 'session-management', domain: 'backend' },
  { pattern: /\b(role|permission|access control)\b/i, feature: 'authorization', domain: 'backend' },

  // Data & Storage
  { pattern: /\b(database|db|storage)\b/i, feature: 'database', domain: 'database' },
  { pattern: /\b(crud|create|read|update|delete)\b/i, feature: 'crud-operations', domain: 'backend' },
  { pattern: /\b(search|filter|query)\b/i, feature: 'search', domain: 'backend' },
  { pattern: /\b(upload|file|image)\b/i, feature: 'file-upload', domain: 'backend' },
  { pattern: /\b(cache|redis|memcache)\b/i, feature: 'caching', domain: 'backend' },

  // Real-time
  { pattern: /\b(real[- ]?time|live|websocket|sse)\b/i, feature: 'realtime', domain: 'backend' },
  { pattern: /\b(notification|alert|push)\b/i, feature: 'notifications', domain: 'backend' },
  { pattern: /\b(chat|messaging)\b/i, feature: 'messaging', domain: 'backend' },

  // API & Integration
  { pattern: /\b(api|rest|graphql)\b/i, feature: 'api', domain: 'backend' },
  { pattern: /\b(webhook|callback)\b/i, feature: 'webhooks', domain: 'backend' },
  { pattern: /\b(integration|third[- ]?party|external)\b/i, feature: 'integrations', domain: 'backend' },

  // Testing
  { pattern: /\b(test|testing|e2e|unit)\b/i, feature: 'testing', domain: 'testing' },

  // Deployment
  { pattern: /\b(deploy|deployment|ci[/-]?cd)\b/i, feature: 'deployment', domain: 'deployment' },
  { pattern: /\b(docker|container)\b/i, feature: 'containerization', domain: 'deployment' }
];

// Constraint patterns
const CONSTRAINT_PATTERNS = [
  { pattern: /\bmust (?:be |have |use |support )(.+?)(?:\.|,|$)/gi, type: 'requirement' },
  { pattern: /\bshould (?:be |have |use |support )(.+?)(?:\.|,|$)/gi, type: 'preference' },
  { pattern: /\bno (.+?)(?:\.|,|$)/gi, type: 'exclusion' },
  { pattern: /\bwithout (.+?)(?:\.|,|$)/gi, type: 'exclusion' },
  { pattern: /\bdon't (?:use |want |need )(.+?)(?:\.|,|$)/gi, type: 'exclusion' },
  { pattern: /\busing (.+?)(?:\.|,|$)/gi, type: 'technology' },
  { pattern: /\bwith (.+?)(?:\.|,|$)/gi, type: 'inclusion' }
];

// Quality attribute patterns
const QUALITY_PATTERNS = [
  { pattern: /\b(fast|quick|speedy|performance)\b/i, attribute: 'performance' },
  { pattern: /\b(secure|security|safe)\b/i, attribute: 'security' },
  { pattern: /\b(accessible|a11y|accessibility)\b/i, attribute: 'accessibility' },
  { pattern: /\b(responsive|mobile|tablet)\b/i, attribute: 'responsiveness' },
  { pattern: /\b(scalable|scale)\b/i, attribute: 'scalability' },
  { pattern: /\b(reliable|reliability)\b/i, attribute: 'reliability' },
  { pattern: /\b(maintainable|clean code)\b/i, attribute: 'maintainability' },
  { pattern: /\b(simple|minimal|lightweight)\b/i, attribute: 'simplicity' },
  { pattern: /\b(beautiful|modern|sleek|professional)\b/i, attribute: 'aesthetics' },
  { pattern: /\b(user[- ]?friendly|intuitive|easy to use)\b/i, attribute: 'usability' }
];

/**
 * Detect the primary intent from a prompt
 * @param {string} prompt - User prompt
 * @returns {Object} { intent: VisionIntent, confidence: number }
 */
export function detectIntent(prompt) {
  const scores = {};

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    scores[intent] = 0;
    for (const pattern of patterns) {
      const matches = prompt.match(pattern);
      if (matches) {
        scores[intent] += matches.length;
      }
    }
  }

  // Find highest scoring intent
  let maxScore = 0;
  let detectedIntent = VisionIntent.BUILD; // Default

  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedIntent = intent;
    }
  }

  // Calculate confidence based on score distribution
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? (maxScore / totalScore) : 0.5;

  return {
    intent: detectedIntent,
    confidence: Math.min(0.95, Math.max(0.5, confidence))
  };
}

/**
 * Extract features from a prompt
 * @param {string} prompt - User prompt
 * @returns {Array} Array of { feature, domain, confidence }
 */
export function extractFeatures(prompt) {
  const features = [];
  const seenFeatures = new Set();

  for (const { pattern, feature, domain } of FEATURE_PATTERNS) {
    if (pattern.test(prompt) && !seenFeatures.has(feature)) {
      seenFeatures.add(feature);
      features.push({
        feature,
        domain,
        confidence: 0.8
      });
    }
  }

  return features;
}

/**
 * Extract constraints from a prompt
 * @param {string} prompt - User prompt
 * @returns {Array} Array of { type, value }
 */
export function extractConstraints(prompt) {
  const constraints = [];

  for (const { pattern, type } of CONSTRAINT_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(prompt)) !== null) {
      const value = match[1]?.trim();
      if (value && value.length > 2 && value.length < 100) {
        constraints.push({
          type,
          value,
          original: match[0].trim()
        });
      }
    }
  }

  return constraints;
}

/**
 * Extract quality attributes from a prompt
 * @param {string} prompt - User prompt
 * @returns {Array} Array of quality attribute strings
 */
export function extractQualityAttributes(prompt) {
  const attributes = new Set();

  for (const { pattern, attribute } of QUALITY_PATTERNS) {
    if (pattern.test(prompt)) {
      attributes.add(attribute);
    }
  }

  return Array.from(attributes);
}

/**
 * Extract technology mentions from a prompt
 * @param {string} prompt - User prompt
 * @returns {Array} Array of technology names
 */
export function extractTechnologies(prompt) {
  const techPatterns = [
    // Frontend
    /\b(react|vue|angular|svelte|next\.?js|nuxt)\b/gi,
    // Backend
    /\b(node|express|fastapi|django|flask|nestjs|rails)\b/gi,
    // Database
    /\b(postgres|postgresql|mysql|mongodb|sqlite|redis)\b/gi,
    // State
    /\b(redux|zustand|mobx|pinia|recoil)\b/gi,
    // Testing
    /\b(jest|vitest|playwright|cypress|pytest)\b/gi,
    // Other
    /\b(typescript|graphql|prisma|docker|kubernetes)\b/gi
  ];

  const technologies = new Set();

  for (const pattern of techPatterns) {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      technologies.add(match[1].toLowerCase());
    }
  }

  return Array.from(technologies);
}

/**
 * Parse a complete vision prompt
 * @param {string} prompt - User prompt
 * @returns {Object} Parsed prompt structure
 */
export function parseVisionPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return {
      original: prompt || '',
      parsed: {
        intent: VisionIntent.BUILD,
        features: [],
        constraints: [],
        quality_attributes: [],
        technologies: []
      },
      confidence: 0,
      parsed_at: new Date().toISOString()
    };
  }

  const normalizedPrompt = prompt.trim();
  const { intent, confidence: intentConfidence } = detectIntent(normalizedPrompt);
  const features = extractFeatures(normalizedPrompt);
  const constraints = extractConstraints(normalizedPrompt);
  const qualityAttributes = extractQualityAttributes(normalizedPrompt);
  const technologies = extractTechnologies(normalizedPrompt);

  // Calculate overall confidence
  const featureConfidence = features.length > 0 ? 0.8 : 0.5;
  const overallConfidence = (intentConfidence + featureConfidence) / 2;

  return {
    original: normalizedPrompt,
    parsed: {
      intent,
      features: features.map(f => f.feature),
      feature_details: features,
      constraints: constraints.map(c => c.value),
      constraint_details: constraints,
      quality_attributes: qualityAttributes,
      technologies
    },
    confidence: Math.round(overallConfidence * 100) / 100,
    parsed_at: new Date().toISOString()
  };
}

/**
 * Estimate complexity from parsed prompt
 * @param {Object} parsedPrompt - Parsed prompt object
 * @returns {Object} { scale: 'S'|'M'|'L', reason: string }
 */
export function estimateComplexity(parsedPrompt) {
  const featureCount = parsedPrompt.parsed?.features?.length || 0;
  const constraintCount = parsedPrompt.parsed?.constraints?.length || 0;
  const techCount = parsedPrompt.parsed?.technologies?.length || 0;

  const score = featureCount * 2 + constraintCount + techCount;

  if (score <= 5) {
    return {
      scale: 'S',
      reason: `Small scope: ${featureCount} features, ${constraintCount} constraints`
    };
  } else if (score <= 15) {
    return {
      scale: 'M',
      reason: `Medium scope: ${featureCount} features, ${constraintCount} constraints, ${techCount} technologies`
    };
  } 
    return {
      scale: 'L',
      reason: `Large scope: ${featureCount} features, ${constraintCount} constraints, ${techCount} technologies`
    };
  
}

/**
 * Generate a summary of the parsed prompt
 * @param {Object} parsedPrompt - Parsed prompt object
 * @returns {string} Human-readable summary
 */
export function generatePromptSummary(parsedPrompt) {
  const { parsed, confidence } = parsedPrompt;

  let summary = `Intent: ${parsed.intent} (${Math.round(confidence * 100)}% confidence)\n`;

  if (parsed.features?.length > 0) {
    summary += `Features: ${parsed.features.join(', ')}\n`;
  }

  if (parsed.technologies?.length > 0) {
    summary += `Technologies: ${parsed.technologies.join(', ')}\n`;
  }

  if (parsed.quality_attributes?.length > 0) {
    summary += `Quality Attributes: ${parsed.quality_attributes.join(', ')}\n`;
  }

  if (parsed.constraints?.length > 0) {
    summary += `Constraints: ${parsed.constraints.join('; ')}\n`;
  }

  return summary;
}

/**
 * Get domain distribution from features
 * @param {Array} featureDetails - Feature details array
 * @returns {Object} Domain counts
 */
export function getDomainDistribution(featureDetails) {
  const distribution = {
    frontend: 0,
    backend: 0,
    database: 0,
    testing: 0,
    deployment: 0
  };

  for (const feature of featureDetails || []) {
    if (Object.prototype.hasOwnProperty.call(distribution, feature.domain)) {
      distribution[feature.domain]++;
    }
  }

  return distribution;
}

export { generatePRD, formatPRDAsMarkdown };

export default {
  detectIntent,
  extractFeatures,
  extractConstraints,
  extractQualityAttributes,
  extractTechnologies,
  parseVisionPrompt,
  estimateComplexity,
  generatePromptSummary,
  getDomainDistribution,
  generatePRD,
  formatPRDAsMarkdown
};
