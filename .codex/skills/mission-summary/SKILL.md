---
name: mission-summary
description: Produce structured completion summaries for day-by-day Web3 product missions while training the user toward a Senior Web3 Full-stack Engineer role with strong DeFi competence. Use when a mission/day is complete and the user asks to summarize what was done, what problems occurred, how they were solved, what was learned, and what comes next.
---

# Mission Summary

Use this skill after a mission/day has been completed. Produce a clear completion record that explains the product value, technical changes, problems encountered, solutions, and reusable learning for a Senior Web3 Full-stack Engineer path.

## Workflow

### 1. Confirm completion context

Extract and state:
- the mission goal in plain language
- the business/product value
- the architecture layer being changed: contract, frontend, API, indexing, deployment, governance, AI
- the user-facing behavior that changed
- the trust boundaries and dependencies
- the main risks, failure modes, and remaining weak points

Use `references/summary-template.md` as the default output structure.

### 2. Summarize with product-grade judgment

Describe the work as real product progress, not tutorial activity:
- what changed
- why it matters
- how the runtime flow works now
- what was verified
- what remains incomplete, risky, or deferred

### 3. Explain in a frontend-to-fullstack bridge

Translate Web3/FinTech concepts into terms familiar to a frontend engineer growing into a senior full-stack Web3 role:
- interfaces and protocols
- state machines and event flows
- trust boundaries and permissions
- async failure handling
- runtime configuration, environment separation, and deployment stages
- backend truth sources, orchestration layers, and how frontend decisions depend on them

Use concise analogies. Avoid hand-wavy simplifications.

### 4. Produce the structured summary

For completed missions, produce a mission summary using `references/summary-template.md`.

Always cover:
- why the task exists
- what changed
- how the system now works
- what the user should learn
- how to explain the decision like a Senior Web3 Full-stack Engineer
- what remains weak or deferred

### 5. Keep the senior-fullstack bar explicit

Use `references/senior-fullstack-rubric.md` to pressure-test the work through end-to-end product delivery and senior engineering judgment. Call out when a task is:
- implementation-complete but still weak across integration boundaries
- acceptable for local/testnet but not production
- blocked by product, security, compliance, or operational gaps

## Output rules

For completion summaries, default to this sequence:
1. Mission goal
2. Business meaning
3. Architecture meaning
4. What changed
5. How it works
6. Problems met and how they were solved
7. Verification results
8. Security / risk notes
9. What the user should learn
10. Senior engineer lens
11. Open questions
12. Next mission context

For small tasks, keep the summary compact, but do not skip the learning layer if the task teaches a reusable concept.

## Role framing

This skill should optimize for the user's target role:

- Senior Web3 Full-stack Engineer
- strong in DeFi
- capable across contracts, frontend, backend, AI integration, testing, deployment, and product reasoning

The skill should not over-rotate into "architect" language when the more useful framing is:

- how the system works end to end
- how the user would implement, debug, and explain it
- how the work demonstrates professional Web3 engineering maturity

## Boundary With Mission Analysis

Use `mission-analysis` before implementation to analyze readiness, gaps, risks, and work order. Use this skill after implementation to summarize completed work.

## References

- `references/summary-template.md`: fixed summary structure to use after missions
- `references/architecture-checklist.md`: architecture review prompts when explaining risk and constraints
- `references/business-lens.md`: explain why the task matters to a real product
- `references/senior-fullstack-rubric.md`: distinguish coding completion from senior full-stack engineering maturity
