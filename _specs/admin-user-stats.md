# Spec for Admin User Stats

branch: claude/api-feat/admin-user-stats

## Summary

Add a new admin-only endpoint that returns a summary of user statistics across the platform. The response will include four counters: total users, total staff (admins and super admins combined), inactive users (users who have not verified their email or have never logged in), and suspended users (users who have been explicitly locked out or flagged as inactive by an admin).

## Functional Requirements

- Expose a `GET /api/v1/admin/users/stats` endpoint.
- The endpoint must be protected: only `admin` and `super_admin` roles may access it.
- The response must return a single JSON object with four numeric fields:
  - `totalUsers` — count of all users in the system regardless of role or status.
  - `totalStaff` — count of users whose role is `admin` or `super_admin`.
  - `inactiveUsers` — count of users whose `isVerified` flag is `false` (email not verified).
  - `suspendedUsers` — count of users whose `isActive` flag is `false`.
- All four counts must be computed in a single efficient database query (or the minimum number of queries possible).
- The endpoint must follow the existing module structure: router → controller → service → repository.

## Possible edge cases (only if referenced)

- A user can be both unverified (`isVerified: false`) and inactive (`isActive: false`); they must be counted in both `inactiveUsers` and `suspendedUsers` independently.
- Staff users (`admin`, `super_admin`) that are also inactive or unverified should still be included in the relevant counters.
- The counts must reflect the live state of the database at request time (no caching).

## Acceptance Criteria

- `GET /api/v1/admin/users/stats` returns HTTP 200 with the four stat fields when called by an `admin` or `super_admin`.
- Returns HTTP 401 when called without a valid access token.
- Returns HTTP 403 when called by a `citizen` role user.
- `totalUsers` equals the total row count of the `users` table.
- `totalStaff` equals the count of rows where `role IN ('admin', 'super_admin')`.
- `inactiveUsers` equals the count of rows where `isVerified = false`.
- `suspendedUsers` equals the count of rows where `isActive = false`.
- Response shape:
  ```json
  {
    "totalUsers": 120,
    "totalStaff": 5,
    "inactiveUsers": 18,
    "suspendedUsers": 3
  }
  ```

## Open Questions

- Should `inactiveUsers` be defined as unverified email only, or also include users who have never logged in? (Current spec uses `isVerified` as the proxy for inactive.) unverified email only.
- Is there a separate `isSuspended` or `isActive` column already on the `users` table, or does suspension map to an existing field? Use User Status enum; `active`, `inactive`, `suspended`, `deleted`

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Authenticated `admin` user receives a 200 response with the correct shape.
- Authenticated `super_admin` user receives a 200 response with the correct shape.
- Authenticated `citizen` user receives a 403.
- Unauthenticated request receives a 401.
- Each stat counter returns the correct value when the database contains a known set of users with varying roles and statuses.
