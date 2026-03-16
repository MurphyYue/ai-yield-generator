'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, usePublicClient, useConfig } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import { VAULT_ABI, VAULT_ADDRESS, ERC20_ABI, MOCK_USDT_ADDRESS } from '@/lib/vault'
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem'
import { useCallback, useEffect, useState } from 'react'

// Simulation error types
export interface SimulationError {
  type: 'insufficient_balance' | 'insufficient_allowance' | 'revert' | 'unknown'
  message: string
  shortMessage: string
}

export function useVault() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const config = useConfig()

  // Simulation error state
  const [simulationError, setSimulationError] = useState<SimulationError | null>(null)

  // Helper function to parse simulation errors
  const parseSimulationError = (error: any): SimulationError => {
    const message = error?.message || 'Unknown error'
    const shortMessage = error?.shortMessage || error?.data?.message || message

    // Determine error type
    const lowerMessage = shortMessage.toLowerCase()
    if (lowerMessage.includes('insufficient balance')) {
      return {
        type: 'insufficient_balance',
        message: 'Insufficient balance for this transaction',
        shortMessage
      }
    }
    if (lowerMessage.includes('insufficient allowance')) {
      return {
        type: 'insufficient_allowance',
        message: 'Insufficient allowance. Please approve the token first.',
        shortMessage
      }
    }
    if (lowerMessage.includes('revert') || lowerMessage.includes('failed')) {
      return {
        type: 'revert',
        message: 'Transaction would fail. Please check your inputs.',
        shortMessage
      }
    }
    return {
      type: 'unknown',
      message: 'Transaction could not be simulated',
      shortMessage
    }
  }

  // Simulate ETH deposit
  const simulateDeposit = useCallback(async (amount: string) => {
    if (!address || !config) return null
    try {
      await simulateContract(config, {
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'deposit',
        value: parseEther(amount),
        account: address,
      })
      return null
    } catch (error: any) {
      return parseSimulationError(error)
    }
  }, [address, config])

  // Simulate ETH withdraw
  const simulateWithdraw = useCallback(async (amount: string) => {
    if (!address || !config) return null
    try {
      await simulateContract(config, {
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [parseEther(amount)],
        account: address,
      })
      return null
    } catch (error: any) {
      return parseSimulationError(error)
    }
  }, [address, config])

  // Simulate USDT deposit
  const simulateDepositUsdt = useCallback(async (amount: string) => {
    if (!address || !config) return null
    try {
      await simulateContract(config, {
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'depositToken',
        args: [MOCK_USDT_ADDRESS, parseUnits(amount, 6)],
        account: address,
      })
      return null
    } catch (error: any) {
      return parseSimulationError(error)
    }
  }, [address, config])

  // Simulate USDT withdraw
  const simulateWithdrawUsdt = useCallback(async (amount: string) => {
    if (!address || !config) return null
    try {
      await simulateContract(config, {
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'withdrawToken',
        args: [MOCK_USDT_ADDRESS, parseUnits(amount, 6)],
        account: address,
      })
      return null
    } catch (error: any) {
      return parseSimulationError(error)
    }
  }, [address, config])

  // Simulate USDT approve
  const simulateApproveUsdt = useCallback(async (amount: string) => {
    if (!address || !config) return null
    try {
      await simulateContract(config, {
        address: MOCK_USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [VAULT_ADDRESS, parseUnits(amount, 6)],
        account: address,
      })
      return null
    } catch (error: any) {
      return parseSimulationError(error)
    }
  }, [address, config])

  // Read ETH balance
  const { data: ethBalance, refetch: refetchEthBalance } = useBalance({
    address,
    query: {
      enabled: !!address,
    },
  })

  // Read vault ETH balance
  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Read USDT balance
  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: MOCK_USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Read vault USDT balance
  const { data: vaultUsdtBalance, refetch: refetchVaultUsdtBalance } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'getTokenBalance',
    args: address ? [MOCK_USDT_ADDRESS, address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Read USDT allowance
  const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract({
    address: MOCK_USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Write contract - ETH Deposit
  const { writeContract: writeDeposit, data: depositHash } = useWriteContract()
  const { isLoading: isDepositing, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({
      hash: depositHash,
    })

  // Write contract - ETH Withdraw
  const { writeContract: writeWithdraw, data: withdrawHash } = useWriteContract()
  const { isLoading: isWithdrawing, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({
      hash: withdrawHash,
    })

  // Write contract - Approve USDT
  const { writeContract: writeApprove, data: approveHash } = useWriteContract()
  const { isLoading: isApproving, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    })

  // Write contract - USDT Deposit
  const { writeContract: writeDepositToken, data: depositTokenHash } = useWriteContract()
  const { isLoading: isDepositingToken, isSuccess: isDepositTokenSuccess } =
    useWaitForTransactionReceipt({
      hash: depositTokenHash,
    })

  // Write contract - USDT Withdraw
  const { writeContract: writeWithdrawToken, data: withdrawTokenHash } = useWriteContract()
  const { isLoading: isWithdrawingToken, isSuccess: isWithdrawTokenSuccess } =
    useWaitForTransactionReceipt({
      hash: withdrawTokenHash,
    })

  // Auto-refetch all balances after successful transactions
  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess) {
      setTimeout(() => {
        refetchEthBalance()
        refetchVaultBalance()
      }, 1000)
    }
    if (isDepositTokenSuccess || isWithdrawTokenSuccess || isApproveSuccess) {
      setTimeout(() => {
        refetchUsdtBalance()
        refetchVaultUsdtBalance()
        refetchUsdtAllowance()
      }, 1000)
    }
  }, [
    isDepositSuccess,
    isWithdrawSuccess,
    isDepositTokenSuccess,
    isWithdrawTokenSuccess,
    isApproveSuccess,
    refetchEthBalance,
    refetchVaultBalance,
    refetchUsdtBalance,
    refetchVaultUsdtBalance,
    refetchUsdtAllowance,
  ])

  // ETH Deposit function
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

  // ETH Withdraw function
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

  // Approve USDT function
  const approveUsdt = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeApprove({
        address: MOCK_USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [VAULT_ADDRESS, parseUnits(amount, 6)], // USDT has 6 decimals
      })
    },
    [writeApprove]
  )

  // USDT Deposit function
  const depositUsdt = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeDepositToken({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'depositToken',
        args: [MOCK_USDT_ADDRESS, parseUnits(amount, 6)],
      })
    },
    [writeDepositToken]
  )

  // USDT Withdraw function
  const withdrawUsdt = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeWithdrawToken({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'withdrawToken',
        args: [MOCK_USDT_ADDRESS, parseUnits(amount, 6)],
      })
    },
    [writeWithdrawToken]
  )

  return {
    // ETH Balances
    ethBalance: ethBalance?.value ?? BigInt(0),
    ethBalanceFormatted: ethBalance?.formatted ?? '0',
    ethSymbol: ethBalance?.symbol ?? 'ETH',

    vaultBalance: vaultBalance ?? BigInt(0),
    vaultBalanceFormatted: vaultBalance ? formatEther(vaultBalance) : '0',

    // USDT Balances
    usdtBalance: usdtBalance ?? BigInt(0),
    usdtBalanceFormatted: usdtBalance ? formatUnits(usdtBalance, 6) : '0',

    vaultUsdtBalance: vaultUsdtBalance ?? BigInt(0),
    vaultUsdtBalanceFormatted: vaultUsdtBalance ? formatUnits(vaultUsdtBalance, 6) : '0',

    usdtAllowance: usdtAllowance ?? BigInt(0),
    usdtAllowanceFormatted: usdtAllowance ? formatUnits(usdtAllowance, 6) : '0',

    // ETH Actions
    deposit,
    withdraw,

    // USDT Actions
    approveUsdt,
    depositUsdt,
    withdrawUsdt,

    // ETH Loading states
    isDepositing,
    isWithdrawing,

    // USDT Loading states
    isApproving,
    isDepositingToken,
    isWithdrawingToken,

    // ETH Transaction success
    isDepositSuccess,
    isWithdrawSuccess,

    // USDT Transaction success
    isApproveSuccess,
    isDepositTokenSuccess,
    isWithdrawTokenSuccess,

    // Transaction hashes
    depositHash,
    withdrawHash,
    approveHash,
    depositTokenHash,
    withdrawTokenHash,

    // Simulation functions
    simulateDeposit,
    simulateWithdraw,
    simulateDepositUsdt,
    simulateWithdrawUsdt,
    simulateApproveUsdt,
    simulationError,
    setSimulationError,
  }
}
