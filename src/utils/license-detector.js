/**
 * License Detector Utility
 *
 * Detects license types from package metadata and files.
 * Part of Phase 1: Foundation Hooks (Issue #26)
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * SPDX license identifiers and their metadata
 */
export const LICENSE_DATABASE = {
  'MIT': {
    name: 'MIT License',
    spdx: 'MIT',
    url: 'https://opensource.org/licenses/MIT',
    category: 'permissive',
    compliance: 'Attribution required in copies',
    copyleft: false,
  },
  'Apache-2.0': {
    name: 'Apache License 2.0',
    spdx: 'Apache-2.0',
    url: 'https://opensource.org/licenses/Apache-2.0',
    category: 'permissive',
    compliance: 'Attribution required, state changes, patent grant',
    copyleft: false,
  },
  'BSD-2-Clause': {
    name: 'BSD 2-Clause "Simplified" License',
    spdx: 'BSD-2-Clause',
    url: 'https://opensource.org/licenses/BSD-2-Clause',
    category: 'permissive',
    compliance: 'Attribution required',
    copyleft: false,
  },
  'BSD-3-Clause': {
    name: 'BSD 3-Clause "New" or "Revised" License',
    spdx: 'BSD-3-Clause',
    url: 'https://opensource.org/licenses/BSD-3-Clause',
    category: 'permissive',
    compliance: 'Attribution required, no endorsement clause',
    copyleft: false,
  },
  'ISC': {
    name: 'ISC License',
    spdx: 'ISC',
    url: 'https://opensource.org/licenses/ISC',
    category: 'permissive',
    compliance: 'Attribution required',
    copyleft: false,
  },
  'GPL-2.0': {
    name: 'GNU General Public License v2.0',
    spdx: 'GPL-2.0',
    url: 'https://opensource.org/licenses/GPL-2.0',
    category: 'copyleft',
    compliance: 'Source code must be made available, derivative works under same license',
    copyleft: true,
  },
  'GPL-3.0': {
    name: 'GNU General Public License v3.0',
    spdx: 'GPL-3.0',
    url: 'https://opensource.org/licenses/GPL-3.0',
    category: 'copyleft',
    compliance: 'Source code must be made available, derivative works under same license',
    copyleft: true,
  },
  'LGPL-2.1': {
    name: 'GNU Lesser General Public License v2.1',
    spdx: 'LGPL-2.1',
    url: 'https://opensource.org/licenses/LGPL-2.1',
    category: 'weak-copyleft',
    compliance: 'Library modifications under LGPL, can link to proprietary code',
    copyleft: true,
  },
  'LGPL-3.0': {
    name: 'GNU Lesser General Public License v3.0',
    spdx: 'LGPL-3.0',
    url: 'https://opensource.org/licenses/LGPL-3.0',
    category: 'weak-copyleft',
    compliance: 'Library modifications under LGPL, can link to proprietary code',
    copyleft: true,
  },
  'AGPL-3.0': {
    name: 'GNU Affero General Public License v3.0',
    spdx: 'AGPL-3.0',
    url: 'https://opensource.org/licenses/AGPL-3.0',
    category: 'copyleft',
    compliance: 'Network use triggers source code disclosure',
    copyleft: true,
  },
  'MPL-2.0': {
    name: 'Mozilla Public License 2.0',
    spdx: 'MPL-2.0',
    url: 'https://opensource.org/licenses/MPL-2.0',
    category: 'weak-copyleft',
    compliance: 'File-level copyleft, can combine with proprietary code',
    copyleft: true,
  },
  'CC0-1.0': {
    name: 'Creative Commons Zero v1.0 Universal',
    spdx: 'CC0-1.0',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    category: 'public-domain',
    compliance: 'No requirements',
    copyleft: false,
  },
  'Unlicense': {
    name: 'The Unlicense',
    spdx: 'Unlicense',
    url: 'https://unlicense.org/',
    category: 'public-domain',
    compliance: 'No requirements',
    copyleft: false,
  },
  '0BSD': {
    name: 'BSD Zero Clause License',
    spdx: '0BSD',
    url: 'https://opensource.org/licenses/0BSD',
    category: 'public-domain',
    compliance: 'No requirements',
    copyleft: false,
  },
};

