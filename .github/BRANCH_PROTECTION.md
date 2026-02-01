# Branch Protection & Security Setup

Configure these settings in GitHub repo settings → Branches → Add rule.

## Main/Master Branch Protection

**Branch name pattern:** `main` or `master`

### Required Settings

- [x] **Require a pull request before merging**
  - [x] Require approvals: 1 (or more for team)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [ ] Require review from Code Owners (optional)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - Required checks:
    - `Lint & Syntax Check`
    - `Test (Node 20 on ubuntu-latest)`
    - `Package Build`
    - `Integration Test`
    - `npm Audit` (security)
    - `CodeQL Analysis` (security)

- [x] **Require conversation resolution before merging**

- [ ] **Require signed commits** (optional, recommended for enterprise)

- [x] **Require linear history** (keeps git history clean)

- [ ] **Include administrators** (optional - allows admins to bypass)

- [x] **Restrict who can push to matching branches**
  - Only allow: `github-actions[bot]` (for automated releases)

### Lock Branch
- [ ] Lock branch (only for archived/deprecated branches)

## Feature Branch Naming Convention

| Pattern | Purpose | Auto-canary |
|---------|---------|-------------|
| `ccasp-*` | Worktree development branches | Yes |
| `feature/*` | New features | Yes |
| `fix/*` | Bug fixes | No |
| `canary/*` | Explicit canary testing | Yes |
| `docs/*` | Documentation only | No |

---

## Secrets Required

Configure in Settings → Secrets and variables → Actions:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `NPM_TOKEN` | npm access token with publish permissions | `release.yml`, `canary.yml` |

### NPM_TOKEN Setup (Step-by-Step)

#### Step 1: Generate Token on npm

1. Go to **https://www.npmjs.com** and log in
2. Click your profile icon → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select token type: **Automation** (recommended for CI/CD)
   - "Automation" tokens bypass 2FA for publishing
   - "Publish" tokens require 2FA confirmation
5. Click **Generate Token**
6. **COPY THE TOKEN NOW** - you won't see it again!

```
Token format: npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Step 2: Add Token to GitHub Secrets

1. Go to your GitHub repo: **https://github.com/evan043/claude-cli-advanced-starter-pack**
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Fill in:
   - **Name:** `NPM_TOKEN`
   - **Secret:** Paste your npm token
5. Click **Add secret**

#### Security FAQ

**Q: Can others see my NPM_TOKEN?**
**A: No.** GitHub secrets are:
- Encrypted at rest using libsodium sealed boxes
- Never exposed in logs (automatically masked as `***`)
- Not readable by anyone - not even repo admins
- Not passed to workflows triggered by forked repo PRs

**Q: What if someone forks my repo?**
**A:** Secrets are NOT available to:
- Workflows triggered by pull requests from forks
- Anyone who forks the repo
- Public Actions logs

**Q: What permissions does the token have?**
**A:** The "Automation" token can only:
- Publish packages you own
- Cannot read private packages
- Cannot manage your npm account

**Q: How do I rotate the token?**
**A:**
1. Generate new token on npm
2. Update the secret in GitHub (same name overwrites)
3. Revoke old token on npm

---

## Workflow Permissions

In Settings → Actions → General:

- **Workflow permissions:** Read and write permissions
- **Allow GitHub Actions to create and approve pull requests:** ✅

---

## Security Workflows

The `security.yml` workflow runs these checks:

| Check | Tool | What it Detects |
|-------|------|-----------------|
| npm Audit | npm | Known CVEs in dependencies |
| CodeQL | GitHub | SQL injection, XSS, code quality issues |
| Secret Scan | TruffleHog | Leaked API keys, passwords, tokens |
| Semgrep SAST | Semgrep | Security anti-patterns in code |
| License Check | license-checker | GPL, AGPL, other copyleft licenses |
| SBOM | CycloneDX | Software bill of materials for compliance |
| Dependency Review | GitHub | Malicious packages in PRs |

### Security Check Schedule

- **On every PR:** All checks run
- **On push to main:** All checks run
- **Weekly (Monday 9am UTC):** Full scan via cron

---

## Recommended Rulesets (GitHub Enterprise)

For advanced protection, use Rulesets instead of Branch Protection:

```json
{
  "name": "Main Branch Protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main", "refs/heads/master"]
    }
  },
  "rules": [
    { "type": "pull_request" },
    { "type": "required_status_checks", "parameters": {
      "required_status_checks": [
        { "context": "CI / Lint & Syntax Check" },
        { "context": "CI / Test (Node 20 on ubuntu-latest)" },
        { "context": "CI / Package Build" },
        { "context": "CI / Integration Test" },
        { "context": "Security / npm Audit" },
        { "context": "Security / CodeQL Analysis" }
      ]
    }},
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" }
  ]
}
```

---

## Quick Setup Checklist

- [ ] Add `NPM_TOKEN` secret to GitHub repo
- [ ] Enable branch protection on `main`/`master`
- [ ] Set workflow permissions to read/write
- [ ] Enable GitHub Advanced Security (for CodeQL alerts tab)
- [ ] Review first security scan results after push
