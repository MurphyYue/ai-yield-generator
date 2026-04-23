---
name: mission-analysis
description: Analyze a day-by-day project mission before implementation using the project plan, architecture decision records, and current codebase state. Use when the user asks to move into, analyze, assess readiness for, or plan a Day/Mission task before coding.
---

# Mission Analysis

Use this skill for pre-implementation daily mission analysis. Do not use this skill for final completion summaries; use the summary-focused mission skill for that.

## Source Order

Start from planning and architecture sources before inspecting implementation details:

1. Read the relevant day section in `todo.md`.
2. Inspect only the code/docs needed to verify readiness, gaps, and risks.

If a required planning source is missing, state that and continue with the best available repo context.

## Output Structure

Use this structure by default:

## Mission Goal
- State what the day is trying to prove or unlock.
- Distinguish implementation work from verification, deployment, product, or advisory work.

## Architecture Constraints We Must Respect
- Extract hard rules from architecture decision docs.
- Call out chain model, token model, security boundaries, product flow boundaries, and non-goals.
- Treat these as guardrails, not optional suggestions.

## What Is Already Ready
- List existing files, deployments, tests, APIs, docs, or flows that already support the mission.
- Be concrete about why each item is ready.

## What Is Not Ready
- List missing capabilities, stale assumptions, schema gaps, config gaps, or documentation gaps.
- Prefer specific file references over generic statements.

## Readiness Assessment by Day X Step
- Walk through the planned substeps from `todo.md`.
- Mark each as ready, partially ready, or not ready.
- Explain the blocker or remaining work for each step.

## Main Risks for Day X
- Order by practical severity.
- Include technical, product, security, operational, and user-flow risks as applicable.

## Recommended Day X Work Order
- Give the safest implementation sequence.
- Put source-of-truth or policy changes before dependent code when relevant.
- Keep the work order aligned with architecture constraints.

## Concrete Day X Gap List
- End with a concise checklist of what must be changed or verified before the day can be called complete.

## Rules

- Do not implement code unless the user explicitly approves moving from analysis to implementation.
- Do not use final-summary framing such as "What We Completed" unless the mission is already finished.
- Keep the analysis pragmatic and tied to current repo state.
- When current code conflicts with the plan, say so directly and identify which source should win.
- For Web3/DeFi missions, always consider chain correctness, token correctness, signature/permit assumptions, funds-at-risk, and source-of-truth accounting.
