#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bash "$ROOT_DIR/scripts/compile_ultra.sh"
command -v ultratest >/dev/null 2>&1 || { echo "ERROR: ultratest not found."; exit 1; }
cd "$ROOT_DIR"
if [[ -t 0 ]]; then
  ultratest -t "$ROOT_DIR/tests/launcher.ultra_test.js"
else
  printf '\n' | ultratest -t "$ROOT_DIR/tests/launcher.ultra_test.js"
fi
echo "PASS: HashTL token launcher integration suite"
