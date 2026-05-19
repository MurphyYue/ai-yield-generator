import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedAddress } from '@/lib/auth'
import { getAgent } from '@/lib/agent/graph'

// GET /api/chat/status?thread_id=xxx
// Returns { interrupted: boolean, interrupt?: { question, details } }
// Called on page load when a stored thread_id is found, to check whether
// the graph is paused at interrupt() and the risk modal should re-surface.
export async function GET(req: NextRequest) {
  let userAddress: string
  try {
    userAddress = await requireAuthenticatedAddress(req)
  } catch (resp) {
    return resp as Response
  }

  const thread_id = new URL(req.url).searchParams.get('thread_id')
  if (!thread_id) {
    return NextResponse.json({ error: 'thread_id required' }, { status: 400 })
  }

  const agent = await getAgent()
  const state = await agent.getState({
    configurable: { thread_id, user_id: userAddress },
  })

  const interruptedTask = state.tasks?.find(
    (t: { interrupts?: unknown[] }) => t.interrupts?.length
  )
  const interrupted = !!interruptedTask
  const interruptValue = interrupted
    ? (interruptedTask!.interrupts![0] as { value?: unknown })?.value
    : null

  return NextResponse.json({ interrupted, interrupt: interruptValue ?? null })
}
