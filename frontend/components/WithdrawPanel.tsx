'use client'

import { useState, useEffect, useCallback } from 'react'
import { useVault } from '@/hooks/useVault'
import { TokenSelector, TokenType } from './TokenSelector'

interface Intent {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
}

interface WithdrawPanelProps {
  intent?: Intent | null
}

export function WithdrawPanel({ intent }: WithdrawPanelProps) {
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<TokenType>('ETH')
  const [isSimulating, setIsSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    withdraw,
    withdrawUsdt,
    simulateWithdraw,
    simulateWithdrawUsdt,
    isWithdrawing,
    isWithdrawingToken,
    isWithdrawSuccess,
    isWithdrawTokenSuccess,
    vaultBalanceFormatted,
    vaultUsdtBalanceFormatted,
    ethBalanceFormatted,
    usdtBalanceFormatted,
  } = useVault()

  // Auto-fill from AI intent
  useEffect(() => {
    if (intent && intent.action === 'withdraw' && intent.amount > 0) {
      setAmount(intent.amount.toString())
      if (intent.token === 'ETH' || intent.token === 'USDT') {
        setSelectedToken(intent.token)
      }
    }
  }, [intent])

  // Clear error when amount changes
  useEffect(() => {
    setError(null)
  }, [amount, selectedToken])

  const handleWithdraw = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setError(null)

    if (selectedToken === 'ETH') {
      // Simulate first
      setIsSimulating(true)
      const simError = await simulateWithdraw(amount)
      setIsSimulating(false)

      if (simError) {
        setError(simError.message)
        return
      }

      // Simulation passed, execute
      withdraw(amount)

    } else if (selectedToken === 'USDT') {
      // Simulate first
      setIsSimulating(true)
      const simError = await simulateWithdrawUsdt(amount)
      setIsSimulating(false)

      if (simError) {
        setError(simError.message)
        return
      }

      // Simulation passed, execute
      withdrawUsdt(amount)
    }
  }, [amount, selectedToken, simulateWithdraw, simulateWithdrawUsdt, withdraw, withdrawUsdt])

  const handleSetMax = () => {
    setAmount(selectedToken === 'ETH' ? vaultBalanceFormatted : vaultUsdtBalanceFormatted)
  }

  const getMaxAmount = () => {
    if (selectedToken === 'ETH') {
      return vaultBalanceFormatted
    } else {
      return vaultUsdtBalanceFormatted
    }
  }

  const getWalletBalance = () => {
    if (selectedToken === 'ETH') {
      return ethBalanceFormatted
    } else {
      return usdtBalanceFormatted
    }
  }

  const getVaultBalance = () => {
    if (selectedToken === 'ETH') {
      return vaultBalanceFormatted
    } else {
      return vaultUsdtBalanceFormatted
    }
  }

  const isLoading = isWithdrawing || isWithdrawingToken
  const isSuccess = isWithdrawSuccess || isWithdrawTokenSuccess

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Withdraw {selectedToken}
        </h2>
        {intent && intent.action === 'withdraw' && (
          <span className="text-xs px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
            AI Parsed
          </span>
        )}
      </div>

      {/* Token Selector */}
      <TokenSelector
        selectedToken={selectedToken}
        onTokenChange={setSelectedToken}
        disabled={isLoading}
      />

      {/* Show AI intent info */}
      {intent && intent.action === 'withdraw' && intent.token !== selectedToken && (
        <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-gray-600 dark:text-gray-400">
          AI suggested: Withdraw {intent.amount} {intent.token}
        </div>
      )}

      {/* Simulation Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">
            <span className="font-semibold">⚠️ Simulation Failed:</span> {error}
          </p>
          <p className="text-xs text-red-700 dark:text-red-400 mt-1">
            Please fix the error before proceeding.
          </p>
        </div>
      )}

      {/* Balance Display */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Wallet Balance:{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {getWalletBalance()} {selectedToken}
          </span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Available in Vault:{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {getVaultBalance()} {selectedToken}
          </span>
        </p>
        <button
          onClick={handleSetMax}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          disabled={isLoading}
        >
          Set Max
        </button>
      </div>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={`Amount in ${selectedToken}`}
        step="0.000001"
        min="0"
        max={getMaxAmount()}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
      />

      <button
        onClick={handleWithdraw}
        disabled={
          isLoading ||
          isSimulating ||
          !amount ||
          parseFloat(amount) <= 0 ||
          parseFloat(amount) > parseFloat(getMaxAmount())
        }
        className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isSimulating
          ? 'Checking...'
          : isLoading
          ? 'Withdrawing...'
          : `Withdraw ${amount || '0'} ${selectedToken}`
        }
      </button>

      {isSuccess && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm">
          Withdrawal successful! Your balance has been updated.
        </div>
      )}
    </div>
  )
}
