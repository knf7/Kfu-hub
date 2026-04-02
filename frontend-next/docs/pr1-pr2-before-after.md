# PR1 + PR2 Migration Report (Before/After + Rationale)

Date: 2026-04-02  
Scope: `frontend-next/src`

## PR1 — Feature-Based Structure

### 1) Route implementation location

Before:
- Business-heavy page code lived directly inside route files:
  - `src/app/dashboard/page.tsx`
  - `src/app/dashboard/loans/page.tsx`
  - `src/app/dashboard/customers/page.tsx`

After:
- Route files became thin wrappers:
  - `src/app/dashboard/page.tsx` -> exports from `@/features/dashboard/pages/dashboard-page`
  - `src/app/dashboard/loans/page.tsx` -> exports from `@/features/loans/pages/loans-page`
  - `src/app/dashboard/customers/page.tsx` -> exports from `@/features/customers/pages/customers-page`

Rationale:
- Keeps `app/` routing-focused and avoids coupling route concerns with feature logic.
- Makes feature modules portable and easier to test/extend.

### 2) Feature directories and boundaries

Before:
- No consistent feature ownership layout for core modules.

After:
- Created dedicated feature folders:
  - `src/features/dashboard/*`
  - `src/features/loans/*`
  - `src/features/customers/*`
- Added feature barrel exports:
  - `src/features/dashboard/index.ts`
  - `src/features/loans/index.ts`
  - `src/features/customers/index.ts`
- Added `src/features/README.md` with rules for new features.

Rationale:
- Establishes a predictable scaling pattern.
- Reduces accidental cross-module dependency drift.

### 3) CSS ownership for migrated features

Before:
- Feature CSS files were colocated under route directories in `app/dashboard/*`.

After:
- Moved CSS into feature-scoped paths:
  - `src/features/dashboard/styles/dashboard.css`
  - `src/features/loans/styles/loans.css`
  - `src/features/customers/styles/customers.css`
- Updated `src/app/globals.css` imports to the new paths.

Rationale:
- Aligns style ownership with feature ownership.
- Prevents style location confusion during future refactors.

### 4) Architecture documentation

Before:
- No concise, explicit rule document for route/feature responsibilities.

After:
- Added `src/ARCHITECTURE.md` with:
  - current structure
  - migration rules
  - route-to-feature mapping

Rationale:
- Creates shared team contract for how new modules should be built.

---

## PR2 — Design Tokens + Central UI Primitives

### 1) Single source of visual truth

Before:
- Visual values and variants were fragmented across components/pages.

After:
- Added:
  - `src/tokens/design-tokens.ts`
  - `src/tokens/README.md`
- Centralized:
  - colors
  - radius
  - spacing
  - typography weights
  - component variant tokens (`button`, `card`, `input`, `badge`, `toast`)

Rationale:
- Enables consistent visual language and cheaper global theming adjustments.

### 2) Centralized reusable UI primitives

Before:
- UI primitives existed in legacy location with no token-first layer.

After:
- Added token-driven components in `src/shared/ui/`:
  - `button.tsx`
  - `card.tsx`
  - `input.tsx`
  - `badge.tsx`
  - `toast.tsx`
  - `index.ts`
- Backward compatibility preserved by re-exporting legacy paths under `src/components/ui/*`.

Rationale:
- Consolidates UI behavior/variants in one place while avoiding breaking imports during migration.

### 3) Live token usage example

Before:
- No explicit page-level example showing direct token consumption.

After:
- Updated login page:
  - `src/app/(auth)/login/page.tsx`
- Uses:
  - `Button`, `Input` from `@/shared/ui`
  - `designTokens.radius.xl` for card radius

Rationale:
- Demonstrates how page styles become token-driven instead of hardcoded values.

### 4) Centralized toast semantics (foundation)

Before:
- No token-driven semantic toast wrapper in the shared UI layer.

After:
- Added `appToast` helper in `src/shared/ui/toast.tsx` with semantic variants (`success`, `warning`, `error`, `info`).
- Kept compatibility via shared toaster export path for gradual adoption.

Rationale:
- Standardizes feedback UX and enables incremental migration without breaking existing flows.

---

## Validation Summary

- Build status: passes (`npm run build` in `frontend-next`).
- Lint status: existing repository-wide lint debt still present in unrelated files.
- Migration approach: non-breaking (route wrappers + re-exports) to allow gradual adoption.

## Next Step Suggested (Post-PR2)

1. Migrate remaining imports from `@/components/ui/*` to `@/shared/ui/*` feature-by-feature.
2. Add visual regression snapshots for shared primitives.
3. Introduce feature-local tests per migrated module.
