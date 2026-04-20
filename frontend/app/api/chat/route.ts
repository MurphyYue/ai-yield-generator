import { NextRequest, NextResponse } from 'next/server'

const DIFY_API_BASE_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1'
const DIFY_API_KEY = process.env.DIFY_API_KEY || process.env.NEXT_PUBLIC_DIFY_API_KEY || ''

interface ChatRequest {
  message: string
  user_id?: string
  conversation_id?: string
  vaultBalances?: {
    ETH: number
    USDT: number
    USDC?: number
    vaultIdle?: number
    strategyBalance?: number
    userUsdtBalance?: number
    userUsdcBalance?: number
  }
  principal?: number
  holdingDays?: number
}

interface LegacyIntentResponse {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
  risk_level: 'high' | 'medium' | 'low'
  risk_reason: string
}

interface StrategyIntentResponse {
  action: 'suggest' | 'intent_confirmed' | 'unknown'
  strategy_logic: string
  action_data: {
    type: 'invest' | 'divest' | 'check_yield' | 'deposit' | 'withdraw' | 'cross_chain_migrate' | 'none'
    amount: number
    token: string
    protocol: string
    net_apy: number
    source_chain?: 'base'
    target_chain?: 'arbitrum'
    delta_apy?: number
    net_advantage_usd?: number
    breakeven_days?: number | null
    risk_level: 'low' | 'medium' | 'high'
  }
  confidence: 'high' | 'medium' | 'low'
}

type ParsedIntent = LegacyIntentResponse | StrategyIntentResponse

interface DifyChatResponse {
  answer?: string
  conversation_id?: string
  [key: string]: unknown
}

interface RiskAssessment {
  actualAmount: number
  percentage: number
  risk_level: 'high' | 'medium' | 'low'
  risk_reason: string
}

interface AdvisoryInputs {
  principal: number
  holdingDays: number
}

interface NormalizedVaultBalances {
  ETH: number
  USDT: number
  vaultIdle: number
  strategyBalance: number
  userUsdtBalance: number
}

const DEFAULT_ADVISORY_HOLDING_DAYS = 30

function calculateRisk(
  action: string,
  amount: number,
  token: string,
  vaultBalance: number
): RiskAssessment {
  const percentage = vaultBalance > 0 ? (amount / vaultBalance) * 100 : 0

  let risk_level: 'high' | 'medium' | 'low'
  let risk_reason: string

  if (action === 'deposit') {
    risk_level = 'low'
    risk_reason = 'Deposit operation - putting funds into vault'
  } else if (action === 'withdraw') {
    if (percentage >= 90) {
      risk_level = 'high'
      risk_reason = `Withdrawing ${percentage.toFixed(0)}% of ${token} balance - near complete withdrawal`
    } else if (percentage >= 50) {
      risk_level = 'medium'
      risk_reason = `Withdrawing ${percentage.toFixed(0)}% of ${token} balance - significant withdrawal`
    } else {
      risk_level = 'low'
      risk_reason = `Withdrawing ${percentage.toFixed(0)}% of ${token} balance - routine operation`
    }

    if ((token === 'ETH' && amount >= 10) || (token === 'USDT' && amount >= 10000)) {
      risk_level = 'high'
      risk_reason = `Large withdrawal of ${amount} ${token} - exceeds safe threshold`
    }
  } else {
    risk_level = 'low'
    risk_reason = 'Unknown operation'
  }

  return { actualAmount: amount, percentage, risk_level, risk_reason }
}

function convertAmountToNumber(
  amount: number | string,
  token: string,
  vaultBalances: { ETH: number; USDT: number }
): number {
  if (typeof amount === 'string' && amount.includes('%')) {
    const percentage = parseFloat(amount.replace('%', ''))
    const vaultBalance = token === 'ETH' ? vaultBalances.ETH : vaultBalances.USDT
    return vaultBalance * (percentage / 100)
  }

  if (typeof amount === 'number') {
    return amount
  }

  return parseFloat(amount) || 0
}

function cleanJsonString(value: string): string {
  return value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
}

type RawIntentPayload = Record<string, unknown>

