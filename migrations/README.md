# Migrations

Run these in order depending on your setup.

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Creates all tables, indexes, and enables RLS from scratch |

## Local (Docker Compose)

The schema is applied automatically when the `postgres` container starts for the first time — Docker mounts `001_initial_schema.sql` into `/docker-entrypoint-initdb.d/`. No manual steps needed.

```bash
docker compose up --build
```

Set `DATABASE_URL=postgres://postgres:postgres@localhost:5432/pricedrop` in your `.env`.

## Production (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New query**
3. Paste and run `001_initial_schema.sql`
4. Go to **Project Settings → Database → Connection string (URI)** and copy the URI
   - Set it as `DATABASE_URL` in your `.env`

> ⚠️ Use the **service role** connection string from **Project Settings → API → service_role**
> if you need to bypass Row Level Security, or the direct **Database** URI from
> **Project Settings → Database** to connect directly to Postgres.

After changing schema, regenerate TypeScript types (production only):

```bash
pnpm db:gen-types
```
