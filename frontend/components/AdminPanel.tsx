'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useVault } from '@/hooks/useVault'

export function AdminPanel() {
  const { address } = useAccount()
  const {
    isPaused,
    pause,
    unpause,
    isPausing,
    isUnpausing,
    isPauseSuccess,
    isUnpauseSuccess,
  } = useVault()

  const [showManagerOnly, setShowManagerOnly] = useState(false)

  useEffect(() => {
    if (isPauseSuccess || isUnpauseSuccess) {
      const timer = setTimeout(() => {
        window.location.reload()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isPauseSuccess, isUnpauseSuccess])

  const handlePause = async () => {
    try {
      await pause()
    } catch (error) {
      console.error('Pause failed:', error)
      alert('Failed to pause contract. You may not have MANAGER_ROLE.')
    }
  }

  const handleUnpause = async () => {
    try {
      await unpause()
    } catch (error) {
      console.error('Unpause failed:', error)
      alert('Failed to unpause contract. You may not have MANAGER_ROLE.')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Admin Panel
        </h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {isPaused ? 'PAUSED' : 'ACTIVE'}
          </span>
        </div>
      </div>

      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span className="font-semibold">Connected Address:</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
          {address || 'Not connected'}
        </p>
      </div>

      {isPaused && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">
            <span className="font-semibold">⚠️ System Paused</span>
          </p>
          <p className="text-xs text-red-700 dark:text-red-400 mt-1">
            All deposit and withdraw operations are currently suspended.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {!isPaused ? (
          <button
            onClick={handlePause}
            disabled={isPausing || isUnpausing}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {isPausing ? 'Pausing...' : 'Pause System'}
          </button>
        ) : (
          <button
            onClick={handleUnpause}
            disabled={isUnpausing || isPausing}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {isUnpausing ? 'Unpausing...' : 'Resume System'}
          </button>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Only accounts with MANAGER_ROLE can pause/unpause the system.
        </div>
      </div>

      {(isPauseSuccess || isUnpauseSuccess) && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm">
          {isPauseSuccess ? 'System paused successfully!' : 'System resumed successfully!'}
        </div>
      )}
    </div>
  )
}
