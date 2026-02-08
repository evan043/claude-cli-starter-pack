# Role-Based Access Control (RBAC) — {{project_name}}

> Generated: {{created_date}}
> This document defines user personas, roles, permissions, and access control rules.

---

## User Personas

### 1. Tenant User
- **Scope**: Within their tenant organization
- **Capabilities**: Use core application features, manage own profile
- **Limitations**: Cannot manage other users or tenant settings

### 2. Admin User
- **Scope**: Within their tenant organization
- **Capabilities**: All User capabilities + user management, tenant settings, billing
- **Limitations**: Cannot access other tenants or system-level features

### 3. Super Admin (System Role)
- **Scope**: Platform-wide
- **Capabilities**: All Admin capabilities + tenant management, platform analytics, system config
- **Limitations**: Should be restricted to platform operators only

---

## Role Definitions

| Role | Level | Scope | Description |
|------|-------|-------|-------------|
| `user` | 1 | Tenant | Standard tenant member |
| `admin` | 2 | Tenant | Tenant administrator |
| `super_admin` | 3 | System | Platform-wide administrator |

**Role hierarchy**: `super_admin` > `admin` > `user`
A higher role inherits all permissions of lower roles.

---

## Permission Matrix

### Core Application Permissions

| Permission | User | Admin | Super Admin |
|------------|:----:|:-----:|:-----------:|
| View dashboard | Yes | Yes | Yes |
| Manage own profile | Yes | Yes | Yes |
| Use core features | Yes | Yes | Yes |
| Invite users | — | Yes | Yes |
| Remove users | — | Yes | Yes |
| Change user roles | — | Yes | Yes |
| Manage tenant settings | — | Yes | Yes |
| View tenant billing | — | Yes | Yes |
| Create tenants | — | — | Yes |
| Delete tenants | — | — | Yes |
| View platform analytics | — | — | Yes |
| Manage system config | — | — | Yes |

---

## Frontend Route Access Matrix

| Route | User | Admin | Super Admin |
|-------|:----:|:-----:|:-----------:|
| `/app/dashboard` | Yes | Yes | Yes |
| `/app/profile` | Yes | Yes | Yes |
| `/app/settings` | Yes | Yes | Yes |
| `/admin/dashboard` | — | Yes | Yes |
| `/admin/users` | — | Yes | Yes |
| `/admin/settings` | — | Yes | Yes |
| `/system/tenants` | — | — | Yes |
| `/system/analytics` | — | — | Yes |

---

## API Endpoint Access Matrix

| Endpoint | User | Admin | Super Admin |
|----------|:----:|:-----:|:-----------:|
| `GET /api/v1/me` | Yes | Yes | Yes |
| `PUT /api/v1/me` | Yes | Yes | Yes |
| `GET /api/v1/dashboard` | Yes | Yes | Yes |
| `GET /api/v1/admin/users` | — | Yes | Yes |
| `POST /api/v1/admin/users/invite` | — | Yes | Yes |
| `PUT /api/v1/admin/users/:id/role` | — | Yes | Yes |
| `DELETE /api/v1/admin/users/:id` | — | Yes | Yes |
| `GET /api/v1/system/tenants` | — | — | Yes |
| `POST /api/v1/system/tenants` | — | — | Yes |
| `GET /api/v1/system/analytics` | — | — | Yes |

---

## Data Access Rules

### Tenant Isolation
- ALL database queries for tenant-scoped data MUST include tenant filter
- Users can ONLY access data belonging to their own tenant
- Admins can manage ALL data within their tenant
- Super Admins can access data across ALL tenants

### Row-Level Security
- Tenant ID MUST be present on all tenant-scoped database records
- Queries MUST filter by tenant ID from the authenticated session
- Direct database access from frontend is FORBIDDEN

### Ownership Rules
- Users can only modify resources they own (unless admin)
- Admins can modify any resource within their tenant
- Delete operations require role verification server-side

---

## Tenant Boundary Rules

| Action | Within Tenant | Cross-Tenant |
|--------|:------------:|:------------:|
| Read own data | Yes | — |
| Read tenant data | Yes | — |
| Write own data | Yes | — |
| Write tenant data | Admin+ | — |
| Read other tenant | — | Super Admin |
| Write other tenant | — | Super Admin |

---

## Implementation Notes

- RBAC checks MUST be enforced server-side (never frontend-only)
- Frontend role checks are for UX only (hiding/showing UI elements)
- API middleware MUST verify role before processing request
- Failed authorization returns HTTP 403 with `FORBIDDEN` error code
- All role changes must update this document BEFORE implementation
