import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import {
  AAVE_LISTED_USDT_SEPOLIA,
  AAVE_POOL_ABI,
  AAVE_POOL_SEPOLIA,
  DEFAULT_GAS_UNITS,
  RAY,
  VIRTUAL_ETH_PRICE_USD,
} from '@/lib/aave'

interface VaultSnapshot {
  idleUsdt: number
  strategyUsdt: number
  userUsdt: number
}

interface VaultContextResponse {
  success: boolean
  data: {
    aave: {
      supplyApy: number
      token: 'USDT'
      listedTokenAddress: `0x${string}`
    }
    gas: {
      gasPriceGwei: number
      estimatedTxCostUsd: number
    }
    netApy: number
    vault: VaultSnapshot
    timestamp: number
    source: typeof process.env.NEXT_PUBLIC_CHAIN | 'fallback'
  }
  error?: string
}

function parseNumber(value: string | null): number {
  if (!value) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getVaultSnapshot(request: NextRequest): VaultSnapshot {
  const params = request.nextUrl.searchParams

  return {
    idleUsdt: parseNumber(params.get('vaultIdle')),
    strategyUsdt: parseNumber(params.get('strategyBalance')),
    userUsdt: parseNumber(params.get('userUsdtBalance')),
  }
}

function buildFallbackResponse(vault: VaultSnapshot, error?: string): VaultContextResponse {
  const supplyApy = 4.2
  const gasPriceGwei = 1
  const estimatedTxCostUsd = 0.01
  const netApy =
    vault.idleUsdt > 0
      ? (((vault.idleUsdt * supplyApy) / 100) - estimatedTxCostUsd) / vault.idleUsdt * 100
      : supplyApy


  return {
    success: true,
    data: {
      aave: {
        supplyApy,
        token: 'USDT',
        listedTokenAddress: AAVE_LISTED_USDT_SEPOLIA,
      },
      gas: {
        gasPriceGwei,
        estimatedTxCostUsd,
      },
      netApy,
      vault,
      timestamp: Math.floor(Date.now() / 1000),
      source: 'fallback',
    },
    ...(error ? { error } : {}),
  }
}

export async function GET(request: NextRequest) {
  const vault = getVaultSnapshot(request)
  const requestedChain = process.env.NEXT_PUBLIC_CHAIN?.toLowerCase()

  if (requestedChain && requestedChain !== 'sepolia') {
    return NextResponse.json(buildFallbackResponse(vault))
  }

  const rpcUrl =
    process.env.SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL ||
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL

  if (!rpcUrl) {
    return NextResponse.json(
      buildFallbackResponse(vault, 'Missing Sepolia RPC configuration; returning fallback market data.')
    )
  }

  try {
    const client = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    })

    const [reserveData, gasPrice] = await Promise.all([
      client.readContract({
        address: AAVE_POOL_SEPOLIA,
        abi: AAVE_POOL_ABI,
        functionName: 'getReserveData',
        args: [AAVE_LISTED_USDT_SEPOLIA],
      }),
      client.getGasPrice(),
    ])

    const currentLiquidityRate = reserveData.currentLiquidityRate

    const supplyApy = (Number(currentLiquidityRate) / Number(RAY)) * 100
    const gasPriceGwei = Number(gasPrice) / 1e9
    const estimatedTxCostUsd =
      (Number(gasPrice * DEFAULT_GAS_UNITS) / 1e18) * VIRTUAL_ETH_PRICE_USD
    const netApy = process.env.NEXT_PUBLIC_CHAIN?.toLowerCase() === 'sepolia' && supplyApy > 20 ? 4.5 : vault.idleUsdt > 0
      ? ((((vault.idleUsdt * supplyApy) / 100) - estimatedTxCostUsd) / vault.idleUsdt) * 100
      : supplyApy
    
    return NextResponse.json({
      success: true,
      data: {
        aave: {
          supplyApy,
          token: 'USDT',
          listedTokenAddress: AAVE_LISTED_USDT_SEPOLIA,
        },
        gas: {
          gasPriceGwei,
          estimatedTxCostUsd,
        },
        netApy,
        vault,
        timestamp: Math.floor(Date.now() / 1000),
        source: process.env.NEXT_PUBLIC_CHAIN?.toLowerCase(),
      },
    } satisfies VaultContextResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Aave data fetch failure'

    return NextResponse.json(
      buildFallbackResponse(vault, `Unable to fetch live Aave data: ${message}`)
    )
  }
}
