'use client'

import { useState } from 'react'

// Intent types
interface Intent {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
}

interface AIPanelProps {
  onIntentParsed?: (intent: Intent) => void
}

export function AIPanel({ onIntentParsed }: AIPanelProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [intent, setIntent] = useState<Intent | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleProcess = async () => {
    if (!message.trim()) return

    setIsLoading(true)
    setError(null)
    setIntent(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      })

      const data = await response.json()

      if (data.success && data.intent) {
        const parsedIntent = data.intent as Intent
        setIntent(parsedIntent)

        // Notify parent component
        if (onIntentParsed) {
          onIntentParsed(parsedIntent)
        }

        // Show error for unknown intent
        // TODO - In the future, we can add a feedback loop to improve the model based on user corrections
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        AI Command
      </h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Try: &quot;deposit 1 ETH&quot;, &quot;withdraw 0.5 USDT&quot;, or &quot;存入 100 USDT&quot;
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
          </div>

          {/* Token Address (for debugging) */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <span className="text-xs text-gray-500 dark:text-gray-400">Token Address: </span>
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
              {intent.token_address.slice(0, 6)}...{intent.token_address.slice(-4)}
            </span>
          </div>
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
