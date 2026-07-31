#!/usr/bin/env bash
#
# Convenience orchestrator for the test suites.
#
# Usage:
#   scripts/test.sh            # unit suite (fast, offline) — default
#   scripts/test.sh unit       # unit suite
#   scripts/test.sh db         # DB integration suite (ephemeral Postgres)
#   scripts/test.sh live       # live scrape suite (network + Camoufox, opt-in)
#   scripts/test.sh all        # unit + db (live is intentionally excluded)
#
# Any extra args are forwarded to the underlying jest invocation.
set -euo pipefail

cd "$(dirname "$0")/.."

MODE="${1:-unit}"
[ "$#" -gt 0 ] && shift || true

run_unit() { echo "== unit suite =="; npx jest "$@"; }
run_db()   { echo "== db suite ==";   ./scripts/test-db.sh "$@"; }
run_live() { echo "== live suite =="; npx jest --config jest.config.live.ts "$@"; }

case "${MODE}" in
  unit) run_unit "$@" ;;
  db)   run_db "$@" ;;
  live) run_live "$@" ;;
  all)  run_unit "$@" && run_db "$@" ;;
  *)    echo "Unknown mode '${MODE}'. Use: unit | db | live | all" >&2; exit 2 ;;
esac
