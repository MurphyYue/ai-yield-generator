'use client'

import { useState, useEffect, useCallback } from 'react'
import { useVault, SimulationError } from '@/hooks/useVault'
import { TokenSelector, TokenType } from './TokenSelector'

interface Intent {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
}

interface DepositPanelProps {
  intent?: Intent | null
}

export function DepositPanel({ intent }: DepositPanelProps) {
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<TokenType>('ETH')
  const [isSimulating, setIsSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    deposit,
    depositUsdt,
    approveUsdt,
    simulateDeposit,
    simulateDepositUsdt,
    simulateApproveUsdt,
    isDepositing,
    isDepositingToken,
    isApproving,
    isDepositSuccess,
    isDepositTokenSuccess,
    isApproveSuccess,
    usdtAllowance,
    usdtAllowanceFormatted,
    ethBalanceFormatted,
    usdtBalanceFormatted,
    vaultBalanceFormatted,
    vaultUsdtBalanceFormatted,
  } = useVault()

  // Auto-fill from AI intent
  useEffect(() => {
    if (intent && intent.action === 'deposit' && intent.amount > 0) {
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

  const handleDeposit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setError(null)

    if (selectedToken === 'ETH') {
      // Simulate first
      setIsSimulating(true)
      const simError = await simulateDeposit(amount)
      setIsSimulating(false)

      if (simError) {
        setError(simError.message)
        return
      }

      // Simulation passed, execute
      deposit(amount)

    } else if (selectedToken === 'USDT') {
      const amountWei = parseFloat(amount) * 1_000_000 // USDT has 6 decimals

      // Check if allowance is sufficient
      if (!usdtAllowance || usdtAllowance < amountWei) {
        // Simulate approval first
        setIsSimulating(true)
        const simError = await simulateApproveUsdt(amount)
        setIsSimulating(false)

        if (simError) {
          setError(simError.message)
          return
        }

        // Simulation passed, approve
        approveUsdt(amount)
      } else {
        // Simulate deposit first
        setIsSimulating(true)
        const simError = await simulateDepositUsdt(amount)
        setIsSimulating(false)

        if (simError) {
          setError(simError.message)
          return
        }

        // Simulation passed, deposit
        depositUsdt(amount)
      }
    }
  }, [amount, selectedToken, simulateDeposit, simulateDepositUsdt, simulateApproveUsdt, usdtAllowance, deposit, depositUsdt, approveUsdt])

  const getMaxAmount = () => {
    if (selectedToken === 'ETH') {
      return ethBalanceFormatted
    } else {
      return usdtBalanceFormatted
    }
  }

  const getAvailableBalance = () => {
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

  const isLoading = isDepositing || isDepositingToken || isApproving
  const isSuccess = isDepositSuccess || isDepositTokenSuccess || isApproveSuccess

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Deposit {selectedToken}
        </h2>
        {intent && intent.action === 'deposit' && (
          <span className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
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
      {intent && intent.action === 'deposit' && intent.token !== selectedToken && (
        <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-gray-600 dark:text-gray-400">
          AI suggested: Deposit {intent.amount} {intent.token}
        </div>
      )}

      {/* USDT Allowance Warning */}
      {selectedToken === 'USDT' && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <span className="font-semibold">Allowance:</span> {usdtAllowanceFormatted} USDT approved
          </p>
          {parseFloat(amount) > parseFloat(usdtAllowanceFormatted) && (
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              ⚠️ Insufficient allowance. Clicking Deposit will approve {amount} USDT first.
            </p>
          )}
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
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Available:{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {getAvailableBalance()} {selectedToken}
          </span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Vault Balance:{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {getVaultBalance()} {selectedToken}
          </span>
        </p>
      </div>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={`Amount in ${selectedToken}`}
        step="0.000001"
        min="0"
        max={getMaxAmount()}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
      />

      <button
        onClick={handleDeposit}
        disabled={isLoading || isSimulating || !amount || parseFloat(amount) <= 0}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isSimulating
          ? 'Checking...'
          : isLoading
          ? isApproving
            ? 'Approving...'
            : 'Depositing...'
          : selectedToken === 'USDT' && parseFloat(amount) > parseFloat(usdtAllowanceFormatted)
          ? `Approve & Deposit ${amount} ${selectedToken}`
          : `Deposit ${amount || '0'} ${selectedToken}`
        }
      </button>

      {isSuccess && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm">
          {isApproveSuccess
            ? `Approved! You can now deposit ${amount} ${selectedToken}`
            : `Deposit successful! Your balance has been updated.`
          }
        </div>
      )}
    </div>
  )
}
