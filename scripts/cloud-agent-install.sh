#!/usr/bin/env bash
# Idempotent Cloud Agent install for the MintMusic 2026 monorepo.
set -euo pipefail
cd "$(dirname "$0")/.."

test -f package.json
test -f apps/api/.env.example
test -f apps/web/env.local.example

sudo pg_ctlcluster 16 main start 2>/dev/null || true
for i in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done
redis-cli ping >/dev/null 2>&1 || sudo redis-server --daemonize yes
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='mintmusic'" | grep -q 1 \
  || sudo -u postgres createdb -O mintmusic mintmusic
sudo -u postgres psql -c "ALTER USER mintmusic WITH PASSWORD 'mintmusic';" >/dev/null 2>&1 || true

test -f apps/api/.env || cp apps/api/.env.example apps/api/.env
test -f apps/web/.env.local || cp apps/web/env.local.example apps/web/.env.local

python3 <<'PY'
from pathlib import Path
import os, re, secrets

api, web = Path('apps/api/.env'), Path('apps/web/.env.local')
local = 'postgresql://mintmusic:mintmusic@localhost:5432/mintmusic?sslmode=disable'
t = api.read_text()
if 'USER:PASSWORD' in t or 'HOST-pooler' in t or 'neon.tech' in t or (
    'localhost:5432' not in t and '127.0.0.1:5432' not in t
):
    for k in ('DATABASE_URL', 'DATABASE_URL_UNPOOLED'):
        if re.search(rf'^{k}=', t, flags=re.M):
            t = re.sub(rf'^{k}=.*$', f'{k}={local}', t, flags=re.M)
        else:
            t += f'\n{k}={local}\n'
    api.write_text(t)

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

wt = web.read_text() if web.exists() else ''
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

internal = get(api, 'INTERNAL_API_SECRET') or get(web, 'INTERNAL_API_SECRET') or secrets.token_urlsafe(32)
setk(api, 'INTERNAL_API_SECRET', internal)
setk(web, 'INTERNAL_API_SECRET', internal)
setk(web, 'AUTH_SECRET', get(web, 'AUTH_SECRET') or secrets.token_urlsafe(32))
setk(web, 'AUTH_URL', get(web, 'AUTH_URL') or 'http://localhost:3000')
setk(web, 'NEXT_PUBLIC_APP_URL', get(web, 'NEXT_PUBLIC_APP_URL') or 'http://localhost:3000')
setk(web, 'NEXT_PUBLIC_API_URL', get(web, 'NEXT_PUBLIC_API_URL') or 'http://127.0.0.1:4000')
if not get(api, 'REDIS_URL'):
    setk(api, 'REDIS_URL', 'redis://localhost:6379')
print('env prepared')
PY

npm ci
npm run db:generate -w @mintmusic/api
npm run db:push
npm run db:seed
