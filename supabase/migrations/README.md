# Feedlens.ai Migrations

These migrations harden an **existing** Supabase project. They are
idempotent (use `IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc.) so they
can be re-run safely.

## Apply order

1. `0001_rls_enable.sql` — turns on RLS for every public user-data table.
2. `0002_rls_policies.sql` — least-privilege SELECT/INSERT/UPDATE/DELETE
   policies for each table.
3. `0003_profiles_is_admin_lock.sql` — prevents users from self-promoting
   to admin via PATCH on `profiles`.
4. `0004_counter_triggers.sql` — keeps `posts.likes` / `posts.shares` in
   sync with `post_likes` / `post_saves` row counts.
5. `0005_indexes.sql` — adds the indexes the app's hot paths rely on.
6. `0006_set_default_folder_rpc.sql` — atomic default-folder switch and
   create-with-default helper.

## How to apply

```bash
# From the project root
supabase login
supabase link --project-ref <your-project-ref>

# Apply each migration sequentially
for f in supabase/migrations/000*.sql; do
  echo "Applying $f"
  psql "$DATABASE_URL" -f "$f"
done
```

Or use Supabase CLI's migration runner:

```bash
supabase db push
```

## What this DOES NOT do

These migrations assume the schema (tables/columns/FKs) already exists
in your Supabase project. If you need the baseline schema dumped, run:

```bash
supabase db pull
```

That writes the current live schema into a new
`supabase/migrations/<timestamp>_remote_schema.sql` file.

## After applying

Regenerate TypeScript types so `src/types/database.ts` reflects any
schema deltas:

```bash
npm run types:gen
```
