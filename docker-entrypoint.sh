#!/bin/sh
set -e

APP_NAME="${APP_NAME:-my app}"
APP_VERSION="${APP_VERSION:-none}"

sed -i "s|__APP_NAME__|${APP_NAME}|g; s|__APP_VERSION__|${APP_VERSION}|g" \
  /usr/share/nginx/html/index.html

exec nginx -g "daemon off;"
