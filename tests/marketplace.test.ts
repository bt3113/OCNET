import { describe, expect, it } from "vitest";
import { seed } from "../src/data/seed";
import { intelligenceSeed } from "../src/data/intelligence-seed";
import type { Build } from "../src/data/build-model";
import type { UseCase } from "../src/data/model";
import type { UseCaseProposal } from "../src/data/marketplace-model";
import {
  MAX_USE_CASES_PER_BUILD,
  addUseCase,
  approveProposal,
  buildMaturity,
  buildUseCaseErrors,
  canPropose,
  compilerCoverage,
  isIndexableBuild,
  makePrimary,
  mapProposal,
  mergeUseCases,
  resolveUseCase,
  suggestUseCases,
  supplyGaps,
  getUseCaseStats,
  type MarketplaceData,
} from "../src/data/use-case-domain";
import { solutionProviders, findSolutionProvider } from "../src/data/solution-providers";
import { titleGuidance, tidyTitle } from "../src/data/use-case-text";
import { XAI_PROVIDER_ID, xaiLegacyBuildRedirects } from "../src/data/vendor-xai";

const useCases = seed.use_cases!;
const aliases = seed.use_case_aliases!;
const providers = solutionProviders(seed.creator_profiles!, seed.integrators!, seed.consultants!);
const data: MarketplaceData = {
  useCases,
  sources: seed.use_case_sources!,
  builds: seed.builds!,
  products: seed.products!,
  implementations: intelligenceSeed.implementation_records!,
  implementationUseCases: intelligenceSeed.implementation_use_cases!,
  implementationStackItems: intelligenceSeed.implementation_stack_items!,
  blueprints: intelligenceSeed.blueprints!,
  blueprintItems: intelligenceSeed.blueprint_stack_items!,
  providers,
};
const build = (overrides: Partial<Build> = {}): Build => ({ ...seed.builds![0], useCaseIds: [], useCaseProposalId: undefined, ...overrides });
const approved = useCases.filter((useCase) => (useCase.status ?? "approved") === "approved").map((useCase) => useCase.id);

describe("Build ↔ Use Case rules", () => {
  it("accepts one, two or three Use Cases and refuses a fourth", () => {
    let ids: string[] = [];
    for (const id of approved.slice(0, 4)) ids = addUseCase(build({ useCaseIds: ids }), id);
    expect(ids).toHaveLength(MAX_USE_CASES_PER_BUILD);
    for (const count of [1, 2, 3]) expect(buildUseCaseErrors(build({ useCaseIds: approved.slice(0, count) }), useCases)).toEqual([]);
    expect(buildUseCaseErrors(build({ useCaseIds: approved.slice(0, 4) }), useCases).join(" ")).toMatch(/at most 3/);
    expect(buildUseCaseErrors(build({ useCaseIds: [] }), useCases).join(" ")).toMatch(/at least one/);
  });
  it("has exactly one primary Use Case: the first, which the provider can change", () => {
    const ids = approved.slice(0, 3);
    expect(makePrimary(ids, ids[2])).toEqual([ids[2], ids[0], ids[1]]);
    expect(makePrimary(ids, "not-selected")).toEqual(ids);
  });
  it("allows one proposal per Build and counts it toward the limit", () => {
    expect(canPropose(build({ useCaseIds: approved.slice(0, 2) }))).toBe(true);
    expect(canPropose(build({ useCaseIds: approved.slice(0, 1), useCaseProposalId: "p1" }))).toBe(false);
    expect(canPropose(build({ useCaseIds: approved.slice(0, 3) }))).toBe(false);
    expect(addUseCase(build({ useCaseIds: approved.slice(0, 2), useCaseProposalId: "p1" }), approved[2])).toHaveLength(2);
  });
  it("keeps a Build that relies only on a pending proposal out of discovery", () => {
    const pendingOnly = build({ useCaseIds: [], useCaseProposalId: "p1" });
    expect(isIndexableBuild(pendingOnly, useCases)).toBe(false);
    expect(isIndexableBuild(build({ useCaseIds: [approved[0]], useCaseProposalId: "p1" }), useCases)).toBe(true);
    const pendingUseCase: UseCase = { ...useCases[0], id: "pending-one", slug: "pending-one", status: "pending" };
    expect(isIndexableBuild(build({ useCaseIds: ["pending-one"] }), [...useCases, pendingUseCase])).toBe(false);
    expect(buildUseCaseErrors(build({ useCaseIds: ["pending-one"] }), [...useCases, pendingUseCase]).join(" ")).toMatch(/not an approved/);
  });
  it("seed Builds respect the limit and reference approved Use Cases", () => {
    for (const item of seed.builds!) expect(buildUseCaseErrors(item, useCases), item.id).toEqual([]);
  });
});

