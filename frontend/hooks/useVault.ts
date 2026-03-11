'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi'
import { VAULT_ABI, VAULT_ADDRESS } from '@/lib/vault'
import { parseEther, formatEther } from 'viem'
import { useCallback, useEffect } from 'react'

export function useVault() {
  const { address } = useAccount()

  // Read ETH balance
  const { data: ethBalance, refetch: refetchEthBalance } = useBalance({
    address,
    query: {
      enabled: !!address,
    },
  })

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

  // Auto-refetch both balances after successful transactions
  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess) {
      // Small delay to ensure blockchain state is updated
      setTimeout(() => {
        refetchEthBalance()
        refetchVaultBalance()
      }, 1000)
    }
  }, [isDepositSuccess, isWithdrawSuccess, refetchEthBalance, refetchVaultBalance])

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

  return {
    // Balances
    ethBalance: ethBalance?.value ?? BigInt(0),
    ethBalanceFormatted: ethBalance?.formatted ?? '0',
    ethSymbol: ethBalance?.symbol ?? 'ETH',

    vaultBalance: vaultBalance ?? BigInt(0),
    vaultBalanceFormatted: vaultBalance ? formatEther(vaultBalance) : '0',

    // Actions
    deposit,
    withdraw,

    // Loading states
    isDepositing,
    isWithdrawing,

    // Transaction success
    isDepositSuccess,
    isWithdrawSuccess,

    // Transaction hashes
    depositHash,
    withdrawHash,
  }
}
