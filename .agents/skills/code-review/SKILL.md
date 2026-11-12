---
name: code-review
description: >-
  Review current uncommitted git changes (staged, unstaged, and untracked) for
  correctness, consistency, regressions, edge cases, and sufficient test coverage.
  Use when asked to review uncommitted changes, inspect a worktree before committing,
  or perform a code review.
argument-hint: "[optional description of the changes; include 'opus' to request claude-opus-5-5-medium]"
model: claude-sonnet-5-5-medium
---

# Code Review

Review the current uncommitted changes in the repository without modifying the worktree. If an optional parameter describing the changes is provided, use it as context for intent—never as a substitute for inspecting the actual diff.

## Model Selection & Escalation

Default to `claude-sonnet-5-5-medium`. Upgrade to `claude-opus-5-5-medium` (Claude Opus 5.5) in either of these cases:

1. **Caller-Requested**: The caller or implementing agent explicitly requests Opus (e.g., passes `opus` / `claude-opus-5-5-medium` in the skill argument or asks for an Opus review).
2. **Complexity Self-Assessment**: After inspecting the uncommitted diff in Step 1, escalate to `claude-opus-5-5-medium` (via `swarm` worker/model switch if not already running on Opus) when the changes involve high complexity, such as:
   - Cross-cutting changes spanning many files or multiple subsystems/layers (e.g., ≥ 6 files or ≥ 300 changed lines).
   - Concurrency, async orchestration, race conditions, state machines, or shared-process coordination.
   - Security-sensitive logic (authentication, authorization, input validation, cryptography, or sandboxing).
   - Core architectural, schema, or public API changes with subtle regression risks.

## Workflow

1. **Inspect Uncommitted Changes**
   - Run `git status --short` to list all staged, unstaged, and untracked files.
   - Run `git diff --cached` to inspect staged changes.
   - Run `git diff` to inspect unstaged changes to tracked files.
   - Read any newly added untracked files reported by `git status --short` that are part of the changes.
   - If there are no uncommitted changes, report that the working tree is clean and stop.

2. **Gather Surrounding Context**
   - Read surrounding code, related callers, types, and existing tests for the modified files to understand how the changes fit into the codebase.
   - Check project conventions and rules (such as `AGENTS.md`) when evaluating consistency.

3. **Review Criteria**
   Evaluate every change against:
   - **Correctness**: Logic bugs, off-by-one errors, incorrect state transitions, async/await or error-handling issues, type safety.
   - **Consistency**: Adherence to existing codebase patterns, naming conventions, styling/CSS variables, and architectural boundaries.
   - **Regressions**: Unintended side effects on existing behavior, callers, or public interfaces.
   - **Edge Cases**: Null/undefined values, empty inputs, boundary conditions, race conditions, and failure paths.
   - **Sufficient Test Coverage**: Whether new or modified behavior is meaningfully covered by unit/integration tests and whether existing tests need updates.

4. **Verify (Optional & Read-Only)**
   - Run relevant existing tests or typechecks if helpful to confirm behavior (e.g., via `jest-tester` or targeted test commands).
   - Do not edit files, stage changes, commit, or alter the git worktree.

5. **Report Findings**
   - List only actionable findings, ordered by severity (e.g., Critical, High, Medium, Low).
   - For each finding, include:
     - Severity
     - File path and line number(s)
     - Concrete issue and impact
     - Concise recommendation
   - Do not report speculative concerns as confirmed bugs.
   - If no actionable findings are found, state that clearly.
   - Conclude with a brief summary of the test coverage reviewed and any checks run or not run.
