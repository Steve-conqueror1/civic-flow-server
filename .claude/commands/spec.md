---
description: Create a backend feature spec file and git branch for CivicFlow API
argument-hint: Short backend feature description (e.g., "add citizen request attachment support")
allowed-tools: Read, Write, Glob, Bash(git switch:*)
---

You are helping to spin a new feature for CivicFlow API app from a short idea provided in the user input below.

User input: $ARGUMENTS

## High level behavior

Your job is to turn a feature idea into:

- A structured backend specification and a clean Git environment. Always adhere to the architecture defined in CLAUDE.md (Router -> Controller -> Service -> Repository).
- A detailed markdown spec file inder \_specs/ directory

Then save the spec file to disk and print a short summary of what you did.

## Step 1. Integrity Check

Check the current Git branch. If there are any uncommitted, unstaged, or untracked files, abort immediately. Notify the user: "Please commit or stash your active backend changes before starting a new feature spec."

## Step 2. Parse Feature Metadata

From `$ARGUMENTS`, extract:

1. `feature_title`: Human-readable Title Case (e.g., "Citizen Request Attachments").
2. `feature_slug`: Git-safe kebab-case (e.g., `citizen-request-attachments`). Max 40 chars.
3. `branch_name`: `claude/api-feat/<feature_slug>`.

## Step 3. Branch Management

Switch to a new Git branch using `branch_name`. If the branch exists, append a suffix (e.g., `-v2`).

## Step 4. Draft the Spec Content

Create a markdown file at `_specs/<feature_slug>.md`. Use the following backend-centric structure:

# Spec: [feature_title]

## Overview

Brief description of the business value for the CivicFlow platform.

## Functional Requirements

- ...

## Proposed API Changes

### Endpoints

- **Method**: (GET/POST/PATCH/DELETE)
- **Path**: `/api/...`
- **Auth/RBAC**: Required role (citizen, admin, etc.)

### Schema Requirements

- Identify existing Drizzle tables to be used (Note: Schema modification is restricted).
- List Zod validation requirements for request bodies.

## Logic Flow

1. **Controller**: What inputs are captured?
2. **Service**: What business rules are applied? (e.g., "Verify user owns the request before attachment").
3. **Repository**: What queries are executed?

## Security & Privacy

- List PII considerations.
- Detail ownership checks to prevent IDOR.

## Acceptance Criteria

- ...

## Open Questions

- ...

## Testing Plan

- Scenarios for `civicflow-api-test-generator`.
- ...

## Step 5. Final Output

After saving, respond exactly with:

Branch: <branch_name>
Spec file: \_specs/<feature_slug>.md
Title: <feature_title>
