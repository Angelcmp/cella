#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}" )" && pwd)"
API_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)/apps/api"

cd "$API_DIR"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements_minimal.txt

echo "Dependencies installed in $API_DIR/.venv"
