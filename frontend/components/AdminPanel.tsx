'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useVault } from '@/hooks/useVault'
import { AIIntent, isStrategyIntent } from '@/lib/ai-intent'

interface AdminPanelProps {
  intent?: AIIntent | null
}

export function AdminPanel({ intent }: AdminPanelProps) {
  const { address } = useAccount()
  const {
    stableTokenSymbol,
    isPaused,
    pause, unpause,
    isPausing, isUnpausing,
    isPauseSuccess, isUnpauseSuccess,
    invest, divest,
    isInvesting, isDivesting,
    isInvestSuccess, isDivestSuccess,
    vaultTokenHoldingsFormatted,
    strategyBalanceFormatted,
  } = useVault()

  const [investAmount, setInvestAmount] = useState('')
  const [divestAmount, setDivestAmount] = useState('')

  useEffect(() => {
    if (isPauseSuccess || isUnpauseSuccess) {
      const t = setTimeout(() => window.location.reload(), 2000)
      return () => clearTimeout(t)
    }
  }, [isPauseSuccess, isUnpauseSuccess])

  useEffect(() => {
    if (!isStrategyIntent(intent)) return

    if (intent.action_data.type === 'invest' && intent.action_data.amount > 0) {
      setInvestAmount(intent.action_data.amount.toString())
    }

    if (intent.action_data.type === 'divest' && intent.action_data.amount > 0) {
      setDivestAmount(intent.action_data.amount.toString())
    }
  }, [intent])

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—'

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
          Admin
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em',
          color: isPaused ? 'var(--red)' : 'var(--green)',
          background: isPaused ? 'var(--red-dim)' : 'var(--green-dim)',
          border: `1px solid ${isPaused ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}`,
          padding: '3px 8px', borderRadius: 5,
        }}>
          <span style={{ fontSize: 8 }}>●</span>
          {isPaused ? 'PAUSED' : 'ACTIVE'}
        </span>
      </div>

      {/* Connected address */}
      <div style={{
        background: 'var(--surface-3)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '0.625rem 0.875rem',
      }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 3 }}>
          Connected
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'var(--text-2)' }}>
          {short}
        </div>
      </div>

      {/* Paused warning */}
      {isPaused && (
        <div className="alert-red">
          All deposit and withdraw operations suspended.
        </div>
      )}

      {/* Pause / Resume */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="section-label">Circuit Breaker</div>
        {!isPaused ? (
          <button
            className="btn btn-red"
            style={{ width: '100%' }}
            onClick={() => pause()}
            disabled={isPausing || isUnpausing}
          >
            {isPausing ? 'Pausing…' : '⏸ Pause System'}
          </button>
        ) : (
          <button
            className="btn btn-green"
            style={{ width: '100%' }}
            onClick={() => unpause()}
            disabled={isUnpausing || isPausing}
          >
            {isUnpausing ? 'Resuming…' : '▶ Resume System'}
          </button>
        )}
        {(isPauseSuccess || isUnpauseSuccess) && (
          <div className="alert-green" style={{ marginTop: 4 }}>
            {isPauseSuccess ? 'System paused.' : 'System resumed.'}
          </div>
        )}
        <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'center' }}>
          Requires MANAGER_ROLE
        </div>
      </div>

      <hr className="divider" />

      {/* Strategy section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="section-label">Aave Strategy</div>

        {/* Balance overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '0.625rem',
          }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: 2, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Vault idle</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', fontWeight: 500, color: 'var(--green)' }}>
              {parseFloat(vaultTokenHoldingsFormatted).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: 1 }}>{stableTokenSymbol}</div>
          </div>
          <div style={{
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '0.625rem',
          }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: 2, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>In Aave</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', fontWeight: 500, color: 'var(--purple)' }}>
              {parseFloat(strategyBalanceFormatted).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: 1 }}>{stableTokenSymbol}</div>
          </div>
        </div>

        {/* Invest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', fontWeight: 500 }}>Invest into Aave</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="vault-input"
              style={{ flex: 1 }}
              type="number"
              placeholder={`${stableTokenSymbol} amount`}
              value={investAmount}
              onChange={e => setInvestAmount(e.target.value)}
            />
            <button
              className="btn btn-cyan"
              onClick={() => { if (investAmount) { invest(investAmount); setInvestAmount('') } }}
              disabled={isInvesting || !investAmount}
            >
              {isInvesting ? '…' : 'Invest'}
            </button>
          </div>
        </div>

        {/* Divest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', fontWeight: 500 }}>Divest from Aave</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="vault-input"
              style={{ flex: 1 }}
              type="number"
              placeholder={`${stableTokenSymbol} amount`}
              value={divestAmount}
              onChange={e => setDivestAmount(e.target.value)}
            />
            <button
              className="btn btn-amber"
              onClick={() => { if (divestAmount) { divest(divestAmount); setDivestAmount('') } }}
              disabled={isDivesting || !divestAmount}
            >
              {isDivesting ? '…' : 'Divest'}
            </button>
          </div>
        </div>

        {(isInvestSuccess || isDivestSuccess) && (
          <div className="alert-green">
            {isInvestSuccess ? `${stableTokenSymbol} invested into Aave.` : `${stableTokenSymbol} divested from Aave.`}
          </div>
        )}

        <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'center' }}>
          Requires TREASURER_ROLE
        </div>
      </div>
    </div>
  )
}
