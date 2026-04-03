# Architecture Checklist

Run this checklist before or during a mission.

## Scope
- Which layer is changing: contract, frontend, API, indexing, deployment, AI, governance?
- Is this a net-new capability, a refactor, or a hardening task?

## State and Flow
- What state is created, mutated, or derived?
- What is the sequence from user action to chain/API side effect to UI refresh?
- Where can timing, stale reads, retries, or race conditions appear?

## Trust Boundaries
- What is trusted: wallet, backend, AI output, contract, indexer, external protocol?
- What must be verified instead of trusted?

## Permissions and Governance
- Who can trigger the action?
- Are there role boundaries, approval flows, or emergency overrides?
- Can the wrong actor escalate privileges or touch funds?

## External Dependencies
- Does this rely on Dify, RPC, Aave, Ponder, MetaMask, or deployment infra?
- What happens when a dependency is slow, wrong, unavailable, or incompatible?

## Funds and Security
- Can user funds move?
- Are checks-effects-interactions, allowance handling, simulation, and failure isolation relevant?
- Does this add new approval surface, signing surface, or admin surface?

## Observability and Validation
- What tests, simulations, logs, or indexed events prove the flow works?
- What user-facing errors should exist?
- What should be measurable in production later?

## Deployment Reality
- Is this local-only, testnet-ready, or production-grade?
- Are addresses, env vars, chain differences, or migration steps involved?
