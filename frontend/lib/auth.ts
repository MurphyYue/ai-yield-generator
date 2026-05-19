import { NextRequest } from 'next/server'
import { getServerSession, type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getCsrfToken } from 'next-auth/react'
import { SiweMessage } from 'siwe'
import { getDb } from '@/lib/agent/db'
import { randomUUID } from 'crypto'

// Extend NextAuth types to carry wallet address + session ID
declare module 'next-auth' {
  interface Session {
    address: string
    sessionId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    address: string
    sessionId: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Ethereum',
      credentials: {
        message: { label: 'Message', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.message || !credentials?.signature) return null

        const siweMessage = new SiweMessage(JSON.parse(credentials.message))
        const nonce = await getCsrfToken({ req: { headers: req.headers } })

        const result = await siweMessage.verify({
          signature: credentials.signature,
          nonce,
          domain: new URL(process.env.NEXTAUTH_URL!).host,
          time: new Date().toISOString(),
        })

        if (!result.success) return null

        // Only allow Base (8453) and Arbitrum (42161)
        if (![8453, 42161].includes(siweMessage.chainId)) return null

        return { id: siweMessage.address }
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.address = user.id
        token.sessionId = randomUUID()
        await getDb().query(
          `INSERT INTO user_sessions (session_id, user_address) VALUES ($1, $2)`,
          [token.sessionId, user.id.toLowerCase()]
        )
      }
      return token
    },
    async session({ session, token }) {
      session.address = token.address
      session.sessionId = token.sessionId
      return session
    },
  },

  events: {
    async signOut({ token }) {
      if (token?.sessionId) {
        await getDb().query(
          `UPDATE user_sessions SET revoked_at = NOW() WHERE session_id = $1`,
          [token.sessionId]
        )
      }
    },
  },
}

// Reads the wallet address from the verified session cookie.
// Throws a Response(401) if unauthenticated or session is revoked.
// Fire-and-forgets a last_seen_at + IP stamp on every call.
export async function requireAuthenticatedAddress(req: NextRequest): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session?.address || !session.sessionId) {
    throw new Response('Unauthorized', { status: 401 })
  }

  const result = await getDb().query(
    `SELECT revoked_at FROM user_sessions WHERE session_id = $1`,
    [session.sessionId]
  )
  if (!result.rows.length || result.rows[0].revoked_at) {
    throw new Response('Session revoked', { status: 401 })
  }

  // Audit stamp — non-blocking
  void getDb().query(
    `UPDATE user_sessions SET last_seen_at = NOW(), ip = $2, user_agent = $3 WHERE session_id = $1`,
    [
      session.sessionId,
      req.headers.get('x-forwarded-for') ?? null,
      req.headers.get('user-agent') ?? null,
    ]
  )

  return session.address
}
