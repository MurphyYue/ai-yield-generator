'use client'

import { useState, useEffect, useCallback } from 'react'
import { useVault } from '@/hooks/useVault'

interface Intent {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'USDC' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
  risk_level?: 'high' | 'medium' | 'low'
  risk_reason?: string
  riskConfirmed?: boolean
}

interface WithdrawPanelProps {
  intent?: Intent | null
}

export function WithdrawPanel({ intent }: WithdrawPanelProps) {
  const [amount, setAmount] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    stableTokenSymbol,
    stableTokenBalanceFormatted,
    userPositionAssetsFormatted,
    withdrawableAssetsFormatted,
    userSharesFormatted,
    largeWithdrawalThresholdFormatted,
    withdrawStable,
    simulateWithdrawStable,
    isWithdrawingStable,
    isWithdrawStableSuccess,
  } = useVault()

  useEffect(() => {
    if (intent && intent.action === 'withdraw' && intent.amount > 0) {
      setAmount(intent.amount.toString())
    }
  }, [intent])

  useEffect(() => {
    setError(null)
  }, [amount])

  const handleWithdraw = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setError(null)

    setIsSimulating(true)
    const simError = await simulateWithdrawStable(amount)
    setIsSimulating(false)

    if (simError) {
      setError(simError.message)
      return
    }

    withdrawStable(amount)
  }, [amount, simulateWithdrawStable, withdrawStable])

  const handleSetMax = () => {
    setAmount(withdrawableAssetsFormatted)
  }

  const isLoading = isWithdrawingStable

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em', color: 'var(--amber)' }}>
          Withdraw {stableTokenSymbol}
        </span>
        {intent && intent.action === 'withdraw' && (
          <span
            style={{
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--amber)',
              background: 'var(--amber-dim)',
              border: '1px solid rgba(251,191,36,0.24)',
              padding: '2px 7px',
              borderRadius: 4,
            }}
          >
            AI PARSED
          </span>
        )}
      </div>

      <div className="alert-amber" style={{ fontSize: '0.72rem' }}>
        Withdrawals consume vault shares. If too much capital is currently invested, the operator may need to divest liquidity first.
      </div>

      {error && <div className="alert-red" style={{ fontSize: '0.75rem' }}>⚠ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.7rem', color: 'var(--text-2)' }}>
        <div>
          Wallet: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-1)' }}>{stableTokenBalanceFormatted} {stableTokenSymbol}</span>
        </div>
        <div>
          Position: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--amber)' }}>{userPositionAssetsFormatted} {stableTokenSymbol}</span>
        </div>
        <div>
          Withdrawable now: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-1)' }}>{withdrawableAssetsFormatted} {stableTokenSymbol}</span>
        </div>
        <div>
          Vault shares: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-1)' }}>{userSharesFormatted}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
          Large withdrawals above {largeWithdrawalThresholdFormatted} {stableTokenSymbol} require treasurer approval.
        </div>
        <button
          onClick={handleSetMax}
          disabled={isLoading}
          style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: 'var(--text-2)',
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          MAX
        </button>
      </div>

      <input
        className="vault-input"
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder={`Amount (${stableTokenSymbol})`}
        step="0.000001"
        min="0"
        max={withdrawableAssetsFormatted}
      />

      <button
        className="btn btn-amber"
        style={{ width: '100%', padding: '0.7rem' }}
        onClick={handleWithdraw}
        disabled={isLoading || isSimulating || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(withdrawableAssetsFormatted || '0')}
      >
        {isSimulating ? 'Checking…' : isLoading ? 'Withdrawing…' : `Withdraw ${amount || '0'} ${stableTokenSymbol}`}
      </button>

      {isWithdrawStableSuccess && (
        <div className="alert-green" style={{ fontSize: '0.75rem' }}>Withdrawal complete.</div>
      )}
    </div>
  )
}
