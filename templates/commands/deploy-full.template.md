---
description: Parallel full-stack deployment (backend + frontend)
model: haiku
---

# /deploy-full - Full-Stack Deployment

Deploy both backend and frontend in parallel for fastest deployment.

{{#if deployment.backend.platform}}
{{#if deployment.frontend.platform}}

## Deployment Targets

| Component | Platform | URL |
|-----------|----------|-----|
| Backend | {{deployment.backend.platform}} | {{deployment.backend.productionUrl}} |
| Frontend | {{deployment.frontend.platform}} | {{deployment.frontend.productionUrl}} |

## Pre-deployment Checklist

```bash
# 1. Verify clean working directory
git status

# 2. Ensure on correct branch
git branch --show-current

# 3. Run tests
{{#if testing.e2e.testCommand}}
{{testing.e2e.testCommand}}
{{else}}
npm test
{{/if}}
```

---

## Backend Deployment

{{#if (eq deployment.backend.platform "railway")}}
### Railway

Using Railway MCP server for deployment:

```javascript
// Trigger deployment via Railway MCP
mcp__railway-mcp-server__deployment_trigger({
  projectId: "{{deployment.backend.projectId}}",
  serviceId: "{{deployment.backend.serviceId}}",
  environmentId: "{{deployment.backend.environmentId}}"
})
```

Monitor deployment:
```javascript
mcp__railway-mcp-server__deployment_logs({
  projectId: "{{deployment.backend.projectId}}",
  serviceId: "{{deployment.backend.serviceId}}"
})
```
{{/if}}

{{#if (eq deployment.backend.platform "heroku")}}
### Heroku

```bash
# Push to Heroku
git push heroku {{versionControl.defaultBranch}}

# Check logs
heroku logs --tail
```
{{/if}}

{{#if (eq deployment.backend.platform "render")}}
### Render

```bash
# Render auto-deploys from git push
git push origin {{versionControl.defaultBranch}}

# Or trigger manual deploy via API
curl -X POST "https://api.render.com/v1/services/{{deployment.backend.serviceId}}/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY"
```
{{/if}}

{{#if (eq deployment.backend.platform "fly")}}
### Fly.io

```bash
# Deploy to Fly
fly deploy

# Check status
fly status
```
{{/if}}

{{#if (eq deployment.backend.platform "vercel")}}
### Vercel (Serverless)

```bash
vercel --prod
```
{{/if}}

{{#if (eq deployment.backend.platform "self-hosted")}}
### Self-Hosted

```bash
# SSH deploy
ssh {{deployment.backend.selfHostedConfig.sshUser}}@{{deployment.backend.selfHostedConfig.sshHost}} -p {{deployment.backend.selfHostedConfig.sshPort}} \
  'cd {{deployment.backend.selfHostedConfig.appPath}} && git pull && {{deployment.backend.selfHostedConfig.deployScript}}'
```
{{/if}}

---

## Frontend Deployment

{{#if (eq deployment.frontend.platform "cloudflare")}}
### Cloudflare Pages

```bash
# Clean and build
rm -rf {{frontend.distDir}}
{{frontend.buildCommand}}

# Deploy
npx wrangler pages deploy {{frontend.distDir}} --project-name={{deployment.frontend.projectName}}
```
{{/if}}

{{#if (eq deployment.frontend.platform "vercel")}}
### Vercel

```bash
vercel --prod
```
{{/if}}

{{#if (eq deployment.frontend.platform "netlify")}}
### Netlify

```bash
# Build
{{frontend.buildCommand}}

# Deploy
netlify deploy --prod --dir={{frontend.distDir}}
```
{{/if}}

{{#if (eq deployment.frontend.platform "github-pages")}}
### GitHub Pages

```bash
# Build and deploy (assumes gh-pages package)
{{frontend.buildCommand}}
npm run deploy
```
{{/if}}

{{#if (eq deployment.frontend.platform "railway")}}
### Railway (Static)

```bash
# Push triggers auto-deploy
git push origin {{versionControl.defaultBranch}}
```
{{/if}}

---

## Verification

### Backend Health Check

```bash
curl {{deployment.backend.productionUrl}}{{backend.healthEndpoint}}
```

### Frontend Verification

1. Open {{deployment.frontend.productionUrl}}
2. Verify page loads correctly
3. Check browser console for errors
4. Test critical user flows

### E2E Smoke Test (Optional)

```bash
{{#if testing.e2e.testCommand}}
{{testing.e2e.testCommand}} --grep "smoke"
{{else}}
npx playwright test --grep "smoke"
{{/if}}
```

---

## Rollback Procedures

### Backend Rollback

{{#if (eq deployment.backend.platform "railway")}}
```javascript
// List recent deployments
mcp__railway-mcp-server__deployment_list({
  projectId: "{{deployment.backend.projectId}}",
  serviceId: "{{deployment.backend.serviceId}}"
})

// Redeploy previous version
mcp__railway-mcp-server__deployment_rollback({
  projectId: "{{deployment.backend.projectId}}",
  serviceId: "{{deployment.backend.serviceId}}",
  deploymentId: "<previous-deployment-id>"
})
```
{{else}}
```bash
# Revert commit and redeploy
git revert HEAD
git push origin {{versionControl.defaultBranch}}
```
{{/if}}

### Frontend Rollback

```bash
# Revert to previous build
git revert HEAD
{{frontend.buildCommand}}
{{deployment.frontend.deployCommand}}
```

{{else}}

## Frontend Deployment Not Configured

Frontend deployment platform is not configured.

Run `/menu` → Project Settings → Deployment Platforms to configure.

{{/if}}
{{else}}

## Backend Deployment Not Configured

Backend deployment platform is not configured.

Run `/menu` → Project Settings → Deployment Platforms to configure.

{{/if}}

---

*Generated from tech-stack.json template*
