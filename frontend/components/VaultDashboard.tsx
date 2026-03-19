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

interface Intent {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
  risk_level?: 'high' | 'medium' | 'low'
  risk_reason?: string
  riskConfirmed?: boolean
}

export function VaultDashboard() {
  const { isConnected } = useAccount()
  const [intent, setIntent] = useState<Intent | null>(null)

  const handleIntentParsed = (parsedIntent: Intent) => {
    setIntent(parsedIntent)

    // Auto-clear intent after 30 seconds
    setTimeout(() => {
      setIntent(null)
    }, 30000)
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8">
          <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Web3 Vault
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Connect your wallet to get started
          </p>
          <WalletConnect />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <header className="flex justify-between items-center mb-12 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Web3 Vault
        </h1>
        <WalletConnect />
      </header>

      <main className="max-w-6xl mx-auto">
        <SystemPausedBanner />

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-2">
            <BalanceDisplay />
          </div>
          <div>
            <AdminPanel />
          </div>
        </div>

        <div className="mt-8">
          <AIPanel onIntentParsed={handleIntentParsed} />
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <DepositPanel intent={intent} />
          <WithdrawPanel intent={intent} />
        </div>
      </main>
    </div>
  )
}
