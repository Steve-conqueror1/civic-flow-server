---
description: Create a commit message by analyzing git diffs
allowed-tools: Bash(git status:*), Bash(git diff --staged), Bash(git commit:*)
---

## Context:

- Current git status: !`git status`
- Current git diff: !`git diff --staged`

## Your Task:

You are generating a professional git commit message for the CivicFlow project. Analyze the above staged git changes and create a commit message.

### Steps:

1. Analyze the staged git diff.
2. Identify:
   - What changed
   - Why it changed (if inferable)
   - Scope of the change (api, config, refactor, fix, etc.)
3. Generate a Conventional Commit–style message.

### Format:

<type>(<scope>): <short summary>

- Bullet point explaining major change
- Bullet point explaining secondary change (if applicable)

### Rules:

- Use Conventional Commits types:
  - `feat:` - New feature
  - `fix:` - Bug fix
  - `refactor:` - Refactoring code
  - `chore:` - Maintenance, dependencies, or scaffolding (like your recent structure init)
  - `docs:` - Documentation
  - `style:` - Styling/formating
  - `perf:` - Performance
  - `test:` - Tests
  - `build:` - Changes to build scripts, dependencies, or configs

- Keep summary under 72 characters.
- Use present tense.
- Be concise.
- Do NOT include file paths unless necessary.
- Do NOT include emojis.

### Example:

feat(auth): implement JWT refresh token flow

- Add refresh token endpoint
- Store refresh token in HTTP-only cookie
- Update auth middleware

Return only the final commit message.

DO NOT auto-commit - wait for user appoaval, and only commit if the user says so.
Return plain text only. Do not wrap output in markdown.
