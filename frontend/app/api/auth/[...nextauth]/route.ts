import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setupTables } from '@/lib/agent/db'

// Ensure DB tables exist before any auth request hits the JWT callback.
// setupTables() is idempotent (CREATE IF NOT EXISTS) so calling it here is safe.
const initPromise = setupTables().catch(console.error)

async function handler(req: Request, ctx: unknown) {
  await initPromise
  return (NextAuth(authOptions) as (req: Request, ctx: unknown) => Promise<Response>)(req, ctx)
}

export { handler as GET, handler as POST }