function asObject(value: unknown): RawIntentPayload {
  return value && typeof value === 'object' ? (value as RawIntentPayload) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function extractAdvisoryInputs(
  message: string,
  explicitPrincipal?: number,
  explicitHoldingDays?: number
): AdvisoryInputs {
  const amountMatches = [...message.matchAll(/(?:\$?\s*)(\d+(?:\.\d+)?)\s*(?:usdc|usd|\$)/gi)]
  const principal =
    explicitPrincipal !== undefined
      ? explicitPrincipal
      : amountMatches.length > 0
        ? Number(amountMatches[amountMatches.length - 1][1])
        : 0

  const dayMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:days?|d)\b/i)
  const monthMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:months?|mo)\b/i)
  const yearMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:years?|yr)\b/i)
  const holdingDays =
    explicitHoldingDays !== undefined
      ? explicitHoldingDays
      : dayMatch
        ? Number(dayMatch[1])
        : monthMatch
          ? Number(monthMatch[1]) * 30
          : yearMatch
            ? Number(yearMatch[1]) * 365
            : DEFAULT_ADVISORY_HOLDING_DAYS

  return {
    principal: Number.isFinite(principal) ? principal : 0,
    holdingDays: Number.isFinite(holdingDays) ? holdingDays : DEFAULT_ADVISORY_HOLDING_DAYS,
  }
}

function normalizeLegacyIntent(rawIntent: unknown, balances: { ETH: number; USDT: number }): LegacyIntentResponse {
  const raw = asObject(rawIntent)
  const action = asString(raw.action, 'unknown')
  const token = asString(raw.token, 'unknown')
  const confidence = asString(raw.confidence, 'low')

  const normalizedAction: LegacyIntentResponse['action'] =
    action === 'deposit' || action === 'withdraw' || action === 'unknown' ? action : 'unknown'

  const normalizedToken: LegacyIntentResponse['token'] =
    token === 'ETH' || token === 'USDT' || token === 'unknown' ? token : 'unknown'

  const normalizedConfidence: LegacyIntentResponse['confidence'] =
    confidence === 'high' || confidence === 'medium' || confidence === 'low' ? confidence : 'low'

  const tokenAddress = asString(raw.token_address)
  const normalizedTokenAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenAddress)
    ? tokenAddress
    : '0x0000000000000000000000000000000000000000'

  const amount = convertAmountToNumber(raw.amount as number | string, normalizedToken, balances)

  const vaultBalance =
    normalizedToken === 'ETH'
      ? balances.ETH
      : normalizedToken === 'USDT'
        ? balances.USDT
        : 0

  const riskAssessment = calculateRisk(normalizedAction, amount, normalizedToken, vaultBalance)

  return {
    action: normalizedAction,
    amount,
    token: normalizedToken,
    token_address: normalizedTokenAddress,
    confidence: normalizedConfidence,
    risk_level: riskAssessment.risk_level,
    risk_reason: riskAssessment.risk_reason,
  }
}

function normalizeStrategyIntent(rawIntent: unknown): StrategyIntentResponse {
  const intent = asObject(rawIntent)
  const confidence =
    intent.confidence === 'high' || intent.confidence === 'medium' || intent.confidence === 'low'
      ? intent.confidence
      : 'low'

  const action =
    intent.action === 'suggest' || intent.action === 'intent_confirmed' || intent.action === 'unknown'
      ? intent.action
      : 'unknown'

  const rawActionData = asObject(intent.action_data)
  const riskLevel =
    rawActionData.risk_level === 'high' || rawActionData.risk_level === 'medium' || rawActionData.risk_level === 'low'
      ? rawActionData.risk_level
      : 'low'
  const rawType = rawActionData.type
  const normalizedType =
    rawType === 'invest' ||
    rawType === 'divest' ||
    rawType === 'check_yield' ||
    rawType === 'deposit' ||
    rawType === 'withdraw' ||
    rawType === 'cross_chain_migrate' ||
    rawType === 'none'
      ? rawType
      : 'none'
  const netAdvantageUsd = asNumber(rawActionData.net_advantage_usd)
  const isValidMigration =
    normalizedType === 'cross_chain_migrate' &&
    rawActionData.source_chain === 'base' &&
    rawActionData.target_chain === 'arbitrum' &&
    netAdvantageUsd > 1
  const type = normalizedType === 'cross_chain_migrate' && !isValidMigration ? 'none' : normalizedType

  return {
    action,
    strategy_logic: asString(intent.strategy_logic, 'No strategy advice returned.'),
    action_data: {
      type,
      amount: asNumber(rawActionData.amount),
      token: asString(rawActionData.token, 'USDC'),
      protocol: asString(rawActionData.protocol, 'aave'),
      net_apy: asNumber(rawActionData.net_apy),
      source_chain: isValidMigration ? 'base' : undefined,
      target_chain: isValidMigration ? 'arbitrum' : undefined,
      delta_apy: asNumber(rawActionData.delta_apy),
      net_advantage_usd: netAdvantageUsd,
      breakeven_days:
        rawActionData.breakeven_days === null ? null : asNumber(rawActionData.breakeven_days),
      risk_level: riskLevel,
    },
    confidence,
  }
}

