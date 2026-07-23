# Migrations

Run these in order in the **Supabase SQL Editor** (Dashboard → SQL Editor → New query).

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Creates all tables, indexes, and enables RLS from scratch |

## Steps to set up a new Supabase project

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New query**
3. Paste and run `001_initial_schema.sql`
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL` in your `.env`
   - **service_role** secret → `SUPABASE_KEY` in your `.env`

> ⚠️ Use the **service role** key (not the anon key). The bot runs server-side and
> needs to bypass Row Level Security. Never expose the service role key in a browser or client app.

After applying the schema, regenerate TypeScript types:

```bash
pnpm db:gen-types
```
