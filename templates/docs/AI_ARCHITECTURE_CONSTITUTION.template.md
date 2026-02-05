# {{project.name}} - AI Architecture Constitution

**Version**: 2.0.0
**Created**: {{date}}
**Status**: Active

## Purpose

This document defines non-negotiable rules that Claude must follow when working on this project. These laws protect data integrity, prevent architectural violations, and ensure code quality.

> **New in v2.0**: This document now works alongside the YAML-based constitution system at `.claude/config/constitution.yaml`. The YAML schema provides machine-enforceable rules with automatic sampling and validation via hooks.

---

## Boot Sequence (MANDATORY)

Before responding to any request, Claude must:

1. Load this constitution file
2. Load `.claude/config/constitution.yaml` (if exists)
3. Enforce all laws - refuse or auto-refactor violations
4. Reference project-specific documentation as needed

---

## YAML-Based Enforcement

### Configuration Location

```
.claude/config/constitution.yaml    # Rule definitions
templates/constitution.schema.json  # JSON Schema validation
```

### Initialization

```bash
# Initialize constitution with presets
ccasp constitution-init --preset senior  # Senior fullstack defaults
ccasp constitution-init --preset minimal # Security rules only
ccasp constitution-init --preset strict  # Maximum enforcement
ccasp constitution-init --preset custom  # Interactive configuration
```

### Sampling Configuration

The hook-based enforcement uses sampling to balance thoroughness with performance:

| Preset | Sampling Rate | Description |
|--------|---------------|-------------|
| **senior** | 5% (1-in-20) | Balanced for senior developers |
| **minimal** | 2% (1-in-50) | Low overhead, critical rules only |
| **strict** | 15% (1-in-7) | Higher coverage |
| **custom** | Configurable | Set your own rate |

**Sensitive Pattern Bypass**: Security-related patterns (password, secret, api_key, token, credential) always trigger validation, bypassing sampling.

### Rule Structure

```yaml
sections:
  code_style:
    title: "Code Style"
    enabled: true
    rules:
      - id: CS-001
        description: "Use const for variables that are never reassigned"
        severity: warning  # error | warning | info
        enabled: true
        auto_fix: false
        domains: [all]     # frontend | backend | testing | deployment | all
        file_patterns: ["*.ts", "*.js"]
```

---

## Law 1: Data Storage

**CRITICAL: All user data MUST follow the designated storage pattern.**

| Data Type | Storage | Status |
|-----------|---------|--------|
| User preferences | Designated database | Required |
| Session data | Designated storage | Required |
| Configuration | Config files | Allowed |
| Cached data | Cache directory | Temporary only |

### Forbidden Patterns

- Storing user data in flat files when database is available
- Mixing storage approaches inconsistently
- Bypassing repository/service layer for direct database access

---

## Law 2: Architecture Patterns

### Required Patterns

| Pattern | Rule |
|---------|------|
| **Repository** | All database access via repository layer |
| **Service** | Business logic in service layer |
| **Controller** | HTTP handling only in controller layer |
| **Component** | UI logic in component layer |

### Forbidden Patterns

- Direct database queries in controllers/components
- Business logic in UI components
- Cross-layer dependencies that bypass layers

---

## Law 3: Code Quality

### Must Do

1. **Type Safety** - Use TypeScript/type hints strictly
2. **Error Handling** - All async operations must have error handling
3. **Testing** - New features require test coverage
4. **Documentation** - Public APIs must be documented

### Must Avoid

1. **Any/unknown types** - Explicit types required
2. **Silent failures** - All errors must be logged/handled
3. **Magic strings** - Use constants/enums
4. **Nested callbacks** - Use async/await

---

## Law 4: Security

### Non-Negotiable

1. **No secrets in code** - Use environment variables
2. **No hardcoded credentials** - Use secret management
3. **Validate all inputs** - Never trust user input
4. **Sanitize outputs** - Prevent XSS/injection

### Protected Files

- `.env` files - Never commit
- Credential files - Never read content aloud
- Private keys - Never expose

---

## Law 5: Performance

### Required

1. **Lazy loading** - Load resources on demand
2. **Pagination** - Never load unlimited records
3. **Caching** - Cache expensive operations
4. **Async operations** - Don't block main thread

### Thresholds

| Metric | Maximum |
|--------|---------|
| API response | 500ms |
| Page load | 3s |
| Database query | 100ms |
| Bundle size | 500KB |

---

## Law 6: Git Workflow

### Commit Standards

1. **Message format**: `type(scope): description`
2. **Types**: feat, fix, refactor, docs, test, chore
3. **Atomic commits**: One logical change per commit

### Forbidden

- Committing to main/master directly (without review)
- Force pushing to shared branches
- Committing sensitive files

---

## Law 7: Dependency Management

### Rules

1. **Lock files** - Always commit package-lock.json/yarn.lock
2. **Version pinning** - Use exact versions in production
3. **Security updates** - Apply promptly
4. **Minimal dependencies** - Avoid bloat

### Forbidden

- Installing deprecated packages
- Using packages with known vulnerabilities
- Adding dependencies without justification

---

## Enforcement

### Hook-Based Enforcement

The constitution-enforcer hook intercepts Edit and Write tool calls:

1. **Sample** - Check if this edit should be validated (based on sampling rate)
2. **Load** - Read constitution.yaml and get applicable rules
3. **Match** - Determine file domain and applicable rules
4. **Validate** - Check edit content against rules
5. **Report** - Format violations with Stop → Explain → Suggest → Refactor flow

### Violation Response

When a violation is detected:

1. **Stop** - Do not proceed with the violating action
2. **Explain** - Describe why this violates the constitution
3. **Suggest** - Provide compliant alternative
4. **Refactor** - Auto-fix if `auto_fix: true` in rule

### Auto-Refactor Triggers

Claude will automatically refactor when:

- Direct database access detected outside repository
- Hardcoded secrets detected
- Missing error handling detected
- Type safety violations detected

---

## Amendment Process

To modify this constitution:

1. Create a proposal document
2. Review impact on existing code
3. Update this file with version bump
4. Update `.claude/config/constitution.yaml` rules
5. Apply changes to codebase

---

## Quick Reference

### Always Do
- Use repository pattern for data access
- Handle all errors explicitly
- Use environment variables for config
- Write tests for new features

### Never Do
- Store secrets in code
- Bypass architectural layers
- Commit to main directly
- Use any/unknown types

### CLI Commands
- `ccasp constitution-init` - Initialize or update constitution
- `/ai-constitution-framework` - View constitution documentation
- `/claude-audit` - Audit configuration against best practices

---

*This constitution is enforced by Claude Code for {{project.name}}*
*YAML enforcement powered by constitution-enforcer hook with 1-in-20 sampling*
