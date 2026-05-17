import { NextRequest, NextResponse } from 'next/server'
import { Command } from '@langchain/langgraph'
import { getAgent } from '@/lib/agent/graph'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { thread_id, user_id, decision } = body

    if (!thread_id || typeof decision !== 'boolean') {
      return NextResponse.json(
        { error: 'thread_id and decision (boolean) are required' },
        { status: 400 }
      )
    }

    const agent = await getAgent()

    // Resume the interrupted graph with the user's approval/rejection.
    // Command({ resume }) re-enters approvalGate; interrupt() returns the
    // resume value as its return, so the node continues from that point.
    const result = await agent.invoke(new Command({ resume: decision }), {
      configurable: { thread_id, user_id: user_id ?? '' },
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
