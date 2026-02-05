# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.3.0] - 2026-02-05
### Added
- **Security**: Template injection prevention (`sanitizeForJS`) in agent templates
- **Security**: Path traversal protection (`safePath`, `safeComponent`) in file operations
- **Security**: Command injection prevention - converted `execSync` to `execFileSync` in github-integration.js
- **Security**: Max iteration limit (100) for template engine to prevent infinite loops
- **Testing**: Golden master test suite for API contract verification
- **Testing**: Template engine test suite (14 tests)
- **Testing**: Safe path test suite (11 tests)
- **Testing**: 135 tests total, all passing
- **Utilities**: `src/utils/logger.js` - Structured logging with levels (SILENT/ERROR/WARN/INFO/DEBUG)
- **Utilities**: `src/utils/errors.js` - Custom error hierarchy (CcaspError, CcaspConfigError, etc.)
- **Utilities**: `src/utils/inquirer-presets.js` - Shared prompt factories
- **Utilities**: `src/utils/file-ops.js` - Safe file I/O wrappers
- **Patterns**: Circuit breaker pattern for fail-fast external calls
- **Patterns**: Retry with exponential backoff pattern
- **Patterns**: Fan-out/fan-in parallel aggregation pattern
- **Patterns**: Streaming/progressive output pattern for long-running tasks
- **Commands**: `/security-scan` - OWASP check, npm audit, dependency scanning
- **Commands**: `/perf-profile` - Lighthouse, bundle analysis, Core Web Vitals
- **Commands**: `/monitoring-setup` - Sentry/DataDog/New Relic integration
- **Commands**: `/api-docs` - OpenAPI/Swagger generation from codebase
- **Commands**: `/db-migrate` - Database migration management with rollback
- **Schemas**: JSON schemas for PROGRESS.json, ROADMAP.json, EPIC.json, skill.json
- **Documentation**: Templates INDEX.md, VARIABLES.md, hooks INDEX.md
- **Documentation**: MIGRATION.md for version upgrade guidance
- **CLI**: `--debug`, `--verbose`, `--silent` global flags for log level control
- **CLI**: Global error boundary (uncaughtException/unhandledRejection handlers)

### Changed
- ESLint config strengthened with security and best-practice rules
- YAML frontmatter added to 18 templates missing it
- Golden master tests now ignore `capturedAt` timestamps in comparisons
- All 53 hook templates use consistent kebab-case naming
- Patterns README updated as decision guide indexing all 8 patterns

### Fixed
- Template injection vulnerability in `agents/templates.js`
- Path traversal vulnerability in file write operations
- Command injection in `github-integration.js` `execSync` calls
- Golden master test false failures from timestamp comparison
- `agents.test.js` stale model assertions after model field removal
- L3 github-issue-sync worker missing `--repo` flag

## [2.2.19] - 2026-02-05
### Added
- **Neovim Integration (nvim-ccasp)**: Zero-setup launcher with `ccasp neovim`
- **Multi-Session Claude CLI**: Up to 8 sessions with quadrant stacking
- **Color-Coded Titlebars**: 8 colors (Blue, Green, Purple, Orange, Red, Cyan, Pink, Yellow)
- **Auto-Insert Mode**: Click session to start typing immediately
- **Collapsible Sidebar**: Mouse-clickable sections, all collapsed by default
- **Prompt Injector v1.1.0**: Intercept prompts, optionally enhance with GPT-5.2
- **npm Package Integration**: nvim-ccasp/ included in npm distribution
- **Permanent Installation**: `ccasp nvim-setup` with symlink/copy options

## [2.2.18] - 2026-02-05
### Added
- Critical commands auto-update system during `ccasp init`
- Self-healing updates for `/update-check` command
### Changed
- `update-check` and `__ccasp-sync-marker` now ALWAYS update during init
- Automatic upgrade detection for outdated projects

## [2.2.17] - 2026-02-05
### Added
- Automatic upgrade when sync marker is missing
- `/update-check` now runs `ccasp init` automatically
### Changed
- Zero-touch migration for older versions

