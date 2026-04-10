# Days 6-14 Architecture Decisions

## Purpose

This file records the architectural decisions that were clarified after reviewing the `Days 6-14: Cross-Chain Yield Navigator — Base + Arbitrum Mainnet` plan in `todo.md` starting around line 1994.

Its purpose is to preserve implementation-critical decisions so future day-by-day execution does not drift from the agreed product and engineering direction.

---

## Decision Summary

### 1. Token Standardization

- Days 6-14 use `USDC` for all mainnet work.
- Legacy `Sepolia` and `Anvil` paths stay as-is with `USDT`.
- The Day 10 frontend update should rename `NEXT_PUBLIC_USDT_ADDRESS` to `NEXT_PUBLIC_USDC_ADDRESS` for the new mainnet path.
- AI prompts and the Dify Knowledge Base should be updated during Day 11 to reflect `USDC` rather than `USDT` for the mainnet product.

### 2. Strategy Accounting Must Reflect Real Aave Position

- The current `AaveStrategy.totalAssets()` implementation is not sufficient for mainnet truth because it returns an internal principal counter rather than the live protocol-backed position.
- During Day 7 fork testing, `AaveStrategy.totalAssets()` must be updated to reflect the real Aave position via the reserve's aToken balance rather than only `_depositedToPool`.
- This is not treated as a separate refactor day. It belongs naturally inside the mainnet fork testing scope.

### 3. Cross-Chain UX Boundary

- The product must own the full user flow:
  `AI advice -> bridge -> destination chain switch -> destination vault deposit -> destination invest`
- After bridge completion, the app should not stop at "funds arrived".
- The frontend should detect bridge completion and continue guiding the user through deposit and invest on the destination chain.

### 4. Source-of-Truth Chain Model

- Base is the default home chain.
- Arbitrum is an optimization destination, not a symmetric default.
- The wallet should normally remain connected to Base.
- Arbitrum is activated only during migration execution.

### 5. Dify Advisory Policy

- AI must never return `action_data.type = "cross_chain_migrate"` when migration is not economically justified.
- `cross_chain_migrate` is allowed only when migration is genuinely worthwhile.
- If migration is marginal or negative, the AI should still return an advisory explanation, but the recommendation must be to stay on Base.
- The bridge widget should render only when `cross_chain_migrate` is explicitly returned.

### 6. Deployment Wallet Model

- Use the same EOA on Base and Arbitrum.
- This keeps product identity, deployment ownership, and AI user continuity aligned.

### 7. Real-Money Risk Scope

- The `< 50 USDC` budget applies to the combined total across both chains.

---

## Questions and Final Answers

### Q1. Should the new phase standardize to USDC or keep USDT?

**Answer**

- Standardize to `USDC` for all mainnet work in Days 6-14.
- Keep `Sepolia` and `Anvil` code as legacy `USDT`.
- Do not rewrite the old Day 1-5 path unless needed for compatibility.

### Q2. Should strategy accounting be fixed before meaningful fork testing?

**Answer**

- Yes.
- Update `AaveStrategy.totalAssets()` during Day 7 so it reads the real Aave-backed position instead of a local principal counter.
- This is required for meaningful verification of live protocol integration.

### Q3. Should the cross-chain flow stop after the bridge or continue inside the product?

**Answer**

- Continue the flow inside the product.
- After LI.FI bridge completion, prompt chain switch, then guide the user through destination vault deposit and invest.

### Q4. What is the home-chain model?

**Answer**

- Base is the default home chain.
- Arbitrum is a satellite optimization chain.

### Q5. Should Dify ever emit `cross_chain_migrate` for marginal or negative cases?

**Answer**

- No.
- Use strict blocking.
- `cross_chain_migrate` appears only when the economics pass the recommendation threshold.

### Q6. Should deployment use the same wallet on both chains?

**Answer**

- Yes, use the same EOA.

### Q7. Is the `< 50 USDC` budget per chain or combined?

**Answer**

- Combined across both chains.

### Q8. Destination execution UX: separate actions or one guided flow?

**Answer**

- Use a guided two-step CTA in one coherent card.
- Step 1: deposit on the destination vault.
- Step 2: invest into Aave.
- The card should auto-advance internally after a successful deposit.

### Q9. What counts as valid yield verification?

**Answer**

- Verify that `totalAssets()` reflects the live position.
- Verify the strategy holds the correct Aave position.
- Document expected daily yield based on current APY.
- Do not require visible balance growth over a short test window, since it is too small to be a meaningful acceptance criterion at this scale.

### Q10. Should the frontend become permanently multi-chain or stay Base-first?

**Answer**

- Keep the frontend Base-first.
- Arbitrum should activate only inside the migration flow:
  `bridge -> chain switch -> deposit/invest -> optional switch back`
- Cross-chain APY comparison still comes from the backend API, independent of the currently connected wallet chain.

---

## Implementation Guardrails

These rules should be treated as mandatory during Days 6-14 implementation.

1. Do not collapse legacy Sepolia `USDT` logic and new mainnet `USDC` logic into one ambiguous path.
2. Do not present Arbitrum as a co-equal default chain in the normal wallet flow.
3. Do not render the bridge widget unless the AI explicitly returns `cross_chain_migrate`.
4. Do not claim yield verification from short-term visible balance movement alone.
5. Do not leave `totalAssets()` as an internal accounting proxy once mainnet-fork validation begins.
6. Do not end the migration UX at bridge completion; complete the destination vault loop.
7. Do not recommend migration when the net advantage is below threshold, even if raw APY is higher on Arbitrum.

---

## Expected Plan Updates

When implementing or revising `todo.md`, the following should be reflected explicitly:

1. Day 7 must include the `AaveStrategy.totalAssets()` truth-source fix.
2. Day 11 must define that `cross_chain_migrate` is emitted only when threshold conditions pass.
3. Day 12-13 must describe the guided post-bridge deposit/invest flow as one card with internal step progression.
4. Day 14 verification should focus on correct position representation and documented expected yield, not short-window visible accrual.

---

## Usage

Before implementing any Day 6-14 task, review this file to ensure:

- the asset model is correct (`USDC` on mainnet),
- the chain model is correct (Base-first, Arbitrum-on-demand),
- the advisory policy is correct (strict migration gating),
- and the product flow remains end-to-end rather than stopping at bridge completion.
