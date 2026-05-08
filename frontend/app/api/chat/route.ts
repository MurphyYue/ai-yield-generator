import { NextRequest, NextResponse } from 'next/server'
import { HumanMessage } from '@langchain/core/messages'
import { getAgent } from '@/lib/agent/graph'
import { randomUUID } from 'crypto'

interface ChatRequest {
  message: string
  user_id?: string
  conversation_id?: string
  // vaultBalances kept for backwards compatibility — agent fetches data via tools
  vaultBalances?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const { message, user_id, conversation_id }: ChatRequest = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json(
        { error: 'Wallet connection is required for AI advisor usage' },
        { status: 400 }
      )
    }

    const agent = await getAgent()
    const thread_id = conversation_id || randomUUID()

    const result = await agent.invoke(
      {
        messages: [new HumanMessage(message)],
        userId: user_id,
      },
      {
        configurable: {
          thread_id,
          user_id,
        },
      }
    )

    return NextResponse.json({
      success: true,
      intent: result.intent,
      conversation_id: thread_id,
      mode: 'agent',
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
