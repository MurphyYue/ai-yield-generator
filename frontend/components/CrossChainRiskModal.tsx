'use client'

interface CrossChainRiskModalProps {
  amount: number
  onAccept: () => void
  onCancel: () => void
}

export function CrossChainRiskModal({
  amount,
  onAccept,
  onCancel,
}: CrossChainRiskModalProps) {
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
          Review bridge risk before moving {amount.toFixed(2)} USDC
        </div>

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
          <div>3. Price impact and slippage may reduce the amount that arrives on Arbitrum.</div>
          <div>4. Bridging does not finish the product flow. You still need to deposit into the Arbitrum vault and invest into Arbitrum Aave after arrival.</div>
          <div>5. Use a small amount first. Day 12-13 testing should stay in the 2-5 USDC range.</div>
        </div>

        <div
          className="alert-amber"
          style={{ marginTop: 12 }}
        >
          Base remains the default home chain. Only migrate when the backend economics and your own risk tolerance both support it.
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-amber" style={{ flex: 1 }} onClick={onAccept}>
            I Understand The Risk
          </button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel}>
            Stay On Base
          </button>
        </div>
      </div>
    </div>
  )
}
