import { describe, expect, it } from "vitest";
import { seed } from "../src/data/seed";
import * as intel from "../src/data/intelligence-seed";
import { canonicalJson, sha256Hex } from "../src/data/canonical";
import { metricChange, metricComparability, describeChange } from "../src/data/metrics";
import { compareContexts, contextFromImplementation, similaritySummary } from "../src/data/context-similarity";
import { computeFingerprint, likelyDuplicate, FINGERPRINT_VERSION } from "../src/data/fingerprint";
import { computeFreshness, blueprintTriggers, freshnessPolicies } from "../src/data/staleness";
import { canReuse, blueprintPublicationGate } from "../src/data/rights";
import { scanText, sanitizationGate, sanitizationChecklist } from "../src/data/sanitization";
import { applyDecisions, createInvitation, hashToken, toVerifiableCredential, validateToken } from "../src/data/attestation";
import { toProvDocument } from "../src/data/provenance";
import { buildManifest, toCycloneDx, toSpdx } from "../src/data/manifest";
import { parseIntent, profileFromIntent, validateProfile } from "../src/data/requirement";
import { claimAfterMaterialEdit, evidenceSignals } from "../src/data/evidence";
import {
  collapseEquivalentVariants,
  compileSolutions,
  dominates,
  substituteComponent,
  verifyReproducibility,
  type CompilerCatalogue,
} from "../src/data/solution-compiler";
import type { RequirementProfile, SolutionCandidate } from "../src/data/intelligence-model";

const asOf = new Date("2026-09-25T12:00:00Z");
const products = seed.products!;
const catalogue: CompilerCatalogue = {
  implementations: intel.implementationRecords,
  contexts: intel.implementationContexts,
  implementationUseCases: intel.implementationUseCases,
  implementationStackItems: intel.implementationStackItems,
  implementationConnections: intel.implementationConnections,
  blueprints: intel.blueprints,
  blueprintVersions: intel.blueprintVersions,
  blueprintItems: intel.blueprintStackItems,
  blueprintConnections: intel.blueprintConnections,
  products,
  relationships: intel.technologyRelationships,
  compatibilityChecks: intel.compatibilityChecks,
};
const intent =
  "I run a property maintenance company with three branches. We use HubSpot. I want missed calls and web enquiries answered, qualified and booked automatically. Nobody on the team codes. Human approval for exceptions. Budget £1k–£5k setup.";
const baseProfile = (): RequirementProfile => profileFromIntent(intent, "buyer-1", "req-1", products);
const compile = (profile = baseProfile(), cat = catalogue) =>
  compileSolutions(profile, cat, { asOf, compiledAt: "2026-09-25T12:00:00.000Z" });

describe("canonical hashing", () => {
  it("produces standard SHA-256 digests and key-order independent JSON", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(canonicalJson({ a: [2, { c: 2, d: 1 }], b: 1 }));
  });
});

