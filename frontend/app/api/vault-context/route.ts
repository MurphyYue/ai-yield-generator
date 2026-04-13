import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { arbitrum, base } from 'viem/chains'
import {
  AAVE_POOL_ABI,
  DEFAULT_GAS_UNITS,
  MAINNET_AAVE_MARKETS,
  RAY,
  VIRTUAL_ETH_PRICE_USD,
} from '@/lib/aave'

const DEFAULT_HOLDING_DAYS = 30
const ESTIMATED_BRIDGE_FEE_USD = 0.5
const ESTIMATED_RETURN_BRIDGE_FEE_USD = 0.5
const SLIPPAGE_RATE = 0.001

interface VaultSnapshot {
  idleUsdc: number
  strategyUsdc: number
  userUsdc: number
}

interface ChainMarketSnapshot {
  chainId: number
  name: string
  token: 'USDC'
  tokenAddress: `0x${string}`
  poolAddress: `0x${string}`
  supplyApy: number
  gasPriceGwei: number
  estimatedTxCostUsd: number
}

interface CrossChainSnapshot {
  sourceChain: 'base'
  targetChain: 'arbitrum'
  principal: number
  holdingDays: number
  deltaApy: number
  grossYieldAdvantageUsd: number
  estimatedBridgeFeeUsd: number
  estimatedReturnBridgeFeeUsd: number
  destinationGasCostUsd: number
  slippageEstimateUsd: number
  totalEstimatedCostUsd: number
  netAdvantageUsd: number | null
}

interface VaultContextResponse {
  success: true
  data: {
    base: ChainMarketSnapshot
    arbitrum: ChainMarketSnapshot
    crossChain: CrossChainSnapshot
    vault: VaultSnapshot
    timestamp: number
  }
}

function parseNumber(value: string | null, fallback = 0): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getVaultSnapshot(request: NextRequest): VaultSnapshot {
  const params = request.nextUrl.searchParams

  return {
    idleUsdc: parseNumber(params.get('vaultIdleUsdc') ?? params.get('vaultIdle')),
    strategyUsdc: parseNumber(params.get('strategyUsdc') ?? params.get('strategyBalance')),
    userUsdc: parseNumber(params.get('userUsdcBalance') ?? params.get('userUsdtBalance')),
  }
}

function getRpcUrl(chain: 'base' | 'arbitrum'): string | undefined {
  if (chain === 'base') {
    return process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL
  }

  return process.env.ARBITRUM_RPC_URL || process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL
}

async function getChainSnapshot(chain: 'base' | 'arbitrum'): Promise<ChainMarketSnapshot> {
  const rpcUrl = getRpcUrl(chain)
  if (!rpcUrl) {
    throw new Error(`Missing ${chain} RPC configuration`)
  }

  const market = MAINNET_AAVE_MARKETS[chain]
  const client = createPublicClient({
    chain: chain === 'base' ? base : arbitrum,
    transport: http(rpcUrl),
  })

  const [reserveData, gasPrice] = await Promise.all([
    client.readContract({
      address: market.pool,
      abi: AAVE_POOL_ABI,
      functionName: 'getReserveData',
      args: [market.usdc],
    }),
    client.getGasPrice(),
  ])

  const supplyApy = (Number(reserveData.currentLiquidityRate) / Number(RAY)) * 100
  const gasPriceGwei = Number(gasPrice) / 1e9
  const estimatedTxCostUsd =
    (Number(gasPrice * DEFAULT_GAS_UNITS) / 1e18) * VIRTUAL_ETH_PRICE_USD

  return {
    chainId: market.chainId,
    name: market.name,
    token: 'USDC',
    tokenAddress: market.usdc,
    poolAddress: market.pool,
    supplyApy,
    gasPriceGwei,
    estimatedTxCostUsd,
  }
}

function buildCrossChainSnapshot(
  baseSnapshot: ChainMarketSnapshot,
  arbitrumSnapshot: ChainMarketSnapshot,
  request: NextRequest
): CrossChainSnapshot {
  const params = request.nextUrl.searchParams
  const principal = parseNumber(params.get('principal'), 0)
  const holdingDays = parseNumber(params.get('holdingDays'), DEFAULT_HOLDING_DAYS)

  const deltaApy = arbitrumSnapshot.supplyApy - baseSnapshot.supplyApy
  const grossYieldAdvantageUsd =
    principal > 0 ? principal * (deltaApy / 100) * (holdingDays / 365) : 0
  const destinationGasCostUsd = arbitrumSnapshot.estimatedTxCostUsd * 2
  const slippageEstimateUsd = principal * SLIPPAGE_RATE
  const totalEstimatedCostUsd =
    ESTIMATED_BRIDGE_FEE_USD +
    ESTIMATED_RETURN_BRIDGE_FEE_USD +
    destinationGasCostUsd +
    slippageEstimateUsd
  const netAdvantageUsd =
    principal > 0 ? grossYieldAdvantageUsd - totalEstimatedCostUsd : null

  return {
    sourceChain: 'base',
    targetChain: 'arbitrum',
    principal,
    holdingDays,
    deltaApy,
    grossYieldAdvantageUsd,
    estimatedBridgeFeeUsd: ESTIMATED_BRIDGE_FEE_USD,
    estimatedReturnBridgeFeeUsd: ESTIMATED_RETURN_BRIDGE_FEE_USD,
    destinationGasCostUsd,
    slippageEstimateUsd,
    totalEstimatedCostUsd,
    netAdvantageUsd,
  }
}

export async function GET(request: NextRequest) {
  try {
    const vault = getVaultSnapshot(request)
    const [baseSnapshot, arbitrumSnapshot] = await Promise.all([
      getChainSnapshot('base'),
      getChainSnapshot('arbitrum'),
    ])

    const crossChain = buildCrossChainSnapshot(baseSnapshot, arbitrumSnapshot, request)

    return NextResponse.json({
      success: true,
      data: {
        base: baseSnapshot,
        arbitrum: arbitrumSnapshot,
        crossChain,
        vault,
        timestamp: Math.floor(Date.now() / 1000),
      },
    } satisfies VaultContextResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown vault context failure'

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
