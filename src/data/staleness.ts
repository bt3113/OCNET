import type {
  Blueprint,
  BlueprintStackItem,
  BlueprintVersion,
  CompatibilityCheck,
  ImplementationRecord,
  StalenessState,
  TechnologyRelationship,
} from "./intelligence-model";
import type { Product } from "./model";

/**
 * Freshness is computed, not typed in. A record that has not been reviewed within
 * its policy window becomes REVIEW_DUE and then STALE; concrete triggers (retired
 * products, failed compatibility checks) can make a Blueprint stale earlier.
 */
export interface FreshnessPolicy {
  reviewDueAfterDays: number;
  staleAfterDays: number;
}

export const freshnessPolicies = {
  implementationEvidence: { reviewDueAfterDays: 180, staleAfterDays: 365 },
  blueprintCompatibility: { reviewDueAfterDays: 120, staleAfterDays: 270 },
  technologyRelationship: { reviewDueAfterDays: 180, staleAfterDays: 365 },
} satisfies Record<string, FreshnessPolicy>;

export interface FreshnessTrigger {
  kind:
    | "product-retired"
    | "product-deprecated"
    | "incompatibility-recorded"
    | "compatibility-check-failed"
    | "review-date-passed"
    | "pricing-evidence-expired";
  severity: "stale" | "review-due";
  message: string;
  entityId?: string;
}

export interface Freshness {
  state: StalenessState;
  reasons: string[];
  lastReviewedAt?: string;
  nextReviewAt?: string;
  triggers: FreshnessTrigger[];
}

const DAY = 24 * 60 * 60 * 1000;
const rank: Record<StalenessState, number> = { current: 0, unknown: 1, "review-due": 2, stale: 3, archived: 4 };

function worst(a: StalenessState, b: StalenessState) {
  return rank[a] >= rank[b] ? a : b;
}

export function computeFreshness(
  input: {
    lastReviewedAt?: string;
    nextReviewAt?: string;
    archived?: boolean;
    triggers?: FreshnessTrigger[];
  },
  asOf: Date,
  policy: FreshnessPolicy,
): Freshness {
  const triggers = [...(input.triggers ?? [])];
  const reasons: string[] = [];
  if (input.archived) return { state: "archived", reasons: ["Archived by a reviewer."], triggers, ...input };
  let state: StalenessState = "unknown";
  const reviewed = input.lastReviewedAt ? Date.parse(input.lastReviewedAt) : NaN;
  if (Number.isNaN(reviewed)) reasons.push("No review date recorded.");
  else {
    const age = Math.floor((asOf.getTime() - reviewed) / DAY);
    if (age >= policy.staleAfterDays) {
      state = "stale";
      reasons.push(`Last reviewed ${age} days ago (stale after ${policy.staleAfterDays}).`);
    } else if (age >= policy.reviewDueAfterDays) {
      state = "review-due";
      reasons.push(`Last reviewed ${age} days ago (review due after ${policy.reviewDueAfterDays}).`);
    } else {
      state = "current";
      reasons.push(`Reviewed ${Math.max(age, 0)} days ago.`);
    }
  }
  const next = input.nextReviewAt ? Date.parse(input.nextReviewAt) : NaN;
  if (!Number.isNaN(next) && next < asOf.getTime()) {
    triggers.push({ kind: "review-date-passed", severity: "review-due", message: `Scheduled review date ${input.nextReviewAt} has passed.` });
  }
  for (const trigger of triggers) {
    state = worst(state, trigger.severity);
    reasons.push(trigger.message);
  }
  return { state, reasons, triggers, lastReviewedAt: input.lastReviewedAt, nextReviewAt: input.nextReviewAt };
}

export function implementationFreshness(record: ImplementationRecord, asOf: Date) {
  return computeFreshness(
    {
      lastReviewedAt: record.lastEvidenceReviewAt,
      nextReviewAt: record.nextEvidenceReviewAt,
      archived: record.visibility === "archived" || record.stalenessState === "archived",
    },
    asOf,
    freshnessPolicies.implementationEvidence,
  );
}

export function blueprintTriggers(
  items: BlueprintStackItem[],
  products: Product[],
  relationships: TechnologyRelationship[],
  checks: CompatibilityCheck[] = [],
): FreshnessTrigger[] {
  const triggers: FreshnessTrigger[] = [];
  const productIds = new Set(items.flatMap((item) => (item.productId ? [item.productId] : [])));
  for (const id of productIds) {
    const product = products.find((candidate) => candidate.id === id);
    if (product?.lifecycleState === "retired")
      triggers.push({ kind: "product-retired", severity: "stale", message: `${product.name} is recorded as retired.`, entityId: id });
    else if (product?.lifecycleState === "deprecated")
      triggers.push({ kind: "product-deprecated", severity: "review-due", message: `${product.name} is recorded as deprecated.`, entityId: id });
  }
  for (const relationship of relationships) {
    if (!productIds.has(relationship.sourceProductId) || !productIds.has(relationship.targetProductId)) continue;
    if (relationship.relationshipType === "incompatible")
      triggers.push({ kind: "incompatibility-recorded", severity: "stale", message: `${relationship.name} is recorded as incompatible.`, entityId: relationship.id });
    const failed = checks.find((check) => check.relationshipId === relationship.id && check.result === "failed");
    if (failed)
      triggers.push({ kind: "compatibility-check-failed", severity: "stale", message: `Compatibility check failed for ${relationship.name} on ${failed.checkedAt}.`, entityId: relationship.id });
  }
  return triggers;
}

export function blueprintFreshness(
  blueprint: Blueprint,
  version: BlueprintVersion | undefined,
  items: BlueprintStackItem[],
  products: Product[],
  relationships: TechnologyRelationship[],
  checks: CompatibilityCheck[],
  asOf: Date,
) {
  return computeFreshness(
    {
      lastReviewedAt: version?.lastValidatedAt ?? blueprint.lastValidatedAt,
      archived: blueprint.compatibilityState === "archived",
      triggers: blueprintTriggers(items, products, relationships, checks),
    },
    asOf,
    freshnessPolicies.blueprintCompatibility,
  );
}

export function relationshipFreshness(relationship: TechnologyRelationship, asOf: Date) {
  return computeFreshness({ lastReviewedAt: relationship.lastCheckedAt }, asOf, freshnessPolicies.technologyRelationship);
}

export const stalenessLabels: Record<StalenessState, string> = {
  current: "Current",
  "review-due": "Review due",
  stale: "Stale",
  archived: "Archived",
  unknown: "Freshness unknown",
};
