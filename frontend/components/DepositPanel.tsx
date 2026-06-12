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

interface DepositPanelProps {
  intent?: Intent | null
}

export function DepositPanel({ intent }: DepositPanelProps) {
  const [amount, setAmount] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    stableTokenSymbol,
    stableTokenBalanceFormatted,
    stableTokenAllowance,
    stableTokenAllowanceFormatted,
    userPositionAssetsFormatted,
    depositCapFormatted,
    approveStable,
    depositStable,
    simulateApproveStable,
    simulateDepositStable,
    isApprovingStable,
    isDepositingStable,
    isApproveStableSuccess,
    isDepositStableSuccess,
  } = useVault()

  useEffect(() => {
    if (intent && intent.action === 'deposit' && intent.amount > 0) {
      setAmount(intent.amount.toString())
    }
  }, [intent])

  useEffect(() => {
    setError(null)
  }, [amount])

  const handleDeposit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setError(null)

    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1_000_000))

    if (!stableTokenAllowance || stableTokenAllowance < amountWei) {
      setIsSimulating(true)
      const simError = await simulateApproveStable(amount)
      setIsSimulating(false)
      if (simError) {
        setError(simError.message)
        return
      }
      approveStable(amount)
      return
    }

    setIsSimulating(true)
    const simError = await simulateDepositStable(amount)
    setIsSimulating(false)

    if (simError) {
      setError(simError.message)
      return
    }

    depositStable(amount)
  }, [
    amount,
    approveStable,
    depositStable,
    simulateApproveStable,
    simulateDepositStable,
    stableTokenAllowance,
  ])

  const handleSetMax = () => {
    setAmount(stableTokenBalanceFormatted)
  }

  const isLoading = isApprovingStable || isDepositingStable
  const isSuccess = isApproveStableSuccess || isDepositStableSuccess
  const needsApproval = !stableTokenAllowance || stableTokenAllowance < BigInt(Math.floor((parseFloat(amount || '0') || 0) * 1_000_000))

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em', color: 'var(--cyan)' }}>
          Deposit {stableTokenSymbol}
        </span>
        {intent && intent.action === 'deposit' && (
          <span
            style={{
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--cyan)',
              background: 'var(--cyan-dim)',
              border: '1px solid var(--cyan-glow)',
              padding: '2px 7px',
              borderRadius: 4,
            }}
          >
            AI PARSED
          </span>
        )}
      </div>

      <div className="alert-cyan" style={{ fontSize: '0.72rem' }}>
        This vault accepts a single asset: <strong>{stableTokenSymbol}</strong>. Deposits mint vault shares; yield accrues through share value growth.
      </div>

      {error && <div className="alert-red" style={{ fontSize: '0.75rem' }}>⚠ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.7rem', color: 'var(--text-2)' }}>
        <div>
          Wallet: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-1)' }}>{stableTokenBalanceFormatted} {stableTokenSymbol}</span>
        </div>
        <div>
          Position: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--cyan)' }}>{userPositionAssetsFormatted} {stableTokenSymbol}</span>
        </div>
        <div>
          Allowance: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-1)' }}>{stableTokenAllowanceFormatted} {stableTokenSymbol}</span>
        </div>
        <div>
          Deposit cap: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-1)' }}>{depositCapFormatted === '0' ? 'Unlimited' : `${depositCapFormatted} ${stableTokenSymbol}`}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
          Approval and deposit are separate until permit support is added back for VaultV4.
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
        max={stableTokenBalanceFormatted}
      />

      <button
        className="btn btn-cyan"
        style={{ width: '100%', padding: '0.7rem' }}
        onClick={handleDeposit}
        disabled={isLoading || isSimulating || !amount || parseFloat(amount) <= 0}
      >
        {isSimulating
          ? 'Checking…'
          : isLoading
            ? isApprovingStable
              ? `Approving ${stableTokenSymbol}…`
              : 'Depositing…'
            : needsApproval
              ? `Approve ${stableTokenSymbol}`
              : `Deposit ${amount || '0'} ${stableTokenSymbol}`}
      </button>

      {isSuccess && (
        <div className="alert-green" style={{ fontSize: '0.75rem' }}>
          {isApproveStableSuccess
            ? `Approval submitted. You can now deposit ${stableTokenSymbol}.`
            : 'Deposit complete.'}
        </div>
      )}
    </div>
  )
}
