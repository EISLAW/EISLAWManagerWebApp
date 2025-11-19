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

const RoutesRoot = (
  <>
    <Route path="/" element={<Dashboard/>} />
    <Route path="/clients" element={<ClientsList/>} />
    <Route path="/clients/:name" element={<ClientOverview/>} />
    <Route path="/projects" element={<Projects/>} />
    <Route path="/rag" element={<RAG/>} />
    <Route path="/admin" element={<Admin/>} />
    <Route path="/settings" element={<Admin/>} />
    <Route path="/marketing" element={<Marketing/>} />
    <Route path="/prompts" element={<Prompts/>} />
    <Route path="/insights" element={<Insights/>} />
    <Route path="/privacy" element={<Privacy/>} />
    <Route path="/design/task-modal" element={<TaskModalPreview/>} />
  </>
)

export default RoutesRoot
