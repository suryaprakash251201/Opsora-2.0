#!/bin/sh
# Single-container entrypoint: runs the Opsora API and nginx together.
#  - nginx serves the built SPA and reverse-proxies /api to 127.0.0.1:4100
#  - stop signals are forwarded to both children
#  - if either child dies the container exits so the restart policy recovers it
set -eu

api_pid=""
nginx_pid=""

shutdown() {
  trap - TERM INT QUIT
  [ -n "$nginx_pid" ] && kill -TERM "$nginx_pid" 2>/dev/null || true
  [ -n "$api_pid" ] && kill -TERM "$api_pid" 2>/dev/null || true
  wait || true
  exit 0
}
trap shutdown TERM INT QUIT

node /app/dist/server.js &
api_pid=$!

/usr/sbin/nginx -g 'daemon off;' &
nginx_pid=$!

echo "[entrypoint] api (pid $api_pid) + nginx (pid $nginx_pid) started"

while :; do
  if ! kill -0 "$api_pid" 2>/dev/null; then
    echo "[entrypoint] api exited — stopping container" >&2
    kill -TERM "$nginx_pid" 2>/dev/null || true
    wait || true
    exit 1
  fi
  if ! kill -0 "$nginx_pid" 2>/dev/null; then
    echo "[entrypoint] nginx exited — stopping container" >&2
    kill -TERM "$api_pid" 2>/dev/null || true
    wait || true
    exit 1
  fi
  sleep 2 & # backgrounded so the TERM trap can fire promptly
  wait $!
done
