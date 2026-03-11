'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { VAULT_ABI, VAULT_ADDRESS } from '@/lib/vault'
import { parseEther, formatEther } from 'viem'
import { useCallback, useEffect, useState } from 'react'

export function useVaultContract() {
  const { address } = useAccount()
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  // Read vault balance
  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Write contract - Deposit
  const { writeContract: writeDeposit, data: depositHash } = useWriteContract()
  const { isLoading: isDepositing, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({
      hash: depositHash,
    })

  // Write contract - Withdraw
  const { writeContract: writeWithdraw, data: withdrawHash } = useWriteContract()
  const { isLoading: isWithdrawing, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({
      hash: withdrawHash,
    })

  // Auto-refetch balance after successful transactions
  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess) {
      console.log('Transaction successful, incrementing refetch trigger')
      refetchVaultBalance()
      setRefetchTrigger(prev => prev + 1)
    }
  }, [isDepositSuccess, isWithdrawSuccess, refetchVaultBalance])

  // Deposit function
  const deposit = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeDeposit({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'deposit',
        value: parseEther(amount),
      })
    },
    [writeDeposit]
  )

  // Withdraw function
  const withdraw = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeWithdraw({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [parseEther(amount)],
      })
    },
    [writeWithdraw]
  )

  // Refetch balance
  const refetch = useCallback(() => {
    refetchVaultBalance()
  }, [refetchVaultBalance])

  return {
    // State
    vaultBalance: vaultBalance ?? BigInt(0),
    vaultBalanceFormatted: vaultBalance ? formatEther(vaultBalance) : '0',

    // Actions
    deposit,
    withdraw,
    refetch,

    // Loading states
    isDepositing,
    isWithdrawing,

    // Transaction success
    isDepositSuccess,
    isWithdrawSuccess,

    // Transaction hashes
    depositHash,
    withdrawHash,

    // Refetch trigger for ETH balance
    refetchTrigger,
  }
}
