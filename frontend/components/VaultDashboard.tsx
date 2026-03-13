'use client'

import { useAccount } from 'wagmi'
import { WalletConnect } from './WalletConnect'
import { BalanceDisplay } from './BalanceDisplay'
import { DepositPanel } from './DepositPanel'
import { WithdrawPanel } from './WithdrawPanel'
import { AIPanel } from './AIPanel'

export function VaultDashboard() {
  const { isConnected } = useAccount()

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
        <BalanceDisplay />

        <div className="mt-8">
          <AIPanel />
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <DepositPanel />
          <WithdrawPanel />
        </div>
      </main>
    </div>
  )
}
