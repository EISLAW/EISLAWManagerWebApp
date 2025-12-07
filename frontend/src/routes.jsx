import React from 'react'
import { Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard/index.jsx'
import ClientsList from './pages/Clients/ClientsList.jsx'
import ClientOverview from './pages/Clients/ClientCard/ClientOverview.jsx'
import Projects from './pages/Projects/index.jsx'
import RAG from './pages/RAG/index.jsx'
import Admin from './pages/Admin/index.jsx'
import Marketing from './pages/Marketing/index.jsx'
import Prompts from './pages/Prompts/index.jsx'
import Insights from './pages/Insights/index.jsx'
import Privacy from './pages/Privacy/index.jsx'
import TaskModalPreview from './design/task-modal/TaskModalPreview.jsx'
import MarketingPromptsManager from './components/MarketingPromptsManager.jsx'
import LeadScoringSettings from './components/LeadScoringSettings.jsx'
import MarketingDashboard from './components/MarketingDashboard.jsx'
import MarketingLeads from './components/MarketingLeads.jsx'
import MarketingCampaigns from './components/MarketingCampaigns.jsx'
import MarketingInsights from './components/MarketingInsights.jsx'
import AIStudio from './pages/AIStudio/index.jsx'
import QuoteTemplatesPage from './pages/QuoteTemplates/index.jsx'

const RoutesRoot = (
  <>
    <Route path="/" element={<Dashboard/>} />
    <Route path="/clients" element={<ClientsList/>} />
    <Route path="/clients/:name" element={<ClientOverview/>} />
    <Route path="/projects" element={<Projects/>} />
    <Route path="/rag" element={<RAG/>} />
    <Route path="/admin" element={<Admin/>} />
    <Route path="/settings" element={<Admin/>} />
    <Route path="/settings/prompts" element={<MarketingPromptsManager/>} />
    <Route path="/settings/leads" element={<LeadScoringSettings/>} />
    <Route path="/settings/quotes" element={<QuoteTemplatesPage/>} />
    <Route path="/marketing" element={<MarketingDashboard/>} />
    <Route path="/marketing/content" element={<Marketing/>} />
    <Route path="/marketing/leads" element={<MarketingLeads/>} />
    <Route path="/marketing/campaigns" element={<MarketingCampaigns/>} />
    <Route path="/marketing/insights" element={<MarketingInsights/>} />
    <Route path="/prompts" element={<Prompts/>} />
    <Route path="/insights" element={<Insights/>} />
    <Route path="/privacy" element={<Privacy/>} />
    <Route path="/ai-studio" element={<AIStudio/>} />
    <Route path="/design/task-modal" element={<TaskModalPreview/>} />
  </>
)

export default RoutesRoot
