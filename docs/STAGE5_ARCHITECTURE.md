# Stage 5 Architecture — USDC Vault Console

**Status:** Accepted product and trust-boundary decision

**Branch:** `stage-5`

**Target release:** `v0.5.0`

## Product Position

USDC Vault Console is a transparent Base interface for depositing into and operating an ERC-4626 USDC vault backed by Aave, with evidence-grounded explanations of positions, liquidity, and deposit/withdraw transactions.

The product does not claim to be:

- a yield optimizer or aggregator;
- a cross-chain vault or migration product;
- a replacement for using Aave directly;
- audited or appropriate for public funds;
- an autonomous financial agent.

The product value is operational transparency: a depositor can understand ownership, redeemable value, current liquidity, and transaction results; an authorized operator can understand and manage the idle/Aave allocation.

## System Boundary

```text
Base user/operator
      |
      v
Next.js + wagmi/viem + SIWE
      |                 |
      |                 +--> read-only Vault Evidence Explainer
      |                        |
      |                        +--> pinned RPC evidence
      |                        +--> deterministic accounting findings
      |                        +--> bounded LLM explanation
      |
      +--> VaultV4 (ERC-4626 USDC)
                 |
                 +--> AaveStrategy
                           |
                           +--> Base Aave V3 Pool / aUSDC

Base event logs --> Ponder --> same-origin activity API --> UI
```

## Chain and Asset Model

- Runtime and deployment chain: Base `8453` only.
- Vault asset: native Base USDC.
- Yield integration: Base Aave V3 supply position.
- Arbitrum is retained only as pinned fork compatibility evidence.
- Sepolia, Anvil, Arbitrum, USDT, and V3 addresses may exist in legacy tests or history but must never be runtime fallbacks.

One committed deployment manifest is the runtime source of truth. It contains the chain ID, vault, strategy, asset, pool, aToken, deployment block, source commit, and explorer references. Missing or invalid manifest data must fail closed.

## Contract Model

`VaultV4` is a non-upgradeable, single-asset ERC-4626 vault.

Users own shares, not principal ledger entries. Yield or loss changes the asset value of each share through `totalAssets()`.

```text
totalAssets = idle USDC in VaultV4 + assets controlled by AaveStrategy

user claim = user shares / total share supply * totalAssets
```

The live canary uses explicit operator-managed liquidity:

- `invest` moves idle USDC into the strategy;
- `divest` returns strategy assets to idle USDC;
- user withdrawals do not automatically divest;
- `maxWithdraw` and `maxRedeem` therefore must reflect current idle liquidity.

This limitation is part of the product UI and trust model, not an implementation detail to hide.

## Lean V4 Policy

Stage 5 removes performance fees, large-withdrawal approval, and blacklist restrictions.

The deposit cap is an assets-under-management limit denominated in raw USDC units. A cap of `0` closes deposits and mints while preserving exits, share transfers, and operator liquidity management. `type(uint256).max` is the only explicit unlimited sentinel and is reserved for tests or local development. The live canary target is `50e6` raw units (50 USDC).

Finite capacity is calculated from `totalAssets()`, so Aave yield and unsolicited donations consume headroom. They can also push AUM above the configured cap; the cap constrains accepted ERC-4626 inflows rather than placing an absolute ceiling on assets.

### Why performance fees are deferred

ERC-4626 standardizes ownership accounting but does not standardize realized performance-fee accounting. Correct fee-share dilution requires a separate economic specification and property suite. Monetization does not justify that extra risk for an unaudited low-value canary.

### Why large-withdrawal approval is removed

A treasurer approval can make `maxWithdraw` or `maxRedeem` advertise an amount that still reverts, and share-price movement complicates pre-approval of an exact redemption. A conservative vault cap bounds accepted user inflows without adding a second withdrawal authorization path.

### Why blacklist restrictions are removed

Blocking ERC-4626 share senders and receivers reduces composability and introduces another centralized control. Stage 5 has no explicit compliance requirement that justifies this behavior.

## Roles and Authority

| Role | Stage 5 authority | Must not do |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Grant/revoke roles; configure a strategy only through the safe lifecycle | Move user assets through ordinary operations |
| `MANAGER_ROLE` | Pause and unpause | Invest, divest, or change cap |
| `OPERATOR_ROLE` | Invest and divest with explicit amount/slippage bounds | Change roles, cap, or strategy |
| `TREASURER_ROLE` | Set the conservative deposit cap | Move strategy funds or change roles |
| Public depositor | Deposit, mint, withdraw, redeem, transfer shares | Perform privileged operations |

The Base canary may initially use one operator-controlled account for multiple roles. If so, documentation must disclose that operational centralization rather than describing it as decentralized governance.

## Required Accounting Invariants

1. A successful nonzero deposit mints nonzero shares.
2. A successful nonzero mint requires nonzero assets.
3. A donation attacker cannot profit from a victim's rounding loss under the documented input domain.
4. Asset-share round trips cannot create value for the caller.
5. Aggregate redeemable claims do not exceed `totalAssets()` beyond documented rounding.
6. Yield and loss are allocated proportionally to share ownership.
7. Preview and actual operations agree when relevant state does not change.
8. Cap enforcement cannot be bypassed through deposit/mint rounding.
9. Strategy replacement cannot orphan assets or principal.
10. Unauthorized callers cannot move or reconfigure funds.
11. `maxWithdraw` and `maxRedeem` do not exceed currently executable idle liquidity.
12. A paused vault follows one explicitly tested policy for every user and operator action.

## Frontend Transaction Boundary

- The frontend resolves Base addresses and ABI from the frozen deployment artifact.
- Every write is simulated before wallet submission.
- The user wallet signs every user action.
- An authorized operator wallet signs every invest/divest action.
- Transaction state is shown as preparing, awaiting signature, submitted, confirmed, indexed, or failed.
- AI output cannot populate write arguments or call a write hook.

## AI Authority Boundary

The Stage 5 explainer supports two closed tasks:

1. Explain the SIWE-authenticated wallet's current vault position.
2. Explain a Base V4 Deposit or Withdraw transaction identified by transaction hash.

The server, not the model, supplies wallet, session, chain, deployment, and contract identity.

```text
validated request
  -> server-bound identity/deployment
  -> pinned on-chain evidence
  -> deterministic accounting analysis
  -> structured LLM explanation
  -> schema validation or deterministic fallback
```

The model has no write client, tools, memory, checkpoint, alerts, transaction intent, or autonomous action. Exact values and links are rendered from deterministic evidence beside the prose.

## Data Boundary

Ponder is a derived read model, not the accounting source of truth.

- Contracts and receipts determine financial truth.
- Ponder provides activity/history convenience.
- Indexer lag must be visible.
- Indexer failure must not change vault balances or block core deposit/withdraw behavior.
- AI position accounting reads the contract at a pinned block rather than trusting indexed aggregates.

## Deployment and Release Boundary

- Deployment tooling must reject live broadcast on chains other than Base.
- A live broadcast requires separate explicit user approval.
- The canary is verified before the frontend uses its address.
- The canary uses a conservative cap and personal funds only.
- `v0.5.0` is created only after the contract, frontend, indexer, AI, and browser release gates pass.
- The release must state: "Portfolio canary; not audited; not for production funds."

## Superseded Architecture

The Stage 4 yield recommendation, cross-chain migration, LI.FI, alert, long-term memory, routing-subgraph, and HITL architecture is historical. It must not remain callable or visible in the Stage 5 release.

Its history is preserved by the `stage-4` branch and `stage-4-snapshot-2026-08-30` tag.
