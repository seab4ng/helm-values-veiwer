#!/bin/sh
set -e

APP_VERSION="${APP_VERSION:-none}"

sed -i "s|__APP_VERSION__|${APP_VERSION}|g" \
  /usr/share/nginx/html/index.html

exec nginx -g "daemon off;"
