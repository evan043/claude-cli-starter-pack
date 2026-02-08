# SPA Route Map — {{project_name}}

> Generated: {{created_date}}
> This document defines all frontend routes, their authentication requirements, role restrictions, and tenant scope.

---

## Tenant Resolution Strategy

| Setting | Value |
|---------|-------|
| Strategy | {{tenant_strategy}} |
| Example | {{tenant_example}} |

---

## Route Table

### Public Routes (No Authentication)

| Path | Auth | Role | Tenant Scope | Responsibility |
|------|------|------|--------------|----------------|
| `/` | public | — | global | Landing page |
| `/login` | public | — | global | Authentication |
| `/register` | public | — | global | User registration |
| `/forgot-password` | public | — | global | Password recovery |

### Authenticated Routes (Login Required)

| Path | Auth | Role | Tenant Scope | Responsibility |
|------|------|------|--------------|----------------|
| `/app/dashboard` | authenticated | user+ | tenant | Main dashboard |
| `/app/profile` | authenticated | user+ | tenant | User profile |
| `/app/settings` | authenticated | user+ | tenant | User settings |

### Admin Routes (Admin Role Required)

| Path | Auth | Role | Tenant Scope | Responsibility |
|------|------|------|--------------|----------------|
| `/admin/dashboard` | role-restricted | admin+ | tenant | Admin overview |
| `/admin/users` | role-restricted | admin+ | tenant | User management |
| `/admin/settings` | role-restricted | admin+ | tenant | Tenant settings |

### System Routes (Super Admin Only)

| Path | Auth | Role | Tenant Scope | Responsibility |
|------|------|------|--------------|----------------|
| `/system/tenants` | role-restricted | super_admin | global | Tenant management |
| `/system/analytics` | role-restricted | super_admin | global | Platform analytics |

---

## Route Guards

### Authentication Guard
- Redirects unauthenticated users to `/login`
- Preserves intended destination for post-login redirect
- Applied to all routes except those marked `public`

### Role Guard
- Checks user role against route requirement
- `user+` = user, admin, super_admin
- `admin+` = admin, super_admin
- `super_admin` = super_admin only
- Returns 403 page if insufficient role

### Tenant Guard
- Ensures user belongs to the resolved tenant
- Prevents cross-tenant access via URL manipulation
- Applied to all tenant-scoped routes

---

## Notes

- Routes marked `global` are accessible regardless of tenant context
- Routes marked `tenant` require a valid tenant to be resolved
- All route changes must update this document BEFORE implementation
- No UI components may be built unless they map to a route defined here
