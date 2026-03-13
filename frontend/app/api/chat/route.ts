import { NextRequest, NextResponse } from 'next/server'

// Dify API configuration
const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1/chat-messages'
const DIFY_API_KEY = process.env.NEXT_PUBLIC_DIFY_API_KEY || ''

// Intent response type
interface IntentResponse {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
}

// Dify API response type
interface DifyResponse {
  answer: string
  // Dify may return additional fields
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    // Parse the incoming request
    const { message } = await request.json()

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
        response_mode: 'blocking', // Use blocking mode for simpler response
        user: 'vault-user-' + Math.random().toString(36).substring(7),
        conversation_id: '', // Empty for new conversation
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

      // Remove markdown code blocks (```json ... ```)
      cleanedAnswer = cleanedAnswer.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')

      // Parse JSON
      intent = JSON.parse(cleanedAnswer)

      // Validate the parsed intent
      if (!intent.action || !intent.amount || !intent.token) {
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

    } catch (parseError) {
      console.error('Failed to parse intent:', parseError)
      console.error('Dify response:', difyData.answer)

      // Return unknown intent if parsing fails
      intent = {
        action: 'unknown',
        amount: 0,
        token: 'unknown',
        token_address: '0x0000000000000000000000000000000000000000',
        confidence: 'low'
      }
    }

    // Return the parsed intent
    return NextResponse.json({
      success: true,
      intent,
      rawResponse: difyData.answer // Include for debugging
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
