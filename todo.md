# Stage 5 — USDC Vault Console

**Status:** In progress

**Active branch:** `stage-5`

**Target release:** `v0.5.0`

**Live target:** Base only

**Fork evidence:** Base and Arbitrum at pinned blocks

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
- The core vault UI must work without a database or AI provider.
- AI is read-only. It cannot construct, populate, recommend, or execute financial actions.
- Every behavior-changing change follows `Reason -> Predict -> Patch -> Prove -> Retell`.

## Lean V4 Policy

Stage 5 removes or defers these V4 policy features:

- [ ] Remove performance-fee state and fee-share minting.
- [ ] Remove large-withdrawal request and approval.
- [ ] Remove blacklist state and share-transfer restrictions.

Stage 5 keeps:

- ERC-4626 asset/share accounting.
- `DEFAULT_ADMIN_ROLE` for role administration and safe strategy configuration.
- `MANAGER_ROLE` for pause and unpause.
- `OPERATOR_ROLE` for invest and divest.
- `TREASURER_ROLE` for the canary deposit cap.
- Explicit idle-liquidity withdrawal semantics.
- Emergency strategy recovery.

## Stage 5.0 — Repository Baseline

- [x] Verify `stage-4` is exactly one commit ahead of its remote with no divergence.
- [x] Push the Stage 4 commit.
- [x] Create and push `stage-4-snapshot-2026-08-30`.
- [x] Tag the nested Ponder repository.
- [x] Create and verify a complete Ponder Git bundle.
- [x] Create and publish `stage-5` from the exact Stage 4 snapshot.
- [x] Import Ponder as normal monorepo history without a nested `.git` directory.
- [x] Replace obsolete README product claims.
- [x] Record the Stage 5 architecture and threat model.
- [ ] Commit and push the Stage 5 source-of-truth documents.

## Stage 5.1 — Lean VaultV4 Specification and Corrections

### Accounting and donation safety

- [ ] Define the supported minimum deposit and maximum acceptable rounding loss.
- [ ] Choose `_decimalsOffset()` from an explicit USDC attack/economic test matrix.
- [ ] Reject every successful nonzero deposit or mint that would produce zero assets/shares.
- [ ] Add a regression proving the historical donation exploit.
- [ ] Prove donation attacker profit is non-positive over fuzzed attacker/victim inputs.
- [ ] Prove asset-share round trips never create value.
- [ ] Prove aggregate redeemable claims do not exceed `totalAssets()` beyond documented rounding.

### Strategy lifecycle

- [ ] Prevent strategy replacement while the current strategy owns assets or tracked principal.
- [ ] Validate that a new strategy uses the vault asset and is bound to this vault.
- [ ] Require Aave configuration to resolve a nonzero aToken.
- [ ] Include idle underlying held by the strategy in strategy assets.
- [ ] Recover both Aave position assets and idle underlying during emergency recovery.
- [ ] Report actual invested/divested amounts in events.
- [ ] Define loss behavior and prove proportional loss allocation.

### ERC-4626 and operational consistency

- [ ] Make `maxDeposit` and `maxMint` agree with cap and pause state.
- [ ] Make `maxWithdraw` and `maxRedeem` agree with idle liquidity and pause state.
- [ ] Verify preview and actual operations agree when state is unchanged.
- [ ] Fix the slippage regression so it reaches the operator-only divest path.
- [ ] Define and test paused-state deposit, mint, withdraw, redeem, invest, divest, share-transfer, and emergency behavior.
- [ ] Remove fee, large-withdrawal, and blacklist ABI/events from contract, frontend, indexer, and docs.

## Stage 5.2 — Contract Evidence

- [ ] Exact-value unit and regression tests are green.
- [ ] Fuzz tests cover deposit/mint/withdraw/redeem rounding boundaries.
- [ ] Stateful invariants cover multiple users, donations, yield, loss, invest, and divest.
- [ ] Strategy failure, slippage, loss, emergency recovery, and replacement tests are green.
- [ ] Base fork tests instantiate V4 and use a pinned block.
- [ ] Arbitrum fork tests instantiate V4 and use a pinned block.
- [ ] Fork tests validate expected pool, USDC, and aToken code/configuration.
- [ ] `forge fmt --check` passes.
- [ ] Slither has no untriaged High or Medium findings.
- [ ] Manual threat-model review is recorded.
- [ ] No known Critical or High contract defect remains.

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
- [ ] Show explicit unaudited-canary and additional-trust disclosures.

### Depositor view

- [ ] Connect on Base and authenticate with SIWE.
- [ ] Show wallet USDC, vault shares, redeemable assets, and currently withdrawable assets.
- [ ] Simulate and execute approval plus deposit.
- [ ] Simulate and execute withdrawal.
- [ ] Show submitted, confirmed, indexed, and failed transaction states with explorer links.
- [ ] Handle wrong network, insufficient balance, insufficient allowance, cap, pause, and insufficient idle liquidity.

### Operator view

- [ ] Keep operations separate from the depositor interface.
- [ ] Verify `OPERATOR_ROLE` on-chain.
- [ ] Show the post-action liquidity effect before invest/divest.
- [ ] Simulate and execute invest.
- [ ] Simulate and execute divest with explicit `minAmountOut`.
- [ ] Do not expose strategy replacement or role administration in the public UI.

### Runtime cleanup

- [ ] Remove Arbitrum, Sepolia, Anvil, USDT, and V3 runtime fallbacks.
- [ ] Remove LI.FI, migration, destination, APY-comparison, and cross-chain components/routes.
- [ ] Remove unused Sui, Solana, BigMI, permit, and multi-chain dependencies.
- [ ] Frontend lint and typecheck pass.
- [ ] Production build completes without database, hydration, or server-side `localStorage` errors.

## Stage 5.5 — Ponder V4 Indexer

- [ ] Replace V3 ABI, address, and handlers with the frozen V4 ABI and manifest.
- [ ] Start at the exact Base V4 deployment block.
- [ ] Store event-specific caller, owner, receiver, assets, shares, and actual amounts.
- [ ] Derive operator actors from the transaction sender instead of the token address.
- [ ] Index Deposit, Withdraw, Invested, Divested, pause, and role-relevant events needed by the UI.
- [ ] Expose history through a same-origin frontend API.
- [ ] Show indexer health and last indexed block.
- [ ] Codegen, typecheck, lint, and handler tests pass.
- [ ] Indexed events reconcile with explorer receipts.

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

- [ ] CI blocks on Foundry, frontend, Ponder, and explainer gates.
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
- Permit/gasless deposits and an ERC-4626 slippage router.
- Public TVL, production SLA, external audit, formal verification, bug bounty, token, and DAO.

## Definition of Done

Stage 5 is complete only when:

- One verified Base V4 canary matches the committed manifest and source.
- All deterministic, fuzz, invariant, fork, frontend, indexer, AI, and E2E release gates are green.
- No known Critical or High accounting, authorization, or funds-at-risk defect remains.
- The product works without an AI provider and the explainer cannot influence financial writes.
- Every public claim is supported by a contract, receipt, indexed event, or reproducible test artifact.
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
