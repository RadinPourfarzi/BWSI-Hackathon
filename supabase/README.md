# Supabase files

The team's original `database-schema.md` is the baseline schema. Apply it first.
Then apply `migrations/202607240001_server_engine.sql`.

With the Supabase CLI linked to the correct project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Do not run `db push` against a shared project until the database teammate has
reviewed the migration and you have committed it to Git.

The migration intentionally removes direct browser access to private question
answers and authoritative writes. The Next.js server uses the service-role key,
which must exist only in server environment variables.