describe("metric model", () => {
  it("calculates absolute and relative change without causal wording", () => {
    const change = metricChange(47, 4, "minutes", "lower-better");
    expect(change.absolute).toBe(-43);
    expect(change.percentage).toBe(-91.5);
    expect(change.inPreferredDirection).toBe(true);
    const text = describeChange(change, "minutes");
    expect(text).toMatch(/Observed .* lower than baseline after implementation/);
    expect(text).not.toMatch(/caused|because|improv|result(ed)? in/i);
  });
  it("uses percentage points for rates and refuses undefined relative change", () => {
    const rate = metricChange(18, 23, "%", "higher-better");
    expect(rate.percentage).toBeNull();
    expect(rate.percentagePoints).toBe(5);
    expect(metricChange(0, 5, "count").percentage).toBeNull();
    expect(metricChange(null, 5, "count").absolute).toBeNull();
    expect(metricChange(10, 12, "count", "neutral").inPreferredDirection).toBeNull();
  });
  it("marks metrics comparable only with matching definitions and periods", () => {
    const a = intel.implementationMetrics.find((m) => m.id === "property-enquiry-automation-first-response-time")!;
    const b = intel.implementationMetrics.find((m) => m.id === "salon-booking-followup-first-response-time")!;
    const c = intel.implementationMetrics.find((m) => m.id === "agency-lead-routing-first-response-time")!;
    expect(metricComparability(a, b, intel.measurementPeriods).state).toBe("comparable");
    expect(metricComparability(a, c, intel.measurementPeriods).state).toBe("comparable");
    expect(metricComparability(a, undefined, intel.measurementPeriods).state).toBe("missing");
    const other = intel.implementationMetrics.find((m) => m.id === "salon-booking-followup-booking-rate")!;
    expect(metricComparability(a, other, intel.measurementPeriods).state).toBe("not-comparable");
    const undisclosed = intel.implementationMetrics.find((m) => m.id === "property-enquiry-automation-monthly-software-cost")!;
    expect(metricComparability({ ...undisclosed, observedValue: null }, undisclosed, intel.measurementPeriods).state).toBe("not-disclosed");
  });
});

describe("context similarity", () => {
  const vector = (id: string) =>
    contextFromImplementation(
      intel.implementationRecords.find((r) => r.id === id)!,
      intel.implementationContexts.find((c) => c.implementationId === id),
      intel.implementationUseCases.filter((u) => u.implementationId === id).map((u) => u.useCaseId),
    );
  it("is deterministic, symmetric in level and explains itself", () => {
    const a = compareContexts(vector("property-enquiry-automation"), vector("trades-missed-call-textback"));
    const b = compareContexts(vector("property-enquiry-automation"), vector("trades-missed-call-textback"));
    expect(a).toEqual(b);
    expect(a.reasons.length).toBeGreaterThan(0);
    expect(similaritySummary(a)).toMatch(/contextual similarity because/);
    expect(similaritySummary(a)).not.toMatch(/will|predict|expect/i);
  });
  it("rates the same-outcome, same-scale business higher than a different sector", () => {
    const profile = baseProfile();
    const property = compile(profile).similarities["property-enquiry-automation"];
    const agency = compile(profile).similarities["agency-lead-routing"];
    expect(property.level).toBe("high");
    expect(agency.level).toBe("low");
    expect(property.reasons.join(" ")).toMatch(/Neither has an internal technical team/);
    expect(agency.differences.join(" ")).toMatch(/Different business type/);
  });
  it("lowers confidence when little context is recorded", () => {
    const sparse = compareContexts(
      { useCaseIds: [], businessType: "", industry: "", sizeBand: "", region: "", locations: null, volumeMin: null, volumeMax: null, systems: [], technicalCapability: null, regulatory: [], workflow: [] },
      vector("salon-booking-followup"),
    );
    expect(sparse.level).toBe("low");
    expect(sparse.unknowns!.length).toBeGreaterThan(5);
  });
});

describe("implementation fingerprint", () => {
  const input = (id: string) => ({
    record: intel.implementationRecords.find((r) => r.id === id)!,
    context: intel.implementationContexts.find((c) => c.implementationId === id),
    useCaseIds: intel.implementationUseCases.filter((u) => u.implementationId === id).map((u) => u.useCaseId),
    stackItems: intel.implementationStackItems.filter((s) => s.implementationId === id),
    connections: intel.implementationConnections.filter((c) => c.implementationId === id),
    processSteps: intel.processSteps.filter((s) => s.implementationId === id),
    relationships: intel.technologyRelationships,
  });
  it("is versioned, reproducible and free of private or free-text fields", () => {
    const a = computeFingerprint(input("property-enquiry-automation"));
    const b = computeFingerprint(input("property-enquiry-automation"));
    expect(a.fingerprintVersion).toBe(FINGERPRINT_VERSION);
    expect(a.digest).toBe(b.digest);
    expect(a.inputLineage.length).toBeGreaterThan(5);
    const serialized = JSON.stringify(a.canonical);
    expect(serialized).not.toContain("Fictional");
    expect(serialized).not.toContain("customerDisplayName");
    expect(a.tokens).toContain("tech:hubspot");
  });
  it("changes when architecture changes and flags near-duplicates only", () => {
    const base = input("property-enquiry-automation");
    const original = computeFingerprint(base);
    const renamed = computeFingerprint({ ...base, record: { ...base.record, id: "copy", name: "Different wording" } });
    const changed = computeFingerprint({ ...base, stackItems: base.stackItems.slice(0, 3) });
    expect(changed.digest).not.toBe(original.digest);
    expect(likelyDuplicate(original, renamed)).toBe(true);
    expect(likelyDuplicate(original, computeFingerprint(input("salon-booking-followup")))).toBe(false);
  });
});

