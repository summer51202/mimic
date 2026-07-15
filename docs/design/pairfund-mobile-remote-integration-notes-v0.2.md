# PairFund Mobile Remote Integration Notes v0.2

## Purpose

This note describes how the Flutter app should switch from demo repositories to remote repositories, and what to verify during the first real backend integration pass.

## Current mode behavior

The mobile app supports two API modes:

* `demo`
* `remote`

`demo` is the default mode so the app can render without a running backend.

`remote` turns on the real API client and remote repositories for:

* auth
* home summary
* fund detail
* settlement summary
* expense create

## Runtime configuration

The app reads runtime config from `dart-define`.

Supported keys:

* `PAIRFUND_API_MODE`
* `PAIRFUND_API_BASE_URL`

Examples:

```powershell
flutter run --dart-define=PAIRFUND_API_MODE=demo
```

```powershell
flutter run --dart-define=PAIRFUND_API_MODE=remote --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3000/api/v1
```

Default base URL:

```text
http://localhost:3000/api/v1
```

## Recommended first integration order

Do not switch every screen to remote mode and debug everything at once.

Recommended order:

1. `Auth`
2. `Home`
3. `Fund detail`
4. `Settlement`
5. `Expense create`

This keeps failures easier to localize because later screens depend on earlier auth and summary data.

## Current remote endpoint assumptions

### Auth

* `POST /auth/login`

Expected response shape:

```json
{
  "data": {
    "user": {
      "id": "user-1"
    },
    "access_token": "access-token",
    "refresh_token": "refresh-token"
  }
}
```

### Home

The current home repository builds summary data from:

* `GET /me`
* `GET /groups`
* `GET /groups/{groupId}/funds`

This means mobile home does **not** currently use a dedicated dashboard endpoint.

### Fund detail

The current fund repository assumes:

* `GET /funds/{fundId}`
* `GET /funds/{fundId}/expenses?page=1&page_size=3`
* `GET /funds/{fundId}/contributions?page=1&page_size=3`

Expected `GET /funds/{fundId}` shape:

```json
{
  "data": {
    "fund": {
      "id": "fund-1",
      "name": "Date Fund",
      "currency": "TWD"
    },
    "summary": {
      "balance_minor": 6400,
      "month_expense_minor": 1280,
      "month_contribution_minor": 2000,
      "locked_period_label": "Locked through 2026-03-31",
      "member_positions": [
        {
          "display_name": "Edward",
          "position_minor": 800
        }
      ]
    }
  }
}
```

### Settlement

The current settlement repository assumes:

* `GET /funds/{fundId}/settlement-suggestion`
* `GET /funds/{fundId}/settlements?page=1&page_size=5`

Expected suggestion shape:

```json
{
  "data": {
    "currency": "TWD",
    "period_start": "2026-03-01",
    "period_end": "2026-03-31",
    "suggestions": [
      {
        "from_user_id": "partner-user",
        "to_user_id": "edward-user",
        "amount_minor": 800
      }
    ]
  }
}
```

### Expense create

The current expense repository posts to:

* `POST /funds/{fundId}/expenses`

Current mobile payload shape:

```json
{
  "title": "Dinner",
  "note": "Weeknight date",
  "amount_minor": 880,
  "split_mode": "equal",
  "expense_type": "fund_expense",
  "occurred_on": "2026-04-10",
  "payers": [
    {
      "payer_user_id": "user-1",
      "amount_minor": 880
    }
  ],
  "splits": [
    {
      "user_id": "user-1",
      "split_type": "equal",
      "sort_order": 1
    },
    {
      "user_id": "user-2",
      "split_type": "equal",
      "sort_order": 2
    }
  ]
}
```

## First remote-mode verification checklist

When turning on `remote`, verify in this order:

1. Login works and stores a session in memory.
2. Home loads `/me`, `/groups`, and `/groups/{groupId}/funds`.
3. Fund detail renders balance, positions, and activity.
4. Settlement renders period and suggestion summary.
5. Expense submit returns success or a readable API error.

## Known gaps before production-ready integration

These are intentionally still incomplete:

* access token persistence to secure storage
* refresh token flow
* auth header injection in Dio
* create fund remote API
* activity list remote API
* correction create remote API
* tasks / confirmations remote API
* settings remote API

## Recommended next engineering step

After the first successful remote pass, prioritize:

1. auth token persistence
2. auth header injection
3. create fund remote flow
4. confirmations and tasks remote flow
