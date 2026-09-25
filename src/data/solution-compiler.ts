import { digest } from "./canonical";
import { requiredCapabilitySlots } from "./category-templates";
import { similarityForProfile, similaritySummary } from "./context-similarity";
import { FINGERPRINT_VERSION, relationshipBetween } from "./fingerprint";
import type {
  Blueprint,
  BlueprintConnection,
  BlueprintStackItem,
  BlueprintVersion,
  CandidateObjectives,
  CompatibilityCheck,
  ConstraintResult,
  ContextSimilarity,
  ImplementationConnection,
  ImplementationContext,
  ImplementationRecord,
  ImplementationStackItem,
  ImplementationUseCase,
  ObjectiveRange,
  RelationshipUse,
  RequirementField,
  RequirementProfile,
  SolutionCandidate,
  SolutionCandidateItem,
  SolutionRun,
  TechnologyRelationship,
} from "./intelligence-model";
import type { Product } from "./model";
import { strengthOf, validateProfile } from "./requirement";
import { canReuse } from "./rights";
import { blueprintFreshness } from "./staleness";
import { capabilityLabel, normalizeSystemName, regionInfo } from "./taxonomy";

/**
 * Solution Compiler V1.
 *
 * RequirementProfile → required capabilities → relevant implementations and
 * Blueprints → capability-slot graph → product candidates per slot → bounded,
 * deterministic enumeration → compatibility + hard-constraint evaluation → raw
 * objective values → Pareto (non-dominated) filtering → supported trade-off labels
 * → structured explanation → reproducible decision trace.
 *
 * No model call, no sponsorship input and no hidden weighted score.
 */
export const COMPILER_ENGINE_VERSION = "1.0.0";
export const COMPILER_RULESET_VERSION = "2026-09-25.1";
export const MAX_ASSIGNMENTS_PER_BLUEPRINT = 48;
export const MAX_DOMINATED_SHOWN = 6;

export interface CompilerCatalogue {
  implementations: ImplementationRecord[];
  contexts: ImplementationContext[];
  implementationUseCases?: ImplementationUseCase[];
  implementationStackItems?: ImplementationStackItem[];
  implementationConnections?: ImplementationConnection[];
  blueprints: Blueprint[];
  blueprintVersions: BlueprintVersion[];
  blueprintItems: BlueprintStackItem[];
  blueprintConnections?: BlueprintConnection[];
  products: Product[];
  relationships: TechnologyRelationship[];
  compatibilityChecks?: CompatibilityCheck[];
}

export interface CompilerStage {
  id: string;
  label: string;
  detail: string;
}

export interface DecisionTrace {
  engineVersion: string;
  rulesetVersion: string;
  fingerprintSchemaVersion: string;
  compiledAt: string;
  asOf: string;
  profileSnapshot: RequirementProfile;
  catalogueDigest: string;
  requiredCapabilities: { capability: string; satisfiedBy: string[] }[];
  relevantImplementationIds: string[];
  candidatePool: { blueprintId: string; versionId: string; assignments: number; truncated: boolean }[];
  constraintsApplied: { id: string; label: string; strength: string }[];
  exclusions: { id: string; blueprintId: string; reason: string }[];
  compatibilityEvidenceIds: string[];
  implementationEvidenceIds: string[];
  results: { candidateId: string; feasible: boolean; dominated: boolean; objectives: CandidateObjectives; labels: string[] }[];
  substitutions: { candidateId: string; slotId: string; fromProductId: string; toProductId: string; feasible: boolean }[];
}

export interface CompiledSolution {
  run: SolutionRun;
  candidates: SolutionCandidate[];
  items: SolutionCandidateItem[];
  similarities: Record<string, ContextSimilarity>;
  stages: CompilerStage[];
  trace: DecisionTrace;
  validationErrors: string[];
}

interface Slot {
  item: BlueprintStackItem;
  options: string[];
  forced?: string;
}

const compatibleTypes = new Set(["native-integration", "api-compatible", "webhook-compatible", "connector-available"]);
const setupOf = (candidate: SolutionCandidate) => candidate.objectives.setupCost.high;

function productByName(products: Product[], name: string) {
  const key = normalizeSystemName(name);
  return products.find((product) => normalizeSystemName(product.name) === key || normalizeSystemName(product.id) === key);
}

function range(low?: number | null, high?: number | null): ObjectiveRange {
  const l = low ?? high ?? null;
  const h = high ?? low ?? null;
  return { low: l, high: h };
}

export function catalogueDigest(catalogue: CompilerCatalogue) {
  const pick = <T extends { id: string; updatedAt?: string }>(rows: T[]) =>
    rows.map((row) => `${row.id}@${row.updatedAt ?? ""}`).sort();
  return digest({
    implementations: pick(catalogue.implementations),
    blueprints: pick(catalogue.blueprints),
    versions: catalogue.blueprintVersions.map((version) => `${version.id}@${version.lastValidatedAt}`).sort(),
    items: catalogue.blueprintItems.map((item) => `${item.id}:${item.productId}:${item.alternativeProductIds.join("|")}`).sort(),
    relationships: catalogue.relationships.map((item) => `${item.id}:${item.relationshipType}:${item.evidenceLevel}:${item.lastCheckedAt}`).sort(),
    products: catalogue.products
      .map((product) => `${product.id}:${product.lifecycleState ?? ""}:${(product.availableRegions ?? []).join("|")}:${(product.deploymentOptions ?? []).join("|")}:${(product.dataResidencyOptions ?? []).join("|")}`)
      .sort(),
  });
}

function isPublicImplementation(record: ImplementationRecord) {
  return record.publicationState === "published" && record.moderationState === "approved" && record.visibility === "public";
}

