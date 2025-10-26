#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://sc-mvp-staging-c6ef090c6c41.herokuapp.com}"
APP_NAME="${APP_NAME:-sc-mvp-staging}"
mkdir -p tmp/security

log(){ echo "== $*"; }

# 1) HTTPS enforcement (redirect http->https)
log "HTTP→HTTPS redirect"
DOMAIN="${BASE_URL#https://}"
curl -sI "http://${DOMAIN}" | tee tmp/security/http_redirect.headers

# 2) TLS + security headers (HSTS, CSP, XFO, Referrer-Policy, Permissions-Policy)
log "TLS + headers"
curl -sI "$BASE_URL" | tee tmp/security/https_root.headers

# 3) No mixed content
log "No mixed-content check"
curl -s "$BASE_URL" | tee tmp/security/root.html > /dev/null
grep -Eo 'http://[^"]+' tmp/security/root.html || echo "(no http:// references found)" | tee tmp/security/mixed_content.txt

# 4) Secrets not in repo (scan)
log "Repo secret scan"
git grep -nE '(AWS_|SECRET|RAILS_MASTER_KEY|PRIVATE_KEY|BEGIN RSA|ACCESS_KEY|API_KEY)' -- . ':(exclude)tmp/*' ':(exclude)node_modules/*' \
 | tee tmp/security/secret_scan.txt || echo "(no secrets found)" | tee tmp/security/secret_scan.txt

# 5) Heroku config vars (managed secrets)
log "Heroku config vars (keys only)"
heroku config -a "$APP_NAME" > tmp/security/heroku_config.txt
sed 's/=.*/=***/' tmp/security/heroku_config.txt | tee tmp/security/heroku_config_keys.txt

# 6) Backups (schedule + latest)
log "Backups schedule and list"
heroku pg:backups:schedules -a "$APP_NAME" 2>&1 | tee tmp/security/pg_backup_schedule.txt || true
heroku pg:backups -a "$APP_NAME" 2>&1 | tee tmp/security/pg_backups.txt
heroku pg:backups:info -a "$APP_NAME" 2>&1 | tee tmp/security/pg_backup_info.txt || true

echo "== SecOps checks complete"