describe("Use Case suggestions and aliases", () => {
  it("finds a Use Case through a hidden search label without exposing it", () => {
    const [first] = suggestUseCases("invoice chasing", { useCases, aliases });
    expect(first.useCase.id).toBe("chase-overdue-invoices");
    expect(first.matchedLabel).toBeUndefined();
  });
  it("suggests from a Build name as the provider types", () => {
    const suggestions = suggestUseCases("Engineering change automation system that plans and implements code changes", { useCases, aliases });
    expect(suggestions.map((item) => item.useCase.id)).toContain("plan-and-implement-code-changes");
  });
  it("shows visible alternate labels that matched", () => {
    const [first] = suggestUseCases("Automate overdue invoice follow-up", { useCases, aliases });
    expect(first.useCase.id).toBe("chase-overdue-invoices");
    expect(first.matchedLabel).toBe("Automate overdue invoice follow-up");
  });
  it("never suggests excluded or unapproved Use Cases", () => {
    const pending: UseCase = { ...useCases[0], id: "draft-thing", slug: "draft-thing", name: "Chase overdue invoices twice", status: "pending" };
    const ids = suggestUseCases("chase overdue invoices", { useCases: [...useCases, pending], aliases }, { exclude: ["chase-overdue-invoices"] }).map((item) => item.useCase.id);
    expect(ids).not.toContain("draft-thing");
    expect(ids).not.toContain("chase-overdue-invoices");
  });
});

