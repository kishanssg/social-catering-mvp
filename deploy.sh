#!/usr/bin/env bash
set -euo pipefail

APP_API=${APP_API:-social-catering-api}
APP_UI=${APP_UI:-social-catering-ui}

usage() {
  echo "Usage: ./deploy.sh [api|ui|both]";
}

if [[ $# -lt 1 ]]; then usage; exit 1; fi

PART=$1

push_api() {
  echo "==> Deploying API to $APP_API"
  git push heroku-api main || git push https://git.heroku.com/${APP_API}.git main
  heroku run rails db:migrate -a "$APP_API"
}

build_ui() {
  echo "==> Building UI"
  (cd social-catering-ui && npm ci && npm run build)
}

push_ui() {
  echo "==> Deploying UI to $APP_UI"
  git push heroku-ui main || git push https://git.heroku.com/${APP_UI}.git main
}

case "$PART" in
  api)
    push_api
    ;;
  ui)
    push_ui
    ;;
  both)
    push_api
    push_ui
    ;;
  *)
    usage; exit 1;
    ;;
 esac

 echo "Done."
