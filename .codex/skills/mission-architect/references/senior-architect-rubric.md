# Senior Architect Rubric

Use this rubric to judge whether the mission result is architect-level.

## 1. Boundaries are explicit
- Roles, permissions, ownership, and data boundaries are clear.
- The design does not rely on hidden assumptions.

## 2. Failure is contained
- External failures do not silently corrupt state.
- Error handling is product-visible where needed.
- Critical paths degrade safely.

## 3. Security is designed, not appended
- Funds, signatures, approvals, and admin actions are treated as primary concerns.
- The design states what is prevented, not just what is implemented.

## 4. Operations are considered
- The system can be deployed, configured, monitored, and recovered with reasonable discipline.
- Environment differences are acknowledged.

## 5. The design teaches a reusable principle
- The mission summary extracts a durable pattern, not just local code details.

## 6. Product reality is acknowledged
- State clearly whether the result is local-demo quality, testnet-ready, or closer to production.
- Name the remaining blockers without hiding them.
