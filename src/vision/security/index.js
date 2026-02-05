/**
 * Vision Mode Security Scanner
 *
 * Aggregates vulnerability scanning from multiple sources:
 * - npm audit (Node.js packages)
 * - pip-audit/safety (Python packages)
 * - OSV Scanner (Google's Open Source Vulnerabilities database)
 *
 * @module vision/security
 */

export { runNpmAudit, parseNpmAuditResults, classifyVulnerabilities as classifyNpmVulnerabilities } from './npm-audit.js';
export { runPipAudit, parsePipAuditResults, classifyVulnerabilities as classifyPipVulnerabilities } from './pip-audit.js';
export { runOSVScan, parseOSVResults } from './osv-scanner.js';
export {
  scanPackages,
  mergeVulnerabilities,
  identifyBlockedPackages,
  generateSecurityReport,
  shouldBlockInstall
} from './scanner.js';
