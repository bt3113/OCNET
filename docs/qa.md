# QA record — Build marketplace release

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