function evaluateEdge(
  catalogue: CompilerCatalogue,
  products: Set<string>,
  from: string,
  to: string,
): RelationshipUse {
  if (from === to)
    return { fromProductId: from, toProductId: to, relationshipType: "native-integration", outcome: "satisfied", note: "Same product." };
  const relationship = relationshipBetween(catalogue.relationships, from, to);
  if (!relationship)
    return { fromProductId: from, toProductId: to, relationshipType: "unknown", outcome: "unknown", note: "No recorded relationship between these products." };
  const base = {
    fromProductId: from,
    toProductId: to,
    relationshipId: relationship.id,
    relationshipType: relationship.relationshipType,
    evidenceLevel: relationship.evidenceLevel,
  };
  switch (relationship.relationshipType) {
    case "incompatible":
      return { ...base, outcome: "violated", note: relationship.notes || "Recorded as incompatible." };
    case "requires-middleware":
      return relationship.middlewareProductId && products.has(relationship.middlewareProductId)
        ? { ...base, outcome: "satisfied", note: `Connected through ${relationship.middlewareProductId}.` }
        : { ...base, outcome: "violated", note: `Requires middleware${relationship.middlewareProductId ? ` (${relationship.middlewareProductId})` : ""} that is not in this architecture.` };
    case "custom-integration-required":
      return { ...base, outcome: "satisfied", note: "Feasible only with custom integration work." };
    case "observed-together":
      return { ...base, outcome: "unknown", note: "Observed together in records; compatibility itself is not verified." };
    case "unknown":
      return { ...base, outcome: "unknown", note: "Relationship recorded as unknown." };
    default:
      return { ...base, outcome: "satisfied", note: `${relationship.relationshipType.replaceAll("-", " ")} (${relationship.evidenceLevel}).` };
  }
}

interface EvaluationContext {
  profile: RequirementProfile;
  catalogue: CompilerCatalogue;
  asOf: Date;
  similarities: Record<string, ContextSimilarity>;
  relevantImplementationIds: string[];
}

