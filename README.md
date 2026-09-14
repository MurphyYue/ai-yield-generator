# USDC Vault Console

> Stage 5 in progress: a transparent Base interface for depositing into and operating an ERC-4626 USDC vault backed by Aave, with evidence-grounded position and transaction explanations.

**Current status:** `VaultV4` is under security correction and is not deployed. The existing Base and Arbitrum V3 deployments are legacy references. Do not deposit production funds based on this repository.

## What Stage 5 Is

USDC Vault Console serves two narrow audiences:

- Depositors who need to understand vault shares, redeemable assets, currently withdrawable liquidity, and transaction outcomes.
- Authorized operators who need to inspect and manage idle USDC versus Aave-deployed USDC.

The AI layer is a read-only explainer. On-chain reads and deterministic accounting establish facts; the model only explains those facts.

## What Stage 5 Is Not

- A yield optimizer or aggregator.
- A cross-chain vault or migration product.
- An autonomous financial agent.
- An audited or production-ready protocol.
- A claim that this wrapper is safer or more profitable than using Aave directly.

## Target Architecture

```text
Base wallet
   |
   v
Next.js + wagmi/viem + SIWE
   |                         \
   |                          -> read-only Vault Evidence Explainer
   v
VaultV4 (ERC-4626 USDC)
   |
   v
AaveStrategy -> Base Aave V3 / aUSDC

Base logs + receipts -> same-origin RPC activity API -> UI
```

The Stage 5 runtime target is Base-only. Arbitrum will be retained only as a pinned V4 fork compatibility gate after the fork-suite rewrite.

## Lean VaultV4

Stage 5 keeps:

- Single-asset ERC-4626 USDC accounting.
- Deposit cap.
- Pause/unpause.
- Role-controlled invest/divest.
- Fail-closed strategy configuration, zero-reported-assets replacement gating, and best-effort emergency recovery.
- Explicit idle-liquidity withdrawal behavior.

Stage 5 removes or defers performance fees, large-withdrawal approval, blacklist restrictions, bridging, additional strategies, and automatic AI actions.

## Minimum AI Scope

The Stage 5 explainer supports only:

1. `Explain my position`.
2. `Explain this deposit or withdrawal transaction`.

Wallet identity comes from SIWE. Chain, deployment, and contract identity come from server configuration. The model cannot supply these values, construct calldata, populate transaction forms, or invoke write hooks.

## Repository Layout

```text
contracts/          Solidity vault, strategy, interfaces, and mocks
test/               Foundry unit and fork tests
script/             Deployment and verification scripts
frontend/           Next.js product and read-only explainer
ponder-indexing/    Preserved Stage 4 indexer source; not a Stage 5 runtime dependency
docs/               Stage 5 architecture, threat model, and protocol context
summary-report/     Historical mission reports and V3/V4 analysis
todo.md             Active Stage 5 implementation and release gates
```

## Current Baseline

At the start of Stage 5:

- V4 unit suite: 22 passing, 2 failing.
- Full non-fork local suite: 85 passing, 2 failing.
- One failure demonstrates a real donation/zero-share defect.
- One failure is a test-authority error that does not reach the intended slippage assertion.
- Existing Base and Arbitrum fork suites instantiate V3 and must be rewritten for V4.
- Frontend TypeScript passes; lint and clean-build runtime errors remain.
- Ponder is preserved in the monorepo as Stage 4 history. Stage 5 deliberately uses bounded direct RPC history instead of deploying an indexer or activity-history database.

After the contract-only Lean V4 policy-removal slice on `fix/v4-accounting`:

- V4 unit suite: 16 passing, 1 failing.
- Full non-fork local suite: 79 passing, 1 failing.
- The deleted policy tests account for the lower test count; fewer tests are not evidence of greater safety.
- The slippage-authority regression now reaches and passes the intended operator path.
- The donation/zero-share defect remains deliberately failing until its accounting policy is implemented.
- Frontend runtime integration still uses legacy V3/policy/Ponder surfaces, so this branch is not deployable.

After the fail-closed deposit-cap slice:

- V4 suite: 34 passing, 1 failing.
- Full non-fork suite: 97 passing, 1 failing.
- Three cap properties run with 256 fuzz cases each.
- The only failure remains the named donation/zero-share regression; offset-6 accounting is the next slice.

After the offset-6 donation-safety slice:

- V4 accounting suites: 50 passing, 0 failing at the normal 256 fuzz runs.
- Full non-fork repository suite: 113 passing, 0 failing.
- The historical 1-unit seed / 1,000-USDC donation / 100-USDC victim sequence is an exact regression.
- No profitable single-victim donation attack was observed across 10,000 documented-domain fuzz cases in either exit order.
- The at-least-1-USDC canary rounding bound passes 10,000 fuzzed seed/donation/deposit states.
- Shares now use 12 decimals; frontend formatting remains deliberately blocked for its integration slice.

After the round-trip and aggregate-claims accounting slice:

- V4 accounting suites: 56 passing, 0 failing at the normal 256 fuzz runs.
- Full non-fork repository suite: 119 passing, 0 failing.
- Exact rounding inequalities cover view conversions, immediate deposit/mint-to-redeem cycles, and exhaustive aggregate holder claims.
- Five implementation properties pass 10,000 generated cases each across seeded/donated rates, transfers, and simulated loss.
- These checks establish ownership-accounting bounds; they do not claim that invested assets are immediately withdrawable.

