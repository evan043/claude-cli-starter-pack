# Utility Scripts Library

Standalone scripts for deployment validation, logging analysis, and project health monitoring.

## Available Scripts

| Script | Purpose | Language |
|--------|---------|----------|
| [validate-deployment.js](validate-deployment.js) | Pre-deployment environment validation | Node.js |
| [poll-deployment-status.js](poll-deployment-status.js) | Poll deployment until complete | Node.js |
| [roadmap-scanner.js](roadmap-scanner.js) | Multi-roadmap progress dashboard | Node.js |
| [analyze-delegation-log.js](analyze-delegation-log.js) | Model usage analysis from JSONL logs | Node.js |
| [autonomous-decision-logger.js](autonomous-decision-logger.js) | JSONL audit trail for agent decisions | Node.js |
| [phase-validation-gates.js](phase-validation-gates.js) | 5-gate validation before phase transitions | Node.js |
| [git-history-analyzer.py](git-history-analyzer.py) | Security audit for sensitive data in git | Python |

## Installation

Copy scripts to your project:

```bash
# Copy all scripts
cp -r templates/scripts/ .claude/scripts/

# Or install via ccasp
ccasp install-scripts
```

## Usage

### Pre-Deployment Validation

```bash
# Validate Railway environment
node .claude/scripts/validate-deployment.js --platform railway

# Validate Cloudflare Pages
node .claude/scripts/validate-deployment.js --platform cloudflare
```

### Deployment Polling

```bash
# Poll Railway deployment until complete
node .claude/scripts/poll-deployment-status.js \
  --platform railway \
  --project-id YOUR_PROJECT_ID \
  --timeout 300

# Poll Cloudflare Pages deployment
node .claude/scripts/poll-deployment-status.js \
  --platform cloudflare \
  --project-name your-project
```

### Roadmap Scanning

```bash
# Scan all roadmaps in current directory
node .claude/scripts/roadmap-scanner.js

# Generate JSON report
node .claude/scripts/roadmap-scanner.js --output json
```

### Log Analysis

```bash
# Analyze delegation log for model usage
node .claude/scripts/analyze-delegation-log.js \
  ~/.claude/logs/delegation.jsonl

# Generate cost estimate
node .claude/scripts/analyze-delegation-log.js \
  ~/.claude/logs/delegation.jsonl --cost-estimate
```

### Git History Audit

```bash
# Check for sensitive data in git history
python .claude/scripts/git-history-analyzer.py

# Check specific patterns
python .claude/scripts/git-history-analyzer.py \
  --patterns "password|secret|api.key"
```

## Integration with Claude Code

These scripts can be invoked via Claude Code commands:

```markdown
<!-- .claude/commands/validate-deploy.md -->
Run the deployment validation script:
\`\`\`bash
node .claude/scripts/validate-deployment.js --platform {{platform}}
\`\`\`
```

## Environment Variables

Some scripts require environment variables:

| Variable | Used By | Description |
|----------|---------|-------------|
| `RAILWAY_API_TOKEN` | validate-deployment.js | Railway API access |
| `CLOUDFLARE_API_TOKEN` | validate-deployment.js | Cloudflare API access |
| `GITHUB_TOKEN` | git-history-analyzer.py | GitHub API (optional) |
