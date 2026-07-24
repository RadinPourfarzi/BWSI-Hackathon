# Git workflow for the team

Your team uses:

```text
[name]/[type]/[specific-part]
```

Your branch is:

```text
radin/feat/server-engine-foundation
```

Because you own the entire server/engine, it is reasonable to keep all server
work on that branch during the hackathon. Clean Git history still matters:
organize the work as small commits, keep the branch current, and merge it
through a pull request.

## Beginning each work session

```bash
git status
git fetch origin --prune
git switch main
git pull --ff-only origin main
git switch radin/feat/server-engine-foundation
git merge main
```

Why merge `main` regularly?

- You discover shared-contract conflicts early.
- Your eventual pull request is easier to review.
- UI/database changes do not surprise you on demo day.

For this team workflow, merging `main` is simpler than repeatedly rebasing a
long-running reviewed branch. Do not force-push unless the team explicitly
agrees.

## Before coding

```bash
git status --short --branch
git log --oneline --decorate -8
```

The status should show the correct branch. If unrelated local changes appear,
understand them before modifying files.

## Stage deliberately

Inspect work:

```bash
git diff
git status --short
```

Stage one logical unit:

```bash
git add src/server/game tests/server/game
git diff --staged
```

Avoid automatically running `git add .` without reviewing the status first. It
can accidentally include secrets, editor files, build artifacts, or a
teammate's unrelated work.

## Commit by behavior

Good sequence for this implementation:

```text
feat(engine): implement authoritative game rules
feat(session): add ownership and concurrency checks
feat(database): add Supabase repository and session store
feat(api): add game analytics and profile routes
test(server): cover game loop and anti-cheat behavior
chore(ci): validate server on pull requests
docs(server): add setup and deployment walkthrough
```

Each commit should compile and ideally pass its relevant tests. A commit message
describes the reason/behavior, not merely “updated files.”

```bash
git commit -m "feat(session): reject concurrent answer submissions"
git push
```

The first push uses:

```bash
git push -u origin radin/feat/server-engine-foundation
```

## Quality gate before every push

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions repeats these checks, but local checks give faster feedback.

## Shared files require coordination

Tell teammates before materially changing:

- `src/shared/**`
- `package.json`
- `package-lock.json`
- `supabase/migrations/**`
- root Next.js/TypeScript configuration

Your server implementation may define a contract, but the UI and database
developers consume it.

## Secret hygiene

Never commit:

- `.env.local`
- Supabase service-role key
- Supabase access tokens
- Azure credentials or publish profiles
- database passwords

Check before pushing:

```bash
git status --short
git diff --staged
git grep -n "SERVICE_ROLE" -- . ":!docs/**" ":!.env.example"
```

If a real secret is ever committed, deleting the line in a later commit is not
enough. Revoke/rotate the secret immediately and tell the team.

## Pull request strategy

Open a draft pull request early:

```text
radin/feat/server-engine-foundation -> main
```

This lets teammates read contracts before the final merge. Use the included
pull-request template and request:

- UI review for `src/shared` and API responses,
- database review for repositories and migrations,
- one general code review for engine behavior.

Do not merge with failed CI.

## Handling a conflict

After `git merge main`, Git marks conflicted files. For each file:

1. Open it and understand both versions.
2. Remove conflict markers.
3. Preserve both teammates' intended behavior where compatible.
4. Run tests.
5. Stage the resolved files.
6. Complete the merge commit.

```bash
git add path/to/resolved-file
git status
git commit
git push
```

Do not resolve a shared contract by blindly choosing “ours” or “theirs.”

## After the pull request merges

```bash
git switch main
git pull --ff-only origin main
git branch -d radin/feat/server-engine-foundation
git fetch origin --prune
```

Delete the remote branch through the GitHub PR page after confirming the merge.
