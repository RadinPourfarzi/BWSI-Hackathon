# Supabase project

- `config.toml` configures local development.
- `migrations/202607240001_initial_schema.sql` is the complete reviewed
  baseline.
- `seed.sql` adds two local/demo email questions.

Local reset:

```bash
npx supabase start
npm run db:reset
npm run db:lint
```

Hosted deployment:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Do not push from an unreviewed branch. Production deployment is also available
through the protected GitHub workflow documented in
`docs/supabase-deployment.md`.
