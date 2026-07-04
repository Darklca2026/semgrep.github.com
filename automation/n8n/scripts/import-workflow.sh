#!/usr/bin/env sh
set -eu

WORKFLOW_PATH="/files/workflows/repo-review-scheduler.json"

if [ ! -f "$WORKFLOW_PATH" ]; then
  echo "Workflow not found: $WORKFLOW_PATH" >&2
  exit 1
fi

n8n import:workflow --input="$WORKFLOW_PATH"
echo "Imported workflow: $WORKFLOW_PATH"
