import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedAddress } from '@/lib/auth'
import { getDb } from '@/lib/agent/db'

// GET /api/auth/sessions
// Returns all active sessions for the authenticated wallet.
export async function GET(req: NextRequest) {
  let userAddress: string
  try {
    userAddress = await requireAuthenticatedAddress(req)
  } catch (resp) {
    return resp as Response
  }

  const result = await getDb().query(
    `SELECT session_id, created_at, last_seen_at, ip, user_agent
       FROM user_sessions
       WHERE user_address = $1 AND revoked_at IS NULL
       ORDER BY last_seen_at DESC`,
    [userAddress.toLowerCase()]
  )

  return NextResponse.json({ sessions: result.rows })
}
