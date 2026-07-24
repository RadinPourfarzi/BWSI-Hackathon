# Azure deployment

## Recommendation

Deploy the supplied Docker image to **Azure App Service for Containers** and
keep Supabase as the database/auth provider.

Why:

- Docker makes local, CI, and Azure runtime behavior consistent.
- Next.js standalone output produces a small runtime image.
- Azure Container Registry (ACR) can build it in the cloud, so local Docker is
  optional.
- Active game state is in Supabase, so Azure can restart or scale without
  losing sessions.

Azure resources can incur charges. Check the selected App Service and registry
SKUs before creation. Delete the resource group after the hackathon if it is no
longer needed.

## 1. Validate locally

```powershell
npm ci
npm run check
npm run build
```

Optional Docker test:

```powershell
docker compose up --build
curl.exe http://localhost:3000/api/health
docker compose down
```

The compose file intentionally uses mock mode.

## 2. Install and sign in to Azure CLI

```powershell
winget install --id Microsoft.AzureCLI -e
az login
az account show --output table
```

If you have multiple subscriptions:

```powershell
az account set --subscription "SUBSCRIPTION_NAME_OR_ID"
```

## 3. Choose names

Run in PowerShell from the repository root:

```powershell
$ResourceGroup = "ai-detection-game-rg"
$Location = "westus2"
$Registry = "CHOOSEGLOBALLYUNIQUEACRNAME"
$Plan = "ai-detection-game-plan"
$App = "CHOOSE-GLOBALLY-UNIQUE-WEBAPP-NAME"
$Image = "$Registry.azurecr.io/ai-detection-game:v1"
```

ACR names use only letters/numbers and must be globally unique. Web app names
are also globally unique because they become `<name>.azurewebsites.net`.

## 4. Create the resource group and registry

```powershell
az group create --name $ResourceGroup --location $Location

az acr create `
  --resource-group $ResourceGroup `
  --name $Registry `
  --sku Basic
```

## 5. Build in Azure

```powershell
az acr build `
  --registry $Registry `
  --image "ai-detection-game:v1" `
  --file Dockerfile .
```

ACR Tasks uploads the build context, builds the Dockerfile, and stores the
image. A local Docker engine is not required for this command.

## 6. Create App Service

```powershell
az appservice plan create `
  --resource-group $ResourceGroup `
  --name $Plan `
  --is-linux `
  --sku B1

az webapp create `
  --resource-group $ResourceGroup `
  --plan $Plan `
  --name $App `
  --container-image-name "mcr.microsoft.com/azuredocs/aci-helloworld:latest"
```

The public placeholder lets Azure create the app before it has permission to
pull your private ACR image.

## 7. Give App Service managed-identity access to ACR

```powershell
$PrincipalId = az webapp identity assign `
  --resource-group $ResourceGroup `
  --name $App `
  --query principalId `
  --output tsv

$RegistryId = az acr show `
  --resource-group $ResourceGroup `
  --name $Registry `
  --query id `
  --output tsv

az role assignment create `
  --assignee $PrincipalId `
  --scope $RegistryId `
  --role "AcrPull"

az webapp config set `
  --resource-group $ResourceGroup `
  --name $App `
  --generic-configurations '{\"acrUseManagedIdentityCreds\": true}'

az webapp config container set `
  --resource-group $ResourceGroup `
  --name $App `
  --container-image-name $Image
```

Managed identity is preferable to storing the registry password in App
Service.

## 8. Configure the port

The container listens on port 3000:

```powershell
az webapp config appsettings set `
  --resource-group $ResourceGroup `
  --name $App `
  --settings WEBSITES_PORT=3000
```

## 9. Add application settings

In the Azure portal:

1. Open the App Service.
2. Select **Settings → Environment variables**.
3. Add:

```text
APP_DATA_PROVIDER=supabase
ALLOW_DEV_AUTH_HEADER=false
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ACTIVE_SESSION_TTL_SECONDS=86400
```

Using the portal avoids placing the service-role key in terminal history.
Apply the changes; Azure restarts the application.

## 10. Configure health monitoring

In the App Service portal, set the health-check path to:

```text
/api/health
```

Then verify:

```powershell
curl.exe "https://$App.azurewebsites.net/api/health"
```

Expected shape:

```json
{ "status": "ready", "dataProvider": "supabase", "configVersion": 1 }
```

If it returns `not-ready`, check:

- the Supabase settings,
- whether the baseline migration was applied,
- whether an active `game_config` row exists,
- App Service log stream.

## 11. Deploy a new version

Never reuse `v1` for changed source. Use immutable tags:

```powershell
$Tag = "v2"

az acr build `
  --registry $Registry `
  --image "ai-detection-game:$Tag" `
  --file Dockerfile .

az webapp config container set `
  --resource-group $ResourceGroup `
  --name $App `
  --container-image-name "$Registry.azurecr.io/ai-detection-game:$Tag"
```

After the team stabilizes manual deployment, configure Azure Deployment Center
or a GitHub Actions deployment using managed identity. Keep the included CI
workflow as the required test gate before deployment.

## 12. Clean up

This deletes every Azure resource in the group:

```powershell
az group delete --name $ResourceGroup
```

Review the group contents carefully before confirming.
