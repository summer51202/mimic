# Cross-Platform Alpha Readiness Design

## Goal

Prepare PairFund for a small iOS and Android alpha cohort that can install the app, sign in to the same Backend environment, exercise the shared-accounting core flow, and provide useful product feedback.

## Scope

- Stabilize shared auth/profile/session behavior used by both platforms.
- Fix the profile update contract mismatch so Mobile uses `PATCH /me`.
- Verify token refresh behavior for 401 retry, refreshed session persistence, and refresh failure cleanup.
- Define Android and iOS installation readiness checklists.
- Define a cross-platform acceptance checklist for one Android user and one iOS user sharing the same group.
- Document alpha tester expectations and known limitations.

This alpha readiness batch does not add transaction edit/delete, categories, audit log browsing, recurring rules, public store release, billing, or production observability.

## Architecture

Keep the first implementation batch focused on shared foundation work:

- Backend `UsersController` owns the `GET /me` and `PATCH /me` HTTP contract.
- Mobile `RemoteSettingsRepository` owns the profile read/write transport shape.
- Mobile `dio_provider.dart` owns token refresh, retry, persistence, and refresh-failure session cleanup.
- Documentation owns install and tester-facing alpha guidance.

Android and iOS builds should point to the same alpha Backend URL. Platform-specific packaging is intentionally handled as checklist-driven release work after the shared auth/session foundation is verified.

## Profile Contract

The API contract for updating the current user profile is:

```text
PATCH /api/v1/me
{
  "display_name": "Edward Lee",
  "locale": "zh-TW",
  "timezone": "Asia/Taipei"
}
```

The response remains wrapped in the existing `{ data: ... }` envelope with `id`, `email`, `display_name`, `locale`, and `timezone`.

To reduce rollout risk, the implementation may temporarily keep the existing `POST /me` Backend route as a compatibility alias, but the documented and Mobile-used route is `PATCH /me`.

## Session Refresh Behavior

The expected Mobile behavior is:

- attach the current access token to authenticated requests;
- when a protected request returns 401, call `POST /auth/refresh` with the stored refresh token;
- if refresh succeeds, persist the new session, update the Authorization header, and retry the original request once;
- if refresh fails or returns malformed data, clear the local session and allow the app to return to sign-in;
- do not retry refresh requests recursively;
- do not retry a request more than once after refresh.

These behaviors should be covered with focused unit tests before any packaging work is treated as alpha-ready.

## Installation Readiness

Android readiness covers:

- produce a release or profile APK suitable for a small test cohort;
- confirm the package points to the alpha Backend URL;
- install on at least one physical Android device;
- verify launch, login, logout, and session persistence after app restart.

iOS readiness covers:

- prefer TestFlight for the first mixed-platform cohort;
- use Ad Hoc or Xcode install only as a small-device fallback;
- confirm the iOS build points to the same alpha Backend URL;
- install on at least one physical iOS device;
- verify launch, login, logout, and session persistence after app restart.

iOS does not install Android APKs. It needs an iOS build distributed through TestFlight, Ad Hoc, Xcode, or another Apple-supported mechanism.

## Cross-Platform Acceptance Checklist

Run at least one paired scenario:

1. Android user A registers or signs in.
2. iOS user B registers or signs in.
3. A creates a group and fund.
4. A creates an invite.
5. B accepts the invite.
6. Both devices can see the same group, member list, fund, dashboard, and fund summary.
7. A adds a contribution; B refreshes and sees it.
8. B adds an expense; A refreshes and sees it.
9. Both devices see the same settlement suggestion.
10. One authorized user completes a settlement.
11. Both devices see the completed settlement state and locked period behavior.

This scenario validates the product's core shared-accounting promise across platforms without expanding into every future feature.

## Alpha Tester Guidance

Tester-facing guidance should state:

- this is an alpha build for feedback, not a formal financial record;
- test data may be reset during development;
- transaction edit/delete, categories, and audit log browsing are known limitations;
- testers should report device model, OS version, app build, account email, steps taken, expected result, actual result, and screenshots when useful.

## Testing

Use focused tests for the first implementation batch:

- Backend HTTP or controller test proving `PATCH /me` updates the current profile and returns the standard envelope.
- Mobile settings repository test proving profile update uses `PATCH /me`.
- Mobile Dio refresh tests covering successful retry, refresh failure cleanup, no recursive refresh retry, and no second retry loop.
- Existing settings/profile/auth tests remain passing.

Final verification for the first batch should run Backend focused tests, Mobile focused settings/network tests, and any already-established full-suite command that is practical in the local environment.

## Documentation

After implementation and verification:

- Update `.agents/features.md` for `user-profile-update` and `token-refresh` if the tested behavior is complete.
- Append `.agents/devlog.md` with changed files, verification results, decisions, and known gaps.
- Add or update a concise alpha readiness checklist document for Android and iOS installation plus cross-platform acceptance.
