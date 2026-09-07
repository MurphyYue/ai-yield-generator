# Stage 5 Threat Model

**System:** USDC Vault Console / VaultV4 / AaveStrategy

**Deployment class:** Low-value, unaudited Base canary

**Review status:** Internal engineering threat model; not an audit

## Assets to Protect

- USDC held idle by `VaultV4`.
- USDC/aUSDC controlled by `AaveStrategy`.
- ERC-4626 share ownership and proportional claims.
- User allowances and signed transactions.
- Privileged role authority.
- SIWE-authenticated identity and session state.
- Deployment address and ABI integrity.
- Accuracy of user-visible accounting evidence.

## Trust Assumptions

- Base consensus and RPC responses are outside this repository's control.
- Native Base USDC can be upgraded, paused, or frozen by its issuer.
- Aave V3 governance, pool proxies, reserve configuration, liquidity, and oracle dependencies are external trust.
- `DEFAULT_ADMIN_ROLE` can grant roles and configure strategy authority; compromise is critical.
- `OPERATOR_ROLE` controls the idle/strategy allocation but must not own depositor shares.
- Strategy bindings prove configuration identity, not accounting honesty. An admin-selected strategy can still lie through `totalAssets()` or callback results; adapter review and admin-key security remain trusted.
- The Ponder database is derived and may lag or fail.
- The LLM provider may fail, return malformed output, or follow adversarial text; it is never trusted for facts or authority.

## Threat Register

| ID | Threat | Consequence | Required control/evidence |
|---|---|---|---|
| T-01 | First-depositor donation/inflation attack | Victim receives zero or unfairly few shares; attacker captures value | Offset 6; reject zero-share deposits before transfer; exact one-share boundary tests; single-victim attacker-first and attacker-last profit fuzzing |
| T-02 | Rounding creates value | Repeated conversions extract assets or overstate claims | Exact conversion/aggregate-claim inequalities plus 10,000-run view, state-changing, multi-holder, donation, and loss fuzzing |
| T-03 | Strategy replacement while funds remain | Old strategy assets disappear from `totalAssets`; withdrawals are impaired | Require candidate code plus vault/asset bindings; accept replacement only when the current strategy reports exactly zero `totalAssets()`; a reverting read fails closed; test both idle-underlying and aToken residuals |
| T-04 | Strategy lies, reverts, or reports loss | Incorrect share price, denial of service, false-zero replacement approval, or depositor loss | Admin installs only a reviewed adapter; Vault balance deltas are authoritative for invest/divest/emergency amounts; exact revert and misreport tests; disclose that `totalAssets()` honesty and availability remain residual trust |
| T-05 | Invalid Aave pool/aToken configuration | Funds sent to an unusable integration or yield omitted | Constructor rejects missing code, failed reserve lookup, zero/no-code aToken, and incorrect aToken underlying/pool bindings; deterministic tests cover these checks; pinned V4 fork validation remains a release gate |
| T-06 | Slippage or dishonest withdrawal return value | Vault receives less USDC than the operator expects | Ignore adapter/pool return amounts as accounting authority; measure the Vault balance delta and enforce explicit `minAmountOut` |
| T-07 | Insufficient idle withdrawal liquidity | Preview/UI promises an unexecutable withdrawal | Exact positive-idle `maxWithdraw`/`maxRedeem` boundaries under stable accounting reads; zero-idle and pause fail closed; UI separates redeemable from currently withdrawable assets |
| T-08 | Donation or yield consumes deposit-cap headroom or pushes AUM above cap | Denial of new deposits; operators misread above-cap AUM as an accounting failure | Treat cap as a controlled-inflow limit over `totalAssets`; test donation/yield effects; show closed/exhausted state; never exclude donated assets from ownership accounting |
| T-09 | Role compromise or accidental grant | Unauthorized pause, allocation, or reconfiguration | Separation of duties, exact role tests, deployment assertions, event monitoring, disclosed canary key model |
| T-10 | Reentrancy or unsafe external-call ordering | Duplicate state transition or fund loss | `nonReentrant`, checks/effects/interactions review, malicious strategy/token tests where meaningful |
| T-11 | Pause policy inconsistency | Emergency controls fail, value movement remains possible, or operations are unnecessarily trapped | Documented function-by-function matrix; exact-error tests for all user/operator value movement including zero-value share transfers; emergency recovery remains available and leaves the Vault paused |
| T-12 | Deployment address/ABI mismatch | Frontend signs calls to wrong or legacy contract | Single manifest, runtime code checks, no fallback addresses, post-deploy assertions |
| T-13 | Wrong chain | User signs on an unsupported network | Base-only connector/runtime allowlist and explicit network error |
| T-14 | Wallet identity supplied by request/model | Cross-wallet data exposure or misleading explanation | SIWE-derived server identity; reject body/model wallet fields; spoof tests |
| T-15 | Thread/checkpoint ownership failure | Cross-user conversation or state disclosure | No threads/checkpointer in minimum explainer |
| T-16 | Prompt injection or model invention | False numbers, action advice, or write-path influence | Closed topics, deterministic evidence/findings, structured validation, no tools/write client, deterministic fallback |
| T-17 | Mixed-block reads | Internally inconsistent accounting snapshot | Pin every position read to one confirmed block; cite block/hash in result |
| T-18 | Indexer lag or incorrect event actor | Misleading history | Event-specific schema, transaction-sender actor, visible indexed block, receipt reconciliation |
| T-19 | Database or AI outage | Product becomes unavailable | Core reads/writes do not depend on database or AI; evidence UI has deterministic fallback |
| T-20 | False security claims | Users treat a portfolio canary as production-safe | Persistent unaudited/not-for-production disclosure; never call internal review an audit |
| T-21 | Emergency protocol recovery reverts or only partially succeeds | A full rollback loses recoverable idle funds, or status is mistaken for complete recovery | Transfer strategy-idle USDC first; catch aToken-read and Aave-withdrawal failures; record the Vault balance delta separately from protocol-path status; require residual assets to be recovered before replacement; test failure, partial recovery, and retry |

