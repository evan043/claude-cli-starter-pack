# Commercial SaaS Compliance Rules

> **This document defines mandatory architecture, security, and compliance rules for all commercial SaaS applications built through CCASP.**
> It supplements `commercial-compliance-policy.md` (IP/originality rules) with production architecture requirements.

---

## Core Principles

- Rebuild behavior and ideas, not expression or identity
- Plan architecture BEFORE implementation
- Security, scalability, and tenancy are NOT optional
- All applications are treated as SaaS unless explicitly stated otherwise

---

## Multi-Tenancy (DEFAULT ON)

ALL applications MUST be designed as multi-tenant by default.

**Requirements:**
- Tenant isolation at the data layer
- Tenant identifiers on ALL relevant database records
- No shared mutable state across tenants
- Clear tenant resolution strategy (subdomain, header, token, or path)

**Resolution Strategies:**
| Strategy | Example | Best For |
|----------|---------|----------|
| Subdomain | `tenant.app.com` | B2B SaaS with custom domains |
| Header/Token | `X-Tenant-ID` header | API-first applications |
| Path | `/tenant-slug/dashboard` | Simpler deployments |

Single-tenant assumptions are NOT allowed unless explicitly approved by the user.

---

## Role-Based Access Control (RBAC)

ALL applications MUST implement role-level security.

**Minimum Roles:**
| Role | Scope | Description |
|------|-------|-------------|
| User | Tenant | Standard tenant member |
| Admin | Tenant | Tenant administrator |
| Super Admin | System | Platform-wide administrator |

**RBAC MUST apply to:**
- Frontend routes (route guards)
- Backend API endpoints (middleware/decorators)
- Data access and mutations (query filters)

Authorization logic must be explicit, server-side, and documented.

---

## SPA Route Map (REQUIRED)

ALL frontend routes MUST be defined before coding begins.

**Each route must specify:**
| Field | Description |
|-------|-------------|
| URL Path | The route path (e.g., `/app/dashboard`) |
| Auth Required | `public`, `authenticated`, or `role-restricted` |
| Role | Which roles can access (e.g., `user+`, `admin+`, `super_admin`) |
| Tenant Scope | Whether route is tenant-scoped, global, or system |
| Responsibility | Primary UI responsibility |

**Rules:**
- Routing must be explicit and intentional
- No implicit or hidden navigation flows
- Routes must align with user roles and tenancy boundaries
- No UI components may be built unless they map to a defined route

---

## API Architecture (REQUIRED)

**Mandatory:**
- Backend MUST expose RESTful API endpoints
- Frontend MUST NOT directly access the database
- ALL data access flows through authenticated API endpoints

**Each endpoint must specify:**
| Field | Description |
|-------|-------------|
| HTTP Method | GET, POST, PUT, PATCH, DELETE |
| Path | `/api/v1/resource` |
| Auth Required | `public`, `authenticated`, `role-restricted` |
| Role | Minimum role required |
| Tenant Scope | Whether endpoint filters by tenant |
| Description | What the endpoint does |

GraphQL is optional but does NOT replace REST unless explicitly requested.

---

## Security Baselines

- Authentication required for ALL non-public routes and endpoints
- Authorization enforced server-side (NEVER frontend-only)
- Input validation on ALL endpoints (reject invalid data, don't sanitize)
- Secure defaults over convenience
- CSRF protection on state-changing endpoints
- Rate limiting on authentication endpoints

---

## User Personas (REQUIRED)

Every project MUST define at minimum:

1. **Tenant User** — Standard member within a tenant organization
2. **Admin User** — Tenant administrator with management capabilities
3. **System / Service Role** — Platform-wide operations (if applicable)

Personas drive route access, API permissions, and UI visibility.

---

## Licensing & Dependencies

- Track licenses for ALL dependencies and assets
- Avoid copyleft licenses (GPL, AGPL) unless explicitly approved
- Block release if license conflicts exist
- Prefer: MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0

**Blocked licenses:** GPL-2.0, GPL-3.0, AGPL-3.0, SSPL-1.0, BSL-1.1, Elastic-2.0
**Warning licenses:** MPL-2.0, LGPL-2.1, LGPL-3.0

---

## Mandatory Documentation Outputs

Every commercial SaaS project MUST generate and maintain:

| Document | Purpose | Template |
|----------|---------|----------|
| `DESIGN_ORIGIN.md` | Independent creation proof | `design-origin.template.md` |
| `ROUTES.md` | SPA route map with auth + role + tenant scope | `routes.template.md` |
| `API_CONTRACT.md` | API endpoints, roles, tenancy rules | `api-contract.template.md` |
| `RBAC.md` | Roles, permissions, access matrix | `rbac.template.md` |

These documents are living artifacts — updated as the application evolves.

---

## Self-Audit Checklist

Before finalizing ANY phase or release, verify:

1. [ ] All routes are defined and documented in ROUTES.md
2. [ ] Multi-tenancy is enforced at data layer and API layer
3. [ ] RBAC is applied consistently to routes, APIs, and data access
4. [ ] APIs are the ONLY data access layer (no direct DB from frontend)
5. [ ] UI maps cleanly to defined routes (no orphan components)
6. [ ] No proprietary inspiration crossed into expression (IP compliance)
7. [ ] All dependencies are license-safe (no blocked licenses)

**If ANY item fails → STOP → Propose a safer or more scalable alternative.**

---

## Default Fallback

When uncertain about any architectural or compliance decision:

1. Do NOT implement
2. Ask for clarification OR
3. Propose a more secure, more scalable, more original approach

**The most conservative, production-safe option is always the correct default.**