/** Evaluate one concrete assignment of products to a Blueprint's capability slots. */
export function evaluateAssignment(
  ctx: EvaluationContext,
  blueprint: Blueprint,
  version: BlueprintVersion,
  assignment: Record<string, string>,
): SolutionCandidate {
  const { profile, catalogue } = ctx;
  const slots = catalogue.blueprintItems.filter((item) => item.blueprintVersionId === version.id);
  const edges = (catalogue.blueprintConnections ?? []).filter((edge) => edge.blueprintVersionId === version.id);
  const productIds = new Set(Object.values(assignment));
  const productsUsed = [...productIds].flatMap((id) => catalogue.products.filter((product) => product.id === id));
  const constraintResults: ConstraintResult[] = [];
  const relationships: RelationshipUse[] = [];
  const push = (field: RequirementField | "compatibility" | "capabilities" | "lifecycle", result: Omit<ConstraintResult, "strength">) => {
    const strength = field === "compatibility" || field === "capabilities" || field === "lifecycle" ? "hard" : strengthOf(profile, field);
    constraintResults.push({ ...result, strength });
  };

  // Required capabilities (from the category template + human approval).
  const capabilities = new Set(slots.map((slot) => slot.capabilityId));
  for (const product of productsUsed) for (const capability of product.capabilityIds) capabilities.add(capability);
  const required = requiredCapabilitySlots(profile.useCaseId);
  for (const requirement of required) {
    const ok = requirement.satisfiedBy.some((capability) => capabilities.has(capability));
    push("capabilities", {
      id: `capability:${requirement.capability}`,
      label: `Provides ${capabilityLabel(requirement.capability)}`,
      outcome: ok ? "satisfied" : "violated",
      reason: ok ? `${capabilityLabel(requirement.capability)} slot present.` : `No slot provides ${capabilityLabel(requirement.capability)}.`,
      evidenceIds: [version.id],
    });
  }

  // Architecture handoffs.
  for (const edge of edges) {
    const from = assignment[edge.fromItemId];
    const to = assignment[edge.toItemId];
    if (!from || !to) continue;
    relationships.push(evaluateEdge(catalogue, productIds, from, to));
  }

  // Must-keep systems and required integrations: in the architecture, or connectable to it.
  const orchestrator = slots.find((slot) => slot.capabilityId === "automation");
  const hub = orchestrator ? assignment[orchestrator.id] : undefined;
  const systemCheck = (field: "mustKeepSystems" | "requiredIntegrations", verb: string) => {
    for (const name of profile[field]) {
      const product = productByName(catalogue.products, name);
      if (!product) {
        push(field, { id: `${field}:${name}`, label: `${verb} ${name}`, outcome: "unknown", reason: `${name} is not in the Oracnet catalogue, so integration support is unknown.`, evidenceIds: [] });
        continue;
      }
      if (productIds.has(product.id)) {
        push(field, { id: `${field}:${product.id}`, label: `${verb} ${product.name}`, outcome: "satisfied", reason: `${product.name} is a component of this architecture.`, evidenceIds: [] });
        continue;
      }
      const links = [...productIds].map((id) => evaluateEdge(catalogue, productIds, product.id, id));
      const best =
        links.find((link) => link.outcome === "satisfied" && (link.toProductId === hub || link.fromProductId === hub)) ??
        links.find((link) => link.outcome === "satisfied") ??
        links.find((link) => link.outcome === "unknown" && link.relationshipId) ??
        (hub ? evaluateEdge(catalogue, productIds, product.id, hub) : links[0]);
      if (best) relationships.push(best);
      push(field, {
        id: `${field}:${product.id}`,
        label: `${verb} ${product.name}`,
        outcome: best?.outcome ?? "unknown",
        reason: best?.outcome === "satisfied"
          ? `${product.name} connects via ${best.relationshipType.replaceAll("-", " ")}.`
          : best?.outcome === "violated"
            ? `${product.name}: ${best.note}`
            : `No verified relationship connects ${product.name} to this architecture.`,
        evidenceIds: best?.relationshipId ? [best.relationshipId] : [],
      });
    }
  };
  systemCheck("mustKeepSystems", "Keeps");
  systemCheck("requiredIntegrations", "Integrates with");

  const brokenEdges = relationships.filter((relationship) => relationship.outcome === "violated");
  const unverifiedEdges = relationships.filter((relationship) => relationship.outcome === "unknown");
  push("compatibility", {
    id: "compatibility",
    label: "Every component handoff is compatible",
    outcome: brokenEdges.length ? "violated" : unverifiedEdges.length ? "unknown" : "satisfied",
    reason: brokenEdges.length
      ? brokenEdges.map((edge) => `${edge.fromProductId} ↔ ${edge.toProductId}: ${edge.note}`).join(" ")
      : unverifiedEdges.length
        ? `${unverifiedEdges.length} handoff${unverifiedEdges.length === 1 ? "" : "s"} without a typed compatibility relationship (${unverifiedEdges.map((edge) => `${edge.fromProductId} ↔ ${edge.toProductId}`).join(", ")}).`
        : "Every handoff has a typed, non-incompatible relationship.",
    evidenceIds: [...brokenEdges, ...unverifiedEdges].flatMap((edge) => (edge.relationshipId ? [edge.relationshipId] : [])),
  });

  const retired = productsUsed.filter((product) => product.lifecycleState === "retired");
  push("lifecycle", {
    id: "lifecycle",
    label: "No retired components",
    outcome: retired.length ? "violated" : "satisfied",
    reason: retired.length ? `${retired.map((product) => product.name).join(", ")} recorded as retired.` : "No component is recorded as retired.",
    evidenceIds: retired.map((product) => product.id),
  });

  if (profile.region) {
    const macro = regionInfo(profile.region)?.macro;
    const unknown = productsUsed.filter((product) => !product.availableRegions?.length);
    const missing = productsUsed.filter(
      (product) => product.availableRegions?.length &&
        !product.availableRegions.some((region) => region === profile.region || region === macro || region === "Global"),
    );
    push("region", {
      id: "region",
      label: `Available in ${profile.region}`,
      outcome: missing.length ? "violated" : unknown.length ? "unknown" : "satisfied",
      reason: missing.length
        ? `Not recorded as available in ${profile.region}: ${missing.map((product) => product.name).join(", ")}.`
        : unknown.length
          ? `Regional availability not recorded for ${unknown.map((product) => product.name).join(", ")}.`
          : "Every component has recorded availability in this region.",
      evidenceIds: [],
    });
  }

  if (profile.dataResidency) {
    const unknown = productsUsed.filter((product) => !product.dataResidencyOptions?.length);
    const missing = productsUsed.filter((product) => product.dataResidencyOptions?.length && !product.dataResidencyOptions.includes(profile.dataResidency!));
    push("dataResidency", {
      id: "dataResidency",
      label: `Data residency: ${profile.dataResidency}`,
      outcome: missing.length ? "violated" : unknown.length ? "unknown" : "satisfied",
      reason: missing.length
        ? `No recorded ${profile.dataResidency} residency option for ${missing.map((product) => product.name).join(", ")}.`
        : unknown.length
          ? `Residency options not recorded for ${unknown.map((product) => product.name).join(", ")}.`
          : `Every component records a ${profile.dataResidency} residency option.`,
      evidenceIds: [],
    });
  }

  if (/self-hosted/i.test(profile.deploymentPreference)) {
    const missing = productsUsed.filter((product) => product.deploymentOptions?.length && !product.deploymentOptions.includes("self-hosted"));
    const unknown = productsUsed.filter((product) => !product.deploymentOptions?.length);
    push("deploymentPreference", {
      id: "deploymentPreference",
      label: "Self-hosted deployment",
      outcome: missing.length ? "violated" : unknown.length ? "unknown" : "satisfied",
      reason: missing.length ? `Cloud-only: ${missing.map((product) => product.name).join(", ")}.` : unknown.length ? `Deployment options not recorded for ${unknown.map((product) => product.name).join(", ")}.` : "All components record a self-hosted option.",
      evidenceIds: [],
    });
  }

  if (profile.humanApprovalRequired) {
    const escalation = capabilities.has("human-escalation");
    push("humanApprovalRequired", {
      id: "humanApprovalRequired",
      label: "Human approval / exception path",
      outcome: escalation ? "satisfied" : "violated",
      reason: escalation ? "Architecture includes a human-escalation slot." : "No human-escalation slot in this architecture.",
      evidenceIds: [version.id],
    });
  }

  if (profile.commercialReuseRequired) {
    const reuse = canReuse(blueprint, "commercial");
    push("commercialReuseRequired", {
      id: "commercialReuseRequired",
      label: "Blueprint licensed for commercial reuse",
      outcome: reuse.allowed === true ? "satisfied" : reuse.allowed === "conditional" ? "unknown" : "violated",
      reason: reuse.reason,
      evidenceIds: [blueprint.id],
    });
  }

  // Economics: Blueprint version estimate first, else the source implementation record.
  const source = blueprint.derivedFromImplementationId
    ? catalogue.implementations.find((record) => record.id === blueprint.derivedFromImplementationId)
    : undefined;
  const fromVersion = version.setupCostLow != null || version.setupCostHigh != null;
  const setupCost = fromVersion
    ? range(version.setupCostLow, version.setupCostHigh)
    : range(source?.implementationCostLow ?? source?.implementationCost, source?.implementationCostHigh ?? source?.implementationCost);
  const monthlyCost = version.monthlyCostLow != null || version.monthlyCostHigh != null
    ? range(version.monthlyCostLow, version.monthlyCostHigh)
    : range(source?.ongoingMonthlyCostLow ?? source?.ongoingMonthlyCost, source?.ongoingMonthlyCostHigh ?? source?.ongoingMonthlyCost);
  const maintenanceHours = version.maintenanceHoursLow != null || version.maintenanceHoursHigh != null
    ? range(version.maintenanceHoursLow, version.maintenanceHoursHigh)
    : range(source?.maintenanceHoursPerMonth, source?.maintenanceHoursPerMonth);
  const costBasis = fromVersion
    ? `${version.costBasis ?? "Blueprint version estimate"}${blueprint.demo ? " (illustrative)" : ""}`
    : source
      ? `Source implementation record${source.demo ? " (illustrative)" : ""}`
      : "No cost data recorded";

  const budgetCheck = (field: "budgetMax" | "ongoingBudgetMax", ceiling: number | null | undefined, value: ObjectiveRange, label: string) => {
    if (ceiling == null) return;
    push(field, {
      id: field,
      label: `${label} ≤ ${profile.currency} ${ceiling.toLocaleString("en-GB")}`,
      outcome: value.low == null ? "unknown" : value.low > ceiling ? "violated" : value.high! > ceiling ? "unknown" : "satisfied",
      reason: value.low == null
        ? `No ${label.toLowerCase()} data recorded.`
        : value.low > ceiling
          ? `Recorded ${label.toLowerCase()} starts at ${value.low.toLocaleString("en-GB")}.`
          : value.high! > ceiling
            ? `Recorded range ${value.low.toLocaleString("en-GB")}–${value.high!.toLocaleString("en-GB")} crosses the ceiling.`
            : `Recorded range within ceiling (${costBasis}).`,
      evidenceIds: fromVersion ? [version.id] : source ? [source.id] : [],
    });
  };
  budgetCheck("budgetMax", profile.budgetMax, setupCost, "Setup cost");
  budgetCheck("ongoingBudgetMax", profile.ongoingBudgetMax, monthlyCost, "Monthly cost");

  if (profile.technicalCapability) {
    const operable = { none: ["no-code"], basic: ["no-code", "low-code"], intermediate: ["no-code", "low-code", "developer"], advanced: ["no-code", "low-code", "developer"] }[profile.technicalCapability];
    const needs = productsUsed.filter((product) => product.operatorSkill && !operable.includes(product.operatorSkill));
    const unknown = productsUsed.filter((product) => !product.operatorSkill);
    push("technicalCapability", {
      id: "technicalCapability",
      label: "Day-to-day administration fits the team",
      outcome: needs.length ? "violated" : unknown.length ? "unknown" : "satisfied",
      reason: needs.length
        ? `Administration needs more skill than recorded for the team: ${needs.map((product) => `${product.name} (${product.operatorSkill})`).join(", ")}.`
        : unknown.length
          ? `Administration skill not recorded for ${unknown.map((product) => product.name).join(", ")}.`
          : "Every component is recorded as administrable at this skill level.",
      evidenceIds: [],
    });
  }

  // Raw objectives.
  const typedEdges = relationships.filter((relationship) => compatibleTypes.has(relationship.relationshipType) && relationship.outcome === "satisfied");
  const observedPairs = new Set(
    (catalogue.implementationConnections ?? []).flatMap((connection) => {
      const record = catalogue.implementations.find((item) => item.id === connection.implementationId);
      if (!record || !isPublicImplementation(record)) return [];
      const items = catalogue.implementationStackItems ?? [];
      const from = items.find((item) => item.id === connection.fromItemId)?.productId;
      const to = items.find((item) => item.id === connection.toItemId)?.productId;
      return from && to ? [[from, to].sort().join("|")] : [];
    }),
  );
  const edgePairs = relationships.map((relationship) => [relationship.fromProductId, relationship.toProductId].sort().join("|"));
  const supporting = catalogue.implementations.filter((record) => {
    if (!isPublicImplementation(record)) return false;
    const stack = new Set((catalogue.implementationStackItems ?? []).filter((item) => item.implementationId === record.id).map((item) => item.productId));
    const shared = [...productIds].filter((id) => stack.has(id)).length;
    return shared >= Math.max(2, Math.ceil(productIds.size * 0.6));
  });
  const objectives: CandidateObjectives = {
    setupCost,
    monthlyCost,
    maintenanceHours,
    complexity:
      productIds.size +
      2 * relationships.filter((relationship) => relationship.relationshipType === "custom-integration-required").length +
      relationships.filter((relationship) => relationship.relationshipType === "requires-middleware").length,
    compatibilityCoverage: relationships.length ? typedEdges.length / relationships.length : 0,
    implementationEvidence: supporting.length,
    flexibility: slots.filter((slot) => slot.alternativeProductIds.length > 0).length,
    vendorDiversity: productIds.size ? new Set(productsUsed.map((product) => product.providerId)).size / productIds.size : 0,
  };

  const hardViolated = constraintResults.filter((result) => result.strength === "hard" && result.outcome === "violated");
  const hardUnknown = constraintResults.filter((result) => result.strength === "hard" && result.outcome === "unknown");
  const softMatched = constraintResults.filter((result) => result.strength === "soft" && result.outcome === "satisfied");
  const softMissed = constraintResults.filter((result) => result.strength === "soft" && result.outcome !== "satisfied");

  const freshness = blueprintFreshness(blueprint, version, slots, catalogue.products, catalogue.relationships, catalogue.compatibilityChecks ?? [], ctx.asOf);
  const comparable = ctx.relevantImplementationIds
    .map((id) => ({ id, similarity: ctx.similarities[id] }))
    .filter((entry) => entry.similarity && supporting.some((record) => record.id === entry.id))
    .map((entry) => ({ implementationId: entry.id, level: entry.similarity.level, summary: similaritySummary(entry.similarity) }));
  const unverified = [
    ...relationships.filter((relationship) => relationship.outcome === "unknown").map((relationship) => `${relationship.fromProductId} ↔ ${relationship.toProductId}: ${relationship.note}`),
    ...hardUnknown.map((result) => result.reason),
  ];
  const whyItFits = [
    ...constraintResults.filter((result) => result.strength === "hard" && result.outcome === "satisfied" && !result.id.startsWith("capability:")).map((result) => result.label),
    ...comparable.filter((entry) => entry.level !== "low").map((entry) => entry.summary),
    ...softMatched.map((result) => result.reason),
  ];
  const whyItMayNotFit = [
    ...hardViolated.map((result) => result.reason),
    ...softMissed.map((result) => result.reason),
    ...(freshness.state !== "current" ? [`Blueprint freshness: ${freshness.state.replaceAll("-", " ")}. ${freshness.reasons.join(" ")}`] : []),
    ...(blueprint.knownLimitations ? [blueprint.knownLimitations] : []),
    ...(source?.demo || blueprint.demo ? ["Source data is illustrative demo data, not a verified customer deployment."] : []),
  ];
  const id = `cand-${digest({ version: version.id, assignment }).slice(0, 12)}`;
  const names = [...productIds].map((productId) => catalogue.products.find((product) => product.id === productId)?.name ?? productId);
  return {
    id,
    name: blueprint.name,
    provenance: blueprint.provenance,
    solutionRunId: "pending",
    sourceBlueprintId: blueprint.id,
    sourceBlueprintVersionId: version.id,
    sourceImplementationIds: supporting.map((record) => record.id).sort(),
    tradeoffLabels: [],
    label: "",
    summary: `${blueprint.description} Components: ${names.join(", ")}.`,
    objectives,
    constraintResults,
    satisfiedHardConstraints: constraintResults.filter((result) => result.strength === "hard" && result.outcome === "satisfied").map((result) => result.label),
    unknownHardConstraints: hardUnknown.map((result) => result.label),
    softPreferenceMatches: softMatched.map((result) => result.label),
    softPreferenceMisses: softMissed.map((result) => result.label),
    risks: whyItMayNotFit,
    unknowns: unverified,
    dominated: false,
    dominatedBy: [],
    assignment,
    feasible: hardViolated.length === 0,
    explanation: {
      whyItFits: [...new Set(whyItFits)],
      whyItMayNotFit: [...new Set(whyItMayNotFit)],
      comparableImplementations: comparable,
      blueprintSource: { blueprintId: blueprint.id, versionId: version.id, version: version.version, rights: blueprint.reuseRights, freshness: freshness.state },
      relationships,
      evidenceCoverage: `${typedEdges.length} of ${relationships.length} handoffs have a typed compatibility relationship; ${edgePairs.filter((pair) => observedPairs.has(pair)).length} were observed in published implementation records; ${supporting.length} published record${supporting.length === 1 ? "" : "s"} use most of these components.`,
      unverifiedAreas: [...new Set(unverified)],
      costBasis,
    },
  };
}

