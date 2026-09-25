import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  CircleHelp,
  LockKeyhole,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, EmptyState, Skeleton } from "../components/ui";
import { EvidenceBadge } from "../components/intelligence";
import { isSupabase } from "../data/repository";
import { useActions, useRecords, useUI } from "../state";

export default function Verification() {
  const { token } = useParams();
  const navigate = useNavigate();
  const actions = useActions();
  const { notify, userId } = useUI();
  const { data: attestations = [], isLoading } = useRecords("attestations");
  const { data: implementations = [] } = useRecords("implementation_records");
  const { data: metrics = [] } = useRecords("implementation_metrics");
  const { data: claims = [] } = useRecords("claims");
  const [decisions, setDecisions] = useState<Record<string, "confirm" | "reject" | "skip">>({});
  const [identityVisibility, setIdentityVisibility] = useState<"public" | "anonymous" | "private">("anonymous");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <Skeleton />;

  const attestation = !isSupabase
    ? attestations.find((item) => item.id === token || token === "demo-attestation")
    : undefined;

  if (isSupabase) {
    return (
      <div className="verification-gateway card">
        <ShieldCheck size={32} />
        <PageHeading
          eyebrow="SECURE CUSTOMER ATTESTATION"
          title="Attestation links are validated server-side."
          description="Connected mode intentionally does not expose attestation rows to a browser token lookup. The production Edge Function validates the expiring token hash and returns only the claims included in the invitation."
        />
        <p>
          This client route fails closed until the server-side attestation endpoint is configured for the deployed Supabase project.
        </p>
      </div>
    );
  }

  if (!attestation) {
    return (
      <EmptyState
        title="Attestation link is not valid"
        description="The demo token may have expired or the invitation may have been revoked."
        to="/trust"
        action="Read evidence principles"
      />
    );
  }
  const activeAttestation = attestation;

  const implementation = implementations.find(
    (item) => item.id === activeAttestation.implementationId,
  );
  if (!implementation) {
    return <EmptyState title="Implementation record unavailable" />;
  }
  const activeImplementation = implementation;
  const metricIds = metrics
    .filter((metric) => metric.implementationId === activeImplementation.id)
    .map((metric) => metric.id);
  const reviewableClaims = claims.filter(
    (claim) =>
      claim.subjectId === activeImplementation.id || metricIds.includes(claim.subjectId),
  );
  const decidedCount = reviewableClaims.filter(
    (claim) => decisions[claim.id] && decisions[claim.id] !== "skip",
  ).length;

  async function submit() {
    if (!reviewableClaims.length) return;
    setSubmitting(true);
    try {
      for (const claim of reviewableClaims) {
        const decision = decisions[claim.id] ?? "skip";
        if (decision === "skip") continue;
        await actions.save("verification_events", {
          id: crypto.randomUUID(),
          name: decision === "confirm" ? "Customer attested claim" : "Customer rejected claim",
          subjectType: "claim",
          subjectId: claim.id,
          action: decision === "confirm" ? "customer-confirmed" : "customer-rejected",
          actorId: userId || "demo-customer-attestor",
          at: new Date().toISOString(),
          previousLevel: claim.evidenceLevel,
          nextLevel: decision === "confirm" ? "customer-attested" : claim.evidenceLevel,
          provenance: "demo",
        });
        await actions.save("claims", {
          ...claim,
          status: decision === "confirm" ? "accepted" : "rejected",
          evidenceLevel:
            decision === "confirm" ? "customer-attested" : claim.evidenceLevel,
          reviewedAt: new Date().toISOString(),
        });
      }
      await actions.save("attestations", {
        ...activeAttestation,
        status: "submitted",
        customerIdentityVisibility: identityVisibility,
      });
      notify("Demo attestation submitted. No external email or real customer verification occurred.");
      navigate(`/implementations/${activeImplementation.slug}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="verification-header">
        <Badge>DEMO ATTESTATION</Badge>
        <PageHeading
          eyebrow="CUSTOMER CLAIM REVIEW"
          title="Confirm only what you can actually attest."
          description="Each claim is reviewed separately. Skipping a claim leaves its previous evidence state unchanged. This demo never represents a real customer attestation."
        />
      </div>
      <div className="verification-privacy notice">
        <LockKeyhole size={21} />
        <div>
          <strong>Privacy choice</strong>
          <p>Your public identity can be withheld while Oracnet retains a private verification relationship in production.</p>
        </div>
        <select
          aria-label="Customer identity visibility"
          value={identityVisibility}
          onChange={(event) =>
            setIdentityVisibility(
              event.target.value as "public" | "anonymous" | "private",
            )
          }
        >
          <option value="public">Public identity</option>
          <option value="anonymous">Anonymous publicly</option>
          <option value="private">Private to Oracnet</option>
        </select>
      </div>
      <div className="verification-record card">
        <small>Implementation record</small>
        <strong>{activeImplementation.name}</strong>
        <p>{activeImplementation.contextSummary}</p>
        <EvidenceBadge level={activeImplementation.verificationState} />
      </div>
      <section className="attestation-claims">
        <div className="section-title-text">
          <span className="eyebrow">REVIEWABLE CLAIMS</span>
          <h2>{decidedCount} of {reviewableClaims.length} claims explicitly reviewed</h2>
          <p>Confirm means you attest the statement as presented. Reject means the statement should not be treated as customer-attested.</p>
        </div>
        {reviewableClaims.map((claim) => (
          <article className="card attestation-claim" key={claim.id}>
            <div className="attestation-claim-copy">
              <strong>{claim.name}</strong>
              <p>{claim.value}{claim.unit ? ` ${claim.unit}` : ""}</p>
              <span>{claim.predicate.replaceAll("-", " ")}</span>
              <EvidenceBadge level={claim.evidenceLevel} compact />
            </div>
            <div className="attestation-buttons" role="group" aria-label={`Decision for ${claim.name}`}>
              <button
                type="button"
                className={decisions[claim.id] === "confirm" ? "selected confirm" : "confirm"}
                onClick={() => setDecisions((current) => ({ ...current, [claim.id]: "confirm" }))}
                aria-pressed={decisions[claim.id] === "confirm"}
              >
                <CheckCircle2 size={17} /> Confirm
              </button>
              <button
                type="button"
                className={decisions[claim.id] === "reject" ? "selected reject" : "reject"}
                onClick={() => setDecisions((current) => ({ ...current, [claim.id]: "reject" }))}
                aria-pressed={decisions[claim.id] === "reject"}
              >
                <XCircle size={17} /> Reject
              </button>
              <button
                type="button"
                className={decisions[claim.id] === "skip" ? "selected" : ""}
                onClick={() => setDecisions((current) => ({ ...current, [claim.id]: "skip" }))}
                aria-pressed={decisions[claim.id] === "skip"}
              >
                <CircleHelp size={17} /> Skip
              </button>
            </div>
          </article>
        ))}
      </section>
      <div className="attestation-submit card">
        <div>
          <ShieldCheck size={22} />
          <span>
            <strong>Submission creates claim-level verification events.</strong>
            <small>In production, only the server-side token exchange can make this transition.</small>
          </span>
        </div>
        <button
          type="button"
          className="button dark"
          disabled={submitting || decidedCount === 0}
          onClick={() => void submit().catch(() => {})}
        >
          {submitting ? "Submitting…" : "Submit reviewed claims"}
        </button>
      </div>
    </>
  );
}
