# GitHub Actions Best Practices

## Workflow Optimization

### Caching Dependencies
```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Matrix Builds
```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
    os: [ubuntu-latest, windows-latest]
  fail-fast: false
```

### Concurrency Control
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Job Structure

### Reusable Workflows
- Extract common patterns into reusable workflows in `.github/workflows/`
- Use `workflow_call` trigger for shared CI steps
- Pass inputs and secrets explicitly

### Conditional Execution
```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

### Artifact Sharing Between Jobs
```yaml
- uses: actions/upload-artifact@v4
  with:
    name: build-output
    path: dist/
    retention-days: 1
```

## Performance Tips

1. **Use `actions/checkout` with `fetch-depth: 0`** only when full history is needed
2. **Prefer `npm ci` over `npm install`** for deterministic builds
3. **Use Docker layer caching** for container builds
4. **Run independent jobs in parallel** rather than sequential steps
5. **Use `timeout-minutes`** to prevent hanging workflows
6. **Use `continue-on-error: true`** for non-critical steps
