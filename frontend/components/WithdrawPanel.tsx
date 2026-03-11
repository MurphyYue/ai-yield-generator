'use client'

import { useState } from 'react'
import { useVault } from '@/hooks/useVault'

export function WithdrawPanel() {
  const [amount, setAmount] = useState('')
  const { withdraw, isWithdrawing, isWithdrawSuccess, vaultBalanceFormatted } = useVault()

  const handleWithdraw = () => {
    if (!amount || parseFloat(amount) <= 0) return
    withdraw(amount)
  }

  const handleSetMax = () => {
    setAmount(vaultBalanceFormatted)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Withdraw ETH
      </h2>

      <div className="mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Available:{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {vaultBalanceFormatted} ETH
          </span>
        </p>
        <button
          onClick={handleSetMax}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Set Max
        </button>
      </div>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in ETH"
        step="0.0001"
        min="0"
        max={vaultBalanceFormatted}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
      />

      <button
        onClick={handleWithdraw}
        disabled={
          isWithdrawing ||
          !amount ||
          parseFloat(amount) <= 0 ||
          parseFloat(amount) > parseFloat(vaultBalanceFormatted)
        }
        className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
      </button>

      {isWithdrawSuccess && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm">
          Withdrawal successful! Your balance has been updated.
        </div>
      )}
    </div>
  )
}
