#!/usr/bin/env bash
set -euo pipefail

ENV=${RAILS_ENV:-development}
echo "== Auditing schedule ($ENV) =="
bin/rails audit:schedule

