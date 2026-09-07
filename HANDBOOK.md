# Vault Navigator — Engineering Handbook

> Historical Stage 4 handbook. It is not authoritative for Stage 5 deployment or runtime behavior. See `README.md`, `todo.md`, `docs/STAGE5_ARCHITECTURE.md`, and `docs/STAGE5_THREAT_MODEL.md`.

A practical guide for getting the project running locally and deploying it to production.

---

## Table of Contents

- [Project at a Glance](#project-at-a-glance)
- [Part 1: Local Development](#part-1-local-development)
  - [1.1 Prerequisites](#11-prerequisites)
  - [1.2 First-time Setup](#12-first-time-setup)
  - [1.3 Daily Development Loop](#13-daily-development-loop)
  - [1.4 Verification Scripts](#14-verification-scripts)
  - [1.5 Smart Contract Workflow](#15-smart-contract-workflow)
- [Part 2: Production Deployment](#part-2-production-deployment)
  - [2.1 Architecture](#21-architecture)
  - [2.2 Step 1 — Provision Postgres on Neon](#22-step-1--provision-postgres-on-neon)
  - [2.3 Step 2 — Verify Hosted DB Locally](#23-step-2--verify-hosted-db-locally)
  - [2.4 Step 3 — Deploy Ponder Indexer on Railway](#24-step-3--deploy-ponder-indexer-on-railway)
  - [2.5 Step 4 — Deploy Frontend + Agent on Vercel](#25-step-4--deploy-frontend--agent-on-vercel)
  - [2.6 Step 5 — Production Smoke Test](#26-step-5--production-smoke-test)
- [Part 3: Environment Variables Reference](#part-3-environment-variables-reference)
- [Part 4: AI Agent Reference](#part-4-ai-agent-reference)
- [Part 5: Operations](#part-5-operations)
- [Part 6: Troubleshooting](#part-6-troubleshooting)
- [Part 7: Architecture Decisions](#part-7-architecture-decisions)
- [Appendix: Docker Primer](#appendix-docker-primer)

---

## Project at a Glance

Vault Navigator is a DeFi yield navigator with an AI strategy advisor. Users deposit USDC into a `VaultV3` contract on Base or Arbitrum, the vault routes funds to Aave V3 via an `AaveStrategy`, and a LangGraph-powered AI agent advises on yield, migration, and alerts.

```
  Browser (RainbowKit + wagmi)
        │  HTTPS + SSE
        ▼
  ┌─────────────────────────────────────────────────────┐
  │  Next.js App (Vercel)                                │
  │                                                      │
  │  /api/chat/stream  ──→ LangGraph Agent               │
  │  /api/chat/resume       │                            │
  │  /api/vault-context     │                            │
  └─────────────────────────┼────────────────────────────┘
                            │
        ┌───────────────────┼──────────────────────┐
        ▼                   ▼                      ▼
  ┌───────────┐    ┌──────────────────┐   ┌──────────────┐
  │ Postgres  │    │ Ponder GraphQL   │   │ LLM Provider │
  │ (Neon)    │    │ (Railway)        │   │              │
  │           │    │                  │   │ chat model   │
  │ checkpts  │    │ Indexes VaultV3  │   │ embeddings   │
  │ store     │    │ events on Base   │   └──────────────┘
  │ alerts    │    └──────────────────┘
  │ sessions  │             │
  └───────────┘             ▼
                   ┌──────────────────┐
                   │ Base + Arbitrum  │
                   │ (Alchemy RPC)    │
                   │ VaultV3          │
                   │ AaveStrategy     │
                   └──────────────────┘
```

| Layer | Tech | Runs on |
|---|---|---|
| Smart contracts | Solidity + Foundry | Base mainnet (8453), Arbitrum mainnet (42161) |
| Frontend + Agent | Next.js, wagmi, viem, RainbowKit, LangGraph | Vercel |
| Long-term memory | `PostgresStore` + `pgvector` | Neon Postgres |
| Short-term memory | `PostgresSaver` | Same Neon Postgres |
| Event indexer | Ponder | Railway |
| Authentication | SIWE (EIP-4361) + NextAuth | Vercel (JWT cookie + Postgres session table) |

---

## Part 1: Local Development

### 1.1 Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20.x | [nodejs.org](https://nodejs.org) |
| pnpm | latest | `npm i -g pnpm` |
| Docker Desktop | latest | [docker.com](https://docker.com) |
| Foundry | latest | `curl -L https://foundry.paradigm.xyz \| bash` |

Optional but useful: `psql` (`brew install libpq`), `jq`, VS Code Solidity extension.

---

### 1.2 First-time Setup

#### Step 1 — Clone and install

```bash
git clone <repo-url> web3-projects
cd web3-projects

cd frontend && npm install && cd ..
cd ponder-indexing && pnpm install && cd ..
forge install
```

#### Step 2 — Import deployer keys into encrypted keystore

Private keys are **never** stored in `.env`. Foundry encrypts them with a password and stores them in `~/.foundry/keystores/`. Run once per machine:

```bash
# Mainnet deployer (your real wallet)
cast wallet import my_deployer_account --interactive

# Anvil test key (well-known default, no real value)
cast wallet import anvil_account --interactive
# Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Verify
cast wallet list
```

All `forge script` commands use `--account <name>`. The key is decrypted in memory only at broadcast time.

#### Step 3 — Start the local Postgres container

```bash
docker run --name vault-postgres \
  -e POSTGRES_USER=vault \
  -e POSTGRES_PASSWORD=vault \
  -e POSTGRES_DB=vault \
  -p 5432:5432 \
  -v vault-postgres-data:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg16
```

> Use `pgvector/pgvector:pg16`, not plain `postgres:16` — the pgvector extension must be pre-installed.

The app runs `CREATE EXTENSION IF NOT EXISTS vector` automatically on first boot. No manual SQL needed.

```bash
# Verify it's running
docker exec vault-postgres pg_isready -U vault -d vault
```

#### Step 4 — Create env files

```bash
cp frontend/.env.example frontend/.env.local
# Fill in real values — see Part 3 for what each variable does
```

Minimum required for local dev:

```bash
DATABASE_URL=postgresql://vault:vault@localhost:5432/vault

OPENAI_API_KEY=sk-...
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_MODEL=gpt-4o

OPENAI_EMBEDDINGS_API_KEY=sk-...
OPENAI_EMBEDDINGS_API_BASE_URL=https://api.openai.com/v1

NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

NEXT_PUBLIC_CHAIN=base
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY

NEXT_PUBLIC_BASE_VAULT_ADDRESS=0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66
NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS=0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66

PONDER_GRAPHQL_URL=http://localhost:42069/graphql
LANGSMITH_TRACING=false
```

`ponder-indexing/.env.local`:

```bash
DATABASE_URL=postgresql://vault:vault@localhost:5432/vault
PONDER_RPC_URL_8453=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

> Ponder writes to the same Postgres database as the agent, using separate table namespaces.

#### Step 5 — Start everything

Open three terminal tabs:

```bash
# Tab 1 — Frontend
cd frontend && npm run dev        # → http://localhost:3000

# Tab 2 — Ponder indexer
cd ponder-indexing && pnpm dev    # → http://localhost:42069/graphql

# Tab 3 — Anvil (only for contract tests)
anvil                             # → http://localhost:8545
```

Visit http://localhost:3000, connect a wallet, and send a message in the AI panel. The first request is slow — `PostgresSaver.setup()` and `PostgresStore.setup()` run DB migrations on first boot.

---

### 1.3 Daily Development Loop

```bash
docker start vault-postgres       # only needed after a host reboot
cd frontend && npm run dev
cd ponder-indexing && pnpm dev
```

Stop: `Ctrl+C` for frontend/Ponder, then `docker stop vault-postgres`.

```bash
# Type-check
cd frontend && npx tsc --noEmit

# Lint
cd frontend && npm run lint
```

---

### 1.4 Verification Scripts

Two scripts in `frontend/scripts/` validate the agent stack without booting the full app:

```bash
cd frontend

# Smoke-test PostgresStore + pgvector + embeddings
npx tsx --env-file=.env.local scripts/verify-store.ts

# Build the agent and run a knowledge query end-to-end
npx tsx --env-file=.env.local scripts/verify-agent.ts
```

Both exit non-zero on failure and are safe to wire into CI.

---

### 1.5 Smart Contract Workflow

Contracts are already deployed to mainnet (see `DEPLOYED_ADDRESSES.md`). All commands are in the `Makefile` — run `make help` for the full list.

```bash
make build               # compile
make test                # unit tests
make test-fork-base      # fork test against live Base Aave V3
make test-fork-arbitrum  # fork test against live Arbitrum Aave V3
```

**Deploying** (only if redeploying):

```bash
make deploy-anvil        # local Anvil
make deploy-base         # Base mainnet — prompts for keystore password
make deploy-arbitrum     # Arbitrum mainnet
```

If you redeploy:
1. Update `NEXT_PUBLIC_BASE_VAULT_ADDRESS` / `NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS` in `frontend/.env.local`
2. Update `ponder-indexing/ponder.config.ts` → `contracts.VaultV3.address` and `startBlock`
3. Wipe Ponder's indexed data and restart:
   ```bash
   docker exec vault-postgres psql -U vault -d vault \
     -c "DROP TABLE IF EXISTS _ponder_meta, _ponder_checkpoint, _reorg__vault_activity, vault_activity CASCADE;"
   ```

---

## Part 2: Production Deployment

### 2.1 Architecture

No Docker in production. Each component runs on a managed platform.

| Component | Platform | Notes |
|---|---|---|
| Frontend + Agent | Vercel | Serverless Next.js; `/api/*` routes run as functions |
| Postgres + pgvector | Supabase | Hosted Postgres with pgvector; free tier is sufficient |
| Ponder indexer | Railway | Long-running Node process; not a fit for serverless |

```
  Vercel (Next.js + LangGraph)
       │
       ├──→ Supabase Postgres (checkpoints, store, alerts, sessions)
       ├──→ Railway (Ponder GraphQL)
       └──→ LLM provider (chat + embeddings)
```

**Vercel timeout**: the hobby plan caps functions at 10 seconds. The streaming endpoint (`/api/chat/stream`) is not subject to this cap because Vercel measures time-to-first-byte. Use streaming for all agent interactions in production.

---

### 2.2 Step 1 — Provision Postgres on Supabase

1. Sign up at [supabase.com](https://supabase.com), create a new project, Postgres 16
2. Enable pgvector: go to Database → Extensions → search `vector` → enable it
3. Get the connection string: Project Settings → Database → Connection String → **URI** tab
4. **Important**: use the **direct connection** (port 5432), not the pooler (port 6543). The pooler uses PgBouncer in transaction mode, which breaks `PostgresSaver` and `PostgresStore` prepared statements.

The connection string looks like:
```
postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

---

### 2.3 Step 2 — Verify Hosted DB Locally

Before deploying, confirm the hosted DB works with your code:

```bash
cd frontend
# Temporarily set DATABASE_URL to the Supabase direct connection string in .env.local
npx tsx --env-file=.env.local scripts/verify-store.ts
npx tsx --env-file=.env.local scripts/verify-agent.ts
# Restore DATABASE_URL to local Docker URL after both pass
```

---

### 2.4 Step 3 — Deploy Ponder Indexer on Railway

1. Sign up at [railway.app](https://railway.app), link GitHub, create a new project from this repo
2. Set **root directory** to `ponder-indexing`
3. Set environment variables:
   ```
   DATABASE_URL        = <Supabase direct connection string>
   PONDER_RPC_URL_8453 = <Alchemy Base mainnet URL>
   ```
4. Build command: `pnpm install` — Start command: `pnpm start`
5. Deploy, then generate a public domain. The GraphQL endpoint is at `/graphql` on that domain.

Verify:
```bash
curl https://your-ponder.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ vaultActivitys(limit: 1) { items { id } } }"}'
```

---

### 2.5 Step 4 — Deploy Frontend + Agent on Vercel

1. Sign in to [vercel.com](https://vercel.com), import the repo
2. Set **root directory** to `frontend`, Node version to 20.x
3. Add environment variables before clicking Deploy:

```
DATABASE_URL                    = <Supabase direct connection string>
PONDER_GRAPHQL_URL              = https://your-ponder.up.railway.app/graphql

OPENAI_API_KEY                  = <chat LLM key>
OPENAI_API_BASE_URL             = <chat LLM endpoint>
OPENAI_API_MODEL                = gpt-4o

OPENAI_EMBEDDINGS_API_KEY       = <embeddings key>
OPENAI_EMBEDDINGS_API_BASE_URL  = <embeddings endpoint>

NEXTAUTH_SECRET                 = <openssl rand -base64 32>
NEXTAUTH_URL                    = https://<your-vercel-domain>

NEXT_PUBLIC_CHAIN               = base
NEXT_PUBLIC_APP_URL             = https://<placeholder — update after first deploy>

NEXT_PUBLIC_BASE_RPC_URL        = <Alchemy Base URL>
NEXT_PUBLIC_ARBITRUM_RPC_URL    = <Alchemy Arbitrum URL>
BASE_RPC_URL                    = <same>
ARBITRUM_RPC_URL                = <same>

NEXT_PUBLIC_BASE_VAULT_ADDRESS      = 0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66
NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS  = 0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66

LANGSMITH_TRACING               = false
```

4. Deploy. Once done, update `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to the real Vercel URL and redeploy.

> `NEXT_PUBLIC_APP_URL` matters because the agent's `get_market_data` tool calls `/api/vault-context` via this URL server-side.

---

### 2.6 Step 5 — Production Smoke Test

| Check | Expected |
|---|---|
| Page loads | RainbowKit Connect button visible |
| Wallet connects + SIWE signs | JWT cookie set, no 401 errors |
| "what is USDC?" in AI panel | Response in <5s, no tool calls |
| "should I invest?" in AI panel | Streams tokens, shows yield data |
| Transaction history loads | Ponder → Neon → Vercel chain is wired |

Tail logs: Vercel → Deployments → Functions tab. Railway → service → Logs. Neon → Monitoring.

Common failures:
- Missing env var → silent 500
- Wrong `NEXT_PUBLIC_APP_URL` → agent tools can't call `/api/vault-context`
- `NEXTAUTH_URL` mismatch → SIWE nonce validation fails

---

## Part 3: Environment Variables Reference

### Frontend — Server-side

| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | Postgres connection | Used by `PostgresSaver`, `PostgresStore`, alerts, sessions tables |
| `OPENAI_API_KEY` | Chat LLM | Any OpenAI-compatible key |
| `OPENAI_API_BASE_URL` | Chat LLM endpoint | Default: `https://api.openai.com/v1` |
| `OPENAI_API_MODEL` | Chat model name | e.g. `gpt-4o` |
| `OPENAI_EMBEDDINGS_API_KEY` | Embeddings LLM | Separate from chat — many proxies don't host embedding models |
| `OPENAI_EMBEDDINGS_API_BASE_URL` | Embeddings endpoint | Must serve `text-embedding-3-small` (1536 dims) |
| `BASE_RPC_URL` | On-chain reads (server) | Can match the `NEXT_PUBLIC_` version |
| `ARBITRUM_RPC_URL` | On-chain reads (server) | |
| `PONDER_GRAPHQL_URL` | Transaction history | `http://localhost:42069/graphql` locally |
| `NEXTAUTH_SECRET` | JWT signing | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | NextAuth redirect base | Must match the deployed URL exactly |
| `LANGSMITH_TRACING` | LangSmith observability | `false` by default; set `true` to trace agent calls |
| `LANGSMITH_API_KEY` | LangSmith API | Only needed if tracing is enabled |

### Frontend — Browser-exposed (`NEXT_PUBLIC_*`)

These are inlined into the browser bundle. **Never put secrets here.**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployed app (used by agent tools for internal HTTP calls) |
| `NEXT_PUBLIC_CHAIN` | Active chain: `base` or `arbitrum` |
| `NEXT_PUBLIC_BASE_RPC_URL` | Wagmi RPC for Base |
| `NEXT_PUBLIC_ARBITRUM_RPC_URL` | Wagmi RPC for Arbitrum |
| `NEXT_PUBLIC_BASE_VAULT_ADDRESS` | VaultV3 address on Base |
| `NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS` | VaultV3 address on Arbitrum |

### Ponder Indexer

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Same Postgres as the agent |
| `PONDER_RPC_URL_8453` | Base mainnet RPC for event subscription |

### Smart Contract Deployment (root `.env`)

Only needed when redeploying contracts. Private keys are **not** stored here — use `cast wallet import` (see section 1.2 Step 2).

| Variable | Purpose |
|---|---|
| `BASE_RPC_URL` / `ARBITRUM_RPC_URL` | Forge `--rpc-url` |
| `BASESCAN_API_KEY` / `ARBISCAN_API_KEY` | Contract verification |
| `YOUR_ADDRESS` | `--sender` for pre-broadcast simulation |
| `ANVIL_RPC_URL` | Local Anvil deployment |

---

## Part 4: AI Agent Reference

### Graph topology

```
START
 ├── fetchMarket  ──┐
 ├── loadMemory   ──┼──► router ──► yield / migration / alert / knowledge
 └── checkAlerts  ──┘                                         │
                                               consolidateMemory → END
```

Three prep nodes run in parallel on every turn, converge at the router, one subgraph runs, then memory is extracted.

### Subgraphs

| Subgraph | Tools | Triggered by |
|---|---|---|
| `yield` | `getMarketData`, `getUserPositions`, `getUserHistory` | Yield/investment questions |
| `migration` | `getMarketData`, `getUserPositions` | Cross-chain migration requests |
| `alert` | `setAlert`, `getAlerts` | Alert set/read requests |
| `knowledge` | None | General DeFi questions |

### Long-term memory

User facts are stored in `PostgresStore` under `[walletAddress, 'profile']`. On every turn, `loadMemory` vector-searches the top-5 relevant facts and injects them into the subgraph's system prompt. `consolidateMemory` extracts new facts after every turn. Facts persist across sessions and are scoped per wallet address.

### Migration approval (HITL)

When `migrationSubgraph` reaches `approvalGate`, `interrupt()` pauses the graph and checkpoints state. The client receives an SSE `interrupt` event and shows the risk modal. On user decision:

```
POST /api/chat/resume  { thread_id, decision: true|false }
```

The graph resumes from the checkpoint. State survives server restarts. If the user closes the tab before deciding, the risk modal re-surfaces on next page load via `GET /api/chat/status?thread_id=...`.

### SSE event types (`/api/chat/stream`)

| Type | When |
|---|---|
| `init` | Stream start — carries `conversation_id` |
| `progress` | Each node completes — carries `node` name |
| `token` | Each LLM output character — carries `content` and `node` |
| `interrupt` | Migration approval needed — carries approval details |
| `intent` | Final structured result |
| `done` | Stream end |

### Authentication

Every protected route calls `requireAuthenticatedAddress(req)` (`frontend/lib/auth.ts`), which reads the wallet address from the NextAuth JWT cookie — never from the request body. Session revocation is enforced via the `user_sessions` table. On wallet disconnect, `signOut()` sets `revoked_at`, invalidating the session immediately.

---

## Part 5: Operations

### Database backups

**Neon**: point-in-time recovery is included (free tier: 7-day history).

**Local Docker**:
```bash
# Backup
docker exec vault-postgres pg_dump -U vault -d vault > vault-backup-$(date +%Y%m%d).sql

# Restore
docker exec -i vault-postgres psql -U vault -d vault < vault-backup-YYYYMMDD.sql
```

### Monitoring

| Surface | Where |
|---|---|
| Vercel function logs | Deployments → latest → Functions tab |
| Railway logs | Service → Logs tab |
| Supabase query stats | Project → Database → Query Performance |
| LangSmith traces | smith.langchain.com (enable via `LANGSMITH_TRACING=true`) |
| RPC usage | Alchemy dashboard → Compute Units |

### Key rotation

When rotating any API key:
1. Update `.env.local` locally
2. Update the same var in Vercel (Settings → Environment Variables)
3. Update in Railway if Ponder uses the key
4. Trigger a redeploy
5. Confirm the old key is revoked at the provider

### Updating vault contract addresses

If new contracts are deployed:
1. Update `DEPLOYED_ADDRESSES.md`
2. Update `NEXT_PUBLIC_BASE_VAULT_ADDRESS` / `NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS` in Vercel
3. Update `ponder-indexing/ponder.config.ts` → `contracts.VaultV3.address` and `startBlock`
4. Reset Ponder's indexed data and redeploy Railway

---

## Part 6: Troubleshooting

### Frontend won't connect to Postgres

**Local**: is `vault-postgres` running? `docker start vault-postgres`. Check `DATABASE_URL` in `.env.local`.

**Production**: `DATABASE_URL` is missing `?sslmode=require` (Neon requires it). Copy the connection string fresh from the Neon dashboard.

### "extension 'vector' is not available"

Wrong Docker image. Stop and recreate the container using `pgvector/pgvector:pg16` (the volume is preserved):

```bash
docker stop vault-postgres && docker rm vault-postgres
docker run --name vault-postgres \
  -e POSTGRES_USER=vault -e POSTGRES_PASSWORD=vault -e POSTGRES_DB=vault \
  -p 5432:5432 -v vault-postgres-data:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg16
```

### "model does not exist" on embeddings

Your LLM provider doesn't host `text-embedding-3-small`. Set `OPENAI_EMBEDDINGS_API_KEY` and `OPENAI_EMBEDDINGS_API_BASE_URL` to a provider that does.

### Vercel function timed out

The non-streaming `/api/chat` route exceeded 10 seconds (hobby plan limit). Use `/api/chat/stream` instead — Vercel measures time-to-first-byte for streaming responses, so it is not subject to the same cap.

### SIWE sign-in fails with 500

Check that `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set. Confirm the `user_sessions` table exists (`docker exec vault-postgres psql -U vault -d vault -c "\dt user_sessions"`). If missing, restart the app — `setupTables()` runs on first request.

### Wallet connects but vault balance is 0

- `NEXT_PUBLIC_BASE_VAULT_ADDRESS` doesn't match `DEPLOYED_ADDRESSES.md`
- Wallet is on the wrong chain (must match `NEXT_PUBLIC_CHAIN`)
- Wallet has no prior deposits — verify on Basescan / Arbiscan

### Ponder shows no transactions

- Check Railway logs — Ponder logs `block X of Y synced`
- Verify `PONDER_RPC_URL_8453` is a working Alchemy endpoint
- Check `startBlock` in `ponder.config.ts` is before the first vault transaction

---

## Part 7: Architecture Decisions

### Postgres + pgvector instead of a dedicated vector DB

The agent already needed Postgres for `PostgresSaver` checkpoints and the alerts table. Adding `pgvector` keeps everything in one database and simplifies backups. Trade-off: pgvector is slower than purpose-built vector DBs at >10M vectors — not a concern at this scale.

### LangGraph instead of raw OpenAI function calling

LangGraph provides state persistence, deterministic graph topology, and built-in HITL via `interrupt()`. The architecture maps directly to the official LangGraph docs, making it recognisable to any engineer who has worked with the framework.

### Vercel instead of self-hosted Next.js

Zero-config deployment, automatic SSL, and a free tier. The cold-start latency is real for the agent, but managing a VPS is significantly more work for a portfolio project.

### Supabase instead of Neon

Supabase is a Firebase alternative built on Postgres — it ships auth, storage, realtime, and edge functions on top of Postgres. This project only uses the Postgres layer (the rest is unused), but Supabase's pgvector support and free tier make it a practical choice. One important constraint: always use the **direct connection string** (port 5432), not the pooler (port 6543). The pooler uses PgBouncer in transaction mode, which breaks `PostgresSaver` and `PostgresStore` prepared statements.

### Ponder instead of The Graph

TypeScript-native, faster iteration, no AssemblyScript. Good fit for a TypeScript-heavy stack. The Graph is more battle-tested at scale.

### Split chat and embeddings LLM providers

Some OpenAI-compatible proxies serve only chat completions or only embeddings. Splitting the config lets each capability point at whichever endpoint works, without coupling them.

### SIWE + hybrid JWT/DB sessions

SIWE (EIP-4361) proves wallet identity via a cryptographic signature — the server never trusts a `user_id` from the request body. The hybrid session model (JWT cookie + `user_sessions` table) gives stateless cookie performance with immediate revocation on disconnect. Pure JWT can't revoke before expiry; pure DB sessions don't compose cleanly with NextAuth's Credentials provider.

---

## Appendix: Docker Primer

If you're new to Docker, here's the minimum needed to operate this project.

```
Image     = a pre-built filesystem snapshot (e.g. pgvector/pgvector:pg16)
Container = a running instance of an image (e.g. vault-postgres)
Volume    = persistent disk attached to a container (e.g. vault-postgres-data)
```

**Containers are disposable. Volumes are precious.** When you `docker rm` a container, the volume survives. This is why recreating the container to change the image doesn't lose your data.

### Common commands

```bash
docker ps                                              # list running containers
docker ps -a                                           # list all containers
docker start vault-postgres                            # start
docker stop vault-postgres                             # stop
docker logs -f vault-postgres                          # tail logs
docker exec -it vault-postgres psql -U vault -d vault  # open Postgres shell
docker exec vault-postgres psql -U vault -d vault \
  -c "SELECT count(*) FROM alerts;"                    # run a SQL command
docker volume ls                                       # list volumes
docker volume rm vault-postgres-data                   # DANGER: deletes all DB data
```

### Why no Docker in production?

Vercel, Railway, and Neon each abstract away container management. You push source code; they handle the runtime. Docker is only needed locally to get a Postgres + pgvector instance running with a single command.
