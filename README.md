# AI-Powered USDC Yield Aggregator

## What This Is

An AI-assisted DeFi yield platform where users deposit USDC, receive vault shares, and earn yield from external strategies managed by the protocol. The current strategy integration starts with Aave on Base and Arbitrum, and the architecture is being shaped to support additional adapters such as Compound and Yearn.

The AI layer serves two audiences:

- users who want to understand yield, profit, vault status, and risk
- operators who need decision support for allocation, divestment, and cross-chain opportunity evaluation

Cross-chain migration via LI.FI remains a supported workflow, but it is a supporting capability inside the broader yield aggregator product, not the core business by itself.

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
│    ├── User mode → vault status, profit, and risk explanations            │
│    ├── Operator mode → yield comparison and allocation decision support   │
│    ├── Risk Modal → POST /api/chat/resume (approve / cancel)              │
│    └── LI.FI Widget → bridge USDC Base ↔ Arbitrum when migration fits    │
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
│  │  VaultV3 (current live)  │  bridge │  VaultV3 (current live)  │      │
│  │  VaultV4 (target refactor)│        │  VaultV4 (target refactor)│      │
│  │  ├── AccessControl       │         │  ├── AccessControl       │      │
│  │  ├── Pausable            │         │  ├── Pausable            │      │
│  │  ├── ERC-4626 shares     │         │  ├── ERC-4626 shares     │      │
│  │  └── IStrategy adapters  │         │  └── IStrategy adapters  │      │
│  │       │                  │         │       │                  │      │
│  │  AaveStrategy (now)      │         │  AaveStrategy (now)      │      │
│  │  Compound / Yearn (next) │         │  Compound / Yearn (next) │      │
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

## Product Model

- Users deposit USDC into the platform
- The vault tracks ownership through shares
- Yield is generated by external strategies, not by the vault itself
- Users can view vault value, principal, and profit in the UI
- Users can withdraw whenever the vault has sufficient liquidity
- Operators decide when and where capital is allocated
- Treasurers control approval and fee policy
- AI explains yield opportunities and risk to both users and operators

### Role Model

- `DEFAULT_ADMIN_ROLE` — governance, strategy registration, emergency authority
- `MANAGER_ROLE` — pause/unpause, blacklist, operational safety controls
- `OPERATOR_ROLE` — invest, divest, rebalance, and daily strategy execution
- `TREASURER_ROLE` — large withdrawal approvals, fee settings, treasury controls

---

## Key Features

**Smart Contracts**
- Vault shares for USDC depositors, with V4 moving to ERC-4626-based accounting
- Strategy Pattern — swappable yield protocols behind a stable vault interface
- Role-based access control — DEFAULT_ADMIN / MANAGER / OPERATOR / TREASURER separation
- Operator-managed capital allocation into external yield venues
- Treasurer-controlled fee policy and large withdrawal approvals
- Emergency pause circuit breaker
- Mainnet deployment on Base and Arbitrum, with V4 refactor in progress

**AI Agent**
- User copilot — explains vault balances, profit, APY context, and risk
- Operator copilot — helps evaluate yield opportunities and allocation decisions
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
- Risk modal with breakeven calculation before cross-chain action
- Chain ID allowlist (Base 8453, Arbitrum 42161) enforced at auth layer

---

## Current Mainnet Deployment

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

## Target Architecture In Progress

- `VaultV4` is being refactored into a single-asset USDC ERC-4626 vault
- `VaultV3` remains the currently deployed reference
- migration from `VaultV3` is not required because there are no real production users
- Aave is the first strategy adapter
- Compound and Yearn are planned next as additional strategy adapters

---

## Project Structure

```
contracts/          Solidity — VaultV3, VaultV4, AaveStrategy, IStrategy, mocks
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

The current contract work is transitioning from `VaultV3` to a cleaner `VaultV4` model so the product can support a more dependable USDC vault core and future multi-strategy expansion.
