export interface LegacyIntent {
  action: 'deposit' | 'withdraw' | 'unknown'
  amount: number
  token: 'ETH' | 'USDT' | 'unknown'
  token_address: string
  confidence: 'high' | 'medium' | 'low'
  risk_level?: 'high' | 'medium' | 'low'
  risk_reason?: string
}

export interface StrategyIntent {
  action: 'suggest' | 'intent_confirmed' | 'unknown'
  strategy_logic: string
  action_data: {
    type: 'invest' | 'divest' | 'check_yield' | 'deposit' | 'withdraw' | 'cross_chain_migrate' | 'none'
    amount: number
    token: string
    protocol: string
    net_apy: number
    source_chain?: 'base'
    target_chain?: 'arbitrum'
    delta_apy?: number
    net_advantage_usd?: number
    breakeven_days?: number | null
    risk_level: 'low' | 'medium' | 'high'
  }
  confidence: 'high' | 'medium' | 'low'
}

export type AIIntent = LegacyIntent | StrategyIntent

export function isStrategyIntent(intent: AIIntent | null | undefined): intent is StrategyIntent {
  return Boolean(intent && 'action_data' in intent && 'strategy_logic' in intent)
}

export function isLegacyIntent(intent: AIIntent | null | undefined): intent is LegacyIntent {
  return Boolean(intent && 'amount' in intent && 'token' in intent)
}
