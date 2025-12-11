import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

// Level descriptions - basic placeholder text for infrastructure testing
const levelDescriptions = {
  lone: {
    title: 'רמת אבטחה: יחיד',
    subtitle: 'עסק ללא חובת רישום',
    description: 'העסק שלך אינו עומד בתנאי הסף לחובת רישום מאגר מידע. עם זאת, מומלץ לשמור על נהלי אבטחת מידע בסיסיים.',
    color: '#22c55e', // green
    bgColor: '#f0fdf4',
  },
  basic: {
    title: 'רמת אבטחה: בסיסית',
    subtitle: 'חובת רישום מאגר',
    description: 'נדרש רישום מאגר מידע ברשות להגנת הפרטיות. יש לוודא עמידה בדרישות הבסיסיות של תקנות הגנת הפרטיות.',
    color: '#3b82f6', // blue
    bgColor: '#eff6ff',
  },
  mid: {
    title: 'רמת אבטחה: בינונית',
    subtitle: 'רישום + דרישות נוספות',
    description: 'נדרש רישום מאגר ועמידה בדרישות אבטחה מוגברות. מומלץ לשקול מינוי ממונה על הגנת הפרטיות.',
    color: '#f59e0b', // amber
    bgColor: '#fffbeb',
  },
  high: {
    title: 'רמת אבטחה: גבוהה',
    subtitle: 'רישום + ממונה + דו״ח',
    description: 'העסק מחזיק מידע רגיש בהיקף משמעותי. נדרש רישום מאגר, מינוי ממונה הגנת פרטיות, ועריכת סקר סיכונים.',
    color: '#ef4444', // red
    bgColor: '#fef2f2',
  },
}

// Requirement labels in Hebrew
const requirementLabels = {
  dpo: 'מינוי ממונה הגנת פרטיות (DPO)',
  registration: 'רישום מאגר מידע',
  report: 'עריכת דו״ח / סקר סיכונים (PIA)',
  data_map: 'מיפוי מידע',
}

