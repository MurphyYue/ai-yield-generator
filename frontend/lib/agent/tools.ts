import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { createPublicClient, http } from 'viem'
import { base, arbitrum } from 'viem/chains'
import { VAULT_ABI } from '@/lib/vault'
import { getVaultAddressForChain, getStableTokenAddressForChain } from '@/lib/vault'

// ─── helpers ──────────────────────────────────────────────────────────────────

function getRpc(chain: 'base' | 'arbitrum'): string {
  const url =
    chain === 'base'
      ? process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL
      : process.env.ARBITRUM_RPC_URL || process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL
  if (!url) throw new Error(`Missing RPC URL for ${chain}`)
  return url
}

// ─── Tool 1: get_market_data ───────────────────────────────────────────────────
// Calls the vault-context API to get live APY, gas, and cross-chain economics.
// The backend computes migration eligibility — the agent explains and contextualises.

export const getMarketData = tool(
  async ({ principal, holdingDays, vaultIdle, strategyUsdc, userUsdc }) => {
    try {
      const params = new URLSearchParams()
      if (principal != null) params.set('principal', String(principal))
      if (holdingDays != null) params.set('holdingDays', String(holdingDays))
      if (vaultIdle != null) params.set('vaultIdleUsdc', String(vaultIdle))
      if (strategyUsdc != null) params.set('strategyUsdc', String(strategyUsdc))
      if (userUsdc != null) params.set('userUsdcBalance', String(userUsdc))

      // Server-side internal call — Next.js app must be running on this port
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const resp = await fetch(`${appUrl}/api/vault-context?${params.toString()}`)

      if (!resp.ok) throw new Error(`vault-context returned ${resp.status}`)
      const json = await resp.json()
      return JSON.stringify(json)
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) })
    }
  },
  {
    name: 'get_market_data',
    description:
      'Get live Aave USDC supply APY on Base and Arbitrum, current gas prices, and cross-chain migration economics. ' +
      'Pass principal and holdingDays to get a full net advantage calculation. ' +
      'The response includes raw economics: deltaApy, netAdvantageUsd, breakevenDays, totalEstimatedCostUsd. ' +
      'The agent reasons over these numbers and makes its own migration decision — the backend does not gate or recommend.',
    schema: z.object({
      principal: z.number().optional().describe('USDC amount user wants to evaluate for migration'),
      holdingDays: z.number().optional().describe('How many days user plans to hold on destination chain'),
      vaultIdle: z.number().optional().describe('Idle USDC sitting in vault not earning yield'),
      strategyUsdc: z.number().optional().describe('USDC currently invested in Aave strategy'),
      userUsdc: z.number().optional().describe("User's total USDC balance in vault"),
    }),
  }
)

// ─── Tool 2: get_user_positions ────────────────────────────────────────────────
// Reads the user's current vault balances on both chains directly from contracts.

export const getUserPositions = tool(
  async ({ walletAddress }) => {
    try {
      const baseVault = getVaultAddressForChain('base')
      const arbVault = getVaultAddressForChain('arbitrum')
      const baseUsdc = getStableTokenAddressForChain('base')
      const arbUsdc = getStableTokenAddressForChain('arbitrum')

      const baseClient = createPublicClient({ chain: base, transport: http(getRpc('base')) })
      const arbClient = createPublicClient({ chain: arbitrum, transport: http(getRpc('arbitrum')) })

      const addr = walletAddress as `0x${string}`

      const [
        baseUserBal,
        baseStrategyBal,
        baseIdleBal,
        arbUserBal,
        arbStrategyBal,
        arbIdleBal,
      ] = await Promise.all([
        baseClient.readContract({ address: baseVault, abi: VAULT_ABI, functionName: 'getTokenBalance', args: [baseUsdc, addr] }),
        baseClient.readContract({ address: baseVault, abi: VAULT_ABI, functionName: 'getStrategyBalance' }),
        baseClient.readContract({ address: baseVault, abi: VAULT_ABI, functionName: 'getVaultTokenHoldings', args: [baseUsdc] }),
        arbClient.readContract({ address: arbVault, abi: VAULT_ABI, functionName: 'getTokenBalance', args: [arbUsdc, addr] }),
        arbClient.readContract({ address: arbVault, abi: VAULT_ABI, functionName: 'getStrategyBalance' }),
        arbClient.readContract({ address: arbVault, abi: VAULT_ABI, functionName: 'getVaultTokenHoldings', args: [arbUsdc] }),
      ])

      // USDC uses 6 decimals
      const fmt = (v: unknown) => Number(v as bigint) / 1e6

      return JSON.stringify({
        base: {
          userVaultBalance: fmt(baseUserBal),   // user's deposited USDC in Base vault
          totalStrategyBalance: fmt(baseStrategyBal), // total USDC in Aave (whole vault, not per-user)
          totalIdleInVault: fmt(baseIdleBal),   // total idle USDC in vault contract
        },
        arbitrum: {
          userVaultBalance: fmt(arbUserBal),
          totalStrategyBalance: fmt(arbStrategyBal),
          totalIdleInVault: fmt(arbIdleBal),
        },
      })
    } catch (e) {
      return JSON.stringify({ error: 'Failed to read on-chain positions', message: String(e) })
    }
  },
  {
    name: 'get_user_positions',
    description:
      "Read the user's current vault balances on Base and Arbitrum directly from the smart contracts. " +
      'Shows how much USDC the user has deposited, how much is invested in Aave, and how much is sitting idle.',
    schema: z.object({
      walletAddress: z.string().describe("User's wallet address starting with 0x"),
    }),
  }
)

// ─── Tool 3: get_user_history ─────────────────────────────────────────────────
// Queries Ponder GraphQL for the user's past vault transactions on Base.

export const getUserHistory = tool(
  async ({ walletAddress, limit }) => {
    try {
      const ponderUrl = process.env.PONDER_GRAPHQL_URL || 'http://localhost:42069/graphql'
      const query = `
        query GetUserActivity($user: String!, $limit: Int!) {
          vaultActivitys(
            where: { user: $user }
            orderBy: "blockTimestamp"
            orderDirection: "desc"
            limit: $limit
          ) {
            items {
              id
              user
              token
              amount
              eventType
              blockNumber
              blockTimestamp
              transactionHash
            }
          }
        }
      `
      const resp = await fetch(ponderUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { user: walletAddress.toLowerCase(), limit: limit ?? 10 },
        }),
      })

      if (!resp.ok) throw new Error(`Ponder GraphQL returned ${resp.status}`)
      const json = await resp.json()

      if (json.errors) throw new Error(json.errors[0].message)

      const items = json.data?.vaultActivitys?.items ?? []

      // Format amounts from raw bigint (6 decimals USDC) to human-readable
      const formatted = items.map((item: Record<string, unknown>) => ({
        ...item,
        amountUsdc: Number(item.amount) / 1e6,
        date: new Date(Number(item.blockTimestamp) * 1000).toISOString(),
      }))

      return JSON.stringify({ success: true, transactions: formatted, count: formatted.length })
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e), transactions: [] })
    }
  },
  {
    name: 'get_user_history',
    description:
      "Get the user's past vault transactions from the Ponder indexer. " +
      'Returns deposits, withdrawals, invests, and divests in reverse chronological order. ' +
      'Use this when the user asks about their transaction history or past activity.',
    schema: z.object({
      walletAddress: z.string().describe("User's wallet address starting with 0x"),
      limit: z.number().optional().describe('Number of transactions to return (default 10, max 50)'),
    }),
  }
)

export const agentTools = [getMarketData, getUserPositions, getUserHistory]
