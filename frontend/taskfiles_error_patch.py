#!/usr/bin/env python3
"""
Patch TaskFiles.jsx to add proper error handling and display
"""

import re

def patch_taskfiles():
    filepath = "/home/azureuser/EISLAWManagerWebApp/frontend/src/features/tasksNew/TaskFiles.jsx"

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Backup
    with open(filepath + '.backup-error-handling', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Backup: {filepath}.backup-error-handling")

    # 1. Add error state after loadingClientEmails
    old_state = "const [loadingClientEmails, setLoadingClientEmails] = useState(false);"
    new_state = """const [loadingClientEmails, setLoadingClientEmails] = useState(false);
  const [clientEmailsError, setClientEmailsError] = useState('');
  const [searchError, setSearchError] = useState('');"""

    if old_state in content:
        content = content.replace(old_state, new_state)
        print("✅ Added error state variables")
    else:
        print("⚠️ Could not find state declaration to patch")

    # 2. Update fetchClientEmails with proper error handling
    old_fetch = '''async function fetchClientEmails() {
    if (!clientName) return;
    setLoadingClientEmails(true);
    try {
      const encodedName = encodeURIComponent(clientName);
      const r = await fetch(`${API}/email/by_client?name=${encodedName}&limit=25&offset=0`);
      if (r.ok) {
        const j = await r.json();
        setClientEmails(j.items || []);
      }
    } catch (err) {
      console.error('fetchClientEmails', err);
    }
    setLoadingClientEmails(false);
  }'''

    new_fetch = '''async function fetchClientEmails() {
    if (!clientName) return;
    setLoadingClientEmails(true);
    setClientEmailsError('');
    try {
      const encodedName = encodeURIComponent(clientName);
      const r = await fetch(`${API}/email/by_client?name=${encodedName}&limit=25&offset=0`);
      if (r.ok) {
        const j = await r.json();
        setClientEmails(j.items || []);
      } else {
        const errorText = await r.text();
        console.error('fetchClientEmails HTTP error:', r.status, errorText);
        setClientEmailsError(`שגיאה בטעינת אימיילים (${r.status})`);
      }
    } catch (err) {
      console.error('fetchClientEmails', err);
      setClientEmailsError('שגיאת רשת - לא ניתן לטעון אימיילים');
    }
    setLoadingClientEmails(false);
  }'''

    if old_fetch in content:
        content = content.replace(old_fetch, new_fetch)
        print("✅ Updated fetchClientEmails with error handling")
    else:
        print("⚠️ Could not find fetchClientEmails to patch")

    # 3. Update searchEmails with proper error handling
    old_search = '''async function searchEmails() {
    if (!emailQuery.trim()) return;
    setSearchingEmails(true);
    const r = await fetch(`${API}/email/search?q=${encodeURIComponent(emailQuery)}`);
    if (r.ok) {
      const j = await r.json();
      setEmailHits(j.items || []);
    }
    setSearchingEmails(false);
  }'''

    new_search = '''async function searchEmails() {
    if (!emailQuery.trim()) return;
    setSearchingEmails(true);
    setSearchError('');
    try {
      const r = await fetch(`${API}/email/search?q=${encodeURIComponent(emailQuery)}`);
      if (r.ok) {
        const j = await r.json();
        setEmailHits(j.items || []);
        if (j.items?.length === 0) {
          setSearchError('לא נמצאו אימיילים תואמים');
        }
      } else {
        const errorText = await r.text();
        console.error('searchEmails HTTP error:', r.status, errorText);
        setSearchError(`שגיאה בחיפוש (${r.status})`);
      }
    } catch (err) {
      console.error('searchEmails', err);
      setSearchError('שגיאת רשת - לא ניתן לחפש');
    }
    setSearchingEmails(false);
  }'''

    if old_search in content:
        content = content.replace(old_search, new_search)
        print("✅ Updated searchEmails with error handling")
    else:
        print("⚠️ Could not find searchEmails to patch")

    # 4. Add error display after "לא נמצאו אימיילים" message
    old_no_emails = '''<div className="text-center text-slate-400 text-sm py-4">לא נמצאו אימיילים</div>'''
    new_no_emails = '''<div className="text-center text-slate-400 text-sm py-4">לא נמצאו אימיילים</div>'''

    # Actually, let's add error display before the client emails section
    old_client_section = '''<div className="text-sm font-medium text-slate-700">אימיילים אחרונים של {clientName || 'הלקוח'}</div>'''
    new_client_section = '''<div className="text-sm font-medium text-slate-700">אימיילים אחרונים של {clientName || 'הלקוח'}</div>
                {clientEmailsError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{clientEmailsError}</div>
                )}'''

    if old_client_section in content:
        content = content.replace(old_client_section, new_client_section)
        print("✅ Added client emails error display")
    else:
        print("⚠️ Could not find client section to add error display")

    # 5. Add search error display after search input
    old_search_section = '''<div className="text-sm font-medium text-slate-700">חיפוש אימיילים נוספים</div>'''
    new_search_section = '''<div className="text-sm font-medium text-slate-700">חיפוש אימיילים נוספים</div>
                {searchError && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2 text-sm">{searchError}</div>
                )}'''

    if old_search_section in content:
        content = content.replace(old_search_section, new_search_section)
        print("✅ Added search error display")
    else:
        print("⚠️ Could not find search section to add error display")

    # Write updated file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n✅ Patched {filepath}")
    return True


if __name__ == "__main__":
    patch_taskfiles()
