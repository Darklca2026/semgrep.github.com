# Snyk Broker update runbook

This runbook follows the current Snyk Broker update guidance and the `snyk/broker` release feed.

Sources:

- https://github.com/snyk/broker/releases.atom
- https://docs.snyk.io/platform-administration/snyk-broker/update-the-snyk-broker-client

## Current release feed

The n8n script `automation/n8n/scripts/check-snyk-broker-release.mjs` reads:

```text
https://github.com/snyk/broker/releases.atom
```

It compares the latest release with `SNYK_BROKER_CURRENT_VERSION` and prints the update commands for the configured `SNYK_BROKER_IMAGE_TAG`.

## Classic Broker update

Snyk's documented update path for the Classic Broker client is:

```bash
docker pull snyk/broker:<brokerClienttype>
```

Then stop and start the Broker client or clients.

For Docker Compose, use:

```bash
docker compose pull snyk-broker
docker compose up -d snyk-broker
```

Set the image tag in the environment:

```env
SNYK_BROKER_IMAGE_TAG=github-enterprise
```

Common image tag examples:

- `github-enterprise`
- `gitlab`
- `bitbucket-server`
- `artifactory`
- `jira`

Use the exact Broker client type that matches your Snyk integration.

## Universal Broker update

For Universal Broker, use the `snyk-broker-config` CLI workflow for your Snyk tenant and deployment.

The CLI is available through npm:

```bash
npm install -g snyk-broker-config
```

Then use the Snyk-guided workflows for connections and deployments, for example:

```bash
snyk-broker-config workflows connections update
snyk-broker-config workflows deployments get
```

The exact update requires Snyk tenant/admin context and the deployment IDs from your Snyk account.

## Secrets you must not commit

Do not commit these values:

- Snyk API token.
- Snyk Broker token.
- GitHub token.
- SCM tokens.
- n8n encryption key.

Store them as Codespaces secrets, n8n credentials, or deployment-platform secrets.

## Manual monitor test

Inside the Codespace:

```bash
node automation/n8n/scripts/check-snyk-broker-release.mjs
```

Inside the n8n container:

```bash
node /files/scripts/check-snyk-broker-release.mjs
```

Exit code `2` means a newer Broker release is available. The script still prints JSON output with the latest version and commands.
