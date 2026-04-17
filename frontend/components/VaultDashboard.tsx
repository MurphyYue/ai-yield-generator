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
import { AIIntent, isLegacyIntent } from '@/lib/ai-intent'
import { useVault } from '@/hooks/useVault'

export function VaultDashboard() {
  const { isConnected } = useAccount()
  const { activeChainKey } = useVault()
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
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          {/* Logo mark */}
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'var(--cyan-dim)', border: '1px solid var(--cyan-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '1.5rem'
          }}>
            ⬡
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Web3 Vault
          </h1>
          <p style={{ color: 'var(--text-2)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            AI-powered DeFi asset management
          </p>
          <WalletConnect />
        </div>
      </div>
    )
  }

  return (
    <div className="grid-bg" style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8,8,16,0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0 2rem',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.1rem', color: 'var(--cyan)' }}>⬡</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
            Web3 Vault
          </span>
          <span style={{
            marginLeft: 6, fontSize: '0.6rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--cyan)', background: 'var(--cyan-dim)',
            border: '1px solid var(--cyan-glow)',
            padding: '2px 8px', borderRadius: 4,
          }}>
            {activeChainKey.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ThemeToggle />
          <WalletConnect />
        </div>
      </header>

      {/* ── System Paused Banner ─��� */}
      <SystemPausedBanner />

      {/* ── Main content ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 2rem' }}>

        {/* ── Balance strip (full width) ── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <BalanceDisplay />
        </div>

        {/* ��─ Two-column layout: main + sidebar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', alignItems: 'start' }}>

          {/* ── Left: AI + Deposit/Withdraw ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <AIPanel onIntentParsed={handleIntentParsed} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <DepositPanel intent={formIntent} />
              <WithdrawPanel intent={formIntent} />
            </div>
          </div>

          {/* ── Right: Admin panel sidebar ── */}
          <div style={{ position: 'sticky', top: 72 }}>
            <AdminPanel intent={intent} />
          </div>

        </div>
      </div>
    </div>
  )
}
