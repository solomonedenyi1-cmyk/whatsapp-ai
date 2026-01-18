#!/bin/sh
set -eu

session_path="${WHATSAPP_SESSION_PATH:-/app/session}"
data_path="/app/data"

mkdir -p "$session_path" "$data_path"

if [ "$(id -u)" = "0" ]; then
  if ! chown -R node:node "$session_path" "$data_path"; then
    echo "❌ Failed to set ownership for $session_path and $data_path (need write access for user 'node')." >&2
    echo "   Fix by ensuring the mounted volumes allow chown, or run without host bind-mounts." >&2
    exit 1
  fi

  exec gosu node:node "$@"
fi

exec "$@"
