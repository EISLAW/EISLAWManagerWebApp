EISLAW Azure Deployment
=======================

Resources (Bicep)
- Storage account (static website enabled) for the frontend
- App Service plan (Linux) + Web App for FastAPI backend
- Application Insights

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
- Service principal used by CI must have Contributor on the resource group. For blob upload via AAD, grant Storage Blob Data Contributor on the storage account.