describe("Proposals and merges", () => {
  const proposal: UseCaseProposal = {
    id: "p1",
    name: "proposal",
    buildId: seed.builds![0].id,
    creatorId: "alex-chen",
    proposedBy: "demo-user",
    originalText: "automatically sending teh invoice to customer then recording it in xero",
    suggestedTitle: "Send invoices and record payments",
    suggestedCategoryId: "finance",
    suggestedSubcategoryId: "fin-ar",
    status: "pending",
    createdAt: "2026-09-26T10:00:00Z",
    provenance: "demo",
  };
  it("mapping to an existing Use Case repairs the Build and keeps the original text", () => {
    const target = useCases.find((useCase) => useCase.id === "chase-overdue-invoices")!;
    const result = mapProposal(proposal, target, build({ useCaseIds: [], useCaseProposalId: "p1" }), "admin");
    expect(result.build?.useCaseIds).toEqual(["chase-overdue-invoices"]);
    expect(result.build?.useCaseProposalId).toBeNull();
    expect(result.proposal.status).toBe("mapped");
    expect(result.aliases[0]).toMatchObject({ aliasType: "original-source", label: proposal.originalText });
    expect(result.useCase).toBeUndefined();
  });
  it("approval publishes the reviewed title and keeps the provider's wording as provenance", () => {
    const result = approveProposal(proposal, { title: "Send invoices and record payments", description: "Issue invoices and record payments in the accounting system.", categoryId: "finance", subcategoryId: "fin-ar" }, build({ useCaseProposalId: "p1" }), "admin", useCases.map((useCase) => useCase.slug));
    expect(result.useCase).toMatchObject({ name: "Send invoices and record payments", status: "approved", originType: "solution-provider-proposed", originEntityId: "alex-chen" });
    expect(result.sources[0].originalTitle).toBe(proposal.originalText);
    expect(result.build?.useCaseIds).toContain(result.useCase!.id);
  });
  it("merging preserves Build links, sources and the old slug", () => {
    const from = useCases.find((useCase) => useCase.id === "research-and-analysis") ?? { ...useCases[1], id: "old-thing", slug: "old-thing", name: "Old thing" };
    const into = useCases.find((useCase) => useCase.id === "chase-overdue-invoices")!;
    const linked = build({ id: "b1", useCaseIds: [from.id, into.id] });
    const result = mergeUseCases(from, into, { builds: [linked], sources: [{ ...seed.use_case_sources![0], useCaseId: from.id }], aliases: [] });
    expect(result.builds[0].useCaseIds).toEqual([into.id]);
    expect(result.sources[0].useCaseId).toBe(into.id);
    expect(result.aliases.some((alias) => alias.label === from.name)).toBe(true);
    const resolution = resolveUseCase(from.slug, [result.from, into], [result.redirect], seed.use_case_categories!);
    expect(resolution).toEqual({ kind: "redirect", to: `/use-cases/${into.slug}` });
  });
  it("mapping refuses to drop a Use Case from a Build that is already full", () => {
    const target = useCases.find((useCase) => useCase.id === "chase-overdue-invoices")!;
    const full = build({ useCaseIds: ["enquiry-to-booking", "customer-support", "business-analytics"], useCaseProposalId: "p1" });
    expect(() => mapProposal(proposal, target, full, "admin")).toThrow(/already has 3/);
  });
  it("moderation records platform provenance, never the proposer's value", () => {
    const forged = { ...proposal, provenance: "verified" as UseCaseProposal["provenance"] };
    const target = useCases.find((useCase) => useCase.id === "chase-overdue-invoices")!;
    expect(mapProposal(forged, target, undefined, "admin").aliases[0].provenance).toBe("community supplied");
    const approved = approveProposal(forged, { title: "Send invoices and record payments", description: "Issue invoices and record payments.", categoryId: "finance", subcategoryId: "fin-ar" }, undefined, "admin", []);
    expect(approved.useCase!.provenance).toBe("community supplied");
    expect(approved.sources[0].provenance).toBe("community supplied");
  });
  it("follows chained merges to the surviving Use Case", () => {
    const [a, b, c] = useCases.slice(0, 3);
    const chain = [{ ...a, status: "merged" as const, mergedIntoId: b.id }, { ...b, status: "merged" as const, mergedIntoId: c.id }, c];
    expect(resolveUseCase(a.slug, chain, [], seed.use_case_categories!)).toEqual({ kind: "redirect", to: `/use-cases/${c.slug}` });
  });
});

