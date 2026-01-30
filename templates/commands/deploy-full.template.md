---
description: Parallel full-stack deployment (backend + frontend)
model: haiku
---

# /deploy-full - Full-Stack Deployment

Deploy both backend and frontend in parallel for fastest deployment.

## Prerequisites

- Backend deployed on {{deployment.backend.platform}}
- Frontend deployed on {{deployment.frontend.platform}}
- Production URLs configured

## Deployment Targets

| Component | Platform | URL |
|-----------|----------|-----|
| Backend | {{deployment.backend.platform}} | {{urls.production.backend}} |
| Frontend | {{deployment.frontend.platform}} | {{urls.production.frontend}} |

## Workflow

### Step 1: Pre-deployment Checks

```bash
# Verify no uncommitted changes
git status

# Ensure on correct branch
git branch --show-current
```

### Step 2: Deploy Backend

{{#if (eq deployment.backend.platform "railway")}}
Using Railway MCP:
```javascript
// Trigger deployment via Railway MCP
mcp__railway-mcp-server__deployment_trigger({
  projectId: "{{deployment.backend.projectId}}",
  serviceId: "{{deployment.backend.serviceId}}",
  environmentId: "{{deployment.backend.environmentId}}"
})
```
{{/if}}

{{#if (eq deployment.backend.platform "heroku")}}
```bash
git push heroku main
```
{{/if}}

{{#if (eq deployment.backend.platform "self-hosted")}}
```bash
# SSH to server and pull latest
ssh user@server 'cd /app && git pull && ./deploy.sh'
```
{{/if}}

### Step 3: Deploy Frontend

```bash
# Clean build
rm -rf {{frontend.distDir}}

# Build
{{frontend.buildCommand}}

# Deploy
{{deployment.frontend.deployCommand}}
```

### Step 4: Verify Deployment

1. **Backend Health Check**:
   ```bash
   curl {{urls.production.backend}}{{backend.healthEndpoint}}
   ```

2. **Frontend Verification**:
   - Open {{urls.production.frontend}}
   - Verify page loads correctly
   - Check browser console for errors

3. **E2E Smoke Test** (optional):
   ```bash
   {{testing.e2e.testCommand}} --grep "smoke"
   ```

## Rollback

If deployment fails:

### Backend Rollback
{{#if (eq deployment.backend.platform "railway")}}
```javascript
// Use Railway MCP to rollback to previous deployment
mcp__railway-mcp-server__deployment_list({
  projectId: "{{deployment.backend.projectId}}",
  serviceId: "{{deployment.backend.serviceId}}"
})
// Then redeploy previous good deployment
```
{{/if}}

### Frontend Rollback
```bash
# Revert to previous commit
git revert HEAD
{{frontend.buildCommand}}
{{deployment.frontend.deployCommand}}
```

## Environment Variables

Backend requires these environment variables on {{deployment.backend.platform}}:
- `DATABASE_URL` - Database connection string
- `NODE_ENV` or `ENVIRONMENT` - Set to `production`

---

*Generated from tech-stack.json template*
