# n8n Codespaces security automation

This setup runs n8n in GitHub Codespaces and schedules recurring security reviews across repositories owned by `Darklca2026`.

## What it includes

- n8n on forwarded port `5678`.
- Persistent n8n data through the `n8n_data` Docker volume.
- A repository security workflow that runs every 6 hours.
- A Snyk Broker release monitor workflow that runs every 24 hours.
- A Node.js repository review script that checks:
  - Code scanning alerts.
  - Dependabot alerts.
  - Secret scanning alerts.
- A Node.js Snyk Broker release script that checks:
  - `https://github.com/snyk/broker/releases.atom`.
  - Whether the latest Broker release is newer than `SNYK_BROKER_CURRENT_VERSION`.
  - The Docker update commands for `SNYK_BROKER_IMAGE_TAG`.
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
- `SNYK_BROKER_CURRENT_VERSION`
- `SNYK_BROKER_IMAGE_TAG` (`github-enterprise` by default)

## Start in Codespaces

1. Open the repository in a Codespace.
2. Rebuild the container if prompted.
3. Wait for the `n8n` service to start.
4. Open forwarded port `5678`.
5. Log into n8n with `N8N_BASIC_AUTH_USER` and `N8N_BASIC_AUTH_PASSWORD`.
6. Import `automation/n8n/workflows/repo-review-scheduler.json`.
7. Import `automation/n8n/workflows/snyk-broker-release-monitor.json`.
8. Activate the workflows after confirming required secrets are available.

## Manual tests

From the Codespace terminal:

```bash
node automation/n8n/scripts/review-repos.mjs
node automation/n8n/scripts/check-snyk-broker-release.mjs
```

Inside the n8n container, the same scripts are mounted at:

```bash
node /files/scripts/review-repos.mjs
node /files/scripts/check-snyk-broker-release.mjs
```

## Snyk Broker update

For Classic Broker, Snyk documents the update path as pulling the latest image for the Broker client type, then restarting the Broker client:

```bash
docker pull snyk/broker:<brokerClienttype>
docker compose pull snyk-broker
docker compose up -d snyk-broker
```

See `automation/snyk-broker/README.md` for the full runbook.

## Notes

- Codespaces hibernation pauses scheduled n8n executions.
- Keep `N8N_ENCRYPTION_KEY` stable. Changing it can make stored n8n credentials unreadable.
- Start with `REPO_REVIEW_CREATE_ISSUES=false`. Change it to `true` only after the report output looks right.
- Start with Snyk Broker monitoring only. Restarting a production Broker client should be done in the deployment environment after checking the release output.