export default function PublicReport({ tokenProp }) {
  const params = useParams()
  const token = tokenProp || params.token
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Pick API base URL
  const getApiBase = async () => {
    const ENV_API = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '')
    const bases = [
      ENV_API,
      'http://20.217.86.4:8799',
      'http://127.0.0.1:8788',
    ].filter(Boolean)

    for (const base of bases) {
      try {
        const r = await fetch(`${base}/health`, { method: 'GET' })
        if (r.ok) return base
      } catch {}
    }
    return bases[0] || ''
  }

  useEffect(() => {
    const fetchReport = async () => {
      if (!token) {
        setError('חסר מזהה דו״ח')
        setLoading(false)
        return
      }

      try {
        const apiBase = await getApiBase()
        const response = await fetch(`${apiBase}/api/public/report/${token}`)
        const result = await response.json()

        if (!response.ok || !result.valid) {
          if (result.reason === 'expired') {
            setError('תוקף הדו״ח פג. ניתן למלא את השאלון מחדש.')
          } else if (result.reason === 'invalid_token') {
            setError('דו״ח לא נמצא. ודאו שהקישור תקין.')
          } else if (result.error === 'rate_limited') {
            setError('יותר מדי בקשות. נסו שוב בעוד מספר דקות.')
          } else {
            setError('שגיאה בטעינת הדו״ח')
          }
          setLoading(false)
          return
        }

        setData(result)
      } catch (err) {
        console.error('Fetch error:', err)
        setError('שגיאת תקשורת. נסו לרענן את הדף.')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [token])

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>טוען את הדו״ח...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>❌</div>
          <h2 style={styles.errorTitle}>שגיאה</h2>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    )
  }

  // Success - render report
  const levelInfo = levelDescriptions[data.level] || levelDescriptions.basic
  const requirements = data.requirements || {}

  return (
    <div style={styles.container} dir="rtl">
      {/* Header */}
      <div style={styles.header}>
        <img
          src="https://eislaw.co.il/wp-content/uploads/2024/01/cropped-favicon.png"
          alt="EISLAW"
          style={styles.logo}
          onError={(e) => e.target.style.display = 'none'}
        />
        <h1 style={styles.headerTitle}>תוצאות בדיקת פרטיות</h1>
      </div>

      {/* Main card */}
      <div style={styles.card}>
        {/* Business name */}
        {data.business_name && (
          <div style={styles.businessName}>
            {data.business_name}
          </div>
        )}

        {/* Level badge */}
        <div style={{
          ...styles.levelBadge,
          backgroundColor: levelInfo.bgColor,
          borderColor: levelInfo.color,
        }}>
          <div style={{ ...styles.levelTitle, color: levelInfo.color }}>
            {levelInfo.title}
          </div>
          <div style={styles.levelSubtitle}>
            {levelInfo.subtitle}
          </div>
        </div>

        {/* Description */}
        <p style={styles.description}>
          {levelInfo.description}
        </p>

        {/* Requirements checklist */}
        <div style={styles.requirementsSection}>
          <h3 style={styles.requirementsTitle}>דרישות החלות עליך:</h3>
          <ul style={styles.requirementsList}>
            {Object.entries(requirementLabels).map(([key, label]) => {
              const isRequired = requirements[key]
              return (
                <li key={key} style={styles.requirementItem}>
                  <span style={{
                    ...styles.requirementIcon,
                    color: isRequired ? '#22c55e' : '#9ca3af',
                  }}>
                    {isRequired ? '✓' : '✗'}
                  </span>
                  <span style={{
                    ...styles.requirementText,
                    color: isRequired ? '#1f2937' : '#9ca3af',
                    textDecoration: isRequired ? 'none' : 'line-through',
                  }}>
                    {label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Sensitive people count (if applicable) */}
        {requirements.sensitive_people > 0 && (
          <div style={styles.infoBox}>
            <strong>היקף נושאי מידע רגיש:</strong> {requirements.sensitive_people.toLocaleString()} אנשים
          </div>
        )}

        {/* Timestamp */}
        <div style={styles.timestamp}>
          תאריך הבדיקה: {new Date(data.submitted_at).toLocaleDateString('he-IL')}
        </div>

        {/* CTA placeholder */}
        <div style={styles.ctaSection}>
          <button style={styles.ctaButton}>
            המשך לרכישת חבילה
          </button>
          <p style={styles.ctaNote}>
            (כפתור זה יקושר לקופה בהמשך)
          </p>
        </div>
      </div>

      {/* Debug info (dev only) */}
      {import.meta.env?.DEV && (
        <details style={styles.debugSection}>
          <summary>Debug: Raw API Response</summary>
          <pre style={styles.debugPre}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logo: {
    width: '60px',
    height: '60px',
    marginBottom: '12px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0,
  },
  card: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
  businessName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  levelBadge: {
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid',
    marginBottom: '24px',
    textAlign: 'center',
  },
  levelTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  levelSubtitle: {
    fontSize: '16px',
    color: '#64748b',
  },
  description: {
    fontSize: '16px',
    lineHeight: '1.7',
    color: '#475569',
    marginBottom: '28px',
  },
  requirementsSection: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },
  requirementsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 0,
    marginBottom: '16px',
  },
  requirementsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  requirementItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  requirementIcon: {
    fontSize: '20px',
    fontWeight: 'bold',
    width: '24px',
  },
  requirementText: {
    fontSize: '15px',
  },
  infoBox: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
    fontSize: '14px',
    color: '#92400e',
  },
  timestamp: {
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: '24px',
  },
  ctaSection: {
    textAlign: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  ctaButton: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    minHeight: '44px',
  },
  ctaNote: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '16px',
  },
  errorIcon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  errorTitle: {
    textAlign: 'center',
    color: '#dc2626',
    marginBottom: '8px',
  },
  errorText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '16px',
  },
  debugSection: {
    maxWidth: '600px',
    margin: '24px auto',
    fontSize: '12px',
  },
  debugPre: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    padding: '12px',
    borderRadius: '8px',
    overflow: 'auto',
  },
}
