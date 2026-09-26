import { describe, expect, it } from "vitest";
import { seed } from "../src/data/seed";
import * as intel from "../src/data/intelligence-seed";
import { profileFromIntent } from "../src/data/requirement";
import { approvedUseCases, compilerCoverage } from "../src/data/use-case-domain";
import { solutionProviders } from "../src/data/solution-providers";
import {
  canCompileFor,
  candidateProvenance,
  compileSolutions,
  compilerSupply,
  groupUseCaseOptions,
  type CompilerCatalogue,
} from "../src/data/solution-compiler";
import type { RequirementProfile } from "../src/data/intelligence-model";

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
const profileFor = (useCaseId: string | undefined): RequirementProfile => ({
  ...profileFromIntent(intent, "buyer-1", "req-1", products),
  mustKeepSystems: [],
  useCaseId,
});
const compile = (profile: RequirementProfile, cat = catalogue) => compileSolutions(profile, cat, { asOf, compiledAt: "2026-09-25T12:00:00.000Z" });
const useCases = seed.use_cases!;
const coverageData = { blueprints: catalogue.blueprints, implementations: catalogue.implementations, implementationUseCases: catalogue.implementationUseCases! };

describe("compiler coverage gating", () => {
  it("yields zero candidates for a Use Case without a Blueprint and never borrows other Use Cases' Blueprints", () => {
    const useCaseId = "plan-and-implement-code-changes";
    expect(useCases.some((useCase) => useCase.id === useCaseId)).toBe(true);
    expect(compilerCoverage(useCaseId, coverageData)).toBe("catalogue-only");
    const result = compile(profileFor(useCaseId));
    expect(result.candidates).toHaveLength(0);
    expect(result.trace.candidatePool).toHaveLength(0);
    expect(result.run.candidatePoolIds).toEqual([]);
    // Every published Blueprint was considered and explicitly excluded, none silently used.
    const published = catalogue.blueprints.filter((blueprint) => blueprint.publicationState === "published" && blueprint.moderationState === "approved");
    for (const blueprint of published) expect(result.trace.exclusions.some((exclusion) => exclusion.id === blueprint.id)).toBe(true);
  });

  it("does not fall back to Blueprints without a Use Case link or when no Use Case is chosen", () => {
    const unlinked: CompilerCatalogue = {
      ...catalogue,
      blueprints: catalogue.blueprints.map((blueprint) => (blueprint.id === "missed-call-textback" ? { ...blueprint, useCaseIds: [] } : blueprint)),
    };
    const result = compile(profileFor("plan-and-implement-code-changes"), unlinked);
    expect(result.candidates).toHaveLength(0);
    expect(result.trace.exclusions.find((exclusion) => exclusion.id === "missed-call-textback")?.reason).toMatch(/Not linked to any Use Case/);
    const none = compile(profileFor(undefined));
    expect(none.candidates).toHaveLength(0);
    expect(none.trace.exclusions.every((exclusion) => /No Use Case selected/.test(exclusion.reason) || exclusion.reason === "No current version recorded.")).toBe(true);
  });

  it("only draws candidates from published Blueprints for the requirement's own Use Case", () => {
    const result = compile(profileFor("enquiry-to-booking"));
    expect(result.candidates.length).toBeGreaterThan(0);
    for (const candidate of result.candidates) {
      const blueprint = catalogue.blueprints.find((item) => item.id === candidate.sourceBlueprintId)!;
      expect(blueprint.useCaseIds).toContain("enquiry-to-booking");
      expect(blueprint.publicationState).toBe("published");
      expect(blueprint.moderationState).toBe("approved");
    }
    const draft = catalogue.blueprints.find((blueprint) => blueprint.publicationState !== "published");
    if (draft) expect(result.trace.candidatePool.some((entry) => entry.blueprintId === draft.id)).toBe(false);
  });
});

