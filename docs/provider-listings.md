# Technology Vendor profiles (xAI / Grok)

> Superseded model: until 2026-09-26 xAI's use cases were listed as eleven Builds. They are now **vendor-sourced Use Cases**. See [marketplace-domain-model.md](marketplace-domain-model.md#xai-migration) for the migration and [supply-model.md](supply-model.md) for why vendor statements are not supply.

## What `src/data/vendor-xai.ts` provides

- **Technology Vendor** `xai`, with a `listing` block: status `unclaimed`, compiler, retrieval date and source links. xAI's site currently brands its pages “SpaceXAI”; the profile notes this.
- **Technologies:** Grok, Grok API, Grok Voice Agent API, Grok Imagine API and Grok Build, each with `sourceUrl`. No pricing, regions, residency or compatibility are asserted.
- **Eleven Use Cases** (`originType: technology-vendor-sourced`) with one `use_case_sources` row each: the captured statement, source URL, retrieved/last-checked dates, capture method and `needs-verification` status, plus the Grok products named for it.
- **Aliases** for the former listing titles, **redirects** from `/builds/xai-*`, and **retired-area redirects** for broad areas that became categories.
- **Editorial solution patterns** (provenance `inferred`) placing Grok beside alternatives.

The page was not reachable from the build environment. Statements were captured from search-index copies on 2026-09-26 and must be checked against the live page before the source status changes to `active`.

## How it appears

- `/technology-vendors/xai` tabs: **Vendor-stated Use Cases**, **Products**, **Independent Builds**, **Implementation evidence**, **About & sources**. Vendor statements, independent supply and deployments are kept apart.
- Each Use Case page shows “Originally listed by xAI · source · checked <date>”, and says the vendor does not own the Use Case; any Solution Provider can publish a Build for it.
- Technology pages list the vendor-stated Use Cases separately from Builds using the technology.
- The profile is unclaimed and says xAI has not reviewed it; nothing implies endorsement.

## Claiming (future)

A claimed profile (`status: "claimed"`) would be maintained by the vendor after domain verification. It could edit company details, products and its own statements, and never independent Builds, Implementation Records, evidence or reviews.

## Tests

`tests/domain.test.ts` requires every non-demo seed row to be xAI-sourced or editorial (`inferred`). `tests/e2e/providers.spec.ts` covers the vendor profile, attribution, redirects, the rule that vendor statements are not counted as Builds, and axe.
