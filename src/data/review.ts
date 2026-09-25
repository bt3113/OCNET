import type { AuditEvent } from "./build-model";
import type {
  Blueprint,
  Claim,
  EvidenceReview,
  ImplementationRecord,
  TechnologyRelationship,
  TechnologyRelationshipType,
  VerificationEvent,
  CompatibilityCheck,
} from "./intelligence-model";
import { blueprintPublicationGate } from "./rights";

/**
 * Reviewer and moderation transitions. Each returns the changed rows plus an
 * append-only audit event. In connected mode the same rules are enforced by
 * database triggers and RLS; these functions keep the demo honest and testable.
 */
export function auditEvent(actorId: string, entityType: string, entityId: string, action: string, now: Date, detail = ""): AuditEvent {
  return {
    id: `audit-${entityId}-${action}-${now.getTime()}`,
    name: detail ? `${action}: ${detail}` : action,
    actorId,
    entityId,
    entityType,
    action,
    at: now.toISOString(),
    provenance: "community supplied",
  };
}

export type ClaimReviewResult = EvidenceReview["result"];

export function reviewClaim(claim: Claim, result: ClaimReviewResult, reviewerId: string, notes: string, now: Date) {
  const nextLevel = result === "sufficient" ? "evidence-reviewed" : claim.evidenceLevel === "demo" ? "demo" : claim.evidenceLevel === "evidence-reviewed" ? "creator-reported" : claim.evidenceLevel;
  const updated: Claim = {
    ...claim,
    evidenceLevel: nextLevel,
    status: result === "sufficient" ? "accepted" : result === "insufficient" ? "rejected" : "pending",
    reviewedAt: now.toISOString(),
  };
  const review: EvidenceReview = {
    id: `review-${claim.id}-${now.getTime()}`,
    name: `Evidence review: ${result}`,
    provenance: claim.provenance === "demo" ? "demo" : "verified",
    claimId: claim.id,
    reviewerId,
    result,
    notes,
    reviewedAt: now.toISOString(),
  };
  const event: VerificationEvent = {
    id: `verification-${claim.id}-${now.getTime()}`,
    name: `Reviewer marked evidence ${result.replaceAll("-", " ")}`,
    provenance: review.provenance,
    subjectType: "claim",
    subjectId: claim.id,
    action: `review-${result}`,
    actorId: reviewerId,
    at: now.toISOString(),
    previousLevel: claim.evidenceLevel,
    nextLevel,
  };
  return { claim: updated, review, event, audit: auditEvent(reviewerId, "claim", claim.id, `claim-review-${result}`, now, notes) };
}

export function revokeClaim(claim: Claim, reviewerId: string, reason: string, now: Date) {
  if (!reason.trim()) throw new Error("A revocation needs a recorded reason.");
  const nextLevel = claim.evidenceLevel === "demo" ? "demo" : "unverified";
  const updated: Claim = { ...claim, status: "revoked", evidenceLevel: nextLevel, reviewedAt: now.toISOString() };
  const event: VerificationEvent = {
    id: `verification-${claim.id}-revoked-${now.getTime()}`,
    name: "Verification revoked",
    provenance: claim.provenance,
    subjectType: "claim",
    subjectId: claim.id,
    action: "verification-revoked",
    actorId: reviewerId,
    at: now.toISOString(),
    previousLevel: claim.evidenceLevel,
    nextLevel,
  };
  return { claim: updated, event, audit: auditEvent(reviewerId, "claim", claim.id, "verification-revoked", now, reason) };
}

export function moderateImplementation(record: ImplementationRecord, decision: "approve" | "reject" | "flag" | "archive", reviewerId: string, now: Date) {
  const updated: ImplementationRecord = {
    ...record,
    moderationState: decision === "approve" ? "approved" : decision === "reject" ? "rejected" : decision === "flag" ? "flagged" : record.moderationState,
    visibility: decision === "archive" ? "archived" : record.visibility,
    stalenessState: decision === "archive" ? "archived" : record.stalenessState,
    updatedAt: now.toISOString(),
  };
  if (decision === "approve" && record.customerIdentityVisibility === "public" && record.customerPermissionState !== "granted")
    throw new Error("Public customer identity requires recorded customer permission before approval.");
  return { record: updated, audit: auditEvent(reviewerId, "implementation", record.id, `implementation-${decision}`, now) };
}

export function moderateBlueprint(blueprint: Blueprint, decision: "approve" | "reject", reviewerId: string, now: Date) {
  if (decision === "approve") {
    const gate = blueprintPublicationGate({ ...blueprint, moderationState: "approved" });
    if (!gate.ready) throw new Error(gate.missing.join(" "));
  }
  const updated: Blueprint = {
    ...blueprint,
    moderationState: decision === "approve" ? "approved" : "rejected",
    publicationState: decision === "approve" ? "published" : blueprint.publicationState,
    updatedAt: now.toISOString(),
  };
  return { blueprint: updated, audit: auditEvent(reviewerId, "blueprint", blueprint.id, `blueprint-${decision}`, now) };
}

export function reviewRelationship(
  relationship: TechnologyRelationship,
  type: TechnologyRelationshipType,
  result: CompatibilityCheck["result"],
  reviewerId: string,
  note: string,
  now: Date,
) {
  if (type !== "observed-together" && type !== "unknown" && !note.trim())
    throw new Error("Record the evidence behind a compatibility decision.");
  const updated: TechnologyRelationship = {
    ...relationship,
    relationshipType: type,
    sourceType: "reviewer-test",
    sourceLabel: note || relationship.sourceLabel,
    lastCheckedAt: now.toISOString().slice(0, 10),
    evidenceLevel: relationship.evidenceLevel === "demo" ? "demo" : "evidence-reviewed",
  };
  const check: CompatibilityCheck = {
    id: `${relationship.id}-check-${now.getTime()}`,
    name: "Reviewer compatibility check",
    provenance: relationship.provenance,
    relationshipId: relationship.id,
    checkedAt: now.toISOString().slice(0, 10),
    result,
    conditions: note ? [note] : [],
    evidenceLevel: updated.evidenceLevel,
  };
  return { relationship: updated, check, audit: auditEvent(reviewerId, "technology-relationship", relationship.id, `compatibility-${type}-${result}`, now, note) };
}
