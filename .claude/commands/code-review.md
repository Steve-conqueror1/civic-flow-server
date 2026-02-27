---
description: Reviews uncommitted changes made on the current branch. It will use reviewer subagent: civicflow-api-code-reviewer.
allowed-tools: Bash(git diff), Bash(git diff --staged)
---

## Context:

- Current git diff (unstaged): !`git diff`
- Current git diff (staged): !`git diff --staged`

## Your Task:

You are coordinating a full review of the current branch changes for the CivicFlow project. Your job is to:

1. Collect the full diff from the context above (combining staged and unstaged changes).
2. Launch subagent using the Task tool, passing the full diff to the agent:
   - `civicflow-api-code-reviewer` — reviews for code quality, architecture, and best practices
3. Wait for agent to complete.
4. Present results clearly to the user.

### Rules:

- Pass the complete diff as context to agent so it can review independently.
- If there are no changes (empty diff), inform the user and do not launch the subagent.
- Do not summarize or editorialize the agent's output — present it as-is.
- Label each section clearly:

---

### Code Quality Review (civicflow-api-code-reviewer)

[output from civicflow-api-code-reviewer]

---

Rules:

- Do NOT edit any files yet.
- Do NOT run formatting-only changes unless they fix a cited issue.

Finish by asking:
"Do you want me to implement the action plan now?"

Wait for user confirmation before making any changes.
