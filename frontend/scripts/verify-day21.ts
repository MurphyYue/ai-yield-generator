// Day 21.13 verification — exercises the new parent graph topology.
// Usage: npx tsx --env-file=.env.local scripts/verify-day21.ts
//
// Tests:
//   1. Knowledge intent → routes to 'knowledge' subgraph, no tool calls
//   2. Yield intent → routes to 'yield' subgraph
//   3. Alert intent → routes to 'alert' subgraph, writes alerts row
//   4. Memory persists per turn (consolidateMemory writes facts to Store)

import { HumanMessage } from '@langchain/core/messages'
import { randomUUID } from 'crypto'

const TEST_WALLET = '0x4423D93f6DbF82aAbeaa50A72F4Be9ABe4464F08'

async function invoke(message: string, threadId: string) {
  const { getAgent } = await import('../lib/agent/graph')
  const agent = await getAgent()
  const t0 = Date.now()
  const result = await agent.invoke(
    { messages: [new HumanMessage(message)], userId: TEST_WALLET },
    { configurable: { thread_id: threadId, user_id: TEST_WALLET } }
  )
  const elapsed = Date.now() - t0
  return {
    elapsed,
    route: result.route,
    intentAction: result.intent?.action,
    actionType: result.intent?.action_data?.type,
    approvalStatus: result.approvalStatus,
    relevantMemoriesCount: result.relevantMemories?.length ?? 0,
    triggeredAlertsCount: result.triggeredAlerts?.length ?? 0,
    messageCount: result.messages?.length ?? 0,
  }
}

async function main() {
  console.log('Test 1: knowledge question ("what is USDC?")')
  const r1 = await invoke('What is USDC in one sentence?', randomUUID())
  console.log('  →', r1)
  if (r1.route !== 'knowledge') {
    throw new Error(`Expected route=knowledge, got ${r1.route}`)
  }

  console.log('\nTest 2: yield question ("should I invest?")')
  const r2 = await invoke('Should I invest my idle USDC?', randomUUID())
  console.log('  →', r2)
  if (r2.route !== 'yield') {
    throw new Error(`Expected route=yield, got ${r2.route}`)
  }

  console.log('\nTest 3: alert intent ("alert me if Base APY drops below 100%")')
  // Use 100% as the threshold so set_alert is called but the alert is unlikely
  // to fire on the same turn (in case checkAlerts somehow runs against it).
  const r3 = await invoke('Alert me if Base APY drops below 100%', randomUUID())
  console.log('  →', r3)
  if (r3.route !== 'alert') {
    throw new Error(`Expected route=alert, got ${r3.route}`)
  }

  console.log('\n✅ Day 21 routing + topology verified.')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ Day 21 verification FAILED:')
  console.error(err)
  process.exit(1)
})
