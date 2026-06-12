'use client'

import { useVault } from '@/hooks/useVault'

function fmt(value: string, decimals = 2): string {
  const n = parseFloat(value)
  if (!Number.isFinite(n) || n === 0) return '0'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

interface StatPillProps {
  label: string
  value: string
  accent?: 'cyan' | 'green' | 'amber' | 'default'
  tag?: string
}

function StatPill({ label, value, accent = 'default', tag }: StatPillProps) {
  const valueColor =
    accent === 'cyan'
      ? 'var(--cyan)'
      : accent === 'green'
        ? 'var(--green)'
        : accent === 'amber'
          ? 'var(--amber)'
          : 'var(--text-1)'

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '0.875rem 1.125rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.65rem',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-2)',
        }}
      >
        {label}
        {tag && (
          <span
            style={{
              fontSize: '0.55rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color:
                accent === 'cyan'
                  ? 'var(--cyan)'
                  : accent === 'green'
                    ? 'var(--green)'
                    : accent === 'amber'
                      ? 'var(--amber)'
                      : 'var(--text-3)',
              background:
                accent === 'cyan'
                  ? 'var(--cyan-dim)'
                  : accent === 'green'
                    ? 'var(--green-dim)'
                    : accent === 'amber'
                      ? 'var(--amber-dim)'
                      : 'var(--surface-3)',
              border: `1px solid ${
                accent === 'cyan'
                  ? 'var(--cyan-glow)'
                  : accent === 'green'
                    ? 'rgba(52,211,153,0.2)'
                    : accent === 'amber'
                      ? 'rgba(251,191,36,0.2)'
                      : 'var(--border)'
              }`,
              padding: '1px 5px',
              borderRadius: 3,
            }}
          >
            {tag}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '1.2rem',
          fontWeight: 500,
          color: valueColor,
          letterSpacing: '-0.03em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
    </div>
  )
}

export function BalanceDisplay() {
  const {
    stableTokenBalanceFormatted,
    stableTokenSymbol,
    userSharesFormatted,
    userPositionAssetsFormatted,
    withdrawableAssetsFormatted,
    vaultIdleAssetsFormatted,
    strategyBalanceFormatted,
  } = useVault()

  return (
    <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
      <StatPill
        label="Wallet"
        value={`${fmt(stableTokenBalanceFormatted)} ${stableTokenSymbol}`}
      />
      <StatPill
        label="Vault Position"
        value={`${fmt(userPositionAssetsFormatted)} ${stableTokenSymbol}`}
        accent="cyan"
        tag="USER"
      />
      <StatPill
        label="Withdrawable Now"
        value={`${fmt(withdrawableAssetsFormatted)} ${stableTokenSymbol}`}
        accent="amber"
      />
      <StatPill
        label="Vault Shares"
        value={fmt(userSharesFormatted, 4)}
      />
      <StatPill
        label="Vault Idle"
        value={`${fmt(vaultIdleAssetsFormatted)} ${stableTokenSymbol}`}
        accent="green"
        tag="IDLE"
      />
      <StatPill
        label="In Strategy"
        value={`${fmt(strategyBalanceFormatted)} ${stableTokenSymbol}`}
        accent="cyan"
        tag="AAVE"
      />
    </div>
  )
}
