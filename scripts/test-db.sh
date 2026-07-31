#!/usr/bin/env bash
#
# Spin up a throwaway Postgres, apply Drizzle migrations, run the DB integration
# suite against it, then tear everything down — regardless of test outcome.
#
# Usage: scripts/test-db.sh [extra jest args...]
#   e.g. scripts/test-db.sh -t "findSubscribersForProduct"
#
set -euo pipefail

CONTAINER_NAME="pricedrop-test-db"
HOST_PORT="${TEST_DB_PORT:-5433}"
PG_IMAGE="postgres:18"
export DATABASE_URL="postgres://postgres:postgres@localhost:${HOST_PORT}/pricedrop_test"

cd "$(dirname "$0")/.."

cleanup() {
  echo "[test-db] tearing down container ${CONTAINER_NAME}..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Remove any stale container from a previous aborted run.
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "[test-db] starting ${PG_IMAGE} on :${HOST_PORT}..."
docker run -d --name "${CONTAINER_NAME}" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pricedrop_test \
  -p "${HOST_PORT}:5432" \
  "${PG_IMAGE}" >/dev/null

echo "[test-db] waiting for Postgres to accept connections..."
for i in $(seq 1 30); do
  if docker exec "${CONTAINER_NAME}" pg_isready -U postgres -d pricedrop_test >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[test-db] Postgres did not become ready in time" >&2
    exit 1
  fi
  sleep 1
done

echo "[test-db] applying migrations..."
DATABASE_URL="${DATABASE_URL}" npx tsx shared/src/db/migrate.ts

echo "[test-db] running DB integration suite..."
DATABASE_URL="${DATABASE_URL}" npx jest --config jest.config.db.ts --forceExit "$@"
