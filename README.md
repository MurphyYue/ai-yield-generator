# AI-Powered Cross-Chain Yield Navigator

## What This Is

An AI-driven DeFi vault that monitors yield across Base and Arbitrum Aave V3, advises users on cross-chain migration opportunities, and executes bridge transactions via LI.FI — all through a conversational interface backed by a LangGraph agent with long-term memory, real HITL interrupts, and SIWE-authenticated sessions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 16)                            │
│                                                                          │
│  WalletConnect (RainbowKit + SIWE)                                       │
│    → personal_sign EIP-4361 → NextAuth JWT cookie                        │
│                                                                          │
│  AIPanel ──────────────────────────────────────────────────────────────  │
│    │  POST /api/chat/stream (SSE)                                         │
│    │    ← progress events (node-by-node)                                  │
│    │    ← token events (character-by-character LLM output)                │
│    │    ← interrupt event (migration approval needed)                     │
│    │    ← intent event (final structured recommendation)                  │
│    │                                                                      │
│    ├── Risk Modal → POST /api/chat/resume (approve / cancel)              │
│    └── LI.FI Widget → bridge USDC Base ↔ Arbitrum → deposit into vault   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LANGGRAPH AGENT                                     │
│                                                                          │
│  START                                                                   │
│   ├── fetchMarket  ──┐                                                   │
│   ├── loadMemory   ──┼──► router ──► yieldSubgraph      ──┐             │
│   └── checkAlerts  ──┘         ├──► migrationSubgraph   ──┤             │
│                                ├──► alertSubgraph        ──┤             │
│                                └──► knowledgeSubgraph    ──┤             │
│                                                            ▼             │
│                                                   consolidateMemory      │
│                                                            │             │
│                                                           END            │
│                                                                          │
│  migrationSubgraph: agent ⇄ tools → approvalGate → interrupt()          │
│    graph pauses, checkpointed by PostgresSaver                           │
│    POST /api/chat/resume → Command({ resume: true|false }) → continues  │
│                                                                          │
│  Memory:                                                                 │
│    Short-term: PostgresSaver  (per-thread checkpoints)                   │
│    Long-term:  PostgresStore  (pgvector semantic search, per wallet)     │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTRACT LAYER                                   │
│                                                                          │
│  ┌──────────────────────────┐         ┌──────────────────────────┐      │
│  │   Base Mainnet (8453)    │  LI.FI  │  Arbitrum Mainnet (42161)│      │
│  │                          │◄═══════►│                          │      │
│  │  VaultV3                 │  bridge │  VaultV3                 │      │
│  │  ├── EIP-2612 Permit     │         │  ├── EIP-2612 Permit     │      │
│  │  ├── AccessControl       │         │  ├── AccessControl       │      │
│  │  ├── Pausable            │         │  ├── Pausable            │      │
│  │  └── IStrategy           │         │  └── IStrategy           │      │
│  │       │                  │         │       │                  │      │
│  │  AaveStrategy            │         │  AaveStrategy            │      │
│  │  └── Base Aave V3 Pool   │         │  └── Arb Aave V3 Pool    │      │
│  │     Real USDC            │         │     Real USDC            │      │
│  └──────────────────────────┘         └──────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         POSTGRES (Docker)                                │
│                                                                          │
│  checkpoints      — LangGraph PostgresSaver (short-term memory)         │
│  store            — LangGraph PostgresStore + pgvector (long-term)      │
│  alerts           — user price/APY alerts                               │
│  conversations    — thread_id per wallet, 24h session window            │
│  user_sessions    — JWT session audit + revocation                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contracts | Solidity, Foundry, OpenZeppelin |
| Contract testing | Foundry unit tests, mainnet fork tests (Base + Arbitrum) |
| Frontend | Next.js 16, React 19, TypeScript |
| Web3 client | wagmi v2, viem v2, RainbowKit v2 |
| Authentication | SIWE (EIP-4361), NextAuth v4, JWT + Postgres revocation |
| AI agent | LangGraph (parallel prep, router, subgraphs, HITL, streaming) |
| LLM | OpenAI GPT (configurable model + base URL) |
| Long-term memory | PostgresStore + pgvector + text-embedding-3-small |
| Bridge | LI.FI SDK + Widget |
| Indexer | Ponder (on-chain event indexing) |
| Database | PostgreSQL + pgvector extension |

---

## Key Features

