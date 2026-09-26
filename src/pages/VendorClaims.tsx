import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import type { ProviderClaim } from "../data/build-model";
import { PageHeading, WorkspaceNotice } from "../components/layout";
import { EmptyState, ErrorState, Skeleton } from "../components/ui";
import { EmptyMarketplaceState } from "../components/marketplace";
import { useActions, useRecords, useUI } from "../state";
import { isSupabase } from "../data/repository";
import { auditEvent } from "../data/review";
import {
  canApproveClaim,
  checkDnsVerification,
  claimErrors,
  claimedListing,
  newVerificationToken,
  normalizeDomain,
  vendorDomain,
  verificationRecordName,
  verificationValue,
} from "../data/vendor-claims";

/**
 * Technology Vendor profile claims: claimants prove control of the vendor's domain with a
 * DNS TXT record; reviewers check it and approve. Approval marks the listing claimed.
 */
export default function VendorClaims() {
  const reviewer = useLocation().pathname.startsWith("/admin/");
  const { roles, userId } = useUI();
  const claims = useRecords("provider_claims");
  const providers = useRecords("providers");
  if (claims.isLoading || providers.isLoading) return <Skeleton />;
  if (claims.isError || providers.isError) return <ErrorState retry={() => void claims.refetch()} />;
  if (!userId) return <EmptyState title="Sign in to claim a profile" to="/sign-in" action="Sign in" />;
  if (reviewer && isSupabase && !roles.includes("admin"))
    return <EmptyState title="Moderator access required" description="Vendor claims are reviewed by administrators." to="/" action="Back to Oracnet" />;
  return reviewer ? <ReviewClaims claims={claims.data ?? []} /> : <SubmitClaim claims={(claims.data ?? []).filter((claim) => claim.ownerId === userId)} />;
}

function DnsInstructions({ claim }: { claim: ProviderClaim }) {
  if (!claim.domain || !claim.verificationToken) return null;
  return (
    <div className="dns-instructions">
      <p>Add this DNS TXT record at your domain host:</p>
      <dl className="detail-list">
        <div>
          <dt>Name</dt>
          <dd>
            <code>{verificationRecordName(claim.domain)}</code>
          </dd>
        </div>
        <div>
          <dt>Value</dt>
          <dd>
            <code>{verificationValue(claim.verificationToken)}</code>
          </dd>
        </div>
      </dl>
    </div>
  );
}

const dnsLabel = (claim: ProviderClaim) =>
  claim.dnsResult === "verified" ? "DNS record verified" : claim.dnsResult === "not-found" ? "DNS record not found yet" : claim.dnsResult === "error" ? "DNS check failed" : "DNS not checked yet";

