# QA record — information architecture pass (2026-09-26)

Restructured the UI for scannability: grouped navigation, one demo strip, compact cards, tabbed detail pages, progressive filters and a stepped compiler (see `docs/design-system.md`). Page heights at 1440 px: home 4,458 → 2,071; implementation detail 8,495 → ~2,100 per tab; use case 5,065 → 1,397; compiler results 4,796 → 3,280.

- `npm run lint`, `npm run typecheck`, `npm test` (97) pass; `npm run test:e2e` **53 passed** (three new axe checks on non-default tabs). Detail-page E2E steps now select the relevant tab; they also cover keyboard tab navigation and the `?tab=` URL state.
- Found and fixed while testing: tab arrow-key navigation could use stale state under rapid key presses; it now moves from the focused tab.
- Demo browser storage namespace bumped to `oracnet:intel-v3:` because seed summaries changed.

# QA record — implementation intelligence release

Run on 2026-09-25 from `npm ci` with Node 22, Vitest, Playwright (Chromium 1194 via `CHROMIUM_EXECUTABLE_PATH`), axe-core and PGlite.

| Check | Result |
| --- | --- |
| `npm audit --audit-level=high` | 0 vulnerabilities |
| `npm run lint`, `npm run typecheck` | pass |
| `npm test` | **97 passed** (32 baseline + 65 new): 36 intelligence domain (compiler determinism, Pareto with unknowns, hard-constraint exclusion, substitution re-validation and de-duplication, sponsorship independence, reproducibility digests, similarity, fingerprint, metrics, staleness, rights, sanitization, attestation, PROV, CycloneDX 1.7/SPDX 2.3), 6 contribution, 4 search, 19 intelligence RLS |
| `npm run test:e2e` | **50 passed** (24 baseline + 26 intelligence) |
| `npm run build` | pass; 218 static route entry points; sitemap lists only public, approved records/Blueprints; `/verify/` disallowed in robots.txt and never pre-rendered |
| Secret scan | no key/token patterns; only the anon key and URL are `VITE_*` |

**RLS (PGlite, migrations 0001–0003).** The 19 tests cover: claims cannot target or be moved to another owner's subject; accepted claims reset when material fields change; owners cannot self-assign evidence levels or trusted fields; approved records, Blueprints and their child rows return to moderation after material edits; attestations cannot be inserted as submitted and can only be revoked by owners; `claim_evidence` cannot attach to others' claims or storage paths; audit/verification/review rows are append-only; anonymous users see only public approved rows; `implementation_customer_identities` is readable by its owner only and `attestation_contacts` by the service role only; solution runs cannot reference another user's profile; the Blueprint publication gate requires sanitization and rights confirmation.

**E2E intelligence coverage.** URL-persisted discovery filters → comparison with MISSING / NOT DISCLOSED / NOT COMPARABLE; metric provenance drawer, claim evidence and keyboard/list architecture map; Blueprint versions, rights and manifest downloads; free-text → editable INFERRED requirements → feasible, explained options, substitution and decision trace; hard-constraint exclusion with reasons; the 15-step wizard to a moderation-pending record without leaking the private customer name; scoped, single-use attestation; claim-level review appearing in the audit log; unified search and explicit 404s; homepage intent handoff; 360 px mobile flows with a filter bottom sheet.

**Accessibility.** axe (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) reports no violations on 13 intelligence states (the list above plus compiler results) and the 9 baseline pages. Two pre-existing contrast failures were fixed. Automated checks do not establish full WCAG 2.2 AA conformance; a manual screen-reader pass has not been done.

**Responsive and visual.** Overflow checks at 1440, 1280, 1024, 768, 430, 390 and 360 px for the baseline pages; intelligence pages checked at 360 px in E2E, plus a manual screenshot sweep of 23 pages at 1440 and 360 px with no console errors. Fixed during QA: legacy CSS collisions (candidate header, relationship cards, claim rows), Blueprint metadata overflow, provider compatibility overflow on mobile, nested step-label styling. Unused intelligence CSS was removed.

**Defects found by tests and fixed.** Duplicate candidate ids after substituting into an already-shown combination; homepage intent ignored by the compiler; `"us"` matched as a region; stemmer mismatch (automation/automate); customer-attested search too permissive; wizard save order that would violate FK/ownership triggers in connected mode; postbuild failing under Node because of an extensionless import.

**Not verified here.** Hybrid RRF search (`202609250004`, needs pgvector); Edge Functions `attestation` and `evidence` against a provisioned Supabase project and mail provider; signed Storage uploads; multi-user connected-mode RLS on real Postgres; performance was not re-measured in this release (previous local sample below; the main bundle is 454 kB / 143 kB gzip, and intelligence routes and the architecture map load lazily).

---

# QA record — Build marketplace release (previous)

Validated with Node 24, Chromium 153, Playwright, Vitest, Testing Library, axe-core and embedded PostgreSQL (PGlite).

- ESLint and strict TypeScript: passed.
- Unit/component/PostgreSQL tests: **32 passed**. Coverage includes publication validation, connected search, manifest detection, SSRF boundaries, remix rights and independent IDs, catalogue relationships, persistence, dialog/control semantics, RLS isolation, collaborator access, immutable ownership/audit, moderation invalidation, claims, enquiry participants, aggregate seed/save/remix transactions, unlisted discovery isolation and PostgreSQL full-text search.
- End-to-end suite: **24 passed**. It sweeps fixed routes and representative entity details; validates old search/save/compare/RFQ/provider/messages flows and new publishing, graph, collections, remix and Build-to-Project flows.
- Responsive overflow checks: home, catalogue, Build discovery/detail, publishing, use-case detail, RFQ, provider listings and messages at **1440, 1280, 1024, 768, 430, 390 and 360px**.
- Accessibility: no axe WCAG A/AA violations on nine representative pages, including new discovery, detail, creator and publisher pages. Automated checks do not establish full WCAG compliance.
- Visual review: desktop/tablet/mobile homepage, Build detail/architecture, discovery, publisher and creator screenshots inspected. Fixed mobile publisher intrinsic-width overflow, missing card padding, tab/footer contrast and a small creator-link target.
- Production build: passed, **166 static route entry points** plus dynamic SPA fallback, canonical metadata, sitemap and robots.
- Static production server: nested unknown route/query/hash restores correctly; no uncaught page errors. Unthrottled local LCP **1.316 s**, CLS **0.0093** after keeping the navigation shell mounted during lazy loading. These are a local sample, not field guarantees or an INP measurement.
- Dependency audit: **0 vulnerabilities**. Secret-pattern scan found no private keys or token patterns. Environment files and raw font intermediates are ignored.

Other corrections: RFQ prefilling after asynchronous source loading; no initial autosave/moderation reset when opening an unchanged Build; remix source IDs remapped for normalized primary keys; per-persona saved-item display; production full-text search adapter; server-managed roles reflected in UI.

CI repeats audit, lint, typecheck, unit/PostgreSQL tests, browser tests and production build before Pages deployment. QA screenshots and reports are uploaded as Actions artifacts; generated local QA files are ignored by Git.

External acceptance remains required for a provisioned Supabase instance, GitHub OAuth, signed Storage, Realtime and the secure metadata gateway. The optional pgvector/hybrid migration is prepared; vector execution/embedding services have not been exercised locally. Payments, mail delivery, private repositories and real supplier verification are not active on Pages.

The initial marketplace baseline (commit e2ce88f) passed 10 unit/component and 17 browser tests before this additive release. Procurement Projects and existing catalogue/workspace routes remain available.
