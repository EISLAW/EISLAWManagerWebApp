import React from 'react'
import StatusPill from './StatusPill'

function StatusBadge({ status }) {
  switch (status) {
    case 'uploading':
      return <StatusPill tone="info">Uploading…</StatusPill>
    case 'transcribing':
      return <StatusPill tone="warning">Transcribing…</StatusPill>
    case 'ready':
    case 'draft':
      return <StatusPill tone="success">Ready for review</StatusPill>
    case 'error':
      return <StatusPill tone="danger">Error</StatusPill>
    case 'duplicate':
      return <StatusPill tone="danger">Duplicate</StatusPill>
    default:
      return <StatusPill tone="info">Pending</StatusPill>
  }
}

export default StatusBadge
