# Provenance model

The relational tables stay canonical. `src/data/provenance.ts` exports a W3C PROV view (PROV-JSON serialization) and a chronological timeline for the UI. It is not an RDF store.

| PROV concept | Oracnet mapping |
| --- | --- |
| Entity | implementation record, metric value, claim, evidence artifact (metadata only) |
| Activity | measurement period, evidence review, customer attestation |
| Agent | claimant (with role), customer attestor (identity per visibility), reviewer (role only), Oracnet platform |
| wasGeneratedBy | metric value ← measurement period |
| wasDerivedFrom | metric ← implementation; claim ← subject; claim ← supporting evidence |
| wasAttributedTo | claim → claimant; confirmed claim → customer attestor |
| used | review/attestation used the claim |
| wasAssociatedWith | review → reviewer role; attestation → attestor |

Exclusions: storage paths, reviewer identities, private customer names and private claims are never exported. Withheld identities appear as “Customer (identity withheld)”.

The detail page offers **Export W3C PROV-JSON**. Provenance stays queryable relationally (`claims`, `claim_evidence`, `evidence_reviews`, `verification_events`, `attestations`, `audit_events`).

## Audit trail

Database triggers write `audit_events` for records, claims, Blueprints and versions, licences, relationships, compatibility checks, attestations, evidence, reviews, verification events, stack items, metrics and role changes. Each event stores the list of changed field names; values are kept only for state fields (verification, evidence level, status, moderation, publication, relationship type, rights, visibility). Rows are append-only for every role, including the service role. `actorId` is kept without a foreign key so account deletion does not erase history; this is pseudonymous personal data covered by the retention policy in [production architecture](production-architecture.md).
