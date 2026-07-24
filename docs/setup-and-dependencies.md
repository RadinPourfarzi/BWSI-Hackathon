# Setup and dependencies

## Required downloads

### Git

Windows:

```powershell
winget install --id Git.Git -e
git --version
```

### Node.js 24 LTS

```powershell
winget install --id OpenJS.NodeJS.LTS -e
node --version
npm --version
```

Close and reopen the terminal after installation. `node --version` should begin
with `v24`. Do not install TypeScript, Next.js, Vitest, or Supabase globally;
the repository pins them.

### Optional tools

- VS Code with ESLint and Prettier extensions.
- Docker Desktop for the complete local Supabase stack.
- Azure CLI only when deploying the Next.js container to Azure.

The project-local Supabase CLI is installed by `npm ci` and invoked through
`npx supabase`.

## Install

From the repository root:

```powershell
npm ci
```

Use `npm ci` for normal setup because it follows `package-lock.json` exactly.
Use `npm install <package>` only when intentionally changing dependencies, then
commit both package files.

### PowerShell blocks `npm.ps1`

The command is `npm`, not `nmp`.

If PowerShell reports that `npm.ps1` cannot be loaded because scripts are
disabled, the immediate workaround does not change system policy:

```powershell
npm.cmd ci
npm.cmd run dev
```

The normal current-user fix is:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Confirm the prompt, close PowerShell, reopen it, then run `npm ci`. This changes
only your Windows user. Do not use `Unrestricted` and do not disable policy
machine-wide.

## Mock mode

```powershell
Copy-Item .env.example .env.local
```

Keep:

```dotenv
APP_DATA_PROVIDER=mock
ALLOW_DEV_AUTH_HEADER=true
```

Start:

```powershell
npm run dev
```

Health:

```powershell
curl.exe http://localhost:3000/api/health
```

Start a mock game:

```powershell
curl.exe -X POST http://localhost:3000/api/game/start `
  -H "content-type: application/json" `
  -H "x-user-id: 99999999-9999-4999-8999-999999999999" `
  -d '{\"mode\":\"ARCADE\",\"categories\":[\"image\"]}'
```

Use the returned IDs:

```powershell
curl.exe -X POST http://localhost:3000/api/game/answer `
  -H "content-type: application/json" `
  -H "x-user-id: 99999999-9999-4999-8999-999999999999" `
  -d '{\"sessionId\":\"SESSION_UUID\",\"challengeId\":\"QUESTION_UUID\",\"selectedOptionId\":\"ai\"}'
```

## Supabase mode

Your provided environment file has a valid project URL and browser-safe
anonymous key, but the authoritative server also requires a private
service-role key.

Set `.env.local`:

```dotenv
APP_DATA_PROVIDER=supabase
ALLOW_DEV_AUTH_HEADER=false
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_LEGACY_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

The code also recognizes `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` as URL/publishable aliases. It never recognizes
a public service-role variable.

Apply migrations only after reviewing
[Supabase deployment](supabase-deployment.md).

## Before every push

```powershell
npm run format
npm run check
npm run build
```

Do not commit `.env.local`, `env.download`, `.next`, `node_modules`, coverage,
or generated logs.
