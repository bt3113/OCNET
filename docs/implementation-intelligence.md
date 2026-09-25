# Implementation intelligence

Oracnet starts from a business outcome and moves through comparable real implementations, process change, architecture, components, economics, observed outcomes and evidence to reusable Blueprints, implementers and a private procurement request. The strategic asset is the accumulating graph:

```
CONTEXT → PROBLEM → IMPLEMENTATION → PROCESS CHANGE → ARCHITECTURE → TECHNOLOGY
        → IMPLEMENTER → COST → EVIDENCE → OBSERVED OUTCOME → MAINTENANCE HISTORY
```

## Object semantics

| Object | Meaning | Is not |
| --- | --- | --- |
| Implementation Record | Observed deployment: what was implemented, in which context, with which components, observations and evidence | Proof of causal impact; a reuse licence |
| Blueprint | Reusable, sanitized, versioned architecture with declared rights | A customer deployment; automatically reusable because it is public |
| Build | Creator/company project showcase | Customer deployment evidence |
| Solution pattern (`solution_stacks`) | Conceptual composition for a use case | A validated architecture |
| Procurement Project | Buyer requirement / RFQ (`projects`) | A Build or a Blueprint |
| Offer | Commercial object (service, package, licence) | Evidence |
| Use case | The outcome a business wants | A single recommended stack |
| Technology / Provider | Component / its supplier | An endorsement |
| Implementer | Person/company that deploys | Credible by profile copy alone — credibility comes from published records |

## Four layers

1. **Evidence graph** — claims are first-class (`claims`, `claim_evidence`, `evidence_artifacts`, `evidence_reviews`, `attestations`, `verification_events`, `audit_events`). See [verification model](verification-model.md) and [provenance model](provenance-model.md).
2. **Context normalization** — `implementation_contexts` plus a small taxonomy (`src/data/taxonomy.ts`) and category templates (`src/data/category-templates.ts`) with JSONB `extensions` only for category-specific fields.
3. **Implementation graph** — normalized stack items, connections (data flow, trust boundary), process steps, metrics, use-case and capability links, typed technology relationships, Blueprint derivation. A versioned **Implementation Fingerprint** (`src/data/fingerprint.ts`) supports deduplication, similarity and architecture-pattern keys.
4. **Solution Compiler** — deterministic constraint evaluation and Pareto filtering with a reproducible decision trace. See [solution compiler](solution-compiler.md).

## Deterministic vs AI-assisted

Everything that decides compatibility, feasibility, pricing, evidence, rights or verification is deterministic code over recorded data. The only free-text step — turning a sentence into a RequirementProfile — is a rule-based parser (`src/data/requirement.ts`) whose every output is tagged **INFERRED** and editable. No model API is called in demo or connected mode. A future LLM parser would plug in at the same point, produce the same schema-validated profile and remain INFERRED until confirmed.

## Module map

| Concern | Module | Tests |
| --- | --- | --- |
| Context similarity | `context-similarity.ts` | `tests/intelligence.test.ts` |
| Fingerprint | `fingerprint.ts`, `canonical.ts` | same |
| Metrics | `metrics.ts` | same |
| Evidence signals | `evidence.ts` | same |
| Freshness | `staleness.ts` | same |
| Rights, sanitization | `rights.ts`, `sanitization.ts` | same, `tests/contribution.test.ts` |
| Attestation | `attestation.ts`, `supabase/functions/attestation` | same, `tests/security/intelligence-rls.test.ts` |
| PROV export, manifests | `provenance.ts`, `manifest.ts` | `tests/intelligence.test.ts` |
| Compiler | `solution-compiler.ts`, `requirement.ts` | `tests/intelligence.test.ts`, E2E |
| Contribution, review | `contribution.ts`, `review.ts` | `tests/contribution.test.ts` |
| Search | `search.ts`, migrations `…0002/0003/0004` | `tests/search.test.ts`, RLS tests |

## Demo data

All intelligence seed data (`src/data/intelligence-seed.ts`) is fictional and labelled ILLUSTRATIVE/DEMO in the UI. Real vendor names appear only as catalogue components; relationship types and administration-skill notes are illustrative and say so. Claims upgraded in the demo (attestation, review) keep a visible “· demo” marker.
