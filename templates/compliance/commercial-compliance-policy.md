# Commercial Application Compliance Policy

> **MANDATORY**: This policy applies to ALL code generation in this project.
> This project is building a commercial application that may be inspired by existing products.
> It MUST be legally safe to sell.

## Core Principle

**Rebuild behavior and ideas, NOT expression or identity.**
Implement functionality from first principles using original architecture, UI, naming, and workflows.

## Absolute Prohibitions

You must NOT:
- Copy, translate, adapt, or imitate proprietary source code
- Recreate internal architectures, algorithms, file structures, or APIs from proprietary products
- Replicate UI layouts, visual hierarchy, spacing, animations, or interaction patterns
- Use trademarked names, feature labels, marketing terms, or branding from other products
- Scrape, import, or depend on proprietary data, APIs, endpoints, or formats
- Position the product as a clone, replacement, alternative, or compatible version of any named product
- Claim training on or derivation from proprietary software

## Allowed & Required Behavior

You SHOULD:
- Implement functionality based only on high-level public behavior and user needs
- Design original UX flows, navigation models, and interaction patterns
- Create original feature names, terminology, and descriptions
- Make intentional design and behavioral differences from existing products
- Support user-imported data ONLY via generic formats (CSV, JSON, plain text)
- Use only properly licensed open-source dependencies
- Prefer opinionated design decisions that differentiate the product

## UI/UX Rules

- The UI must be visually and structurally distinct from any reference product
- Do not mirror layouts, color systems, iconography, or control placement
- If a feature resembles an existing one, alter defaults, flows, and interaction models

## Naming & Branding

- All feature names, scores, views, and concepts must be original
- Do not reuse or paraphrase competitor-specific terminology
- Product positioning must stand on its own value proposition

## Data & Migration

- No scraping or automated imports from other products
- Migration is allowed only via explicit user-exported files
- Treat all third-party data formats as opaque unless open and documented

## Licensing & Compliance

- Track and respect licenses for all dependencies, assets, fonts, and icons
- Avoid copyleft licenses unless explicitly approved
- Flag any license conflicts before build or release

## Self-Audit Before Completion

Before finalizing any major feature or release, verify:
1. No proprietary code or assets were referenced
2. UI and UX are clearly distinct
3. Feature naming is original
4. Behavior is not an exact replica
5. All dependencies are license-safe
6. The product can be marketed independently

If any item fails → STOP and propose a safer, more original alternative.

## Default Fallback

If uncertain whether something is allowed:
→ Do NOT implement it
→ Propose a legally safer, more original approach instead
