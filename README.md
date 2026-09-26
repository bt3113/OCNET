# Oracnet

A use-case-first technology marketplace: start with a business outcome, explore required capabilities and solution stacks, compare technologies, and connect with providers or implementation partners. Oracnet is a neutral discovery layer, not a consultancy.

**Demo:** https://bt3113.github.io/OCNET/

## Run locally

Node.js 24 LTS and npm are recommended.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open `http://localhost:5173/OCNET/`. In restricted environments use `npm run dev -- --host 127.0.0.1`.

## Stack

React, strict TypeScript, Vite, React Router, Tailwind CSS, Radix Dialog, Motion, Lucide, TanStack Query, React Hook Form, Zod, and Supabase JS. Google Sans Flex is self-hosted with font-display swap. Original SVG demo artwork lives in `public/media`.

## Modes and environment

`VITE_DATA_MODE=demo` (default) works without credentials. All marketplace seeds are identified as demo. Browser persistence supports saving, comparing, project briefs, proposals, messages, listing edits, moderation, notifications, media, and settings. No email, live purchasing, provider verification, or actual account authentication occurs in demo mode. Do not put confidential information in it. Export/reset data from Settings. Demo personas are not security boundaries.

For connected mode set `VITE_DATA_MODE=supabase`, `VITE_SUPABASE_URL`, and the **public anon/publishable key** in `VITE_SUPABASE_ANON_KEY`. Apply migrations and seed data to a Supabase project first. Never commit `.env` or put a service-role key in a `VITE_*` variable.

Supabase mode implements repository reads/writes, Auth, and Postgres Changes subscriptions. Database policies enforce ownership and supplier/admin roles. It is a prepared integration, not a provisioned production service. Provider routing, organization membership/invitations, email delivery, password-recovery completion, and media moderation need production integration; unsupported delivery fails closed. See [architecture](docs/architecture.md) and [security](docs/security.md).

## Product coverage

The route registry covers all requested public, buyer, provider and admin pages plus entity detail routes. Search supports Command/Ctrl K suggestions; discovery supports category/deployment/region filters and sorting; technologies support saving and four-way comparison. Use cases connect outcomes to stacks and supplier alternatives. Buyer projects use a validated three-step wizard. Provider and admin views manage sample catalogue/workspace records. Responsive navigation, galleries, dialogs, toasts, loading/error states, and keyboard access are shared components.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
npm run preview
npm audit
```

Locally, if the installed Playwright build does not match the preinstalled browser, set `CHROMIUM_EXECUTABLE_PATH` to a Chromium binary.

The end-to-end suite checks routes, search, filtering, persistence, comparison, project creation, contact/messaging, listing edits, reviews, notifications, settings, axe accessibility, and viewport overflow at 1440, 1280, 1024, 768, 430, 390, and 360 pixels. Screenshots go to ignored `qa/`. Audit and QA notes are in `docs/qa.md`.

## GitHub Pages

`.github/workflows/pages.yml` validates and deploys pushes to `main`. In repository Settings → Pages choose **GitHub Actions** as source if it is not already enabled. The workflow needs `contents: read`, `pages: write`, and `id-token: write`. Vite and Router use `/OCNET/`; postbuild generates static route entry points, a nested-route fallback, robots.txt, and sitemap.xml. See [deployment](docs/deployment.md).

## Future production hosting

Move to a host supporting server-rendered entity metadata, security headers and server-side service boundaries. Provision Supabase, validate RLS with multiple real users, configure Auth redirects and mail, verify provider identity, implement contact routing and anti-abuse, establish legal terms, and monitor performance/error reporting. Payments remain a separate production service and are intentionally absent here.

## Documentation

- [Architecture](docs/architecture.md)
- [Design system](docs/design-system.md)
- [Data model](docs/data-model.md)
- [Deployment](docs/deployment.md)
- [Security / threat model](docs/security.md)
- [QA evidence and limits](docs/qa.md)
- [Implementation intelligence](docs/implementation-intelligence.md) · [records](docs/implementation-records.md) · [metrics](docs/metric-model.md) · [verification](docs/verification-model.md) · [provenance](docs/provenance-model.md) · [Blueprints](docs/blueprints.md) · [Solution Compiler](docs/solution-compiler.md)
- [Marketplace domain model](docs/marketplace-domain-model.md) · [Use Case taxonomy](docs/use-case-taxonomy.md) · [Supply model](docs/supply-model.md) · [Technology Vendor profiles (xAI / Grok)](docs/provider-listings.md)
- [Production architecture](docs/production-architecture.md) · [research notes](docs/technical-research-notes.md) · [progress and open gaps](docs/implementation-progress.md)

## Marketplace: Use Cases, Builds and Solution Providers

Oracnet is organised as **Category → Subcategory → Use Case → Builds → Build detail** (Blueprint, stack, real Implementations, services and the Solution Provider). `/use-cases` is the primary surface; `/solution-providers` lists agencies, studios, freelancers, consultancies and systems integrators; `/technology-vendors` lists the companies behind technologies, whose statements appear as sourced Use Cases rather than Builds. Old `/creators`, `/implementers`, `/integrators`, `/consultants` and `/providers` URLs redirect. See [marketplace-domain-model.md](docs/marketplace-domain-model.md).

The six-step publisher (Basics, Use Cases, How it works, Proof, Service, Review) asks for one to three Use Cases through an accessible combobox with deterministic suggestions, and allows one moderated proposal for a missing Use Case. Moderators work at `/admin/use-cases`. Procurement Projects remain separate. Public GitHub import and media upload sit inside Basics. Connected publication enters moderation. Creator, provider and admin workspaces extend the same interface. See [Build marketplace](docs/build-marketplace.md) for routes, permissions, import boundaries and production prerequisites. The relational migration, optional Auth-bound seed, full-text search and PostgreSQL RLS tests accompany the frontend.

## Implementation intelligence

Oracnet records what was actually implemented, for whom (in anonymised context), with which technologies, and what was observed afterwards — with evidence at the level of individual claims.

- **Implementation Records** (`/implementations`, `/implementations/:slug`, `/compare/implementations`): context, before/after process, architecture map, metrics observed after implementation (never presented as caused by it), claim-level evidence states, freshness, provenance and PROV-JSON export.
- **Blueprints** (`/blueprints`): reusable, sanitized architecture patterns with explicit rights states, versions and CycloneDX 1.7 / SPDX 2.3 manifests. A public record never grants reuse rights.
- **Solution Compiler** (`/solution-compiler`): a deterministic, non-chat engine. Requirements (HARD/SOFT/INFORMATIONAL) are compiled against Blueprint capability slots and typed technology relationships; infeasible options are excluded with reasons, remaining options are Pareto-filtered, labelled with trade-offs only (no “best stack”), and shipped with a reproducible decision trace.
- **Verification** (`/verify/:token`): scoped, expiring, single-use customer attestation of selected claims; tokens are stored hashed. Reviewer decisions are per claim and audited.
- **Contribution** (`/implementation/new`): a 15-step wizard with private customer identity, evidence upload, sanitization scanning and optional Blueprint derivation. Submissions enter moderation.

All implementation records, Blueprints, implementers and outcomes in the demo are **illustrative** and labelled as such; none describes a real customer, deployment or result. Connected mode relies on migrations `202609250001`–`202609250004` and the `attestation` and `evidence` Edge Functions, which have not been exercised against a provisioned project.