describe("staleness", () => {
  const policy = freshnessPolicies.implementationEvidence;
  it("moves from current to review-due to stale with explicit reasons", () => {
    expect(computeFreshness({ lastReviewedAt: "2026-09-01" }, asOf, policy).state).toBe("current");
    expect(computeFreshness({ lastReviewedAt: "2026-02-01" }, asOf, policy).state).toBe("review-due");
    const stale = computeFreshness({ lastReviewedAt: "2025-08-01" }, asOf, policy);
    expect(stale.state).toBe("stale");
    expect(stale.reasons[0]).toMatch(/stale after 365/);
    expect(computeFreshness({}, asOf, policy).state).toBe("unknown");
    expect(computeFreshness({ lastReviewedAt: "2026-09-01", archived: true }, asOf, policy).state).toBe("archived");
    expect(computeFreshness({ lastReviewedAt: "2026-09-01", nextReviewAt: "2026-09-10" }, asOf, policy).state).toBe("review-due");
  });
  it("marks Blueprints stale when a component is retired or incompatible", () => {
    const items = intel.blueprintStackItems.filter((i) => i.blueprintVersionId === "missed-call-textback-v2");
    const retired = products.map((p) => (p.id === "make" ? { ...p, lifecycleState: "retired" as const } : p));
    const triggers = blueprintTriggers(items, retired, intel.technologyRelationships);
    expect(triggers.map((t) => t.kind)).toContain("product-retired");
    expect(computeFreshness({ lastReviewedAt: "2026-09-20", triggers }, asOf, policy).state).toBe("stale");
  });
});

describe("rights and sanitization", () => {
  it("never treats public visibility as reuse permission", () => {
    const showcase = intel.blueprints.find((b) => b.id === "voice-reservation-reference")!;
    expect(canReuse(showcase, "reference").allowed).toBe(false);
    expect(canReuse(showcase, "view").allowed).toBe(true);
    const reference = intel.blueprints.find((b) => b.id === "inquiry-booking-reference")!;
    expect(canReuse(reference, "commercial").allowed).toBe(false);
    expect(canReuse({ reuseRights: "custom-license", commercialUseAllowed: false }, "commercial").allowed).toBe("conditional");
    expect(canReuse(intel.blueprints.find((b) => b.id === "missed-call-textback")!, "redistribute").allowed).toBe(true);
    expect(blueprintPublicationGate(intel.blueprints.find((b) => b.id === "salon-followup-draft")!).ready).toBe(false);
    expect(blueprintPublicationGate(reference).ready).toBe(true);
  });
  it("detects secrets, internal endpoints and personal data", () => {
    const findings = scanText(
      "Use key sk-live_abcdefghijklmnopqrstuv and call http://crm.internal:8080/api or 192.168.1.20. Contact jane@example.co.uk / +44 7700 900123. password: hunter22. postgres://admin:pw@db.example.com/prod 4111 1111 1111 1111",
      "setupNotes",
    );
    const kinds = new Set(findings.map((f) => f.kind));
    for (const kind of ["api-key", "internal-endpoint", "ip-address", "email", "phone", "password", "connection-string", "payment-card"])
      expect(kinds, kind).toContain(kind);
    expect(findings.every((f) => !f.excerpt.includes("abcdefghijklmnop"))).toBe(true);
    expect(scanText("Capture enquiries and route exceptions to staff.", "x")).toEqual([]);
  });
  it("requires every checklist item and no blocking finding", () => {
    const all = sanitizationChecklist.map((item) => item.id);
    expect(sanitizationGate(all, []).ready).toBe(true);
    expect(sanitizationGate(all.slice(1), []).ready).toBe(false);
    expect(sanitizationGate(all, scanText("token: abcdefghijklmnopqrstuvwxyz", "x")).ready).toBe(false);
  });
});

