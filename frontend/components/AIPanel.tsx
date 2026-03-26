'use client'

import { useState } from 'react'
import { useVault } from '@/hooks/useVault'

interface Intent {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
  risk_level?: 'high' | 'medium' | 'low'
  risk_reason?: string
}

interface AIPanelProps {
  onIntentParsed?: (intent: Intent) => void
}

export function AIPanel({ onIntentParsed }: AIPanelProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [intent, setIntent] = useState<Intent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [riskConfirmed, setRiskConfirmed] = useState(false)

  const { vaultBalanceFormatted, vaultUsdtBalanceFormatted } = useVault()

  const handleProcess = async () => {
    if (!message.trim()) return
    setIsLoading(true)
    setError(null)
    setIntent(null)
    setRiskConfirmed(false)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          vaultBalances: {
            ETH: parseFloat(vaultBalanceFormatted) || 0,
            USDT: parseFloat(vaultUsdtBalanceFormatted) || 0,
          }
        }),
      })

      const data = await response.json()

      if (data.success && data.intent) {
        const parsedIntent = data.intent as Intent
        setIntent(parsedIntent)
        if (parsedIntent.risk_level === 'high') return
        if (onIntentParsed) onIntentParsed(parsedIntent)
        if (parsedIntent.action === 'unknown' || parsedIntent.confidence === 'low') {
          setError('Could not understand. Try "deposit 1 ETH" or "withdraw 50 USDT".')
        }
      } else {
        setError(data.error || 'Failed to process intent')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRiskConfirm = () => {
    setRiskConfirmed(true)
    if (intent && onIntentParsed) onIntentParsed({ ...intent })
  }

  const riskBadgeStyle = (risk?: string) => {
    if (risk === 'high')   return { color: 'var(--red)',   background: 'var(--red-dim)',   border: '1px solid rgba(248,113,113,0.2)' }
    if (risk === 'medium') return { color: 'var(--amber)', background: 'var(--amber-dim)', border: '1px solid rgba(251,191,36,0.2)' }
    return                        { color: 'var(--green)', background: 'var(--green-dim)', border: '1px solid rgba(52,211,153,0.2)' }
  }

  const riskIcon = (r?: string) => r === 'high' ? '⚠' : r === 'medium' ? '⚡' : '✓'

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>AI Command</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', marginTop: 2 }}>
            Try: "deposit 1 ETH" · "withdraw all USDT" · "取出 50% ETH"
          </div>
        </div>
        <div style={{
          fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em',
          color: 'var(--cyan)', background: 'var(--cyan-dim)',
          border: '1px solid var(--cyan-glow)',
          padding: '3px 8px', borderRadius: 4,
        }}>
          AI ∙ DIFY
        </div>
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="vault-input"
          style={{ flex: 1 }}
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleProcess() } }}
          placeholder="Enter your command…"
        />
        <button
          className="btn btn-cyan"
          onClick={handleProcess}
          disabled={isLoading || !message.trim()}
          style={{ minWidth: 90 }}
        >
          {isLoading ? '…' : 'Process'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="alert-red" style={{ marginTop: 10 }}>{error}</div>
      )}

      {/* Parsed intent */}
      {intent && intent.action !== 'unknown' && (
        <div style={{
          marginTop: 10,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '0.875rem',
        }}>
          <div className="section-label">Parsed Intent</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            {/* Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Action</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 600,
                color: intent.action === 'deposit' ? 'var(--cyan)' : 'var(--purple)',
              }}>
                {intent.action.toUpperCase()}
              </span>
            </div>
            {/* Amount */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Amount</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>
                {intent.amount}
              </span>
            </div>
            {/* Token */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Token</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>
                {intent.token}
              </span>
            </div>
            {/* Risk */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Risk</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '0.7rem', fontWeight: 600,
                padding: '2px 7px', borderRadius: 4,
                ...riskBadgeStyle(intent.risk_level),
              }}>
                {riskIcon(intent.risk_level)} {(intent.risk_level || 'low').toUpperCase()}
              </span>
            </div>
          </div>

          {intent.risk_reason && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', marginBottom: 10 }}>
              {intent.risk_reason}
            </div>
          )}

          {/* High risk confirmation */}
          {intent.risk_level === 'high' && !riskConfirmed && (
            <div className="alert-red" style={{ marginTop: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>⚠ High Risk — Confirm to proceed</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-red" style={{ flex: 1 }} onClick={handleRiskConfirm}>Confirm</button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setIntent(null); setRiskConfirmed(false) }}>Cancel</button>
              </div>
            </div>
          )}
          {intent.risk_level === 'medium' && (
            <div className="alert-amber" style={{ marginTop: 6 }}>
              ⚡ Medium risk — review before executing
            </div>
          )}
        </div>
      )}

      {(intent || error) && (
        <button
          style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--text-2)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--text-3)')}
          onClick={() => { setMessage(''); setIntent(null); setError(null); setRiskConfirmed(false) }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
