import { digest } from "./canonical";
import type {
  ImplementationConnection,
  ImplementationContext,
  ImplementationFingerprint,
  ImplementationProcessStep,
  ImplementationRecord,
  ImplementationStackItem,
  TechnologyRelationship,
} from "./intelligence-model";
import { jaccard, regionInfo, resolveBusinessType } from "./taxonomy";

/**
 * Implementation Fingerprint: a versioned, reproducible normalization of an
 * implementation used for deduplication, similarity retrieval, cohorting and
 * architecture-pattern detection. It only reads public, non-identifying fields.
 * The digest is for identity/change detection, not for protecting anything.
 */
export const FINGERPRINT_VERSION = "1.0";

export interface FingerprintInput {
  record: ImplementationRecord;
  context?: ImplementationContext;
  useCaseIds: string[];
  stackItems: ImplementationStackItem[];
  connections: ImplementationConnection[];
  processSteps: ImplementationProcessStep[];
  relationships: TechnologyRelationship[];
}

export const FINGERPRINT_LINEAGE = [
  "implementation_records.industry",
  "implementation_records.business_type",
  "implementation_records.organization_size_band",
  "implementation_records.region",
  "implementation_contexts.locations",
  "implementation_contexts.monthly_volume_min|max",
  "implementation_contexts.technical_capability",
  "implementation_contexts.regulatory_constraints",
  "implementation_use_cases.use_case_id",
  "implementation_stack_items.capability_id|product_id",
  "implementation_connections.from|to → capability pair",
  "technology_relationships.relationship_type",
  "implementation_process_steps.phase|human_role",
];

function band(value: number | null | undefined, edges: number[], labels: string[]) {
  if (value == null) return "unknown";
  const index = edges.findIndex((edge) => value < edge);
  return labels[index === -1 ? labels.length - 1 : index];
}

export function relationshipBetween(
  relationships: TechnologyRelationship[],
  a: string,
  b: string,
) {
  return relationships.find(
    (relationship) =>
      (relationship.sourceProductId === a && relationship.targetProductId === b) ||
      (relationship.sourceProductId === b && relationship.targetProductId === a),
  );
}

export function canonicalFingerprint(input: FingerprintInput) {
  const { record, context, stackItems, connections, processSteps, relationships } = input;
  const byId = new Map(stackItems.map((item) => [item.id, item]));
  const volume = context?.monthlyVolumeMax ?? context?.monthlyVolume ?? context?.monthlyVolumeMin;
  const edges = connections.flatMap((connection) => {
    const from = byId.get(connection.fromItemId);
    const to = byId.get(connection.toItemId);
    if (!from || !to) return [];
    const type = relationshipBetween(relationships, from.productId, to.productId)?.relationshipType ?? "unknown";
    return [`${from.capabilityId}>${to.capabilityId}:${type}`];
  });
  const after = processSteps.filter((step) => step.phase === "after");
  const humanAfter = after.filter((step) => /human|staff|review|approval|exception/i.test(`${step.description} ${step.humanRole}`));
  return {
    fingerprintVersion: FINGERPRINT_VERSION,
    useCases: [...new Set(input.useCaseIds)].sort(),
    context: {
      industry: record.industry.trim().toLowerCase(),
      businessType: resolveBusinessType(record.businessType)?.code ?? "unresolved",
      sizeBand: record.organizationSizeBand,
      regionMacro: regionInfo(record.region)?.macro ?? "unknown",
      locationsBand: band(context?.locations, [2, 6, 21], ["1", "2-5", "6-20", "21+"]),
      volumeBand: band(volume, [100, 1000, 10000], ["<100", "100-999", "1000-9999", "10000+"]),
      technicalCapability: context?.technicalCapability ?? "unknown",
    },
    capabilities: [...new Set(stackItems.map((item) => item.capabilityId))].sort(),
    technologies: [...new Set(stackItems.map((item) => item.productId))].sort(),
    edges: [...new Set(edges)].sort(),
    process: {
      beforeSteps: processSteps.filter((step) => step.phase === "before").length,
      changes: processSteps.filter((step) => step.phase === "change").length,
      afterSteps: after.length,
      humanStepsAfter: humanAfter.length,
      humanExceptionPath: humanAfter.length > 0,
    },
    constraints: [...new Set(context?.regulatoryConstraints ?? [])].sort(),
  };
}

export type CanonicalFingerprint = ReturnType<typeof canonicalFingerprint>;

export function fingerprintTokens(canonical: CanonicalFingerprint) {
  return [
    ...canonical.useCases.map((value) => `uc:${value}`),
    ...Object.entries(canonical.context).map(([key, value]) => `ctx:${key}=${value}`),
    ...canonical.capabilities.map((value) => `cap:${value}`),
    ...canonical.technologies.map((value) => `tech:${value}`),
    ...canonical.edges.map((value) => `edge:${value}`),
    `proc:human-exception=${canonical.process.humanExceptionPath}`,
    ...canonical.constraints.map((value) => `reg:${value.toLowerCase()}`),
  ].sort();
}

export function computeFingerprint(input: FingerprintInput, computedAt = "1970-01-01T00:00:00Z"): ImplementationFingerprint {
  const canonical = canonicalFingerprint(input);
  return {
    id: `${input.record.id}-fingerprint-${FINGERPRINT_VERSION}`,
    name: `${input.record.name} fingerprint`,
    provenance: "inferred",
    implementationId: input.record.id,
    fingerprintVersion: FINGERPRINT_VERSION,
    digest: digest(canonical),
    tokens: fingerprintTokens(canonical),
    canonical,
    inputLineage: FINGERPRINT_LINEAGE,
    computedAt,
  };
}

/** Architecture-pattern key: same capabilities and handoff types, regardless of vendor. */
export function architecturePatternKey(canonical: CanonicalFingerprint) {
  return digest({
    capabilities: canonical.capabilities,
    edges: canonical.edges.map((edge) => edge.replace(/:.*$/, "")),
  }).slice(0, 16);
}

export function fingerprintOverlap(a: ImplementationFingerprint, b: ImplementationFingerprint) {
  return jaccard(a.tokens, b.tokens) ?? 0;
}

/** Flags probable duplicate submissions for moderator review; never auto-merges. */
export function likelyDuplicate(a: ImplementationFingerprint, b: ImplementationFingerprint) {
  if (a.implementationId === b.implementationId) return false;
  if (a.digest === b.digest) return true;
  const techA = a.tokens.filter((token) => token.startsWith("tech:"));
  const techB = b.tokens.filter((token) => token.startsWith("tech:"));
  return fingerprintOverlap(a, b) >= 0.85 && (jaccard(techA, techB) ?? 0) === 1;
}
