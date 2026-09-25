# Verification model

Verification is per claim. There is no record-wide green tick and no universal quality score.

## Evidence levels (methods, not a truth ranking)

`creator-reported`, `customer-attested`, `evidence-reviewed`, `platform-observed`, `independently-audited`, `unverified`, `demo`. Labels and plain-language descriptions live in `src/data/evidence.ts`.

## Claim

A claim links **subject** (implementation, metric, Blueprint, technology relationship) → **predicate/value/unit/period** → **claimant** (name + type) → **evidence method** → **evidence artifacts** (`claim_evidence`: supports / contradicts / context) → **reviews** → **verification events** → **provenance** → **freshness**. Each claim exposes: claimant, method, level, source metadata, measurement period, last review, known limitations.

`evidenceSignals()` describes a claim along independence, directness, freshness, review status and specificity, plus supporting/contradicting counts. These are displayed as separate facts and are never combined.

## Lifecycle rules (enforced in SQL; mirrored in `src/data/review.ts`)

- New claims by non-trusted users are forced to `pending` / `creator-reported`.
- Claims must be attached to a subject the user can edit (except a private `provider-correction`).
- Changing subject, predicate, value, unit, period or visibility resets status and evidence level.
- Only reviewers upgrade evidence (`sufficient` → `evidence-reviewed`); revocation requires a reason.
- A claim is public only when `public`, `accepted` and attached to a public subject.
- Reviews, verification events and audit events are append-only.

## Customer attestation

Route `/verify/:token`. A record owner invites a customer to confirm or reject selected claims and choose identity visibility (public / anonymous publicly / private to Oracnet).

- Token: 256-bit random, base64url, delivered once; stored only as `SHA-256("oracnet-attestation:v1:" + token)`.
- Scoped to listed `claimIds`, single purpose, 14-day expiry, revocable, single use.
- Connected mode: the `attestation` Edge Function creates invitations (ownership + claim-scope checks in `create_attestation`), emails the link through the provider abstraction and fails closed if email is not configured; `load` and `submit` take the token in the POST body only; `apply_attestation` applies all decisions atomically with a row lock and deletes the contact email afterwards. Invalid, expired, revoked and used tokens return the same response.
- Demo mode: the page states DEMO, never claims an email was sent, and stores only the hash in browser storage. The seeded walkthrough token is public by design.

## Verifiable credentials

`toVerifiableCredential()` maps a submitted attestation to the W3C VC Data Model 2.0 shape (`@context` v2, `issuer`, `validFrom`, `validUntil`, `credentialSubject.claims`, `credentialStatus`). V1 output is explicitly **unsigned** (`proof: null`). No blockchain, wallet or token mechanics.

## Freshness

`computeFreshness()` gives CURRENT / REVIEW_DUE / STALE / ARCHIVED / UNKNOWN from last review date, policy window and triggers (retired or deprecated product, recorded incompatibility, failed compatibility check, missed scheduled review). Policies: implementation evidence 180/365 days, Blueprint compatibility 120/270, technology relationships 180/365. The UI always shows the computed state.
