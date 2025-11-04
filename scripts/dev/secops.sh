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
curl -s "$BASE_URL" > tmp/security/root.html
grep -Eo 'http://[^"]+' tmp/security/root.html || echo "(no http:// references found)" | tee tmp/security/mixed_content.txt

# 4) Secrets not in repo (scan)
log "Repo secret scan"
git grep -nE '(RAILS_MASTER_KEY|SECRET|API_KEY|BEGIN RSA|ACCESS_KEY)' -- . ':(exclude)tmp/*' ':(exclude)node_modules/*' \
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

# 7) DB least-privilege: grants + DDL should fail
log "DB least-privilege check"
HEROKU_DB_URL=$(heroku config:get DATABASE_URL -a "$APP_NAME")
psql "$HEROKU_DB_URL" -v ON_ERROR_STOP=1 <<'SQL' | tee tmp/security/db_privs.txt
SELECT current_user AS current_user, session_user AS session_user;
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = current_user AND table_schema = 'public'
ORDER BY table_name, privilege_type
LIMIT 20;
DO $$ BEGIN
  EXECUTE 'CREATE TABLE __proof_privs_blocked(id int)';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'DDL blocked as expected';
END $$;
SQL

echo "== SecOps checks complete"

