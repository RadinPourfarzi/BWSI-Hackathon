# Supabase deployment

## What Supabase hosts

For this architecture, Supabase hosts:

- PostgreSQL tables, functions, views, and Row Level Security;
- authentication and JWT verification;
- the public challenge media bucket;
- durable authoritative active-session state.

The Next.js Route Handlers are a Node.js application. Host them on Vercel,
Azure App Service, or another Node-compatible service. Supabase Edge Functions
use Deno and would require a deliberate server migration, not a direct Next.js
upload.

## Local database

Docker Desktop is required:

```bash
npx supabase start
npm run db:reset
npm run db:lint
```

`db:reset` recreates the local database, applies the migration, then runs
`supabase/seed.sql`. It does not touch the hosted project.

## Link a hosted project

Coordinate with the database owner. If the project already has dashboard-made
schema changes, pull and review them before pushing:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db pull
git diff
```

For a clean project, review pending migration work, then:

```bash
npx supabase db push --dry-run
npx supabase db push
```

Never run `db push` against a shared project from an unreviewed working tree.
The supplied anonymous key cannot apply migrations; CLI deployment uses a
Supabase account access token and database password.

## Production server settings

Set these in the Vercel/Azure host, not in the repository:

```dotenv
NODE_ENV=production
APP_DATA_PROVIDER=supabase
ALLOW_DEV_AUTH_HEADER=false
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ACTIVE_SESSION_TTL_SECONDS=86400
```

The service-role key bypasses RLS. Restrict access to the server team, rotate it
after accidental disclosure, and never prefix it `NEXT_PUBLIC_`.

## GitHub migration workflow

`.github/workflows/supabase-deploy.yml` runs only after a migration reaches
`main` or an authorized person starts it manually. Configure a protected GitHub
Environment named `production`, require reviewer approval, and add:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`

The workflow links the project, prints a dry run, then applies migrations.
Seeds are for local/demo reset and are not automatically pushed to production.

## Auth configuration

In Supabase Auth URL Configuration:

1. Set Site URL to the deployed UI.
2. Add `http://localhost:3000/**` for development.
3. Add approved preview URLs only when the team uses them.
4. Configure the UI to send its current access token as a bearer token.

## Media

Upload curated assets to the `challenges` bucket with deterministic paths.
Insert the corresponding `questions` rows using the service role or reviewed
admin tooling. Do not put private answers in object metadata or filenames.

## References

- [Supabase environment and migration workflow](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase CLI configuration](https://supabase.com/docs/guides/local-development/cli/config)
- [Next.js with Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
