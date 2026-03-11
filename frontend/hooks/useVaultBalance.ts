'use client'

import { useAccount, useBalance } from 'wagmi'
import { useEffect, useState } from 'react'

interface UseVaultBalanceProps {
  refetchTrigger?: number  // Increment this to force refetch
}

export function useVaultBalance({ refetchTrigger = 0 }: UseVaultBalanceProps = {}) {
  const { address } = useAccount()
  const [, setForceUpdate] = useState(0)

  const { data: ethBalance, refetch: refetchEthBalance } = useBalance({
    address,
    query: {
      enabled: !!address,
      gcTime: 0,
      staleTime: 0,
    },
  })

  // Force refetch when refetchTrigger changes
  useEffect(() => {
    console.log('useVaultBalance - refetchTrigger:', refetchTrigger)

    if (refetchTrigger > 0) {
      console.log('Triggering ETH balance refetch...')

      const timer = setTimeout(async () => {
        try {
          await refetchEthBalance()
          console.log('ETH balance refetch completed')
          setForceUpdate(prev => prev + 1)
        } catch (error) {
          console.error('Error refetching ETH balance:', error)
        }
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [refetchTrigger, refetchEthBalance])

  return {
    ethBalance: ethBalance?.value ?? BigInt(0),
    ethBalanceFormatted: ethBalance?.formatted ?? '0',
    ethSymbol: ethBalance?.symbol ?? 'ETH',
    refetchEthBalance,
  }
}
