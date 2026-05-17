'use client'

interface InterruptDetails {
  amount?: number
  source_chain?: string
  target_chain?: string
  delta_apy?: number
  net_advantage_usd?: number
  breakeven_days?: number | null
  [key: string]: unknown
}

interface CrossChainRiskModalProps {
  amount: number
  interruptDetails?: InterruptDetails
  onAccept: () => void
  onCancel: () => void
}

export function CrossChainRiskModal({
  amount,
  interruptDetails,
  onAccept,
  onCancel,
}: CrossChainRiskModalProps) {
  const d = interruptDetails ?? {}
  const displayAmount = d.amount ?? amount

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 6, 14, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'var(--surface-1)',
          border: '1px solid rgba(251,191,36,0.28)',
          borderRadius: 18,
          padding: '1.1rem',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--amber)',
            fontWeight: 700,
          }}
        >
          Cross-Chain Risk Review
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-1)',
          }}
        >
          Review bridge risk before moving {Number(displayAmount).toFixed(2)} USDC
        </div>

        {interruptDetails && (
          <div style={{
            marginTop: 10,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '0.8rem',
          }}>
            {d.source_chain && d.target_chain && (
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Route</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--amber)', fontFamily: 'monospace' }}>
                  {String(d.source_chain)} → {String(d.target_chain)}
                </div>
              </div>
            )}
            {d.delta_apy != null && (
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Delta APY</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--green)', fontFamily: 'monospace' }}>
                  +{Number(d.delta_apy).toFixed(2)}%
                </div>
              </div>
            )}
            {d.breakeven_days != null && (
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Breakeven</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)', fontFamily: 'monospace' }}>
                  {Number(d.breakeven_days).toFixed(1)} days
                </div>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: 12,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '0.95rem',
            color: 'var(--text-2)',
            fontSize: '0.8rem',
            lineHeight: 1.55,
          }}
        >
          <div>1. Bridge smart contracts and routing providers can fail or be exploited.</div>
          <div>2. Funds can be delayed, misrouted, or temporarily stuck in transit.</div>
          <div>3. Price impact and slippage may reduce the amount that arrives on the target chain.</div>
          <div>4. Bridging does not finish the product flow — you still need to deposit into the destination vault.</div>
          <div>5. Use a small amount first. Keep test transfers in the 2–5 USDC range.</div>
        </div>

        <div
          className="alert-amber"
          style={{ marginTop: 12 }}
        >
          Base remains the default home chain. Only migrate when the backend economics and your own risk tolerance both support it.
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-amber" style={{ flex: 1 }} onClick={onAccept}>
            Approve & Proceed
          </button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel}>
            Stay On Base
          </button>
        </div>
      </div>
    </div>
  )
}
