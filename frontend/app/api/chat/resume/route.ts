import { NextRequest, NextResponse } from 'next/server'
import { Command } from '@langchain/langgraph'
import { getAgent } from '@/lib/agent/graph'
import { requireAuthenticatedAddress } from '@/lib/auth'

export async function POST(request: NextRequest) {
  let userAddress: string
  try {
    userAddress = await requireAuthenticatedAddress(request)
  } catch (resp) {
    return resp as Response
  }

  try {
    const body = await request.json()
    const { thread_id, decision } = body

    if (!thread_id || typeof decision !== 'boolean') {
      return NextResponse.json(
        { error: 'thread_id and decision (boolean) are required' },
        { status: 400 }
      )
    }

    const agent = await getAgent()

    const result = await agent.invoke(new Command({ resume: decision }), {
      configurable: { thread_id, user_id: userAddress },
    })

    return NextResponse.json({
      success: true,
      intent: result.intent,
      approvalStatus: result.approvalStatus,
      conversation_id: thread_id,
    })
  } catch (error) {
    console.error('Resume API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

