'use client'

import { useState } from 'react'
import { useVault } from '@/hooks/useVault'

export function DepositPanel() {
  const [amount, setAmount] = useState('')
  const { deposit, isDepositing, isDepositSuccess } = useVault()

  const handleDeposit = () => {
    if (!amount || parseFloat(amount) <= 0) return
    deposit(amount)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Deposit ETH
      </h2>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in ETH"
        step="0.0001"
        min="0"
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
      />

      <button
        onClick={handleDeposit}
        disabled={isDepositing || !amount || parseFloat(amount) <= 0}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isDepositing ? 'Depositing...' : 'Deposit'}
      </button>

      {isDepositSuccess && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm">
          Deposit successful! Your balance has been updated.
        </div>
      )}
    </div>
  )
}
