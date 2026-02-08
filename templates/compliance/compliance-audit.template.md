# Commercial Compliance Audit Report

**Project**: {{project_name}}
**Vision**: {{vision_slug}}
**Audit Date**: {{audit_date}}
**Competitors Analyzed**: {{competitor_count}}

---

## 1. Source Code Originality

| Check | Status | Notes |
|-------|--------|-------|
| No copied/translated proprietary code | {{code_status}} | {{code_notes}} |
| No recreated internal architectures | {{arch_status}} | {{arch_notes}} |
| No replicated file structures | {{file_status}} | {{file_notes}} |
| No proprietary API patterns copied | {{api_status}} | {{api_notes}} |

## 2. UI/UX Distinctiveness

| Check | Status | Notes |
|-------|--------|-------|
| Visual layout is original | {{layout_status}} | {{layout_notes}} |
| Color system is distinct | {{color_status}} | {{color_notes}} |
| Navigation model is different | {{nav_status}} | {{nav_notes}} |
| Interaction patterns are original | {{interaction_status}} | {{interaction_notes}} |
| Animations/transitions are distinct | {{animation_status}} | {{animation_notes}} |

## 3. Naming & Branding

| Check | Status | Notes |
|-------|--------|-------|
| Feature names are original | {{feature_name_status}} | {{feature_name_notes}} |
| No competitor terminology used | {{terminology_status}} | {{terminology_notes}} |
| Product positioning is independent | {{positioning_status}} | {{positioning_notes}} |
| Marketing copy is original | {{marketing_status}} | {{marketing_notes}} |

## 4. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| No scraping/automated imports | {{scraping_status}} | {{scraping_notes}} |
| Only generic data formats used | {{format_status}} | {{format_notes}} |
| No proprietary API dependencies | {{api_dep_status}} | {{api_dep_notes}} |

## 5. Dependency Licensing

| Check | Status | Notes |
|-------|--------|-------|
| All licenses are permissive | {{license_status}} | {{license_notes}} |
| No copyleft conflicts | {{copyleft_status}} | {{copyleft_notes}} |
| Asset licenses verified | {{asset_status}} | {{asset_notes}} |
| Font licenses verified | {{font_status}} | {{font_notes}} |

## 6. Differentiation Summary

### Intentional Differences from Market
{{#each differentiations}}
- **{{area}}**: {{description}}
{{/each}}

### Innovation Points
{{#each innovations}}
- **{{name}}**: {{description}}
{{/each}}

## 7. Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
{{#each risks}}
| {{description}} | {{level}} | {{mitigation}} |
{{/each}}

## 8. Overall Compliance Score

**Score**: {{overall_score}}/100

| Category | Score | Weight |
|----------|-------|--------|
| Source Code | {{code_score}}/100 | 25% |
| UI/UX | {{ux_score}}/100 | 25% |
| Naming | {{naming_score}}/100 | 20% |
| Data | {{data_score}}/100 | 15% |
| Licensing | {{licensing_score}}/100 | 15% |

### Verdict: {{verdict}}

{{#if (eq verdict "PASS")}}
This project meets commercial compliance requirements and is safe to sell.
{{else if (eq verdict "CONDITIONAL")}}
This project has minor issues that should be addressed before commercial release.
{{else}}
This project has compliance issues that MUST be resolved before commercial release.
{{/if}}

---
*CCASP Commercial Compliance Audit v1.0*