## [2.2.16] - 2026-02-05
### Added
- `__ccasp-sync-marker.md` file for version detection
- Sync marker system for tracking 11-category updates
### Changed
- Improved upgrade path messaging

## [2.2.15] - 2026-02-05
### Added
- `.cjs` file extension support for hooks
- `github-progress-hook.cjs` for TodoWrite matcher
### Changed
- Automatic hook registration during init for CommonJS compatibility

## [2.2.14] - 2026-02-05
### Added
- Full 11-category template sync in `/update-check`
- New categories: commands-dev, scripts, github/ISSUE_TEMPLATE, workflows, mcp
### Changed
- Complete coverage for all template directories

## [2.2.13] - 2026-02-05
### Added
- Comprehensive file synchronization in `/update-check`
- Hash comparison for detecting customized files
### Changed
- Smart merge preserves user modifications while adding new features

## [2.2.12] - 2026-02-05
### Added
- Type-specific GitHub issue templates (Feature, Refactor, Bug, Testing)
- CCASP-META machine-parseable HTML comments
- Generated Files section in all issues
- PostToolUse hook for PROGRESS.json changes
- L3 background sync worker for automatic GitHub updates
### Changed
- 5-phase implementation architecture for hooks

## [2.2.11] - 2026-02-05
### Added
- Unified Task/Phase/Roadmap architecture with shared exploration structure
- Tunnel URL support in deployment workflow
### Changed
- Consistent 6-file exploration document generation across all planning scales

## [2.2.10] - 2026-02-05
### Fixed
- ASCII box menu display formatting
- Improved display instructions in `/menu` command

## [2.2.9] - 2026-02-05
### Added
- Mandatory L2 exploration files before implementation
- 6-file standard: EXPLORATION_SUMMARY, CODE_SNIPPETS, REFERENCE_FILES, AGENT_DELEGATION, PHASE_BREAKDOWN, findings.json
### Changed
- Slash commands now validate exploration docs exist

## [2.2.8] - 2026-02-05
### Added
- Graduated Task/Phase/Roadmap architecture with three planning scales
- L2 exploration system with full context documentation
- Fast dev-sync for development workflows
- Improved git worktree integration

## [2.2.5] - 2026-02-05
### Added
- Smart sync utility for dev mode (`smart-sync.js`)
- Menu worktree sync with status banner
- `/dev-mode-deploy-to-projects` slash command with --dry-run, --force, --project options
- `/menu-happy` dedicated mobile menu command
### Changed
- Wizard UX improvements: reinstall option, accurate counts, better mismatch handling
- Hooks migrated from `.js` to `.cjs` for CommonJS compatibility
- `/menu` no longer auto-detects mobile mode

## [2.2.4] - 2025-02-05
### Added
- Comprehensive Playwright E2E testing integration
- Credential injection for testing
- Tunnel services integration
- Ralph Loop configuration for E2E tests
- Screenshot gallery (6 screenshots for desktop and mobile UI)
### Changed
- Happy Mode detection now requires active session indicators
### Breaking
- `HAPPY_SERVER_URL` alone no longer triggers mobile mode
### Fixed
- Enhanced GitHub integration error handling
- Cleaner issue parsing
- Refined MCP handling

## [2.2.3] - 2025-02-05
### Changed
- Removed hardcoded paths from npm package
### Fixed
- Improved template portability

## [2.2.0] - 2025-01-05
### Added
- **Vision Driver Bot (VDB)**: Autonomous development with lint fixes
- **GitHub Epic System**: Multi-issue epic workflows with `/create-github-epic`
- `/init-ccasp-new-project` for Happy users
- Modular command architecture (7 large files refactored)
### Changed
- Improved maintainability through modular design

[Full v2.2.0 Release Notes](https://github.com/evan043/claude-cli-advanced-starter-pack/releases/tag/v2.2.0)

[View All Releases](https://github.com/evan043/claude-cli-advanced-starter-pack/releases)
