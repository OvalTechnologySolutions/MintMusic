#!/usr/bin/env bash
# Per-boot Cloud Agent start: Postgres, Redis, and OAuth secret wiring.
set -euo pipefail
cd "$(dirname "$0")/.."

sudo pg_ctlcluster 16 main start 2>/dev/null || true
for i in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done
redis-cli ping >/dev/null 2>&1 || sudo redis-server --daemonize yes
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='mintmusic'" | grep -q 1 \
  || sudo -u postgres createdb -O mintmusic mintmusic
sudo -u postgres psql -c "ALTER USER mintmusic WITH PASSWORD 'mintmusic';" >/dev/null 2>&1 || true

python3 <<'PY'
from pathlib import Path
import os, secrets

web, api = Path('apps/web/.env.local'), Path('apps/api/.env')
if not web.exists() and Path('apps/web/env.local.example').exists():
    web.write_text(Path('apps/web/env.local.example').read_text())
if web.exists():
    wt = web.read_text()
    for k in ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']:
        v = os.environ.get(k)
        if not v or v.strip() in ('', '[REDACTED]'):
            continue
        lines = wt.splitlines()
        found = False
        for i, line in enumerate(lines):
            if line.startswith(k + '='):
                lines[i] = f'{k}={v}'
                found = True
                break
        if not found:
            lines.append(f'{k}={v}')
        wt = '\n'.join(lines) + '\n'
    web.write_text(wt)

    def get(p, k):
        if not p.exists():
            return None
        for line in p.read_text().splitlines():
            if line.startswith(k + '='):
                return line.split('=', 1)[1].strip() or None
        return None

    def setk(p, k, v):
        lines = p.read_text().splitlines() if p.exists() else []
        for i, line in enumerate(lines):
            if line.startswith(k + '='):
                lines[i] = f'{k}={v}'
                p.write_text('\n'.join(lines) + '\n')
                return
        lines.append(f'{k}={v}')
        p.write_text('\n'.join(lines) + '\n')

    internal = get(api, 'INTERNAL_API_SECRET') or get(web, 'INTERNAL_API_SECRET') or secrets.token_urlsafe(32)
    setk(api, 'INTERNAL_API_SECRET', internal)
    setk(web, 'INTERNAL_API_SECRET', internal)
    setk(web, 'AUTH_SECRET', get(web, 'AUTH_SECRET') or secrets.token_urlsafe(32))
print('Postgres + Redis ready')
PY