/**
 * Pareto dominance over raw objectives. Candidate B dominates A when B is at least
 * as good on every compared objective and strictly better on one. An objective is
 * compared only when both values are known; if exactly one side is unknown the pair
 * is treated as incomparable and neither dominates.
 */
const objectiveDimensions: { key: string; better: "lower" | "higher"; get: (c: SolutionCandidate) => number | null }[] = [
  { key: "setupCost", better: "lower", get: setupOf },
  { key: "monthlyCost", better: "lower", get: (c) => c.objectives.monthlyCost.high },
  { key: "maintenanceHours", better: "lower", get: (c) => c.objectives.maintenanceHours.high },
  { key: "complexity", better: "lower", get: (c) => c.objectives.complexity },
  { key: "compatibilityCoverage", better: "higher", get: (c) => c.objectives.compatibilityCoverage },
  { key: "implementationEvidence", better: "higher", get: (c) => c.objectives.implementationEvidence },
  { key: "flexibility", better: "higher", get: (c) => c.objectives.flexibility },
];

export function dominates(b: SolutionCandidate, a: SolutionCandidate) {
  let strictly = false;
  for (const dimension of objectiveDimensions) {
    const vb = dimension.get(b);
    const va = dimension.get(a);
    if (vb == null && va == null) continue;
    if (vb == null || va == null) return false;
    const better = dimension.better === "lower" ? vb < va : vb > va;
    const worse = dimension.better === "lower" ? vb > va : vb < va;
    if (worse) return false;
    if (better) strictly = true;
  }
  return strictly;
}

