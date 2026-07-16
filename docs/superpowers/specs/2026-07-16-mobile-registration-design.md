# Mobile Registration Design

## Goal

Allow a new user to create an account from the existing authentication screen and immediately enter PairFund, enabling the two-account invite acceptance flow entirely through the app.

## User Experience

- The authentication card defaults to **Sign in**.
- A **Create account** text button switches the card to registration mode.
- Registration mode shows Display name, Email, and Password fields.
- The primary action reads **Create account** while registration is active.
- An **Already have an account? Sign in** action returns to login mode.
- A successful registration persists the returned session and navigates to Home.
- A failed registration leaves the form visible and shows a stable registration-specific error message.
- Submission disables relevant controls to prevent duplicate requests.

## Architecture

- Extend `AuthRepository` with `register(displayName, email, password)` and implement it in demo and remote repositories.
- Reuse `AuthSessionPayload` and the existing remote auth mapper because the backend register response has the same token/session envelope as login.
- Extend `AuthController` with `register`, sharing private session-persistence logic with `login`.
- Keep login/register presentation state local to `LoginScreen`; server request state remains in `AuthController`.
- Reuse the existing `/login` route rather than adding a new route.

## Validation and Errors

- Display name must be non-empty before submitting registration.
- Email and password remain subject to backend validation; the UI prevents empty values.
- Login failures continue to show `Unable to sign in right now.`
- Registration failures show `Unable to create your account right now.`

## Testing

- Repository tests verify exact `/auth/register` payload and response mapping.
- Controller tests verify session persistence after registration and registration-specific failure state.
- Widget tests verify mode switching, Display name visibility, registration submission, and navigation behavior.
- Full Flutter tests and remote Web build must pass.

## Out of Scope

- Email verification, password confirmation, password-strength UI, password reset, social login, and a separate registration route.
