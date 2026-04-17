'use client'

import { useState, useEffect, useCallback } from 'react'
import { useVault } from '@/hooks/useVault'
import { TokenSelector, TokenType } from './TokenSelector'

interface Intent {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
  risk_level?: 'high' | 'medium' | 'low'
  risk_reason?: string
  riskConfirmed?: boolean
}

interface WithdrawPanelProps {
  intent?: Intent | null
}

export function WithdrawPanel({ intent }: WithdrawPanelProps) {
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<TokenType>('ETH')
  const [isSimulating, setIsSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    stableTokenSymbol,
    withdraw,
    withdrawUsdt,
    simulateWithdraw,
    simulateWithdrawUsdt,
    isWithdrawing,
    isWithdrawingToken,
    isWithdrawSuccess,
    isWithdrawTokenSuccess,
    vaultBalanceFormatted,
    vaultUsdtBalanceFormatted,
    ethBalanceFormatted,
    usdtBalanceFormatted,
  } = useVault()

  // Auto-fill from AI intent
  useEffect(() => {
    if (intent && intent.action === 'withdraw' && intent.amount > 0) {
      setAmount(intent.amount.toString())
      if (intent.token === 'ETH' || intent.token === 'USDT') {
        setSelectedToken(intent.token)
      }
    }
  }, [intent])

  // Clear error when amount changes
  useEffect(() => {
    setError(null)
  }, [amount, selectedToken])

  const handleWithdraw = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setError(null)

    if (selectedToken === 'ETH') {
      // Simulate first
      setIsSimulating(true)
      const simError = await simulateWithdraw(amount)
      setIsSimulating(false)

      if (simError) {
        setError(simError.message)
        return
      }

      // Simulation passed, execute
      withdraw(amount)

    } else if (selectedToken === 'USDT') {
      // Simulate first
      setIsSimulating(true)
      const simError = await simulateWithdrawUsdt(amount)
      setIsSimulating(false)

      if (simError) {
        setError(simError.message)
        return
      }

      // Simulation passed, execute
      withdrawUsdt(amount)
    }
  }, [amount, selectedToken, simulateWithdraw, simulateWithdrawUsdt, withdraw, withdrawUsdt])

  const handleSetMax = () => {
    setAmount(selectedToken === 'ETH' ? vaultBalanceFormatted : vaultUsdtBalanceFormatted)
  }

  const getMaxAmount = () => {
    if (selectedToken === 'ETH') {
      return vaultBalanceFormatted
    } else {
      return vaultUsdtBalanceFormatted
    }
  }

  const getWalletBalance = () => {
    if (selectedToken === 'ETH') {
      return ethBalanceFormatted
    } else {
      return usdtBalanceFormatted
    }
  }

  const getVaultBalance = () => {
    if (selectedToken === 'ETH') {
      return vaultBalanceFormatted
    } else {
      return vaultUsdtBalanceFormatted
    }
  }

  const isLoading = isWithdrawing || isWithdrawingToken
  const isSuccess = isWithdrawSuccess || isWithdrawTokenSuccess

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em', color: 'var(--purple)' }}>
          ↑ Withdraw
        </span>
        {intent && intent.action === 'withdraw' && (
          <span style={{
            fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em',
            color: 'var(--purple)', background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.25)', padding: '2px 7px', borderRadius: 4,
          }}>
            AI PARSED
          </span>
        )}
      </div>

      {/* Token Selector */}
      <TokenSelector selectedToken={selectedToken} onTokenChange={setSelectedToken} disabled={isLoading} />

      {/* AI suggestion mismatch */}
      {intent && intent.action === 'withdraw' && intent.token !== selectedToken && (
        <div className="alert-amber" style={{ fontSize: '0.7rem' }}>
          AI suggested: Withdraw {intent.amount} {intent.token}
        </div>
      )}

      {/* Simulation error */}
      {error && <div className="alert-red" style={{ fontSize: '0.75rem' }}>⚠ {error}</div>}

      {/* Balances + Max */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-2)' }}>
        <span>In vault: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--purple)' }}>{getVaultBalance()} {selectedToken === 'USDT' ? stableTokenSymbol : selectedToken}</span></span>
        <button
          onClick={handleSetMax}
          disabled={isLoading}
          style={{
            fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em',
            color: 'var(--text-2)', background: 'var(--surface-3)',
            border: '1px solid var(--border)', borderRadius: 4,
            padding: '2px 8px', cursor: 'pointer',
          }}
        >
          MAX
        </button>
      </div>

      {/* Amount input */}
      <input
        className="vault-input"
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder={`Amount (${selectedToken === 'USDT' ? stableTokenSymbol : selectedToken})`}
        step="0.000001"
        min="0"
        max={getMaxAmount()}
      />

      {/* Action button */}
      <button
        className="btn"
        style={{
          width: '100%', padding: '0.7rem',
          background: 'rgba(167,139,250,0.1)',
          color: 'var(--purple)',
          border: '1px solid rgba(167,139,250,0.25)',
        }}
        onClick={handleWithdraw}
        disabled={isLoading || isSimulating || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(getMaxAmount())}
      >
        {isSimulating ? 'Checking…' : isLoading ? 'Withdrawing…' : `Withdraw ${amount || '0'} ${selectedToken === 'USDT' ? stableTokenSymbol : selectedToken}`}
      </button>

      {isSuccess && (
        <div className="alert-green" style={{ fontSize: '0.75rem' }}>Withdrawal complete.</div>
      )}
    </div>
  )
}
