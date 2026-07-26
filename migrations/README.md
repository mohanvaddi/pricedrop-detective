# Migrations

Run these in order depending on your setup.

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Creates all tables, indexes, and enables RLS from scratch |
| `002_ui_overhaul.sql` | Adds `thumbnail_url` + `view_count` to products; `display_name` to web_users; `notify_every_change` to subscriptions |
| `003_product_metrics.sql` | Adds `product_metrics` table for pre-computed price stats (initial, current, all-time-low); backfills from existing prices |

## Local (Docker Compose) — fresh database

The schema is applied automatically when the `postgres` container starts for the first time — Docker mounts all migration files into `/docker-entrypoint-initdb.d/`. No manual steps needed.

```bash
docker compose up --build
```

Set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pricedrop` in your `.env`.

> ⚠️ `docker-entrypoint-initdb.d` only runs on a **fresh (empty) volume**. If you already have data, apply new migrations manually (see below).

## Local — existing database (apply new migrations manually)

If you already have a running `postgres_data` volume, apply only the migrations you haven't run yet:

```bash
# Apply migration 002 (if not already done)
docker compose exec postgres psql -U postgres -d pricedrop \
  -f /docker-entrypoint-initdb.d/002_ui_overhaul.sql

# Apply migration 003
docker compose exec postgres psql -U postgres -d pricedrop \
  -f /docker-entrypoint-initdb.d/003_product_metrics.sql
```

Or connect directly with psql and run the SQL files.

## Production (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New query**
3. Run each migration file in order: `001_initial_schema.sql`, `002_ui_overhaul.sql`, `003_product_metrics.sql`
4. Go to **Project Settings → Database → Connection string (URI)** and copy the URI — set as `DATABASE_URL` in `.env`

> ⚠️ Use the **service role** key from **Project Settings → API** if you need to bypass Row Level Security.

After changing schema, regenerate TypeScript types (production only):

```bash
pnpm db:gen-types
```
