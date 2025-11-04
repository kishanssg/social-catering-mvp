#!/usr/bin/env bash
set -euo pipefail
mkdir -p tmp/perf
echo "== Timing API endpoints"
for p in /api/v1/shifts /api/v1/workers /api/v1/assignments; do
  /usr/bin/time -f "%E real %C" curl -s -o /dev/null -w "URL:%{url_effective} HTTP:%{http_code} TIME:%{time_total}\n" "$BASE_URL$p" 2>> tmp/perf/times.txt
done
echo "== Bundle sizes (via HTML)"
curl -s "$BASE_URL" | grep -Eo 'src="/[^"]+\.js"|href="/[^"]+\.css"' | sed 's/.*="//;s/"$//' | while read -r a; do
  curl -sI "$BASE_URL$a" 2>&1 | tee -a tmp/perf/assets.headers >/dev/null || true
done
echo "== Performance checks complete"

