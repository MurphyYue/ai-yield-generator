import { NextRequest, NextResponse } from 'next/server'

// Dify API configuration
const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1/chat-messages'
const DIFY_API_KEY = process.env.NEXT_PUBLIC_DIFY_API_KEY || ''

// Request body type
interface ChatRequest {
  message: string
  vaultBalances?: {
    ETH: number
    USDT: number
  }
}

// Intent response type - amount is always a number (converted from percentage if needed)
interface IntentResponse {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number  // Always a number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
  risk_level: 'high' | 'medium' | 'low'
  risk_reason: string
}

// Dify API response type
interface DifyResponse {
  answer: string
  [key: string]: any
}

// Risk assessment result
interface RiskAssessment {
  actualAmount: number
  percentage: number
  risk_level: 'high' | 'medium' | 'low'
  risk_reason: string
}

// Calculate risk based on parsed intent and vault balance
function calculateRisk(
  action: string,
  amount: number,  // Already converted to number
  token: string,
  vaultBalance: number
): RiskAssessment {
  // Calculate percentage of vault balance
  const percentage = vaultBalance > 0 ? (amount / vaultBalance) * 100 : 0

  // Calculate risk level
  let risk_level: 'high' | 'medium' | 'low'
  let risk_reason: string

  if (action === 'deposit') {
    // Deposits are always low risk
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

    // Special case: large absolute amounts
    if ((token === 'ETH' && amount >= 10) || (token === 'USDT' && amount >= 10000)) {
      risk_level = 'high'
      risk_reason = `Large withdrawal of ${amount} ${token} - exceeds safe threshold`
    }
  } else {
    risk_level = 'low'
    risk_reason = 'Unknown operation'
  }

  return {
    actualAmount: amount,
    percentage,
    risk_level,
    risk_reason,
  }
}

// Convert Dify amount (number or percentage string) to actual number
function convertAmountToNumber(
  amount: number | string,
  token: string,
  vaultBalances: { ETH: number; USDT: number }
): number {
  if (typeof amount === 'string' && amount.includes('%')) {
    // Handle percentage (e.g., "100%", "50%")
    const percentage = parseFloat(amount.replace('%', ''))
    const vaultBalance = token === 'ETH' ? vaultBalances.ETH : vaultBalances.USDT
    return vaultBalance * (percentage / 100)
  } else if (typeof amount === 'number') {
    return amount
  } else {
    // Try to parse as number
    return parseFloat(amount) || 0
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the incoming request
    const { message, vaultBalances }: ChatRequest = await request.json()

    // Default vault balances
    const balances = vaultBalances || { ETH: 0, USDT: 0 }

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    // Call Dify API
    const difyResponse = await fetch(DIFY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: message,
        response_mode: 'blocking',
        user: 'vault-user-' + Math.random().toString(36).substring(7),
        conversation_id: '',
      }),
    })

    if (!difyResponse.ok) {
      console.error('Dify API error:', difyResponse.statusText)
      return NextResponse.json(
        { error: 'Failed to process intent' },
        { status: 500 }
      )
    }

    const difyData: DifyResponse = await difyResponse.json()

    // Parse the AI response as JSON
    let intent: IntentResponse

    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedAnswer = difyData.answer.trim()
      cleanedAnswer = cleanedAnswer.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')

      // Parse JSON
      intent = JSON.parse(cleanedAnswer)

      // Validate the parsed intent
      if (!intent.action || intent.amount === undefined || !intent.token) {
        throw new Error('Invalid intent structure')
      }

      // Validate action
      if (!['deposit', 'withdraw', 'unknown'].includes(intent.action)) {
        intent.action = 'unknown'
      }

      // Validate token
      if (!['ETH', 'USDT', 'unknown'].includes(intent.token)) {
        intent.token = 'unknown'
      }

      // Validate confidence
      if (!['high', 'medium', 'low'].includes(intent.confidence)) {
        intent.confidence = 'low'
      }

      // Validate token_address
      if (!intent.token_address || !/^0x[a-fA-F0-9]{40}$/.test(intent.token_address)) {
        intent.token_address = '0x0000000000000000000000000000000000000000'
      }

      // Convert amount to number (handles percentage strings from Dify)
      // Note: Dify may return amount as string ("100%") or number (1.5)
      const rawAmount = (intent as any).amount  // May be string or number from Dify
      const actualAmount = convertAmountToNumber(rawAmount, intent.token, balances)
      intent.amount = actualAmount  // Always store as number

      // Calculate risk based on vault balance
      const vaultBalance = intent.token === 'ETH'
        ? balances.ETH
        : intent.token === 'USDT'
          ? balances.USDT
          : 0

      const riskAssessment = calculateRisk(
        intent.action,
        intent.amount,
        intent.token,
        vaultBalance
      )

      // Add risk fields to intent
      intent.risk_level = riskAssessment.risk_level
      intent.risk_reason = riskAssessment.risk_reason

    } catch (parseError) {
      console.error('Failed to parse intent:', parseError)
      console.error('Dify response:', difyData.answer)

      // Return unknown intent if parsing fails
      intent = {
        action: 'unknown',
        amount: 0,
        token: 'unknown',
        token_address: '0x0000000000000000000000000000000000000000',
        confidence: 'low',
        risk_level: 'high',
        risk_reason: 'Cannot parse AI response'
      }
    }

    // Return the parsed intent with risk assessment
    return NextResponse.json({
      success: true,
      intent,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
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
