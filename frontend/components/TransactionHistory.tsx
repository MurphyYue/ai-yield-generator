'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface VaultTransaction {
  id: string
  user: string
  token: string
  amount: string
  amountUsdc: number
  eventType: 'deposit' | 'withdraw' | 'invest' | 'divest'
  blockNumber: string
  blockTimestamp: number
  transactionHash: string
  date: string
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  deposit:  { label: 'Deposit',  color: 'var(--cyan)' },
  withdraw: { label: 'Withdraw', color: 'var(--text-2)' },
  invest:   { label: 'Invest',   color: 'var(--green)' },
  divest:   { label: 'Divest',   color: '#f59e0b' },
}

const PAGE_SIZE = 10

export function TransactionHistory() {
  const { address } = useAccount()
  const [transactions, setTransactions] = useState<VaultTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    if (!address) return
    fetchTransactions(0)
  }, [address])

  async function fetchTransactions(pageIndex: number) {
    if (!address) return
    setLoading(true)
    setError(null)

    try {
      const limit = PAGE_SIZE + 1 // fetch one extra to detect if there's a next page
      const offset = pageIndex * PAGE_SIZE
      const query = `
        query GetUserActivity($user: String!, $limit: Int!, $offset: Int!) {
          vaultActivitys(
            where: { user: $user }
            orderBy: "blockTimestamp"
            orderDirection: "desc"
            limit: $limit
            offset: $offset
          ) {
            items {
              id
              user
              token
              amount
              eventType
              blockNumber
              blockTimestamp
              transactionHash
            }
          }
        }
      `
      const resp = await fetch('http://localhost:42069/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { user: address.toLowerCase(), limit, offset },
        }),
      })

      if (!resp.ok) throw new Error('Ponder GraphQL unavailable')
      const json = await resp.json()
      if (json.errors) throw new Error(json.errors[0].message)

      const items: VaultTransaction[] = (json.data?.vaultActivitys?.items ?? []).map(
        (item: Record<string, unknown>) => ({
          ...item,
          amountUsdc: Number(item.amount) / 1e6,
          date: new Date(Number(item.blockTimestamp) * 1000).toISOString(),
        })
      )

      setHasMore(items.length > PAGE_SIZE)
      setTransactions(items.slice(0, PAGE_SIZE))
      setPage(pageIndex)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  if (!address) return null

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Transaction History</span>
        <button
          onClick={() => fetchTransactions(page)}
          disabled={loading}
          style={{
            fontSize: '0.75rem', color: 'var(--text-2)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          fontSize: '0.8rem', color: 'var(--text-2)',
          padding: '0.75rem', background: 'var(--surface-2)',
          borderRadius: 8, marginBottom: '0.75rem',
        }}>
          {error === 'Ponder GraphQL unavailable'
            ? 'Transaction history unavailable — Ponder indexer is not running.'
            : error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && transactions.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', textAlign: 'center', padding: '1.5rem 0' }}>
          No transactions found for this wallet.
        </div>
      )}

      {/* Transaction rows */}
      {transactions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {transactions.map((tx) => {
            const meta = EVENT_LABELS[tx.eventType] ?? { label: tx.eventType, color: 'var(--text-2)' }
            const txUrl = `https://basescan.org/tx/${tx.transactionHash}`
            const dateStr = new Date(tx.date).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })

            return (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.6rem 0.75rem',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: '0.82rem',
              }}>
                {/* Left: type badge + date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em',
                    color: meta.color,
                    background: `${meta.color}18`,
                    border: `1px solid ${meta.color}40`,
                    padding: '2px 7px', borderRadius: 4,
                    textTransform: 'uppercase',
                  }}>
                    {meta.label}
                  </span>
                  <span style={{ color: 'var(--text-2)', fontSize: '0.75rem' }}>{dateStr}</span>
                </div>

                {/* Right: amount + link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    {tx.amountUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </span>
                  <a
                    href={txUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--cyan)', fontSize: '0.75rem', textDecoration: 'none' }}
                  >
                    ↗
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
          <button
            onClick={() => fetchTransactions(page - 1)}
            disabled={page === 0 || loading}
            style={{
              fontSize: '0.78rem', color: page === 0 ? 'var(--text-2)' : 'var(--cyan)',
              background: 'none', border: 'none', cursor: page === 0 ? 'default' : 'pointer', padding: 0,
            }}
          >
            ← Previous
          </button>
          <button
            onClick={() => fetchTransactions(page + 1)}
            disabled={!hasMore || loading}
            style={{
              fontSize: '0.78rem', color: !hasMore ? 'var(--text-2)' : 'var(--cyan)',
              background: 'none', border: 'none', cursor: !hasMore ? 'default' : 'pointer', padding: 0,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
