# PairFund Mobile

Flutter client for PairFund. The app supports demo repositories and a remote
mode backed by the NestJS API.

## Run with the local remote API

The local WSL Docker setup exposes the PairFund API on port 3001 because port
3000 is used by Grafana on the current development machine.

```powershell
flutter pub get
flutter run -d chrome --web-port 8080 `
  --dart-define=PAIRFUND_API_MODE=remote `
  --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
```

Demo credentials:

```text
demo@pairfund.local
password
```

## Verify

```powershell
flutter test
flutter build web `
  --dart-define=PAIRFUND_API_MODE=remote `
  --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
```
