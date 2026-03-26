'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const icons = {
  light:  '☀',
  dark:   '◐',
  system: '⊙',
}

const labels = {
  light:  'Light',
  dark:   'Dark',
  system: 'System',
}

const cycle: Record<string, string> = {
  system: 'light',
  light:  'dark',
  dark:   'system',
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const current = (theme ?? 'system') as 'light' | 'dark' | 'system'
  const next = cycle[current] as 'light' | 'dark' | 'system'

  return (
    <button
      onClick={() => setTheme(next)}
      title={`Theme: ${labels[current]} — click to switch to ${labels[next]}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 7,
        border: '1px solid var(--border-mid)',
        background: 'var(--surface-2)',
        color: 'var(--text-2)',
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
      onMouseOver={e => {
        e.currentTarget.style.borderColor = 'var(--cyan)'
        e.currentTarget.style.color = 'var(--cyan)'
      }}
      onMouseOut={e => {
        e.currentTarget.style.borderColor = 'var(--border-mid)'
        e.currentTarget.style.color = 'var(--text-2)'
      }}
    >
      <span style={{ fontSize: '0.85rem' }}>{icons[current]}</span>
      {labels[current]}
    </button>
  )
}
