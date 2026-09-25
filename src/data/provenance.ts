import type {
  Attestation,
  Claim,
  ClaimEvidence,
  EvidenceArtifact,
  EvidenceReview,
  ImplementationMetric,
  ImplementationRecord,
  MeasurementPeriod,
  VerificationEvent,
} from "./intelligence-model";

/**
 * Export layer mapping Oracnet's relational evidence graph to W3C PROV concepts
 * (PROV-JSON serialization). The relational tables stay canonical; this is a view.
 *
 * Entity   – implementation record, metric value, claim, evidence artifact (metadata only)
 * Activity – measurement period, evidence review, customer attestation
 * Agent    – claimant, customer attestor, reviewer role, Oracnet platform
 * Relations – wasGeneratedBy, wasAttributedTo, wasDerivedFrom, used, wasAssociatedWith
 *
 * Private evidence storage paths, reviewer identities and private customer
 * identities are never exported.
 */
export interface ProvBundle {
  record: ImplementationRecord;
  metrics: ImplementationMetric[];
  periods: MeasurementPeriod[];
  claims: Claim[];
  links: ClaimEvidence[];
  artifacts: EvidenceArtifact[];
  reviews: EvidenceReview[];
  attestations: Attestation[];
  events: VerificationEvent[];
}

const id = (kind: string, value: string) => `oracnet:${kind}/${value}`;