describe("customer attestation", () => {
  const now = new Date("2026-09-25T10:00:00Z");
  const claims = intel.claims.filter((c) => c.subjectId === "salon-booking-followup" || c.subjectId.startsWith("salon-booking-followup-"));
  const scoped = claims.slice(0, 2).map((c) => c.id);
  const invite = () =>
    createInvitation({ implementationId: "salon-booking-followup", ownerId: "demo-user", claimIds: scoped, attestorLabel: "Salon owner", visibility: "anonymous", now, demo: true });

  it("stores only a hash of an unguessable token", () => {
    const { attestation, token } = invite();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(attestation.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(attestation)).not.toContain(token);
    expect(invite().token).not.toBe(token);
  });
  it("rejects invalid, expired, revoked and reused tokens", () => {
    const { attestation, token } = invite();
    expect(validateToken(token, [attestation], now).ok).toBe(true);
    expect(validateToken("x".repeat(43), [attestation], now)).toEqual({ ok: false, reason: "invalid" });
    expect(validateToken(token, [attestation], new Date("2027-01-01"))).toEqual({ ok: false, reason: "expired" });
    expect(validateToken(token, [{ ...attestation, status: "revoked" }], now)).toEqual({ ok: false, reason: "revoked" });
    expect(validateToken(token, [{ ...attestation, status: "submitted" }], now)).toEqual({ ok: false, reason: "used" });
  });
  it("only changes invitation-scoped claims and records events", () => {
    const { attestation } = invite();
    expect(() => applyDecisions(attestation, claims, { [claims[3].id]: "confirm" }, "anonymous", now, "customer")).toThrow(/outside this invitation/);
    const result = applyDecisions(attestation, claims, { [scoped[0]]: "confirm", [scoped[1]]: "reject" }, "private", now, "customer");
    expect(result.attestation.status).toBe("submitted");
    expect(result.attestation.customerIdentityVisibility).toBe("private");
    expect(result.claims.find((c) => c.id === scoped[0])!.evidenceLevel).toBe("customer-attested");
    expect(result.claims.find((c) => c.id === scoped[1])!.status).toBe("rejected");
    expect(result.events).toHaveLength(2);
    const vc = toVerifiableCredential(result.attestation, result.claims, "https://example.org/issuer");
    expect(vc["@context"][0]).toBe("https://www.w3.org/ns/credentials/v2");
    expect(vc.proof).toBeNull();
    expect(vc.credentialSubject.attestor).toBe("Customer (identity withheld)");
  });
  it("seeds the demo invitation by hash only", () => {
    expect(validateToken(intel.DEMO_ATTESTATION_TOKEN, intel.attestations, now).ok).toBe(true);
  });
});

