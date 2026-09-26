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

## Workstreams (all complete on this branch)

- [x] Domain core: context similarity, fingerprint v1.0, metrics, evidence signals, staleness, rights, sanitization, PROV-JSON, manifests (CycloneDX 1.7 / SPDX 2.3), attestation tokens, deterministic compiler with decision trace
- [x] Seed coherence: 5 illustrative records across 3 use cases, 5 Blueprints (all rights/staleness states represented), 30 typed relationships including incompatible and requires-middleware
- [x] UI: compiler, implementation detail/discovery/comparison, Blueprints, verification, 15-step wizard, creator/provider/admin workspaces, implementer profiles, unified search
- [x] Supabase: `202609250003` hardening (all 9 audit defects below), `202609250004` RRF search, `attestation` and `evidence` Edge Functions, 19 PGlite RLS tests
- [x] QA and docs: see `docs/qa.md`

## Decisions

- Designated push branch is `claude/oracnet-implementation-completion-inadg1`; its draft PR targets `feature/implementation-intelligence` so PR #2 stays the canonical integration PR.
- Relational model stays canonical; PROV, CycloneDX, SPDX and VC 2.0 are export adapters.
- Compiler stays a TypeScript enumerator with Pareto filtering; no solver service, no AI in ranking.
- Custom SVG architecture map instead of a graph library.
- Demo admin/provider workspaces stay reachable (labelled) so the demo is explorable; connected mode enforces roles in RLS.
- Candidate explanations are stored on `solution_candidates.explanation`; the unused `solution_explanations` table was dropped in `202609270001`.

## Audit defects (all fixed in `202609250003`, covered by `tests/security/intelligence-rls.test.ts`)

1. Claims could target or be moved to others' subjects; `claim_is_public` ignored status.
2. Accepted claims kept their status after material changes.
3. Owners could self-set evidence levels and trusted fields.
4. Material edits after approval did not return to moderation.
5. Attestations insertable as submitted; no server-side token validation.
6. `claim_evidence` and `storagePath` could point at others' claims or folders.
7. Audit log lacked old/new values and coverage; review rows deletable; `actorId` FK blocked account deletion.
8. `solution_runs` could reference others' profiles; helpers executable by anon.
9. Connected-mode round-trips failed for claims/Blueprints; model fields had no columns.

## Remaining gaps

- Not exercised against a provisioned Supabase project: migrations 0003/0004, Edge Functions, signed Storage, mail delivery (Resend), multi-user RLS on real Postgres, `hybrid_search_rrf` (needs pgvector and an embedding job).
- VC 2.0 output is unsigned; no issuer key management.
- No scheduled job yet for attestation expiry, contact purge, freshness recompute or embeddings.
- Dynamic metadata for unknown slugs still relies on the SPA fallback on GitHub Pages (see `docs/production-architecture.md`).
- Manual screen-reader testing and field performance measurement not done.
- Legal/privacy review of rights states, retention periods, attestation wording and terms is outstanding.
