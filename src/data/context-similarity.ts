import type {
  ContextSimilarity,
  ImplementationContext,
  ImplementationRecord,
  RequirementProfile,
  SimilarityFactor,
  TechnicalCapability,
} from "./intelligence-model";
import {
  jaccard,
  magnitudeSimilarity,
  normalizeSystemName,
  parseSizeBand,
  rangeOverlap,
  regionInfo,
  resolveBusinessType,
  taxonomyAffinity,
} from "./taxonomy";

/**
 * Deterministic, explainable context similarity. It compares business context only;
 * it does not predict that an outcome observed in one business will recur in another.
 */
export const SIMILARITY_VERSION = "1.0";

export interface ContextVector {
  useCaseIds: string[];
  businessType: string;
  industry: string;
  sizeBand: string;
  region: string;
  locations: number | null;
  volumeMin: number | null;
  volumeMax: number | null;
  systems: string[];
  technicalCapability: TechnicalCapability | null;
  regulatory: string[];
  workflow: string[];
}

const WEIGHTS: Record<string, number> = {
  "use case": 0.18,
  "business type": 0.16,
  "organization size": 0.1,
  locations: 0.08,
  volume: 0.12,
  region: 0.08,
  systems: 0.12,
  "technical capability": 0.07,
  industry: 0.04,
  regulatory: 0.03,
  workflow: 0.02,
};

const capabilityOrder: TechnicalCapability[] = ["none", "basic", "intermediate", "advanced"];

export function contextFromImplementation(
  record: ImplementationRecord,
  context: ImplementationContext | undefined,
  useCaseIds: string[] = [],
): ContextVector {
  const min = context?.monthlyVolumeMin ?? context?.monthlyVolume ?? null;
  const max = context?.monthlyVolumeMax ?? context?.monthlyVolume ?? null;
  return {
    useCaseIds,
    businessType: record.businessType,
    industry: record.industry,
    sizeBand: record.organizationSizeBand,
    region: record.region,
    locations: context?.locations ?? null,
    volumeMin: min,
    volumeMax: max,
    systems: context?.existingSystems ?? [],
    technicalCapability: context?.technicalCapability ?? null,
    regulatory: context?.regulatoryConstraints ?? [],
    workflow: context?.workflowCharacteristics ?? [],
  };
}

export function contextFromProfile(profile: RequirementProfile): ContextVector {
  return {
    useCaseIds: profile.useCaseId ? [profile.useCaseId] : [],
    businessType: profile.businessType,
    industry: profile.industry,
    sizeBand: profile.organizationSizeBand,
    region: profile.region,
    locations: profile.locations,
    volumeMin: profile.monthlyVolume,
    volumeMax: profile.monthlyVolume,
    systems: [...new Set([...profile.currentSystems, ...profile.mustKeepSystems])],
    technicalCapability: profile.technicalCapability,
    regulatory: profile.complianceRequirements,
    workflow: [],
  };
}

