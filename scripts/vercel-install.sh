#!/usr/bin/env bash
# Vercel install — work around npm optional-deps bug in workspaces (npm/cli#4828).
# Tailwind v4 and lightningcss need platform-specific native bindings under apps/web.
set -euo pipefail

npm ci --include=optional

# Force Linux native bindings into the web workspace on Vercel builders.
if [[ "$(uname -s)" == "Linux" ]]; then
  npm install -w @mintmusic/web --include=optional --no-save \
    "@tailwindcss/oxide-linux-x64-gnu@4.1.18" \
    "@tailwindcss/oxide-linux-x64-musl@4.1.18" \
    "lightningcss-linux-x64-gnu@1.30.2" \
    "lightningcss-linux-x64-musl@1.30.2"
fi
