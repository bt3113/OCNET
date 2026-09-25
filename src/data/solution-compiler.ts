import type { Product } from "./model";
import type {
  Blueprint,
  BlueprintStackItem,
  BlueprintVersion,
  EvidenceLevel,
  ImplementationContext,
  ImplementationRecord,
  RequirementProfile,
  SolutionCandidate,
  SolutionCandidateItem,
  SolutionExplanation,
  SolutionRun,
  TechnologyRelationship,
} from "./intelligence-model";

export const COMPILER_ENGINE_VERSION = "0.1.0";
export const COMPILER_RULESET_VERSION = "2026-09-25-a";

export interface CompilerCatalogue {
  implementations: ImplementationRecord[];
  contexts: ImplementationContext[];
  blueprints: Blueprint[];
  blueprintVersions: BlueprintVersion[];
  blueprintItems: BlueprintStackItem[];
  products: Product[];
  relationships: TechnologyRelationship[];
}

export interface ContextSimilarity {
  score: number;
  level: "high" | "medium" | "low";
  reasons: string[];
  differences: string[];
}

const evidenceWeight: Record<EvidenceLevel, number> = {
  "independently-audited": 100,
  "evidence-reviewed": 88,
  "customer-attested": 78,
  "platform-observed": 72,
  "creator-reported": 52,
  demo: 25,
  unverified: 10,
};

function normalizedWords(text: string) {
  return new Set(
    (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
      (word) => !new Set(["the", "a", "an", "and", "or", "to", "for", "with", "my", "our", "i"]).has(word),
    ),
  );
}

function overlap(a: string, b: string) {
  const left = normalizedWords(a);
  const right = normalizedWords(b);
  if (!left.size || !right.size) return 0;
  let matches = 0;
  for (const word of left) if (right.has(word)) matches += 1;
  return matches / Math.max(left.size, right.size);
}

export function contextSimilarity(
  profile: RequirementProfile,
  implementation: ImplementationRecord,
  context?: ImplementationContext,
): ContextSimilarity {
  let score = 0;
  const reasons: string[] = [];
  const differences: string[] = [];

  if (
    profile.businessType &&
    overlap(profile.businessType, implementation.businessType) >= 0.5
  ) {
    score += 22;
    reasons.push(`Similar business type: ${implementation.businessType}.`);
  } else if (profile.businessType) {
    differences.push(`Business type differs from ${implementation.businessType}.`);
  }

  if (
    profile.industry &&
    overlap(profile.industry, implementation.industry) >= 0.5
  ) {
    score += 14;
    reasons.push(`Industry context overlaps ${implementation.industry}.`);
  }

  if (
    profile.organizationSizeBand &&
    profile.organizationSizeBand === implementation.organizationSizeBand
  ) {
    score += 18;
    reasons.push(`Same organization-size band: ${implementation.organizationSizeBand}.`);
  } else if (profile.organizationSizeBand) {
    differences.push(
      `Organization-size band is ${implementation.organizationSizeBand}.`,
    );
  }

  if (profile.region && profile.region === implementation.region) {
    score += 10;
    reasons.push(`Same region: ${implementation.region}.`);
  } else if (profile.region) {
    differences.push(`Deployment record is from ${implementation.region}.`);
  }

  if (profile.locations && context?.locations) {
    const gap = Math.abs(profile.locations - context.locations);
    if (gap === 0) {
      score += 12;
      reasons.push(`Same number of locations (${context.locations}).`);
    } else if (gap <= 2) {
      score += 7;
      reasons.push(`Similar location count (${context.locations}).`);
    } else {
      differences.push(`Location count differs (${context.locations}).`);
    }
  }

  if (profile.monthlyVolume && context?.monthlyVolume) {
    const ratio = Math.min(profile.monthlyVolume, context.monthlyVolume) /
      Math.max(profile.monthlyVolume, context.monthlyVolume);
    if (ratio >= 0.7) {
      score += 14;
      reasons.push(
        `Similar operating volume (${context.monthlyVolume.toLocaleString()} per month in the record).`,
      );
    } else if (ratio >= 0.4) {
      score += 7;
      reasons.push("Operating volume is within the same broad range.");
    } else {
      differences.push(
        `Operating volume differs materially (${context.monthlyVolume.toLocaleString()} per month in the record).`,
      );
    }
  }

  if (
    profile.technicalCapability &&
    context?.technicalCapability === profile.technicalCapability
  ) {
    score += 10;
    reasons.push(`Same technical-capability level: ${context.technicalCapability}.`);
  }

  const level = score >= 65 ? "high" : score >= 38 ? "medium" : "low";
  return { score: Math.min(score, 100), level, reasons, differences };
}

