# Stage 5 — USDC Vault Console

**Status:** In progress

**Release/base branch:** `stage-5`

**Current work branch:** `test/v4-rounding`

**Target release:** `v0.5.0`

**Live target:** Base only

**Fork evidence target:** Base and Arbitrum at pinned blocks

**Contract target:** `VaultV4`

## Product Goal

Ship a transparent interface for depositing into and operating an ERC-4626 USDC vault backed by Aave, with evidence-grounded explanations of positions, liquidity, and deposit/withdraw transactions.

Stage 5 is not a yield aggregator, optimizer, or cross-chain navigator.

## Release Rules

- Base is the only runtime and deployment chain.
- Arbitrum is fork-test evidence only.
- The vault accepts Base native USDC only.
- One Aave V3 strategy is supported.
- The live deployment is a low-value, unaudited canary; it must not solicit public funds.
- Runtime code must resolve addresses from one deployment manifest. No V3 or environment fallback is allowed.
- Core on-chain reads and writes must work without an activity-history database or AI provider; SIWE session storage is a separate boundary.
- AI is read-only. It cannot construct, populate, recommend, or execute financial actions.
- Every behavior-changing change follows `Reason -> Predict -> Patch -> Prove -> Retell`.

## Lean V4 Policy

Stage 5 removes or defers these V4 policy features:

- [x] Remove performance-fee state and fee-share minting from `VaultV4`.
- [x] Remove large-withdrawal request and approval from `VaultV4`.
- [x] Remove blacklist state and blacklist-based share-transfer restrictions from `VaultV4`.

Stage 5 keeps:

- ERC-4626 asset/share accounting.
- `DEFAULT_ADMIN_ROLE` for role administration and safe strategy configuration.
- `MANAGER_ROLE` for pause and unpause.
- `OPERATOR_ROLE` for invest and divest.
- `TREASURER_ROLE` for the canary deposit cap.
- A cap of `0` closes deposits/mints; max uint is explicit test/local unlimited; finite caps use raw USDC units and `totalAssets()` headroom.
- Explicit idle-liquidity withdrawal semantics.
- Emergency strategy recovery.

## Stage 5.0 — Repository Baseline

- [x] Verify `stage-4` is exactly one commit ahead of its remote with no divergence.
- [x] Push the Stage 4 commit.
- [x] Create and push `stage-4-snapshot-2026-08-30`.
- [x] Create and publish `stage-5` from the exact Stage 4 snapshot.
- [x] Import and publish the complete three-commit Ponder history at tip `4fa0054` through subtree merge `fb1df43`.
- [x] Verify the imported `ponder-indexing/` tree matches the preserved tip and contains no nested `.git` directory.
- [x] Replace obsolete README product claims.
- [x] Record the Stage 5 architecture and threat model.
- [x] Commit and push the Stage 5 source-of-truth documents.

The Ponder migration used a verified temporary bundle and annotated nested tag. The published subtree merge is the durable preservation artifact.

## Stage 5.1 — Lean VaultV4 Specification and Corrections

### Accounting and donation safety

- [x] Define the 1-USDC Console minimum and the scoped 49-raw-unit canary rounding-loss bound.
- [x] Implement and prove offset `6` (6-decimal USDC, 12-decimal vault shares).
- [x] Reject every successful nonzero deposit or mint that would produce zero assets/shares.
- [x] Add exact regressions for the historical donation exploit and zero-share boundaries.
- [x] Record no positive attacker return in both exit orders over 10,000 single-victim fuzz cases in the documented domain.
- [x] Derive and test that fixed-state conversions and immediate deposit/mint-to-redeem round trips never create value.
- [x] Derive and test that exhaustive holder claims do not exceed the whole-supply claim or `totalAssets()`.

### Strategy lifecycle

- [x] Block strategy replacement unless the current strategy reports exactly zero `totalAssets()`; a reverting read fails closed.
- [x] Require candidate strategy code plus exact asset and vault bindings.
- [x] Fail Aave strategy construction closed unless vault, token, pool, and resolved aToken are contracts and the aToken reports the expected underlying asset and pool.
- [x] Define strategy `totalAssets()` as idle underlying plus the live aToken balance; keep no internal principal ledger.
- [x] Make emergency recovery idle-first and best-effort; report measured Vault recovery and protocol-path status, and preserve residual positions for retry and replacement blocking.
- [x] Treat Vault token-balance deltas as authoritative for invested, divested, and emergency amounts; emit requested and actual amounts where applicable.
- [x] Demonstrate with unequal holders that a simulated aToken-balance loss reduces share value and allocates claim loss proportionally without changing share balances.

### ERC-4626 and operational consistency