/**
 * Common license file names
 */
export const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'license',
  'license.md',
  'license.txt',
  'COPYING',
  'COPYING.md',
  'COPYING.txt',
];

/**
 * License text patterns for detection
 */
const LICENSE_PATTERNS = [
  { pattern: /MIT License/i, license: 'MIT' },
  { pattern: /Permission is hereby granted, free of charge/i, license: 'MIT' },
  { pattern: /Apache License.*Version 2\.0/i, license: 'Apache-2.0' },
  { pattern: /BSD 2-Clause/i, license: 'BSD-2-Clause' },
  { pattern: /BSD 3-Clause/i, license: 'BSD-3-Clause' },
  { pattern: /ISC License/i, license: 'ISC' },
  { pattern: /GNU GENERAL PUBLIC LICENSE.*Version 2/i, license: 'GPL-2.0' },
  { pattern: /GNU GENERAL PUBLIC LICENSE.*Version 3/i, license: 'GPL-3.0' },
  { pattern: /GNU LESSER GENERAL PUBLIC LICENSE.*Version 2\.1/i, license: 'LGPL-2.1' },
  { pattern: /GNU LESSER GENERAL PUBLIC LICENSE.*Version 3/i, license: 'LGPL-3.0' },
  { pattern: /GNU AFFERO GENERAL PUBLIC LICENSE/i, license: 'AGPL-3.0' },
  { pattern: /Mozilla Public License.*2\.0/i, license: 'MPL-2.0' },
  { pattern: /CC0 1\.0 Universal/i, license: 'CC0-1.0' },
  { pattern: /This is free and unencumbered software/i, license: 'Unlicense' },
];

/**
 * Normalize a license identifier to SPDX format
 * @param {string} license - Raw license string
 * @returns {string} Normalized SPDX identifier
 */
export function normalizeLicense(license) {
  if (!license) return 'UNKNOWN';

  const normalized = license.trim();

  // Check direct match
  if (LICENSE_DATABASE[normalized]) {
    return normalized;
  }

  // Check common variations
  const variations = {
    'MIT': ['mit', 'MIT License', 'The MIT License'],
    'Apache-2.0': ['apache', 'apache-2', 'apache 2', 'apache2', 'Apache License 2.0'],
    'BSD-2-Clause': ['bsd-2', 'bsd 2', 'simplified bsd'],
    'BSD-3-Clause': ['bsd-3', 'bsd 3', 'new bsd', 'revised bsd'],
    'ISC': ['isc'],
    'GPL-2.0': ['gpl-2', 'gpl2', 'gplv2', 'gnu gpl 2'],
    'GPL-3.0': ['gpl-3', 'gpl3', 'gplv3', 'gnu gpl 3'],
    'LGPL-2.1': ['lgpl-2.1', 'lgpl2.1', 'lgplv2.1'],
    'LGPL-3.0': ['lgpl-3', 'lgpl3', 'lgplv3'],
    'AGPL-3.0': ['agpl-3', 'agpl3', 'agplv3'],
    'MPL-2.0': ['mpl-2', 'mpl2', 'mozilla 2'],
    'CC0-1.0': ['cc0', 'public domain'],
    'Unlicense': ['unlicense', 'unlicensed'],
  };

  const lowerNormalized = normalized.toLowerCase();
  for (const [spdx, aliases] of Object.entries(variations)) {
    if (aliases.some((alias) => lowerNormalized.includes(alias.toLowerCase()))) {
      return spdx;
    }
  }

  return normalized.toUpperCase();
}

/**
 * Detect license from license file content
 * @param {string} content - License file content
 * @returns {string|null} Detected license or null
 */
export function detectLicenseFromContent(content) {
  if (!content) return null;

  for (const { pattern, license } of LICENSE_PATTERNS) {
    if (pattern.test(content)) {
      return license;
    }
  }

  return null;
}

/**
 * Get license metadata
 * @param {string} spdxId - SPDX license identifier
 * @returns {object|null} License metadata or null
 */
export function getLicenseMetadata(spdxId) {
  return LICENSE_DATABASE[spdxId] || null;
}

/**
 * Get license URL
 * @param {string} spdxId - SPDX license identifier
 * @returns {string} License URL or SPDX page URL
 */