**Smart Contracts**
- EIP-2612 Permit — gasless one-click deposit (no separate approve tx)
- Strategy Pattern — swappable yield protocols behind a stable vault interface
- Role-based access control — DEFAULT_ADMIN / MANAGER / OPERATOR / TREASURER separation
- Emergency pause circuit breaker
- Deployed and verified on Base and Arbitrum mainnet

**AI Agent**
- Parallel prep fan-out — market data, user memory, and alert checks run simultaneously
- Intent router — classifies queries into yield / migration / alert / knowledge subgraphs
- Real HITL — `interrupt()` genuinely pauses the graph at migration approval; state survives server restarts
- Long-term memory — `PostgresStore` with pgvector semantic search; facts persist across sessions
- Hot-path memory consolidation — durable user facts extracted after every turn
- Token streaming — character-by-character SSE output with per-node progress labels

**Authentication & Sessions**
- SIWE (EIP-4361) — wallet signature proves identity; server never trusts `user_id` from request body
- Hybrid JWT + DB sessions — stateless cookie performance with immediate revocation on disconnect
- Cross-device conversation continuity — active `thread_id` persisted per wallet, restored on page load
- Interrupt recovery — pending migration approvals re-surface automatically after tab close/reopen

**Safety**
- Mainnet fork tests against live Aave V3 state (Base + Arbitrum)
- Slither static analysis
- Risk modal with breakeven calculation before any cross-chain action
- Chain ID allowlist (Base 8453, Arbitrum 42161) enforced at auth layer

---

## Deployed Contracts

### Base Mainnet (chainId: 8453)

| Contract | Address |
|----------|---------|
| VaultV3 | [`0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66`](https://basescan.org/address/0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66) |
| AaveStrategy | [`0x4d287Aaf11dEb2142246327eEbE3AFF558EF6a22`](https://basescan.org/address/0x4d287Aaf11dEb2142246327eEbE3AFF558EF6a22) |
| Aave V3 Pool | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

### Arbitrum Mainnet (chainId: 42161)

| Contract | Address |
|----------|---------|
| VaultV3 | [`0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66`](https://arbiscan.io/address/0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66) |
| AaveStrategy | [`0x4d287Aaf11dEb2142246327eEbE3AFF558EF6a22`](https://arbiscan.io/address/0x4d287Aaf11dEb2142246327eEbE3AFF558EF6a22) |
| Aave V3 Pool | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |

---

## Project Structure

```
contracts/          Solidity — VaultV3, AaveStrategy, IStrategy, mocks
test/               Foundry tests — unit, permit, fork (Base + Arbitrum)
script/             Foundry deployment scripts
frontend/
  app/
    api/
      auth/         NextAuth SIWE handler, session list/revoke endpoints
      chat/         stream (SSE), resume (HITL), conversation, status
      vault-context/ on-chain data aggregation
  components/       AIPanel, RiskModal, WalletConnect, Providers, AdminPanel
  lib/
    agent/
      nodes/        fetchMarket, loadMemory, checkAlerts, router, consolidateMemory
      subgraphs/    yield, migration, alert, knowledge
      graph.ts      parent graph assembly + getAgent singleton
      memory.ts     PostgresStore singleton
      db.ts         pool singleton + setupTables
    auth.ts         authOptions + requireAuthenticatedAddress
    wagmi.ts        wagmi config
ponder-indexing/    Ponder on-chain event indexer
summary-report/     Day-by-day completion reports
```

---

## Local Development

**Prerequisites**: Docker, Node.js 20+, a funded wallet on Base or Arbitrum

```bash
# Start Postgres + pgvector (required — agent won't boot without it)
docker run -d \
  --name vault-postgres \
  -e POSTGRES_USER=vault \
  -e POSTGRES_PASSWORD=vault \
  -e POSTGRES_DB=vault \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Install and run
cd frontend && npm install
cp .env.example .env.local  # fill in OPENAI_API_KEY, NEXTAUTH_SECRET, etc.
npm run dev
```

All tables (`checkpoints`, `store`, `alerts`, `conversations`, `user_sessions`) are created automatically on first request via `setupTables()` and `PostgresStore.setup()`. No manual migrations needed.

---

## Engineering Process

Followed a 5-level DeFi development workflow:

1. **Unit tests** — Foundry tests with mocks for all contract logic
2. **Mainnet fork tests** — live Aave V3 state on Base and Arbitrum via `vm.createFork`
3. **Canary deployment** — Sepolia testnet with real Aave V3 pool
4. **Mainnet deployment** — verified contracts on Base and Arbitrum
5. **AI integration** — LangGraph agent reading live on-chain data, not mocked prices
