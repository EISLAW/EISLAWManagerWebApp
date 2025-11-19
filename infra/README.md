EISLAW Azure Deployment
=======================

Resources (Bicep)
- Storage account (static website enabled) for the frontend
- App Service plan (Linux) + Web App for FastAPI backend
- Application Insights

Quick Start (simple)
- Login: `az login` (or `az login --use-device-code`)
- Select subscription: `az account set --subscription bfdb71dc-de87-4c32-b792-158ae902bf85`
- Create RG (if needed): `az group create -n EISLAW-Dashboard -l israelcentral`
- Deploy infra: `az deployment group create -g EISLAW-Dashboard -f infra/azuredeploy.bicep -p storageAccountName=eislawstweb appServicePlanName=asp-eislaw-01 webAppName=eislaw-api-01 appServiceSku=B1`
- Package backend: `pwsh infra/package_backend.ps1`
- Deploy backend ZIP: `az webapp deploy -g EISLAW-Dashboard -n eislaw-api-01 --src-path build/webapp_package.zip --type zip`
- Enable static site: `az storage blob service-properties update --account-name eislawstweb --static-website --index-document index.html --404-document index.html`
- Allow CORS (frontend → backend):
  - `az storage account show -n eislawstweb -g EISLAW-Dashboard --query "primaryEndpoints.web" -o tsv`
  - `az webapp cors add -g EISLAW-Dashboard -n eislaw-api-01 --allowed-origins <static-website-url>`
- Upload frontend (AAD): `az storage blob upload-batch -s frontend/dist -d '$web' --account-name eislawstweb --auth-mode login --overwrite`

Deploy (resource group scope)
1) Login: `az login`
2) Select subscription: `az account set --subscription <SUBSCRIPTION_ID>`
3) Create RG (if needed): `az group create -n EISLAW-Dashboard -l israelcentral`
4) Deploy:
   az deployment group create \
     -g EISLAW-Dashboard \
     -f infra/azuredeploy.bicep \
     -p storageAccountName=eislawstweb appServicePlanName=asp-eislaw-01 webAppName=eislaw-api-01 appServiceSku=B1

Outputs
- `staticWebsiteUrl`: public endpoint of the static site
- `webAppUrl`: backend endpoint (use for VITE_API_URL)

Post-deploy
- CORS: allow the static site origin on the backend (App Service → CORS)
- Frontend upload: `az storage blob upload-batch -s frontend/dist -d '$web' --account-name eislawstweb`
- Configure frontend `.env`: `VITE_API_URL=https://eislaw-api-01.azurewebsites.net`

Permissions
- Service principal used by CI must have:
  - `Contributor` on the resource group
  - `Storage Blob Data Contributor` on the storage account (for AAD blob upload)
- Helper script (device login, then grants roles):
  - `pwsh infra/grant_sp_roles.ps1 -SubscriptionId bfdb71dc-de87-4c32-b792-158ae902bf85 -ResourceGroup EISLAW-Dashboard -AppId <SP_APP_ID> -StorageAccountName eislawstweb`
  - You will be prompted with a device-code. Sign in with the privileged user (e.g., eitan@eislaw.co.il).

Notes
- `infra/azuredeploy.bicep` starts FastAPI via uvicorn on port 8000 and wires Application Insights via `APPLICATIONINSIGHTS_CONNECTION_STRING`.
- `infra/package_backend.ps1` produces `build/webapp_package.zip` with `requirements.txt` at the package root for Oryx to install dependencies.
