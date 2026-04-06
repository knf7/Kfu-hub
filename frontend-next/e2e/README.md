# E2E Testing Strategy

## Default CI suite (stable)
- `npm run test:e2e:smoke`
- Uses mocked API responses to validate:
  - Dashboard KPI rendering
  - Quick-entry navigation
  - Monthly report Excel export request
  - Blocking error state behavior

## Real auth flow (optional)
- `E2E_REAL_AUTH=true npm run test:e2e -- e2e/auth.real.spec.ts`
- Runs only when explicitly enabled to avoid flaky CI on external dependencies.
