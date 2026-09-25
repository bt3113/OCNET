import { describe, expect, it } from "vitest";
import { seed } from "../src/data/seed";
import { metricDefinitions } from "../src/data/intelligence-seed";
import { buildSubmission, emptyDraft, validateStep, type ContributionDraft } from "../src/data/contribution";
import { sanitizationChecklist } from "../src/data/sanitization";
import { moderateBlueprint, moderateImplementation, reviewClaim, revokeClaim, reviewRelationship } from "../src/data/review";
import { technologyRelationships } from "../src/data/intelligence-seed";

const draft: ContributionDraft = {
  ...emptyDraft,
  customerName: "Acme Plumbing Ltd",
  customerVisibility: "anonymous",
  customerPermission: true,
  name: "Missed-call follow-up for a plumbing firm",
  businessType: "Plumbing and heating trades",
  contextSummary: "Single-site plumbing firm, owner handles bookings between jobs.",
  problem: "Missed calls while engineers were on jobs meant lost enquiries.",
  metricIds: ["missed-enquiry-rate", "first-response-time"],
  baseline: { "missed-enquiry-rate": 40, "first-response-time": 120 },
  observed: { "missed-enquiry-rate": 12, "first-response-time": 5 },
  observedStart: "2026-06-01",
  observedEnd: "2026-06-30",
  beforeProcess: "Call rings out\nOwner calls back in the evening",
  processChange: "Missed-call trigger",
  afterProcess: "SMS with form\nOwner reviews urgent jobs",
  stack: [
    { productId: "twilio", capabilityId: "telephony", role: "Missed-call trigger" },
    { productId: "make", capabilityId: "automation", role: "Workflow" },
  ],
  connections: [{ from: 0, to: 1, label: "Webhook", dataFlow: "Caller number", trustBoundary: true }],
  costDisclosure: "range",
  costLow: 800,
  costHigh: 1200,
  evidence: [{ kind: "analytics-export", description: "Phone system missed-call report" }],
  confidentialityConfirmed: true,
  declaration: true,
};
const build = (value = draft) =>
  buildSubmission(value, { id: "implementation-test-123456", ownerId: "user-1", now: new Date("2026-09-25T10:00:00Z"), demo: false, definitions: metricDefinitions, products: seed.products! });

describe("implementation contribution", () => {
  it("creates normalized, moderation-pending rows with creator-reported claims", () => {
    const result = build();
    expect(result.record.moderationState).toBe("pending");
    expect(result.record.verificationState).toBe("creator-reported");
    expect(result.record.costDisclosureType).toBe("range");
    expect(result.stack).toHaveLength(2);
    expect(result.connections[0].trustBoundary).toBe(true);
    expect(result.metrics.find((m) => m.metricDefinitionId === "missed-enquiry-rate")!.percentageChange).toBeNull();
    expect(result.claims.every((claim) => claim.status === "pending" && claim.evidenceLevel === "creator-reported")).toBe(true);
    expect(result.claims.map((claim) => claim.predicate)).toEqual(expect.arrayContaining(["architecture-deployed", "implementation-cost", "observed-value"]));
    expect(result.artifacts[0].private).toBe(true);
  });
  it("never puts a withheld customer identity into public rows", () => {
    const result = build();
    const publicRows = JSON.stringify({ ...result, privateCustomerName: undefined });
    expect(publicRows).not.toContain("Acme Plumbing");
    expect(result.privateCustomerName).toBe("Acme Plumbing Ltd");
    const publicDraft = build({ ...draft, customerVisibility: "public" });
    expect(publicDraft.record.customerDisplayName).toBe("Acme Plumbing Ltd");
  });
  it("validates steps, including public identity permission and cost ranges", () => {
    expect(validateStep(0, { ...draft, customerVisibility: "public", customerPermission: false })).toMatch(/permission/);
    expect(validateStep(6, { ...draft, stack: draft.stack.slice(0, 1) })).toMatch(/two components/);
    expect(validateStep(7, { ...draft, costLow: 2000, costHigh: 1000 })).toMatch(/valid cost range/);
    expect(validateStep(14, { ...draft, declaration: false })).toMatch(/declaration/);
  });
  it("derives a separate draft Blueprint only through the sanitization gate", () => {
    const withSecret = { ...draft, deriveBlueprint: true, blueprintName: "Missed-call pattern", blueprintSetupNotes: "api_key = sk-live_abcdefghijklmnopqrstuvwx", sanitizationConfirmed: sanitizationChecklist.map((item) => item.id) };
    expect(validateStep(13, withSecret)).toMatch(/Remove sensitive content/);
    expect(validateStep(13, { ...withSecret, blueprintSetupNotes: "", sanitizationConfirmed: [] })).toMatch(/checklist/);
    const clean = build({ ...withSecret, blueprintSetupNotes: "Share the calendar first." });
    expect(clean.blueprint!.blueprint.publicationState).toBe("draft");
    expect(clean.blueprint!.blueprint.moderationState).toBe("pending");
    expect(clean.blueprint!.blueprint.sanitizationConfirmedAt).toBe("2026-09-25");
    expect(clean.blueprint!.blueprint.derivedFromImplementationId).toBe(clean.record.id);
    expect(clean.record.derivedBlueprintIds).toEqual([clean.blueprint!.blueprint.id]);
    expect(JSON.stringify(clean.blueprint)).not.toContain("Acme");
  });
});

describe("review transitions", () => {
  const now = new Date("2026-09-25T10:00:00Z");
  const result = build();
  it("upgrades evidence only via a sufficient review and records events", () => {
    const claim = result.claims[0];
    const reviewed = reviewClaim(claim, "sufficient", "reviewer-1", "Checked export", now);
    expect(reviewed.claim.evidenceLevel).toBe("evidence-reviewed");
    expect(reviewed.event.previousLevel).toBe("creator-reported");
    expect(reviewed.audit.action).toBe("claim-review-sufficient");
    expect(reviewClaim(reviewed.claim, "insufficient", "reviewer-1", "", now).claim.evidenceLevel).toBe("creator-reported");
    expect(reviewClaim({ ...claim, evidenceLevel: "demo" }, "sufficient", "r", "", now).claim.evidenceLevel).toBe("evidence-reviewed");
  });
  it("requires reasons and permissions for sensitive transitions", () => {
    expect(() => revokeClaim(result.claims[0], "r", " ", now)).toThrow(/reason/);
    expect(revokeClaim(result.claims[0], "r", "Contradicted by invoice", now).claim.status).toBe("revoked");
    expect(() => moderateImplementation({ ...result.record, customerIdentityVisibility: "public", customerPermissionState: "pending" }, "approve", "r", now)).toThrow(/permission/);
    expect(moderateImplementation(result.record, "archive", "r", now).record.visibility).toBe("archived");
    const blueprint = build({ ...draft, deriveBlueprint: true, blueprintName: "Pattern name", sanitizationConfirmed: [] }).blueprint!.blueprint;
    expect(() => moderateBlueprint(blueprint, "approve", "r", now)).toThrow(/sanitization/);
    const observed = technologyRelationships.find((rel) => rel.relationshipType === "observed-together")!;
    expect(() => reviewRelationship(observed, "native-integration", "confirmed", "r", "", now)).toThrow(/evidence/);
    expect(reviewRelationship(observed, "native-integration", "confirmed", "r", "Vendor docs page", now).relationship.relationshipType).toBe("native-integration");
  });
});
