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
| **Use Case Source** | Who described the Use Case, with their wording, URL, retrieval/check date and source status. | `use_case_sources` | Ownership or independent evidence |
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
- Counts are **facts**: Builds, Technologies (with the basis for each), Implementations, Solution Providers. “No Builds yet” describes missing supply. Oracnet does not infer buyer demand from supply counts.
- Build maturity is shown as a fact, not a score: *Build only*, *Build + Blueprint*, *Build + deployment evidence* (`buildMaturity`).
- Nothing merges automatically. Moderators map, approve (optionally editing), reject, merge, add labels or archive; each action writes an audit event.

## Three truth levels

`truthLevel(provenance)` in `src/data/marketplace-model.ts`:

| Level | Provenance | Shown as |
| --- | --- | --- |
| Illustrative demo | `demo` | Sample profiles, Builds and deployments; the global demo strip says none describes a real customer |
| Third-party sourced | `third-party sourced` | Vendor statements with source links and retrieval/check dates. A source may be `needs-verification` or `active`; neither state means the vendor has claimed or endorsed the profile. |
| Community supplied | `creator supplied`, `community supplied`, … | Real submissions in connected mode, after moderation |

Editorial taxonomy rows (categories, placements and aliases written by Oracnet) use provenance `inferred`.

## xAI migration and source verification

The previous release modelled xAI's use-case page as eleven Builds. That overstated supply: a vendor saying its model *can* be used for something is not a solution anyone built. PR #6 moved those entries to vendor-sourced Use Cases (`originType: technology-vendor-sourced`, `originEntityId: xai`) and preserved the old Build URLs as redirects.

The first capture used search-index copies because the live page was unavailable from the build environment. A post-release check on 2026-09-26 successfully reached the official xAI use-case index and all linked detail pages. The catalogue now contains **15** live vendor-stated Use Cases with:

- the vendor's current live title as the public Use Case title and `UseCaseSource.originalTitle`;
- a short vendor statement captured from the official index;
- a direct official detail-page `sourceUrl` for every Use Case;
- retrieved and last-checked dates of 2026-09-26;
- capture method recording that the live index and linked detail page were checked;
- source status `active`;
- the Grok products named for the workflow where applicable;
- earlier Oracnet-normalised titles retained as `alternate` aliases;
- redirects from the eleven historical `/builds/xai-*` URLs;
- broad retired areas (`software-development`, `marketing-content`, `visual-content-generation`) redirected to a category/subcategory because an area is not a piece of work.

Four live vendor entries were missing from the earlier search-index capture and were added during the source check: the three Research & Analysis use cases and the separate image-editing use case.

**Important:** `active` means Oracnet checked the cited source. The xAI profile is still unclaimed, so it must not be presented as reviewed, approved or endorsed by xAI.

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

See also [use-case-taxonomy.md](use-case-taxonomy.md), [supply-model.md](supply-model.md), [provider-listings.md](provider-listings.md) and [release-handover.md](release-handover.md).
