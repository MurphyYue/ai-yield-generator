// Day 20.6 verification — direct agent invocation, confirms existing chat flow
// Usage: npx tsx --env-file=.env.local scripts/verify-agent.ts
// This script is intentionally throwaway — keep or delete after Day 20.

import { HumanMessage } from '@langchain/core/messages'
import { randomUUID } from 'crypto'

async function main() {
  const { getAgent } = await import('../lib/agent/graph')

  console.log('1. Building agent (this triggers checkpointer/store setup)...')
  const agent = await getAgent()

  const thread_id = randomUUID()
  const user_id = '0x4423D93f6DbF82aAbeaa50A72F4Be9ABe4464F08' // arbitrary test wallet

  console.log(`2. Invoking with simple knowledge question (thread ${thread_id.slice(0, 8)})...`)
  const result = await agent.invoke(
    {
      messages: [new HumanMessage('What is USDC in one sentence?')],
      userId: user_id,
    },
    { configurable: { thread_id, user_id } }
  )

  console.log('3. Result shape:')
  console.log({
    hasIntent: !!result.intent,
    intentAction: result.intent?.action,
    approvalStatus: result.approvalStatus,
    triggeredAlertsCount: result.triggeredAlerts?.length ?? 0,
    messageCount: result.messages?.length ?? 0,
  })

  if (!result.intent) {
    console.error('\n❌ Existing chat flow regression: intent is null')
    process.exit(1)
  }

  console.log('\n✅ Existing chat flow works after state schema rename.')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ Agent smoke test FAILED:')
  console.error(err)
  process.exit(1)
})
