<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repo conventions

- **Branches:** `main` only. Delete merged branches promptly; audit unmerged ones before deleting.
- **MorphMarket capture:** screenshots only — never download listing images or fetch CDN URLs. Captured photos stay private, never published.
- **Harvest contract:** `docs/muse-gtp-harvest-import.md` plus the master harvest prompt (with the owner). Server code must match the contract.
- **Migrations:** DB changes go in `supabase/migrations/`. One-time tree/asset migrations live in `scripts/` and run via `npm run migrate:legacy` — never in pre-hooks or lint.
