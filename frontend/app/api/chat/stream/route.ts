import { NextRequest } from 'next/server'
import { HumanMessage } from '@langchain/core/messages'
import { getAgent } from '@/lib/agent/graph'
import { randomUUID } from 'crypto'

interface ChatRequest {
  message: string
  user_id?: string
  conversation_id?: string
}

export async function POST(request: NextRequest) {
  const { message, user_id, conversation_id }: ChatRequest = await request.json()

  if (!message || !user_id) {
    return new Response('Message and user_id required', { status: 400 })
  }

  const agent = await getAgent()
  const thread_id = conversation_id || randomUUID()

  // Stream graph node events as Server-Sent Events
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send thread_id first so client can persist it
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'init', conversation_id: thread_id })}\n\n`))

        const events = await agent.stream(
          {
            messages: [new HumanMessage(message)],
            userId: user_id,
          },
          {
            configurable: { thread_id, user_id },
            streamMode: 'updates',
          }
        )

        for await (const event of events) {
          // event is { nodeName: { partial state update } }
          const nodeName = Object.keys(event)[0]
          const update = event[nodeName]

          // Build a human-readable progress message for each node
          let progressMessage: string | null = null
          if (nodeName === 'checkAlerts') progressMessage = 'Checking your active alerts...'
          else if (nodeName === 'agent') progressMessage = 'Reasoning over the data...'
          else if (nodeName === 'tools') progressMessage = 'Fetching live market data...'
          else if (nodeName === 'formatIntent') progressMessage = 'Finalising recommendation...'

          if (progressMessage) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'progress', node: nodeName, message: progressMessage })}\n\n`)
            )
          }

          // Final intent emitted when formatIntent completes
          if (nodeName === 'formatIntent' && update?.intent) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'intent', intent: update.intent, conversation_id: thread_id })}\n\n`)
            )
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`))
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
