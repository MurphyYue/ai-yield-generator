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

Base logs -> Ponder -> same-origin activity API -> UI
```

Runtime support is Base-only. Arbitrum is retained only for pinned fork compatibility tests.

## Lean VaultV4

Stage 5 keeps:

- Single-asset ERC-4626 USDC accounting.
- Deposit cap.
- Pause/unpause.
- Role-controlled invest/divest.
- Safe strategy lifecycle and emergency recovery.
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
ponder-indexing/    Base VaultV4 event indexer
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
- Ponder is preserved in the monorepo but remains V3-specific until its Stage 5 rewrite.

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

### Indexer

```bash
cd ponder-indexing
pnpm install
pnpm codegen
pnpm typecheck
pnpm lint
```

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
