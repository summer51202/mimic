# PairFund Mobile Remote Readiness Checklist v0.2

## Purpose

This checklist shows which mobile flows are already prepared for `ApiMode.remote`, which flows are only partially prepared, and which screens are still demo-only.

This is a readiness document for engineering and integration, not a product spec.

## Current remote infrastructure status

These foundations are already in place:

* `dart-define` based runtime switching
  * `PAIRFUND_API_MODE=demo|remote`
  * `PAIRFUND_API_BASE_URL=...`
* `Dio` API client with base URL support
* bearer token injection from session state
* `ApiException` mapping for structured backend errors
* session persistence
  * login saves session
  * app startup restores session
  * logout clears session
* refresh-token retry strategy
  * 401 responses trigger `/auth/refresh`
  * successful refresh updates in-memory and persisted session
  * failed refresh clears session

## Status Legend

* `Ready`
  * Has remote repository path and usable UI flow
* `Partial`
  * Has some remote support, but important assumptions or gaps remain
* `Demo-only`
  * No real remote data path yet

## Remote readiness matrix

| Area | Status | Screen / Flow | Remote support | Notes |
|---|---|---|---|---|
| App bootstrap | Ready | app startup | session restore | Restores persisted session before routing |
| Auth | Ready | login | `POST /auth/login` | Logout also calls remote logout if available |
| Auth | Ready | refresh / re-auth | `POST /auth/refresh` | 401 retry is handled in the Dio transport layer |
| Home | Ready | dashboard summary | `GET /me`, `GET /groups`, `GET /groups/{groupId}/funds` | Uses aggregation, not a dedicated dashboard endpoint |
| Fund detail | Ready | fund detail | `GET /funds/{fundId}`, expenses list, contributions list | Recent activity is assembled from separate expense and contribution calls |
| Create fund | Ready | create fund form | `GET /groups`, `POST /groups/{groupId}/funds` | Assumes first returned group is the working group |
| Expense | Ready | create expense | `POST /funds/{fundId}/expenses` | Payload is MVP-level and uses current form assumptions |
| Correction | Ready | create correction | `POST /funds/{fundId}/expenses` with `expense_type=correction` | Reuses expense endpoint with correction payload |
| Settlement | Ready | settlement summary and completion | `GET /funds/{fundId}/settlement-suggestion`, `GET /funds/{fundId}/settlements`, `POST /settlements/{settlementId}/complete` | Summary and completion are both remote-capable |
| Tasks | Ready | pending tasks and confirmation actions | `GET /confirmations`, `POST /confirmations/{id}/approve`, `POST /confirmations/{id}/reject` | UI shows confirmation items as task cards, supports approve / reject, and can send optional comment payloads |
| Activity | Ready | activity screen | `GET /funds/{fundId}/expenses`, `GET /funds/{fundId}/contributions`, `GET /funds/{fundId}/settlements` | Aggregates remote fund activity into one timeline; no filters or record detail yet |
| Settings | Ready | settings profile | `GET /me`, `POST /me`, logout | Profile read/write and logout are remote-capable; notification preferences remain static/future |
| Categories | Demo-only | category management | none | Not implemented in mobile yet |
| Contributions create/edit | Partial | contribution flow | `POST /funds/{fundId}/contributions` | Create-only flow is remote-backed; edit/delete/restore are still not implemented |
| Expense edit/delete/restore | Demo-only | record maintenance | none | Create exists, edit lifecycle does not |
| Correction history linkage | Demo-only | trace original/correcting records | none | Current correction is independent create-only flow |
| Recurring rules | Demo-only | recurring contribution rules | none | No mobile management UI or remote layer yet |

## Remote-ready areas in more detail

### Ready now

These flows are ready for first-round backend integration:

1. `Login`
2. `Session restore on startup`
3. `Home dashboard summary`
4. `Fund detail`
5. `Create fund`
6. `Create expense`
7. `Create correction`
8. `Settlement summary and completion`
9. `Task list and confirmation actions`
10. `Fund activity timeline`

These are the best candidates for the first real backend verification pass.

### Partial

These areas have some remote integration, but should not be considered complete:

#### Auth refresh

Current state:

* access token is stored
* access token is injected into request headers
* 401 responses trigger refresh-token exchange
* the original request is retried after successful refresh
* refresh failure clears persisted and in-memory session

Current limitation:

* refresh requests are not deduplicated across multiple simultaneous 401 responses yet

#### Settings

Current state:

* sign out clears persisted session
* read current account profile from backend
* update locale / timezone / preferences
* persist settings changes remotely
* profile updates currently use `POST /me` because the shared mobile API client does not expose `patch()` yet

Current limitation:

* notification preferences are still static UI
* password/security settings are not implemented

## Demo-only areas

These still need real repositories and probably extra UI work:

* contribution history management
* expense edit / delete / restore
* recurring rules
* category management

## Current payload / response assumptions that may need backend alignment

### Home

Mobile currently derives dashboard data from:

* `/me`
* `/groups`
* `/groups/{groupId}/funds`

This means backend does not need a mobile-specific dashboard endpoint yet, but this is still an assumption.

### Create fund

Mobile currently picks the first group returned by `/groups`.

If multi-group handling becomes important, this should move to explicit selected-group state.

### Create correction

Mobile posts a correction as a normal expense create request with:

* `expense_type = correction`
* `split_mode = equal`

This matches the current product direction, but the backend must accept this payload shape.

### Tasks

Mobile currently assumes `GET /confirmations` is enough to build the task center.

If recurring reminders or non-confirmation tasks become first-class backend entities, this may need a dedicated task endpoint later.

Confirmation actions now support optional comment payloads from a lightweight dialog.

Current limitation:

* no required-comment rules
* no batch action flow
* no comment history display after submission

### Contributions

Mobile now supports create-only contribution entry through:

* `/funds/{fundId}/contributions`

Current limitations:

* no contribution list screen
* no contribution edit / delete / restore
* no contributor member picker yet

### Activity

Mobile currently builds the activity timeline by aggregating:

* `/funds/{fundId}/expenses`
* `/funds/{fundId}/contributions`
* `/funds/{fundId}/settlements`

This lets the screen show expenses, corrections, contributions, and settlements in one list without needing a dedicated backend activity endpoint yet.

Current limitations:

* no filters
* no record detail screen
* no pagination

## Recommended first remote integration order

Use this order for the first real backend pass:

1. `Login`
2. `Session restore`
3. `Home`
4. `Fund detail`
5. `Create fund`
6. `Create expense`
7. `Create correction`
8. `Settlement summary and completion`
9. `Tasks and confirmation actions`
10. `Fund activity timeline`

Do not start with edit flows, settings, or recurring rules.

## Recommended next engineering tasks

### Highest priority

* add contribution list and management flow
* add settings preference sync

### After that

* add record edit / delete / restore
* add recurring rule management