describe("xAI is a Technology Vendor with sourced Use Cases, not Builds", () => {
  it("creates no Builds or Solution Provider for xAI", () => {
    expect(seed.builds!.some((item) => item.id.startsWith("xai-") || item.provenance === "third-party sourced")).toBe(false);
    expect(providers.some((provider) => provider.id === XAI_PROVIDER_ID || provider.name === "xAI")).toBe(false);
    expect(seed.providers!.some((provider) => provider.id === XAI_PROVIDER_ID)).toBe(true);
  });
  it("keeps vendor provenance on every xAI Use Case", () => {
    const vendorCases = useCases.filter((useCase) => useCase.originType === "technology-vendor-sourced");
    expect(vendorCases).toHaveLength(15);
    for (const useCase of vendorCases) {
      const source = seed.use_case_sources!.find((item) => item.useCaseId === useCase.id && item.sourceType === "technology-vendor");
      expect(source, useCase.id).toMatchObject({ sourceEntityId: XAI_PROVIDER_ID, retrievedAt: "2026-09-26", lastCheckedAt: "2026-09-26", status: "active" });
      expect(source!.sourceUrl).toMatch(/^https:\/\/x\.ai\/grok\/use-cases\/[a-z0-9-]+$/);
      expect(source!.originalTitle).toBe(useCase.name);
      expect(source!.originalDescription.length).toBeGreaterThan(20);
      expect(useCase.categoryId && useCase.subcategoryId).toBeTruthy();
    }
  });
  it("counts vendor statements as technologies, never as Builds or Implementations", () => {
    const stats = getUseCaseStats("plan-and-implement-code-changes", data);
    expect(stats.builds).toHaveLength(0);
    expect(stats.implementations).toHaveLength(0);
    expect(stats.technologies.find((item) => item.productId === "grok-build")).toMatchObject({ vendorListed: true, builds: 0 });
  });
  it("redirects every former /builds/xai-* page to a Use Case", () => {
    for (const target of Object.values(xaiLegacyBuildRedirects)) expect(useCases.some((useCase) => useCase.id === target)).toBe(true);
    expect(Object.keys(xaiLegacyBuildRedirects)).toHaveLength(11);
  });
  it("turns retired broad areas into category redirects", () => {
    expect(resolveUseCase("software-development", useCases, seed.use_case_redirects!, seed.use_case_categories!)).toEqual({ kind: "redirect", to: "/use-cases?category=software-development" });
    expect(resolveUseCase("visual-content-generation", useCases, seed.use_case_redirects!, seed.use_case_categories!)).toEqual({ kind: "redirect", to: "/use-cases?category=marketing&subcategory=mk-visual" });
  });
});

describe("Taxonomy, providers and supply", () => {
  it("places every approved Use Case under a category and subcategory", () => {
    const categories = seed.use_case_categories!;
    for (const useCase of useCases.filter((item) => (item.status ?? "approved") === "approved")) {
      const sub = categories.find((category) => category.id === useCase.subcategoryId);
      expect(sub?.parentId, useCase.id).toBe(useCase.categoryId);
    }
  });
  it("keeps Solution Providers and Technology Vendors distinct and resolves old paths", () => {
    const vendorIds = new Set(seed.providers!.map((provider) => provider.id));
    for (const provider of providers) expect(vendorIds.has(provider.id)).toBe(false);
    expect(findSolutionProvider(providers, "/implementers/partner-0")?.slug).toBe("northstar-studio");
    expect(findSolutionProvider(providers, "/creators/alex-chen")?.type).toBe("Independent Builder");
  });
  it("reports maturity from facts", () => {
    const byId = (id: string) => seed.builds!.find((item) => item.id === id)!;
    expect(buildMaturity(byId("service-enquiry-booking-system"), data.blueprints, data.implementations)).toBe("build-evidence");
    expect(buildMaturity(byId("ai-dental-receptionist"), data.blueprints, data.implementations)).toBe("build-only");
  });
  it("describes compiler coverage without inventing supply", () => {
    expect(compilerCoverage("enquiry-to-booking", data)).toBe("evidence-available");
    expect(compilerCoverage("plan-and-implement-code-changes", data)).toBe("catalogue-only");
  });
  it("lists supply gaps as counts only", () => {
    const gaps = supplyGaps(data);
    expect(gaps[0].builds).toBe(0);
    expect(Object.keys(gaps[0]).sort()).toEqual(["builds", "implementations", "technologies", "useCase"]);
  });
});

describe("Proposal title guidance", () => {
  it("blocks bare areas and emoji, warns on hype, never rewrites silently", () => {
    expect(titleGuidance("Finance").errors.length).toBeGreaterThan(0);
    expect(titleGuidance("Chase invoices 🚀").errors).toContain("Remove emoji.");
    const hype = titleGuidance("best invoice chaser!!!!!");
    expect(hype.warnings.join(" ")).toMatch(/marketing claims/);
    expect(hype.suggestion).toBe("Best invoice chaser");
    expect(tidyTitle("send invoices and record payments.")).toBe("Send invoices and record payments");
  });
});
