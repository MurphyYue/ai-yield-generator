'use client'

import {
  useAccount,
  useBalance,
  useConfig,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { simulateContract } from '@wagmi/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatEther, formatUnits, parseEther, parseUnits } from 'viem'
import {
  ERC20_PERMIT_ABI,
  VAULT_ABI,
  getDefaultChainIdFromEnv,
  getStableTokenAddressForChain,
  getStableTokenSymbolForChain,
  getVaultAddressForChain,
} from '@/lib/vault'
import { getChainKey } from '@/lib/chains'

export interface SimulationError {
  type: 'insufficient_balance' | 'insufficient_allowance' | 'paused' | 'access_denied' | 'revert' | 'unknown'
  message: string
  shortMessage: string
}

type ErrorLike = {
  message?: string
  shortMessage?: string
  data?: {
    message?: string
  }
}

export function useVault() {
  const { address, chainId } = useAccount()
  const config = useConfig()
  const [simulationError, setSimulationError] = useState<SimulationError | null>(null)

  const activeChainId = chainId ?? getDefaultChainIdFromEnv()
  const activeChainKey = getChainKey(activeChainId)
  const vaultAddress = useMemo(() => getVaultAddressForChain(activeChainKey), [activeChainKey])
  const stableTokenAddress = useMemo(
    () => getStableTokenAddressForChain(activeChainKey),
    [activeChainKey]
  )
  const stableTokenSymbol = useMemo(
    () => getStableTokenSymbolForChain(activeChainKey),
    [activeChainKey]
  )

  const parseSimulationError = (error: unknown): SimulationError => {
    const err = error as ErrorLike
    const message = err.message || 'Unknown error'
    const shortMessage = err.shortMessage || err.data?.message || message
    const lowerMessage = shortMessage.toLowerCase()

    if (lowerMessage.includes('enforcedpause') || lowerMessage.includes('paused')) {
      return {
        type: 'paused',
        message: 'System is paused. Contact admin to resume operations.',
        shortMessage,
      }
    }

    if (
      lowerMessage.includes('accesscontrol') ||
      lowerMessage.includes('access denied') ||
      lowerMessage.includes('missing role') ||
      lowerMessage.includes('access control error')
    ) {
      return {
        type: 'access_denied',
        message: 'Insufficient permissions for this operation.',
        shortMessage,
      }
    }

    if (lowerMessage.includes('insufficient balance')) {
      return {
        type: 'insufficient_balance',
        message: 'Insufficient balance for this transaction',
        shortMessage,
      }
    }

    if (lowerMessage.includes('insufficient allowance')) {
      return {
        type: 'insufficient_allowance',
        message: 'Insufficient allowance. Please approve the token first.',
        shortMessage,
      }
    }

    if (lowerMessage.includes('revert') || lowerMessage.includes('failed')) {
      return {
        type: 'revert',
        message: 'Transaction would fail. Please check your inputs.',
        shortMessage,
      }
    }

    return {
      type: 'unknown',
      message: 'Transaction could not be simulated',
      shortMessage,
    }
  }

  const simulateDeposit = useCallback(
    async (amount: string) => {
      if (!address || !config) return null
      try {
        await simulateContract(config, {
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'deposit',
          value: parseEther(amount),
          account: address,
        })
        return null
      } catch (error: unknown) {
        return parseSimulationError(error)
      }
    },
    [address, config, vaultAddress]
  )

  const simulateWithdraw = useCallback(
    async (amount: string) => {
      if (!address || !config) return null
      try {
        await simulateContract(config, {
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'withdraw',
          args: [parseEther(amount)],
          account: address,
        })
        return null
      } catch (error: unknown) {
        return parseSimulationError(error)
      }
    },
    [address, config, vaultAddress]
  )

  const simulateDepositUsdt = useCallback(
    async (amount: string) => {
      if (!address || !config) return null
      try {
        await simulateContract(config, {
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'depositToken',
          args: [stableTokenAddress, parseUnits(amount, 6)],
          account: address,
        })
        return null
      } catch (error: unknown) {
        return parseSimulationError(error)
      }
    },
    [address, config, stableTokenAddress, vaultAddress]
  )

  const simulateWithdrawUsdt = useCallback(
    async (amount: string) => {
      if (!address || !config) return null
      try {
        await simulateContract(config, {
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'withdrawToken',
          args: [stableTokenAddress, parseUnits(amount, 6)],
          account: address,
        })
        return null
      } catch (error: unknown) {
        return parseSimulationError(error)
      }
    },
    [address, config, stableTokenAddress, vaultAddress]
  )

  const simulateApproveUsdt = useCallback(
    async (amount: string) => {
      if (!address || !config) return null
      try {
        await simulateContract(config, {
          address: stableTokenAddress,
          abi: ERC20_PERMIT_ABI,
          functionName: 'approve',
          args: [vaultAddress, parseUnits(amount, 6)],
          account: address,
        })
        return null
      } catch (error: unknown) {
        return parseSimulationError(error)
      }
    },
    [address, config, stableTokenAddress, vaultAddress]
  )

  const { data: ethBalance, refetch: refetchEthBalance } = useBalance({
    address,
    query: { enabled: !!address },
  })

  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'paused',
    query: { enabled: true },
  })

  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: stableTokenAddress,
    abi: ERC20_PERMIT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: vaultUsdtBalance, refetch: refetchVaultUsdtBalance } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getTokenBalance',
    args: address ? [stableTokenAddress, address] : undefined,
    query: { enabled: !!address },
  })

  const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract({
    address: stableTokenAddress,
    abi: ERC20_PERMIT_ABI,
    functionName: 'allowance',
    args: address ? [address, vaultAddress] : undefined,
    query: { enabled: !!address },
  })

  const { writeContract: writeDeposit, data: depositHash } = useWriteContract()
  const { isLoading: isDepositing, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash })

  const { writeContract: writeWithdraw, data: withdrawHash } = useWriteContract()
  const { isLoading: isWithdrawing, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash })

  const { writeContract: writeApprove, data: approveHash } = useWriteContract()
  const { isLoading: isApproving, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: writeDepositToken, data: depositTokenHash } = useWriteContract()
  const { isLoading: isDepositingToken, isSuccess: isDepositTokenSuccess } =
    useWaitForTransactionReceipt({ hash: depositTokenHash })

  const { writeContract: writeWithdrawToken, data: withdrawTokenHash } = useWriteContract()
  const { isLoading: isWithdrawingToken, isSuccess: isWithdrawTokenSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawTokenHash })

  const deposit = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeDeposit({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'deposit',
        value: parseEther(amount),
      })
    },
    [vaultAddress, writeDeposit]
  )

  const withdraw = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeWithdraw({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [parseEther(amount)],
      })
    },
    [vaultAddress, writeWithdraw]
  )

  const approveUsdt = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeApprove({
        address: stableTokenAddress,
        abi: ERC20_PERMIT_ABI,
        functionName: 'approve',
        args: [vaultAddress, parseUnits(amount, 6)],
      })
    },
    [stableTokenAddress, vaultAddress, writeApprove]
  )

  const depositUsdt = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeDepositToken({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'depositToken',
        args: [stableTokenAddress, parseUnits(amount, 6)],
      })
    },
    [stableTokenAddress, vaultAddress, writeDepositToken]
  )

  const { writeContract: writeDepositWithPermit, data: depositWithPermitHash } =
    useWriteContract()
  const { isLoading: isDepositingWithPermit, isSuccess: isDepositWithPermitSuccess } =
    useWaitForTransactionReceipt({ hash: depositWithPermitHash })

  const depositUsdtWithPermit = useCallback(
    (
      amount: string,
      signature: { v: number; r: `0x${string}`; s: `0x${string}`; deadline: bigint }
    ) => {
      if (!amount || parseFloat(amount) <= 0 || !address) return
      writeDepositWithPermit({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'depositWithPermit',
        args: [
          stableTokenAddress,
          parseUnits(amount, 6),
          address,
          signature.deadline,
          signature.v,
          signature.r,
          signature.s,
        ],
      })
    },
    [address, stableTokenAddress, vaultAddress, writeDepositWithPermit]
  )

  const withdrawUsdt = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeWithdrawToken({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'withdrawToken',
        args: [stableTokenAddress, parseUnits(amount, 6)],
      })
    },
    [stableTokenAddress, vaultAddress, writeWithdrawToken]
  )

  const { writeContract: writePause, data: pauseHash } = useWriteContract()
  const { isLoading: isPausing, isSuccess: isPauseSuccess } =
    useWaitForTransactionReceipt({ hash: pauseHash })

  const pause = useCallback(() => {
    writePause({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'pause',
    })
  }, [vaultAddress, writePause])

  const { writeContract: writeUnpause, data: unpauseHash } = useWriteContract()
  const { isLoading: isUnpausing, isSuccess: isUnpauseSuccess } =
    useWaitForTransactionReceipt({ hash: unpauseHash })

  const unpause = useCallback(() => {
    writeUnpause({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'unpause',
    })
  }, [vaultAddress, writeUnpause])

  const { data: strategyBalance, refetch: refetchStrategyBalance } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getStrategyBalance',
    query: { enabled: !!address },
  })

  const { data: vaultTokenHoldings, refetch: refetchVaultTokenHoldings } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getVaultTokenHoldings',
    args: [stableTokenAddress],
    query: { enabled: !!address },
  })

  const { writeContract: writeInvest, data: investHash } = useWriteContract()
  const { isLoading: isInvesting, isSuccess: isInvestSuccess } =
    useWaitForTransactionReceipt({ hash: investHash })

  const invest = useCallback(
    (amount: string) => {
      writeInvest({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'invest',
        args: [stableTokenAddress, parseUnits(amount, 6)],
      })
    },
    [stableTokenAddress, vaultAddress, writeInvest]
  )

  const { writeContract: writeDivest, data: divestHash } = useWriteContract()
  const { isLoading: isDivesting, isSuccess: isDivestSuccess } =
    useWaitForTransactionReceipt({ hash: divestHash })

  const divest = useCallback(
    (amount: string) => {
      writeDivest({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'divest',
        args: [parseUnits(amount, 6)],
      })
    },
    [vaultAddress, writeDivest]
  )

  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess) {
      setTimeout(() => {
        refetchEthBalance()
        refetchVaultBalance()
      }, 1000)
    }

    if (
      isDepositTokenSuccess ||
      isWithdrawTokenSuccess ||
      isApproveSuccess ||
      isDepositWithPermitSuccess
    ) {
      setTimeout(() => {
        refetchUsdtBalance()
        refetchVaultUsdtBalance()
        refetchUsdtAllowance()
        refetchVaultTokenHoldings()
        refetchPaused()
      }, 1000)
    }
  }, [
    isApproveSuccess,
    isDepositSuccess,
    isDepositTokenSuccess,
    isDepositWithPermitSuccess,
    isWithdrawSuccess,
    isWithdrawTokenSuccess,
    refetchEthBalance,
    refetchPaused,
    refetchUsdtAllowance,
    refetchUsdtBalance,
    refetchVaultBalance,
    refetchVaultTokenHoldings,
    refetchVaultUsdtBalance,
  ])

  useEffect(() => {
    if (isInvestSuccess || isDivestSuccess) {
      setTimeout(() => {
        refetchStrategyBalance()
        refetchVaultTokenHoldings()
        refetchVaultUsdtBalance()
      }, 1000)
    }
  }, [
    isDivestSuccess,
    isInvestSuccess,
    refetchStrategyBalance,
    refetchVaultTokenHoldings,
    refetchVaultUsdtBalance,
  ])

  return {
    activeChainId,
    activeChainKey,
    stableTokenAddress,
    stableTokenSymbol,
    vaultAddress,
    ethBalance: ethBalance?.value ?? BigInt(0),
    ethBalanceFormatted: ethBalance?.formatted ?? '0',
    ethSymbol: ethBalance?.symbol ?? 'ETH',
    vaultBalance: vaultBalance ?? BigInt(0),
    vaultBalanceFormatted: vaultBalance ? formatEther(vaultBalance) : '0',
    usdtBalance: usdtBalance ?? BigInt(0),
    usdtBalanceFormatted: usdtBalance ? formatUnits(usdtBalance, 6) : '0',
    vaultUsdtBalance: vaultUsdtBalance ?? BigInt(0),
    vaultUsdtBalanceFormatted: vaultUsdtBalance ? formatUnits(vaultUsdtBalance, 6) : '0',
    usdtAllowance: usdtAllowance ?? BigInt(0),
    usdtAllowanceFormatted: usdtAllowance ? formatUnits(usdtAllowance, 6) : '0',
    deposit,
    withdraw,
    approveUsdt,
    depositUsdt,
    depositUsdtWithPermit,
    withdrawUsdt,
    isDepositing,
    isWithdrawing,
    isApproving,
    isDepositingToken,
    isDepositingWithPermit,
    isWithdrawingToken,
    isDepositSuccess,
    isWithdrawSuccess,
    isApproveSuccess,
    isDepositTokenSuccess,
    isDepositWithPermitSuccess,
    isWithdrawTokenSuccess,
    depositHash,
    withdrawHash,
    approveHash,
    depositTokenHash,
    depositWithPermitHash,
    withdrawTokenHash,
    simulateDeposit,
    simulateWithdraw,
    simulateDepositUsdt,
    simulateWithdrawUsdt,
    simulateApproveUsdt,
    simulationError,
    setSimulationError,
    pause,
    unpause,
    isPaused: isPaused ?? false,
    isPausing,
    isUnpausing,
    isPauseSuccess,
    isUnpauseSuccess,
    pauseHash,
    unpauseHash,
    invest,
    divest,
    isInvesting,
    isDivesting,
    isInvestSuccess,
    isDivestSuccess,
    investHash,
    divestHash,
    strategyBalance: strategyBalance ?? BigInt(0),
    strategyBalanceFormatted: strategyBalance ? formatUnits(strategyBalance, 6) : '0',
    vaultTokenHoldings: vaultTokenHoldings ?? BigInt(0),
    vaultTokenHoldingsFormatted: vaultTokenHoldings ? formatUnits(vaultTokenHoldings, 6) : '0',
  }
}
