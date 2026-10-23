# AURA Mall

Next.js demo storefront with product pages, category filters, search, reviews, and a persisted cart and wishlist. Checkout is a local preview with no real payments or orders.

This workspace contains the customer-facing frontend. The admin panel and its backend are maintained in a separate workspace.

## Run locally

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Copy `.env.example` to `.env.local` if you need custom environment settings.

## Project structure

```text
src/
  app/                  # Routes, metadata, loading states, global styles
  components/ui/        # Shared, domain-independent UI
  features/storefront/
    components/         # Storefront, cart, search, product, category UI
    data/catalog.ts     # Demo catalog and presentation helpers
    store.ts            # Persisted cart and wishlist state
  lib/                  # REST transport and mock utilities
  mocks/                # Typed backend foundation fixtures
  services/             # Commerce services and mock implementations
  types/                # Shared backend entity contracts
public/                 # Served WebP images and fonts
prisma/                 # Database schema, migration, SQL seed
scripts/                # Asset preparation and synthetic catalog tools
tests/                  # Playwright storefront tests
docs/
  design/               # Design references and original campaign PNGs
  PERFORMANCE.md        # Verification scope and performance limitations
```

Use `@/` imports for modules under `src/`. Keep routing files in `src/app`, storefront behavior in `src/features/storefront`, and reusable UI in `src/components/ui`.

## Checks

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
npm run test:e2e
```

Browser tests use installed Microsoft Edge and start the production server automatically. Build first. `npm run format` applies the shared formatting rules.

The storefront suite uses an isolated production server on port 3106 and stores its artifacts under `test-results/storefront`.

## Foundation map

- `src/types/commerce.ts` defines tenant, theme, catalog, cart, order, auth, coupon, and review contracts.
- `src/mocks/` contains four proof tenants and typed fixtures.
- `src/services/` holds the future commerce data interface.
- `src/lib/api.ts` is the REST transport.
- `src/lib/mock-utils.ts` provides latency, pagination, sorting, IDs, and missing-record behavior.

## Switch to a real backend

The storefront currently reads its demo catalog directly and stores shopping state locally. The service foundation is retained for future integration and is not yet connected to the UI. Setting `NEXT_PUBLIC_USE_MOCK=false` and `NEXT_PUBLIC_API_BASE_URL` switches service consumers to REST; it does not connect the storefront automatically. Database migration and seed execution remain unverified.

## Add a tenant

The mock tenants in `src/mocks/tenants.ts` are storefront service fixtures. Live shop configuration is managed by the separate backend; connecting that backend to this storefront remains integration work.

## Add a theme

Theme tokens are defined by `ThemeTokens` in `src/types/commerce.ts`. Add presets using the complete token contract.

## Assets and generated data

Optimized WebP images are served from `public/images`. Original campaign PNGs and design references are retained in `docs/design` outside the public directory.

- `node scripts/download-assets.mjs` downloads product images.
- `node scripts/resize-assets.mjs` generates image variants using Sharp.
- `node scripts/download-fonts.mjs` downloads fonts and a reference stylesheet.
- `npm run data:generate -- 100000` recreates synthetic products in `data/products.jsonl`.
- `node scripts/index-search.mjs` indexes that file when `MEILISEARCH_URL` and `MEILISEARCH_MASTER_KEY` are set.

Generated data, build caches, and browser artifacts are ignored. Synthetic products are not storefront inventory.