const fmt = (value: number) => value.toLocaleString("en-GB");
const rangeLabel = (min: number, max: number) => (min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`);

export function compareContexts(target: ContextVector, candidate: ContextVector): ContextSimilarity {
  const factors: SimilarityFactor[] = [];
  const reasons: string[] = [];
  const differences: string[] = [];
  const unknowns: string[] = [];
  const add = (factor: string, match: number | null, onMatch?: string, onDiff?: string, threshold = 0.6) => {
    if (match == null) {
      unknowns.push(factor);
      factors.push({ factor, match: 0, weight: WEIGHTS[factor], compared: false });
      return;
    }
    factors.push({ factor, match, weight: WEIGHTS[factor], compared: true });
    if (match >= threshold && onMatch) reasons.push(onMatch);
    else if (match < threshold && onDiff) differences.push(onDiff);
  };

  add(
    "use case",
    target.useCaseIds.length && candidate.useCaseIds.length ? jaccard(target.useCaseIds, candidate.useCaseIds) : null,
    "Addresses the same business outcome.",
    "Addresses a different primary outcome.",
    0.5,
  );

  const leftType = resolveBusinessType(target.businessType);
  const rightType = resolveBusinessType(candidate.businessType);
  const affinity = taxonomyAffinity(leftType, rightType);
  add(
    "business type",
    affinity ?? (target.businessType && candidate.businessType
      ? Number(target.businessType.toLowerCase() === candidate.businessType.toLowerCase())
      : null),
    affinity === 1 || target.businessType.toLowerCase() === candidate.businessType.toLowerCase()
      ? `Same business type (${candidate.businessType}).`
      : `Related business type (${candidate.businessType}).`,
    `Different business type (${candidate.businessType}).`,
    0.6,
  );

  const leftSize = parseSizeBand(target.sizeBand);
  const rightSize = parseSizeBand(candidate.sizeBand);
  add(
    "organization size",
    leftSize && rightSize ? rangeOverlap(leftSize, rightSize) : null,
    `Same organization-size band (${candidate.sizeBand}).`,
    `Organization size differs (${candidate.sizeBand}).`,
    0.5,
  );

  add(
    "locations",
    target.locations && candidate.locations ? magnitudeSimilarity(target.locations, candidate.locations) : null,
    target.locations === candidate.locations
      ? `Both operate ${candidate.locations} location${candidate.locations === 1 ? "" : "s"}.`
      : `Similar number of locations (${target.locations} vs ${candidate.locations}).`,
    `Location count differs (${target.locations} vs ${candidate.locations}).`,
    0.75,
  );

  let volume: number | null = null;
  if (target.volumeMin != null && candidate.volumeMin != null) {
    const left: [number, number] = [target.volumeMin, target.volumeMax ?? target.volumeMin];
    const right: [number, number] = [candidate.volumeMin, candidate.volumeMax ?? candidate.volumeMin];
    const overlap = rangeOverlap(left, right);
    volume = overlap > 0 ? Math.max(overlap, magnitudeSimilarity((left[0] + left[1]) / 2, (right[0] + right[1]) / 2)) :
      magnitudeSimilarity((left[0] + left[1]) / 2, (right[0] + right[1]) / 2);
    add(
      "volume",
      volume,
      `Comparable monthly volume (${rangeLabel(right[0], right[1])} vs ${rangeLabel(left[0], left[1])}).`,
      `Monthly volume differs materially (${rangeLabel(right[0], right[1])} vs ${rangeLabel(left[0], left[1])}).`,
      0.75,
    );
  } else add("volume", null);

  const leftRegion = regionInfo(target.region);
  const rightRegion = regionInfo(candidate.region);
  add(
    "region",
    !target.region || !candidate.region
      ? null
      : target.region === candidate.region
        ? 1
        : leftRegion && rightRegion && leftRegion.macro === rightRegion.macro
          ? 0.6
          : 0,
    target.region === candidate.region ? `Same region (${candidate.region}).` : `Same wider region (${rightRegion?.macro}).`,
    `Different region (${candidate.region}); data-protection regime may differ.`,
    0.6,
  );

  const leftSystems = target.systems.map(normalizeSystemName);
  const rightSystems = candidate.systems.map(normalizeSystemName);
  const sharedSystems = candidate.systems.filter((system) => leftSystems.includes(normalizeSystemName(system)));
  const systemMatch = leftSystems.length && rightSystems.length ? jaccard(leftSystems, rightSystems) : null;
  add(
    "systems",
    systemMatch,
    sharedSystems.length ? `Both use ${sharedSystems.join(", ")}.` : undefined,
    sharedSystems.length
      ? `Only partly overlapping systems (shared: ${sharedSystems.join(", ")}).`
      : `No existing systems in common (${candidate.systems.join(", ") || "none recorded"}).`,
    0.34,
  );
  if (systemMatch != null && systemMatch < 0.34 && sharedSystems.length) reasons.push(`Both use ${sharedSystems.join(", ")}.`);

  const leftCap = target.technicalCapability ? capabilityOrder.indexOf(target.technicalCapability) : -1;
  const rightCap = candidate.technicalCapability ? capabilityOrder.indexOf(candidate.technicalCapability) : -1;
  add(
    "technical capability",
    leftCap >= 0 && rightCap >= 0 ? 1 - Math.abs(leftCap - rightCap) / 3 : null,
    leftCap === rightCap
      ? candidate.technicalCapability === "none"
        ? "Neither has an internal technical team."
        : `Same in-house technical capability (${candidate.technicalCapability}).`
      : `Similar in-house technical capability (${candidate.technicalCapability}).`,
    `In-house technical capability differs (${candidate.technicalCapability} vs ${target.technicalCapability}).`,
    0.66,
  );

  add(
    "industry",
    target.industry && candidate.industry ? Number(target.industry.toLowerCase() === candidate.industry.toLowerCase()) : null,
    undefined,
    undefined,
  );
  add("regulatory", target.regulatory.length && candidate.regulatory.length ? jaccard(target.regulatory, candidate.regulatory) : null);
  add("workflow", target.workflow.length && candidate.workflow.length ? jaccard(target.workflow, candidate.workflow) : null);

  const compared = factors.filter((factor) => factor.compared);
  const coverage = compared.reduce((sum, factor) => sum + factor.weight, 0);
  const agreement = compared.reduce((sum, factor) => sum + factor.weight * factor.match, 0);
  const score = coverage ? Math.round((agreement / coverage) * 100) : 0;
  const level: ContextSimilarity["level"] =
    score >= 70 && coverage >= 0.6 ? "high" : score >= 45 && coverage >= 0.4 ? "medium" : "low";
  if (coverage < 0.4) differences.push("Too little shared context was recorded to compare reliably.");
  return { score, level, reasons: [...new Set(reasons)], differences, unknowns, factors };
}

export function similarityForProfile(
  profile: RequirementProfile,
  record: ImplementationRecord,
  context: ImplementationContext | undefined,
  useCaseIds: string[] = [],
) {
  return compareContexts(contextFromProfile(profile), contextFromImplementation(record, context, useCaseIds));
}

/** One-sentence summary built from the strongest reasons; never mentions outcomes. */
export function similaritySummary(similarity: ContextSimilarity) {
  const label = `${similarity.level[0].toUpperCase()}${similarity.level.slice(1)} contextual similarity`;
  if (!similarity.reasons.length) return `${label}: few recorded context factors match.`;
  const reasons = similarity.reasons.slice(0, 4).map((reason) => reason.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase()));
  return `${label} because ${reasons.join("; ")}.`;
}
