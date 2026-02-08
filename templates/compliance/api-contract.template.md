# API Contract — {{project_name}}

> Generated: {{created_date}}
> Base URL: `{{base_url}}`
> This document defines all backend API endpoints, their authentication, role requirements, and tenant scope.

---

## Authentication Scheme

| Setting | Value |
|---------|-------|
| Method | Bearer Token (JWT) |
| Header | `Authorization: Bearer <token>` |
| Tenant Resolution | {{tenant_strategy}} |
| Token Expiry | Configurable per environment |

---

## Versioning

- API version prefix: `/api/v1/`
- Breaking changes require version bump
- Deprecated endpoints return `Sunset` header

---

## Endpoint Table

### Public Endpoints (No Authentication)

| Method | Path | Auth | Role | Tenant | Description |
|--------|------|------|------|--------|-------------|
| POST | `/api/v1/auth/login` | public | — | — | Authenticate user |
| POST | `/api/v1/auth/register` | public | — | — | Register new user |
| POST | `/api/v1/auth/forgot-password` | public | — | — | Request password reset |
| GET | `/api/v1/health` | public | — | — | Health check |

### Authenticated Endpoints (Login Required)

| Method | Path | Auth | Role | Tenant | Description |
|--------|------|------|------|--------|-------------|
| GET | `/api/v1/me` | auth | user+ | — | Current user profile |
| PUT | `/api/v1/me` | auth | user+ | — | Update user profile |
| POST | `/api/v1/auth/logout` | auth | user+ | — | Invalidate session |
| POST | `/api/v1/auth/refresh` | auth | user+ | — | Refresh token |

### Tenant-Scoped Endpoints

| Method | Path | Auth | Role | Tenant | Description |
|--------|------|------|------|--------|-------------|
| GET | `/api/v1/dashboard` | auth | user+ | scoped | Dashboard data |

### Admin Endpoints (Admin Role Required)

| Method | Path | Auth | Role | Tenant | Description |
|--------|------|------|------|--------|-------------|
| GET | `/api/v1/admin/users` | auth | admin+ | scoped | List tenant users |
| POST | `/api/v1/admin/users/invite` | auth | admin+ | scoped | Invite user to tenant |
| PUT | `/api/v1/admin/users/:id/role` | auth | admin+ | scoped | Change user role |
| DELETE | `/api/v1/admin/users/:id` | auth | admin+ | scoped | Remove user from tenant |

### System Endpoints (Super Admin Only)

| Method | Path | Auth | Role | Tenant | Description |
|--------|------|------|------|--------|-------------|
| GET | `/api/v1/system/tenants` | auth | super_admin | global | List all tenants |
| POST | `/api/v1/system/tenants` | auth | super_admin | global | Create tenant |
| GET | `/api/v1/system/analytics` | auth | super_admin | global | Platform metrics |

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": []
  }
}
```

### Standard Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body or parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Insufficient role or tenant mismatch |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate or state conflict |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Rate Limiting

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 10 requests | 15 minutes |
| API (authenticated) | 100 requests | 1 minute |
| API (admin) | 200 requests | 1 minute |
| Health check | Unlimited | — |

---

## Notes

- ALL endpoints validate input server-side (never trust client data)
- Tenant-scoped endpoints MUST filter data by the authenticated user's tenant
- Admin endpoints MUST verify the user is an admin of the target tenant
- System endpoints MUST verify super_admin role
- Frontend MUST NOT access the database directly — all data flows through these APIs
- All endpoint changes must update this document BEFORE implementation