export function profileFromIntent(
  intent: string,
  ownerId: string,
  overrides: Partial<RequirementProfile> = {},
): RequirementProfile {
  const text = intent.toLowerCase();
  const businessType = text.includes("restaurant") || text.includes("hospitality")
    ? "Hospitality"
    : text.includes("salon") || text.includes("beauty")
      ? "Salon and beauty services"
      : text.includes("property") || text.includes("maintenance")
        ? "Property maintenance services"
        : text.includes("agency") || text.includes("studio")
          ? "Creative agency"
          : "Service business";
  const industry = businessType === "Hospitality" ? "Hospitality" : "Business services";
  const currentSystems = [
    ...(text.includes("hubspot") ? ["HubSpot"] : []),
    ...(text.includes("salesforce") ? ["Salesforce"] : []),
    ...(text.includes("phone") || text.includes("call") ? ["Phone"] : []),
    ...(text.includes("email") ? ["Email"] : []),
  ];
  return {
    id: overrides.id ?? `requirement-${Date.now()}`,
    name: overrides.name ?? intent.slice(0, 80) || "Business outcome requirement",
    ownerId,
    objective: overrides.objective ?? intent,
    industry: overrides.industry ?? industry,
    businessType: overrides.businessType ?? businessType,
    organizationSizeBand: overrides.organizationSizeBand ?? "1–10 employees",
    region: overrides.region ?? "United Kingdom",
    locations: overrides.locations ?? 1,
    monthlyVolume: overrides.monthlyVolume ?? null,
    currentSystems: overrides.currentSystems ?? currentSystems,
    budgetMin: overrides.budgetMin ?? null,
    budgetMax: overrides.budgetMax ?? 5000,
    currency: overrides.currency ?? "GBP",
    timeline: overrides.timeline ?? "1–3 months",
    technicalCapability: overrides.technicalCapability ?? "none",
    mustKeepSystems: overrides.mustKeepSystems ?? currentSystems,
    requiredIntegrations: overrides.requiredIntegrations ?? [],
    dataSensitivity: overrides.dataSensitivity ?? "medium",
    complianceRequirements: overrides.complianceRequirements ?? [],
    deploymentPreference: overrides.deploymentPreference ?? "Cloud",
    automationLevel: overrides.automationLevel ?? "Assisted automation",
    humanApprovalRequired: overrides.humanApprovalRequired ?? true,
    maintenanceTolerance: overrides.maintenanceTolerance ?? "low",
    constraints: overrides.constraints ?? [],
    provenance: "inferred",
    createdAt: new Date().toISOString(),
  };
}

function complexityValue(value: Blueprint["estimatedComplexity"]) {
  return value === "low" ? 25 : value === "medium" ? 55 : 82;
}

function getProductsForBlueprint(
  blueprint: Blueprint,
  catalogue: CompilerCatalogue,
) {
  const version = catalogue.blueprintVersions.find(
    (item) => item.id === blueprint.currentVersionId,
  );
  if (!version) return [];
  return catalogue.blueprintItems.filter(
    (item) => item.blueprintVersionId === version.id,
  );
}

function knownRelationshipCoverage(
  items: BlueprintStackItem[],
  relationships: TechnologyRelationship[],
) {
  const productIds = items.flatMap((item) => (item.productId ? [item.productId] : []));
  if (productIds.length < 2) return 0;
  let covered = 0;
  let possible = 0;
  for (let index = 0; index < productIds.length - 1; index += 1) {
    possible += 1;
    if (
      relationships.some(
        (relationship) =>
          (relationship.sourceProductId === productIds[index] &&
            relationship.targetProductId === productIds[index + 1]) ||
          (relationship.targetProductId === productIds[index] &&
            relationship.sourceProductId === productIds[index + 1]),
      )
    ) {
      covered += 1;
    }
  }
  return possible ? covered / possible : 0;
}

function violatesHardConstraint(
  profile: RequirementProfile,
  blueprint: Blueprint,
  source: ImplementationRecord | undefined,
  items: BlueprintStackItem[],
  catalogue: CompilerCatalogue,
) {
  if (
    profile.budgetMax != null &&
    source?.implementationCost != null &&
    source.implementationCost > profile.budgetMax
  ) {
    return `Illustrative setup cost (${source.implementationCost} ${source.implementationCostCurrency}) exceeds the stated maximum budget.`;
  }

  const productNames = items
    .flatMap((item) => {
      const product = catalogue.products.find((candidate) => candidate.id === item.productId);
      return product ? [product.name.toLowerCase(), product.id.toLowerCase()] : [];
    })
    .join(" ");
  for (const required of profile.requiredIntegrations) {
    if (!productNames.includes(required.toLowerCase())) {
      return `Required integration “${required}” is not confirmed in this blueprint.`;
    }
  }

  const explicitHard = profile.constraints.filter((constraint) => constraint.kind === "hard");
  for (const constraint of explicitHard) {
    if (constraint.field === "reuseRights" && constraint.operator === "equals") {
      if (blueprint.reuseRights !== String(constraint.value)) {
        return `Reuse-rights constraint is not satisfied (${blueprint.reuseRights}).`;
      }
    }
  }
  return null;
}

