# Features Directory Guide

This folder contains feature-owned modules to keep the application scalable and easier to maintain.

## Current Features

- `dashboard/`
- `loans/`
- `customers/`

Each feature can contain:

- `pages/` for feature entry components
- `styles/` for feature-scoped CSS
- `components/`, `hooks/`, `services/` (add as needed)
- `index.ts` for public exports

## Routing Rule

Keep route files in `src/app/*` as thin wrappers only.  
Real implementation should live in `src/features/*`.

## Shared Rule

Do not duplicate generic UI primitives inside features.  
Use shared primitives from `src/shared/ui/*` and global tokens from `src/tokens/design-tokens.ts`.
