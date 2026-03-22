'use client'

import { useState } from 'react'
import { useVault } from '@/hooks/useVault'

// Intent types - amount is always a number (API converts percentage to number)
interface Intent {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
  risk_level?: 'high' | 'medium' | 'low'
  risk_reason?: string
}

interface AIPanelProps {
  onIntentParsed?: (intent: Intent) => void
}

export function AIPanel({ onIntentParsed }: AIPanelProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [intent, setIntent] = useState<Intent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [riskConfirmed, setRiskConfirmed] = useState(false)

  // Get vault balances for risk calculation
  const { vaultBalanceFormatted, vaultUsdtBalanceFormatted } = useVault()

  const handleProcess = async () => {
    if (!message.trim()) return

    setIsLoading(true)
    setError(null)
    setIntent(null)
    setRiskConfirmed(false)

    try {
      // Pass vault balances to API for risk calculation
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          vaultBalances: {
            ETH: parseFloat(vaultBalanceFormatted) || 0,
            USDT: parseFloat(vaultUsdtBalanceFormatted) || 0,
          }
        }),
      })

      const data = await response.json()

      if (data.success && data.intent) {
        const parsedIntent = data.intent as Intent
        setIntent(parsedIntent)

        // For HIGH risk, show confirmation modal - don't notify parent yet
        if (parsedIntent.risk_level === 'high') {
          return // Wait for user confirmation before proceeding
        }

        // For MEDIUM and LOW risk, notify parent directly
        if (onIntentParsed) {
          onIntentParsed(parsedIntent)
        }

        // Show error for unknown intent
        if (parsedIntent.action === 'unknown' || parsedIntent.confidence === 'low') {
          setError('Could not understand your command. Please try again with "deposit" or "withdraw".')
        }
      } else {
        setError(data.error || 'Failed to process intent')
      }
    } catch (err) {
      console.error('Error processing intent:', err)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleProcess()
    }
  }

  const handleClear = () => {
    setMessage('')
    setIntent(null)
    setError(null)
    setRiskConfirmed(false)
  }

  // Handle HIGH risk confirmation
  const handleRiskConfirm = () => {
    setRiskConfirmed(true)
    // Trigger parent callback with confirmed intent
    if (intent && onIntentParsed) {
      onIntentParsed({ ...intent, risk_level: intent.risk_level })
    }
  }

  const handleRiskCancel = () => {
    setShowRiskConfirmation(false)
    setRiskConfirmed(false)
    setIntent(null)
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 dark:text-green-400'
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'low':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'deposit':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
      case 'withdraw':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
    }
  }

  const getRiskColor = (risk: string | undefined) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
      case 'low':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
    }
  }

  const getRiskIcon = (risk: string | undefined) => {
    switch (risk) {
      case 'high':
        return '⚠️'
      case 'medium':
        return '⚡'
      case 'low':
        return '✓'
      default:
        return '?'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        AI Command
      </h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Try: &quot;deposit 1 ETH&quot;, &quot;withdraw all USDT&quot;, &quot;取出 50% ETH&quot;
      </p>

      {/* Input Section */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter your command..."
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={handleProcess}
          disabled={isLoading || !message.trim()}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isLoading ? 'Processing...' : 'Process'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Intent Display */}
      {intent && intent.action !== 'unknown' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Parsed Intent
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Action */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Action</span>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getActionColor(intent.action)}`}>
                {intent.action.toUpperCase()}
              </span>
            </div>

            {/* Amount */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Amount</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {intent.amount}
              </span>
            </div>

            {/* Token */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Token</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {intent.token}
              </span>
            </div>

            {/* Confidence */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Confidence</span>
              <span className={`text-lg font-bold ${getConfidenceColor(intent.confidence)}`}>
                {intent.confidence.toUpperCase()}
              </span>
            </div>

            {/* Risk Level */}
            <div className="flex flex-col col-span-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Risk Assessment</span>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(intent.risk_level)}`}>
                <span>{getRiskIcon(intent.risk_level)}</span>
                <span>{intent.risk_level?.toUpperCase() || 'LOW'} RISK</span>
              </span>
              {intent.risk_reason && (
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {intent.risk_reason}
                </span>
              )}
            </div>
          </div>

          {/* Token Address (for debugging) */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <span className="text-xs text-gray-500 dark:text-gray-400">Token Address: </span>
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
              {intent.token_address.slice(0, 6)}...{intent.token_address.slice(-4)}
            </span>
          </div>

          {/* HIGH RISK Confirmation Modal */}
          {intent.risk_level === 'high' && !riskConfirmed && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300 font-semibold mb-2">
                ⚠️ High Risk Transaction Detected
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mb-3">
                {intent.risk_reason || 'This transaction has been flagged as high risk. Please confirm you want to proceed.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRiskConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Confirm & Continue
                </button>
                <button
                  onClick={handleRiskCancel}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* MEDIUM RISK Warning */}
          {intent.risk_level === 'medium' && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                ⚡ <span className="font-semibold">Medium Risk</span>: {intent.risk_reason || 'Please review this transaction carefully.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Clear Button */}
      {(intent || error) && (
        <button
          onClick={handleClear}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Clear
        </button>
      )}
    </div>
  )
}
