'use client'

import { useMemo, useState } from 'react'
import { parseUnits } from 'viem'
import { useVault } from '@/hooks/useVault'
import type { StrategyIntent } from '@/lib/ai-intent'

interface VaultContextApiResponse {
  success: boolean
  data?: {
    gas: {
      estimatedTxCostUsd: number
    }
    netApy: number
  }
  error?: string
}

interface TransactionCardProps {
  actionData: StrategyIntent['action_data']
  strategyLogic: string
  vaultIdle: number
  strategyBalance: number
  userUsdtBalance: number
  onExecute: () => void
  onCancel: () => void
  onReevaluate?: (freshNetApy: number) => Promise<string | null>
}

export function TransactionCard({
  actionData,
  strategyLogic,
  vaultIdle,
  strategyBalance,
  userUsdtBalance,
  onExecute,
  onCancel,
  onReevaluate,
}: TransactionCardProps) {
  const {
    usdtAllowance,
    approveUsdt,
    isApproving,
    isApproveSuccess,
    isInvesting,
    isDivesting,
  } = useVault()

  const [isChecking, setIsChecking] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [displayLogic, setDisplayLogic] = useState(strategyLogic)
  const [gasEstimate, setGasEstimate] = useState<number | null>(null)
  const [freshNetApy, setFreshNetApy] = useState<number | null>(null)

  const amountLabel = actionData.amount.toFixed(2)
  const suggestedNetApy = actionData.net_apy
  const isInvestAction = actionData.type === 'invest'
  const isDivestAction = actionData.type === 'divest'
  const needsAllowance =
    isInvestAction && usdtAllowance < parseUnits(actionData.amount.toString(), 6)

  const riskTone = useMemo(() => {
    if (actionData.risk_level === 'high') {
      return { color: 'var(--red)', background: 'var(--red-dim)' }
    }
    if (actionData.risk_level === 'medium') {
      return { color: 'var(--amber)', background: 'var(--amber-dim)' }
    }
    return { color: 'var(--green)', background: 'var(--green-dim)' }
  }, [actionData.risk_level])

  const handlePrecheck = async () => {
    setIsChecking(true)
    setWarning(null)
    setMarketError(null)

    try {
      const response = await fetch(
        `/api/vault-context?vaultIdle=${vaultIdle}&strategyBalance=${strategyBalance}&userUsdtBalance=${userUsdtBalance}`
      )
      const data = (await response.json()) as VaultContextApiResponse

      if (!data.success || !data.data || data.error) {
        setMarketError(data.error || 'Unable to fetch current market rates.')
        return
      }

      setGasEstimate(data.data.gas.estimatedTxCostUsd)
      setFreshNetApy(data.data.netApy)

      const denominator = Math.max(Math.abs(suggestedNetApy), 0.0001)
      const deviation = Math.abs(data.data.netApy - suggestedNetApy) / denominator * 100

      if (deviation > 10) {
        setWarning(
          `Market conditions changed since the AI recommendation. Previous APY ${suggestedNetApy.toFixed(2)}%, current APY ${data.data.netApy.toFixed(2)}%.`
        )

        if (onReevaluate) {
          const updatedLogic = await onReevaluate(data.data.netApy)
          if (updatedLogic) {
            setDisplayLogic(updatedLogic)
          }
        }
        return
      }

      onExecute()
    } catch {
      setMarketError('Unable to fetch current market rates.')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div
      style={{
        marginTop: 10,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '0.95rem',
      }}
    >
      <div className="section-label" style={{ marginBottom: 8 }}>Strategy Execution Card</div>

      <div
        style={{
          background: 'var(--surface-3)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--text-2)',
          lineHeight: 1.5,
        }}
      >
        {displayLogic}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <StatCard label="Amount" value={`${amountLabel} ${actionData.token}`} />
        <StatCard label="Net APY" value={`${suggestedNetApy.toFixed(2)}%`} />
        <StatCard label="Protocol" value={actionData.protocol.toUpperCase()} />
        <div
          style={{
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '0.7rem',
          }}
        >
          <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Risk
          </div>
          <div
            style={{
              ...riskTone,
              display: 'inline-flex',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {actionData.risk_level.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 10 }}>
        Gas: {gasEstimate !== null ? `~$${gasEstimate.toFixed(2)}` : 'Fetched during confirmation'}
        {freshNetApy !== null ? ` · Current APY ${freshNetApy.toFixed(2)}%` : ''}
      </div>

      {marketError && (
        <div className="alert-red" style={{ marginTop: 10 }}>
          {marketError} Confirmation is blocked until market data is available.
        </div>
      )}

      {warning && (
        <div className="alert-amber" style={{ marginTop: 10 }}>
          {warning}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {isInvestAction && needsAllowance && !isApproveSuccess ? (
          <button
            className="btn btn-cyan"
            style={{ flex: 1 }}
            onClick={() => approveUsdt(actionData.amount.toString())}
            disabled={isApproving}
          >
            {isApproving ? 'Approving…' : 'Step 1: Approve USDT'}
          </button>
        ) : (
          <button
            className={`btn ${isDivestAction ? 'btn-amber' : 'btn-cyan'}`}
            style={{ flex: 1 }}
            onClick={handlePrecheck}
            disabled={isChecking || isInvesting || isDivesting || Boolean(marketError)}
          >
            {isChecking
              ? 'Checking…'
              : isInvesting
                ? 'Investing…'
                : isDivesting
                  ? 'Divesting…'
                  : isDivestAction
                    ? 'Confirm Divest'
                    : 'Confirm Invest'}
          </button>
        )}

        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--surface-3)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.7rem',
      }}
    >
      <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', color: 'var(--text-1)', fontWeight: 600 }}>
        {value}
      </div>
    </div>
  )
}