After the withdrawal-limit consistency slice:

- V4 accounting suites: 61 passing, 0 failing at the normal 256 fuzz runs.
- Full non-fork repository suite: 124 passing, 0 failing.
- Under stable accounting reads, `maxRedeem` now reports the exact positive-idle share boundary instead of underestimating it with a down-rounded asset-to-share conversion.
- The withdrawal-limit boundary passes 10,000 generated deposit, allocation, yield, and loss states.
- Pause and zero idle liquidity fail closed; user funds are not advertised as immediately redeemable while they remain invested.

After the fail-closed strategy-lifecycle slice on `fix/v4-strategy`:

- Aave strategy suite: 49 passing, 0 failing.
- Full non-fork repository suite: 159 passing, 0 failing.
- `AaveStrategy` construction rejects missing code, failed reserve lookup, invalid aToken code, and incorrect aToken asset or pool bindings.
- No strategy-principal ledger remains. Strategy assets come from idle underlying plus the live aToken balance.
- Vault-observed token balance deltas are authoritative for invest, divest, and emergency outcomes.
- Emergency recovery is idle-first and best-effort. Its status boolean does not prove complete recovery; residual assets require a fresh strategy read and block replacement when nonzero or unreadable.
- V4 pinned-fork proof, deployment tooling, frontend ABI, and direct activity-history integration remain incomplete, so this branch is not deployable.

After the ERC-4626 operational-consistency slice on `test/v4-consistency`:

- V4 accounting suites: 66 passing, 0 failing at the normal 256 fuzz runs.
- Full non-fork repository suite: 164 passing, 0 failing.
- Deposit, mint, delegated withdraw, and delegated redeem return their immediate pre-call preview values and emit the exact payer/caller, owner, receiver, assets, and shares.
- Pausing now blocks deposit, mint, withdraw, redeem, invest, divest, and every share transfer—including zero-value `transfer` and `transferFrom`—with `Pausable.EnforcedPause`.
- ERC-4626 previews remain policy-agnostic conversion quotes while paused; all four `max*` limits report zero.
- Admin emergency recovery remains callable while paused and does not unpause the Vault.

After the multi-user stateful-invariant slice on `test/v4-invariants`:

- The invariant suite has seven accounting/configuration properties plus one deterministic handler-reachability test, all passing.
- The full non-fork repository suite has 172 passing tests and zero failures.
- Normal runs execute 256 campaigns of 64 actions per invariant (114,688 total handler invocations); the release-strength run executed 1,000 campaigns of 100 actions per invariant (700,000 total), with zero reverts or discards.
- Four tracked users exercise deposit, mint, withdraw, redeem, share transfer, Vault and strategy donations, backed Aave yield, simulated aToken loss, invest, and divest through the full `VaultV4 -> AaveStrategy -> MockAavePool` path.
- Independent ghost state checks managed-asset flow, share mint/burn flow, mock-pool backing, exhaustive holder claims, exact idle-liquidity limits, and physical USDC conservation.
- This is randomized evidence over a bounded local model, not formal verification, a generalized MEV-profit proof, or validation of live Aave behavior; pinned fork tests remain a separate release gate.

After the four-operation rounding-boundary slice on `test/v4-rounding`:

- The accounting-property suite has 10 passing tests, and the full non-fork repository suite has 176 passing tests with zero failures.
- Deposit and redeem are checked as exact floor boundaries; mint and withdraw are checked as exact ceiling boundaries.
- Each property proves the adjacent inverse inequality, executes the operation, and reconciles the exact user, Vault, `totalAssets()`, and `totalSupply()` deltas.
- All four new properties pass 10,000 seeded-and-donated exchange-rate cases without approximate tolerances.

No Stage 5 release claim is valid until the gates in [`todo.md`](./todo.md) pass.

## Development Commands

### Contracts

```bash
forge build
forge test --offline --no-match-contract 'Fork(Base|Arbitrum)Test'
forge fmt --check
```

Fork commands require archive-capable RPC endpoints and will be updated to use explicit block numbers during Stage 5.

### Frontend

```bash
cd frontend
npm install
npm run lint
./node_modules/.bin/tsc --noEmit
npm run build
```

### Historical Ponder prototype

`ponder-indexing/` is retained as Stage 4 source history. It is not installed, deployed, or included in Stage 5 release gates.

## Security and Trust

Read the accepted Stage 5 sources before modifying behavioral code:

- [Stage 5 architecture](./docs/STAGE5_ARCHITECTURE.md)
- [Stage 5 threat model](./docs/STAGE5_THREAT_MODEL.md)
- [Active implementation plan](./todo.md)
- [Historical V3 issues](./summary-report/VAULTV3_ISSUES_REPORT.md)

This repository uses a reason-first implementation protocol:

```text
Reason -> Predict -> Patch -> Prove -> Retell
```

For every critical accounting, authorization, deployment, or AI-boundary change, the code change must be paired with the failure model, invariant, proof, residual limitation, and an interview-ready explanation.

## Release Policy

The first Stage 5 deployment will be a low-value Base canary using personal funds and a conservative cap. Live broadcast requires separate explicit approval after deterministic tests, pinned forks, internal security review, and a reproducible deployment dry run are green.

The release will remain labeled:

> Portfolio canary; not audited; not for production funds.
