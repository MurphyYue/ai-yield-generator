'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useVault } from '@/hooks/useVault'
import { AIIntent, isLegacyIntent, isStrategyIntent, StrategyIntent } from '@/lib/ai-intent'
import { TransactionCard } from './TransactionCard'
import { CrossChainRiskModal } from './CrossChainRiskModal'
import { CrossChainWidget } from './CrossChainWidget'
import { DestinationVaultFlow } from './DestinationVaultFlow'

interface AIPanelProps {
  onIntentParsed?: (intent: AIIntent) => void
}

interface PendingInterrupt {
  question: string
  details: Record<string, unknown>
}

export function AIPanel({ onIntentParsed }: AIPanelProps) {
  const { address, isConnected } = useAccount()
  const [message, setMessage] = useState('')
  const [conversationId, setConversationId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [intent, setIntent] = useState<AIIntent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [riskConfirmed, setRiskConfirmed] = useState(false)
  // HITL interrupt state
  const [pendingInterrupt, setPendingInterrupt] = useState<PendingInterrupt | null>(null)
  const [pendingThreadId, setPendingThreadId] = useState('')
  // Post-approval bridge state
  const [migrationRiskAccepted, setMigrationRiskAccepted] = useState(false)
  const [bridgeStarted, setBridgeStarted] = useState(false)
  const [bridgeCompleted, setBridgeCompleted] = useState(false)

  const {
    vaultBalanceFormatted,
    usdtBalanceFormatted,
    vaultUsdtBalanceFormatted,
    vaultTokenHoldingsFormatted,
    strategyBalanceFormatted,
    invest,
    divest,
  } = useVault()

  // On mount: restore active thread_id and re-surface interrupt modal if needed
  useEffect(() => {
    if (!address) return

    async function restoreSession() {
      try {
        const convResp = await fetch('/api/chat/conversation')
        if (!convResp.ok) return
        const { thread_id } = await convResp.json()
        if (!thread_id) return

        setConversationId(thread_id)

        const statusResp = await fetch(`/api/chat/status?thread_id=${thread_id}`)
        if (!statusResp.ok) return
        const { interrupted, interrupt } = await statusResp.json()
        if (interrupted && interrupt) {
          setPendingInterrupt(interrupt as PendingInterrupt)
          setPendingThreadId(thread_id)
          setIsLoading(true)
          setProgressMessage('Waiting for your approval...')
        }
      } catch {
        // session restore is best-effort — silently ignore errors
      }
    }

    restoreSession()
  }, [address])

  const resetState = () => {
    setError(null)
    setStreamingText('')
    setProgressMessage(null)
    setRiskConfirmed(false)
    setPendingInterrupt(null)
    setBridgeStarted(false)
    setBridgeCompleted(false)
    setMigrationRiskAccepted(false)
  }

  const runMessage = async (rawMessage: string) => {
    if (!address) {
      setError('Connect wallet to use AI advisor.')
      return
    }

    setIsLoading(true)
    setIntent(null)
    resetState()
    setProgressMessage('Connecting to advisor...')

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: rawMessage,
          conversation_id: conversationId,
        }),
      })

      if (!response.ok || !response.body) {
        setError('Failed to connect to advisor.')
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let parsedIntent: AIIntent | null = null
      let streamConversationId = ''
      let streamError: string | null = null
      let interrupted = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const block of events) {
          const dataLine = block.split('\n').find((line) => line.startsWith('data: '))
          if (!dataLine) continue
          try {
            const event = JSON.parse(dataLine.slice(6))
            if (event.type === 'init') {
              streamConversationId = event.conversation_id
            } else if (event.type === 'progress') {
              setProgressMessage(event.message)
            } else if (event.type === 'token') {
              setStreamingText((prev) => prev + event.content)
            } else if (event.type === 'intent') {
              parsedIntent = event.intent
              streamConversationId = event.conversation_id ?? streamConversationId
            } else if (event.type === 'interrupt') {
              // Graph paused — show risk modal for approval
              interrupted = true
              streamConversationId = event.conversation_id ?? streamConversationId
              setPendingInterrupt(event.interrupt as PendingInterrupt)
              setPendingThreadId(streamConversationId)
              if (streamConversationId) setConversationId(streamConversationId)
            } else if (event.type === 'error') {
              streamError = event.message
            }
          } catch {
            // skip malformed event
          }
        }
      }

      if (streamError) {
        setError(streamError)
        return
      }

      if (interrupted) {
        // isLoading stays true — user must respond to the modal
        setProgressMessage('Waiting for your approval...')
        return
      }

      if (!parsedIntent) {
        setError('No response from advisor.')
        return
      }

      setIntent(parsedIntent)
      if (streamConversationId) {
        setConversationId(streamConversationId)
        // Persist thread so it survives tab close / page refresh
        void fetch('/api/chat/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: streamConversationId }),
        })
      }
      setStreamingText('')

      if (isStrategyIntent(parsedIntent)) {
        const hasReasoning = parsedIntent.strategy_logic && parsedIntent.strategy_logic.length > 20
        if (!hasReasoning && (parsedIntent.action === 'unknown' || parsedIntent.confidence === 'low')) {
          setError('The advisor needs a clearer question. Try "should I invest?" or "invest 500 USDT".')
        }
        onIntentParsed?.(parsedIntent)
        return
      }

      if (parsedIntent.risk_level === 'high') return
      onIntentParsed?.(parsedIntent)

      if (parsedIntent.action === 'unknown' || parsedIntent.confidence === 'low') {
        setError('Could not understand. Try "deposit 1 ETH" or "withdraw 50 USDT".')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      if (!pendingInterrupt) {
        setIsLoading(false)
        setProgressMessage(null)
      }
    }
  }

  // Called when user clicks Approve or Cancel in the risk modal
  const handleApproval = async (decision: boolean) => {
    setPendingInterrupt(null)
    setProgressMessage(decision ? 'Resuming migration...' : 'Cancelling migration...')

    try {
      const resp = await fetch('/api/chat/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: pendingThreadId,
          decision,
        }),
      })

      const data = await resp.json()

      if (!data.success) {
        setError('Resume failed. Please try again.')
        return
      }

      if (data.intent) {
        const resumedIntent = data.intent as AIIntent
        setIntent(resumedIntent)
        if (decision && isStrategyIntent(resumedIntent)) {
          setMigrationRiskAccepted(true)
        }
        onIntentParsed?.(resumedIntent)
      }
    } catch {
      setError('Network error during resume.')
    } finally {
      setIsLoading(false)
      setProgressMessage(null)
    }
  }

  const handleProcess = async () => {
    if (!message.trim()) return
    await runMessage(message.trim())
  }

  const handleRiskConfirm = () => {
    setRiskConfirmed(true)
    if (intent && isLegacyIntent(intent)) {
      onIntentParsed?.({ ...intent })
    }
  }

  const handleAdvisorConfirm = async () => {
    if (!isStrategyIntent(intent)) return

    const prompt =
      intent.action_data.type === 'divest'
        ? `Confirm divest ${intent.action_data.amount} ${intent.action_data.token} from ${intent.action_data.protocol}.`
        : `Confirm invest ${intent.action_data.amount} ${intent.action_data.token} into ${intent.action_data.protocol}.`

    await runMessage(prompt)
  }

  const handleReevaluate = async (freshNetApy: number) => {
    if (!isStrategyIntent(intent)) return null

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[SYSTEM] Net APY changed from ${intent.action_data.net_apy.toFixed(2)}% to ${freshNetApy.toFixed(2)}%. Re-evaluate recommendation for user.`,
        conversation_id: conversationId,
      }),
    })

    const data = await response.json()
    if (!data.success || !data.intent) return null

    const reevaluated = data.intent as AIIntent
    if (data.conversation_id) setConversationId(data.conversation_id)
    setIntent(reevaluated)

    return isStrategyIntent(reevaluated) ? reevaluated.strategy_logic : null
  }

  const riskBadgeStyle = (risk?: string) => {
    if (risk === 'high') return { color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)' }
    if (risk === 'medium') return { color: 'var(--amber)', background: 'var(--amber-dim)', border: '1px solid rgba(251,191,36,0.2)' }
    return { color: 'var(--green)', background: 'var(--green-dim)', border: '1px solid rgba(52,211,153,0.2)' }
  }

  const riskIcon = (risk?: string) => risk === 'high' ? '⚠' : risk === 'medium' ? '⚡' : '✓'

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>AI Advisor</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', marginTop: 2 }}>
            Try: "should I invest?" · "move 5000 USDC to Arbitrum for 90 days" · "invest 500 USDC"
          </div>
        </div>
        <div style={{
          fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em',
          color: 'var(--cyan)', background: 'var(--cyan-dim)',
          border: '1px solid var(--cyan-glow)',
          padding: '3px 8px', borderRadius: 4,
        }}>
          AI ∙ Assistant
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="vault-input"
          style={{ flex: 1 }}
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleProcess() } }}
          placeholder="Enter your command…"
        />
        <button
          className="btn btn-cyan"
          onClick={handleProcess}
          disabled={isLoading || !message.trim() || !isConnected}
          style={{ minWidth: 90 }}
        >
          {isLoading ? '…' : 'Process'}
        </button>
      </div>

      {!isConnected && (
        <div className="alert-amber" style={{ marginTop: 10 }}>
          Connect wallet to use AI advisor.
        </div>
      )}

      {isLoading && progressMessage && (
        <div style={{
          marginTop: 10,
          fontSize: '0.8rem',
          color: 'var(--text-2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ color: 'var(--cyan)' }}>•</span>
          {progressMessage}
        </div>
      )}

      {/* Token streaming bubble — visible while subgraph LLM is responding */}
      {streamingText && !intent && (
        <div style={{
          marginTop: 10,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '0.875rem',
          fontSize: '0.8rem',
          lineHeight: 1.55,
          color: 'var(--text-2)',
        }}>
          {streamingText}
          <span style={{ opacity: 0.5 }}>▊</span>
        </div>
      )}

      {error && (
        <div className="alert-red" style={{ marginTop: 10 }}>{error}</div>
      )}

      {intent && isLegacyIntent(intent) && intent.action !== 'unknown' && (
        <div style={{
          marginTop: 10,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '0.875rem',
        }}>
          <div className="section-label">Parsed Intent</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <Field label="Action" value={intent.action.toUpperCase()} accent={intent.action === 'deposit' ? 'var(--cyan)' : 'var(--purple)'} />
            <Field label="Amount" value={String(intent.amount)} />
            <Field label="Token" value={intent.token} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Risk</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '0.7rem', fontWeight: 600,
                padding: '2px 7px', borderRadius: 4,
                ...riskBadgeStyle(intent.risk_level),
              }}>
                {riskIcon(intent.risk_level)} {(intent.risk_level || 'low').toUpperCase()}
              </span>
            </div>
          </div>

          {intent.risk_reason && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', marginBottom: 10 }}>
              {intent.risk_reason}
            </div>
          )}

          {intent.risk_level === 'high' && !riskConfirmed && (
            <div className="alert-red" style={{ marginTop: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>⚠ High Risk — Confirm to proceed</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-red" style={{ flex: 1 }} onClick={handleRiskConfirm}>Confirm</button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setIntent(null); setRiskConfirmed(false) }}>Cancel</button>
              </div>
            </div>
          )}
          {intent.risk_level === 'medium' && (
            <div className="alert-amber" style={{ marginTop: 6 }}>
              ⚡ Medium risk — review before executing
            </div>
          )}
        </div>
      )}

      {intent && isStrategyIntent(intent) && intent.action !== 'unknown' && (
        <div style={{
          marginTop: 10,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '0.875rem',
        }}>
          <div className="section-label">Strategy Advice</div>
          <div style={{
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '0.8rem',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            color: 'var(--text-2)',
            marginTop: 8,
          }}>
            {intent.strategy_logic}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
            <Field label="Action" value={intent.action.toUpperCase()} accent="var(--cyan)" />
            <Field label="Type" value={intent.action_data.type.toUpperCase()} />
            <Field label="Amount" value={String(intent.action_data.amount)} />
            <Field label="Net APY" value={`${intent.action_data.net_apy.toFixed(2)}%`} />
          </div>

          {intent.action_data.type === 'cross_chain_migrate' && (
            <div style={{
              marginTop: 10,
              border: '1px solid rgba(251,191,36,0.28)',
              background: 'var(--amber-dim)',
              borderRadius: 10,
              padding: '0.875rem',
            }}>
              <div className="section-label">Cross-Chain Advisory</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                <Field label="Route" value={`${intent.action_data.source_chain || 'base'} -> ${intent.action_data.target_chain || 'arbitrum'}`} accent="var(--amber)" />
                <Field label="Delta APY" value={`${(intent.action_data.delta_apy || 0).toFixed(2)}%`} />
                <Field label="Net Advantage" value={`$${(intent.action_data.net_advantage_usd || 0).toFixed(2)}`} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <Field
                  label="Breakeven"
                  value={intent.action_data.breakeven_days == null ? 'N/A' : `${intent.action_data.breakeven_days.toFixed(1)} days`}
                />
                <Field
                  label="Status"
                  value={intent.approvalStatus === 'approved' ? 'APPROVED' : intent.approvalStatus === 'rejected' ? 'REJECTED' : 'PENDING'}
                  accent={intent.approvalStatus === 'approved' ? 'var(--green)' : intent.approvalStatus === 'rejected' ? 'var(--red)' : 'var(--amber)'}
                />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 10, lineHeight: 1.45 }}>
                The migration flow is gated behind a bridge risk acknowledgement. After bridging, the product will continue into the destination vault deposit flow.
              </div>

              {intent.approvalStatus !== 'approved' && intent.approvalStatus !== 'rejected' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    className="btn btn-amber"
                    style={{ flex: 1 }}
                    onClick={() => setPendingInterrupt({ question: 'Approve migration?', details: intent.action_data as Record<string, unknown> })}
                  >
                    Start Guided Migration
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setIntent(null)}
                  >
                    Stay On Base
                  </button>
                </div>
              )}
            </div>
          )}

          {intent.action_data.type === 'cross_chain_migrate' && migrationRiskAccepted && (
            <CrossChainWidget
              amount={intent.action_data.amount}
              walletAddress={address}
              onBridgeStarted={() => setBridgeStarted(true)}
              onBridgeCompleted={() => {
                setBridgeStarted(true)
                setBridgeCompleted(true)
                setMigrationRiskAccepted(false)
              }}
            />
          )}

          {intent.action_data.type === 'cross_chain_migrate' && (bridgeStarted || bridgeCompleted) && (
            <DestinationVaultFlow suggestedAmount={intent.action_data.amount} />
          )}

          {intent.action_data.type === 'check_yield' && (
            <div className="alert-amber" style={{ marginTop: 10 }}>
              Advisory only. No bridge widget is shown unless the backend-gated intent is cross_chain_migrate.
            </div>
          )}

          {intent.action === 'suggest' && (intent.action_data.type === 'invest' || intent.action_data.type === 'divest') && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-cyan" style={{ flex: 1 }} onClick={handleAdvisorConfirm} disabled={isLoading}>
                {intent.action_data.type === 'divest' ? 'Yes, divest' : 'Yes, invest'}
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIntent(null)}>
                No thanks
              </button>
            </div>
          )}

          {intent.action === 'intent_confirmed' && (intent.action_data.type === 'invest' || intent.action_data.type === 'divest') && (
            <TransactionCard
              actionData={intent.action_data}
              strategyLogic={intent.strategy_logic}
              vaultIdle={parseFloat(vaultTokenHoldingsFormatted) || 0}
              strategyBalance={parseFloat(strategyBalanceFormatted) || 0}
              userUsdtBalance={parseFloat(vaultUsdtBalanceFormatted) || 0}
              onExecute={() => {
                if (intent.action_data.type === 'divest') {
                  divest(intent.action_data.amount.toString())
                } else {
                  invest(intent.action_data.amount.toString())
                }
              }}
              onCancel={() => setIntent(null)}
              onReevaluate={handleReevaluate}
            />
          )}
        </div>
      )}

      {(intent || error) && (
        <button
          style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--text-2)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--text-3)')}
          onClick={() => {
            setMessage('')
            setIntent(null)
            setError(null)
            setStreamingText('')
            setRiskConfirmed(false)
            setConversationId('')
            setPendingInterrupt(null)
            setBridgeStarted(false)
            setBridgeCompleted(false)
            setMigrationRiskAccepted(false)
          }}
        >
          Clear
        </button>
      )}

      {/* HITL interrupt modal — triggered by interrupt SSE event or manual "Start Guided Migration" */}
      {pendingInterrupt && (
        <CrossChainRiskModal
          amount={Number(pendingInterrupt.details?.amount ?? 0)}
          interruptDetails={pendingInterrupt.details}
          onAccept={() => handleApproval(true)}
          onCancel={() => handleApproval(false)}
        />
      )}
    </div>
  )
}

function Field({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.8rem',
        fontWeight: 600,
        color: accent || 'var(--text-1)',
      }}>
        {value}
      </span>
    </div>
  )
}
