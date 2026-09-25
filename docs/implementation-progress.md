# Implementation progress

Working branch: `claude/oracnet-implementation-completion-inadg1`, based on `feature/implementation-intelligence` @ 4ed74b7 (PR #2, CI green at handoff).

## Audit of handoff state (2026-09-25)

Baseline: lint, typecheck and 32 unit tests pass. E2E needs `CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` locally (Playwright build mismatch in this container, not a code defect).

| Area | State at handoff |
| --- | --- |
| Routes/pages for implementations, blueprints, compiler, verify, wizard, workspaces | Present, demo-mode functional |
| Solution compiler | Partial: one candidate per Blueprint, no slot substitution, cost taken from source record, `Date.now()` ids, no decision trace, pseudo-scores |
| Context similarity | Partial: word overlap only, no set/range semantics |
| Fingerprint, PROV export, Blueprint manifest (CycloneDX/SPDX), rights logic, sanitization, computed staleness | Absent |
| Attestation | Demo token = plain id; no hashing/scope/expiry/revocation logic |
| Admin review | Mostly read-only lists |
| Search | Implementation index lacks technology names/evidence; `/search` renders BuildDiscovery (Search.tsx orphaned) |
| Seed | Stacks lack CRM/calendar; all records on `customer-support`; property record linked to a dental Build; every relationship `observed-together` |
| Tests | No unit or E2E coverage for any intelligence feature |

## Workstreams
- [ ] Domain core (similarity, fingerprint, metrics, evidence signals, staleness, rights, sanitization, provenance, manifest, attestation, compiler)
- [ ] Seed coherence
- [ ] UI (compiler, detail, discovery, compare, blueprints, attestation, wizard, admin, implementer profile)
- [ ] Supabase migration/RLS/Edge Functions/security tests
- [ ] E2E + visual/a11y QA, docs, quality gate

## Decisions
- Designated push branch is `claude/oracnet-implementation-completion-inadg1`; its draft PR targets `feature/implementation-intelligence` so PR #2 stays the canonical integration PR.

## Known defects / blockers
RLS audit of `202609250001` (confirmed with PGlite), to fix in `202609250003`:
1. `claims` insert/update never checks subject ownership; claims can be retargeted; `claim_is_public` ignores status and trusts any relationship claim.
2. Accepted claims keep status/evidence level when predicate/unit/period/subject change.
3. Owners can self-set `evidenceLevel` on metrics/stack items/connections; trusted fields (provenance, staleness, permission) on insert.
4. Material edits after approval (non-core record fields, child rows, Blueprint versions/items/licenses) do not return to moderation.
5. Attestation rows insertable with `submitted` status/long expiry; no server token validation exists.
6. `claim_evidence` attachable to others' claims; `storagePath` can point into another user's folder.
7. Audit log records no old/new values, misses many tables; `verification_events`/`evidence_reviews` deletable by admins; `audit_events.actorId` FK blocks account deletion.
8. `solution_runs.requirementProfileId` can reference another user's profile; helper functions executable by anon.
9. Connected mode: claims/blueprints cannot round-trip through `upsert().select()`; many model fields have no column.
Security tests currently load neither intelligence migration.