## Strategy Slice Verification and Static-Analysis Triage

The `fix/v4-strategy` checkpoint was reviewed on 2026-09-07. The focused Aave strategy suite passed 49 tests and the full non-fork repository suite passed 159 tests. These are deterministic local results; they do not replace the pending pinned Base and Arbitrum fork tests.

A scoped Slither 0.11.5 run over `VaultV4`, `AaveStrategy`, and `IStrategy`, excluding dependencies, tests, scripts, mocks, and legacy V1/V3 contracts, produced 18 results:

- Three `reentrancy-balance` results (`High` / `Medium`) cover Vault invest/divest and strategy supply. They are accepted detector false positives: all three entry points are `nonReentrant`, strategy mutations are restricted to the bound Vault, and the pre/post balances are intentionally compared to make observed asset movement authoritative. Hostile strategy callbacks into both Vault operations revert with the exact reentrancy error and roll back every token movement. The production token and pool are fixed deployment dependencies that remain subject to pinned-fork validation.
- Eight `incorrect-equality` results (`Medium` / `High`) are exact protocol-boundary checks rather than manipulable price comparisons: zero owner shares, zero idle assets, zero-share conversion rejection, zero remaining mint capacity, and the explicit max-uint cap sentinel. Unit, boundary, and fuzz tests exercise these equality branches.
- Four `unused-return` results (`Medium` / `Medium`) on strategy and Aave withdrawals are intentional. Adapter and pool return values are not accounting authority; the implementation measures the Vault's USDC balance delta, and adversarial tests show that false high and false low return values cannot change the recorded result.
- Constructor complexity is accepted because the constructor fails closed across vault, asset, pool, reserve, aToken code, underlying, and pool-binding checks.
- The `POOL()` and `UNDERLYING_ASSET_ADDRESS()` naming results are required by the deployed Aave aToken ABI.

The reproducible command is:

```bash
slither . --exclude-dependencies \
  --filter-paths '(^|/)(test|script|broadcast|cache|out|lib)/|contracts/(VaultV3\.sol|Vault\.sol|MockERC20\.sol|mocks/)'
```

All High and Medium results are triaged above; none is being represented as an external audit finding or clearance. Residual trust in Base USDC, Aave, the admin-selected adapter, and its synchronous `totalAssets()` report remains explicit.

## Critical Security Properties

Release is blocked if any of these are false:

1. No known path lets an accepted deposit mint zero shares.
2. No demonstrated donation sequence gives the attacker positive profit from a victim deposit within the tested domain.
3. No strategy update is accepted when the current strategy reports nonzero assets; a reverting asset read blocks the update.
4. No unauthorized account can invest, divest, pause, set cap, or configure strategy.
5. No runtime fallback can point the UI or indexer to V3 or another chain.
6. No AI input or output can select a wallet identity or reach a financial write.
7. No Critical or High funds-at-risk defect remains knowingly open.

## Operational Response

If contract or deployment evidence diverges:

1. Pause the canary if the configured role can do so safely.
2. Stop all public UI write entry points.
3. Invoke the documented emergency-divest path if strategy funds are at risk; interpret measured recovered assets separately from protocol-path status, inspect residual assets, and retry when safe before replacing the strategy.
4. Preserve receipts, logs, block numbers, role state, and code hashes.
5. Do not deploy an unreviewed patch or silently change the frontend address.
6. Return to the failed invariant or trust-boundary analysis.

Because VaultV4 is non-upgradeable, a contract correction requires a new deployment and manifest. Stage 5 has no user-migration promise.

## Explicitly Uncovered by Stage 5

- Independent audit or formal verification.
- Public-fund production operations.
- Multisig/governance decentralization.
- Aave/USDC/Base protocol failure.
- Recovery guarantees when Base USDC itself freezes, reverts, or fails to transfer.
- Honesty of an admin-selected strategy's `totalAssets()` report.
- Cross-chain bridge risk.
- Multiple strategies or automated rebalancing.
- Automatic withdrawal queues or strategy divestment.
- Performance-fee economics.
- Incident monitoring and response staffing.

These are disclosed residual limitations, not implied guarantees.