export function markParetoDominance(candidates: SolutionCandidate[]) {
  const feasible = candidates.filter((candidate) => candidate.feasible);
  return candidates.map((candidate) => {
    if (!candidate.feasible) return { ...candidate, dominated: false, dominatedBy: [] };
    const by = feasible.filter((other) => other.id !== candidate.id && dominates(other, candidate)).map((other) => other.id);
    return { ...candidate, dominated: by.length > 0, dominatedBy: by };
  });
}

const labelRules: { label: string; better: "lower" | "higher"; get: (c: SolutionCandidate) => number | null }[] = [
  { label: "Lower estimated setup cost", better: "lower", get: setupOf },
  { label: "Lower estimated ongoing cost", better: "lower", get: (c) => c.objectives.monthlyCost.high },
  { label: "Lower maintenance burden", better: "lower", get: (c) => c.objectives.maintenanceHours.high },
  { label: "Simpler to operate", better: "lower", get: (c) => c.objectives.complexity },
  { label: "Stronger implementation evidence", better: "higher", get: (c) => c.objectives.implementationEvidence },
  { label: "Stronger compatibility evidence", better: "higher", get: (c) => c.objectives.compatibilityCoverage },
  { label: "Greater flexibility", better: "higher", get: (c) => c.objectives.flexibility },
  { label: "Less vendor concentration", better: "higher", get: (c) => c.objectives.vendorDiversity },
];

