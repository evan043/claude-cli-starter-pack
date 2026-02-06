/**
 * Competitor Analysis Data Models
 *
 * Functions for creating competitor profiles, SWOT analysis,
 * and feature gap matrices.
 */

/**
 * SWOT analysis structure
 */
export function createSwotAnalysis() {
  return {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
  };
}

/**
 * Create competitor profile structure
 * @param {string} name - Competitor name
 * @returns {object} Profile structure
 */
export function createCompetitorProfile(name) {
  return {
    name,
    website: null,
    description: null,
    founded: null,
    funding: null,
    employees: null,
    features: [],
    pricing: {
      model: null,
      tiers: [],
      startingPrice: null,
      hasFreeTier: false,
    },
    techStack: {
      frontend: [],
      backend: [],
      database: [],
      cloud: [],
    },
    marketPosition: {
      targetAudience: null,
      marketShare: null,
      growthTrend: null,
    },
    sentiment: {
      overallRating: null,
      reviewCount: 0,
      commonPraises: [],
      commonComplaints: [],
    },
    swot: createSwotAnalysis(),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate feature gap matrix
 * @param {object} ourProduct - Our product features
 * @param {object[]} competitors - Competitor profiles
 * @returns {object} Gap matrix
 */
export function generateFeatureGapMatrix(ourProduct, competitors) {
  const allFeatures = new Set();

  // Collect all features
  if (ourProduct.features) {
    ourProduct.features.forEach(f => allFeatures.add(f.name || f));
  }

  for (const competitor of competitors) {
    if (competitor.features) {
      competitor.features.forEach(f => allFeatures.add(f.name || f));
    }
  }

  // Build matrix
  const matrix = {
    headers: ['Feature', 'Our Product', ...competitors.map(c => c.name)],
    rows: [],
    summary: {
      ourFeatureCount: ourProduct.features?.length || 0,
      gaps: [],
      opportunities: [],
    },
  };

  for (const feature of allFeatures) {
    const hasFeature = (product) => {
      if (!product.features) return false;
      return product.features.some(f =>
        (f.name || f).toLowerCase() === feature.toLowerCase()
      );
    };

    const row = {
      feature,
      ourProduct: hasFeature(ourProduct) ? '✓' : '✗',
      competitors: {},
    };

    let competitorCount = 0;
    for (const competitor of competitors) {
      const has = hasFeature(competitor);
      row.competitors[competitor.name] = has ? '✓' : '✗';
      if (has) competitorCount++;
    }

    // Identify gaps
    if (!hasFeature(ourProduct) && competitorCount >= Math.ceil(competitors.length / 2)) {
      matrix.summary.gaps.push({
        feature,
        priority: competitorCount === competitors.length ? 'high' : 'medium',
        competitorCoverage: `${competitorCount}/${competitors.length}`,
      });
    }

    // Identify opportunities (features we have that competitors don't)
    if (hasFeature(ourProduct) && competitorCount < Math.ceil(competitors.length / 2)) {
      matrix.summary.opportunities.push({
        feature,
        differentiator: competitorCount === 0,
      });
    }

    matrix.rows.push(row);
  }

  return matrix;
}
