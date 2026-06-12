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
    isManager,
    isOperator,
    isTreasurer,
    pause,
    unpause,
    isPausing,
    isUnpausing,
    isPauseSuccess,
    isUnpauseSuccess,
    invest,
    divest,
    isInvesting,
    isDivesting,
    isInvestSuccess,
    isDivestSuccess,
    vaultIdleAssetsFormatted,
    strategyBalanceFormatted,
    totalVaultAssetsFormatted,
    performanceFeeBps,
    largeWithdrawalThresholdFormatted,
  } = useVault()

  const [investAmount, setInvestAmount] = useState('')
  const [divestAmount, setDivestAmount] = useState('')

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
  const performanceFeePct = Number(performanceFeeBps) / 100

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>Operations Console</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2 }}>
            Human-controlled strategy execution and treasury guardrails.
          </div>
        </div>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: isPaused ? 'var(--red)' : 'var(--green)',
            background: isPaused ? 'var(--red-dim)' : 'var(--green-dim)',
            border: `1px solid ${isPaused ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}`,
            padding: '3px 8px',
            borderRadius: 5,
          }}
        >
          <span style={{ fontSize: 8 }}>●</span>
          {isPaused ? 'PAUSED' : 'ACTIVE'}
        </span>
      </div>

      <div
        style={{
          background: 'var(--surface-3)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '0.625rem 0.875rem',
        }}
      >
        <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
          Connected Wallet
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: 8 }}>
          {short}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <RoleTag active={isManager} label="Manager" tone="amber" />
          <RoleTag active={isOperator} label="Operator" tone="cyan" />
          <RoleTag active={isTreasurer} label="Treasurer" tone="green" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label="Vault Idle" value={`${Number(vaultIdleAssetsFormatted).toFixed(2)} ${stableTokenSymbol}`} tone="green" />
        <MetricCard label="In Strategy" value={`${Number(strategyBalanceFormatted).toFixed(2)} ${stableTokenSymbol}`} tone="cyan" />
        <MetricCard label="Total Assets" value={`${Number(totalVaultAssetsFormatted).toFixed(2)} ${stableTokenSymbol}`} />
        <MetricCard label="Perf Fee" value={`${performanceFeePct.toFixed(2)}%`} tone="amber" />
      </div>

      <div className="alert-amber" style={{ fontSize: '0.72rem' }}>
        Treasurer policy: large withdrawals above {largeWithdrawalThresholdFormatted} {stableTokenSymbol} require approval. Operator executes invest/divest. Manager controls pause.
      </div>

      <hr className="divider" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="section-label">Circuit Breaker</div>
        {!isPaused ? (
          <button
            className="btn btn-red"
            style={{ width: '100%' }}
            onClick={() => pause()}
            disabled={isPausing || isUnpausing || !isManager}
          >
            {isPausing ? 'Pausing…' : 'Pause Vault'}
          </button>
        ) : (
          <button
            className="btn btn-green"
            style={{ width: '100%' }}
            onClick={() => unpause()}
            disabled={isUnpausing || isPausing || !isManager}
          >
            {isUnpausing ? 'Resuming…' : 'Resume Vault'}
          </button>
        )}
        {(isPauseSuccess || isUnpauseSuccess) && (
          <div className="alert-green">{isPauseSuccess ? 'Vault paused.' : 'Vault resumed.'}</div>
        )}
        {!isManager && <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'center' }}>Requires MANAGER_ROLE</div>}
      </div>

      <hr className="divider" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="section-label">Operator Execution</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', fontWeight: 500 }}>Invest into active strategy</div>
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
              onClick={() => {
                if (investAmount) {
                  invest(investAmount)
                  setInvestAmount('')
                }
              }}
              disabled={isInvesting || !investAmount || !isOperator}
            >
              {isInvesting ? '…' : 'Invest'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', fontWeight: 500 }}>Divest back to vault liquidity</div>
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
              onClick={() => {
                if (divestAmount) {
                  divest(divestAmount)
                  setDivestAmount('')
                }
              }}
              disabled={isDivesting || !divestAmount || !isOperator}
            >
              {isDivesting ? '…' : 'Divest'}
            </button>
          </div>
        </div>

        {(isInvestSuccess || isDivestSuccess) && (
          <div className="alert-green">
            {isInvestSuccess ? `${stableTokenSymbol} deployed into strategy.` : `${stableTokenSymbol} returned to vault liquidity.`}
          </div>
        )}

        {!isOperator && <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'center' }}>Requires OPERATOR_ROLE</div>}
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'green' | 'cyan' | 'amber' }) {
  const color = tone === 'green' ? 'var(--green)' : tone === 'cyan' ? 'var(--cyan)' : tone === 'amber' ? 'var(--amber)' : 'var(--text-1)'
  return (
    <div
      style={{
        background: 'var(--surface-3)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.625rem',
      }}
    >
      <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: 2, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', fontWeight: 500, color }}>
        {value}
      </div>
    </div>
  )
}

function RoleTag({ active, label, tone }: { active: boolean; label: string; tone: 'amber' | 'cyan' | 'green' }) {
  const color = tone === 'amber' ? 'var(--amber)' : tone === 'cyan' ? 'var(--cyan)' : 'var(--green)'
  const background = tone === 'amber' ? 'var(--amber-dim)' : tone === 'cyan' ? 'var(--cyan-dim)' : 'var(--green-dim)'
  return (
    <span
      style={{
        fontSize: '0.62rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: active ? color : 'var(--text-3)',
        background: active ? background : 'var(--surface-2)',
        border: `1px solid ${active ? color + '44' : 'var(--border)'}`,
        padding: '2px 7px',
        borderRadius: 999,
      }}
    >
      {label.toUpperCase()}
    </span>
  )
}
