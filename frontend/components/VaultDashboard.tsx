'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { WalletConnect } from './WalletConnect'
import { BalanceDisplay } from './BalanceDisplay'
import { DepositPanel } from './DepositPanel'
import { WithdrawPanel } from './WithdrawPanel'
import { AIPanel } from './AIPanel'
import { AdminPanel } from './AdminPanel'
import { SystemPausedBanner } from './SystemPausedBanner'
import { ThemeToggle } from './ThemeToggle'
import { TransactionHistory } from './TransactionHistory'
import { AIIntent, isLegacyIntent } from '@/lib/ai-intent'
import { useVault } from '@/hooks/useVault'

export function VaultDashboard() {
  const { isConnected } = useAccount()
  const { activeChainKey, stableTokenSymbol } = useVault()
  const [intent, setIntent] = useState<AIIntent | null>(null)

  const handleIntentParsed = (parsedIntent: AIIntent) => {
    setIntent(parsedIntent)
    setTimeout(() => setIntent(null), 30000)
  }

  const formIntent = isLegacyIntent(intent) ? intent : null

  if (!isConnected) {
    return (
      <div className="grid-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'fixed', top: 16, right: 16 }}>
          <ThemeToggle />
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 560 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'var(--cyan-dim)',
              border: '1px solid var(--cyan-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '1.7rem',
            }}
          >
            ⬡
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 700, marginBottom: '0.55rem', letterSpacing: '-0.03em' }}>
            Yield Navigator
          </h1>
          <p style={{ color: 'var(--text-2)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
            Deposit {stableTokenSymbol}, receive vault shares, and let operator-managed strategies work across Base and Arbitrum.
          </p>
          <p style={{ color: 'var(--text-3)', marginBottom: '2rem', fontSize: '0.8rem', lineHeight: 1.5 }}>
            The AI layer explains yield, risk, and execution context for users and operators. Aave is live first. More strategies will follow.
          </p>
          <WalletConnect />
        </div>
      </div>
    )
  }

  return (
    <div className="grid-bg" style={{ minHeight: '100vh' }}>
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'rgba(8,8,16,0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '0 2rem',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.1rem', color: 'var(--cyan)' }}>⬡</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
            Yield Navigator
          </span>
          <span
            style={{
              marginLeft: 6,
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--cyan)',
              background: 'var(--cyan-dim)',
              border: '1px solid var(--cyan-glow)',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {activeChainKey.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ThemeToggle />
          <WalletConnect />
        </div>
      </header>

      <SystemPausedBanner />

      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '1.5rem 2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Product Surface
          </div>
          <h2 style={{ fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>
            Single-asset vault, share-based accounting, operator-managed yield.
          </h2>
          <p style={{ color: 'var(--text-2)', maxWidth: 860, lineHeight: 1.55, fontSize: '0.9rem' }}>
            Users deposit {stableTokenSymbol} and track position value through vault shares. Operators deploy idle liquidity into strategies. Treasurers control approvals and fee policy. The AI assistant helps both sides understand what the vault is doing.
          </p>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <BalanceDisplay />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <AIPanel onIntentParsed={handleIntentParsed} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <DepositPanel intent={formIntent} />
              <WithdrawPanel intent={formIntent} />
            </div>
            <TransactionHistory />
          </div>

          <div style={{ position: 'sticky', top: 72 }}>
            <AdminPanel intent={intent} />
          </div>
        </div>
      </div>
    </div>
  )
}