/** A label applies only when the value is known, best among shown options, and strictly better than another. */
export function applyTradeoffLabels(candidates: SolutionCandidate[]) {
  const pool = candidates.filter((candidate) => candidate.feasible && !candidate.dominated);
  return candidates.map((candidate) => {
    if (!pool.includes(candidate) || pool.length < 2) return { ...candidate, tradeoffLabels: [], label: candidate.feasible ? (candidate.dominated ? "Dominated on recorded trade-offs" : "Feasible option") : "Excluded" };
    const labels = labelRules.flatMap((rule) => {
      const value = rule.get(candidate);
      if (value == null) return [];
      const known = pool.map(rule.get).filter((item): item is number => item != null);
      const best = rule.better === "lower" ? Math.min(...known) : Math.max(...known);
      const beatsSomeone = known.some((other) => (rule.better === "lower" ? value < other : value > other));
      return value === best && beatsSomeone ? [rule.label] : [];
    });
    return { ...candidate, tradeoffLabels: labels, label: labels[0] ?? "Feasible option" };
  });
}

function buildSlots(profile: RequirementProfile, catalogue: CompilerCatalogue, versionId: string): Slot[] {
  const items = catalogue.blueprintItems
    .filter((item) => item.blueprintVersionId === versionId)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const mustKeep = profile.mustKeepSystems.map((name) => productByName(catalogue.products, name)).filter((product): product is Product => !!product);
  return items.map((item) => {
    const known = (id: string) => catalogue.products.some((product) => product.id === id && product.lifecycleState !== "retired");
    const options = [...new Set([item.productId, ...item.alternativeProductIds].filter((id): id is string => !!id && known(id)))];
    const forced = mustKeep.find((product) => product.capabilityIds.includes(item.capabilityId));
    return { item, options: forced ? [forced.id] : options.length ? options : item.productId ? [item.productId] : [], forced: forced?.id };
  });
}

function enumerate(slots: Slot[]) {
  let assignments: Record<string, string>[] = [{}];
  let truncated = false;
  for (const slot of slots) {
    const next: Record<string, string>[] = [];
    for (const partial of assignments)
      for (const option of slot.options) {
        if (next.length >= MAX_ASSIGNMENTS_PER_BLUEPRINT) {
          truncated = true;
          break;
        }
        next.push({ ...partial, [slot.item.id]: option });
      }
    assignments = next;
  }
  return { assignments, truncated };
}

function stripForDigest(candidates: SolutionCandidate[]) {
  return candidates.map((candidate) => ({
    id: candidate.id,
    assignment: candidate.assignment,
    feasible: candidate.feasible,
    dominated: candidate.dominated,
    objectives: candidate.objectives,
    labels: candidate.tradeoffLabels,
    constraints: candidate.constraintResults.map((result) => [result.id, result.outcome, result.strength]),
  }));
}

export interface CompileOptions {
  /** Date used for freshness evaluation. */
  asOf?: Date;
  /** Wall-clock timestamp recorded on the run; excluded from the result digest. */
  compiledAt?: string;
}