describe("evidence signals and provenance", () => {
  it("describes claims without a universal score", () => {
    const claim = intel.claims.find((c) => c.id === "property-enquiry-automation-booking-rate-claim")!;
    const signals = evidenceSignals(claim, intel.claimEvidence, intel.evidenceArtifacts, intel.evidenceReviews, asOf);
    expect(signals.independence).toBe("synthetic");
    expect(signals.directness).toBe("direct");
    expect(signals.reviewStatus).toBe("needs-more-evidence");
    expect(Object.keys(signals)).not.toContain("score");
  });
  it("returns edited claims to review", () => {
    const claim = { ...intel.claims[0], evidenceLevel: "evidence-reviewed" as const, status: "accepted" as const };
    const edited = claimAfterMaterialEdit(claim, { value: "Different" });
    expect(edited.status).toBe("pending");
    expect(edited.evidenceLevel).toBe("creator-reported");
    expect(claimAfterMaterialEdit(claim, { name: "Renamed" }).status).toBe("accepted");
  });
  it("exports PROV without private storage paths or withheld identities", () => {
    const id = "property-enquiry-automation";
    const doc = toProvDocument({
      record: intel.implementationRecords.find((r) => r.id === id)!,
      metrics: intel.implementationMetrics.filter((m) => m.implementationId === id),
      periods: intel.measurementPeriods.filter((p) => p.implementationId === id),
      claims: intel.claims.filter((c) => c.subjectId.startsWith(id)),
      links: intel.claimEvidence,
      artifacts: intel.evidenceArtifacts.map((a) => ({ ...a, storagePath: "implementation-evidence/secret/file.pdf" })),
      reviews: intel.evidenceReviews,
      attestations: [],
      events: [],
    });
    const json = JSON.stringify(doc);
    expect(json).not.toContain("implementation-evidence/secret");
    expect(json).not.toContain("Fictional demo business");
    expect(Object.keys(doc.entity).some((k) => k.startsWith("oracnet:metric/"))).toBe(true);
    expect(Object.keys(doc.wasAttributedTo).length).toBeGreaterThan(0);
    expect(Object.keys(doc.activity).some((k) => k.startsWith("oracnet:review/"))).toBe(true);
  });
});

describe("Blueprint manifest adapters", () => {
  const blueprint = intel.blueprints.find((b) => b.id === "inquiry-booking-reference")!;
  const manifest = (versionId: string) =>
    buildManifest({
      blueprint,
      version: intel.blueprintVersions.find((v) => v.id === versionId)!,
      items: intel.blueprintStackItems,
      connections: intel.blueprintConnections,
      requirements: intel.blueprintRequirements,
      license: intel.blueprintLicenses.find((l) => l.blueprintId === blueprint.id),
      products,
      providers: seed.providers!,
    });
  it("keeps historical versions inspectable", () => {
    const v1 = manifest("inquiry-booking-reference-v1");
    const v11 = manifest("inquiry-booking-reference-v1-1");
    expect(v1.capabilitySlots).toHaveLength(5);
    expect(v11.capabilitySlots).toHaveLength(7);
    expect(v11.license.commercialUse).toBe(false);
  });
  it("exports CycloneDX 1.6 services/dependencies and SPDX 2.3 packages deterministically", () => {
    const v11 = manifest("inquiry-booking-reference-v1-1");
    const cdx = toCycloneDx(v11);
    expect(cdx.bomFormat).toBe("CycloneDX");
    expect(cdx.specVersion).toBe("1.6");
    expect(cdx.serialNumber).toMatch(/^urn:uuid:[0-9a-f-]{36}$/);
    expect(cdx.services.map((s) => s["bom-ref"])).toContain("component:hubspot");
    expect(cdx.dependencies[0].dependsOn).toHaveLength(7);
    expect(toCycloneDx(v11)).toEqual(cdx);
    const spdx = toSpdx(v11);
    expect(spdx.spdxVersion).toBe("SPDX-2.3");
    expect(spdx.packages[0].licenseDeclared).toBe("LicenseRef-Oracnet-reference-architecture");
    expect(spdx.relationships.filter((r) => r.relationshipType === "DEPENDS_ON")).toHaveLength(7);
  });
});

