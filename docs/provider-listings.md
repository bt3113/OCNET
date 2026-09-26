# Provider profiles and use-case listings

Technology companies can present their own use cases on Oracnet without those listings being mistaken for evidence.

## xAI / Grok (first sourced provider)

`src/data/vendor-xai.ts` adds:

- **Provider** `xai`, with a `listing` block: status `unclaimed`, compiler, retrieval date and source links. xAI's site currently brands its pages “SpaceXAI”; the profile notes this.
- **Products:** Grok (assistant app), Grok API, Grok Voice Agent API, Grok Imagine API and Grok Build. Each has a `sourceUrl` and `attributeSource`. No pricing, regions, residency or compatibility are asserted.
- **Use-case listings:** 11 Builds, one per item on [x.ai/grok/use-cases](https://x.ai/grok/use-cases), grouped by the page's sections: Business operations, Development & engineering, Content creation, Visual content, and Integration & customization. The stacks contain only products xAI names for that use case. Listings have no cost, time or outcome claims and grant no reuse rights, and each cites its source.
- **Oracnet use cases:** six new outcomes, mapped to where the listings fit, each with an editorial solution pattern (provenance `inferred`) that places Grok beside alternatives such as Claude and the OpenAI API. Customer support and product video reuse existing use cases.

The page itself was not reachable from the build environment. Listing text was taken from search-index copies of the page and xAI's documentation on 2026-09-26, and should be re-checked against the live page when the profile is claimed.

## How it appears

- `/providers/:slug` (`ProviderProfile.tsx`) has four tabs: **Use cases** (listings grouped by section, plus the Oracnet outcomes they map to), **Products**, **Evidence** (independent implementation records, relationships and creator builds, kept separate from listings) and **About & sources** (sources, retrieval date and the claim lifecycle).
- Build cards and detail pages label these entries **Provider use case / Listed by xAI**, show a typographic cover instead of borrowed artwork, and link the source. They show “View provider profile” instead of remix or creator contact.
- Technology pages list “What xAI lists it for” separately from creator projects.

## Provenance rules (tested)

`tests/domain.test.ts` requires every seed row to be `demo` unless it comes from a declared vendor module. A sourced row must have HTTPS source links, no build cost or time, no reuse rights and no outcome wording. `tests/e2e/providers.spec.ts` covers the profile, listing, source links, cross-links and axe.

## Claiming (future)

A claimed profile would be maintained by the company after domain verification (`status: "claimed"`), through the provider workspace. Connected-mode tables store providers and products as JSON documents, so the `listing` and `sourceUrl` fields need no migration. The optional SQL seeds do not include the xAI entries yet.
