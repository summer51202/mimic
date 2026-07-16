# Home Settings Entry Design

## Goal

Make the existing sign-out action reachable from the authenticated home screen so two-account invite acceptance can be completed without manually clearing browser storage.

## Design

- Add a settings icon button to the right side of the PairFund heading on `HomeDashboardScreen`.
- Give the button an accessible `Settings` tooltip.
- Navigate through the existing `AppRoutes.settings` route.
- Keep sign-out behavior exclusively in `SettingsScreen`; do not duplicate authentication logic on the home screen.
- Preserve the current narrow-screen layout and all existing home actions.

## Verification

- A widget test starts from the home screen, taps the Settings button, and verifies that the Settings route is reached.
- Existing home, settings, router, and full Flutter tests remain green.
- Flutter Web remote mode continues to return HTTP 200.

## Out of Scope

- Bottom navigation or a profile menu.
- Changes to logout semantics or backend session handling.