describe("requirement normalization", () => {
  it("extracts editable, inferred values deterministically", () => {
    const parsed = parseIntent(intent, products);
    expect(parsed.values.useCaseId).toBe("enquiry-to-booking");
    expect(parsed.values.businessType).toBe("Property maintenance services");
    expect(parsed.values.locations).toBe(3);
    expect(parsed.values.mustKeepSystems).toEqual(["HubSpot CRM"]);
    expect(parsed.values.technicalCapability).toBe("none");
    expect(parsed.values.humanApprovalRequired).toBe(true);
    expect(parsed.values.budgetMin).toBe(1000);
    expect(parsed.values.budgetMax).toBe(5000);
    expect(parsed.inferredFields).toContain("mustKeepSystems");
    expect(parseIntent(intent, products)).toEqual(parsed);
  });
  it("does not invent unstated values", () => {
    const parsed = parseIntent("Help us answer web enquiries faster", products);
    expect(parsed.values.region).toBeUndefined();
    expect(parsed.values.budgetMax).toBeUndefined();
    expect(parsed.values.locations).toBeUndefined();
  });
  it("validates the profile schema", () => {
    expect(validateProfile(baseProfile()).ok).toBe(true);
    expect(validateProfile({ ...baseProfile(), budgetMin: 9000, budgetMax: 1000 }).ok).toBe(false);
    expect(validateProfile({ ...baseProfile(), locations: -2 }).ok).toBe(false);
  });
});

