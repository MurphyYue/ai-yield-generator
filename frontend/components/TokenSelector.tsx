'use client'

import { useVault } from '@/hooks/useVault'

export type TokenType = 'ETH' | 'USDT'

interface TokenSelectorProps {
  selectedToken: TokenType
  onTokenChange: (token: TokenType) => void
  disabled?: boolean
}

export function TokenSelector({ selectedToken, onTokenChange, disabled = false }: TokenSelectorProps) {
  const { ethBalanceFormatted, usdtBalanceFormatted, vaultBalanceFormatted, vaultUsdtBalanceFormatted, stableTokenSymbol } = useVault()

  const tokens: { id: TokenType; wallet: string; vault: string }[] = [
    { id: 'ETH',  wallet: `${parseFloat(ethBalanceFormatted).toFixed(4)} ETH`,   vault: `${parseFloat(vaultBalanceFormatted).toFixed(4)} ETH` },
    { id: 'USDT', wallet: `${parseFloat(usdtBalanceFormatted).toFixed(2)} ${stableTokenSymbol}`, vault: `${parseFloat(vaultUsdtBalanceFormatted).toFixed(2)} ${stableTokenSymbol}` },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '0.875rem' }}>
      {tokens.map(t => {
        const active = selectedToken === t.id
        return (
          <button
            key={t.id}
            onClick={() => !disabled && onTokenChange(t.id)}
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
                {t.id === 'USDT' ? stableTokenSymbol : t.id}
              </span>
              {active && (
                <span style={{
                  fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em',
                  color: 'var(--cyan)', background: 'var(--cyan-dim)',
                  border: '1px solid var(--cyan-glow)', padding: '1px 5px', borderRadius: 3,
                }}>
                  SELECTED
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
              <div>Wallet: <span style={{ color: 'var(--text-2)' }}>{t.wallet}</span></div>
              <div>Vault: <span style={{ color: 'var(--text-2)' }}>{t.vault}</span></div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