function SubmitClaim({ claims }: { claims: ProviderClaim[] }) {
  const [params] = useSearchParams();
  const { userId, notify } = useUI();
  const actions = useActions();
  const { data: providers = [] } = useRecords("providers");
  const [providerId, setProviderId] = useState(params.get("vendor") ?? "");
  const provider = providers.find((item) => item.id === providerId);
  const [domain, setDomain] = useState(provider ? vendorDomain(provider) : "");
  const [email, setEmail] = useState("");
  const [evidence, setEvidence] = useState("");
  const [tried, setTried] = useState(false);
  const errors = claimErrors(provider, domain, email, evidence);
  return (
    <>
      <WorkspaceNotice />
      <PageHeading
        eyebrow="TECHNOLOGY VENDOR"
        title="Claim your company's profile"
        description="Prove you represent the vendor by adding a DNS record to its domain. A claimed profile lets you maintain company details and your own use-case statements. It never lets you edit or remove independent Builds, deployments or evidence."
      />
      <form
        className="card form-card"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          setTried(true);
          if (errors.length) return;
          try {
            await actions.save("provider_claims", {
              id: crypto.randomUUID(),
              name: `Profile claim: ${provider!.name}`,
              providerId,
              ownerId: userId,
              evidence: evidence.trim(),
              domain: normalizeDomain(domain),
              contactEmail: email.trim().toLowerCase(),
              verificationToken: newVerificationToken(),
              dnsResult: null,
              status: "pending",
              provenance: isSupabase ? "vendor supplied" : "demo",
            });
            setEvidence("");
            setTried(false);
            notify("Claim submitted. Add the DNS record below, then a reviewer will check it.");
          } catch {
            /* handled */
          }
        }}
      >
        <label>
          Vendor profile
          <select
            required
            value={providerId}
            onChange={(event) => {
              setProviderId(event.target.value);
              const next = providers.find((item) => item.id === event.target.value);
              setDomain(next ? vendorDomain(next) : "");
            }}
          >
            <option value="">Choose the vendor you represent</option>
            {[...providers]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <div className="grid two">
          <label>
            Company domain
            <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" autoComplete="off" />
          </label>
          <label>
            Work email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={`you@${normalizeDomain(domain) || "example.com"}`} autoComplete="email" />
          </label>
        </div>
        <label>
          Your role
          <textarea required minLength={20} maxLength={3000} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Your role and why you can speak for the company. Do not upload identity documents." />
        </label>
        {tried && errors.length > 0 && (
          <ul className="field-errors" role="alert">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <button className="button dark" type="submit">
          Submit claim
        </button>
      </form>
      <h2 className="subheading">Your claims</h2>
      {claims.length ? (
        <div className="moderation-list">
          {claims.map((claim) => (
            <article key={claim.id} className="card moderation-card">
              <header>
                <span className={`moderation-status ${claim.status}`}>{claim.status}</span>
                <h3>{providers.find((item) => item.id === claim.providerId)?.name ?? claim.providerId}</h3>
                <p className="muted">
                  {claim.domain ?? "No domain"} · {dnsLabel(claim)}
                </p>
              </header>
              {claim.status === "pending" && <DnsInstructions claim={claim} />}
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">No claims yet.</p>
      )}
    </>
  );
}

function ReviewClaims({ claims }: { claims: ProviderClaim[] }) {
  const { userId, notify } = useUI();
  const actions = useActions();
  const { data: providers = [] } = useRecords("providers");
  const [busy, setBusy] = useState("");
  const pending = claims.filter((claim) => claim.status === "pending");
  const resolved = claims.filter((claim) => claim.status !== "pending");
  async function run(claim: ProviderClaim, work: () => Promise<void>) {
    setBusy(claim.id);
    try {
      await work();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update the claim.");
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <WorkspaceNotice />
      <PageHeading
        eyebrow="ADMIN · VENDOR CLAIMS"
        title="Vendor profile claims"
        description="Approve a claim only after its DNS record checks out. The check runs from your browser against a public DNS-over-HTTPS resolver and is recorded on the claim."
      />
      {pending.length ? (
        <div className="moderation-list">
          {pending.map((claim) => {
            const provider = providers.find((item) => item.id === claim.providerId);
            const own = provider ? vendorDomain(provider) : "";
            return (
              <article key={claim.id} className="card moderation-card">
                <header>
                  <span className="moderation-status pending">Pending review</span>
                  <h3>{provider?.name ?? claim.providerId}</h3>
                  <dl className="detail-list">
                    <div>
                      <dt>Domain</dt>
                      <dd>
                        {claim.domain ?? "Not given"} {own && claim.domain && (claim.domain === own || own.endsWith(`.${claim.domain}`) ? "· matches the vendor website" : `· does not match ${own}`)}
                      </dd>
                    </div>
                    <div>
                      <dt>Work email</dt>
                      <dd>{claim.contactEmail ?? "Not given"}</dd>
                    </div>
                    <div>
                      <dt>Role</dt>
                      <dd>{claim.evidence}</dd>
                    </div>
                    <div>
                      <dt>DNS</dt>
                      <dd role="status">
                        {dnsLabel(claim)}
                        {claim.dnsDetail ? ` — ${claim.dnsDetail}` : ""}
                      </dd>
                    </div>
                  </dl>
                </header>
                <DnsInstructions claim={claim} />
                <div className="row wrap moderation-actions">
                  <button
                    type="button"
                    className="button light"
                    disabled={busy === claim.id || !claim.domain || !claim.verificationToken}
                    onClick={() =>
                      run(claim, async () => {
                        const check = await checkDnsVerification(claim.domain!, claim.verificationToken!);
                        await actions.save("provider_claims", {
                          ...claim,
                          dnsResult: check.result,
                          dnsCheckedAt: check.checkedAt,
                          dnsDetail: check.detail,
                          dnsVerifiedAt: check.result === "verified" ? check.checkedAt : null,
                        });
                        notify(check.detail);
                      })
                    }
                  >
                    Check DNS record
                  </button>
                  <button
                    type="button"
                    className="button dark"
                    disabled={busy === claim.id || !canApproveClaim(claim) || !provider}
                    onClick={() =>
                      run(claim, async () => {
                        const at = new Date().toISOString();
                        await actions.save("provider_claims", { ...claim, status: "approved" });
                        // Connected mode: the database marks the listing claimed on approval.
                        if (!isSupabase && provider) {
                          await actions.save("providers", { ...provider, listing: claimedListing(provider, at) });
                          await actions.save("audit_events", auditEvent(userId, "provider_claims", claim.id, "vendor-claim-approved", new Date(at), claim.domain ?? ""));
                        }
                        notify(`${provider?.name} is now marked as claimed.`);
                      })
                    }
                  >
                    Approve claim
                  </button>
                  <button
                    type="button"
                    className="button light"
                    disabled={busy === claim.id}
                    onClick={() =>
                      run(claim, async () => {
                        await actions.save("provider_claims", { ...claim, status: "rejected" });
                        if (!isSupabase) await actions.save("audit_events", auditEvent(userId, "provider_claims", claim.id, "vendor-claim-rejected", new Date()));
                        notify("Claim rejected.");
                      })
                    }
                  >
                    Reject
                  </button>
                </div>
                {!canApproveClaim(claim) && (
                  <p className="muted small-print">
                    <ShieldCheck size={13} aria-hidden /> Approval is available once the DNS record is verified.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyMarketplaceState title="No vendor claims waiting." description="Vendors submit claims from a Technology Vendor profile." />
      )}
      <h2 className="subheading">Resolved</h2>
      {resolved.length ? (
        <ul className="moderation-history">
          {resolved.map((claim) => {
            const provider = providers.find((item) => item.id === claim.providerId);
            return (
              <li key={claim.id}>
                {provider ? <Link to={`/technology-vendors/${provider.slug}`}>{provider.name}</Link> : claim.providerId} <span className={`moderation-status ${claim.status}`}>{claim.status}</span>{" "}
                <span className="muted">{claim.domain}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">None yet.</p>
      )}
    </>
  );
}
