# GitHub Actions Security

## Permissions

### Principle of Least Privilege
Always set minimal `permissions` at the workflow or job level:

```yaml
permissions:
  contents: read
  pull-requests: write  # Only if needed
```

### Never use `permissions: write-all` in production workflows.

## Secrets Management

### Using Secrets
```yaml
env:
  API_TOKEN: ${{ secrets.API_TOKEN }}
```

### OIDC for Cloud Providers
Prefer OIDC tokens over long-lived secrets for AWS, GCP, and Azure:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/deploy
      aws-region: us-east-1
```

## Supply Chain Security

### Pin Action Versions
Use full SHA hashes for third-party actions:
```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```

### Dependabot for Actions
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

## Common Vulnerabilities

1. **Script injection**: Never use `${{ github.event.issue.title }}` in `run:` blocks
2. **Pull request target**: Avoid `pull_request_target` with checkout of PR code
3. **Artifact poisoning**: Validate artifacts before using them
4. **Secret exposure**: Never echo secrets or use them in URLs

## Security Checklist

- [ ] Minimal permissions set at workflow level
- [ ] No `write-all` permissions
- [ ] Third-party actions pinned to SHA
- [ ] Secrets not exposed in logs
- [ ] No script injection vulnerabilities
- [ ] OIDC used for cloud authentication where possible
- [ ] Dependabot enabled for action updates
- [ ] Branch protection rules require status checks