export function toProvDocument(bundle: ProvBundle) {
  const entity: Record<string, Record<string, unknown>> = {};
  const activity: Record<string, Record<string, unknown>> = {};
  const agent: Record<string, Record<string, unknown>> = {};
  const wasGeneratedBy: Record<string, Record<string, string>> = {};
  const wasAttributedTo: Record<string, Record<string, string>> = {};
  const wasDerivedFrom: Record<string, Record<string, string>> = {};
  const used: Record<string, Record<string, string>> = {};
  const wasAssociatedWith: Record<string, Record<string, string>> = {};
  let n = 0;
  const rel = () => `_:r${(n += 1)}`;

  const { record } = bundle;
  entity[id("implementation", record.id)] = {
    "prov:type": "oracnet:ImplementationRecord",
    "prov:label": record.name,
    "oracnet:demo": record.demo,
    "oracnet:customer": record.customerIdentityVisibility === "public" ? record.customerDisplayName : "withheld",
  };
  agent[id("agent", "platform")] = { "prov:type": "prov:SoftwareAgent", "prov:label": "Oracnet" };

  for (const period of bundle.periods) {
    activity[id("measurement", period.id)] = {
      "prov:type": "oracnet:Measurement",
      "prov:label": period.name,
      ...(period.startDate ? { "prov:startTime": period.startDate } : {}),
      ...(period.endDate ? { "prov:endTime": period.endDate } : {}),
    };
  }
  for (const metric of bundle.metrics) {
    const key = id("metric", metric.id);
    entity[key] = {
      "prov:type": "oracnet:MetricValue",
      "prov:label": metric.name,
      "oracnet:baseline": metric.baselineValue,
      "oracnet:observed": metric.observedValue,
      "oracnet:unit": metric.unit,
      "oracnet:evidenceLevel": metric.evidenceLevel,
      "oracnet:source": metric.sourceLabel,
    };
    wasDerivedFrom[rel()] = { "prov:generatedEntity": key, "prov:usedEntity": id("implementation", record.id) };
    if (metric.measurementPeriodId)
      wasGeneratedBy[rel()] = { "prov:entity": key, "prov:activity": id("measurement", metric.measurementPeriodId) };
  }
  for (const claim of bundle.claims.filter((item) => item.public)) {
    const key = id("claim", claim.id);
    const claimant = id("agent", `${claim.claimantType ?? "claimant"}-${claim.claimant.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
    agent[claimant] = { "prov:type": claim.claimantType === "platform" ? "prov:SoftwareAgent" : "prov:Agent", "prov:label": claim.claimant, "oracnet:role": claim.claimantType ?? "unknown" };
    entity[key] = {
      "prov:type": "oracnet:Claim",
      "prov:label": claim.name,
      "oracnet:predicate": claim.predicate,
      "oracnet:value": claim.value,
      "oracnet:status": claim.status,
      "oracnet:evidenceLevel": claim.evidenceLevel,
    };
    wasAttributedTo[rel()] = { "prov:entity": key, "prov:agent": claimant };
    const subject = claim.subjectType === "metric" ? id("metric", claim.subjectId) : id(claim.subjectType, claim.subjectId);
    wasDerivedFrom[rel()] = { "prov:generatedEntity": key, "prov:usedEntity": subject };
    for (const link of bundle.links.filter((item) => item.claimId === claim.id)) {
      const artifact = bundle.artifacts.find((item) => item.id === link.evidenceArtifactId);
      if (!artifact) continue;
      const artifactKey = id("evidence", artifact.id);
      entity[artifactKey] = {
        "prov:type": "oracnet:EvidenceArtifact",
        "prov:label": artifact.name,
        "oracnet:kind": artifact.kind,
        "oracnet:private": artifact.private,
        "oracnet:metadata": artifact.publicMetadata,
      };
      if (link.relationship === "supports") wasDerivedFrom[rel()] = { "prov:generatedEntity": key, "prov:usedEntity": artifactKey };
    }
    for (const review of bundle.reviews.filter((item) => item.claimId === claim.id)) {
      const reviewKey = id("review", review.id);
      activity[reviewKey] = { "prov:type": "oracnet:EvidenceReview", "prov:endTime": review.reviewedAt, "oracnet:result": review.result };
      agent[id("agent", "reviewer")] = { "prov:type": "prov:Agent", "prov:label": "Oracnet reviewer (role)" };
      used[rel()] = { "prov:activity": reviewKey, "prov:entity": key };
      wasAssociatedWith[rel()] = { "prov:activity": reviewKey, "prov:agent": id("agent", "reviewer") };
    }
  }
  for (const attestation of bundle.attestations.filter((item) => item.status === "submitted")) {
    const key = id("attestation", attestation.id);
    const attestor = id("agent", `customer-${attestation.id}`);
    activity[key] = { "prov:type": "oracnet:CustomerAttestation", ...(attestation.submittedAt ? { "prov:endTime": attestation.submittedAt } : {}) };
    agent[attestor] = {
      "prov:type": "prov:Agent",
      "prov:label": attestation.customerIdentityVisibility === "public" ? attestation.attestorLabel : "Customer (identity withheld)",
      "oracnet:role": "customer",
    };
    wasAssociatedWith[rel()] = { "prov:activity": key, "prov:agent": attestor };
    for (const claimId of Object.keys(attestation.decisions ?? {})) {
      used[rel()] = { "prov:activity": key, "prov:entity": id("claim", claimId) };
      if (attestation.decisions?.[claimId] === "confirm") wasAttributedTo[rel()] = { "prov:entity": id("claim", claimId), "prov:agent": attestor };
    }
  }
  return {
    prefix: { oracnet: "https://bt3113.github.io/OCNET/prov#", prov: "http://www.w3.org/ns/prov#" },
    entity,
    activity,
    agent,
    wasGeneratedBy,
    wasAttributedTo,
    wasDerivedFrom,
    used,
    wasAssociatedWith,
  };
}

export interface TimelineEvent {
  at: string;
  label: string;
  detail: string;
  kind: "measurement" | "claim" | "review" | "attestation" | "verification";
}

/** Chronological evidence history for UI timelines. */
export function provenanceTimeline(bundle: ProvBundle): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...bundle.periods.flatMap((period) =>
      period.endDate ? [{ at: period.endDate, label: period.name, detail: period.notes, kind: "measurement" as const }] : [],
    ),
    ...bundle.reviews.map((review) => ({ at: review.reviewedAt, label: `Evidence review: ${review.result.replaceAll("-", " ")}`, detail: review.notes, kind: "review" as const })),
    ...bundle.attestations.flatMap((attestation) =>
      attestation.submittedAt
        ? [{ at: attestation.submittedAt, label: "Customer attestation submitted", detail: `${Object.keys(attestation.decisions ?? {}).length} claim decisions`, kind: "attestation" as const }]
        : [],
    ),
    ...bundle.events.map((event) => ({
      at: event.at,
      label: event.name,
      detail: event.previousLevel && event.nextLevel ? `${event.previousLevel} → ${event.nextLevel}` : event.action,
      kind: "verification" as const,
    })),
  ];
  return events.sort((a, b) => a.at.localeCompare(b.at) || a.label.localeCompare(b.label));
}
