# Handover: marketplace release (2026-09-26)

## What is live

**https://bt3113.github.io/OCNET/** runs a demo build: sample data only, and everything a visitor creates stays in their own browser. Deployment runs automatically on every push to `main` via `.github/workflows/pages.yml`: audit, lint, typecheck, unit tests, E2E, build, deploy.

Key pages:
- `/`: “What are you trying to get done?”
- `/use-cases`: categories, filters, supply gaps
- `/builds`: Build discovery
- `/solution-providers`: agencies, studios, freelancers, consultancies, systems integrators
- `/technology-vendors/xai`: vendor profile with sourced Use Cases
- `/creator/builds/new`: six-step Build publisher
- `/admin/use-cases`: moderation queue. Open to anyone in the demo; admin-only in connected mode.
- `/solution-compiler`: “Find a solution”

Background: `marketplace-domain-model.md`, `use-case-taxonomy.md`, `supply-model.md`, `qa.md`.

## Pending: needs you (credentials, accounts or decisions)

| # | Item | Why it's pending | What to do |
| --- | --- | --- | --- |
| 1 | **Real backend (Supabase)** | No project or credentials were available. All migrations (including `202609260001_marketplace_taxonomy.sql`) and RLS were tested only in PGlite. | Create a Supabase project and apply `supabase/migrations/*` in order (see `deployment.md`). Set trusted admin roles in `app_metadata`. Build with `VITE_DATA_MODE=supabase` plus the URL and anon key. Test with two unrelated users, a provider and an admin. |
| 2 | **Hosting beyond GitHub Pages** | Pages can't return real 404s, security headers or server-rendered metadata for new records. | Move to a host with rewrites and server functions (`production-architecture.md`). |
| 3 | **xAI wording check** | x.ai was unreachable from the build environment. The 11 statements came from search-index copies and are marked “Wording to be verified”. | Compare each `originalDescription` in `src/data/vendor-xai.ts` with https://x.ai/grok/use-cases, fix any differences, then set the source `status` to `active`. |
| 4 | **Vendor claim flow** | “Claim this profile” links to `/provider/claims`, but there is no domain verification. | Decide the verification method (DNS/email), then build it on the provider workspace. |
| 5 | **Email and notifications** | No mail provider configured. | Add `RESEND_API_KEY` + `EMAIL_FROM` for the `attestation` Edge Function, and use them for proposal decisions. |
| 6 | **Legal and privacy review** | Not done. | Review terms, marketplace terms, attestation wording, retention periods and the vendor-content attribution policy. |
| 7 | **Real content** | Every Build, Solution Provider and deployment is illustrative. | Onboard real Solution Providers; replace or retire demo seeds before launch. |

## Pending: engineering follow-ups (no blocker, not yet done)

- **Taxonomy SQL seed:** `use_case_categories`, editorial placements, aliases and xAI sources exist in the TypeScript seed only. Add them to `supabase/seed.sql` (or a data migration) before connected mode.
- **Provider notifications:** proposal outcomes are only visible on the provider dashboard (“Your Use Case proposals”). There is no notification or email yet.
- **Alias management:** moderators can add labels and archive Use Cases; removing or editing a label and un-archiving are not in the UI yet.
- **Search analytics:** none, by design. Supply gaps count published supply only. Add privacy-reviewed analytics before showing any demand signal, and label it as such.
- **Accessibility:** automated axe checks pass and the combobox follows the WAI-ARIA pattern. A manual screen-reader pass (NVDA/VoiceOver) has not been done.
- **Performance:** the main bundle is ~496 kB (156 kB gzip). No field measurements (LCP/INP) have been taken for this release.
- **Scheduled jobs:** still missing for attestation expiry, contact purge, freshness recompute and search embeddings (`implementation-progress.md`).
- **Cleanup:** `Discovery.tsx` still has an unreachable provider-listing branch from the old `/providers` route. The legacy `solution_explanations` table can be dropped in a later migration.

## Where things are

| Concern | Files |
| --- | --- |
| Domain rules (max 3, indexing, suggestions, moderation, merges) | `src/data/use-case-domain.ts`, `src/data/use-case-text.ts` |
| Taxonomy and demo seed | `src/data/taxonomy-seed.ts`, `src/data/marketplace-seed.ts`, `src/data/vendor-xai.ts`, `src/data/seed.ts` |
| Solution Provider adapter | `src/data/solution-providers.ts` |
| Publisher | `src/pages/BuildWizard.tsx`, `src/components/builds/UseCasePicker.tsx` |
| Moderation | `src/pages/UseCaseModeration.tsx`, `src/data/use-case-moderation.ts` |
| Database | `supabase/migrations/202609260001_marketplace_taxonomy.sql`; tests in `tests/security/taxonomy-rls.test.ts` |
| E2E | `tests/e2e/publisher.spec.ts`, `providers.spec.ts`, `marketplace.spec.ts`, `compiler-coverage.spec.ts` |

Run locally:

```bash
npm ci
npm run dev
npm run lint && npm run typecheck && npm test
npm run test:e2e
npm run build
```

`npm run test:e2e` may need `CHROMIUM_EXECUTABLE_PATH` if the Playwright browser is missing.
