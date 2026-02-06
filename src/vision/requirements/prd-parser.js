/**
 * PRD Parser
 *
 * Parses a PRD document back into structured requirements.
 * Used for Vision alignment checking and drift detection.
 */

/**
 * Extract requirements from a PRD object
 * @param {Object} prd - PRD object from generatePRD()
 * @returns {Object} Structured requirements
 */
export function extractRequirements(prd) {
  if (!prd || !prd.sections) return { features: [], constraints: [], criteria: [] };

  const features = [];
  const constraints = [];
  const criteria = [];

  // Extract features from MoSCoW
  const fr = prd.sections.functional_requirements || {};
  for (const item of fr.must_have || []) features.push({ name: item, priority: 'must' });
  for (const item of fr.should_have || []) features.push({ name: item, priority: 'should' });
  for (const item of fr.could_have || []) features.push({ name: item, priority: 'could' });

  // Extract constraints
  const tc = prd.sections.technical_constraints || {};
  for (const c of tc.constraints || []) constraints.push(c);
  for (const t of tc.technologies || []) constraints.push(`Use ${t}`);

  // Extract acceptance criteria
  const ac = prd.sections.acceptance_criteria || {};
  for (const c of ac.criteria || []) {
    criteria.push({
      feature: c.feature,
      condition: `Given ${c.given}, when ${c.when}, then ${c.then}`,
    });
  }

  return { features, constraints, criteria };
}

/**
 * Check if a completed task aligns with PRD requirements
 * @param {string} taskDescription - Description of completed task
 * @param {Object} requirements - Extracted requirements
 * @returns {{ aligned: boolean, matchedFeatures: string[], gaps: string[] }}
 */
export function checkAlignment(taskDescription, requirements) {
  const taskLower = taskDescription.toLowerCase();
  const matchedFeatures = [];
  const gaps = [];

  for (const feature of requirements.features) {
    const featureName = (feature.name || feature).toLowerCase();
    if (taskLower.includes(featureName) || featureName.includes(taskLower.split(' ')[0])) {
      matchedFeatures.push(feature.name || feature);
    }
  }

  // Check for must-have features not yet addressed
  const mustHaves = requirements.features.filter((f) => f.priority === 'must');
  for (const must of mustHaves) {
    if (!matchedFeatures.includes(must.name)) {
      gaps.push(must.name);
    }
  }

  return {
    aligned: matchedFeatures.length > 0,
    matchedFeatures,
    gaps: gaps.slice(0, 5),
  };
}

export default { extractRequirements, checkAlignment };
