'use client'

import { useVault } from '@/hooks/useVault'

export function SystemPausedBanner() {
  const { isPaused } = useVault()
  if (!isPaused) return null

  return (
    <div style={{
      background: 'var(--red-dim)',
      borderBottom: '1px solid rgba(248,113,113,0.2)',
      padding: '0.625rem 2rem',
      display: 'flex', alignItems: 'center', gap: '0.625rem',
    }}>
      <span style={{ color: 'var(--red)', fontSize: '0.75rem' }}>■</span>
      <span style={{ color: 'var(--red)', fontSize: '0.8rem', fontWeight: 600 }}>
        SYSTEM PAUSED
      </span>
      <span style={{ color: 'rgba(248,113,113,0.6)', fontSize: '0.75rem' }}>
        · All deposit and withdraw operations suspended. Contact admin to resume.
      </span>
    </div>
  )
}
