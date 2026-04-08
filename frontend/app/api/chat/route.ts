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
    vaultIdle?: number
    strategyBalance?: number
    userUsdtBalance?: number
  }
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
    type: 'invest' | 'divest' | 'check_yield' | 'deposit' | 'withdraw' | 'none'
    amount: number
    token: string
    protocol: string
    net_apy: number
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

function normalizeLegacyIntent(rawIntent: any, balances: { ETH: number; USDT: number }): LegacyIntentResponse {
  const intent = { ...rawIntent }

  if (!['deposit', 'withdraw', 'unknown'].includes(intent.action)) {
    intent.action = 'unknown'
  }

  if (!['ETH', 'USDT', 'unknown'].includes(intent.token)) {
    intent.token = 'unknown'
  }

  if (!['high', 'medium', 'low'].includes(intent.confidence)) {
    intent.confidence = 'low'
  }

  if (!intent.token_address || !/^0x[a-fA-F0-9]{40}$/.test(intent.token_address)) {
    intent.token_address = '0x0000000000000000000000000000000000000000'
  }

  const rawAmount = intent.amount
  intent.amount = convertAmountToNumber(rawAmount, intent.token, balances)

  const vaultBalance =
    intent.token === 'ETH'
      ? balances.ETH
      : intent.token === 'USDT'
        ? balances.USDT
        : 0

  const riskAssessment = calculateRisk(intent.action, intent.amount, intent.token, vaultBalance)
  intent.risk_level = riskAssessment.risk_level
  intent.risk_reason = riskAssessment.risk_reason

  return intent as LegacyIntentResponse
}

function normalizeStrategyIntent(rawIntent: any): StrategyIntentResponse {
  const confidence =
    rawIntent.confidence === 'high' || rawIntent.confidence === 'medium' || rawIntent.confidence === 'low'
      ? rawIntent.confidence
      : 'low'

  const action =
    rawIntent.action === 'suggest' || rawIntent.action === 'intent_confirmed' || rawIntent.action === 'unknown'
      ? rawIntent.action
      : 'unknown'

  const rawActionData = rawIntent.action_data ?? {}
  const riskLevel =
    rawActionData.risk_level === 'high' || rawActionData.risk_level === 'medium' || rawActionData.risk_level === 'low'
      ? rawActionData.risk_level
      : 'low'

  return {
    action,
    strategy_logic: typeof rawIntent.strategy_logic === 'string' ? rawIntent.strategy_logic : 'No strategy advice returned.',
    action_data: {
      type:
        rawActionData.type === 'invest' ||
        rawActionData.type === 'divest' ||
        rawActionData.type === 'check_yield' ||
        rawActionData.type === 'deposit' ||
        rawActionData.type === 'withdraw' ||
        rawActionData.type === 'none'
          ? rawActionData.type
          : 'none',
      amount: Number(rawActionData.amount) || 0,
      token: typeof rawActionData.token === 'string' ? rawActionData.token : 'USDT',
      protocol: typeof rawActionData.protocol === 'string' ? rawActionData.protocol : 'aave',
      net_apy: Number(rawActionData.net_apy) || 0,
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

function buildVaultContextUrl(request: NextRequest, vaultBalances: Required<NonNullable<ChatRequest['vaultBalances']>>) {
  const url = new URL('/api/vault-context', request.nextUrl.origin)
  url.searchParams.set('vaultIdle', String(vaultBalances.vaultIdle))
  url.searchParams.set('strategyBalance', String(vaultBalances.strategyBalance))
  url.searchParams.set('userUsdtBalance', String(vaultBalances.userUsdtBalance))
  return url.toString()
}

async function callDifyChat(
  message: string,
  conversationId: string,
  userId: string,
  vaultContextUrl: string,
  vaultBalances: Required<NonNullable<ChatRequest['vaultBalances']>>
) {
  console.log(`${DIFY_API_BASE_URL.replace(/\/$/, '')}`)
  const response = await fetch(`${DIFY_API_BASE_URL.replace(/\/$/, '')}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        vault_context_url: vaultContextUrl,
        vault_idle: vaultBalances.vaultIdle,
        strategy_balance: vaultBalances.strategyBalance,
        user_usdt_balance: vaultBalances.userUsdtBalance,
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
    const { message, user_id, conversation_id, vaultBalances }: ChatRequest = await request.json()

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
      USDT: vaultBalances?.USDT ?? 0,
      vaultIdle: vaultBalances?.vaultIdle ?? vaultBalances?.USDT ?? 0,
      strategyBalance: vaultBalances?.strategyBalance ?? 0,
      userUsdtBalance: vaultBalances?.userUsdtBalance ?? vaultBalances?.USDT ?? 0,
    }

    const vaultContextUrl = buildVaultContextUrl(request, balances)

    const difyResult = await callDifyChat(message, conversation_id || '', user_id, vaultContextUrl, balances)

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