- [x] Make `maxDeposit` and `maxMint` agree with cap, pause, and zero-share acceptance state.
- [x] Make `maxWithdraw` and `maxRedeem` agree exactly with the declared idle-liquidity and pause policy.
- [x] Verify every successful deposit, mint, withdraw, and redeem returns the immediate pre-call preview result when accounting state is unchanged; previews remain policy-agnostic quotes.
- [x] Fix the slippage regression so it reaches the operator-only divest path.
- [x] Define and test paused-state deposit, mint, withdraw, redeem, invest, divest, share-transfer, and emergency behavior.
- [x] Remove fee, large-withdrawal, and blacklist ABI/events from `VaultV4` and remove active-feature claims from Stage 5 docs.

## Stage 5.2 — Contract Evidence

- [x] Exact-value unit and regression tests are green.
- [x] Fuzz tests cover the exact adjacent deposit/mint/withdraw/redeem rounding boundaries over seeded and donated exchange rates.
- [x] Stateful invariants cover multiple users, donations, yield, loss, invest, and divest.
- [x] Strategy failure, slippage, loss, emergency recovery, and replacement tests are green.
- [ ] Base fork tests instantiate V4 and use a pinned block.
- [ ] Arbitrum fork tests instantiate V4 and use a pinned block.
- [ ] Fork tests validate expected pool, USDC, and aToken code/configuration.
- [ ] `forge fmt --check` passes.
- [x] Slither has no untriaged High or Medium findings.
- [x] Manual threat-model review is recorded.
- [x] No known Critical or High contract defect remains.

## Stage 5.3 — Base Deployment and Manifest

- [ ] Deployment script rejects live chains other than Base `8453`.
- [ ] Local and fork deployment paths are separate from live broadcast.
- [ ] Deployment starts with a conservative cap and safe configuration.
- [ ] Post-deployment script verifies asset, strategy, pool, aToken, roles, cap, pause state, and bytecode.
- [ ] Exact deployment is dry-run on a pinned Base fork.
- [ ] Create `stage-5-rc.1` only after deterministic and fork gates pass.
- [ ] Obtain explicit user approval immediately before live broadcast.
- [ ] Deploy and verify a low-value Base canary.
- [ ] Complete approve -> deposit -> invest -> divest -> withdraw with personal funds.
- [ ] Observe the canary for 24–48 hours.
- [ ] Publish one Base V4 deployment manifest with source commit, addresses, deployment block, and explorer links.

## Stage 5.4 — Base Product Vertical Slice

### Public view

- [ ] Show total, idle, and Aave-deployed USDC.
- [ ] Show share price, cap, pause status, verified addresses, and data block.
- [ ] Format USDC/cap values with 6 decimals and vault-share values with 12 decimals from validated metadata.
- [ ] Render cap `0` as deposits closed and max uint as explicit unlimited; never label zero unlimited.
- [ ] Show explicit unaudited-canary and additional-trust disclosures.

### Depositor view

- [ ] Connect on Base and authenticate with SIWE.
- [ ] Show wallet USDC, vault shares, redeemable assets, and currently withdrawable assets.
- [ ] Simulate and execute approval plus deposit.
- [ ] Simulate and execute withdrawal.
- [ ] Show submitted, confirmed, and failed transaction states with explorer links; expose confirmed activity separately.
- [ ] Handle wrong network, insufficient balance, insufficient allowance, cap, pause, and insufficient idle liquidity.

### Operator view

- [ ] Keep operations separate from the depositor interface.
- [ ] Verify `OPERATOR_ROLE` on-chain.
- [ ] Show the post-action liquidity effect before invest/divest.
- [ ] Simulate and execute invest.
- [ ] Simulate and execute divest with explicit `minAmountOut`.
- [ ] Do not expose strategy replacement or role administration in the public UI.

### Runtime cleanup

- [ ] Remove deferred fee, large-withdrawal, and blacklist ABI entries, reads, and copy from frontend hooks, components, and prompts.
- [ ] Remove Arbitrum, Sepolia, Anvil, USDT, and V3 runtime fallbacks.
- [ ] Remove LI.FI, migration, destination, APY-comparison, and cross-chain components/routes.
- [ ] Remove Ponder environment variables, GraphQL calls, agent tools, and runtime copy; retain `ponder-indexing/` only as historical Stage 4 source.
- [ ] Remove unused Sui, Solana, BigMI, permit, and multi-chain dependencies.
- [ ] Frontend lint and typecheck pass.
- [ ] Production build completes without requiring a live database and has no hydration or server-side `localStorage` errors.

## Stage 5.5 — Direct V4 Activity Evidence

