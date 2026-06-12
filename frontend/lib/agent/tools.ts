import { getDb } from './db'
import { randomUUID } from 'crypto'
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

      const baseClient = createPublicClient({ chain: base, transport: http(getRpc('base')) })
      const arbClient = createPublicClient({ chain: arbitrum, transport: http(getRpc('arbitrum')) })

      const addr = walletAddress as `0x${string}`

      const [baseUserShares, baseStrategyBal, baseIdleBal, arbUserShares, arbStrategyBal, arbIdleBal] =
        await Promise.all([
          baseClient.readContract({ address: baseVault, abi: VAULT_ABI, functionName: 'balanceOf', args: [addr] }),
          baseClient.readContract({ address: baseVault, abi: VAULT_ABI, functionName: 'getStrategyBalance' }),
          baseClient.readContract({ address: baseVault, abi: VAULT_ABI, functionName: 'getIdleAssets' }),
          arbClient.readContract({ address: arbVault, abi: VAULT_ABI, functionName: 'balanceOf', args: [addr] }),
          arbClient.readContract({ address: arbVault, abi: VAULT_ABI, functionName: 'getStrategyBalance' }),
          arbClient.readContract({ address: arbVault, abi: VAULT_ABI, functionName: 'getIdleAssets' }),
        ])

      const [baseUserBal, arbUserBal] = await Promise.all([
        baseClient.readContract({ address: baseVault, abi: VAULT_ABI, functionName: 'previewRedeem', args: [baseUserShares] }),
        arbClient.readContract({ address: arbVault, abi: VAULT_ABI, functionName: 'previewRedeem', args: [arbUserShares] }),
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

// ─── Tool 4: set_alert ────────────────────────────────────────────────────────
// Stores a monitoring alert in PostgreSQL for this user.

export const setAlert = tool(
  async ({ walletAddress, alertType, chain, threshold }) => {
    try {
      const db = getDb()
      const id = randomUUID()
      await db.query(
        `INSERT INTO alerts (id, user_address, alert_type, chain, threshold)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, walletAddress.toLowerCase(), alertType, chain, threshold ?? null]
      )
      return JSON.stringify({ success: true, alertId: id, message: `Alert set: ${alertType} on ${chain}` })
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) })
    }
  },
  {
    name: 'set_alert',
    description:
      'Store a monitoring alert for the user. ' +
      'Use this when the user says things like "alert me if Base APY drops below 3%" or "notify me when yield changes". ' +
      'The alert will be checked at the start of every future conversation.',
    schema: z.object({
      walletAddress: z.string().describe("User's wallet address"),
      alertType: z.enum(['apy_threshold']).describe('Type of alert — currently only apy_threshold is supported'),
      chain: z.enum(['base', 'arbitrum']).describe('Which chain to monitor'),
      threshold: z.number().describe('APY percentage threshold — alert triggers when APY drops below this value'),
    }),
  }
)

// ─── Tool 5: get_alerts ───────────────────────────────────────────────────────
// Reads active alerts for this user and checks if any are triggered.
// Called by the checkAlerts node at the start of every conversation.

export const getAlerts = tool(
  async ({ walletAddress, currentBaseApy, currentArbitrumApy }) => {
    try {
      const db = getDb()
      const result = await db.query(
        `SELECT * FROM alerts WHERE user_address = $1 AND active = TRUE ORDER BY created_at DESC`,
        [walletAddress.toLowerCase()]
      )

      const alerts = result.rows
      if (alerts.length === 0) {
        return JSON.stringify({ success: true, alerts: [], triggered: [] })
      }

      // Check which alerts are triggered against current APY values.
      // Note: triggered alerts are marked + consumed in checkAlerts (graph.ts), not here.
      // This tool is read-only — it reports the user's currently armed alerts.
      const triggered = alerts.filter((alert) => {
        if (alert.alert_type === 'apy_threshold') {
          const currentApy = alert.chain === 'base' ? currentBaseApy : currentArbitrumApy
          return currentApy !== undefined && currentApy < alert.threshold
        }
        return false
      })

      return JSON.stringify({
        success: true,
        alerts: alerts.length,
        triggered: triggered.map((a) => ({
          id: a.id,
          alertType: a.alert_type,
          chain: a.chain,
          threshold: a.threshold,
          message: `⚠️ ${a.chain.charAt(0).toUpperCase() + a.chain.slice(1)} APY has dropped below your ${a.threshold}% threshold.`,
        })),
      })
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e), triggered: [] })
    }
  },
  {
    name: 'get_alerts',
    description:
      "Check the user's active monitoring alerts and whether any are currently triggered. " +
      'Pass the current APY values so triggered alerts can be identified. ' +
      'Always call this at the start of a conversation before answering the user.',
    schema: z.object({
      walletAddress: z.string().describe("User's wallet address"),
      currentBaseApy: z.number().optional().describe('Current Base Aave USDC supply APY'),
      currentArbitrumApy: z.number().optional().describe('Current Arbitrum Aave USDC supply APY'),
    }),
  }
)

export const agentTools = [getMarketData, getUserPositions, getUserHistory, setAlert, getAlerts]

// ─── Per-subgraph tool groups (Day 21) ────────────────────────────────────
// Each subgraph binds only the tools it needs. Smaller tool surface =
// fewer wrong-tool calls + tighter system prompt + faster LLM choice.

export const yieldTools = [getMarketData, getUserPositions, getUserHistory]
export const migrationTools = [getMarketData, getUserPositions]
export const alertTools = [setAlert, getAlerts]
