import { NextRequest, NextResponse } from 'next/server'
import { HumanMessage } from '@langchain/core/messages'
import { getAgent } from '@/lib/agent/graph'
import { requireAuthenticatedAddress } from '@/lib/auth'
import { randomUUID } from 'crypto'

interface ChatRequest {
  message: string
  conversation_id?: string
}

export async function POST(request: NextRequest) {
  let userAddress: string
  try {
    userAddress = await requireAuthenticatedAddress(request)
  } catch (resp) {
    return resp as Response
  }

  try {
    const { message, conversation_id }: ChatRequest = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const agent = await getAgent()
    const thread_id = conversation_id || randomUUID()

    const result = await agent.invoke(
      {
        messages: [new HumanMessage(message)],
        userId: userAddress,
      },
      {
        configurable: {
          thread_id,
          user_id: userAddress,
        },
      }
    )

    if (result.__interrupt__?.length) {
      return NextResponse.json({
        success: true,
        interrupted: true,
        interrupt: result.__interrupt__[0].value,
        conversation_id: thread_id,
      })
    }

    return NextResponse.json({
      success: true,
      intent: result.intent,
      approvalStatus: result.approvalStatus,
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

