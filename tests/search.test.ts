import { describe, expect, it } from "vitest";
import { seed } from "../src/data/seed";
import * as intel from "../src/data/intelligence-seed";
import { searchDocuments, searchIndex, stem } from "../src/data/search";

const docs = searchDocuments({
  implementations: [...intel.implementationRecords, { ...intel.implementationRecords[0], id: "private-draft", slug: "private-draft", name: "Private draft HubSpot automation", publicationState: "draft", visibility: "private", moderationState: "pending" }],
  implementationContexts: intel.implementationContexts,
  implementationStackItems: intel.implementationStackItems,
  implementationUseCases: intel.implementationUseCases,
  claims: intel.claims,
  blueprints: intel.blueprints,
  blueprintItems: intel.blueprintStackItems,
  builds: seed.builds ?? [],
  products: seed.products!,
  creators: seed.creator_profiles ?? [],
  providers: seed.providers!,
  implementers: seed.integrators,
  cases: seed.use_cases!,
  stacks: seed.solution_stacks!,
  articles: seed.articles!,
});
const now = new Date("2026-09-25");
const ids = (query: string, type?: string) => searchIndex(docs, query, type, now).map((doc) => doc.id);

describe("deterministic search", () => {
  it("stems consistently", () => {
    expect(stem("automation")).toBe(stem("automate"));
    expect(stem("calls")).toBe("call");
  });
  it("answers the launch queries", () => {
    expect(ids("automate missed calls")).toContain("trades-missed-call-textback");
    expect(ids("restaurant booking automation")).toContain("hospitality-reservation-assist");
    expect(ids("service businesses using HubSpot")).toContain("property-enquiry-automation");
    const both = ids("implementations using Twilio and HubSpot");
    expect(both).toEqual(expect.arrayContaining(["property-enquiry-automation", "trades-missed-call-textback"]));
    expect(both).not.toContain("agency-lead-routing");
    expect(searchIndex(docs, "implementations using Twilio and HubSpot", undefined, now).every((doc) => doc.type === "Implementation")).toBe(true);
    expect(ids("Blueprint with human approval")).toContain("inquiry-booking-reference");
    expect(ids("Blueprint with human approval")).not.toContain("salon-followup-draft");
    const reviewed = ids("implementations reviewed this year");
    expect(reviewed).toContain("property-enquiry-automation");
    expect(reviewed).not.toContain("trades-missed-call-textback");
  });
  it("never indexes private or unapproved records", () => {
    expect(ids("private draft hubspot")).not.toContain("private-draft");
    expect(docs.some((doc) => doc.id === "salon-followup-draft")).toBe(false);
  });
  it("finds customer-attested claims only when they exist", () => {
    expect(ids("customer-attested enquiry automation")).toEqual([]);
    const attested = searchDocuments({
      implementations: intel.implementationRecords,
      claims: intel.claims.map((claim) => (claim.subjectId === "salon-booking-followup" ? { ...claim, evidenceLevel: "customer-attested" as const } : claim)),
      builds: [], products: seed.products!, creators: [], providers: [], cases: seed.use_cases!, stacks: [], articles: [],
    });
    expect(searchIndex(attested, "customer-attested enquiry", undefined, now).map((doc) => doc.id)).toEqual(["salon-booking-followup"]);
  });
});
