'use client'

import { useVault } from '@/hooks/useVault'

// Format number to exactly 6 decimal places
function formatToSixDecimals(value: string): string {
  const num = parseFloat(value)
  if (isNaN(num)) return '0.000000'
  return num.toFixed(6)
}

export function BalanceDisplay() {
  const {
    ethBalanceFormatted,
    ethSymbol,
    vaultBalanceFormatted,
    usdtBalanceFormatted,
    vaultUsdtBalanceFormatted,
  } = useVault()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          ETH Balance
        </h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {formatToSixDecimals(ethBalanceFormatted)} {ethSymbol}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Vault ETH Balance
        </h3>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
          {vaultBalanceFormatted} {ethSymbol}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          USDT Balance
        </h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {usdtBalanceFormatted} USDT
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Vault USDT Balance
        </h3>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
          {vaultUsdtBalanceFormatted} USDT
        </p>
      </div>
    </div>
  )
}