function isDominated(a: SolutionCandidate, b: SolutionCandidate) {
  const aCost = a.setupCost ?? Number.POSITIVE_INFINITY;
  const bCost = b.setupCost ?? Number.POSITIVE_INFINITY;
  const atLeastAsGood =
    bCost <= aCost &&
    b.complexity <= a.complexity &&
    b.maintenanceBurden <= a.maintenanceBurden &&
    b.evidenceStrength >= a.evidenceStrength &&
    b.flexibility >= a.flexibility;
  const strictlyBetter =
    bCost < aCost ||
    b.complexity < a.complexity ||
    b.maintenanceBurden < a.maintenanceBurden ||
    b.evidenceStrength > a.evidenceStrength ||
    b.flexibility > a.flexibility;
  return atLeastAsGood && strictlyBetter;
}

export function markParetoDominance(candidates: SolutionCandidate[]) {
  return candidates.map((candidate) => ({
    ...candidate,
    dominated: candidates.some(
      (other) => other.id !== candidate.id && isDominated(candidate, other),
    ),
  }));
}

export interface CompiledSolution {
  run: SolutionRun;
  candidates: SolutionCandidate[];
  items: SolutionCandidateItem[];
  explanations: SolutionExplanation[];
  similarities: Record<string, ContextSimilarity>;
}

