import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Users } from 'lucide-react'
import ClientsList from './ClientsList.jsx'
import ContactsListTab from '../../components/clients/ContactsListTab.jsx'

export default function ClientsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('clients')
  const [clientsRefreshKey, setClientsRefreshKey] = useState(0)

  const goToClient = (contact) => {
    const name = contact?.name
    if (name) {
      navigate(`/clients/${encodeURIComponent(name)}`)
    }
  }

  const handleActivated = ({ contact, client }) => {
    setClientsRefreshKey((v) => v + 1)
    if (client?.name || contact?.name) {
      goToClient({ name: client?.name || contact?.name })
    } else {
      setActiveTab('clients')
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-petrol" />
          <h1 className="heading">לקוחות</h1>
        </div>
        <p className="text-sm text-slate-600">ניהול לקוחות קיימים ואנשי קשר שמגיעים מ-Airtable.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <button
          type="button"
          className={`px-4 py-2 min-h-[44px] rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'clients' ? 'border-petrol text-petrol bg-white' : 'border-transparent text-slate-600 hover:text-petrol'
          }`}
          onClick={() => setActiveTab('clients')}
        >
          👥 לקוחות
        </button>
        <button
          type="button"
          className={`px-4 py-2 min-h-[44px] rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'contacts' ? 'border-petrol text-petrol bg-white' : 'border-transparent text-slate-600 hover:text-petrol'
          }`}
          onClick={() => setActiveTab('contacts')}
        >
          <span className="inline-flex items-center gap-1">
            <ClipboardList className="w-4 h-4" />
            רשימת קשר
          </span>
        </button>
      </div>

      {activeTab === 'clients' ? (
        <ClientsList key={clientsRefreshKey} />
      ) : (
        <ContactsListTab onActivateContact={handleActivated} onViewClient={goToClient} />
      )}
    </div>
  )
}
