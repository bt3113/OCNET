# Implementation records

Routes: `/implementations` (discovery), `/implementations/:slug` (detail), `/compare/implementations?ids=a,b,c`, `/implementation/new` (contributor wizard).

## Model

`implementation_records` holds identity, summary, problem statement, customer display/visibility, industry, business type, size band, region, context summary, baseline and measurement periods, implementation dates/duration, setup cost (exact / range / not disclosed), ongoing cost, maintenance hours and burden, known limitations, verification/publication/moderation/visibility/rights/customer-permission states, implementer/creator/provider links, derived Blueprints, freshness dates and a `demo` flag.

Normalized children: `implementation_contexts` (locations, volume range, systems, technical capability, regulatory constraints, data sensitivity, human approval, `extensions` JSONB for category fields), `implementation_process_steps` (before / change / after), `implementation_stack_items`, `implementation_connections` (data flow, trust boundary, composite FK to same-record items), `implementation_use_cases`, `implementation_capabilities`, `measurement_periods`, `implementation_metrics`, `implementation_fingerprints`. Private customer names live only in `implementation_customer_identities`.

## Detail page hierarchy

Header (badges, context facts, demo notice) → problem → business context → before / what changed / after → architecture map (observed) → stack by capability → implementation dates → economics → observed outcomes with per-metric provenance → claims & evidence with PROV-JSON export and fingerprint → what is reusable (record rights vs Blueprint) → alternative implementations with context similarity → implementers → request something similar (contact implementer, competing proposals, start from Blueprint, private requirement).

## Discovery

Filters persist in the URL: use case, industry, business type, size, region, context similarity to a chosen record, technology, implementer, Blueprint available, evidence method, customer-attested, evidence-reviewed, freshness, setup cost band, ongoing cost band, duration. Desktop shows a side rail; below 1024px filters open in a bottom sheet. Ordering is organic (recency of review, disclosed cost, or similarity) — no paid placement.

## Comparison

No winner, rating or composite score. Values render as MISSING, NOT DISCLOSED or NOT COMPARABLE (different definition, unit or measurement-period length > 2×). Tables become labelled cards on mobile.

## Contributor workflow (15 steps)

Customer & identity → business context → problem & baseline → before process → process changes → after process → architecture & stack (components + connections) → timeline & economics → observed outcomes → claims → evidence → rights & confidentiality → customer attestation → Blueprint derivation → review. Fields are marked PUBLIC or PRIVATE VERIFICATION DATA; the review screen shows both panels separately. Drafts autosave locally. Submissions enter moderation (`pending`); all claims start `creator-reported` and `pending`. Public text is scanned for secrets/internal endpoints; blocking findings stop submission.

Connected-mode save order: record (without Blueprint links) → children → Blueprint → version → items → record update with `derivedBlueprintIds`. Triggers force trusted fields and send approved records back to moderation on any material or child edit.