export function compileSolutions(
  profile: RequirementProfile,
  catalogue: CompilerCatalogue,
  options: CompileOptions = {},
): CompiledSolution {
  const asOf = options.asOf ?? new Date();
  const compiledAt = options.compiledAt ?? new Date().toISOString();
  const validation = validateProfile(profile);
  const snapshot: RequirementProfile = structuredClone(profile);
  const stages: CompilerStage[] = [];
  const exclusions: DecisionTrace["exclusions"] = [];
  const cDigest = catalogueDigest(catalogue);

  stages.push({ id: "understand", label: "Understanding requirement", detail: validation.ok ? `${Object.keys(profile.strengths ?? {}).length} explicit strengths; ${(profile.inferredFields ?? []).length} unconfirmed inferred fields.` : `Validation failed: ${validation.errors.join("; ")}` });

  const required = requiredCapabilitySlots(profile.useCaseId, profile.humanApprovalRequired ? ["human-escalation"] : []);
  const useCasesById = new Map<string, string[]>();
  for (const link of catalogue.implementationUseCases ?? []) useCasesById.set(link.implementationId, [...(useCasesById.get(link.implementationId) ?? []), link.useCaseId]);
  const similarities: Record<string, ContextSimilarity> = {};
  const published = catalogue.implementations.filter(isPublicImplementation).sort((a, b) => a.id.localeCompare(b.id));
  for (const record of published)
    similarities[record.id] = similarityForProfile(profile, record, catalogue.contexts.find((context) => context.implementationId === record.id), useCasesById.get(record.id) ?? []);
  const relevantImplementationIds = published
    .filter((record) => (profile.useCaseId && useCasesById.get(record.id)?.includes(profile.useCaseId)) || similarities[record.id].level !== "low")
    .map((record) => record.id);
  stages.push({ id: "implementations", label: "Finding comparable implementations", detail: `${relevantImplementationIds.length} of ${published.length} published records share the outcome or have medium/high context similarity.` });

  const blueprints = catalogue.blueprints
    .filter((blueprint) => blueprint.publicationState === "published" && blueprint.moderationState === "approved")
    .sort((a, b) => a.id.localeCompare(b.id));
  const pool: DecisionTrace["candidatePool"] = [];
  const evaluated: SolutionCandidate[] = [];
  const ctx: EvaluationContext = { profile, catalogue, asOf, similarities, relevantImplementationIds };
  for (const blueprint of blueprints) {
    const version = catalogue.blueprintVersions.find((item) => item.id === blueprint.currentVersionId);
    if (!version) {
      exclusions.push({ id: blueprint.id, blueprintId: blueprint.id, reason: "No current version recorded." });
      continue;
    }
    if (blueprint.compatibilityState === "archived") {
      exclusions.push({ id: blueprint.id, blueprintId: blueprint.id, reason: "Blueprint is archived." });
      continue;
    }
    if (profile.useCaseId && blueprint.useCaseIds.length && !blueprint.useCaseIds.includes(profile.useCaseId)) {
      exclusions.push({ id: blueprint.id, blueprintId: blueprint.id, reason: `Addresses a different outcome (${blueprint.useCaseIds.join(", ")}).` });
      continue;
    }
    const slots = buildSlots(profile, catalogue, version.id);
    const { assignments, truncated } = enumerate(slots);
    pool.push({ blueprintId: blueprint.id, versionId: version.id, assignments: assignments.length, truncated });
    for (const assignment of assignments) evaluated.push(evaluateAssignment(ctx, blueprint, version, assignment));
  }
  stages.push({ id: "blueprints", label: "Evaluating Blueprint patterns", detail: `${pool.length} Blueprint${pool.length === 1 ? "" : "s"} in scope; ${evaluated.length} component combinations enumerated from recorded alternatives.` });

  for (const candidate of evaluated.filter((item) => !item.feasible)) {
    const reasons = candidate.constraintResults.filter((result) => result.strength === "hard" && result.outcome === "violated");
    exclusions.push({ id: candidate.id, blueprintId: candidate.sourceBlueprintId ?? "", reason: reasons.map((result) => result.reason).join(" ") });
  }
  const feasible = evaluated.filter((candidate) => candidate.feasible);
  stages.push({ id: "constraints", label: "Checking hard constraints", detail: `${evaluated.length - feasible.length} combination${evaluated.length - feasible.length === 1 ? "" : "s"} excluded by a violated hard constraint.` });
  const unknownCount = feasible.filter((candidate) => candidate.unknownHardConstraints.length).length;
  stages.push({ id: "compatibility", label: "Checking technology compatibility", detail: `${unknownCount} feasible combination${unknownCount === 1 ? "" : "s"} still depend on unverified relationships or data.` });

  const representatives = collapseEquivalentVariants(evaluated.filter((candidate) => candidate.feasible), catalogue);
  const marked = applyTradeoffLabels(markParetoDominance(representatives));
  const nonDominated = marked.filter((candidate) => !candidate.dominated).sort(compareCandidates);
  const dominated = marked.filter((candidate) => candidate.dominated).sort(compareCandidates).slice(0, MAX_DOMINATED_SHOWN);
  const shown = [...nonDominated, ...dominated];
  stages.push({ id: "pareto", label: "Producing feasible approaches", detail: `${feasible.length} feasible combination${feasible.length === 1 ? "" : "s"} grouped into ${marked.length} distinct option${marked.length === 1 ? "" : "s"}; ${nonDominated.length} non-dominated, ${marked.length - nonDominated.length} dominated on every recorded trade-off.` });

  const trace: DecisionTrace = {
    engineVersion: COMPILER_ENGINE_VERSION,
    rulesetVersion: COMPILER_RULESET_VERSION,
    fingerprintSchemaVersion: FINGERPRINT_VERSION,
    compiledAt,
    asOf: asOf.toISOString().slice(0, 10),
    profileSnapshot: snapshot,
    catalogueDigest: cDigest,
    requiredCapabilities: required,
    relevantImplementationIds,
    candidatePool: pool,
    constraintsApplied: [...new Map(evaluated.flatMap((candidate) => candidate.constraintResults).map((result) => [result.id, { id: result.id, label: result.label, strength: result.strength }])).values()].sort((a, b) => a.id.localeCompare(b.id)),
    exclusions,
    compatibilityEvidenceIds: [...new Set(shown.flatMap((candidate) => candidate.explanation?.relationships.flatMap((relationship) => (relationship.relationshipId ? [relationship.relationshipId] : [])) ?? []))].sort(),
    implementationEvidenceIds: [...new Set(shown.flatMap((candidate) => candidate.sourceImplementationIds))].sort(),
    results: shown.map((candidate) => ({ candidateId: candidate.id, feasible: candidate.feasible, dominated: candidate.dominated, objectives: candidate.objectives, labels: candidate.tradeoffLabels })),
    substitutions: [],
  };
  const inputDigest = digest({ profile: snapshot, catalogue: cDigest, engine: COMPILER_ENGINE_VERSION, ruleset: COMPILER_RULESET_VERSION, asOf: trace.asOf });
  const resultDigest = digest({ input: inputDigest, results: stripForDigest(shown), exclusions });
  const runId = `run-${inputDigest.slice(0, 12)}-${compiledAt.replace(/\D/g, "").slice(0, 14)}`;
  const run: SolutionRun = {
    id: runId,
    name: `Solution run for ${profile.name}`,
    provenance: "inferred",
    ownerId: profile.ownerId,
    requirementProfileId: profile.id,
    engineVersion: COMPILER_ENGINE_VERSION,
    rulesetVersion: COMPILER_RULESET_VERSION,
    fingerprintSchemaVersion: FINGERPRINT_VERSION,
    candidatePoolIds: pool.map((entry) => entry.blueprintId),
    excluded: exclusions.map((exclusion) => ({ id: exclusion.id, reason: exclusion.reason })),
    createdAt: compiledAt,
    profileSnapshot: snapshot,
    catalogueDigest: cDigest,
    resultDigest,
    trace,
  };
  const candidates = shown.map((candidate) => ({ ...candidate, solutionRunId: runId }));
  return {
    run,
    candidates,
    items: candidateItems(candidates, catalogue),
    similarities,
    stages,
    trace,
    validationErrors: validation.errors,
  };
}