describe("compiler coverage page logic", () => {
  it("never compiles or produces candidates for a catalogue-only Use Case", () => {
    const approved = approvedUseCases(useCases);
    const catalogueOnly = approved.filter((useCase) => compilerSupply(useCase.id, catalogue).coverage === "catalogue-only");
    expect(catalogueOnly.length).toBeGreaterThan(0);
    for (const useCase of catalogueOnly) {
      const supply = compilerSupply(useCase.id, catalogue);
      expect(supply.blueprintIds).toEqual([]);
      expect(canCompileFor(supply)).toBe(false);
      expect(compile(profileFor(useCase.id)).candidates).toHaveLength(0);
    }
    expect(canCompileFor(null)).toBe(false);
  });

  it("reports factual Blueprint and evidence counts consistent with compilerCoverage", () => {
    const supply = compilerSupply("enquiry-to-booking", catalogue);
    expect(supply.coverage).toBe(compilerCoverage("enquiry-to-booking", coverageData));
    expect(supply.coverage).toBe("evidence-available");
    expect(supply.blueprintIds).toEqual(expect.arrayContaining(["inquiry-booking-reference", "missed-call-textback"]));
    expect(supply.implementationIds).toContain("property-enquiry-automation");
    expect(canCompileFor(supply)).toBe(true);
    const run = compile(profileFor("enquiry-to-booking"));
    expect(run.trace.candidatePool.map((entry) => entry.blueprintId).sort()).toEqual(supply.blueprintIds);
  });

  it("lists every approved Use Case in category groups with a coverage suffix", () => {
    const groups = groupUseCaseOptions(useCases, seed.use_case_categories!, catalogue);
    const options = groups.flatMap((group) => group.options);
    expect(options.map((option) => option.useCase.id).sort()).toEqual(approvedUseCases(useCases).map((useCase) => useCase.id).sort());
    const coding = options.find((option) => option.useCase.id === "plan-and-implement-code-changes")!;
    expect(coding.label).toBe("Plan and implement code changes · catalogue only");
    expect(groups.find((group) => group.options.includes(coding))!.label).toBe("Software Development");
    expect(options.find((option) => option.useCase.id === "enquiry-to-booking")!.label).toMatch(/· evidence available$/);
    // Without public records for a Use Case, a Blueprint alone is reported as such.
    const withoutRecords = groupUseCaseOptions(useCases, seed.use_case_categories!, { ...catalogue, implementationUseCases: [] });
    const reservations = withoutRecords.flatMap((group) => group.options).find((option) => option.useCase.id === "after-hours-reservations")!;
    expect(reservations.coverage).toBe("blueprint-available");
    expect(reservations.label).toBe("Handle after-hours reservation requests · Blueprint available");
  });
});

describe("candidate provenance", () => {
  const providers = solutionProviders(seed.creator_profiles!, seed.integrators!, seed.consultants!);
  const sources = { blueprints: catalogue.blueprints, builds: seed.builds!, providers, implementations: catalogue.implementations };

  it("resolves maintainer, Build and evidence for the reference Blueprint", () => {
    const provenance = candidateProvenance("inquiry-booking-reference", sources);
    expect(provenance.blueprint?.slug).toBe("inquiry-booking-reference");
    expect(provenance.provider?.name).toBe("Northstar Studio");
    expect(provenance.provider?.slug).toBe("northstar-studio");
    expect(provenance.build?.id).toBe("service-enquiry-booking-system");
    expect(provenance.evidence.map((record) => record.id)).toEqual(["property-enquiry-automation"]);
  });

  it("finds a Build through its blueprintId and counts only public records", () => {
    const builds = seed.builds!.map((build) => (build.id === "service-enquiry-booking-system" ? { ...build, blueprintId: "inquiry-booking-reference" } : build));
    const blueprints = catalogue.blueprints.map((blueprint) => (blueprint.id === "inquiry-booking-reference" ? { ...blueprint, buildId: undefined } : blueprint));
    const implementations = catalogue.implementations.map((record) => (record.id === "property-enquiry-automation" ? { ...record, visibility: "private" as const } : record));
    const provenance = candidateProvenance("inquiry-booking-reference", { ...sources, builds, blueprints, implementations });
    expect(provenance.build?.id).toBe("service-enquiry-booking-system");
    expect(provenance.evidence).toHaveLength(0);
  });

  it("returns empty provenance for an unknown Blueprint", () => {
    expect(candidateProvenance("does-not-exist", sources)).toEqual({ evidence: [] });
    expect(candidateProvenance(undefined, sources)).toEqual({ evidence: [] });
  });
});
