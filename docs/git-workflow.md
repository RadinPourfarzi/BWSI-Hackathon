# Git workflow

The team pattern is:

```text
[name]/[type]/[specific-part]
```

The server branch is:

```text
radin/feat/server-engine-foundation
```

## Create or resume the branch

New local branch:

```bash
git switch main
git pull --ff-only origin main
git switch -c radin/feat/server-engine-foundation
git push -u origin radin/feat/server-engine-foundation
```

Existing remote branch:

```bash
git fetch origin --prune
git switch --track origin/radin/feat/server-engine-foundation
```

## Begin a work session

```bash
git status --short --branch
git fetch origin --prune
git switch main
git pull --ff-only origin main
git switch radin/feat/server-engine-foundation
git merge main
```

For this long-running shared branch, merging `main` regularly avoids rewriting
history and exposes shared-contract conflicts early. Do not force-push unless
the team explicitly agrees.

## Commit logical behavior

Inspect before staging:

```bash
git diff
git status --short
```

Stage a focused unit:

```bash
git add src/server/game tests/server/game
git diff --staged
```

Example commit sequence:

```text
feat(engine): merge category-aware authoritative rules
feat(session): add durable state and completion recovery
feat(database): add atomic Supabase persistence
test(server): cover security and game-mode behavior
ci(server): add validation and protected migrations
docs(server): document setup and deployment
```

Avoid `git add .` until you have reviewed every untracked file. It can include
secrets or build output.

## Shared files

Tell teammates before changing:

- `src/shared/**`
- `package.json` and `package-lock.json`
- `supabase/migrations/**`
- root TypeScript, Next.js, lint, or formatting configuration

UI review is required for contract changes; database review is required for
migrations and repository mappings.

## Quality gate

```bash
npm run format
npm run check
npm run build
git status --short
```

CI repeats these checks. Do not merge failed CI.

## Secret check

Never stage `.env.local`, `env.download`, database passwords, Supabase access
tokens, or service-role keys.

```bash
git diff --staged
git status --short
git grep -n "SERVICE_ROLE_KEY=" -- . ":!.env.example" ":!docs/**"
```

If a real secret enters any commit, removing it later is insufficient. Rotate
it immediately and tell the team.

## Pull request

Open a draft PR from:

```text
radin/feat/server-engine-foundation -> main
```

Request UI review for shared/API contracts, database review for migrations,
and one general server review. Use the supplied PR template. Protect `main`
with required Server CI and CodeQL checks.

Configure the GitHub `production` Environment with required reviewers so a
merge cannot silently apply database migrations without approval.

## Resolve conflicts

After `git merge main`, inspect each conflict and preserve both intended
behaviors when compatible. Never choose “ours” or “theirs” blindly for shared
contracts or migrations.

```bash
git add path/to/resolved-file
npm run check
npm run build
git commit
git push
```

## After merge

```bash
git switch main
git pull --ff-only origin main
git branch -d radin/feat/server-engine-foundation
git fetch origin --prune
```

Delete the remote branch after confirming the PR is merged.
