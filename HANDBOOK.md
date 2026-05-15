# Vault Navigator — Engineering Handbook

A living manual for local development and production deployment.

**Project state at time of writing**: end of Day 20. The LangGraph agent has short-term memory (`PostgresSaver`) and long-term memory (`PostgresStore` with `pgvector`). The graph topology is still the Day-19 single tool loop. Days 21-22 will land parallel-prep nodes, four specialised subgraphs, real HITL via `interrupt()`, and token streaming — those sections in this handbook are marked **🚧 Day 21/22** and should be filled in when those days complete.

---

## Table of Contents

- [Project at a Glance](#project-at-a-glance)
- [Part 1: Local Development](#part-1-local-development)
  - [1.1 Prerequisites](#11-prerequisites)
  - [1.2 First-time Setup](#12-first-time-setup)
  - [1.3 Daily Development Loop](#13-daily-development-loop)
  - [1.4 Verification Scripts](#14-verification-scripts)
  - [1.5 Smart Contract Workflow](#15-smart-contract-workflow)
- [Part 2: Production Deployment (Vercel)](#part-2-production-deployment-vercel)
  - [2.1 Deployment Architecture](#21-deployment-architecture)
  - [2.2 Step 1 — Provision Postgres on Neon](#22-step-1--provision-postgres-on-neon)
  - [2.3 Step 2 — Verify Hosted DB Locally](#23-step-2--verify-hosted-db-locally)
  - [2.4 Step 3 — Deploy Ponder Indexer on Railway](#24-step-3--deploy-ponder-indexer-on-railway)
  - [2.5 Step 4 — Deploy Frontend + Agent on Vercel](#25-step-4--deploy-frontend--agent-on-vercel)
  - [2.6 Step 5 — Production Smoke Test](#26-step-5--production-smoke-test)
- [Part 3: Environment Variables Reference](#part-3-environment-variables-reference)
- [Part 4: Operations](#part-4-operations)
- [Part 5: Troubleshooting](#part-5-troubleshooting)
- [Part 6: Architecture Decisions](#part-6-architecture-decisions)
- [Appendix: Docker Primer for Non-Docker Users](#appendix-docker-primer-for-non-docker-users)

---

## Project at a Glance

Vault Navigator is a DeFi yield navigator with an AI strategy advisor. The user deposits USDC into a `VaultV3` contract on Base or Arbitrum, the vault routes funds to Aave V3 via an `AaveStrategy`, and a LangGraph-powered AI agent advises on yield, migration, and alerts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

  Browser (RainbowKit + wagmi)
        │
        │  HTTPS + SSE
        ▼
  ┌──────────────────────────────────────────────────────────┐
  │  Next.js App  (Vercel)                                    │
  │                                                            │
  │   Pages, components ───────────────────────┐              │
  │                                              │              │
  │   /api/chat, /api/chat/stream  ──→ LangGraph Agent        │
  │   /api/chat/resume (Day 22)         │                      │
  │   /api/vault-context                │                      │
  └─────────────────────────────────────┼──────────────────────┘
                                         │
        ┌────────────────────────────────┼──────────────────────────────┐
        │                                 │                              │
        ▼                                 ▼                              ▼
  ┌───────────────┐              ┌──────────────────┐         ┌──────────────────┐
  │ Postgres      │              │ Ponder GraphQL   │         │ LLM Endpoints    │
  │ (Neon)        │              │ (Railway)        │         │ (third-party)    │
  │               │              │                  │         │                  │
  │ - checkpoints │              │ Indexes VaultV3  │         │ chat: aicodewith │
  │ - store +     │              │ events on Base   │         │ embed: aigcbest  │
  │   pgvector    │              └──────────────────┘         └──────────────────┘
  │ - alerts      │                       │
  │ - conversations│                       │
  └───────────────┘                       ▼
                                  ┌──────────────────┐
                                  │ Base + Arbitrum  │
                                  │ (Alchemy RPC)    │
                                  │                  │
                                  │ VaultV3,         │
                                  │ AaveStrategy,    │
                                  │ Aave V3 Pool     │
                                  └──────────────────┘
```

| Layer | Tech | Where it runs (prod) |
|---|---|---|
| Smart contracts | Solidity + Foundry | Base mainnet (8453), Arbitrum mainnet (42161) |
| Frontend + Agent | Next.js 15, wagmi, viem, RainbowKit, LangGraph | Vercel (Node serverless) |
| Long-term memory | LangGraph `PostgresStore` + `pgvector` | Neon Postgres |
| Short-term memory | LangGraph `PostgresSaver` | Same Neon Postgres |
| Event indexer | Ponder | Railway (Node process) |
| LLM (chat) | OpenAI-compatible proxy (aicodewith) | External |
| LLM (embeddings) | OpenAI-compatible proxy (aigcbest) | External |

---

## Part 1: Local Development

### 1.1 Prerequisites

Install once per machine:

| Tool | Version | Why |
|---|---|---|
| Node.js | ≥ 18.18 (recommended 20.x) | Next.js, Ponder runtime |
| pnpm or npm | latest | Frontend uses npm; Ponder uses pnpm |
| Docker Desktop | latest | Runs the local Postgres + pgvector container |
| Foundry | latest (`curl -L https://foundry.paradigm.xyz \| bash`) | Smart contract dev, fork tests |
| Git | any | Source control |

Optional but recommended:

| Tool | Why |
|---|---|
| psql client (`brew install libpq`) | Inspect the database from the CLI |
| `jq` | Pretty-print JSON when debugging API responses |
| VS Code with Solidity extension | Contract editing with syntax highlighting |

---

### 1.2 First-time Setup

#### Step 1 — Clone and install

```bash
git clone <repo-url> web3-projects
cd web3-projects

# Frontend
cd frontend && npm install && cd ..

# Ponder indexer
cd ponder-indexing && pnpm install && cd ..

# Foundry (contracts)
forge install
```

#### Step 2 — Start the local Postgres container

The project uses Postgres 16 with the `pgvector` extension. Use the pre-baked image — **do not** use stock `postgres:16` (it doesn't ship `pgvector`).

```bash
docker run --name vault-postgres \
  -e POSTGRES_USER=vault \
  -e POSTGRES_PASSWORD=vault \
  -e POSTGRES_DB=vault \
  -p 5432:5432 \
  -v vault-postgres-data:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg16
```

What this does:
- Creates a container named `vault-postgres` running on port 5432
- Creates a named volume `vault-postgres-data` for persistent storage
- The `pgvector/pgvector:pg16` image is identical to `postgres:16` but with the `vector` extension binaries pre-installed

The application will run `CREATE EXTENSION IF NOT EXISTS vector` automatically when it boots (see `frontend/lib/agent/db.ts` → `setupTables()`). No manual SQL needed for fresh setups.

Verify it's running:

```bash
docker ps | grep vault-postgres
docker exec vault-postgres pg_isready -U vault -d vault
```

> See [Appendix: Docker Primer](#appendix-docker-primer-for-non-docker-users) if any of this is unfamiliar.

#### Step 3 — Create env files

**`frontend/.env.local`** (server-side secrets, never committed):

```bash
cp frontend/.env.example frontend/.env.local
# Then fill in real values — see Part 3 for what each variable does.
```

Minimum needed for local dev:

```bash
# Local Postgres (matches the docker run command above)
DATABASE_URL=postgresql://vault:vault@localhost:5432/vault

# Chat LLM
OPENAI_API_KEY=sk-...
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_MODEL=gpt-4o

# Embeddings LLM (must support text-embedding-3-small)
OPENAI_EMBEDDINGS_API_KEY=sk-...
OPENAI_EMBEDDINGS_API_BASE_URL=https://api.openai.com/v1

# Chain config
NEXT_PUBLIC_CHAIN=base
NEXT_PUBLIC_APP_URL=http://localhost:3000

# RPCs — use your Alchemy/Infura keys
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY

# Deployed vault addresses (these are live — see DEPLOYED_ADDRESSES.md)
NEXT_PUBLIC_BASE_VAULT_ADDRESS=0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66
NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS=0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66

# Ponder GraphQL (local)
PONDER_GRAPHQL_URL=http://localhost:42069/graphql

# Optional observability
LANGSMITH_TRACING=false
```

**`ponder-indexing/.env.local`**:

```bash
DATABASE_URL=postgresql://vault:vault@localhost:5432/vault
PONDER_RPC_URL_8453=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

> **Heads up**: Ponder writes to the same Postgres database as the agent. They share a connection string but use different table namespaces.

**Root `.env`** (only needed if you intend to redeploy contracts):

```bash
PRIVATE_KEY=0x...                              # deployer wallet
BASE_RPC_URL=...
ARBITRUM_RPC_URL=...
BASESCAN_API_KEY=...
ARBISCAN_API_KEY=...
```

#### Step 4 — Start everything

Open three terminal tabs:

**Tab 1 — Frontend**
```bash
cd frontend
npm run dev
# → http://localhost:3000
```

**Tab 2 — Ponder indexer**
```bash
cd ponder-indexing
pnpm run dev
# → http://localhost:42069/graphql
```

**Tab 3 — Anvil (only when running local contract tests)**
```bash
anvil
# → http://localhost:8545
```

#### Step 5 — Open in browser

Visit http://localhost:3000, connect a wallet via RainbowKit, switch to Base or Arbitrum mainnet (whichever matches `NEXT_PUBLIC_CHAIN`), and try a message in the AI panel. Expected flow:

1. First request boots the agent (slow — `PostgresSaver.setup()` and `PostgresStore.setup()` run migrations the first time)
2. Subsequent requests are fast
3. The agent should respond with a JSON intent

---

### 1.3 Daily Development Loop

After first-time setup, the daily routine is:

```bash
# Start Postgres (only needed after a host reboot)
docker start vault-postgres

# Frontend (auto-reloads on file change)
cd frontend && npm run dev

# Ponder (auto-reloads on schema/handler change)
cd ponder-indexing && pnpm dev
```

Stop everything:

```bash
# Frontend / Ponder: Ctrl+C
docker stop vault-postgres
```

#### Type-checking

```bash
cd frontend && npx tsc --noEmit
cd ponder-indexing && pnpm typecheck
```

#### Linting

```bash
cd frontend && npm run lint
cd ponder-indexing && pnpm lint
```

---

### 1.4 Verification Scripts

Two throwaway scripts live in `frontend/scripts/` to validate the agent stack without booting the full app. Use these after any significant change to `lib/agent/`:

**Vector memory smoke test**
```bash
cd frontend
npx tsx --env-file=.env.local scripts/verify-store.ts
```

Exercises `PostgresStore.put()` + semantic `search()` end-to-end. Confirms the embeddings endpoint is reachable, `pgvector` is loaded, and the namespace isolation is intact.

**Agent regression test**
```bash
cd frontend
npx tsx --env-file=.env.local scripts/verify-agent.ts
```

Builds the agent and invokes it with a knowledge question. Validates state shape after schema changes.

Both scripts exit non-zero on failure and are safe to wire into CI.

---

### 1.5 Smart Contract Workflow

The contracts are already deployed to mainnet (see `DEPLOYED_ADDRESSES.md`). Most days you don't touch them. When you do:

```bash
# Compile + test
forge build
forge test -vv

# Fork tests (real Aave + USDC on a forked mainnet)
forge test --match-path test/ForkBase.t.sol --fork-url $BASE_RPC_URL -vv
forge test --match-path test/ForkArbitrum.t.sol --fork-url $ARBITRUM_RPC_URL -vv

# Deploy (only if redeploying — usually you don't)
forge script script/Deploy.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

If you redeploy:
1. Update `NEXT_PUBLIC_BASE_VAULT_ADDRESS` (or arbitrum) in `frontend/.env.local`
2. Update `ponder-indexing/ponder.config.ts` (`contracts.VaultV3.address` and `startBlock`)
3. Wipe Ponder's indexed data: `docker exec vault-postgres psql -U vault -d vault -c "DROP TABLE IF EXISTS _ponder_meta, _ponder_checkpoint, _reorg__vault_activity, vault_activity CASCADE;"` then restart Ponder

---

## Part 2: Production Deployment (Vercel)

### 2.1 Deployment Architecture

In production, **no Docker is involved**. The local Docker container is purely a development convenience.

| Component | Hosting | Why |
|---|---|---|
| Frontend + Agent | Vercel | Built-in Next.js runtime, serverless functions for `/api/*` |
| Postgres + pgvector | Neon (or Supabase) | Hosted Postgres with `pgvector` enabled out of the box |
| Ponder indexer | Railway (or Render / Fly.io) | Long-running Node process; not a fit for serverless |
| LLM endpoints | External providers | Already external during dev |

There are no Dockerfiles in the production path. Vercel builds Next.js using its own runtime. Railway builds Node apps from `package.json`. Neon provisions Postgres for you. You manage all three through their dashboards.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PRODUCTION                                  │
│                                                                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │   Vercel     │    │   Railway    │    │     Neon     │         │
│   │              │    │              │    │              │         │
│   │ Next.js app  │───→│ Ponder       │───→│ Postgres +   │         │
│   │ /api routes  │    │ indexer      │    │ pgvector     │         │
│   │ LangGraph    │────┼──────────────┼───→│ checkpoints  │         │
│   │ agent        │    │              │    │ store        │         │
│   └──────────────┘    └──────────────┘    └──────────────┘         │
│        │                                                             │
│        │                                                             │
│        ▼                                                             │
│   ┌──────────────────────────────────────────┐                      │
│   │ LLM proxies (chat + embeddings)          │                      │
│   │ Alchemy (Base + Arbitrum RPC)            │                      │
│   └──────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### About Vercel's serverless timeouts

Vercel's hobby plan caps function execution at **10 seconds**. LangGraph agent calls with tool use regularly take 5-15s. Two paths to handle this:

| Path | Cost | Trade-off |
|---|---|---|
| **Vercel Pro** | $20/month | Function timeout becomes 60s. Reliable. Recommended for interview demos. |
| **Streaming-only** | Free | Use `/api/chat/stream` exclusively; the streaming endpoint isn't capped the same way because Vercel measures time-to-first-byte, not total duration. Requires Day 22 work to ship. |

---

### 2.2 Step 1 — Provision Postgres on Neon

Why Neon: serverless Postgres, `pgvector` enabled by default, free tier (0.5 GB storage), zero ops.

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project called `vault-agent`
3. Region: pick the same region as where Vercel will deploy your frontend (Vercel defaults to `iad1` US-East; choose Neon's US-East accordingly)
4. Postgres version: 16
5. Verify `pgvector` is enabled:
   - Open the SQL editor in Neon dashboard
   - Run: `SELECT * FROM pg_available_extensions WHERE name = 'vector';`
   - Should return one row
6. Copy the connection string from the Neon dashboard. Looks like:
   ```
   postgresql://vault-agent_owner:<password>@ep-xxxxx.us-east-2.aws.neon.tech/vault-agent?sslmode=require
   ```

> If you prefer Supabase: same idea. In Supabase dashboard, go to Database → Extensions → enable `vector`. Copy the connection string from Project Settings → Database → Connection String → URI.

---

### 2.3 Step 2 — Verify Hosted DB Locally

Before deploying anything, prove the hosted DB works end-to-end with your code. This avoids debugging in production.

```bash
# Temporarily point local dev at the hosted DB
cd frontend

# Edit .env.local — replace DATABASE_URL with the Neon URL
# DATABASE_URL=postgresql://...neon.tech/vault-agent?sslmode=require

# Run the verification scripts
npx tsx --env-file=.env.local scripts/verify-store.ts
npx tsx --env-file=.env.local scripts/verify-agent.ts
```

Both should pass. The store smoke test creates and queries embeddings against the hosted DB; the agent test confirms the full graph runs.

After this passes, swap `DATABASE_URL` back to your local Docker URL so you can keep developing.

---

### 2.4 Step 3 — Deploy Ponder Indexer on Railway

Why Railway: simple Git-push deploys, supports long-running Node processes, $5/month for small services.

1. Sign up at [railway.app](https://railway.app), link your GitHub account
2. Create a new project → Deploy from GitHub repo → select this repo
3. **Important**: in the service settings, set the **root directory to `ponder-indexing`**
4. Set environment variables in the Railway dashboard:
   ```
   DATABASE_URL          = <Neon connection string from Step 1>
   PONDER_RPC_URL_8453   = <your Alchemy Base mainnet URL>
   ```
5. Set the start command to `pnpm start` (this maps to `ponder start` per `ponder-indexing/package.json`)
6. Set the build command to `pnpm install`
7. Deploy
8. Once deployed, generate a public domain in Railway settings — something like `your-ponder-production.up.railway.app`. The GraphQL endpoint is at `/graphql` on that domain.

Verify Ponder is indexing:

```bash
curl https://your-ponder-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ vaultActivitys(limit: 1) { items { id } } }"}'
```

You should see at least one transaction (or an empty `items` if the vault hasn't been used yet).

> **Cost watch**: Ponder issues continuous RPC calls to index events. On Alchemy free tier (300 CU/sec) this is fine for one VaultV3 contract on Base, but if you add Arbitrum indexing too, monitor your Alchemy usage.

---

### 2.5 Step 4 — Deploy Frontend + Agent on Vercel

1. Sign in to [vercel.com](https://vercel.com) with GitHub
2. New Project → Import the repo
3. **Critical settings**:
   - **Root directory**: `frontend` (the repo is a monorepo with multiple top-level subdirs)
   - **Framework Preset**: Next.js (auto-detected after setting root dir)
   - **Node version**: 20.x or 22.x
4. **Before** clicking Deploy, set environment variables. Click "Environment Variables" and add each of these:

```
# Database (hosted Neon)
DATABASE_URL                           = <Neon connection string from Step 1>

# Ponder indexer (deployed in Step 3)
PONDER_GRAPHQL_URL                     = https://your-ponder-production.up.railway.app/graphql

# LLM — chat completions
OPENAI_API_KEY                         = <your chat key>
OPENAI_API_BASE_URL                    = <your chat endpoint>
OPENAI_API_MODEL                       = gpt-4o   (or whichever model)

# LLM — embeddings (separate provider)
OPENAI_EMBEDDINGS_API_KEY              = <your embeddings key>
OPENAI_EMBEDDINGS_API_BASE_URL         = <your embeddings endpoint>

# Chain config
NEXT_PUBLIC_CHAIN                      = base
NEXT_PUBLIC_APP_URL                    = https://<placeholder, set after first deploy>

# RPCs (both NEXT_PUBLIC_* for browser and unprefixed for server)
NEXT_PUBLIC_BASE_RPC_URL               = <Alchemy Base mainnet URL>
NEXT_PUBLIC_ARBITRUM_RPC_URL           = <Alchemy Arbitrum mainnet URL>
BASE_RPC_URL                           = <same as above>
ARBITRUM_RPC_URL                       = <same as above>

# Deployed contract addresses
NEXT_PUBLIC_BASE_VAULT_ADDRESS         = 0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66
NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS     = 0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66

# Observability (off in prod by default)
LANGSMITH_TRACING                      = false
```

5. Click Deploy. Wait for the build to complete (~2-3 minutes the first time).
6. Vercel gives you a URL like `https://your-project.vercel.app`. Update `NEXT_PUBLIC_APP_URL` to that exact URL and trigger a redeploy (Deployments → ⋯ → Redeploy).
   - This matters because some agent tools (`get_market_data`) call `/api/vault-context` via this URL.

---

### 2.6 Step 5 — Production Smoke Test

Open the deployed URL and walk through:

| Check | What to look for |
|---|---|
| Page loads | RainbowKit Connect button visible |
| Wallet connects | Network matches `NEXT_PUBLIC_CHAIN` |
| AI panel responds to "what is USDC?" | Knowledge path, no tool calls, <5s response |
| AI panel responds to "should I invest?" | Yield path with tool calls — this is where Vercel timeout becomes a concern |
| Transaction history loads | Confirms Ponder→Neon→Vercel chain is wired |
| Wallet shows mainnet USDC balance | Confirms RPCs are configured |

**Tail logs as you click**:

- Vercel: Deployments → latest → Functions tab → real-time logs
- Railway: Project → service → Logs tab → real-time logs
- Neon: Project → Monitoring tab → query stats

If something fails, the failure is almost always one of:
1. A missing env var (silent failure, function returns 500)
2. Wrong `NEXT_PUBLIC_APP_URL` (agent tools can't call back to `/api/vault-context`)
3. Function timeout (only on `/api/chat` non-streaming path, hobby plan)

---

## Part 3: Environment Variables Reference

### 3.1 Frontend — Server-side

| Variable | Used by | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | LangGraph agent, alert/conversation tables | `postgresql://user:pass@host/db?sslmode=require` | Single connection string used by both `PostgresSaver` and `PostgresStore` |
| `OPENAI_API_KEY` | Chat LLM calls | `sk-...` | For the chat model the agent uses |
| `OPENAI_API_BASE_URL` | Chat LLM calls | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| `OPENAI_API_MODEL` | Chat LLM calls | `gpt-4o`, `gpt-5.2` | Default fallback in code is `gpt-5.2` |
| `OPENAI_EMBEDDINGS_API_KEY` | Long-term memory embeddings | `sk-...` | Separate from chat — many chat proxies don't host embedding models |
| `OPENAI_EMBEDDINGS_API_BASE_URL` | Long-term memory embeddings | `https://api.openai.com/v1` | Must serve `text-embedding-3-small` (1536 dims) |
| `BASE_RPC_URL` | On-chain reads (vault balances) | `https://base-mainnet.g.alchemy.com/v2/KEY` | Server-side; can match the NEXT_PUBLIC version |
| `ARBITRUM_RPC_URL` | On-chain reads | `https://arb-mainnet.g.alchemy.com/v2/KEY` | Server-side |
| `PONDER_GRAPHQL_URL` | Transaction history tool | `http://localhost:42069/graphql` (local) or `https://...railway.app/graphql` (prod) | |
| `LANGSMITH_TRACING` | LangSmith observability | `false` (prod default) | Set `true` only if you want to log all conversations to LangSmith |
| `LANGSMITH_ENDPOINT` | LangSmith API | `https://api.smith.langchain.com` | |
| `LANGSMITH_API_KEY` | LangSmith API | `lsv2_pt_...` | |
| `LANGSMITH_PROJECT` | LangSmith UI grouping | `web3-vault-agent` | |

### 3.2 Frontend — Browser-exposed (`NEXT_PUBLIC_*`)

These are inlined into the browser bundle. **Never put secrets here.**

| Variable | Used by | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Agent internal HTTP calls | `https://your-app.vercel.app` (prod) | Must be the exact public URL of the deployed app |
| `NEXT_PUBLIC_CHAIN` | Wagmi chain selection | `base` | One of `base`, `arbitrum` |
| `NEXT_PUBLIC_BASE_RPC_URL` | Wagmi client | Alchemy URL | Same as `BASE_RPC_URL` is fine |
| `NEXT_PUBLIC_ARBITRUM_RPC_URL` | Wagmi client | Alchemy URL | Same as `ARBITRUM_RPC_URL` is fine |
| `NEXT_PUBLIC_BASE_VAULT_ADDRESS` | Vault interactions on Base | `0xF0E2...ef66` | From `DEPLOYED_ADDRESSES.md` |
| `NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS` | Vault interactions on Arbitrum | `0xF0E2...ef66` | From `DEPLOYED_ADDRESSES.md` |
| `NEXT_PUBLIC_VAULT_ADDRESS` | Legacy single-chain components | One of the above | Point at whichever chain matches `NEXT_PUBLIC_CHAIN` |
| `NEXT_PUBLIC_USDT_ADDRESS` | Legacy components | USDC contract on selected chain | Despite the name, this is a USDC address now |
| `NEXT_PUBLIC_ALCHEMY_RPC_URL` | Legacy Sepolia hook | Sepolia Alchemy URL | Only used by one stale hook; remove if/when that hook is cleaned up |

### 3.3 Ponder Indexer

| Variable | Used by | Example |
|---|---|---|
| `DATABASE_URL` | Ponder's internal SQL writer | Same Postgres as the agent |
| `PONDER_RPC_URL_8453` | Base mainnet event subscription | `https://base-mainnet.g.alchemy.com/v2/KEY` |

### 3.4 Smart Contract Deployment (root `.env`)

Only needed if you intend to redeploy contracts. Not part of the runtime stack.

| Variable | Used by |
|---|---|
| `PRIVATE_KEY` | Forge deployer wallet |
| `BASE_RPC_URL` / `ARBITRUM_RPC_URL` | Forge `--rpc-url` |
| `BASESCAN_API_KEY` / `ARBISCAN_API_KEY` | Forge `--verify` |
| `DEPLOYER_PRIVATE_KEY`, `SEPOLIA_RPC_URL`, etc. | Legacy testnet deploys |

---

## Part 4: Operations

### 4.1 Database Backups

**Neon**: Point-in-time recovery is included on paid plans (free tier has 7-day history). Verify your retention window in the project settings.

**Local Docker**: Snapshots aren't automatic. For dev data you care about:

```bash
# Backup
docker exec vault-postgres pg_dump -U vault -d vault > vault-backup-$(date +%Y%m%d).sql

# Restore
docker exec -i vault-postgres psql -U vault -d vault < vault-backup-YYYYMMDD.sql
```

### 4.2 Monitoring & Logs

| Surface | Where |
|---|---|
| Vercel function logs | Vercel dashboard → Project → Deployments → latest → Functions |
| Railway logs | Railway dashboard → service → Logs |
| Neon query stats | Neon dashboard → Monitoring |
| LangSmith traces (opt-in) | smith.langchain.com — enable via `LANGSMITH_TRACING=true` |
| RPC usage | Alchemy dashboard → Compute Units chart |

### 4.3 Key Rotation

When rotating an API key (LLM provider, Alchemy, Neon password):

1. Update the value in `.env.local` (local)
2. Update the same var in Vercel (Settings → Environment Variables → Edit)
3. Update the same var in Railway (service → Variables → Edit)
4. Trigger a redeploy in Vercel (and Railway if Ponder uses the rotated key)
5. Verify the old key is no longer accepted at the provider end

Never commit keys. `frontend/.env.local`, `ponder-indexing/.env.local`, and root `.env` are all gitignored — keep it that way.

### 4.4 Updating Vault Contract Addresses

If new vault versions are deployed:

1. Update `DEPLOYED_ADDRESSES.md` with new addresses + block numbers
2. Update `NEXT_PUBLIC_BASE_VAULT_ADDRESS` / `NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS` in Vercel
3. Update `ponder-indexing/ponder.config.ts` → `contracts.VaultV3.address` and `startBlock`
4. Reset Ponder's indexed data on the production DB:
   ```sql
   -- Connect to Neon via psql
   DROP TABLE IF EXISTS _ponder_meta, _ponder_checkpoint, _reorg__vault_activity, vault_activity CASCADE;
   ```
5. Redeploy Vercel (frontend) and Railway (Ponder)

---

## Part 5: Troubleshooting

### Frontend won't connect to Postgres

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:5432` on local; `Error: getaddrinfo ENOTFOUND` on prod.

**Local**: `docker ps` — is `vault-postgres` running? If not: `docker start vault-postgres`. Check `DATABASE_URL` in `.env.local` matches `postgresql://vault:vault@localhost:5432/vault`.

**Production**: `DATABASE_URL` is missing `?sslmode=require` (Neon requires it). Or the Vercel env var has a typo. Open Neon dashboard, copy the connection string fresh, paste into Vercel, redeploy.

### "extension 'vector' is not available" on local

You started Postgres with the wrong image. Fix:

```bash
docker stop vault-postgres
docker rm vault-postgres
# (volume vault-postgres-data is preserved — your data survives)
docker run --name vault-postgres \
  -e POSTGRES_USER=vault -e POSTGRES_PASSWORD=vault -e POSTGRES_DB=vault \
  -p 5432:5432 \
  -v vault-postgres-data:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg16
```

### Embeddings call returns "model does not exist"

Your chat proxy doesn't host `text-embedding-3-small`. Set `OPENAI_EMBEDDINGS_API_KEY` and `OPENAI_EMBEDDINGS_API_BASE_URL` to a provider that does (real OpenAI, or another OpenAI-compatible proxy that ships embedding models).

### Vercel function timed out

The non-streaming `/api/chat` route exceeded 10 seconds (hobby plan). Two fixes:
- Upgrade to Vercel Pro for 60-second timeouts
- Use `/api/chat/stream` instead (built on Day 18, expanded on Day 22)

### "process is not defined" or wagmi error on production load

A `NEXT_PUBLIC_*` variable used by browser code is missing in Vercel. Check Vercel → Settings → Environment Variables that all `NEXT_PUBLIC_*` vars in this handbook's Part 3.2 are set.

### Wallet connects but vault balance is 0

Wrong vault address for the active chain, OR the user has no deposits. Check:
- `NEXT_PUBLIC_BASE_VAULT_ADDRESS` matches `DEPLOYED_ADDRESSES.md`
- MetaMask is on the same chain as `NEXT_PUBLIC_CHAIN`
- Wallet has prior deposits — check on BaseScan / Arbiscan

### Ponder shows no transactions

- Has Ponder caught up to the chain head? Check Railway logs — Ponder logs `block X of Y synced`.
- Is `PONDER_RPC_URL_8453` pointing at a working Alchemy endpoint?
- Is `startBlock` in `ponder.config.ts` before the first vault transaction? If too late, you'll miss history. Adjust and restart.

---

## Part 6: Architecture Decisions

Why each major choice was made. Useful for reviewers and for future Murphy who forgets.

### Postgres + pgvector instead of Pinecone / Weaviate

The agent already needed Postgres for `PostgresSaver` checkpoints (LangGraph short-term memory) and the alerts table. Adding `pgvector` keeps everything in one database, simplifies backups, and saves on vendor sprawl. The trade-off: pgvector is slower than purpose-built vector DBs at >10M vectors. For a portfolio project, this isn't a concern.

### LangGraph instead of raw OpenAI function calling

LangGraph gives state persistence, deterministic graph topology, and built-in HITL via `interrupt()`. The cost is one more abstraction layer, but the benefit is that the architecture is recognisable to anyone who has read the official docs — important for interview demos.

### Vercel instead of self-hosted Next.js

Zero-config Next.js deployment, automatic SSL, edge caching, decent free tier. The cold-start downside is real for the agent, but the alternative (managing a VPS) is significantly more work for a portfolio project. Once the project graduates to "real users", reconsider.

### Neon instead of Supabase

Both work. Neon is chosen because the agent doesn't need Supabase's auth/storage/realtime features, and Neon's branching feature is useful for testing schema changes safely. Either is fine — both ship pgvector.

### Ponder instead of The Graph

TypeScript-native, faster iteration, no AssemblyScript. Good fit for a TypeScript-heavy stack. The Graph is more battle-tested at scale.

### Two LLM providers (split chat + embeddings)

Some third-party OpenAI-compatible proxies serve only chat or only embeddings. Splitting the env config means each capability can point at whichever endpoint actually works, without coupling them.

---

## 🚧 Day 21/22 Sections — Fill in when complete

> The following sections are placeholders for work in Days 21-22. Fill these in as those days complete so the handbook stays current.

### 🚧 Day 21 — Parallel Prep + Router + Subgraphs

Once Day 21 lands, document:

- **New nodes**: `fetchMarket`, `loadMemory`, `checkAlerts`, `router`, `consolidateMemory`
- **New subgraphs**: `yield`, `migration`, `alert`, `knowledge`
- **System prompts**: split into 6 (`YIELD_PROMPT`, `MIGRATION_PROMPT`, `ALERT_PROMPT`, `KNOWLEDGE_PROMPT`, `ROUTER_PROMPT`, `EXTRACTION_PROMPT`)
- **How memory facts are injected into prompts** — system prompt template, `{memoryFacts}` substitution
- **Routing logic** — which user inputs map to which subgraph
- **Memory write timing** — hot-path extraction at the end of every turn

Update Part 3.1 (env vars) if new ones are introduced.

### 🚧 Day 22 — Real HITL + Multi-mode Streaming

Once Day 22 lands, document:

- **New route**: `POST /api/chat/resume` — request/response shape, how it pairs with `interrupt()`
- **Multi-mode streaming**: `streamMode: ['updates', 'messages', 'custom']` — SSE event types
- **Frontend risk modal**: where the modal lives, what it shows, how it calls `/api/chat/resume`
- **HITL resume after server restart**: how thread state survives via `PostgresSaver`
- **Vercel timeout strategy**: confirm streaming mode bypasses the 10s limit; document any edge cases
- **Update Part 2.1 / 2.6**: change the recommendation from "Vercel Pro OR streaming-only" to whichever Day 22 settles on

---

## Appendix: Docker Primer for Non-Docker Users

If you've never used Docker, here's the minimum to operate this project.

### Mental model

```
Image        = a snapshot of a filesystem + a default command to run
               (e.g. "pgvector/pgvector:pg16" is Postgres + pgvector pre-installed)

Container    = a running instance of an image
               (e.g. "vault-postgres" is the running process)

Volume       = persistent disk attached to a container
               (e.g. "vault-postgres-data" holds the actual database files)
```

Containers are disposable. **Volumes are precious.** When you `docker rm` a container, only the running process dies — the volume survives and can be attached to a new container.

This is why our migration from `postgres:16` → `pgvector/pgvector:pg16` was zero-data-loss: we deleted the container, kept the volume, started a new container that mounted the same volume.

### Common commands

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Start / stop our Postgres container
docker start vault-postgres
docker stop vault-postgres

# Tail logs from the container
docker logs -f vault-postgres

# Open a Postgres shell inside the container
docker exec -it vault-postgres psql -U vault -d vault

# Run a one-off SQL command
docker exec vault-postgres psql -U vault -d vault -c "SELECT count(*) FROM alerts;"

# List volumes
docker volume ls

# Inspect a volume (shows mount point — usually under /var/lib/docker/volumes/)
docker volume inspect vault-postgres-data

# DANGER — delete a volume (data loss!)
docker volume rm vault-postgres-data
```

### When you'd want to recreate the container

- Image change (like our pgvector migration)
- Container is in a wedged state and won't start
- You want to change port mapping or env vars

### When you'd NEVER want to delete the volume

- Unless you specifically want to wipe the database to a fresh state
- Always `pg_dump` a backup first if you're unsure

### Why not Docker in production?

Vercel and Railway abstract away container management. You upload Node source code, they run it on their infrastructure. The agent runs as serverless functions on Vercel, Ponder runs as a long-running process on Railway, Postgres runs as a managed database on Neon. **None of these need you to write a Dockerfile or run a container.**

Docker stays useful for local development because it gives you a Postgres + pgvector setup with one command, identical across teammates and CI.

---

## Document Maintenance

| Last reviewed | Day completed | Notes |
|---|---|---|
| Day 20 | ✅ Long-term memory foundation | Initial handbook draft. Day 21/22 sections marked as placeholders. |
| Day 21 | 🚧 Parallel prep + subgraphs | _Fill in when complete: new routes, prompt files, subgraph structure_ |
| Day 22 | 🚧 HITL + streaming | _Fill in when complete: resume endpoint, multi-mode SSE, modal UI_ |

When updating, also update:
- `README.md` if architecture overview changes
- `DEPLOYED_ADDRESSES.md` if new contracts deploy
- `summary-report/DAYN_COMPLETE.md` for the corresponding day's narrative
