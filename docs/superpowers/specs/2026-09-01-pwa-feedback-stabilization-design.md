# PWA Feedback Stabilization Design

## Context

Three issues were reported in the authenticated Web PWA:

1. The `Opening treasury` route state disappears too quickly during navigation.
2. Pixel frames render visibly different decoration on their top, bottom, left, and right edges.
3. Creating a group reports that the service is unavailable and appears to terminate the service.

Railway staging evidence shows that `mimic-api` remains online. The relevant Web logs contain `ApiError: SESSION_REQUIRED`, while the client mutation helper maps that response to the generic service-unavailable message. The failure is therefore an expired or missing access-token path in client mutations, not a NestJS process exit.

## Goals

- Keep the treasury loading state visible for approximately one second when opening the treasury route.
- Render the shared `PixelFrame` primitive with visually identical edge treatment on all four sides at every supported viewport.
- Let authenticated client mutations recover once from an expired access token without duplicating the mutation.
- Preserve entered form values when recovery fails and show an accurate session-related message.
- Add regression coverage for each behavior.

## Non-goals

- A global route-transition framework or application-wide artificial delay.
- A new raster frame asset or changes to Mimiku artwork.
- Backend group-creation domain changes; current evidence does not identify a backend create transaction failure.
- Multiple retries, background retry queues, or offline mutation persistence.

## Design

### Treasury loading duration

The `/app` treasury page will include a minimum-duration promise alongside its existing reads. Data fetching and the delay will run concurrently, so the route resolves after both the real data and approximately 1,000 milliseconds are ready. This keeps the existing App Router `loading.tsx` boundary and accessible `role="status"` UI, while limiting the intentional delay to the treasury route.

The delay is a presentation floor, not a timeout: slow requests continue to display the loading state until they complete. Other authenticated pages are unaffected.

### Symmetric pixel frame

The shared `PixelFrame` will stop using the asymmetric raster nine-slice `border-image`. It will use CSS borders, outlines or inset layers, and stepped shadows whose values apply uniformly to all four edges. The selected direction is option B from the visual comparison: a scalable, symmetric CSS pixel frame with the existing warm gold/brown palette.

All variants continue to share the same edge geometry; variants may still differ in background, padding, maximum width, and shadow depth. The frame keeps its existing DOM API and `data-variant` contract.

### Session refresh and mutation retry

The client mutation helper will execute this bounded flow:

1. Obtain a CSRF token and send the requested mutation.
2. If the response is not `401`, handle it normally.
3. If the response is `401`, call the refresh endpoint using the same CSRF protection.
4. If refresh succeeds, obtain a fresh CSRF token and retry the original mutation exactly once.
5. If refresh fails or the retried mutation is still unauthorized, return a session-expired client error without another retry.

The refresh endpoint will support a JSON mutation response suitable for programmatic recovery while preserving the existing GET redirect flow used by server-side route guards. A successful refresh rotates and writes the auth cookies. No access or refresh token is exposed to client JavaScript.

The group form remains mounted throughout recovery. Its controlled inputs therefore retain the user's name, type, and currency. The submit button remains disabled while the bounded refresh-and-retry sequence runs, preventing duplicate group creation.

## Error handling

- Validation and domain errors keep their existing mappings.
- An unrecoverable `401` maps to a clear sign-in/session-expired message rather than the service-unavailable message.
- Network, configuration, and unknown upstream failures retain the existing safe generic message.
- Refresh is attempted only for `401`; `403` remains a permission or CSRF failure and is not retried.

## Testing

- Add a route-level test proving the treasury page awaits a minimum-duration dependency concurrently with its reads.
- Update the pixel UI contract test to reject `border-image` use and require symmetric CSS edge primitives.
- Add client helper tests that prove a `401` causes one refresh and one mutation retry, that a successful first request is not retried, and that repeated unauthorized responses stop after one retry.
- Extend group form coverage to prove the form values remain and the mutation is not duplicated during recovery.
- Add refresh-route coverage for the programmatic response and cookie rotation while retaining existing redirect tests.
- Run Web lint, typecheck, unit tests, and production build with the required API base URL.

## Alternatives considered

### Global transition overlay

A client-side navigation controller could hold every loading overlay for a minimum duration. It would cover more routes but introduce cross-route state, focus-management, and synchronization complexity that is not justified by this treasury-specific request.

### Server-side BFF refresh for every request

The BFF could refresh credentials inside its forwarding layer. That would centralize recovery but requires forwarding rotated cookies through every response shape and carefully handling concurrent requests. The client helper is the smaller boundary for the current mutation bug.

### Retune the raster nine-slice frame

Changing `border-image-slice` and repeat values would be smaller, but the source asset has intrinsically different horizontal and vertical edge artwork. It cannot guarantee consistent four-sided rendering across component aspect ratios.
