# QA record

Validation performed in the implementation workspace using Node 24, Chromium 153, Playwright, Vitest, Testing Library, and axe-core.

- Strict TypeScript: passed.
- ESLint: passed.
- Unit/component tests: 10 passed, including catalogue relationship integrity, provenance, form validation, local persistence, corrupt data handling, saved control state, dialog semantics, and video URL validation.
- Production build: passed; 127 static route entry points generated with metadata, sitemap, robots and fallback.
- Dependency audit: 0 vulnerabilities after updating Vitest.
- End-to-end suite: all 17 tests passed.
- Browser route sweep: every requested route and seeded representative entity detail rendered with no uncaught page errors.
- Responsive checks: home, discovery, stack detail, project wizard, provider listing table, and messaging at 1440, 1280, 1024, 768, 430, 390 and 360px. Overflow defects found at 1280/360px were fixed.
- Accessibility: axe checks on home, catalogue, project wizard, sign-in and messages. Contrast defects were corrected. Automated results do not establish full WCAG conformance.
- Visual inspection: desktop, tablet and mobile screenshots compared with supplied reference; original landscape imagery applied; responsive card/table/navigation arrangements checked.

Corrections during QA: stale query/save race; project wizard final button reconciliation; provider rail min-content overflow; small-screen provider heading overflow; secondary text contrast; ambiguous test locators; robust browser context setup in the sandbox.

Performance targets (LCP 2.5s, INP 200ms, CLS 0.1) are goals, not measured field guarantees. A public-host performance baseline and production RLS/multi-user tests remain necessary. The Pages prototype has no live payments, external message delivery, or verified suppliers.

Run `npm run test:e2e` for the 17 browser cases. The GitHub workflow uploads the HTML report and screenshots. Local QA output stays in ignored `qa/` and `playwright-report/` directories.
