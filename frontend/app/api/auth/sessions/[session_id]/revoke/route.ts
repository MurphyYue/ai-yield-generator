import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedAddress } from '@/lib/auth'
import { getDb } from '@/lib/agent/db'

// POST /api/auth/sessions/[session_id]/revoke
// Revokes a specific session. Ownership enforced — users can only revoke their own sessions.
export async function POST(
  req: NextRequest,
  { params }: { params: { session_id: string } }
) {
  let userAddress: string
  try {
    userAddress = await requireAuthenticatedAddress(req)
  } catch (resp) {
    return resp as Response
  }

  const { session_id } = params

  const result = await getDb().query(
    `UPDATE user_sessions
       SET revoked_at = NOW()
       WHERE session_id = $1
         AND user_address = $2
         AND revoked_at IS NULL
       RETURNING session_id`,
    [session_id, userAddress.toLowerCase()]
  )

  if (!result.rows.length) {
    return NextResponse.json({ error: 'Session not found or already revoked' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
