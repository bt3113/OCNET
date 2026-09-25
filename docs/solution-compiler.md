# Solution Compiler

Route `/solution-compiler`. Engine `1.0.0`, ruleset `2026-09-25.1`, code in `src/data/solution-compiler.ts`. The compiler is not a chatbot: free text is optional input, the authoritative output is structured data, and every sentence shown is derived from recorded values and constraint results.

## Pipeline

1. **Free-text intent (optional)** → deterministic parser (`requirement.ts`) → values tagged INFERRED.
2. **RequirementProfile** — editable cards; each constraint-capable field is HARD, SOFT or INFORMATIONAL (defaults: outcome, must-keep, required integrations, human approval, data residency, commercial reuse = hard; budgets, maintenance, team skill, region, deployment = soft). Zod validation blocks invalid profiles (e.g. min budget > max).
3. **Required capabilities** from the category template (e.g. inbound channel, reasoning, orchestration for enquiry → booking; equivalents allowed).
4. **Relevant implementations** — published records with the same use case or medium/high context similarity.
5. **Relevant Blueprints** — published, approved, not archived, same use case.
6. **Capability-slot graph** — each version’s slots with the selected product plus recorded alternatives (retired products removed). A must-keep product that fills a slot’s capability is forced into it.
7. **Enumeration** — deterministic cartesian product, capped at 48 per Blueprint (truncation recorded in the trace).
8. **Compatibility** — every connection is evaluated against typed relationships: native/API/webhook/connector = satisfied; custom integration = satisfied with extra complexity; requires-middleware = satisfied only if the middleware is present; `incompatible` = violated; `observed-together`, `unknown` or no record = **unknown**. Observed together is never treated as verified compatibility.
9. **Hard/soft constraints** — capabilities, compatibility, retired components, must-keep and required integrations (in the architecture or connectable), region availability, data residency, self-hosting, human-escalation slot, commercial reuse rights, setup/ongoing budget ranges, team administration skill. Missing attribute data yields `unknown`, never an assumed pass. A violated HARD constraint excludes the combination with its reason; SOFT violations are listed as preferences not met.
10. **Objectives (raw)** — setup cost range, ongoing cost range, maintenance hours range (Blueprint version estimate, else source record), complexity (components + 2 × custom integrations + middleware hops), typed-compatibility share, implementation evidence (published records using ≥60% of the components), flexibility (slots with alternatives), vendor diversity.
11. **Equivalent variants** — combinations of one Blueprint with identical objectives and constraint outcomes collapse to one representative (closest to the Blueprint defaults); the rest remain reachable via substitution.
12. **Pareto filter** — see below. Up to 6 dominated options can be shown on request.
13. **Trade-off labels** — only when the value is known, best among shown non-dominated options and strictly better than at least one: lower setup cost, lower ongoing cost, lower maintenance burden, simpler to operate, stronger implementation evidence, stronger compatibility evidence, greater flexibility, less vendor concentration. There is no “best stack”.
14. **Explanation** — why it fits, why it may not, hard constraints satisfied/unknown, soft preferences, comparable implementations, Blueprint source (version, rights, freshness), relationships with type and evidence, evidence coverage, unverified areas, cost basis.
15. **Decision trace** — profile snapshot, engine/ruleset/fingerprint-schema versions, as-of date, catalogue digest, required capabilities, relevant records, candidate pool, constraints applied, exclusions with reasons, relationship and record evidence ids, objective values, labels, substitutions.

## Pareto rule

Candidate B dominates A when, on every objective (setup high, ongoing high, maintenance high, complexity, typed-compatibility share, implementation evidence, flexibility), B is at least as good and it is strictly better on one. If one side’s value is unknown and the other’s is known, the pair is incomparable and neither dominates (unknown is never treated as good or bad). Ordering controls on the page change display order only; they never change values.

## Substitution

Changing a component re-runs `evaluateAssignment` for the new combination, then dominance and labels for the shown set. Feasibility is never carried over; the card states “Modified by you · re-validated” and shows any violated hard constraint. Substitutions are appended to the trace.

## Reproducibility

`inputDigest = SHA-256(profile snapshot, catalogue digest, engine, ruleset, as-of date)`; `resultDigest` covers inputs, shown candidates, constraint outcomes and exclusions (timestamps excluded). `verifyReproducibility(run, catalogue)` re-runs a saved snapshot and compares digests, or reports that the catalogue changed. Saved runs (`solution_runs`, `solution_candidates`, `solution_candidate_items`) keep the full trace.

## Solver boundary

A TypeScript evaluator is sufficient for V1 catalogue sizes (tens of combinations per Blueprint). A future OR-Tools CP-SAT/MIP service is justified only when enumeration caps are routinely hit; it would accept `RequirementProfile` + candidate components + constraints + objective dimensions and return feasible assignments, infeasibility reasons and objective values behind an authenticated server endpoint. No Python service is added now.

## Sponsorship

The compiler has no sponsorship input. A unit test asserts identical result digests when a product’s commercial provenance changes.
