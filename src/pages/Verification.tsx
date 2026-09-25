import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, CircleHelp, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, EmptyState, Skeleton } from "../components/ui";
import { EvidenceBadge, IllustrativeNotice, claimValue } from "../components/intelligence";
import { isSupabase } from "../data/repository";
import { useActions, useRecords, useUI } from "../state";
import { applyDecisions, tokenFailureCopy, validateToken } from "../data/attestation";
import type { Claim, CustomerIdentityVisibility } from "../data/intelligence-model";

type Decision = "confirm" | "reject" | "skip";

interface Invitation {
  implementationName: string;
  contextSummary: string;
  attestorLabel: string;
  expiresAt: string;
  claims: Pick<Claim, "id" | "name" | "value" | "unit" | "period" | "predicate" | "evidenceLevel" | "provenance">[];
}

/** Connected mode: the token travels only in the POST body to the Edge Function. */
async function callAttestationFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { supabase } = await import("../data/supabase");
  const { data, error } = await supabase.functions.invoke("attestation", { body });
  if (error) throw new Error("The attestation service could not be reached or rejected this link.");
  return data as T;
}

export default function Verification() {
  const { token } = useParams();
  return isSupabase ? <ConnectedVerification token={token ?? ""} /> : <DemoVerification token={token ?? ""} />;
}