- [ ] Query only the configured Base V4 contract through a same-origin activity API.
- [ ] Read from the manifest deployment block to one pinned confirmed end block, chunking `eth_getLogs` ranges when required by the RPC provider.
- [ ] Decode Deposit, Withdraw, Invested, Divested, pause, and role-relevant events needed by the UI.
- [ ] Preserve event-specific caller, owner, receiver, strategy, assets, shares, and requested/actual amounts.
- [ ] Derive operator actors from `transaction.from` through transaction/receipt enrichment instead of treating the token or strategy address as the actor.
- [ ] Return the queried block range and explicit complete, partial, or failed status; never turn RPC failure into an empty-history result.
- [ ] Reconcile decoded activity with transaction receipts and explorer evidence in tests.
- [ ] Activity API tests plus frontend typecheck, lint, and build pass without Ponder or an application database.

## Stage 5.6 — Minimum Vault Evidence Explainer

### Supported tasks

- [ ] `Explain my position`.
- [ ] `Explain this deposit or withdrawal transaction`.

### Fixed LangGraph workflow

- [ ] Validate a closed request schema: topic plus optional transaction hash.
- [ ] Bind subject wallet, session, Base chain, and deployment server-side.
- [ ] Pin all position reads to one block or transaction reads to the receipt block.
- [ ] Decode only the configured V4 contract's Deposit/Withdraw evidence.
- [ ] Compute shares, redeemable assets, idle-liquidity constraint, and findings deterministically.
- [ ] Use one LLM node to explain supplied findings.
- [ ] Validate structured output and fall back to deterministic prose on model failure.
- [ ] Render exact values, hashes, blocks, and links from evidence rather than model text.

### Removed agent surface

- [ ] Remove model-callable wallet/chain/address arguments.
- [ ] Remove ReAct tools, routing subgraphs, migration, alerts, memory, checkpointing, HITL, resume, and AI intents.
- [ ] Remove AI-to-form and AI-to-write-hook connections.
- [ ] Remove unvalidated token streaming.
- [ ] Ensure the core vault works without an AI key.

### Explainer tests

- [ ] Anonymous and revoked sessions return `401`.
- [ ] Body-supplied wallet, chain, or contract identity is rejected.
- [ ] Position reads cannot be redirected to another wallet.
- [ ] Unsupported or unrelated transaction hashes fail closed.
- [ ] RPC failure and missing evidence become `unknown`, never fabricated zeroes.
- [ ] Malformed output, timeout, invented values, and action language trigger deterministic fallback.
- [ ] Prompt injection cannot expose another wallet or reach a write path.
- [ ] UI facts remain available when the model is disabled.

## Stage 5.7 — Release and Hiring Package

- [ ] CI blocks on Foundry, frontend, activity-history, and explainer gates.
- [ ] Browser E2E covers one depositor and one operator lifecycle.
- [ ] README accurately describes product, trust assumptions, current deployment, and limitations.
- [ ] Publish architecture, threat model, V3-to-V4 postmortem, and release evidence.
- [ ] Record a 3–4 minute demo with live receipts and deterministic contract evidence.
- [ ] Tag the accepted release `v0.5.0`.
- [ ] Merge `stage-5` into `main` through a PR.
- [ ] Change the GitHub default branch to `main` after release acceptance.

## Explicitly Deferred

- Arbitrum deployment and runtime support.
- Bridging and cross-chain migration.
- APY optimization and additional yield protocols.
- Multiple active strategies and strategy-rotation UI.
- Performance fees, large-withdrawal approval, and blacklist policy.
- Automatic divestment during user withdrawal.
- Upgradeability and V3 user migration.
- Autonomous AI, recommendations, transaction construction, alerts, memory, and HITL.
- Ponder and database-backed activity indexing; reconsider only when event volume, multiple vaults, multi-chain history, or analytics require a persistent read model.
- Permit/gasless deposits and an ERC-4626 slippage router.
- Public TVL, production SLA, external audit, formal verification, bug bounty, token, and DAO.

## Definition of Done

Stage 5 is complete only when:

- One verified Base V4 canary matches the committed manifest and source.
- All deterministic, fuzz, invariant, fork, frontend, activity-history, AI, and E2E release gates are green.
- No known Critical or High accounting, authorization, or funds-at-risk defect remains.
- The product works without an AI provider and the explainer cannot influence financial writes.
- Every public claim is supported by a contract, confirmed log or receipt, or reproducible test artifact.
- Murphy can explain the accounting invariants, strategy trust boundary, SIWE identity boundary, and LLM authority boundary without relying on an AI transcript.

## Implementation Handoff Format

Every behavioral or critical change must be handed off as:

1. Outcome
2. Root reason or trust boundary
3. Changed code path
4. Exact proof and what it demonstrates
5. Remaining limitation
6. 30–60 second interview answer
7. One ownership question