export function getLicenseUrl(spdxId) {
  const metadata = getLicenseMetadata(spdxId);
  if (metadata) {
    return metadata.url;
  }
  return `https://spdx.org/licenses/${spdxId}.html`;
}

/**
 * Classify license compliance requirements
 * @param {string} spdxId - SPDX license identifier
 * @returns {object} Compliance classification
 */
export function classifyLicense(spdxId) {
  const metadata = getLicenseMetadata(spdxId);

  if (!metadata) {
    return {
      status: 'unknown',
      category: 'unknown',
      copyleft: false,
      compliance: 'Manual review required',
      requiresReview: true,
    };
  }

  const category = metadata.category;
  let status;

  if (category === 'permissive' || category === 'public-domain') {
    status = 'allowed';
  } else if (category === 'weak-copyleft') {
    status = 'requires-review';
  } else if (category === 'copyleft') {
    status = 'restricted';
  } else {
    status = 'unknown';
  }

  return {
    status,
    category,
    copyleft: metadata.copyleft,
    compliance: metadata.compliance,
    requiresReview: status === 'requires-review' || status === 'unknown',
  };
}

/**
 * Detect license from a package directory
 * @param {string} packageDir - Package directory path
 * @returns {object} Detection result
 */
export function detectLicenseFromPackage(packageDir) {
  const result = {
    detected: null,
    source: null,
    confidence: 0,
    raw: null,
  };

  // Try package.json first (npm)
  const packageJsonPath = join(packageDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (pkg.license) {
        result.raw = pkg.license;
        result.detected = normalizeLicense(pkg.license);
        result.source = 'package.json';
        result.confidence = 0.9;
        return result;
      }
    } catch {
      // Continue to other methods
    }
  }

  // Try pyproject.toml (Python)
  const pyprojectPath = join(packageDir, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf8');
      const licenseMatch = content.match(/license\s*=\s*["']([^"']+)["']/i);
      if (licenseMatch) {
        result.raw = licenseMatch[1];
        result.detected = normalizeLicense(licenseMatch[1]);
        result.source = 'pyproject.toml';
        result.confidence = 0.9;
        return result;
      }
    } catch {
      // Continue to other methods
    }
  }

  // Try LICENSE file
  for (const licenseFile of LICENSE_FILES) {
    const licensePath = join(packageDir, licenseFile);
    if (existsSync(licensePath)) {
      try {
        const content = readFileSync(licensePath, 'utf8');
        const detected = detectLicenseFromContent(content);
        if (detected) {
          result.raw = content.substring(0, 200);
          result.detected = detected;
          result.source = licenseFile;
          result.confidence = 0.7;
          return result;
        }
      } catch {
        // Continue to next file
      }
    }
  }

  return result;
}

/**
 * Check if a license is compatible with a project
 * @param {string} projectLicense - Project's license
 * @param {string} dependencyLicense - Dependency's license
 * @returns {object} Compatibility result
 */
export function checkLicenseCompatibility(projectLicense, dependencyLicense) {
  const projectClass = classifyLicense(projectLicense);
  const depClass = classifyLicense(dependencyLicense);

  // Public domain is always compatible
  if (depClass.category === 'public-domain') {
    return { compatible: true, reason: 'Public domain - no restrictions' };
  }

  // Permissive is always compatible
  if (depClass.category === 'permissive') {
    return { compatible: true, reason: 'Permissive license - compatible' };
  }

  // Copyleft with permissive project
  if (depClass.copyleft && !projectClass.copyleft) {
    return {
      compatible: false,
      reason: `Copyleft license (${dependencyLicense}) may require your project to be released under the same license`,
    };
  }

  // Strong copyleft (AGPL) requires special consideration
  if (dependencyLicense === 'AGPL-3.0') {
    return {
      compatible: false,
      reason: 'AGPL requires source disclosure for network use',
    };
  }

  return { compatible: true, reason: 'Compatible' };
}

export default {
  LICENSE_DATABASE,
  LICENSE_FILES,
  normalizeLicense,
  detectLicenseFromContent,
  getLicenseMetadata,
  getLicenseUrl,
  classifyLicense,
  detectLicenseFromPackage,
  checkLicenseCompatibility,
};
