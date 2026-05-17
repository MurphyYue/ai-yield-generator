import { NextRequest } from 'next/server'
import { HumanMessage } from '@langchain/core/messages'
import { getAgent } from '@/lib/agent/graph'
import { randomUUID } from 'crypto'

interface ChatRequest {
  message: string
  user_id?: string
  conversation_id?: string
}

// Progress labels shown to the user while graph nodes run.
const NODE_PROGRESS: Record<string, string> = {
  fetchMarket: 'Fetching live market data...',
  loadMemory: 'Loading your profile...',
  checkAlerts: 'Checking your active alerts...',
  router: 'Classifying your request...',
  yield: 'Reasoning over yield strategy...',
  migration: 'Analysing cross-chain migration...',
  alert: 'Managing your alerts...',
  knowledge: 'Answering your question...',
  formatIntent: 'Finalising recommendation...',
  consolidateMemory: 'Saving to memory...',
}

// Nodes whose token output must NOT stream to the user.
const SILENT_NODES = new Set(['consolidateMemory', 'router', 'loadMemory', 'fetchMarket', 'checkAlerts'])

export async function POST(request: NextRequest) {
  const { message, user_id, conversation_id }: ChatRequest = await request.json()

  if (!message || !user_id) {
    return new Response('Message and user_id required', { status: 400 })
  }

  const agent = await getAgent()
  const thread_id = conversation_id || randomUUID()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function emit(payload: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      try {
        emit({ type: 'init', conversation_id: thread_id })

        // Three stream modes + subgraph events:
        // - 'messages': token-by-token output from LLM nodes
        // - 'updates':  per-node state delta (includes __interrupt__ + intent)
        // - 'custom':   writer() events (unused today, reserved)
        const events = agent.streamEvents(
          {
            messages: [new HumanMessage(message)],
            userId: user_id,
          },
          {
            configurable: { thread_id, user_id },
            version: 'v2',
          }
        )

        for await (const event of events) {
          const { event: evtType, name, data, metadata } = event

          // Token streaming — LLM output chunks from specialist subgraph nodes
          if (evtType === 'on_chat_model_stream') {
            const node = (metadata?.langgraph_node as string) ?? ''
            const chunk = data?.chunk
            const content =
              typeof chunk?.content === 'string'
                ? chunk.content
                : Array.isArray(chunk?.content)
                  ? chunk.content
                      .filter((c: { type: string; text?: string }) => c.type === 'text')
                      .map((c: { type: string; text?: string }) => c.text ?? '')
                      .join('')
                  : ''
            if (content && !SILENT_NODES.has(node)) {
              emit({ type: 'token', content, node })
            }
          }

          // Per-node progress label
          if (evtType === 'on_chain_start' && NODE_PROGRESS[name]) {
            emit({ type: 'progress', node: name, message: NODE_PROGRESS[name] })
          }

          // Interrupt — graph paused waiting for human approval
          if (evtType === 'on_chain_end' && name === 'approvalGate') {
            const interruptPayload = data?.output?.__interrupt__
            if (interruptPayload?.length) {
              emit({
                type: 'interrupt',
                interrupt: interruptPayload[0].value,
                conversation_id: thread_id,
              })
              break
            }
          }

          // Final intent — emitted when formatIntent node completes
          if (evtType === 'on_chain_end' && name === 'formatIntent') {
            const intentUpdate = data?.output?.intent
            if (intentUpdate) {
              emit({ type: 'intent', intent: intentUpdate, conversation_id: thread_id })
            }
          }
        }

        emit({ type: 'done' })
        controller.close()
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
