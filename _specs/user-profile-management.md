# Spec for User Profile Management

branch: claude/api-feat/user-profile-management

## Summary

Users need the ability to manage their own profiles (view, edit, delete). Admins have elevated access to manage citizen users, while super_admins hold the highest privilege and can also manage admins. This spec covers the full RBAC-aware user management API surface — self-service profile management for citizens and administrative controls for admins and super_admins.

## Functional Requirements

### Self-Service (any authenticated user)

- A user can view their own profile.
- A user can edit their own profile (e.g. name, email, password). - password change already implemented by auth module
- A user can delete their own account.

### Admin Capabilities

- An admin can view a list of all users (citizens only).
- An admin can view the profile of any citizen.
- An admin can edit any citizen's profile.
- An admin can deactivate any citizen's account.
- An admin can delete any citizen's account.
- An admin can view a list of other admins and super_admins (read-only).
- An admin cannot edit, deactivate, or delete other admins or super_admins.

### Super Admin Capabilities

- A super_admin inherits all admin capabilities.
- A super_admin can edit any admin's profile.
- A super_admin can deactivate any admin's account.
- A super_admin can delete any admin's account.
- A super_admin cannot be edited, deactivated, or deleted by any other user (only by themselves or another super_admin if applicable).

## Possible Edge Cases

- A user attempting to delete or deactivate their own account while they are the last super_admin — should be blocked to prevent lockout.
- An admin attempting to modify another admin or super_admin via any endpoint must receive a `403 Forbidden`.
- A deactivated user should not be able to log in; the auth layer must check account status.
- Editing email should trigger re-verification if the email verification flow is active. yes
- Soft-delete vs hard-delete: clarify whether "delete" means a hard DB delete or a deactivation flag (recommend treating deactivation and deletion as separate concerns). deactivate for now
- Pagination and filtering must be considered for the admin list-users endpoint. yes

## Acceptance Criteria

- `GET /api/v1/users/me` returns the authenticated user's profile.
- `PATCH /api/v1/users/me` allows the authenticated user to update their own profile fields.
- `DELETE /api/v1/users/me` allows the authenticated user to delete their own account.
- `GET /api/v1/users` (admin+) returns a paginated list of citizen users; admins can also see a list of other admins and super_admins.
- `GET /api/v1/users/:id` (admin+) returns the profile of any user; admins can view admins/super_admins but cannot modify them.
- `PATCH /api/v1/users/:id` (admin+) allows editing a citizen's profile; super_admins can also edit admin profiles.
- `PATCH /api/v1/users/:id/deactivate` (admin+) deactivates a citizen; super_admins can deactivate admins - check user status enum
- `DELETE /api/v1/users/:id` (admin+) deletes a citizen account; super_admins can delete admin accounts.
- All endpoints that cross role boundaries return `403 Forbidden` with a clear message when access is denied.
- Passwords are never returned in any response payload.
- Suspended users receive a `403` (or `401`) on login attempts.

## Open Questions

- Should deactivation be a soft flag (`isActive: boolean`) on the users table, or does a separate status enum already exist? - use status enum
- Is "delete account" a hard delete from the DB or a soft delete (e.g. marking the record as deleted)? - soft delete
- Should an admin be able to re-activate a previously deactivated citizen account? yes
- Should editing a user's email trigger re-verification via the existing email verification flow? - yes
- What fields are editable via `PATCH /users/me` vs `PATCH /users/:id`? For example, can an admin change a user's role? yes, admin can change users role. users can only chnage basic info like firstName, lastName, phoneNumber, address, mfaEnabled
- Should there be audit logging for admin actions (edit, deactivate, delete)? yes

## Testing Guidelines

Create a test file in the `./tests` folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- A citizen can fetch and update their own profile; cannot access other users' profiles.
- A citizen cannot call admin endpoints (expects `403`).
- An admin can list, view, edit, deactivate, and delete citizen accounts.
- An admin receives `403` when attempting to edit, deactivate, or delete another admin or super_admin.
- A super_admin can edit, deactivate, and delete admin accounts.
- Passwords are never included in response bodies.
- A deactivated user cannot authenticate.
- Attempting to delete the last super_admin is rejected with an appropriate error.

## IMPORTANT

- A new user status enum has been added to the user schema with the following statuses: `active`, `inactive`, `suspended`, `deleted`
- `isActive` field has beed removed from the user schema.
