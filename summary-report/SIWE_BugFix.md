# Problem: SIWE Authentication 500 Error

  ## The Problem

  After wallet signature confirmation, POST /api/auth/credentials returned 500, blocking the entire sign-in flow.

  Root Cause (layered)

  There were actually two separate bugs stacked on top of each other:

  ### Bug 1: siwe package required ethers at runtime

  siwe@3 imports ethers unconditionally at the top of ethersCompat.js:
  const ethers_1 = require("ethers");  // throws if ethers not installed
  This crashed the NextAuth route on load, which caused /api/auth/csrf to return 500, which caused getCsrfToken() to fail on
  the client, which produced the "Error preparing message" dialog before the user even signed anything.

  ### Bug 2: user_sessions table didn't exist

  Even after fixing Bug 1, the JWT callback did INSERT INTO user_sessions — but setupTables() only ran lazily on first chat
  request, not on auth. So the first sign-in attempt hit a missing table and returned 500.

  ## How I Found Each One

  ### Bug 1 — The error message from the previous session was explicit: Cannot find module 'ethers' in the require stack
  ethersCompat.js → client.js → siwe.js → [...nextauth]/route.js. The serverExternalPackages: ['siwe'] config had been tried
  but didn't work because Next.js 16 uses Turbopack by default for next dev, and Turbopack ignores the webpack config block
  entirely.

  ### Bug 2 — After fixing Bug 1, I tested each step of authorize() in isolation using node -e. parseSiweMessage,
  validateSiweMessage, and recoverMessageAddress all worked correctly with the actual payload from the failed request. That
  ruled out crypto logic. The only remaining path that could 500 was the DB insert in the JWT callback, so I checked whether
  the table existed:
  docker exec vault-postgres psql -U vault -d vault -c "\dt user_sessions" # → Did not find any relation named "user_sessions"

 ##  How I Solved Each One

  ### Bug 1 — Replaced the siwe package entirely with viem/siwe, which is already a project dependency (used by
  @rainbow-me/rainbowkit-siwe-next-auth internally). The three siwe calls mapped directly:

  Before (siwe): new SiweMessage(JSON.parse(msg))
  After (viem/siwe + viem): parseSiweMessage(msg)
  Bug 1 — Replaced the siwe package entirely with viem/siwe, which is already a project dependency (used by
  @rainbow-me/rainbowkit-siwe-next-auth internally). The three siwe calls mapped directly:

  Before (siwe): new SiweMessage(JSON.parse(msg))
  After (viem/siwe + viem): parseSiweMessage(msg)
  ────────────────────────────────────────
  Before (siwe): siweMessage.verify({ signature, nonce, domain })
  After (viem/siwe + viem): validateSiweMessage({ message, nonce, domain }) + recoverMessageAddress({ message, signature })

  Zero new dependencies. siwe was then uninstalled.

  ### Bug 2 — Two-part fix: created the table immediately via docker exec for the live session, and added setupTables() to the
  NextAuth route handler so it runs eagerly on first auth request rather than waiting for the chat agent to initialize:

  const initPromise = setupTables().catch(console.error)

  async function handler(req, ctx) {
    await initPromise  // guarantees tables exist before JWT callback runs
    return NextAuth(authOptions)(req, ctx)
  }

  setupTables() uses CREATE TABLE IF NOT EXISTS throughout, so calling it from multiple places is safe.