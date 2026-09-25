# Blueprints

Routes: `/blueprints` (filter by rights and use case, URL-persisted), `/blueprints/:slug` (detail with version selector).

A Blueprint is a reusable, sanitized architecture pattern. It may be derived from an implementation record (`derivedFromImplementationId`) or authored independently. It never inherits the record’s evidence, and a public record never grants reuse rights.

## Rights

| State | Permits |
| --- | --- |
| SHOWCASE_ONLY | viewing only |
| REFERENCE_ARCHITECTURE | viewing; using the pattern to inform your own design |
| PERSONAL_USE | + non-commercial personal use |
| COMMERCIAL_LICENSE | + commercial use under the attached terms |
| OPEN_SOURCE | + redistribution under the stated licence |
| CUSTOM_LICENSE | anything beyond viewing is conditional on the terms |

`canReuse(blueprint, purpose)` in `src/data/rights.ts` answers per purpose. The compiler uses it for the `commercialReuseRequired` constraint. These are product rules, not legal advice.

## Versions and manifests

`blueprint_versions` keeps every version (created date, change notes, last validation, compatibility state and notes, illustrative cost/maintenance estimate ranges with basis, external references). Capability slots are `blueprint_stack_items` (capability, selected product, recorded alternatives, configuration requirements, component version); data flows are `blueprint_connections` with trust-boundary flags. Historical versions stay selectable on the detail page, which states when a non-current version is shown.

`buildManifest()` produces Oracnet’s machine-readable manifest. Export adapters:

- **CycloneDX 1.7** (`toCycloneDx`): third-party SaaS products as `services` with provider, data flows (`inbound`/`outbound`, trust-boundary classification) and capability-slot properties; `dependencies` from connections; Blueprint licence text and Oracnet rights as `metadata.component` licences/properties; deterministic serial number from the manifest digest.
- **SPDX 2.3** (`toSpdx`): package identity, supplier, `DEPENDS_ON` relationships, `LicenseRef-Oracnet-<rights>` with extracted text; SaaS licences are `NOASSERTION`.

Business concepts (capability slots, rights semantics, freshness) stay in Oracnet properties rather than being forced into either standard.

## Derivation and sanitization

Deriving from a record (wizard step 14) requires: a name, a rights choice, confirmation of every checklist item (credentials; customer/personal data; schemas and identifiers; private prompts and decision logic; business rules and pricing; internal endpoints; confidential documents; customer brand), and no blocking scanner findings. `scanText()` detects API keys, provider tokens, JWTs, private keys, passwords, connection strings, internal URLs, IPs, emails, phone numbers, UK NI numbers and Luhn-valid card numbers, masking excerpts. Scanning is assistance only; the publisher confirms and a reviewer approves. Nothing here is a statement that content is legally safe to publish.

Publication gate (UI, `review.ts`, and SQL constraint): approval requires `sanitizationConfirmedAt` and `rightsDeclaredAt`. Any edit to a Blueprint, its versions, slots, connections, requirements or licence sends it back to moderation.

## Freshness

`blueprintFreshness()` combines the version’s last validation with triggers from its selected components (retired → stale, deprecated → review due, recorded incompatibility or failed check → stale). A stale Blueprint is never shown as current; maintainers can re-validate a version from the creator workspace.
