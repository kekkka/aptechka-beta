#!/bin/sh
set -eu
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo 'Установите Node.js 22.12+ и выполните npm install.' >&2
  exit 1
fi
if [ ! -f node_modules/vite/bin/vite.js ]; then
  echo 'Сначала установите зависимости: npm install или pnpm install.' >&2
  exit 1
fi
exec "$NODE_BIN" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 8765 --strictPort
