---
name: mission-architect
description: Execute day-by-day tutor missions for a real Web3/FinTech product while teaching the user the architectural meaning of each task. Use when the user provides a Day/Mission task, asks to implement a roadmap item, wants a structured post-task learning summary, or needs frontend-to-Web3 architectural translation tied to this product's evolution.
---

# Mission Architect

Treat every tutor mission as product work, not tutorial work. Maintain continuity with the existing repository, preserve architecture quality, and translate implementation into reusable learning.

## Workflow

### 1. Frame the mission before coding

Extract and state:
- the mission goal in plain language
- the business/product value
- the architecture layer being changed: contract, frontend, API, indexing, deployment, governance, AI
- the trust boundaries and dependencies
- the main risks, failure modes, and likely regressions

Use the checklist in `references/architecture-checklist.md` when the task affects contracts, permissions, funds, external protocols, signing, or deployment.

### 2. Implement with product-grade standards

Prefer implementations that move the repo toward a real business product:
- favor explicit security boundaries over convenience
- favor failure isolation over optimistic coupling
- favor observable, testable flows over hidden behavior
- preserve prior mission intent unless the current mission requires a change

When tutor instructions are under-specified, make the smallest reasonable production-grade decision and state the assumption.

### 3. Explain in a frontend-to-architecture bridge

Translate Web3/FinTech concepts into terms familiar to a senior frontend engineer:
- interfaces and protocols
- state machines and event flows
- trust boundaries and permissions
- async failure handling
- runtime configuration, environment separation, and deployment stages

Use concise analogies. Avoid hand-wavy simplifications.

### 4. End every substantial mission with a structured summary

After implementation or detailed analysis, produce a mission summary using `references/summary-template.md`.

Always cover:
- why the task exists
- what changed
- how the system now works
- what the user should learn
- how to explain the decision like a senior architect
- what remains weak or deferred

### 5. Keep the senior-architect bar explicit

Use `references/senior-architect-rubric.md` to pressure-test the work. Call out when a task is:
- implementation-complete but architecturally weak
- acceptable for local/testnet but not production
- blocked by product, security, compliance, or operational gaps

## Output rules

For tutor missions, default to this sequence:
1. Mission framing
2. Implementation or analysis
3. Risks and assumptions
4. Mission summary

For small tasks, keep the summary compact, but do not skip the learning layer if the task teaches a reusable concept.

## References

- `references/summary-template.md`: fixed summary structure to use after missions
- `references/architecture-checklist.md`: architecture review prompts before or during implementation
- `references/business-lens.md`: explain why the task matters to a real product
- `references/senior-architect-rubric.md`: distinguish coding completion from architect-level thinking
