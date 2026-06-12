'use client'

import { useVault } from '@/hooks/useVault'

export type TokenType = 'USDC'

interface TokenSelectorProps {
  selectedToken: TokenType
  onTokenChange: (token: TokenType) => void
  disabled?: boolean
}

export function TokenSelector({ selectedToken, onTokenChange, disabled = false }: TokenSelectorProps) {
  const { stableTokenBalanceFormatted, userPositionAssetsFormatted, stableTokenSymbol } = useVault()

  const active = selectedToken === 'USDC'

  return (
    <button
      onClick={() => !disabled && onTokenChange('USDC')}
      disabled={disabled}
      style={{
        padding: '0.625rem 0.75rem',
        borderRadius: 8,
        border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
        background: active ? 'var(--cyan-dim)' : 'var(--surface-3)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textAlign: 'left',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: active ? 'var(--cyan)' : 'var(--text-1)' }}>
          {stableTokenSymbol}
        </span>
        <span
          style={{
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--cyan)',
            background: 'var(--cyan-dim)',
            border: '1px solid var(--cyan-glow)',
            padding: '1px 5px',
            borderRadius: 3,
          }}
        >
          VAULT ASSET
        </span>
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
        <div>Wallet: <span style={{ color: 'var(--text-2)' }}>{parseFloat(stableTokenBalanceFormatted || '0').toFixed(2)} {stableTokenSymbol}</span></div>
        <div>Position: <span style={{ color: 'var(--text-2)' }}>{parseFloat(userPositionAssetsFormatted || '0').toFixed(2)} {stableTokenSymbol}</span></div>
      </div>
    </button>
  )
}
