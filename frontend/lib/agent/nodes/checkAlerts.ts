import { HumanMessage } from '@langchain/core/messages'
import { getDb } from '../db'
import type { AgentStateType } from '../state'

// Sequential prep node: runs AFTER fetchMarket so it can reuse the
// vaultContext that fetchMarket wrote into state. This is intentional —
// running checkAlerts in parallel with fetchMarket would force a second
// /api/vault-context call (sibling nodes in a single super-step cannot
// see each other's partial state). One coherent APY snapshot is used by
// both alert evaluation and the rest of the turn.
//
// Once an alert fires, it is consumed (triggered_at + active=FALSE) so the
// user isn't re-warned on subsequent turns for the same breach.

export async function checkAlerts(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (!state.userId || !state.vaultContext) return {}

  try {
    const baseApy: number | undefined = state.vaultContext?.base?.supplyApy
    const arbitrumApy: number | undefined = state.vaultContext?.arbitrum?.supplyApy
    if (baseApy === undefined || arbitrumApy === undefined) return {}

    const db = getDb()
    const result = await db.query(
      `SELECT * FROM alerts WHERE user_address = $1 AND active = TRUE AND triggered_at IS NULL`,
      [state.userId.toLowerCase()]
    )

    const triggered = result.rows.filter((alert) => {
      if (alert.alert_type === 'apy_threshold') {
        const current = alert.chain === 'base' ? baseApy : arbitrumApy
        return current < alert.threshold
      }
      return false
    })

    if (triggered.length === 0) return {}

    await db.query(
      `UPDATE alerts SET triggered_at = NOW(), active = FALSE WHERE id = ANY($1::text[])`,
      [triggered.map((a) => a.id)]
    )

    const warnings = triggered
      .map(
        (a) =>
          `⚠️ ALERT TRIGGERED: ${a.chain} APY (${(a.chain === 'base' ? baseApy : arbitrumApy).toFixed(
            2
          )}%) dropped below your ${a.threshold}% threshold.`
      )
      .join('\n')

    return {
      triggeredAlerts: triggered,
      messages: [new HumanMessage(`[SYSTEM ALERT]\n${warnings}`)],
    }
  } catch {
    return {}
  }
}