function parseIntentPayload(payload: unknown, balances: { ETH: number; USDT: number }): ParsedIntent {
  let parsed = payload

  if (typeof payload === 'string') {
    parsed = JSON.parse(cleanJsonString(payload))
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid Dify response payload')
  }

  if ('strategy_logic' in parsed || 'action_data' in parsed) {
    return normalizeStrategyIntent(parsed)
  }

  return normalizeLegacyIntent(parsed, balances)
}

function buildVaultContextUrl(
  request: NextRequest,
  vaultBalances: NormalizedVaultBalances,
  advisoryInputs: AdvisoryInputs
) {
  const url = new URL('/api/vault-context', request.nextUrl.origin)
  url.searchParams.set('vaultIdle', String(vaultBalances.vaultIdle))
  url.searchParams.set('vaultIdleUsdc', String(vaultBalances.vaultIdle))
  url.searchParams.set('strategyBalance', String(vaultBalances.strategyBalance))
  url.searchParams.set('strategyUsdc', String(vaultBalances.strategyBalance))
  url.searchParams.set('userUsdtBalance', String(vaultBalances.userUsdtBalance))
  url.searchParams.set('userUsdcBalance', String(vaultBalances.userUsdtBalance))
  url.searchParams.set('principal', String(advisoryInputs.principal))
  url.searchParams.set('holdingDays', String(advisoryInputs.holdingDays))
  return url.toString()
}

async function callDifyChat(
  message: string,
  conversationId: string,
  userId: string,
  vaultContextUrl: string,
  vaultBalances: NormalizedVaultBalances,
  advisoryInputs: AdvisoryInputs
) {
  const response = await fetch(`${DIFY_API_BASE_URL.replace(/\/$/, '')}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        vault_context_url: vaultContextUrl,
        vault_idle_usdc: vaultBalances.vaultIdle,
        strategy_usdc: vaultBalances.strategyBalance,
        user_usdc_balance: vaultBalances.userUsdtBalance,
        principal: advisoryInputs.principal,
        holding_days: advisoryInputs.holdingDays,
        source_chain: 'base',
        target_chain: 'arbitrum',
      },
      query: message,
      response_mode: 'blocking',
      user: userId,
      conversation_id: conversationId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Dify chat API error: ${response.status} ${response.statusText}`)
  }

  const difyData = (await response.json()) as DifyChatResponse
  return {
    rawPayload: difyData.answer ?? '',
    conversationId: difyData.conversation_id ?? '',
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, user_id, conversation_id, vaultBalances, principal, holdingDays }: ChatRequest = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required and must be a string' }, { status: 400 })
    }

    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json({ error: 'Wallet connection is required for AI advisor usage' }, { status: 400 })
    }

    if (!DIFY_API_KEY) {
      return NextResponse.json({ error: 'Missing Dify API key configuration' }, { status: 500 })
    }

    const balances = {
      ETH: vaultBalances?.ETH ?? 0,
      USDT: vaultBalances?.USDC ?? vaultBalances?.USDT ?? 0,
      vaultIdle: vaultBalances?.vaultIdle ?? vaultBalances?.USDC ?? vaultBalances?.USDT ?? 0,
      strategyBalance: vaultBalances?.strategyBalance ?? 0,
      userUsdtBalance:
        vaultBalances?.userUsdcBalance ??
        vaultBalances?.userUsdtBalance ??
        vaultBalances?.USDC ??
        vaultBalances?.USDT ??
        0,
    }

    const advisoryInputs = extractAdvisoryInputs(message, principal, holdingDays)
    const vaultContextUrl = buildVaultContextUrl(request, balances, advisoryInputs)

    const difyResult = await callDifyChat(
      message,
      conversation_id || '',
      user_id,
      vaultContextUrl,
      balances,
      advisoryInputs
    )

    const intent = parseIntentPayload(difyResult.rawPayload, {
      ETH: balances.ETH,
      USDT: balances.USDT,
    })

    return NextResponse.json({
      success: true,
      intent,
      conversation_id: difyResult.conversationId,
      mode: 'chat',
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
