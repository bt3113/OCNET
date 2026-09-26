# Marketplace release handover

Last updated: 2026-09-26

## Release status

The marketplace refactor from PR #6 was merged to `main` as commit `27bdfde3e9874578c4c5e234b5edc78f4bbcb882` and deployed by GitHub Actions run `36254070724`.

That workflow completed both jobs successfully:

- `validate`: install, high-severity dependency audit, lint, typecheck, unit/security tests, Playwright E2E and production build;
- `deploy`: GitHub Pages deployment.

The deployed public demo remains `https://bt3113.github.io/OCNET/`.

## Product architecture now in force

```text
Category
  → Subcategory
      → Use Case
          → Builds
              → Blueprint / architecture
              → Technology stack
              → linked Implementation Records
              → Services / offers
              → Solution Provider
```

Separate cross-cutting entities:

```text
Technology Vendor
  → Technologies
  → vendor-stated Use Cases

Implementation Record
  → real deployment context
  → observed results
  → evidence / attestation

Solution Compiler
  → requirement
  → Use Case
  → approved Blueprint candidates
  → technology constraints / compatibility
  → Implementation evidence
```

### Authoritative meanings

- **Use Case**: shared marketplace discovery object describing specific work. Attribution is not ownership.
- **Build**: a complete solution a Solution Provider has designed/built/can provide. It is not deployment proof by itself.
- **Blueprint**: reusable architecture/method, normally presented inside a Build but kept first-class for versioning, rights and the compiler.
- **Implementation Record**: a real deployment record with context, results and evidence.
- **Technology**: a product/component used by solutions.
- **Technology Vendor**: company responsible for a technology and its own product/use-case statements.
- **Solution Provider**: public umbrella for agency, freelancer, consultancy, studio, systems integrator and independent builder.
- **Service / Offer**: what a Solution Provider can be hired to do.
- **Project / RFQ**: buyer procurement object.

## Marketplace rules implemented

- A Build has 1–3 approved Use Cases; the first is primary.
- A Build can have at most one open new-Use-Case proposal.
- Provider text never silently becomes public taxonomy.
- Moderators can map, edit/approve, reject, merge and archive Use Cases; nothing merges automatically.
- Old Use Case slugs keep resolving after merges/retirement.
- Vendor-stated Use Cases do not count as Builds.
- `0 Builds` means a supply gap only; it is not presented as buyer demand.
- The compiler does not invent a candidate when no reusable approved Blueprint exists.
- Legacy creator/implementer/integrator/consultant/provider routes resolve to the new public concepts.

## xAI / Grok source follow-up

PR #6 intentionally shipped the xAI catalogue with `needs-verification` because the live xAI page was unavailable from the original build environment.

A post-release source check on 2026-09-26 successfully reached the official xAI use-case index and all fifteen linked use-case pages. The follow-up changes in this handover branch:

- expand the sourced xAI catalogue from 11 to 15 Use Cases;
- use the vendor's current live Use Case titles;
- add the missing Research & Analysis entries and the separate image-editing entry;
- preserve former Oracnet titles as search aliases;
- use a direct official URL for each Use Case source;
- set `UseCaseSource.originalTitle` to the vendor title;
- mark the source rows `active` with the check date/capture method;
- keep the xAI profile **unclaimed** — source verification is not vendor endorsement;
- add taxonomy homes for Research & Synthesis, Market Intelligence and Financial Analysis.

The live xAI index checked for this follow-up is `https://x.ai/grok/use-cases`.

## QA evidence from PR #6

Historical QA is recorded in `docs/qa.md`.

PR #6 reported:

- lint and typecheck: pass;
- unit/security: 150 passed, including 18 taxonomy RLS tests;
- E2E: 83 passed;
- production build: pass, 233 route entry points;
- responsive overflow sweep: 1440, 1280, 1024, 768, 430, 390 and 360 px;
- automated axe checks on marketplace/vendor/publisher/compiler states.

The release review found 11 defects before merge and added regression coverage for the fixes.

## External acceptance still required

These are not closed by the GitHub Pages release and must not be represented as production-verified:

1. **Provisioned Supabase acceptance**
   - run all migrations on a real Supabase/Postgres project;
   - exercise the new taxonomy RPCs and RLS with multiple real auth users;
   - validate Storage, OAuth and Realtime paths used in connected mode;
   - verify hybrid search where pgvector is available.

2. **Edge Functions / outbound services**
   - exercise attestation/evidence functions against the provisioned project;
   - configure and test mail delivery where required;
   - validate signed uploads and secure metadata-import egress.

3. **Manual accessibility acceptance**
   - screen-reader pass on the new Use Case combobox, tabs, drawers and marketplace navigation;
   - keyboard-only pass in production browser/device combinations;
   - automated axe results are not a WCAG conformance claim.

4. **Real marketplace data acceptance**
   - illustrative Builds/Implementations remain labelled illustrative;
   - independently verify any real vendor data before changing its provenance/source status;
   - do not infer compatibility, customer outcomes or buyer demand from catalogue presence.

## Recommended next production sequence

```text
GitHub Pages demo green
        ↓
Provision Supabase staging
        ↓
Apply migrations from clean database
        ↓
Seed / import controlled catalogue data
        ↓
Multi-user RLS + RPC acceptance
        ↓
Edge Function / email / Storage acceptance
        ↓
Manual accessibility pass
        ↓
Real supplier onboarding pilot
        ↓
Real customer Implementation / attestation pilot
        ↓
Production hosting + observability review
```

Do not collapse those acceptance stages into a claim that the current static Pages demo is an enterprise production deployment.
