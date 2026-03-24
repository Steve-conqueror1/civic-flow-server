# Spec for user-status-management

branch: claude/api-feat/user-status-management

## Summary

Introduce explicit, dedicated endpoints that allow admins and super admins to set a user's status to any of the four supported values: `active`, `inactive`, `suspended`, or `deleted`. Each status transition has its own route so that intent is unambiguous and permissions/business rules can be enforced per action.

The existing `PATCH /:id/deactivate` handler toggles active/inactive as a side effect. This feature replaces that implicit toggle with four explicit status endpoints and removes the ambiguity. The existing `DELETE /:id` soft-delete and the `status` field on `PATCH /:id` admin update remain but should be audited for overlap once these new endpoints are live.

The `userStatusEnum` (`active | inactive | suspended | deleted`) is already defined in `users.schema.ts` — no schema changes are needed.

## Functional Requirements

- `PATCH /api/v1/users/:id/activate` — sets the target user's status to `active`. Requires `admin` or `super_admin` role.
- `PATCH /api/v1/users/:id/deactivate` — sets the target user's status to `inactive`. Requires `admin` or `super_admin` role.
- `PATCH /api/v1/users/:id/suspend` — sets the target user's status to `suspended`. Requires `admin` or `super_admin` role.
- `DELETE /api/v1/users/:id/status` (or `PATCH /api/v1/users/:id/delete`) — sets the target user's status to `deleted` (soft delete). Requires `super_admin` role only.
- All four endpoints accept a UUID in the path param `id` and return the updated user object (without `passwordHash`).
- An optional `reason` string field may be included in the request body for audit purposes (not stored in DB, logged or returned in response metadata).
- A user may not change their own status via these endpoints (self-action guard).
- An `admin` may not change the status of another `admin` or `super_admin` — only `super_admin` can act on other admins.
- Attempting to set a user to their current status returns a `409 Conflict`.
- A `deleted` user cannot be reactivated via the activate endpoint — once deleted, only a `super_admin` acting via the general admin update endpoint may restore them (out of scope for this feature).

## Possible edge cases (only if referenced)

- Target user does not exist → `404 Not Found`.
- Actor tries to act on themselves → `403 Forbidden` with message indicating self-action is not allowed.
- `admin` tries to suspend or delete another `admin` or `super_admin` → `403 Forbidden`.
- Status is already the requested value → `409 Conflict` with a clear message.
- `id` path param is not a valid UUID → `400 Bad Request`.
- The last `super_admin` account should not be deleteable or deactivatable — guard against locking out the system.

## Acceptance Criteria

- `PATCH /:id/activate` returns `200` with the updated user when called by an authorised admin and the target is not already `active`.
- `PATCH /:id/deactivate` returns `200` with the updated user when the target is not already `inactive`.
- `PATCH /:id/suspend` returns `200` with the updated user when the target is not already `suspended`.
- The delete-status endpoint returns `200` with the updated user (status = `deleted`) when called by a `super_admin`.
- All four endpoints return `404` when the target user ID does not exist.
- All four endpoints return `403` when:
  - the caller is an `admin` targeting another `admin` or `super_admin`, or
  - the caller is targeting themselves.
- All four endpoints return `409` when the target user is already in the requested status.
- The `super_admin` last-account guard prevents deletion/deactivation and returns `403`.
- `passwordHash` is never present in any response body.

## Open Questions

- Should `deleted` status be its own `PATCH /:id/delete` route or reuse the existing `DELETE /:id`? Using `PATCH` is more consistent with the other status endpoints and avoids confusion with HTTP DELETE semantics on soft deletes. Use PATCH
- Should a `reason` field be persisted (e.g., in a new `statusChangedReason` column or an audit log table)? Currently out of scope per the no-schema-change rule, but worth flagging for future work. Use user_status_audit table, I have created
- Should suspended users have their active sessions (JWT / refresh tokens) revoked in Redis immediately on suspension? This would require calling the token revocation logic from within the status service. Worth discussing before implementation. Yes
- Is there a grace period or notification (email) when a user is suspended or deactivated? Not included in this spec but could be added as a follow-on. Notify user about account suspension

## Testing Guidelines

Create a test file(s) in the `./tests` folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- `PATCH /:id/activate` succeeds when called by `super_admin` on an `inactive` user.
- `PATCH /:id/deactivate` succeeds when called by `admin` on an `active` citizen.
- `PATCH /:id/suspend` succeeds when called by `super_admin` on an `active` user.
- Delete-status endpoint succeeds when called by `super_admin` on a non-super-admin user.
- Returns `403` when an `admin` tries to suspend another `admin`.
- Returns `403` when a user tries to change their own status.
- Returns `404` when the target user ID does not exist.
- Returns `409` when the target user is already in the requested status.
- Last `super_admin` guard: returns `403` when the only `super_admin` is targeted for deletion or deactivation.
- `passwordHash` is absent from all response bodies.