/**
 * Combinations from the same Blueprint with identical objective values and
 * constraint outcomes are the same trade-off. Keep one representative (the one
 * closest to the Blueprint's default components) and count the rest; users can
 * still reach them through component substitution.
 */
export function collapseEquivalentVariants(candidates: SolutionCandidate[], catalogue: CompilerCatalogue) {
  const groups = new Map<string, SolutionCandidate[]>();
  for (const candidate of candidates) {
    const key = digest({
      blueprint: candidate.sourceBlueprintVersionId,
      objectives: candidate.objectives,
      constraints: candidate.constraintResults.map((result) => [result.id, result.outcome]),
    });
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  const substitutions = (candidate: SolutionCandidate) =>
    Object.entries(candidate.assignment).filter(([slotId, productId]) => catalogue.blueprintItems.find((item) => item.id === slotId)?.productId !== productId).length;
  return [...groups.values()].map((group) => {
    const [representative] = [...group].sort((a, b) => substitutions(a) - substitutions(b) || a.id.localeCompare(b.id));
    return { ...representative, equivalentVariants: group.length - 1 };
  });
}

function compareCandidates(a: SolutionCandidate, b: SolutionCandidate) {
  return (a.sourceBlueprintId ?? "").localeCompare(b.sourceBlueprintId ?? "") || a.id.localeCompare(b.id);
}

export function candidateItems(candidates: SolutionCandidate[], catalogue: CompilerCatalogue): SolutionCandidateItem[] {
  return candidates.flatMap((candidate) =>
    Object.entries(candidate.assignment).map(([slotId, productId]) => {
      const slot = catalogue.blueprintItems.find((item) => item.id === slotId);
      return {
        id: `${candidate.id}-${slotId}`,
        name: slot?.role ?? slotId,
        provenance: candidate.provenance,
        candidateId: candidate.id,
        slotId,
        capabilityId: slot?.capabilityId ?? "unknown",
        productId,
        role: slot?.role ?? slotId,
        alternativeProductIds: slot ? [slot.productId, ...slot.alternativeProductIds].filter((id): id is string => !!id && id !== productId) : [],
      };
    }),
  );
}

/**
 * Substitute one component and re-run the same evaluation. Feasibility is never
 * carried over from the original candidate; dominance and labels are recomputed.
 */
export function substituteComponent(
  result: CompiledSolution,
  candidateId: string,
  slotId: string,
  productId: string,
  catalogue: CompilerCatalogue,
  asOf: Date = new Date(result.trace.asOf),
): CompiledSolution {
  const original = result.candidates.find((candidate) => candidate.id === candidateId);
  if (!original?.sourceBlueprintId || !original.sourceBlueprintVersionId) return result;
  const blueprint = catalogue.blueprints.find((item) => item.id === original.sourceBlueprintId);
  const version = catalogue.blueprintVersions.find((item) => item.id === original.sourceBlueprintVersionId);
  if (!blueprint || !version) return result;
  const ctx: EvaluationContext = {
    profile: result.trace.profileSnapshot,
    catalogue,
    asOf,
    similarities: result.similarities,
    relevantImplementationIds: result.trace.relevantImplementationIds,
  };
  const replaced = { ...evaluateAssignment(ctx, blueprint, version, { ...original.assignment, [slotId]: productId }), substituted: true, solutionRunId: result.run.id };
  // The new combination may already exist as another (e.g. dominated) variant; keep one copy.
  const pool = result.candidates
    .filter((candidate) => candidate.id === candidateId || candidate.id !== replaced.id)
    .map((candidate) => (candidate.id === candidateId ? replaced : candidate));
  const candidates = applyTradeoffLabels(markParetoDominance(pool));
  const trace: DecisionTrace = {
    ...result.trace,
    substitutions: [...result.trace.substitutions, { candidateId, slotId, fromProductId: original.assignment[slotId], toProductId: productId, feasible: replaced.feasible }],
  };
  return { ...result, candidates, items: candidateItems(candidates, catalogue), trace, run: { ...result.run, trace } };
}

/** Re-run a stored run's snapshot against the same catalogue and compare digests. */
export function verifyReproducibility(run: SolutionRun, catalogue: CompilerCatalogue) {
  const trace = run.trace as DecisionTrace | undefined;
  if (!run.profileSnapshot || !trace) return { reproducible: false, reason: "Run has no stored snapshot." };
  if (catalogueDigest(catalogue) !== run.catalogueDigest)
    return { reproducible: false, reason: "The catalogue has changed since this run; results may legitimately differ." };
  const again = compileSolutions(run.profileSnapshot, catalogue, { asOf: new Date(trace.asOf), compiledAt: trace.compiledAt });
  return again.run.resultDigest === run.resultDigest
    ? { reproducible: true, reason: "Re-running the stored snapshot produced an identical result digest." }
    : { reproducible: false, reason: "Result digest differs from the stored run." };
}
