# PairFund Alpha Readiness

## Audience

This alpha is for a small trusted iOS and Android test cohort. It is for product feedback, not formal financial record keeping.

## Known Limitations

- Test data may be reset during development.
- Transaction edit/delete is not available yet.
- Expense categories are not available yet.
- Audit log browsing is not available yet.
- Recurring rules are out of scope for MVP alpha.

## Android Install Checklist

- Build points to the alpha Backend URL.
- APK or internal testing build installs on a physical Android device.
- App launches without a blank screen.
- Login, logout, and app restart session persistence work.

## iOS Install Checklist

- TestFlight is the preferred distribution path.
- Ad Hoc or Xcode install is only a small-device fallback.
- Build points to the same alpha Backend URL as Android.
- App installs on a physical iOS device.
- Login, logout, and app restart session persistence work.

## Cross-Platform Acceptance Scenario

1. Android user A registers or signs in.
2. iOS user B registers or signs in.
3. A creates a group and fund.
4. A creates an invite.
5. B accepts the invite.
6. Both devices show the same group, members, fund, dashboard, and fund summary.
7. A adds a contribution; B refreshes and sees it.
8. B adds an expense; A refreshes and sees it.
9. Both devices see the same settlement suggestion.
10. One authorized user completes a settlement.
11. Both devices show the completed settlement state and locked period behavior.

## Feedback Format

Please include:

- device model;
- OS version;
- app build/version;
- account email used for testing;
- steps taken;
- expected result;
- actual result;
- screenshot or screen recording when useful.
