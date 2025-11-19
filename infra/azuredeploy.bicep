@description('Deployment location')
param location string = resourceGroup().location

@description('Storage account name for static website')
param storageAccountName string

@description('App Service plan name')
param appServicePlanName string

@description('Linux Web App name (FastAPI backend)')
param webAppName string

@description('App Service SKU')
@allowed([ 'B1', 'S1', 'P1v3' ])
param appServiceSku string = 'B1'


resource sa 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
    supportsHttpsTrafficOnly: true
  }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: appServiceSku
    tier: appServiceSku == 'B1' ? 'Basic' : (appServiceSku == 'S1' ? 'Standard' : 'PremiumV3')
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    httpsOnly: true
    serverFarmId: plan.id
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.12'
      // Run FastAPI via uvicorn on port 8000
      appCommandLine: 'python -m uvicorn scoring_service.main:app --host 0.0.0.0 --port 8000'
      appSettings: [
        { name: 'WEBSITES_PORT', value: '8000' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: '1' }
        { name: 'PYTHON_ENABLE_WORKER_EXTENSIONS', value: '1' }
        // Application Insights connection string (set after resource creation below)
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: insights.properties.ConnectionString }
      ]
    }
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${webAppName}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

output storageAccountNameOut string = sa.name
output webAppUrl string = 'https://${app.name}.azurewebsites.net'
