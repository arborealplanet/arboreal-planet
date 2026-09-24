# Arboreal Planet

Arboreal Planet is a reptile community platform: education, entertainment, and tooling for keepers and breeders.

- **Arboreal Keeper** — browser game where you keep and breed green tree pythons.
- **Snake Sorter** — green tree python photo catalog and subspecies classifier, taxonomy per Natusch et al. 2020.
- **Snake Stocks** — market tracking for green tree python listings (asking prices, price changes, relistings, time-to-sale). Tracks the market; it does not buy or sell.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + inference vars
npm run dev                  # http://localhost:3000
npm run build
npm start
```

Run `npm run migrate:legacy` once on a fresh clone — it applies the one-time asset/tree migration scripts. It does not run automatically.

## Key API routes

- `POST /api/gtp-harvest/import` — GTP market harvest import (contract: `docs/muse-gtp-harvest-import.md`)
- `/api/snake-sorter/acquisition/*` — Snake Sorter capture pipeline (`media-upload`, `media-review`, `backfill-plan`, `capture-jobs`, `collector-control`, …)
- `/api/market/*` — Snake Stocks snapshots and explorer data

## Repo layout

```
src/                 Next.js app (routes under src/app, shared code in src/lib)
ml/                  Snake Sorter Python model + policy tests
tools/               Operator tooling (browser helper extension, capture scripts)
scripts/             Build/maintenance scripts (CI-validated)
docs/                Docs incl. the harvest import contract
supabase/migrations/ Database migrations
public/              Static assets (incl. the abb-site static build served via rewrites)
```

## Capture rule

MorphMarket capture is **screenshots only** — never download listing images or fetch CDN URLs. Captured photos stay private; they are never published.
