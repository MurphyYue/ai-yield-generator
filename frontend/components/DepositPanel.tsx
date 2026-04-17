'use client'

import { useState, useEffect, useCallback } from 'react'
import { useVault } from '@/hooks/useVault'
import { usePermitSignature } from '@/hooks/usePermitSignature'
import { TokenSelector, TokenType } from './TokenSelector'
import { parseUnits } from 'viem'

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

interface DepositPanelProps {
  intent?: Intent | null
}

export function DepositPanel({ intent }: DepositPanelProps) {
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<TokenType>('ETH')
  const [isSimulating, setIsSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usePermit, setUsePermit] = useState(true) // Try permit first

  const { signPermit } = usePermitSignature()

  const {
    vaultAddress,
    stableTokenAddress,
    stableTokenSymbol,
    deposit,
    depositUsdt,
    depositUsdtWithPermit,
    approveUsdt,
    simulateDeposit,
    simulateDepositUsdt,
    simulateApproveUsdt,
    isDepositing,
    isDepositingToken,
    isDepositingWithPermit,
    isApproving,
    isDepositSuccess,
    isDepositTokenSuccess,
    isDepositWithPermitSuccess,
    isApproveSuccess,
    usdtAllowance,
    usdtAllowanceFormatted,
    ethBalanceFormatted,
    usdtBalanceFormatted,
    vaultBalanceFormatted,
    vaultUsdtBalanceFormatted,
  } = useVault()

  // Auto-fill from AI intent
  useEffect(() => {
    if (intent && intent.action === 'deposit' && intent.amount > 0) {
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

  const handleDeposit = useCallback(async () => {
    console.log('selectedToken', selectedToken)
    if (!amount || parseFloat(amount) <= 0) return
    setError(null)

    if (selectedToken === 'ETH') {
      // Simulate first
      setIsSimulating(true)
      const simError = await simulateDeposit(amount)
      setIsSimulating(false)

      if (simError) {
        setError(simError.message)
        return
      }

      // Simulation passed, execute
      deposit(amount)

    } else if (selectedToken === 'USDT') {
      const amountWei = parseFloat(amount) * 1_000_000 // USDT has 6 decimals

      // Try ONE-CLICK deposit with permit first
      if (usePermit) {
        try {
          setIsSimulating(true)

          // Generate permit signature (off-chain, no gas)
          const signature = await signPermit(
            stableTokenAddress,
            vaultAddress,
            parseUnits(amount, 6)
          )

          setIsSimulating(false)
          if (signature) {
            // One-step deposit with permit
            depositUsdtWithPermit(amount, signature)
            return
          }
        } catch (permitError: unknown) {
          console.log('Permit failed, falling back to two-step flow:', permitError)
          setIsSimulating(false)
          setUsePermit(false) // Disable permit for this transaction
          // Fall through to two-step flow below
        }
      }

      // Fallback: Traditional two-step approve + deposit
      // Check if allowance is sufficient
      if (!usdtAllowance || usdtAllowance < amountWei) {
        // Simulate approval first
        setIsSimulating(true)
        const simError = await simulateApproveUsdt(amount)
        setIsSimulating(false)

        if (simError) {
          setError(simError.message)
          return
        }

        // Simulation passed, approve
        approveUsdt(amount)
      } else {
        // Simulate deposit first
        setIsSimulating(true)
        const simError = await simulateDepositUsdt(amount)
        setIsSimulating(false)

        if (simError) {
          setError(simError.message)
          return
        }
        // Simulation passed, deposit
        depositUsdt(amount)
      }
    }
  }, [
    amount,
    selectedToken,
    usePermit,
    stableTokenAddress,
    vaultAddress,
    simulateDeposit,
    simulateDepositUsdt,
    simulateApproveUsdt,
    usdtAllowance,
    deposit,
    depositUsdt,
    depositUsdtWithPermit,
    approveUsdt,
    signPermit
  ])

  const getMaxAmount = () => {
    if (selectedToken === 'ETH') {
      return ethBalanceFormatted
    } else {
      return usdtBalanceFormatted
    }
  }

  const getAvailableBalance = () => {
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

  const isLoading = isDepositing || isDepositingToken || isDepositingWithPermit || isApproving
  const isSuccess = isDepositSuccess || isDepositTokenSuccess || isDepositWithPermitSuccess || isApproveSuccess

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em', color: 'var(--cyan)' }}>
          ↓ Deposit
        </span>
        {intent && intent.action === 'deposit' && (
          <span style={{
            fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em',
            color: 'var(--cyan)', background: 'var(--cyan-dim)',
            border: '1px solid var(--cyan-glow)', padding: '2px 7px', borderRadius: 4,
          }}>
            AI PARSED
          </span>
        )}
      </div>

      {/* Token Selector */}
      <TokenSelector selectedToken={selectedToken} onTokenChange={setSelectedToken} disabled={isLoading} />

      {/* AI suggestion mismatch */}
      {intent && intent.action === 'deposit' && intent.token !== selectedToken && (
        <div className="alert-amber" style={{ fontSize: '0.7rem' }}>
          AI suggested: Deposit {intent.amount} {intent.token}
        </div>
      )}

      {/* Permit notice */}
      {selectedToken === 'USDT' && (
        <div className="alert-cyan" style={{ fontSize: '0.7rem' }}>
          <span style={{ fontWeight: 600 }}>✦ One-Click Deposit</span> — gasless permit signature, single transaction.
          Allowance: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{usdtAllowanceFormatted} {stableTokenSymbol}</span>
        </div>
      )}

      {/* Simulation error */}
      {error && <div className="alert-red" style={{ fontSize: '0.75rem' }}>⚠ {error}</div>}

      {/* Balances */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-2)' }}>
        <span>Available: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-1)' }}>{getAvailableBalance()} {selectedToken === 'USDT' ? stableTokenSymbol : selectedToken}</span></span>
        <span>In vault: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--cyan)' }}>{getVaultBalance()} {selectedToken === 'USDT' ? stableTokenSymbol : selectedToken}</span></span>
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
        className="btn btn-cyan"
        style={{ width: '100%', padding: '0.7rem' }}
        onClick={handleDeposit}
        disabled={isLoading || isSimulating || !amount || parseFloat(amount) <= 0}
      >
        {isSimulating ? 'Checking…' : isLoading ? (isApproving ? 'Approving…' : 'Depositing…') : selectedToken === 'USDT' ? `One-Click Deposit ${amount || '0'} ${stableTokenSymbol}` : `Deposit ${amount || '0'} ETH`}
      </button>

      {isSuccess && (
        <div className="alert-green" style={{ fontSize: '0.75rem' }}>
          {isDepositWithPermitSuccess ? '✦ One-click deposit complete.' : isApproveSuccess ? `Approved. You can now deposit ${amount} ${selectedToken === 'USDT' ? stableTokenSymbol : selectedToken}.` : 'Deposit complete.'}
        </div>
      )}
    </div>
  )
}
