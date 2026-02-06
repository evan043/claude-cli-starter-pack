# Common GitHub Actions

## Core Actions

| Action | Version | Purpose |
|--------|---------|---------|
| `actions/checkout` | v4 | Clone repository |
| `actions/setup-node` | v4 | Install Node.js |
| `actions/setup-python` | v5 | Install Python |
| `actions/cache` | v4 | Cache dependencies |
| `actions/upload-artifact` | v4 | Upload build artifacts |
| `actions/download-artifact` | v4 | Download artifacts between jobs |

## Deployment Actions

| Action | Purpose |
|--------|---------|
| `cloudflare/wrangler-action` | Deploy to Cloudflare Workers/Pages |
| `amondnet/vercel-action` | Deploy to Vercel |
| `docker/build-push-action` | Build and push Docker images |
| `aws-actions/configure-aws-credentials` | AWS OIDC authentication |

## Testing & Quality

| Action | Purpose |
|--------|---------|
| `cypress-io/github-action` | Run Cypress E2E tests |
| `microsoft/playwright-github-action` | Setup Playwright |
| `codecov/codecov-action` | Upload coverage to Codecov |
| `github/super-linter` | Multi-language linting |

## PR & Release

| Action | Purpose |
|--------|---------|
| `peter-evans/create-pull-request` | Create PRs programmatically |
| `release-drafter/release-drafter` | Auto-draft releases |
| `amannn/action-semantic-pull-request` | Enforce PR title conventions |
| `dependabot/fetch-metadata` | Get Dependabot PR metadata |

## Node.js CI Template
```yaml
name: CI
on: [push, pull_request]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

## Python CI Template
```yaml
name: CI
on: [push, pull_request]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install -r requirements.txt
      - run: python -m pytest
```
