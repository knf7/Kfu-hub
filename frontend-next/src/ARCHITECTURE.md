# Frontend Architecture (Feature-Based)

This project now follows an initial feature-based structure to reduce coupling and make scaling safer.

## Core Layout

- `app/`
  - Route entry points only.
  - Each route page should be a thin wrapper that imports from `features/*`.
- `features/`
  - Feature-owned pages, styles, and feature-specific logic.
  - Current migrated features:
    - `dashboard`
    - `loans`
    - `customers`
- `shared/ui/`
  - Central design-system components (Button/Card/Input/Badge/Toast).
- `tokens/`
  - Visual tokens used by shared UI (colors, radius, spacing, shadows).
- `components/`, `hooks/`, `lib/`, `providers/`
  - Existing cross-app modules, gradually moving toward `shared/*` and `features/*`.

## Migration Rule

When creating a new dashboard module:

1. Put implementation in `features/<feature-name>/`.
2. Keep route files in `app/` as wrappers.
3. Keep styles feature-local (`features/<feature>/styles/*`).
4. Reuse UI through `shared/ui` only.

## Initial Route Mapping

- `app/dashboard/page.tsx` -> `features/dashboard/pages/dashboard-page.tsx`
- `app/dashboard/loans/page.tsx` -> `features/loans/pages/loans-page.tsx`
- `app/dashboard/customers/page.tsx` -> `features/customers/pages/customers-page.tsx`
