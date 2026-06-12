'use client'

import {
  useAccount,
  useBalance,
  useConfig,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { readContract, simulateContract } from '@wagmi/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import {
  ERC20_ABI,
  ROLE_IDS,
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

const ASSET_DECIMALS = 6

function fmt6(value?: bigint | null) {
  return value ? formatUnits(value, ASSET_DECIMALS) : '0'
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

    if (lowerMessage.includes('paused')) {
      return {
        type: 'paused',
        message: 'Vault is paused. Deposits and withdrawals are temporarily disabled.',
        shortMessage,
      }
    }

    if (
      lowerMessage.includes('accesscontrol') ||
      lowerMessage.includes('access denied') ||
      lowerMessage.includes('missing role')
    ) {
      return {
        type: 'access_denied',
        message: 'Connected wallet does not have permission for this action.',
        shortMessage,
      }
    }

    if (lowerMessage.includes('insufficient balance') || lowerMessage.includes('exceededmax')) {
      return {
        type: 'insufficient_balance',
        message: 'Insufficient balance for this transaction.',
        shortMessage,
      }
    }

    if (lowerMessage.includes('insufficient allowance')) {
      return {
        type: 'insufficient_allowance',
        message: 'Approval is required before this deposit can proceed.',
        shortMessage,
      }
    }

    if (lowerMessage.includes('revert') || lowerMessage.includes('failed')) {
      return {
        type: 'revert',
        message: 'Transaction would fail. Check the amount, role, or vault liquidity.',
        shortMessage,
      }
    }

    return {
      type: 'unknown',
      message: 'Transaction could not be simulated.',
      shortMessage,
    }
  }

  const simulateDepositStable = useCallback(
    async (amount: string) => {
      if (!address || !config) return null
      try {
        await simulateContract(config, {
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'deposit',
          args: [parseUnits(amount, ASSET_DECIMALS), address],
          account: address,
        })
        return null
      } catch (error: unknown) {
        return parseSimulationError(error)
      }
    },
    [address, config, vaultAddress]
  )

  const simulateWithdrawStable = useCallback(
    async (amount: string) => {
      if (!address || !config) return null
      try {
        await simulateContract(config, {
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: 'withdraw',
          args: [parseUnits(amount, ASSET_DECIMALS), address, address],
          account: address,
        })
        return null
      } catch (error: unknown) {
        return parseSimulationError(error)
      }
    },
    [address, config, vaultAddress]
  )

  const simulateApproveStable = useCallback(
    async (amount: string) => {
      if (!address || !config) return null
      try {
        await simulateContract(config, {
          address: stableTokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [vaultAddress, parseUnits(amount, ASSET_DECIMALS)],
          account: address,
        })
        return null
      } catch (error: unknown) {
        return parseSimulationError(error)
      }
    },
    [address, config, stableTokenAddress, vaultAddress]
  )

  const { data: stableTokenBalance, refetch: refetchStableTokenBalance } = useReadContract({
    address: stableTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: stableTokenAllowance, refetch: refetchStableTokenAllowance } = useReadContract({
    address: stableTokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, vaultAddress] : undefined,
    query: { enabled: !!address },
  })

  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'paused',
    query: { enabled: true },
  })

  const { data: userShares, refetch: refetchUserShares } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: userPositionAssets, refetch: refetchUserPositionAssets } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'previewRedeem',
    args: userShares != null ? [userShares] : undefined,
    query: { enabled: !!address && userShares != null },
  })

  const { data: maxWithdrawAssets, refetch: refetchMaxWithdrawAssets } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'maxWithdraw',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: maxRedeemShares, refetch: refetchMaxRedeemShares } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'maxRedeem',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: totalVaultAssets, refetch: refetchTotalVaultAssets } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
    query: { enabled: true },
  })

  const { data: totalVaultShares, refetch: refetchTotalVaultShares } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalSupply',
    query: { enabled: true },
  })

  const { data: idleAssets, refetch: refetchIdleAssets } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getIdleAssets',
    query: { enabled: true },
  })

  const { data: strategyBalance, refetch: refetchStrategyBalance } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'getStrategyBalance',
    query: { enabled: true },
  })

  const { data: performanceFeeBps, refetch: refetchPerformanceFeeBps } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'performanceFeeBps',
    query: { enabled: true },
  })

  const { data: depositCap, refetch: refetchDepositCap } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'depositCap',
    query: { enabled: true },
  })

  const { data: largeWithdrawalThreshold, refetch: refetchLargeWithdrawalThreshold } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'largeWithdrawalThreshold',
    query: { enabled: true },
  })

  const { data: isManager, refetch: refetchIsManager } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'hasRole',
    args: address ? [ROLE_IDS.manager, address] : undefined,
    query: { enabled: !!address },
  })

  const { data: isOperator, refetch: refetchIsOperator } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'hasRole',
    args: address ? [ROLE_IDS.operator, address] : undefined,
    query: { enabled: !!address },
  })

  const { data: isTreasurer, refetch: refetchIsTreasurer } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'hasRole',
    args: address ? [ROLE_IDS.treasurer, address] : undefined,
    query: { enabled: !!address },
  })

  const { writeContract: writeApproveStable, data: approveStableHash } = useWriteContract()
  const { isLoading: isApprovingStable, isSuccess: isApproveStableSuccess } =
    useWaitForTransactionReceipt({ hash: approveStableHash })

  const { writeContract: writeDepositStable, data: depositStableHash } = useWriteContract()
  const { isLoading: isDepositingStable, isSuccess: isDepositStableSuccess } =
    useWaitForTransactionReceipt({ hash: depositStableHash })

  const { writeContract: writeWithdrawStable, data: withdrawStableHash } = useWriteContract()
  const { isLoading: isWithdrawingStable, isSuccess: isWithdrawStableSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawStableHash })

  const { writeContract: writePause, data: pauseHash } = useWriteContract()
  const { isLoading: isPausing, isSuccess: isPauseSuccess } =
    useWaitForTransactionReceipt({ hash: pauseHash })

  const { writeContract: writeUnpause, data: unpauseHash } = useWriteContract()
  const { isLoading: isUnpausing, isSuccess: isUnpauseSuccess } =
    useWaitForTransactionReceipt({ hash: unpauseHash })

  const { writeContract: writeInvest, data: investHash } = useWriteContract()
  const { isLoading: isInvesting, isSuccess: isInvestSuccess } =
    useWaitForTransactionReceipt({ hash: investHash })

  const { writeContract: writeDivest, data: divestHash } = useWriteContract()
  const { isLoading: isDivesting, isSuccess: isDivestSuccess } =
    useWaitForTransactionReceipt({ hash: divestHash })

  const approveStable = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeApproveStable({
        address: stableTokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [vaultAddress, parseUnits(amount, ASSET_DECIMALS)],
      })
    },
    [stableTokenAddress, vaultAddress, writeApproveStable]
  )

  const depositStable = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0 || !address) return
      writeDepositStable({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [parseUnits(amount, ASSET_DECIMALS), address],
      })
    },
    [address, vaultAddress, writeDepositStable]
  )

  const withdrawStable = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0 || !address) return
      writeWithdrawStable({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [parseUnits(amount, ASSET_DECIMALS), address, address],
      })
    },
    [address, vaultAddress, writeWithdrawStable]
  )

  const pause = useCallback(() => {
    writePause({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'pause',
    })
  }, [vaultAddress, writePause])

  const unpause = useCallback(() => {
    writeUnpause({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'unpause',
    })
  }, [vaultAddress, writeUnpause])

  const invest = useCallback(
    (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      writeInvest({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'invest',
        args: [parseUnits(amount, ASSET_DECIMALS)],
      })
    },
    [vaultAddress, writeInvest]
  )

  const divest = useCallback(
    (amount: string, minAmountOut?: string) => {
      if (!amount || parseFloat(amount) <= 0) return
      const parsedAmount = parseUnits(amount, ASSET_DECIMALS)
      const parsedMin = minAmountOut ? parseUnits(minAmountOut, ASSET_DECIMALS) : parsedAmount
      writeDivest({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'divest',
        args: [parsedAmount, parsedMin],
      })
    },
    [vaultAddress, writeDivest]
  )

  useEffect(() => {
    if (isApproveStableSuccess || isDepositStableSuccess || isWithdrawStableSuccess) {
      setTimeout(() => {
        refetchStableTokenAllowance()
        refetchStableTokenBalance()
        refetchUserShares()
        refetchUserPositionAssets()
        refetchMaxWithdrawAssets()
        refetchMaxRedeemShares()
        refetchTotalVaultAssets()
        refetchTotalVaultShares()
        refetchIdleAssets()
        refetchStrategyBalance()
        refetchPaused()
      }, 1000)
    }
  }, [
    isApproveStableSuccess,
    isDepositStableSuccess,
    isWithdrawStableSuccess,
    refetchIdleAssets,
    refetchMaxRedeemShares,
    refetchMaxWithdrawAssets,
    refetchPaused,
    refetchStableTokenAllowance,
    refetchStableTokenBalance,
    refetchStrategyBalance,
    refetchTotalVaultAssets,
    refetchTotalVaultShares,
    refetchUserPositionAssets,
    refetchUserShares,
  ])

  useEffect(() => {
    if (isInvestSuccess || isDivestSuccess || isPauseSuccess || isUnpauseSuccess) {
      setTimeout(() => {
        refetchIdleAssets()
        refetchStrategyBalance()
        refetchTotalVaultAssets()
        refetchUserPositionAssets()
        refetchMaxWithdrawAssets()
        refetchPaused()
        refetchIsManager()
        refetchIsOperator()
        refetchIsTreasurer()
        refetchDepositCap()
        refetchPerformanceFeeBps()
        refetchLargeWithdrawalThreshold()
      }, 1000)
    }
  }, [
    isDivestSuccess,
    isInvestSuccess,
    isPauseSuccess,
    isUnpauseSuccess,
    refetchDepositCap,
    refetchIdleAssets,
    refetchIsManager,
    refetchIsOperator,
    refetchIsTreasurer,
    refetchLargeWithdrawalThreshold,
    refetchMaxWithdrawAssets,
    refetchPaused,
    refetchPerformanceFeeBps,
    refetchStrategyBalance,
    refetchTotalVaultAssets,
    refetchUserPositionAssets,
  ])

  const { data: nativeBalance } = useBalance({
    address,
    query: { enabled: !!address },
  })

  const positionValue = userPositionAssets ?? BigInt(0)
  const vaultIdle = idleAssets ?? BigInt(0)
  const strategyAssets = strategyBalance ?? BigInt(0)
  const totalAssetsValue = totalVaultAssets ?? BigInt(0)
  const sharesValue = userShares ?? BigInt(0)
  const withdrawableAssets = maxWithdrawAssets ?? BigInt(0)
  const redeemableShares = maxRedeemShares ?? BigInt(0)

  return {
    activeChainId,
    activeChainKey,
    vaultAddress,
    stableTokenAddress,
    stableTokenSymbol,
    nativeBalance: nativeBalance?.value ?? BigInt(0),
    nativeBalanceFormatted: nativeBalance?.formatted ?? '0',
    nativeSymbol: nativeBalance?.symbol ?? 'ETH',
    stableTokenBalance: stableTokenBalance ?? BigInt(0),
    stableTokenBalanceFormatted: fmt6(stableTokenBalance),
    stableTokenAllowance: stableTokenAllowance ?? BigInt(0),
    stableTokenAllowanceFormatted: fmt6(stableTokenAllowance),
    userShares: sharesValue,
    userSharesFormatted: fmt6(sharesValue),
    userPositionAssets: positionValue,
    userPositionAssetsFormatted: fmt6(positionValue),
    withdrawableAssets,
    withdrawableAssetsFormatted: fmt6(withdrawableAssets),
    redeemableShares,
    redeemableSharesFormatted: fmt6(redeemableShares),
    totalVaultAssets: totalAssetsValue,
    totalVaultAssetsFormatted: fmt6(totalAssetsValue),
    totalVaultShares: totalVaultShares ?? BigInt(0),
    totalVaultSharesFormatted: fmt6(totalVaultShares),
    vaultIdleAssets: vaultIdle,
    vaultIdleAssetsFormatted: fmt6(vaultIdle),
    strategyBalance: strategyAssets,
    strategyBalanceFormatted: fmt6(strategyAssets),
    depositCap: depositCap ?? BigInt(0),
    depositCapFormatted: fmt6(depositCap),
    performanceFeeBps: performanceFeeBps ?? BigInt(0),
    largeWithdrawalThreshold: largeWithdrawalThreshold ?? BigInt(0),
    largeWithdrawalThresholdFormatted: fmt6(largeWithdrawalThreshold),
    isPaused: isPaused ?? false,
    isManager: Boolean(isManager),
    isOperator: Boolean(isOperator),
    isTreasurer: Boolean(isTreasurer),
    approveStable,
    depositStable,
    withdrawStable,
    invest,
    divest,
    pause,
    unpause,
    simulateApproveStable,
    simulateDepositStable,
    simulateWithdrawStable,
    isApprovingStable,
    isDepositingStable,
    isWithdrawingStable,
    isInvesting,
    isDivesting,
    isPausing,
    isUnpausing,
    isApproveStableSuccess,
    isDepositStableSuccess,
    isWithdrawStableSuccess,
    isInvestSuccess,
    isDivestSuccess,
    isPauseSuccess,
    isUnpauseSuccess,
    approveStableHash,
    depositStableHash,
    withdrawStableHash,
    investHash,
    divestHash,
    pauseHash,
    unpauseHash,
    simulationError,
    setSimulationError,
    refetchVaultState: () => {
      refetchStableTokenBalance()
      refetchStableTokenAllowance()
      refetchUserShares()
      refetchUserPositionAssets()
      refetchMaxWithdrawAssets()
      refetchMaxRedeemShares()
      refetchTotalVaultAssets()
      refetchTotalVaultShares()
      refetchIdleAssets()
      refetchStrategyBalance()
      refetchPaused()
    },
    readSharesForAssets: async (amount: string) => {
      if (!config) return BigInt(0)
      return readContract(config, {
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: 'convertToShares',
        args: [parseUnits(amount, ASSET_DECIMALS)],
      })
    },
  }
}
