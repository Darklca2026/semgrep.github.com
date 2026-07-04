# n8n Codespaces security automation

This setup runs n8n in GitHub Codespaces and schedules a recurring security review across repositories owned by `Darklca2026`.

## What it includes

- n8n on forwarded port `5678`.
- Persistent n8n data through the `n8n_data` Docker volume.
- A workflow that runs every 6 hours.
- A Node.js review script that checks:
  - Code scanning alerts.
  - Dependabot alerts.
  - Secret scanning alerts.
- Optional issue creation for repositories with alerts that meet the configured severity threshold.

## Required GitHub permissions

Create a GitHub token and expose it to the Codespace as `GITHUB_TOKEN`.

Fine-grained token permissions recommended:

- Repository access: all repositories you want to monitor.
- Metadata: read-only.
- Code scanning alerts: read-only.
- Dependabot alerts: read-only.
- Secret scanning alerts: read-only.
- Issues: read and write only if `REPO_REVIEW_CREATE_ISSUES=true`.

Classic token fallback:

- Public repositories only: `public_repo` plus `security_events` where available.
- Private repositories: `repo` plus security alert access where available.

## Required Codespaces secrets

Add these in GitHub settings for Codespaces secrets:

- `GITHUB_TOKEN`
- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`

Optional:

- `REPO_REVIEW_MIN_SEVERITY` (`high` by default)
- `REPO_REVIEW_CREATE_ISSUES` (`false` by default)

## Start in Codespaces

1. Open the repository in a Codespace.
2. Rebuild the container if prompted.
3. Wait for the `n8n` service to start.
4. Open forwarded port `5678`.
5. Log into n8n with `N8N_BASIC_AUTH_USER` and `N8N_BASIC_AUTH_PASSWORD`.
6. Import `automation/n8n/workflows/repo-review-scheduler.json`.
7. Activate the workflow after confirming `GITHUB_TOKEN` is available.

## Manual test

From the Codespace terminal:

```bash
node automation/n8n/scripts/review-repos.mjs
```

Inside the n8n container, the same script is mounted at:

```bash
node /files/scripts/review-repos.mjs
```

## Notes

- Codespaces hibernation pauses scheduled n8n executions.
- Keep `N8N_ENCRYPTION_KEY` stable. Changing it can make stored n8n credentials unreadable.
- Start with `REPO_REVIEW_CREATE_ISSUES=false`. Change it to `true` only after the report output looks right.
