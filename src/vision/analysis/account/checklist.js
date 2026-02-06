/**
 * Setup Checklist Generator
 *
 * Generates organized setup checklists from account requirements.
 *
 * @module vision/analysis/account/checklist
 */

/**
 * Generate setup checklist from requirements
 *
 * @param {Array<Object>} requirements - Account requirements
 * @returns {Object} Organized checklist with steps
 *
 * @example
 * const checklist = generateSetupChecklist(requirements);
 * // {
 * //   required: [...],
 * //   optional: [...],
 * //   estimatedTime: '2-3 hours',
 * //   totalCost: '$20/month'
 * // }
 */
export function generateSetupChecklist(requirements) {
  const required = requirements.filter(r => r.required);
  const optional = requirements.filter(r => !r.required);

  // Calculate estimated setup time
  const setupMinutes = requirements.reduce((total, req) => {
    return total + (req.setupTimeMinutes || 15);
  }, 0);

  const estimatedTime = formatTime(setupMinutes);

  // Calculate total monthly cost
  const totalCost = requirements.reduce((total, req) => {
    return total + (req.monthlyCost || 0);
  }, 0);

  // Group by category
  const byCategory = {
    deployment: [],
    authentication: [],
    payments: [],
    email: [],
    storage: [],
    monitoring: [],
    other: []
  };

  requirements.forEach(req => {
    const category = req.category || 'other';
    if (byCategory[category]) {
      byCategory[category].push(req);
    } else {
      byCategory.other.push(req);
    }
  });

  return {
    required,
    optional,
    byCategory,
    estimatedTime,
    totalCost: totalCost === 0 ? 'Free' : `$${totalCost}/month`,
    summary: {
      totalAccounts: requirements.length,
      requiredAccounts: required.length,
      optionalAccounts: optional.length,
      freeTier: requirements.filter(r => r.accountType === 'free').length,
      paidOnly: requirements.filter(r => r.accountType === 'paid').length
    },
    steps: generateSetupSteps(requirements)
  };
}

/**
 * Generate ordered setup steps
 * @private
 */
function generateSetupSteps(requirements) {
  // Order by category priority and dependency
  const categoryOrder = [
    'version-control',
    'deployment',
    'database',
    'authentication',
    'email',
    'storage',
    'payments',
    'monitoring',
    'other'
  ];

  const ordered = [...requirements].sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.category || 'other');
    const bIndex = categoryOrder.indexOf(b.category || 'other');

    if (aIndex !== bIndex) return aIndex - bIndex;

    // Required before optional
    if (a.required !== b.required) return a.required ? -1 : 1;

    return 0;
  });

  return ordered.map((req, index) => ({
    step: index + 1,
    service: req.service,
    category: req.category,
    required: req.required,
    setupUrl: req.setupUrl,
    steps: req.setupSteps,
    estimatedTime: formatTime(req.setupTimeMinutes || 15),
    cost: req.monthlyCost === 0 ? 'Free' : `$${req.monthlyCost}/month`,
    docs: req.docs
  }));
}

/**
 * Format minutes to human-readable time
 * @private
 */
function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}
