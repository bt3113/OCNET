# Technology Vendor profiles (xAI / Grok)

> Superseded model: until 2026-09-26 xAI's use cases were listed as eleven Builds. They are now **vendor-sourced Use Cases**. See [marketplace-domain-model.md](marketplace-domain-model.md#xai-migration) for the migration and [supply-model.md](supply-model.md) for why vendor statements are not supply.

## What `src/data/vendor-xai.ts` provides

- **Technology Vendor** `xai`, with an unclaimed `listing` block, retrieval/check date and official source links. Source verification does not mean xAI has claimed or endorsed the Oracnet profile.
- **Technologies:** Grok, Grok API, Grok Voice Agent API, Grok Imagine API and Grok Build, each with a public `sourceUrl`. No independent performance, pricing, residency or compatibility claim is added by Oracnet.
- **Fifteen vendor-stated Use Cases** (`originType: technology-vendor-sourced`). The catalogue was re-checked against the live [xAI use-case index](https://x.ai/grok/use-cases) and each linked official detail page on 2026-09-26.
- Each Use Case has a `use_case_sources` row with the vendor's live title, the short statement shown on the use-case index, a direct official detail URL, retrieved/last-checked dates, `active` source status and the technologies the official page associates with that work.
- **Aliases** preserve earlier Oracnet wording, **redirects** preserve the former `/builds/xai-*` URLs, and **retired-area redirects** keep broad areas such as software development at the category level.
- **Editorial solution patterns** remain Oracnet-inferred patterns rather than vendor endorsements.

### Live xAI Use Cases checked on 2026-09-26

The official index currently groups fifteen use cases under Research & Analysis, Engineering, Content, Operations and Creative:

1. Synthesize research across sources
2. Monitor news and market signals
3. Analyze financial data and filings
4. Plan and implement code changes
5. Debug production issues faster
6. Write and review technical docs
7. Draft and iterate on long-form content
8. Create marketing copy across channels
9. Translate and localize content
10. Automate workflows with voice agents
11. Process and extract from documents
12. Build internal tools with the API
13. Generate images from descriptions
14. Edit and restyle existing images
15. Create short videos from prompts

The original three research/analysis entries and the separate image-editing entry were missing from the earlier search-index capture; this follow-up adds them. Several earlier Oracnet-normalised public titles were also replaced with the vendor's live titles while the old titles remain aliases for search and route continuity.

## How it appears

- `/technology-vendors/xai` tabs: **Vendor-stated Use Cases**, **Products**, **Independent Builds**, **Implementation evidence**, **About & sources**. Vendor statements, independent supply and deployments are kept apart.
- Each Use Case page shows “Originally listed by xAI · source · checked <date>”, and says the vendor does not own the Use Case; any Solution Provider can publish a Build for it.
- The Sources tab shows the original vendor title, short source statement, direct detail-page link, retrieval/check date and capture method.
- Technology pages list vendor-stated Use Cases separately from independent Builds using the technology.
- The profile remains unclaimed and explicitly says xAI has not reviewed the Oracnet profile.

## Claiming (future)

A claimed profile (`status: "claimed"`) would be maintained by the vendor after domain verification. It could edit company details, products and its own statements, and never independent Builds, Implementation Records, evidence or reviews.

## Tests

`tests/domain.test.ts` protects sourced/demo provenance. `tests/e2e/providers.spec.ts` covers the vendor profile, all 15 sourced Use Cases, direct source attribution, redirects, the rule that vendor statements are not counted as Builds, and axe checks.
