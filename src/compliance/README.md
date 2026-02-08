# CCASP Commercial Compliance Framework

## Overview

Ensures commercial applications built via Vision Init are legally safe to sell by enforcing originality in code, UI/UX, naming, and licensing.

## How It Works

1. **Detection**: When `/vision-init` parses a prompt containing URLs or product references, the compliance framework activates
2. **Policy Injection**: The commercial compliance policy is injected into all agent prompts
3. **Competitor Analysis**: Deep research of competitors focuses on differentiation opportunities, not cloning
4. **Documentation**: Generates DESIGN_ORIGIN.md and compliance audit reports
5. **Self-Audit**: Pre-release checklist ensures all compliance requirements are met

## Key Files

- `templates/compliance/commercial-compliance-policy.md` — The compliance rules
- `templates/compliance/design-origin.template.md` — Per-project origin documentation
- `templates/compliance/compliance-audit.template.md` — Audit report template
- `src/compliance/index.js` — Compliance engine (detection, analysis, audit)

## Usage

Automatic (via vision-init):
```
/vision-init Build a better version of Notion with collaborative editing
```

Manual:
```
/compliance-check https://competitor.com
```
