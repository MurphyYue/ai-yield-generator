'use client'

import { useVault } from '@/hooks/useVault'

export function SystemPausedBanner() {
  const { isPaused } = useVault()

  if (!isPaused) return null

  return (
    <div className="bg-red-600 dark:bg-red-900 border-l-4 border-red-800 dark:border-red-700 p-4 mb-6 rounded-r-lg shadow-lg animate-pulse">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-red-200 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-semibold text-red-100 dark:text-white">
            System Paused
          </h3>
          <div className="mt-1 text-sm text-red-200 dark:text-red-300">
            <p>All deposit and withdraw operations are currently suspended. Please contact the system administrator for assistance.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