describe("solution compiler", () => {
  it("returns several feasible, non-dominated options with supported labels only", () => {
    const result = compile();
    const shown = result.candidates.filter((c) => !c.dominated);
    expect(shown.length).toBeGreaterThanOrEqual(2);
    expect(new Set(shown.map((c) => c.sourceBlueprintId)).size).toBeGreaterThanOrEqual(2);
    for (const candidate of result.candidates) {
      expect(candidate.feasible).toBe(true);
      expect(candidate.tradeoffLabels).not.toContain("Best stack");
      expect(candidate).not.toHaveProperty("score");
    }
    const cheapest = shown.find((c) => c.tradeoffLabels.includes("Lower estimated setup cost"))!;
    for (const other of shown) expect(cheapest.objectives.setupCost.high!).toBeLessThanOrEqual(other.objectives.setupCost.high ?? Infinity);
    expect(result.stages.map((s) => s.label)).toEqual([
      "Understanding requirement",
      "Finding comparable implementations",
      "Evaluating Blueprint patterns",
      "Checking hard constraints",
      "Checking technology compatibility",
      "Producing feasible approaches",
    ]);
  });
  it("keeps must-keep systems and excludes outcome mismatches with reasons", () => {
    const result = compile();
    for (const candidate of result.candidates) {
      const keep = candidate.constraintResults.find((r) => r.id === "mustKeepSystems:hubspot")!;
      expect(keep.outcome).toBe("satisfied");
      expect(Object.values(candidate.assignment)).not.toContain("pipedrive");
    }
    expect(result.trace.exclusions.find((e) => e.id === "voice-reservation-reference")!.reason).toMatch(/different outcome/);
  });
  it("excludes incompatible handoffs and never treats observed-together as verified", () => {
    const profile = { ...baseProfile(), mustKeepSystems: [] };
    const result = compile(profile);
    const excluded = result.trace.exclusions.filter((e) => /flow-agent ↔ pipedrive/.test(e.reason));
    expect(excluded.length).toBeGreaterThan(0);
    const observedOnly: CompilerCatalogue = {
      ...catalogue,
      relationships: catalogue.relationships.map((r) => (r.id === "rel-n8n-hubspot" ? { ...r, relationshipType: "observed-together" as const } : r)),
    };
    const again = compile(baseProfile(), observedOnly);
    const withN8n = again.candidates.find((c) => Object.values(c.assignment).includes("n8n") && Object.values(c.assignment).includes("hubspot"));
    expect(withN8n?.constraintResults.find((r) => r.id === "compatibility")?.outcome).toBe("unknown");
    expect(withN8n?.unknownHardConstraints).toContain("Every component handoff is compatible");
  });
  it("applies hard vs soft strength to the same constraint", () => {
    const soft = compile({ ...baseProfile(), budgetMax: 3000 });
    expect(soft.candidates.some((c) => c.sourceBlueprintId === "inquiry-booking-reference")).toBe(true);
    const hard = compile({ ...baseProfile(), budgetMax: 3000, strengths: { budgetMax: "hard" } });
    expect(hard.candidates.some((c) => c.sourceBlueprintId === "inquiry-booking-reference")).toBe(false);
    expect(hard.trace.exclusions.some((e) => /Setup cost starts at 3,500/.test(e.reason) || /starts at 3,500/.test(e.reason))).toBe(true);
    const commercial = compile({ ...baseProfile(), commercialReuseRequired: true });
    expect(commercial.candidates.every((c) => c.sourceBlueprintId !== "inquiry-booking-reference")).toBe(true);
  });
  it("is reproducible and records a decision trace", () => {
    const a = compile();
    const b = compile();
    expect(a.run.resultDigest).toBe(b.run.resultDigest);
    expect(a.run.id).toBe(b.run.id);
    expect(a.trace.profileSnapshot).toEqual(baseProfile());
    expect(a.trace.catalogueDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(a.trace.compatibilityEvidenceIds.length).toBeGreaterThan(0);
    expect(verifyReproducibility(a.run, catalogue).reproducible).toBe(true);
    const changed = { ...catalogue, relationships: catalogue.relationships.slice(1) };
    expect(verifyReproducibility(a.run, changed).reproducible).toBe(false);
  });
  it("re-validates substitutions instead of assuming feasibility", () => {
    const result = compile({ ...baseProfile(), mustKeepSystems: [] });
    const candidate = result.candidates.find((c) => c.sourceBlueprintId === "inquiry-booking-reference")!;
    const crmSlot = Object.keys(candidate.assignment).find((slot) => candidate.assignment[slot] === "hubspot" || candidate.assignment[slot] === "pipedrive")!;
    const automationSlot = Object.keys(candidate.assignment).find((slot) => ["n8n", "make", "flow-agent"].includes(candidate.assignment[slot]))!;
    const withPipedrive = substituteComponent(result, candidate.id, crmSlot, "pipedrive", catalogue);
    const intermediate = withPipedrive.candidates.find((c) => c.substituted)!;
    const broken = substituteComponent(withPipedrive, intermediate.id, automationSlot, "flow-agent", catalogue);
    const final = broken.candidates.find((c) => c.substituted && c.assignment[automationSlot] === "flow-agent")!;
    expect(final.feasible).toBe(false);
    expect(final.constraintResults.find((r) => r.id === "compatibility")!.outcome).toBe("violated");
    expect(broken.trace.substitutions).toHaveLength(2);
  });
  it("uses a conservative Pareto rule that never compares unknown values", () => {
    const candidate = compile().candidates[0];
    const better: SolutionCandidate = { ...candidate, id: "b", objectives: { ...candidate.objectives, complexity: candidate.objectives.complexity - 1 } };
    expect(dominates(better, candidate)).toBe(true);
    expect(dominates(candidate, better)).toBe(false);
    const unknownCost: SolutionCandidate = { ...better, objectives: { ...better.objectives, setupCost: { low: null, high: null } } };
    expect(dominates(unknownCost, candidate)).toBe(false);
    expect(dominates(candidate, unknownCost)).toBe(false);
  });
  it("collapses equivalent variants into one representative", () => {
    const candidate = compile().candidates[0];
    const twin = { ...candidate, id: "zz-twin" };
    const collapsed = collapseEquivalentVariants([candidate, twin], catalogue);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].equivalentVariants).toBe(1);
  });
  it("never lets sponsorship or provenance labels change organic results", () => {
    const sponsored = { ...catalogue, products: products.map((p) => (p.id === "make" ? { ...p, provenance: "vendor supplied" as const } : p)) };
    expect(compile(baseProfile(), sponsored).run.resultDigest).toBe(compile().run.resultDigest);
  });
});
