#!/bin/bash

# LiveTranslate Launcher
APP_DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"
PORT=19876
URL="http://127.0.0.1:${PORT}"
NODE=$(which node)
PID_FILE="/tmp/livetranslate.pid"

# Kill any existing server
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null
  rm -f "$PID_FILE"
fi

# Start server in background
"$NODE" "$APP_DIR/server.js" &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

# Wait for server to be ready
for i in $(seq 1 30); do
  curl -s "$URL" > /dev/null 2>&1 && break
  sleep 0.2
done

# Open in Chrome (preferred) or default browser
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$URL" --new-window
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="$URL" --new-window
else
  open "$URL"
fi

# Keep running and cleanup on exit
cleanup() {
  kill "$SERVER_PID" 2>/dev/null
  rm -f "$PID_FILE"
  exit 0
}
trap cleanup EXIT SIGTERM SIGINT

# Wait for server process
wait "$SERVER_PID"
