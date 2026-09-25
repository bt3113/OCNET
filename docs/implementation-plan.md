# Implementation intelligence execution plan

This branch evolves Oracnet from a Build-led marketplace into a vendor-neutral implementation intelligence and procurement layer without removing Builds, stacks, providers, creators, or buyer Projects.

## Status

All seven workstreams are implemented; current state, decisions and remaining gaps are tracked in [implementation-progress.md](implementation-progress.md) and verification in [qa.md](qa.md).

## Workstreams

1. **Domain model** — add Implementation Records, normalized metrics/claims/evidence, versioned Blueprints, compatibility relationships, Requirement Profiles and reproducible Solution Runs.
2. **Deterministic intelligence** — add context similarity, constraint evaluation, candidate composition, evidence-aware explanations and Pareto filtering. AI remains optional input normalization only.
3. **Public UX** — add implementation discovery/detail/comparison, Blueprint discovery/detail and a non-chat Solution Compiler. Rework the homepage around outcomes and evidence.
4. **Contributor/verification UX** — add implementation submission, claim/evidence capture, demo customer attestation and Blueprint derivation semantics.
5. **Procurement bridge** — let Implementation/Blueprint pages prefill the existing buyer Project model rather than replacing it.
6. **Connected backend** — add relational Supabase migration, RLS/private evidence boundaries, audit events and search-ready structures while retaining browser-local demo mode.
7. **Quality** — add deterministic unit tests, E2E coverage, responsive/accessibility styles, security documentation and production-hosting boundaries.

## Acceptance principles

- A Build is not automatically evidence.
- An Implementation Record is observational; outcomes never imply causality.
- Reusable Blueprint/IP is distinct from a customer deployment record.
- Material claims have claim-level provenance and evidence states.
- Demo records are explicitly synthetic and never presented as real customers or verified outcomes.
- Organic compiler results are deterministic, explainable and not influenced by sponsorship.
- GitHub Pages remains a non-commercial demo; connected/private workflows are designed for Supabase/production hosting.
