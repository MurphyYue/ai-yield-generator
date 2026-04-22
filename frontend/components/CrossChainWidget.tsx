'use client'

import dynamic from 'next/dynamic'
import { ChainType, type WidgetConfig } from '@lifi/widget'
import { USDC_ARBITRUM, USDC_BASE } from '@/lib/aave'

const LiFiWidget = dynamic(
  () => import('@lifi/widget').then((mod) => mod.LiFiWidget),
  { ssr: false }
)

interface CrossChainWidgetProps {
  amount: number
  walletAddress?: `0x${string}` | string
  onBridgeStarted?: () => void
  onBridgeCompleted?: () => void
}

export function CrossChainWidget({
  amount,
  walletAddress,
  onBridgeStarted,
  onBridgeCompleted,
}: CrossChainWidgetProps) {
  const roundedAmount = Number.isFinite(amount) && amount > 0 ? amount : 0

  const config: WidgetConfig = {
    integrator: 'AI-Yield-Navigator',
    variant: 'wide',
    appearance: 'light',
    buildUrl: true,
    fromChain: 8453,
    toChain: 42161,
    fromToken: USDC_BASE,
    toToken: USDC_ARBITRUM,
    fromAmount: roundedAmount.toFixed(2),
    toAddress: walletAddress
      ? {
          address: String(walletAddress),
          chainType: ChainType.EVM,
        }
      : undefined,
    chains: {
      allow: [8453, 42161],
    },
    tokens: {
      allow: [
        {
          chainId: 8453,
          address: USDC_BASE,
        },
        {
          chainId: 42161,
          address: USDC_ARBITRUM,
        },
      ],
    },
    theme: {
      container: {
        border: '1px solid rgba(82, 101, 255, 0.18)',
        borderRadius: '18px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
      },
    },
  }

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
      <div className="section-label">Bridge: Base {'->'} Arbitrum</div>
      <div style={{ fontSize: '0.74rem', color: 'var(--text-2)', marginTop: 6, lineHeight: 1.45 }}>
        The widget is prefilled for Base USDC to Arbitrum USDC. Execute the bridge here, then return to the guided destination flow below.
      </div>

      <div style={{ marginTop: 12 }}>
        <LiFiWidget {...config} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onBridgeStarted}>
          I Started The Bridge
        </button>
        <button className="btn btn-cyan" style={{ flex: 1 }} onClick={onBridgeCompleted}>
          I Finished Bridging
        </button>
      </div>
    </div>
  )
}
