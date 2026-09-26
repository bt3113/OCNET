# Marketplace domain model

Oracnet is a neutral marketplace organised around the work a buyer needs done:

```
Category → Subcategory → Use Case → Builds → Build detail
                                            ├─ Blueprint (versioned architecture)
                                            ├─ Stack (technologies)
                                            ├─ Implementation Records (real deployments)
                                            ├─ Services / offers
                                            └─ Solution Provider
```

## Entities

| Entity | What it is | Stored in | Not to be confused with |
| --- | --- | --- | --- |
| **Category** | A broad area of work (Finance, Customer Service). Browsable, never selectable on a Build. | `use_case_categories` (`level = category`) | A technology category (`categories`, used by the technology catalogue) |
| **Subcategory** | A group of related work inside a category (Accounts Receivable). | `use_case_categories` (`level = subcategory`, `parentId`) | — |
| **Use Case** | One concrete piece of work, phrased as what gets done (“Chase overdue invoices”). Shared infrastructure: nobody owns it. | `use_cases` + `status`, `originType`, `categoryId`, `subcategoryId` | A Build, or a vendor's marketing page |
| **Use Case Source** | Who first described the Use Case, with their wording, URL, retrieval date and verification status. | `use_case_sources` | Ownership |
| **Use Case Alias** | Other names: `preferred`, `alternate` (shown), `hidden-search` (searchable, never shown), `original-source` (a provider's or vendor's wording). | `use_case_aliases` | — |
| **Use Case Proposal** | A Solution Provider's suggestion for a missing Use Case, submitted from the Build publisher. Private until moderated. | `use_case_proposals` | A Use Case |
| **Build** | The primary supply object: a complete solution a Solution Provider designed or can deliver, for 1–3 Use Cases (first = primary). | `builds` (`useCaseIds`, `useCaseProposalId`, `blueprintId`) | Evidence that it works |
| **Blueprint** | The reusable, versioned architecture behind a Build. First-class: versions, rights and manifests. | `blueprints`, `blueprint_versions`, `blueprint_stack_items` (`buildId`) | A Build's marketing copy |
| **Implementation Record** | A real deployment, with context, observed metrics and claim-level evidence. | `implementation_records` (`sourceBuildId`) | A Build |
| **Service / Offer** | How to get a Build: setup, customisation, full implementation. No payments are taken. | `build_offers` | — |
| **Technology** | A product used in a stack (Claude, Twilio, Grok Voice Agent API). | `products` | Its vendor |
| **Technology Vendor** | The company that makes a technology (xAI, OpenAI). Can state what its technology is for; cannot edit independent Builds or evidence. | `providers` (+ optional `listing`) | A Solution Provider |
| **Solution Provider** | Who designs, builds or delivers solutions: Agency, Freelancer, Consultancy, Studio, Systems Integrator, Independent Builder. Replaces “Implementer” and “Creator” in the UI. | Adapter over `creator_profiles`, `integrators`, `consultants` (`src/data/solution-providers.ts`) | A Technology Vendor |
| **Customer** | The buyer or the business in an Implementation Record. Identity is private by default. | `implementation_customer_identities` (owner-only) | — |

### Why Solution Providers are an adapter

Builds, Implementation Records and Blueprints already reference `creator_profiles`, `integrators` and `consultants` by id, and connected-mode RLS policies are written against those tables. Merging them would mean a data migration across every foreign key and policy for no user-visible gain. The adapter presents them as one concept with one URL (`/solution-providers/:slug`) and keeps `legacyPaths` so old `/creators`, `/implementers`, `/integrators` and `/consultants` links redirect.

## Rules

- A Build has **1–3 Use Cases**, counting a pending proposal (`MAX_USE_CASES_PER_BUILD`). Enforced in the publisher, in `buildUseCaseErrors`, and in Postgres by the `enforce_build_use_cases` trigger.
- A Build has **at most one** pending proposal (`use_case_proposals` unique partial index on `buildId where status = 'pending'`).
- A Build is **indexed** (discovery, counts, sitemap) only when it is public, approved, and at least one of its Use Cases is approved (`isIndexableBuild`). A Build that relies only on a proposal stays out until the proposal is approved or mapped.
- **Vendor statements are Use Cases with a source, not Builds.** They never count as supply.
- Counts are **facts**: Builds, Technologies (with the basis for each), Implementations, Solution Providers. “No Builds yet” describes missing supply. Oracnet does not measure demand and never implies it.
- Build maturity is shown as a fact, not a score: *Build only*, *Build + Blueprint*, *Build + deployment evidence* (`buildMaturity`).
- Nothing merges automatically. Moderators map, approve (optionally editing), reject, merge, add labels or archive; each action writes an audit event.

## Three truth levels

`truthLevel(provenance)` in `src/data/marketplace-model.ts`:

| Level | Provenance | Shown as |
| --- | --- | --- |
| Illustrative demo | `demo` | Sample profiles, Builds and deployments; the global demo strip says none describes a real customer |
| Third-party sourced | `third-party sourced` | Vendor statements such as xAI's, with the source link, retrieval date and “Wording to be verified” until checked |
| Community supplied | `creator supplied`, `community supplied`, … | Real submissions in connected mode, after moderation |

Editorial taxonomy rows (categories, placements and aliases written by Oracnet) use provenance `inferred`.

## xAI migration

The previous release modelled xAI's use-case page as eleven Builds. That overstated supply: a vendor saying its model *can* be used for something is not a solution anyone built. They are now eleven Use Cases (`originType: technology-vendor-sourced`, `originEntityId: xai`) with:

- one `use_case_sources` row each: the captured statement as `originalDescription`, `sourceUrl` `https://x.ai/grok/use-cases`, retrieved and last checked 2026-09-26, capture method, status `needs-verification`, and the Grok products named for it;
- the former Build titles kept as `alternate` aliases;
- redirects: `/builds/xai-*` → the matching Use Case; broad areas (`software-development`, `marketing-content`, `visual-content-generation`) → a category or subcategory, because an area is not a piece of work.

The live x.ai page could not be fetched from the build environment. Titles are Oracnet-normalised; the captured statements should be checked against the live page before `status` changes to `active`.

## Research ideas adopted

| Idea | Where it came from | Adopted as |
| --- | --- | --- |
| Preferred / alternate / hidden labels | W3C SKOS (`prefLabel`, `altLabel`, `hiddenLabel`) | `UseCaseAlias.aliasType`; hidden labels are searchable and never displayed |
| Limit on use cases per listing | Marketplaces that ask a listing to name a small number of use cases (e.g. cloud marketplace solution listings) | Max three per Build, first is primary |
| Controlled vocabulary with moderated additions | Library subject-heading practice | Proposals → map / approve / reject; no free-text tags |
| Combobox with listbox | WAI-ARIA Authoring Practices combobox pattern | `UseCasePicker` (`role="combobox"`, `aria-activedescendant`, arrow/Home/End/Enter/Escape) |
| Separate vendor claims from independent evidence | Review-site practice of labelling vendor-provided content | Technology Vendor pages keep vendor statements, independent Builds and Implementation Records in separate tabs |
| Show supply gaps, not demand | Honest-metrics principle already used for Implementation Records | `supplyGaps` and `SupplyGapIndicator` |

Not adopted: machine-generated Use Case suggestions (suggestions are deterministic word matching only), automatic merging of near-duplicates, and popularity or demand scores.

See also [use-case-taxonomy.md](use-case-taxonomy.md) and [supply-model.md](supply-model.md).
