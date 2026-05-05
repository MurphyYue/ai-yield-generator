---
name: "mission-summary"
description: "Generate a structured day/mission completion summary for the web3-projects learning project. Trigger when the user says 'summarize', 'write a summary', 'create a day summary', or 'summarize what we did'. Produces a Markdown summary file in summary-report/ matching the style of existing DAY3_COMPLETE.md and DAY4_COMPLETE.md."
---

# Mission Summary

Generate a structured completion summary for a day or mission in the web3-projects learning project. The summary must match the style and depth of existing reports in `summary-report/` (see DAY3_COMPLETE.md and DAY4_COMPLETE.md as reference).

## Quick Start

1. Ask the user which day or mission to summarize if not specified
2. Read the relevant sections of `todo.md` for the day/mission scope
3. Explore the files created or modified during that day
4. Read any existing partial summary reports in `summary-report/`
5. Generate the summary and write it to `summary-report/DAY{N}_COMPLETE.md`

## Workflow

### 1) Gather Context

Read these sources before writing anything:

- `todo.md` — the day's mission tasks and completion status
- `summary-report/` — existing reports to match style
- Git log or file timestamps — what was actually built
- Key source files — contracts, hooks, components, API routes changed that day

Do not write from memory alone. Verify claims against actual files.

### 2) Determine Scope

Identify for the target day/mission:
- What problem it solved (the "why")
- What was built (contracts, frontend, backend, config)
- What patterns or concepts were introduced
- What problems were encountered and how they were solved
- What tests were written and their pass rate
- What was deployed (if applicable)

### 3) Structure the Summary

Follow this exact structure (matching DAY3_COMPLETE.md style):

```
# Day N: [Title] - Complete

## Overview
One paragraph: what this day transformed the project from/to.

## What We Built
ASCII architecture diagram showing the new system structure.

## Missions Completed
Table: Mission | Status | Key Achievement

## [One section per major mission]
### Mission X: [Name]
- Why it was needed
- How it works (with code snippets or diagrams where helpful)
- Key insight (the architectural lesson)

## Problems Encountered & Solutions
Table or list: Problem | Root Cause | Solution | Architect Lesson

## Statistics
ASCII box with counts: tests written, files created/modified, contracts deployed, etc.

## Key Learnings
### 1. [Pattern Name]
**What**: one sentence
**Why**: one sentence
**How**: one sentence

## What Makes This Professional?
Numbered list of 5-7 points connecting the work to real-world standards.

## Files Created/Modified
Grouped by: Smart Contracts / Frontend / Backend / Tests / Config / Documentation

## Conclusion
2-3 sentences: what the project can now do that it couldn't before.
```

### 4) Quality Checks Before Writing

- Every architectural claim is backed by an actual file or code snippet
- Statistics are counted from real files (use `grep -c` or `wc -l` if needed)
- Problems section only includes problems that actually happened (check conversation history or git log)
- Key learnings connect to real web3 architect interview topics
- Tone matches existing reports: direct, technical, no fluff

### 5) Write the File

Write to: `summary-report/DAY{N}_COMPLETE.md`

If summarizing a single mission (not a full day): write to `summary-report/MISSION_{X}_COMPLETE.md`

After writing, confirm the file path to the user.

## Style Rules

- Match the ASCII diagram style from DAY3_COMPLETE.md exactly
- Use `✅` for completed items, `❌` for not applicable
- Code snippets should be minimal — show the pattern, not the full implementation
- "Key Insight" sections should be interview-ready: something Murphy can say in a job interview
- Statistics box uses the same ASCII border style as existing reports
- Do not add sections that don't exist in the reference reports

## Reference Files

- Style reference: `summary-report/DAY3_COMPLETE.md`
- Style reference: `summary-report/DAY4_COMPLETE.md`
- Scope reference: `todo.md` (the day's task list)
- Project context: `CLAUDE.md` and `.claude/projects/.../memory/MEMORY.md`