function ClaimDecisions({
  claims,
  decisions,
  setDecisions,
}: {
  claims: Invitation["claims"];
  decisions: Record<string, Decision>;
  setDecisions: (update: (current: Record<string, Decision>) => Record<string, Decision>) => void;
}) {
  return (
    <section className="attestation-claims" aria-labelledby="claims-heading">
      <div className="section-title-text">
        <span className="eyebrow">CLAIMS INCLUDED IN THIS INVITATION</span>
        <h2 id="claims-heading">{claims.filter((claim) => decisions[claim.id] && decisions[claim.id] !== "skip").length} of {claims.length} reviewed</h2>
        <p>Confirm only what you know to be true. Reject anything inaccurate. Skipped claims keep their current evidence state.</p>
      </div>
      {claims.map((claim) => (
        <article className="card attestation-claim" key={claim.id}>
          <div className="attestation-claim-copy">
            <strong>{claim.name}</strong>
            <p>{claimValue(claim)}</p>
            {claim.period && <span>Period: {claim.period}</span>}
            <EvidenceBadge level={claim.evidenceLevel} compact demo={claim.provenance === "demo"} />
          </div>
          <div className="attestation-buttons" role="radiogroup" aria-label={`Your decision for ${claim.name}`}>
            {(["confirm", "reject", "skip"] as const).map((decision) => (
              <button
                key={decision}
                type="button"
                role="radio"
                aria-checked={decisions[claim.id] === decision}
                className={`${decision} ${decisions[claim.id] === decision ? "selected" : ""}`}
                onClick={() => setDecisions((current) => ({ ...current, [claim.id]: decision }))}
              >
                {decision === "confirm" ? <CheckCircle2 size={17} aria-hidden /> : decision === "reject" ? <XCircle size={17} aria-hidden /> : <CircleHelp size={17} aria-hidden />}
                {decision === "confirm" ? "Confirm" : decision === "reject" ? "Reject" : "Skip"}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function VisibilityChoice({ value, onChange }: { value: CustomerIdentityVisibility; onChange: (value: CustomerIdentityVisibility) => void }) {
  return (
    <fieldset className="verification-privacy card">
      <legend><LockKeyhole size={18} aria-hidden /> How should your identity appear?</legend>
      {([
        ["public", "Public", "Your organization name may appear on the record."],
        ["anonymous", "Anonymous publicly", "The record says a customer attested; your name is withheld."],
        ["private", "Private to Oracnet", "Only Oracnet reviewers can see who attested."],
      ] as const).map(([option, label, help]) => (
        <label key={option} className="radio-card">
          <input type="radio" name="visibility" value={option} checked={value === option} onChange={() => onChange(option)} />
          <span><strong>{label}</strong><small>{help}</small></span>
        </label>
      ))}
    </fieldset>
  );
}

function DemoVerification({ token }: { token: string }) {
  const actions = useActions();
  const { notify } = useUI();
  const { data: attestations = [], isLoading } = useRecords("attestations");
  const { data: implementations = [] } = useRecords("implementation_records");
  const { data: claims = [] } = useRecords("claims");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [visibility, setVisibility] = useState<CustomerIdentityVisibility>("anonymous");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (isLoading) return <Skeleton />;
  if (done) {
    return (
      <div className="card verification-done" role="status">
        <ShieldCheck size={30} aria-hidden />
        <h1>Thank you — demo attestation recorded.</h1>
        <p>Each decision was stored as a claim-level verification event. This link is now used and cannot be submitted again. No email was sent and no real customer verification occurred.</p>
        <Link className="button dark" to={`/implementations/${done}`}>View the record</Link>
      </div>
    );
  }
  const check = validateToken(token, attestations, new Date());
  if (!check.ok) return <EmptyState title={tokenFailureCopy[check.reason]} description="Attestation links are single-use, scoped and expire. Nothing on this page reveals whether a record exists." to="/trust" action="How verification works" />;
  const attestation = check.attestation;
  const record = implementations.find((item) => item.id === attestation.implementationId);
  const scoped = claims.filter((claim) => attestation.claimIds?.includes(claim.id));
  if (!record) return <EmptyState title="This attestation link is not valid." to="/trust" action="How verification works" />;

  async function submit() {
    setSubmitting(true);
    try {
      const result = applyDecisions(attestation, scoped, decisions, visibility, new Date(), "demo-customer-attestor");
      for (const claim of result.claims) await actions.save("claims", claim);
      for (const event of result.events) await actions.save("verification_events", event);
      await actions.save("attestations", result.attestation);
      setDone(record!.slug);
      notify("Demo attestation submitted. No email was sent; this is not a real customer verification.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not submit.");
    } finally {
      setSubmitting(false);
    }
  }
  const decided = scoped.some((claim) => decisions[claim.id] && decisions[claim.id] !== "skip");
  return (
    <>
      <div className="verification-header">
        <Badge>DEMO ATTESTATION</Badge>
        <PageHeading eyebrow="CUSTOMER CLAIM REVIEW" title="Confirm only what you can attest." description={`You were invited as “${attestation.attestorLabel}” to review specific claims about an implementation. You see only the claims in this invitation.`} />
      </div>
      <IllustrativeNotice>This is a walkthrough using fictional data. No email was delivered and your answers stay in this browser.</IllustrativeNotice>
      <div className="verification-record card">
        <small>Implementation record</small>
        <strong>{record.name}</strong>
        <p>{record.contextSummary}</p>
        <small>Invitation expires {attestation.expiresAt.slice(0, 10)}</small>
      </div>
      <VisibilityChoice value={visibility} onChange={setVisibility} />
      <ClaimDecisions claims={scoped} decisions={decisions} setDecisions={setDecisions} />
      <div className="attestation-submit card">
        <div>
          <ShieldCheck size={22} aria-hidden />
          <span><strong>Submitting records one verification event per decided claim.</strong><small>The link becomes unusable after submission.</small></span>
        </div>
        <button type="button" className="button dark" disabled={submitting || !decided} onClick={() => void submit()}>
          {submitting ? "Submitting…" : "Submit my review"}
        </button>
      </div>
    </>
  );
}

function ConnectedVerification({ token }: { token: string }) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error" | "done"; invitation?: Invitation; message?: string }>({ status: "loading" });
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [visibility, setVisibility] = useState<CustomerIdentityVisibility>("anonymous");
  useEffect(() => {
    let active = true;
    callAttestationFunction<Invitation>({ action: "load", token })
      .then((invitation) => active && setState({ status: "ready", invitation }))
      .catch((error: Error) => active && setState({ status: "error", message: error.message }));
    return () => {
      active = false;
    };
  }, [token]);
  if (state.status === "loading") return <Skeleton />;
  if (state.status === "error" || !state.invitation)
    return <EmptyState title="This attestation link cannot be used." description={state.message ?? "It may be invalid, expired, revoked or already used."} to="/trust" action="How verification works" />;
  if (state.status === "done")
    return <div className="card verification-done" role="status"><ShieldCheck size={30} aria-hidden /><h1>Thank you — your review was recorded.</h1><p>Oracnet reviewers can see your decisions. This link is now used.</p></div>;
  const invitation = state.invitation;
  const submit = () =>
    callAttestationFunction({ action: "submit", token, decisions, visibility })
      .then(() => setState({ ...state, status: "done" }))
      .catch((error: Error) => setState({ status: "error", message: error.message }));
  return (
    <>
      <PageHeading eyebrow="CUSTOMER CLAIM REVIEW" title="Confirm only what you can attest." description={`You were invited as “${invitation.attestorLabel}”. Only the claims in this invitation are shown.`} />
      <div className="verification-record card"><small>Implementation record</small><strong>{invitation.implementationName}</strong><p>{invitation.contextSummary}</p><small>Expires {invitation.expiresAt.slice(0, 10)}</small></div>
      <VisibilityChoice value={visibility} onChange={setVisibility} />
      <ClaimDecisions claims={invitation.claims} decisions={decisions} setDecisions={setDecisions} />
      <div className="attestation-submit card">
        <div><ShieldCheck size={22} aria-hidden /><span><strong>Your decisions are validated and stored server-side.</strong><small>The link becomes unusable after submission.</small></span></div>
        <button type="button" className="button dark" disabled={!Object.values(decisions).some((value) => value !== "skip")} onClick={() => void submit()}>Submit my review</button>
      </div>
    </>
  );
}
