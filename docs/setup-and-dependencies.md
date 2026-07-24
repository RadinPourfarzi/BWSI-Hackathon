# Setup and dependencies

This guide assumes Windows 10/11, GitHub, and the team's existing repository.

## 1. Required downloads

### Git

Git tracks the repository, branches, commits, and merges.

Install from <https://git-scm.com/download/win>, or in PowerShell:

```powershell
winget install --id Git.Git -e
```

Close and reopen the terminal, then verify:

```powershell
git --version
```

### Node.js 24 LTS

Node.js runs Next.js, TypeScript tooling, tests, and npm. Use Node 24 LTS, not
Node 20: Node 20 is end-of-life in 2026, while Node 24 is an active LTS line.

Install from <https://nodejs.org/en/download>, or:

```powershell
winget install --id OpenJS.NodeJS.LTS -e
```

Restart the terminal and verify:

```powershell
node --version
npm --version
```

`node --version` should begin with `v24`.

### Code editor

VS Code is optional but convenient:

```powershell
winget install --id Microsoft.VisualStudioCode -e
```

Recommended extensions:

- ESLint
- Prettier - Code formatter
- GitHub Pull Requests

Do not install a separate global TypeScript compiler. The repository pins the
correct TypeScript version.

## 2. Optional downloads

### Docker Desktop

Docker is useful to test the production container locally. It is also required
if the team wants to run the complete Supabase stack locally. It is not
required for mock development or an Azure ACR cloud build.

```powershell
winget install --id Docker.DockerDesktop -e
```

### Azure CLI

Install this only when you are ready to deploy:

```powershell
winget install --id Microsoft.AzureCLI -e
az version
az login
```

### Supabase CLI

No global download is necessary. It is pinned as a project development
dependency. After `npm ci`, invoke it as:

```powershell
npx supabase --version
```

## 3. Prepare your branch

Clone the team repository if you have not already:

```powershell
git clone https://github.com/ORGANIZATION/REPOSITORY.git
cd REPOSITORY
```

If your branch already exists remotely:

```powershell
git fetch origin --prune
git switch --track origin/radin/feat/server-engine-foundation
```

If it does not yet exist:

```powershell
git switch main
git pull --ff-only origin main
git switch -c radin/feat/server-engine-foundation
git push -u origin radin/feat/server-engine-foundation
```

Copy this project's contents into the repository root. Do not copy the outer
ZIP directory if the team repository already represents the application root.

## 4. Install exact project dependencies

Run:

```powershell
npm ci
```

Why `npm ci`, rather than `npm install`?

- `npm ci` follows `package-lock.json` exactly.
- Every teammate and GitHub Actions receives the same versions.
- It fails if `package.json` and the lockfile disagree.
- It does not silently rewrite dependency versions.

Use `npm install <package>` only when deliberately adding or updating a
dependency, and commit both `package.json` and `package-lock.json`.

## 5. Configure mock mode

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Git Bash:

```bash
cp .env.example .env.local
```

Keep:

```dotenv
APP_DATA_PROVIDER=mock
ALLOW_DEV_AUTH_HEADER=true
```

`.env.local` is ignored by Git. Never force-add it.

## 6. Run and test locally

Start the development server:

```powershell
npm run dev
```

In a second terminal:

```powershell
curl.exe http://localhost:3000/api/health
```

Start a mock Arcade game:

```powershell
curl.exe -X POST http://localhost:3000/api/game/start `
  -H "content-type: application/json" `
  -H "x-user-id: 99999999-9999-4999-8999-999999999999" `
  -d '{\"mode\":\"ARCADE\",\"categories\":[\"image\",\"email\",\"audio\"]}'
```

PowerShell's line-continuation character is the backtick. In Git Bash, replace
each backtick with `\`.

Save the returned `sessionId` and challenge `id`, then submit:

```powershell
curl.exe -X POST http://localhost:3000/api/game/answer `
  -H "content-type: application/json" `
  -H "x-user-id: 99999999-9999-4999-8999-999999999999" `
  -d '{\"sessionId\":\"SESSION_UUID\",\"challengeId\":\"CHALLENGE_UUID\",\"selectedAnswer\":\"AI\"}'
```

## 7. Run the quality gate

Before every push:

```powershell
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

What each command proves:

| Command     | Purpose                                                   |
| ----------- | --------------------------------------------------------- |
| `format`    | Makes whitespace and layout consistent                    |
| `lint`      | Detects suspicious or inconsistent code                   |
| `typecheck` | Verifies TypeScript contracts without running the program |
| `test`      | Executes game-rule and session behavior tests             |
| `build`     | Proves Next.js can produce the production server          |

## 8. Switch to Supabase mode

Coordinate with the database developer before changing the shared database.

1. Apply the team's original `database-schema.md`.
2. Review `supabase/migrations/202607240001_server_engine.sql` together.
3. Link the CLI:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

4. In Supabase's project settings, obtain:

- Project URL
- Publishable key (or legacy anon key)
- Service-role key

5. Change `.env.local`:

```dotenv
APP_DATA_PROVIDER=supabase
ALLOW_DEV_AUTH_HEADER=false
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

The service-role key bypasses RLS. It must exist only in `.env.local`, Azure App
Service settings, and protected deployment secrets. Never send it to the
browser, prefix it with `NEXT_PUBLIC_`, paste it into chat, or commit it.

## 9. How the UI authenticates

After the UI signs in with Supabase, it sends the access token:

```typescript
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;

await fetch("/api/game/start", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    mode: "ARCADE",
    categories: ["image", "email", "audio"],
  }),
});
```

The server does not trust the user object stored in the browser. It sends the
token to Supabase Auth through `getUser(token)` and uses the confirmed user ID
for authorization.
