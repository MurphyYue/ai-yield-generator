'use client'

import { useMemo } from 'react'
import { useSwitchChain } from 'wagmi'
import { CHAIN_IDS } from '@/lib/chains'
import { useVault } from '@/hooks/useVault'

interface DestinationVaultFlowProps {
  suggestedAmount: number
}

export function DestinationVaultFlow({ suggestedAmount }: DestinationVaultFlowProps) {
  const {
    activeChainKey,
    stableTokenSymbol,
    usdtBalanceFormatted,
    vaultUsdtBalanceFormatted,
    strategyBalanceFormatted,
    usdtAllowance,
    approveUsdt,
    depositUsdt,
    invest,
    isApproving,
    isDepositingToken,
    isInvesting,
  } = useVault()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()

  const amountLabel = useMemo(() => {
    if (suggestedAmount > 0) {
      return suggestedAmount.toFixed(2)
    }
    return '0.00'
  }, [suggestedAmount])

  const walletBalance = parseFloat(usdtBalanceFormatted) || 0
  const vaultBalance = parseFloat(vaultUsdtBalanceFormatted) || 0
  const strategyBalance = parseFloat(strategyBalanceFormatted) || 0
  const actionableAmount = Math.min(walletBalance, suggestedAmount > 0 ? suggestedAmount : walletBalance)
  const needsApproval = usdtAllowance <= BigInt(0)
  const onArbitrum = activeChainKey === 'arbitrum'

  return (
    <div
      style={{
        marginTop: 12,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '0.95rem',
      }}
    >
      <div className="section-label">Destination Vault Flow</div>
      <div style={{ fontSize: '0.74rem', color: 'var(--text-2)', marginTop: 6, lineHeight: 1.45 }}>
        The migration flow is only complete after you switch to Arbitrum, deposit bridged {stableTokenSymbol} into the destination vault, and invest it into Aave.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
        <Stat label="Wallet" value={`${walletBalance.toFixed(2)} ${stableTokenSymbol}`} />
        <Stat label="Vault" value={`${vaultBalance.toFixed(2)} ${stableTokenSymbol}`} />
        <Stat label="Strategy" value={`${strategyBalance.toFixed(2)} ${stableTokenSymbol}`} />
      </div>

      <div
        style={{
          marginTop: 12,
          padding: '0.85rem',
          borderRadius: 12,
          border: '1px solid rgba(34,197,94,0.18)',
          background: 'rgba(34,197,94,0.08)',
          fontSize: '0.76rem',
          color: 'var(--text-2)',
          lineHeight: 1.5,
        }}
      >
        Target amount for destination execution: {amountLabel} {stableTokenSymbol}
      </div>

      {!onArbitrum && (
        <div className="alert-amber" style={{ marginTop: 12 }}>
          Switch the wallet to Arbitrum before depositing into the destination vault.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        <button
          className="btn btn-outline"
          onClick={() => switchChain({ chainId: CHAIN_IDS.arbitrum })}
          disabled={onArbitrum || isSwitchingChain}
        >
          {onArbitrum ? 'On Arbitrum' : isSwitchingChain ? 'Switching…' : 'Step 1: Switch To Arbitrum'}
        </button>

        <button
          className="btn btn-cyan"
          onClick={() => approveUsdt(actionableAmount.toString())}
          disabled={!onArbitrum || needsApproval === false || actionableAmount <= 0 || isApproving}
        >
          {needsApproval ? (isApproving ? 'Approving…' : `Step 2: Approve ${stableTokenSymbol}`) : 'Step 2: Approved'}
        </button>

        <button
          className="btn btn-cyan"
          onClick={() => depositUsdt(actionableAmount.toString())}
          disabled={!onArbitrum || needsApproval || actionableAmount <= 0 || isDepositingToken}
        >
          {isDepositingToken ? 'Depositing…' : 'Step 3: Deposit To Arbitrum Vault'}
        </button>

        <button
          className="btn btn-amber"
          onClick={() => invest(Math.max(vaultBalance, 0).toString())}
          disabled={!onArbitrum || vaultBalance <= 0 || isInvesting}
        >
          {isInvesting ? 'Investing…' : 'Step 4: Invest Into Arbitrum Aave'}
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
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
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', color: 'var(--text-1)', fontWeight: 600 }}>
        {value}
      </div>
    </div>
  )
}
