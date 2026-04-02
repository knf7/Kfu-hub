# Design Tokens

`design-tokens.ts` is the single source of truth for foundational UI values.

## What is centralized

- Brand and semantic colors
- Radius scale
- Shadow scale
- Spacing and typography weights
- Variant token maps for `Button`, `Card`, `Input`, `Badge`, and `Toast`

## Live example

`app/(auth)/login/page.tsx` now consumes:

- `Button` / `Input` from `shared/ui`
- `designTokens.radius.xl` directly on the auth card

This demonstrates token-driven UI changes without page-specific hardcoding.