export function compileSolutions(
  profile: RequirementProfile,
  catalogue: CompilerCatalogue,
): CompiledSolution {
  const excluded: { id: string; reason: string }[] = [];
  const similarities: Record<string, ContextSimilarity> = {};
  for (const implementation of catalogue.implementations) {
    similarities[implementation.id] = contextSimilarity(
      profile,
      implementation,
      catalogue.contexts.find((context) => context.implementationId === implementation.id),
    );
  }

  const candidates: SolutionCandidate[] = [];
  const candidateItems: SolutionCandidateItem[] = [];
  const explanations: SolutionExplanation[] = [];

  for (const blueprint of catalogue.blueprints.filter(
    (item) => item.publicationState === "published" && item.moderationState === "approved",
  )) {
    const source = blueprint.derivedFromImplementationId
      ? catalogue.implementations.find(
          (implementation) => implementation.id === blueprint.derivedFromImplementationId,
        )
      : undefined;
    const items = getProductsForBlueprint(blueprint, catalogue);
    const hardFailure = violatesHardConstraint(
      profile,
      blueprint,
      source,
      items,
      catalogue,
    );
    if (hardFailure) {
      excluded.push({ id: blueprint.id, reason: hardFailure });
      continue;
    }

    const similarity = source ? similarities[source.id] : undefined;
    const relationshipCoverage = knownRelationshipCoverage(items, catalogue.relationships);
    const evidenceStrength = source
      ? Math.round((evidenceWeight[source.verificationState] + relationshipCoverage * 35) / 1.35)
      : Math.round(20 + relationshipCoverage * 25);
    const complexity = complexityValue(blueprint.estimatedComplexity);
    const maintenanceBurden = source?.maintenanceHoursPerMonth == null
      ? blueprint.estimatedComplexity === "low"
        ? 25
        : blueprint.estimatedComplexity === "medium"
          ? 50
          : 75
      : Math.min(100, source.maintenanceHoursPerMonth * 10);
    const alternatives = items.reduce(
      (sum, item) => sum + item.alternativeProductIds.length,
      0,
    );
    const flexibility = Math.min(100, 35 + alternatives * 16 + (blueprint.sourceAvailable ? 12 : 0));
    const candidateId = `candidate-${blueprint.id}`;
    const risks = [
      ...(blueprint.knownLimitations ? [blueprint.knownLimitations] : []),
      ...(relationshipCoverage < 1
        ? ["Not every component handoff has an independently confirmed compatibility relationship."]
        : []),
      ...(source?.demo ? ["Source implementation is synthetic demo data, not a verified customer deployment."] : []),
    ];
    const unknowns = [
      ...(profile.mustKeepSystems.length
        ? ["Customer-specific integration with must-keep systems requires implementation validation."]
        : []),
      "Security, licensing, rate limits and production error handling require provider/customer validation.",
    ];
    const softMatches = [
      ...(profile.maintenanceTolerance === "low" && maintenanceBurden <= 40
        ? ["Lower maintenance burden matches your preference."]
        : []),
      ...(similarity && similarity.level !== "low"
        ? [`${similarity.level[0].toUpperCase()}${similarity.level.slice(1)} contextual similarity to the source implementation.`]
        : []),
      ...(profile.humanApprovalRequired
        ? ["Reference architecture preserves a human exception/review path."]
        : []),
    ];
    candidates.push({
      id: candidateId,
      name: blueprint.name,
      provenance: blueprint.provenance,
      solutionRunId: "pending-run",
      sourceBlueprintId: blueprint.id,
      sourceImplementationIds: source ? [source.id] : [],
      label: "Feasible reference architecture",
      summary: blueprint.description,
      setupCost: source?.implementationCost ?? null,
      monthlyCost: source?.ongoingMonthlyCost ?? null,
      complexity,
      evidenceStrength,
      maintenanceBurden,
      flexibility,
      satisfiedHardConstraints: [
        ...(profile.budgetMax != null ? ["Within stated setup budget based on available illustrative cost data."] : []),
        ...(profile.requiredIntegrations.length ? ["Required integration constraints satisfied by recorded components."] : []),
      ],
      softPreferenceMatches: softMatches,
      risks,
      unknowns,
      dominated: false,
    });
    for (const item of items) {
      if (!item.productId) continue;
      candidateItems.push({
        id: `${candidateId}-${item.id}`,
        name: item.role,
        provenance: item.provenance,
        candidateId,
        capabilityId: item.capabilityId,
        productId: item.productId,
        role: item.role,
        alternativeProductIds: item.alternativeProductIds,
      });
    }
    explanations.push(
      {
        id: `${candidateId}-fit`,
        name: "Why it fits",
        provenance: blueprint.provenance,
        candidateId,
        kind: "fit",
        text: similarity
          ? `Source implementation has ${similarity.level} contextual similarity (${similarity.score}/100) to this requirement profile.`
          : "Blueprint addresses the required outcome but has no directly linked implementation record.",
        sourceEntityIds: source ? [source.id] : [blueprint.id],
      },
      {
        id: `${candidateId}-evidence`,
        name: "Evidence boundary",
        provenance: blueprint.provenance,
        candidateId,
        kind: "evidence",
        text: source?.demo
          ? "All source evidence is synthetic demo data. It demonstrates the evidence model, not real-world performance."
          : "Evidence strength is derived from recorded claim provenance and relationship coverage.",
        sourceEntityIds: source ? [source.id] : [blueprint.id],
      },
      {
        id: `${candidateId}-unknown`,
        name: "Unknowns",
        provenance: blueprint.provenance,
        candidateId,
        kind: "unknown",
        text: unknowns.join(" "),
        sourceEntityIds: [blueprint.id],
      },
    );
  }

  const withDominance = markParetoDominance(candidates);
  const nonDominated = withDominance.filter((candidate) => !candidate.dominated);
  const cheapest = nonDominated
    .filter((candidate) => candidate.setupCost != null)
    .sort((a, b) => (a.setupCost ?? Infinity) - (b.setupCost ?? Infinity))[0];
  const simplest = [...nonDominated].sort(
    (a, b) => a.complexity + a.maintenanceBurden - (b.complexity + b.maintenanceBurden),
  )[0];
  const strongest = [...nonDominated].sort(
    (a, b) => b.evidenceStrength - a.evidenceStrength,
  )[0];
  const flexible = [...nonDominated].sort((a, b) => b.flexibility - a.flexibility)[0];
  const labelled = withDominance.map((candidate) => ({
    ...candidate,
    label: candidate.id === cheapest?.id
      ? "Lower estimated cost"
      : candidate.id === simplest?.id
        ? "Simplest to operate"
        : candidate.id === strongest?.id
          ? "Stronger implementation evidence"
          : candidate.id === flexible?.id
            ? "Greater flexibility"
            : candidate.dominated
              ? "Feasible, but dominated on recorded trade-offs"
              : "Feasible reference architecture",
  }));

  const runId = `solution-run-${Date.now()}`;
  const run: SolutionRun = {
    id: runId,
    name: `Solution run for ${profile.name}`,
    provenance: "inferred",
    ownerId: profile.ownerId,
    requirementProfileId: profile.id,
    engineVersion: COMPILER_ENGINE_VERSION,
    rulesetVersion: COMPILER_RULESET_VERSION,
    candidatePoolIds: catalogue.blueprints.map((blueprint) => blueprint.id),
    excluded,
    createdAt: new Date().toISOString(),
  };
  return {
    run,
    candidates: labelled.map((candidate) => ({ ...candidate, solutionRunId: runId })),
    items: candidateItems,
    explanations,
    similarities,
  };
}
