// Day 20.6 verification — exercises getStore() end-to-end
// Usage: npx tsx --env-file=.env.local scripts/verify-store.ts
// This script is intentionally throwaway — keep or delete after Day 20.

async function main() {
  const { getStore } = await import('../lib/agent/memory')

  console.log('1. Getting store (calls setup() on first invocation)...')
  const store = await getStore()

  const namespace: [string, string] = ['day20-smoke-test', 'profile']

  console.log('2. Putting two memories...')
  await store.put(namespace, 'fact-1', {
    key: 'food',
    value: 'I love pizza and pasta',
    category: 'preference',
    confidence: 0.9,
    updatedAt: new Date().toISOString(),
  })
  await store.put(namespace, 'fact-2', {
    key: 'job',
    value: 'I work as a software engineer in fintech',
    category: 'preference',
    confidence: 0.8,
    updatedAt: new Date().toISOString(),
  })

  console.log('3. Vector search: "what does the user like to eat?"')
  const foodHits = await store.search(namespace, {
    query: 'what does the user like to eat?',
    limit: 1,
  })
  console.log('   →', foodHits.map((h) => ({ key: h.key, value: h.value, score: h.score })))

  console.log('4. Vector search: "tell me about their career"')
  const jobHits = await store.search(namespace, {
    query: 'tell me about their career',
    limit: 1,
  })
  console.log('   →', jobHits.map((h) => ({ key: h.key, value: h.value, score: h.score })))

  console.log('5. Cleanup — deleting test items...')
  await store.delete(namespace, 'fact-1')
  await store.delete(namespace, 'fact-2')

  const remaining = await store.search(namespace)
  console.log(`6. Remaining items in test namespace: ${remaining.length} (expect 0)`)

  console.log('\n✅ Store smoke test passed.')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ Store smoke test FAILED:')
  console.error(err)
  process.exit(1)
})
