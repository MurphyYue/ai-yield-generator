'use client'

import { useVault } from '@/hooks/useVault'

export type TokenType = 'ETH' | 'USDT'

interface TokenSelectorProps {
  selectedToken: TokenType
  onTokenChange: (token: TokenType) => void
  disabled?: boolean
}

export function TokenSelector({ selectedToken, onTokenChange, disabled = false }: TokenSelectorProps) {
  const {
    ethBalanceFormatted,
    usdtBalanceFormatted,
    vaultBalanceFormatted,
    vaultUsdtBalanceFormatted,
  } = useVault()

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Select Token
      </label>

      <div className="grid grid-cols-2 gap-3">
        {/* ETH Option */}
        <button
          onClick={() => !disabled && onTokenChange('ETH')}
          disabled={disabled}
          className={`
            p-4 rounded-lg border-2 transition-all
            ${selectedToken === 'ETH'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">ETH</span>
            {selectedToken === 'ETH' && (
              <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full">Selected</span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div>Wallet: {ethBalanceFormatted} ETH</div>
            <div>Vault: {vaultBalanceFormatted} ETH</div>
          </div>
        </button>

        {/* USDT Option */}
        <button
          onClick={() => !disabled && onTokenChange('USDT')}
          disabled={disabled}
          className={`
            p-4 rounded-lg border-2 transition-all
            ${selectedToken === 'USDT'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">USDT</span>
            {selectedToken === 'USDT' && (
              <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full">Selected</span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div>Wallet: {usdtBalanceFormatted} USDT</div>
            <div>Vault: {vaultUsdtBalanceFormatted} USDT</div>
          </div>
        </button>
      </div>
    </div>
  )
}
