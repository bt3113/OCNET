import type {
  Claim,
  ClaimEvidence,
  EvidenceArtifact,
  EvidenceLevel,
  EvidenceReview,
  StalenessState,
} from "./intelligence-model";
import { computeFreshness, freshnessPolicies } from "./staleness";

/**
 * Claim-level evidence signals. These are descriptive dimensions, deliberately not
 * combined into a universal quality score. Evidence levels are methods, not a
 * truth ranking.
 */
export const evidenceLevelInfo: Record<EvidenceLevel, { label: string; description: string }> = {
  "creator-reported": { label: "Creator reported", description: "Stated by the person or company who published the record. Not independently checked." },
  "customer-attested": { label: "Customer attested", description: "Confirmed by the customer through a scoped attestation invitation." },
  "evidence-reviewed": { label: "Evidence reviewed", description: "An Oracnet reviewer examined supporting evidence and recorded a decision." },
  "platform-observed": { label: "Platform observed", description: "Observed through a connected integration or platform data, not self-reported." },
  "independently-audited": { label: "Independently audited", description: "Checked by an independent third party under stated scope." },
  demo: { label: "Demo / illustrative", description: "Synthetic data created to demonstrate the model. Not a real customer or outcome." },
  unverified: { label: "Unverified", description: "No evidence has been provided or reviewed." },
};

export interface EvidenceSignals {
  independence: "independent" | "first-party" | "synthetic" | "unknown";
  directness: "direct" | "indirect" | "none";
  freshness: StalenessState;
  reviewStatus: "sufficient" | "insufficient" | "needs-more-evidence" | "not-reviewed";
  specificity: "specific" | "partial" | "vague";
  supporting: number;
  contradicting: number;
  limitations: string[];
}

const directKinds = new Set<EvidenceArtifact["kind"]>(["analytics-export", "system-log", "invoice", "independent-audit", "customer-attestation"]);

export function evidenceSignals(
  claim: Claim,
  links: ClaimEvidence[],
  artifacts: EvidenceArtifact[],
  reviews: EvidenceReview[],
  asOf: Date,
): EvidenceSignals {
  const claimLinks = links.filter((link) => link.claimId === claim.id);
  const linked = claimLinks.flatMap((link) => artifacts.filter((artifact) => artifact.id === link.evidenceArtifactId));
  const latestReview = reviews
    .filter((review) => review.claimId === claim.id)
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
  const independence: EvidenceSignals["independence"] =
    claim.evidenceLevel === "demo"
      ? "synthetic"
      : ["customer", "reviewer", "auditor", "platform"].includes(claim.claimantType ?? "") ||
          ["customer-attested", "independently-audited", "platform-observed", "evidence-reviewed"].includes(claim.evidenceLevel)
        ? "independent"
        : claim.claimantType
          ? "first-party"
          : "unknown";
  const directness: EvidenceSignals["directness"] = !linked.length
    ? "none"
    : linked.some((artifact) => directKinds.has(artifact.kind))
      ? "direct"
      : "indirect";
  const specificityParts = [claim.unit, claim.period ?? claim.measurementPeriodId, claim.evidenceMethod].filter(Boolean).length;
  const limitations = [
    ...(claim.limitations ? [claim.limitations] : []),
    ...(claim.evidenceLevel === "demo" ? ["Synthetic demonstration value."] : []),
    ...(!linked.length ? ["No evidence artifact linked."] : []),
    ...(claim.status === "pending" ? ["Awaiting review."] : []),
  ];
  return {
    independence,
    directness,
    freshness: computeFreshness({ lastReviewedAt: claim.reviewedAt }, asOf, freshnessPolicies.implementationEvidence).state,
    reviewStatus: latestReview?.result ?? "not-reviewed",
    specificity: specificityParts >= 3 ? "specific" : specificityParts >= 1 ? "partial" : "vague",
    supporting: claimLinks.filter((link) => link.relationship === "supports").length,
    contradicting: claimLinks.filter((link) => link.relationship === "contradicts").length,
    limitations,
  };
}

/** Counts by evidence method across a record's claims. */
export function evidenceCoverage(claims: Claim[]) {
  const byLevel = new Map<EvidenceLevel, number>();
  for (const claim of claims) byLevel.set(claim.evidenceLevel, (byLevel.get(claim.evidenceLevel) ?? 0) + 1);
  const beyondSelfReport = claims.filter((claim) => !["creator-reported", "unverified", "demo"].includes(claim.evidenceLevel)).length;
  return {
    total: claims.length,
    byLevel: [...byLevel.entries()].sort(([a], [b]) => a.localeCompare(b)),
    beyondSelfReport,
    summary: claims.length
      ? `${beyondSelfReport} of ${claims.length} claims have evidence beyond self-report.`
      : "No material claims recorded.",
  };
}

/** Transition applied when a claim's material content changes: it returns to review. */
export function claimAfterMaterialEdit(claim: Claim, next: Partial<Claim>): Claim {
  const material = (["value", "unit", "period", "predicate", "subjectId", "subjectType"] as const).some(
    (key) => key in next && next[key] !== claim[key],
  );
  return material
    ? { ...claim, ...next, status: "pending", evidenceLevel: "creator-reported", reviewedAt: undefined }
    : { ...claim, ...next };
}
