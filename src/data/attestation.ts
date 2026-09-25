import { sha256Hex } from "./canonical.ts";
import type {
  Attestation,
  Claim,
  CustomerIdentityVisibility,
  VerificationEvent,
} from "./intelligence-model";

/**
 * Customer attestation. Invitation tokens are 256-bit random values delivered
 * once; only their SHA-256 hash is stored. Tokens are single-purpose (claim
 * attestation), scoped to listed claims, expiring, revocable and single-use.
 * In connected mode the same checks run in the `attestation` Edge Function.
 */
export const ATTESTATION_TTL_DAYS = 14;

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export function hashToken(token: string) {
  return sha256Hex(`oracnet-attestation:v1:${token}`);
}

export function createInvitation(input: {
  implementationId: string;
  ownerId: string;
  claimIds: string[];
  attestorLabel: string;
  visibility: CustomerIdentityVisibility;
  now: Date;
  demo: boolean;
}) {
  if (!input.claimIds.length) throw new Error("Select at least one claim for the customer to review.");
  const token = generateToken();
  const attestation: Attestation = {
    id: `attestation-${hashToken(token).slice(0, 16)}`,
    name: `Attestation request: ${input.attestorLabel}`,
    provenance: input.demo ? "demo" : "creator supplied",
    implementationId: input.implementationId,
    ownerId: input.ownerId,
    tokenHash: hashToken(token),
    expiresAt: new Date(input.now.getTime() + ATTESTATION_TTL_DAYS * 86400000).toISOString(),
    status: "pending",
    customerIdentityVisibility: input.visibility,
    attestorLabel: input.attestorLabel,
    claimIds: [...new Set(input.claimIds)],
    purpose: "claim-attestation",
    createdAt: input.now.toISOString(),
  };
  return { attestation, token };
}

export type TokenCheck =
  | { ok: true; attestation: Attestation }
  | { ok: false; reason: "invalid" | "expired" | "revoked" | "used" | "wrong-purpose" };

export function validateToken(token: string | undefined, attestations: Attestation[], now: Date): TokenCheck {
  if (!token || token.length < 32) return { ok: false, reason: "invalid" };
  const hash = hashToken(token);
  const attestation = attestations.find((item) => item.tokenHash === hash);
  if (!attestation) return { ok: false, reason: "invalid" };
  if ((attestation.purpose ?? "claim-attestation") !== "claim-attestation") return { ok: false, reason: "wrong-purpose" };
  if (attestation.status === "revoked" || attestation.revokedAt) return { ok: false, reason: "revoked" };
  if (attestation.status === "submitted") return { ok: false, reason: "used" };
  if (attestation.status === "expired" || Date.parse(attestation.expiresAt) <= now.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, attestation };
}

export const tokenFailureCopy: Record<Exclude<TokenCheck, { ok: true }>["reason"], string> = {
  invalid: "This attestation link is not valid.",
  expired: "This attestation link has expired. Ask the contributor for a new invitation.",
  revoked: "This attestation invitation was revoked.",
  used: "This attestation has already been submitted. Links are single-use.",
  "wrong-purpose": "This link cannot be used for claim attestation.",
};

/**
 * Apply decisions. Only claims inside the invitation scope can change; confirmed
 * claims become customer-attested, rejected claims are recorded as rejected by the
 * customer and never keep a higher evidence level than creator-reported.
 */
export function applyDecisions(
  attestation: Attestation,
  claims: Claim[],
  decisions: Record<string, "confirm" | "reject" | "skip">,
  visibility: CustomerIdentityVisibility,
  now: Date,
  actorId: string,
) {
  const scope = new Set(attestation.claimIds ?? []);
  const outOfScope = Object.keys(decisions).filter((id) => !scope.has(id));
  if (outOfScope.length) throw new Error("Decision submitted for a claim outside this invitation.");
  const recorded: Record<string, "confirm" | "reject"> = {};
  const updatedClaims: Claim[] = [];
  const events: VerificationEvent[] = [];
  for (const claim of claims.filter((item) => scope.has(item.id))) {
    const decision = decisions[claim.id];
    if (!decision || decision === "skip") continue;
    recorded[claim.id] = decision;
    const nextLevel = decision === "confirm" ? "customer-attested" : claim.evidenceLevel === "demo" ? "demo" : "creator-reported";
    updatedClaims.push({
      ...claim,
      status: decision === "confirm" ? "accepted" : "rejected",
      evidenceLevel: nextLevel,
      reviewedAt: now.toISOString(),
    });
    events.push({
      id: `${attestation.id}-${claim.id}`,
      name: decision === "confirm" ? "Customer confirmed claim" : "Customer rejected claim",
      provenance: attestation.provenance,
      subjectType: "claim",
      subjectId: claim.id,
      action: decision === "confirm" ? "customer-confirmed" : "customer-rejected",
      actorId,
      at: now.toISOString(),
      previousLevel: claim.evidenceLevel,
      nextLevel,
    });
  }
  if (!events.length) throw new Error("Confirm or reject at least one claim before submitting.");
  return {
    attestation: { ...attestation, status: "submitted" as const, submittedAt: now.toISOString(), customerIdentityVisibility: visibility, decisions: recorded },
    claims: updatedClaims,
    events,
  };
}

/**
 * Map a submitted attestation to the W3C Verifiable Credentials 2.0 data model.
 * V1 output is UNSIGNED (no `proof`): it prepares a future Data Integrity proof and
 * must not be presented as a cryptographically verifiable credential.
 */
export function toVerifiableCredential(attestation: Attestation, claims: Claim[], issuer: string) {
  const attested = claims.filter((claim) => attestation.decisions?.[claim.id]);
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id: `urn:oracnet:attestation:${attestation.id}`,
    type: ["VerifiableCredential", "OracnetClaimAttestation"],
    issuer,
    validFrom: attestation.submittedAt ?? attestation.createdAt,
    ...(attestation.expiresAt ? { validUntil: attestation.expiresAt } : {}),
    credentialSubject: {
      id: `urn:oracnet:implementation:${attestation.implementationId}`,
      attestor: attestation.customerIdentityVisibility === "public" ? attestation.attestorLabel : "Customer (identity withheld)",
      claims: attested.map((claim) => ({
        id: `urn:oracnet:claim:${claim.id}`,
        predicate: claim.predicate,
        value: claim.value,
        unit: claim.unit,
        decision: attestation.decisions?.[claim.id],
      })),
    },
    credentialStatus: { type: "OracnetAttestationStatus", status: attestation.status },
    proof: null,
    proofNote: "Unsigned V1 representation. No cryptographic proof is attached.",
  };
}
