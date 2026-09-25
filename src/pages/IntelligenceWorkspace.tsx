import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Archive, CalendarClock, CheckCircle2, FileSearch, Flag, GitBranch, LockKeyhole, RotateCcw, ShieldCheck, ShieldX, XCircle } from "lucide-react";
import { PageHeading, WorkspaceNotice } from "../components/layout";
import { Badge, EmptyState, ErrorState, Modal, Skeleton } from "../components/ui";
import { BlueprintCard, EvidenceBadge, RelationshipTypeBadge, RightsBadge, StalenessBadge } from "../components/intelligence";
import { AttestationInviteDialog } from "../components/attestation";
import { isPublicRecord, implementationBundle, useIntelligence } from "../data/intelligence-hooks";
import { useActions, useRecords, useUI } from "../state";
import { isSupabase } from "../data/repository";
import { implementationFreshness, blueprintFreshness, relationshipFreshness } from "../data/staleness";
import { evidenceCoverage } from "../data/evidence";
import { moderateBlueprint, moderateImplementation, reviewClaim, revokeClaim, reviewRelationship, auditEvent } from "../data/review";
import { verifyReproducibility, type DecisionTrace } from "../data/solution-compiler";
import { scanFields, sanitizationChecklist } from "../data/sanitization";
import { blueprintPublicationGate } from "../data/rights";
import type { Claim, ImplementationRecord, TechnologyRelationshipType } from "../data/intelligence-model";

function Frame({ eyebrow, title, description, action, children }: { eyebrow: string; title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <>
      <WorkspaceNotice />
      <PageHeading eyebrow={eyebrow} title={title} description={description} action={action} />
      {children}
    </>
  );
}

export default function IntelligenceWorkspace() {
  const path = useLocation().pathname;
  const { userId, roles } = useUI();
  const data = useIntelligence();
  if (data.isLoading) return <Skeleton />;
  if (data.isError) return <ErrorState retry={data.refetch} />;
  if (path.startsWith("/admin/") && !roles.includes("admin"))
    return <EmptyState title="Reviewer access required" description={isSupabase ? "Verification operations need a trusted reviewer role, enforced by the database." : "Switch to the demo moderator persona in Settings to try review operations."} to="/app/settings" action="Open settings" />;
  if (path.startsWith("/provider/") && !roles.includes("provider") && !roles.includes("admin"))
    return <EmptyState title="Provider access required" description="Switch to a provider persona (demo) or sign in with a provider account." to="/app/settings" action="Open settings" />;
  switch (path) {
    case "/creator/implementations":
      return <CreatorImplementations data={data} userId={userId} />;
    case "/creator/blueprints":
      return <CreatorBlueprints data={data} userId={userId} />;
    case "/creator/requests":
      return <CreatorRequests />;
    case "/app/requirements":
      return <BuyerRequirements userId={userId} />;
    case "/app/solution-runs":
      return <BuyerRuns data={data} userId={userId} />;
    case "/provider/implementations":
      return <ProviderImplementations data={data} />;
    case "/provider/compatibility":
      return <ProviderCompatibility data={data} />;
    default:
      return <AdminQueue path={path} data={data} />;
  }
}

type Data = ReturnType<typeof useIntelligence>;
const mine = (ownerId: string, userId: string) => ownerId === userId || (!isSupabase && ownerId === "demo-user");

function CreatorImplementations({ data, userId }: { data: Data; userId: string }) {
  const [invite, setInvite] = useState<ImplementationRecord | null>(null);
  const actions = useActions();
  const { notify } = useUI();
  const records = data.implementations.filter((record) => mine(record.ownerId, userId));
  const now = new Date();
  return (
    <Frame
      eyebrow="IMPLEMENTER WORKSPACE"
      title="Implementation records"
      description="Records describe deployments. Invite customers to attest individual claims; derive Blueprints separately."
      action={<Link className="button dark" to="/implementation/new">Add implementation <ArrowRight size={16} aria-hidden /></Link>}
    >
      <div className="workspace-table card" role="table" aria-label="Your implementation records">
        <div role="row" className="workspace-table-head">
          <span role="columnheader">Record</span><span role="columnheader">State</span><span role="columnheader">Evidence</span><span role="columnheader">Actions</span>
        </div>
        {records.map((record) => {
          const bundle = implementationBundle(data, record);
          const pending = bundle.attestations.filter((attestation) => attestation.status === "pending");
          return (
            <div role="row" key={record.id} className="workspace-table-row">
              <span role="cell"><Link to={`/implementations/${record.slug}`}><strong>{record.name}</strong></Link><small>{record.businessType}</small></span>
              <span role="cell" className="row wrap"><Badge>{record.publicationState} · {record.moderationState}</Badge><StalenessBadge state={implementationFreshness(record, now).state} /></span>
              <span role="cell"><small>{evidenceCoverage(bundle.claims).summary}</small>{!!pending.length && <small>{pending.length} attestation invitation{pending.length === 1 ? "" : "s"} pending</small>}</span>
              <span role="cell" className="row wrap">
                <button type="button" className="button light" onClick={() => setInvite(record)}>Invite customer to attest</button>
                {pending.map((attestation) => (
                  <button key={attestation.id} type="button" className="button light" onClick={() => void actions.save("attestations", { ...attestation, status: "revoked", revokedAt: now.toISOString() }).then(() => notify("Invitation revoked.")).catch(() => undefined)}>
                    Revoke {attestation.attestorLabel}
                  </button>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      {!records.length && <EmptyState title="No implementation records yet" description="Document a real deployment: context, process change, architecture, claims and evidence." to="/implementation/new" action="Add implementation" />}
      {invite && <AttestationInviteDialog record={invite} claims={implementationBundle(data, invite).claims} open onClose={() => setInvite(null)} />}
    </Frame>
  );
}

function CreatorBlueprints({ data, userId }: { data: Data; userId: string }) {
  const actions = useActions();
  const { notify } = useUI();
  const now = new Date();
  const blueprints = data.blueprints.filter((blueprint) => mine(blueprint.ownerId, userId) || blueprint.maintainerId === userId);
  return (
    <Frame eyebrow="IMPLEMENTER WORKSPACE" title="Blueprints you maintain" description="Keep versions validated. A Blueprint whose compatibility is not re-checked becomes review-due and then stale automatically.">
      <div className="grid three">
        {blueprints.map((blueprint) => {
          const version = data.versions.find((item) => item.id === blueprint.currentVersionId);
          const items = data.blueprintItems.filter((item) => item.blueprintVersionId === blueprint.currentVersionId);
          const gate = blueprintPublicationGate(blueprint);
          return (
            <div key={blueprint.id} className="workspace-blueprint">
              <BlueprintCard blueprint={blueprint} version={version} stackItems={items} products={data.products} freshness={blueprintFreshness(blueprint, version, items, data.products, data.relationships, data.checks, now).state} />
              {!gate.ready && <ul className="gate-list">{gate.missing.map((item) => <li key={item}>{item}</li>)}</ul>}
              {version && (
                <button type="button" className="button light" onClick={() => void actions.save("blueprint_versions", { ...version, lastValidatedAt: now.toISOString().slice(0, 10) }).then(() => notify(`v${version.version} marked as validated today.`)).catch(() => undefined)}>
                  <CalendarClock size={15} aria-hidden /> Mark v{version.version} validated today
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!blueprints.length && <EmptyState title="No Blueprints yet" description="Derive one from an implementation record after completing the sanitization checklist." to="/implementation/new" action="Add implementation" />}
    </Frame>
  );
}

function CreatorRequests() {
  const { data: projects = [] } = useRecords("projects");
  const sourced = projects.filter((project) => project.sourceImplementationId || project.sourceBlueprintId);
  return (
    <Frame eyebrow="IMPLEMENTER WORKSPACE" title="Implementation requests" description="Buyer requirements that start from a record or Blueprint remain procurement Projects — never evidence.">
      <div className="workspace-list">
        {sourced.map((project) => (
          <Link className="card workspace-row" to={`/app/projects/${project.id}`} key={project.id}>
            <span className="category-icon sand"><FileSearch size={20} aria-hidden /></span>
            <span><strong>{project.name}</strong><small>{project.status} · {project.budget}</small></span>
            <ArrowRight size={16} aria-hidden />
          </Link>
        ))}
      </div>
      {!sourced.length && <EmptyState title="No sourced requests yet" description="Requests created from an implementation record or Blueprint appear here." to="/implementations" action="Browse implementations" />}
    </Frame>
  );
}

function BuyerRequirements({ userId }: { userId: string }) {
  const { data: profiles = [] } = useRecords("requirement_profiles");
  const own = profiles.filter((profile) => mine(profile.ownerId, userId));
  return (
    <Frame eyebrow="BUYER WORKSPACE" title="Requirement profiles" description="Structured, editable requirements. Inferred values stay marked until you confirm them." action={<Link className="button dark" to="/solution-compiler">New requirement <ArrowRight size={16} aria-hidden /></Link>}>
      <div className="workspace-list">
        {own.map((profile) => (
          <div className="card workspace-row" key={profile.id}>
            <span className="category-icon sand"><FileSearch size={20} aria-hidden /></span>
            <span>
              <strong>{profile.name}</strong>
              <small>{[profile.businessType, profile.locations ? `${profile.locations} locations` : "", profile.region, profile.mustKeepSystems.length ? `keeps ${profile.mustKeepSystems.join(", ")}` : ""].filter(Boolean).join(" · ")}</small>
              {!!profile.inferredFields?.length && <small>{profile.inferredFields.length} inferred value(s) not yet confirmed</small>}
            </span>
          </div>
        ))}
      </div>
      {!own.length && <EmptyState title="No saved requirement profiles" description="Run the Solution Compiler and save the run to keep your requirement." to="/solution-compiler" action="Open Solution Compiler" />}
    </Frame>
  );
}

function BuyerRuns({ data, userId }: { data: Data; userId: string }) {
  const { data: runs = [] } = useRecords("solution_runs");
  const { data: candidates = [] } = useRecords("solution_candidates");
  const [checks, setChecks] = useState<Record<string, string>>({});
  const own = runs.filter((run) => mine(run.ownerId, userId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Frame eyebrow="BUYER WORKSPACE" title="Solution runs" description="Each run stores the requirement snapshot, engine and ruleset versions, catalogue digest and full decision trace." action={<Link className="button dark" to="/solution-compiler">Run compiler <ArrowRight size={16} aria-hidden /></Link>}>
      <div className="workspace-list">
        {own.map((run) => {
          const runCandidates = candidates.filter((candidate) => candidate.solutionRunId === run.id);
          const trace = run.trace as DecisionTrace | undefined;
          return (
            <article className="card run-row" key={run.id}>
              <div className="row between wrap">
                <span><strong>{run.name}</strong><small>{run.createdAt.slice(0, 16).replace("T", " ")} · engine {run.engineVersion} · ruleset {run.rulesetVersion}</small></span>
                <button type="button" className="button light" onClick={() => setChecks((current) => ({ ...current, [run.id]: verifyReproducibility(run, data.catalogue).reason }))}>
                  <RotateCcw size={15} aria-hidden /> Verify reproducibility
                </button>
              </div>
              {checks[run.id] && <p className="notice" role="status">{checks[run.id]}</p>}
              <ul className="run-candidates">
                {runCandidates.filter((candidate) => !candidate.dominated).map((candidate) => (
                  <li key={candidate.id}><strong>{candidate.name}</strong> {candidate.tradeoffLabels.map((label) => <span className="tradeoff-label" key={label}>{label}</span>)}</li>
                ))}
              </ul>
              <small className="muted">{trace?.exclusions.length ?? run.excluded.length} exclusions · digest {run.resultDigest?.slice(0, 12)}</small>
            </article>
          );
        })}
      </div>
      {!own.length && <EmptyState title="No saved runs" description="Compile options in the Solution Compiler, then choose Save run." to="/solution-compiler" action="Open Solution Compiler" />}
    </Frame>
  );
}

function ProviderImplementations({ data }: { data: Data }) {
  const actions = useActions();
  const { notify, userId } = useUI();
  const [correction, setCorrection] = useState<{ record: ImplementationRecord; text: string } | null>(null);
  const records = data.implementations.filter(isPublicRecord);
  return (
    <Frame eyebrow="PROVIDER WORKSPACE" title="Implementations using your technologies" description="Usage comes from recorded stacks. Providers can submit corrections for moderation but cannot edit or delete independent records.">
      <div className="workspace-list">
        {records.map((record) => {
          const stack = data.stackItems.filter((item) => item.implementationId === record.id).map((item) => data.products.find((product) => product.id === item.productId)?.name ?? item.productId);
          return (
            <div className="card workspace-row" key={record.id}>
              <span className="category-icon sand"><GitBranch size={20} aria-hidden /></span>
              <span><Link to={`/implementations/${record.slug}`}><strong>{record.name}</strong></Link><small>{stack.join(" · ")}</small></span>
              <button type="button" className="button light" onClick={() => setCorrection({ record, text: "" })}><Flag size={15} aria-hidden /> Submit correction</button>
            </div>
          );
        })}
      </div>
      <Modal open={!!correction} onClose={() => setCorrection(null)} title="Submit a correction" description="Creates a pending, non-public provider claim for reviewers. The record owner’s data is not changed.">
        {correction && (
          <div className="form-stack">
            <label>What is inaccurate, and what evidence supports your correction?<textarea rows={5} value={correction.text} maxLength={1200} onChange={(event) => setCorrection({ ...correction, text: event.target.value })} /></label>
            <button
              type="button"
              className="button dark"
              disabled={correction.text.trim().length < 20}
              onClick={() => {
                const claim: Claim = {
                  id: `correction-${correction.record.id}-${Date.now()}`,
                  name: `Provider correction for ${correction.record.name}`,
                  provenance: isSupabase ? "vendor supplied" : "demo",
                  subjectType: "implementation",
                  subjectId: correction.record.id,
                  predicate: "provider-correction",
                  value: correction.text.trim(),
                  claimant: userId || "provider",
                  claimantType: "provider",
                  status: "pending",
                  evidenceLevel: "creator-reported",
                  public: false,
                };
                void actions.save("claims", claim).then(() => { notify("Correction submitted for moderation."); setCorrection(null); }).catch(() => undefined);
              }}
            >
              Submit for review
            </button>
          </div>
        )}
      </Modal>
    </Frame>
  );
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function ProviderCompatibility({ data }: { data: Data }) {
  const actions = useActions();
  const { notify } = useUI();
  const [form, setForm] = useState<{ relationshipId: string; url: string; notes: string } | null>(null);
  const { data: evidence = [] } = useRecords("relationship_evidence");
  const now = new Date();
  return (
    <Frame eyebrow="PROVIDER WORKSPACE" title="Compatibility & relationship evidence" description="Observed together, native integration and verified compatibility are different states. Submit documentation; reviewers decide.">
      <div className="relationship-grid">
        {data.relationships.map((relationship) => {
          const name = (id: string) => data.products.find((product) => product.id === id)?.name ?? id;
          const submitted = evidence.filter((item) => item.relationshipId === relationship.id);
          return (
            <div className="card technology-relationship-card" key={relationship.id}>
              <strong>{name(relationship.sourceProductId)} ↔ {name(relationship.targetProductId)}</strong>
              <div className="row wrap"><RelationshipTypeBadge type={relationship.relationshipType} /><EvidenceBadge level={relationship.evidenceLevel} compact /><StalenessBadge state={relationshipFreshness(relationship, now).state} /></div>
              <small>{relationship.sourceLabel}</small>
              {!!submitted.length && <small>{submitted.length} evidence submission(s) awaiting review</small>}
              <button type="button" className="button light" onClick={() => setForm({ relationshipId: relationship.id, url: "", notes: "" })}>Submit evidence</button>
            </div>
          );
        })}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title="Submit relationship evidence" description="Link to public documentation. Oracnet does not fetch the URL; a reviewer opens it.">
        {form && (
          <div className="form-stack">
            <label>Documentation URL (https)<input type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://" /></label>
            <label>What does it show?<textarea rows={4} value={form.notes} maxLength={800} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <button
              type="button"
              className="button dark"
              disabled={!safeUrl(form.url) || form.notes.trim().length < 10}
              onClick={() =>
                void actions
                  .save("relationship_evidence", { id: `relationship-evidence-${Date.now()}`, name: "Provider submission", provenance: isSupabase ? "vendor supplied" : "demo", relationshipId: form.relationshipId, sourceUrl: safeUrl(form.url)!, evidenceLevel: "creator-reported", notes: form.notes.trim() })
                  .then(() => { notify("Evidence submitted for review."); setForm(null); })
                  .catch(() => undefined)
              }
            >
              Submit
            </button>
          </div>
        )}
      </Modal>
    </Frame>
  );
}

function AdminQueue({ path, data }: { path: string; data: Data }) {
  const actions = useActions();
  const { notify, userId } = useUI();
  const { data: audit = [] } = useRecords("audit_events");
  const { data: relationshipEvidence = [] } = useRecords("relationship_evidence");
  const [note, setNote] = useState<Record<string, string>>({});
  const now = () => new Date();
  const reviewer = userId || "demo-reviewer";
  const run = async (work: () => Promise<unknown>, message: string) => {
    try {
      await work();
      notify(message);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Action failed.");
    }
  };
  const frame = (title: string, description: string, children: ReactNode) => (
    <Frame eyebrow="REVIEW & VERIFICATION" title={title} description={description}>
      <nav className="admin-tabs" aria-label="Review queues">
        {[["implementations", "Implementations"], ["claims", "Claims"], ["evidence", "Evidence"], ["attestations", "Attestations"], ["blueprints", "Blueprints"], ["compatibility", "Compatibility"], ["staleness", "Freshness"], ["audit", "Audit"]].map(([id, label]) => (
          <Link key={id} to={`/admin/${id}`} aria-current={path === `/admin/${id}` ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {children}
    </Frame>
  );
  const noteField = (id: string, label = "Reviewer note") => (
    <input className="review-note-input" aria-label={label} placeholder={label} value={note[id] ?? ""} onChange={(event) => setNote((current) => ({ ...current, [id]: event.target.value }))} />
  );

  if (path === "/admin/implementations")
    return frame("Implementation moderation", "Approve publication, customer identity visibility and rights. Evidence is reviewed per claim, not here.", (
      <div className="admin-intelligence-list">
        {data.implementations.map((record) => (
          <div className="card admin-intelligence-row" key={record.id}>
            <span><Link to={`/implementations/${record.slug}`}><strong>{record.name}</strong></Link><small>{record.publicationState} · {record.moderationState} · customer identity {record.customerIdentityVisibility} · permission {record.customerPermissionState}</small></span>
            <span className="row wrap"><RightsBadge rights={record.rightsState} /><StalenessBadge state={implementationFreshness(record, now()).state} /></span>
            <span className="row wrap admin-actions">
              {(["approve", "flag", "reject", "archive"] as const).map((decision) => (
                <button key={decision} type="button" className="button light" onClick={() => void run(async () => { const result = moderateImplementation(record, decision, reviewer, now()); await actions.save("implementation_records", result.record); await actions.save("audit_events", result.audit); }, `Implementation ${decision}d.`)}>
                  {decision === "approve" ? <CheckCircle2 size={14} aria-hidden /> : decision === "archive" ? <Archive size={14} aria-hidden /> : decision === "flag" ? <Flag size={14} aria-hidden /> : <XCircle size={14} aria-hidden />} {decision[0].toUpperCase() + decision.slice(1)}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
    ));

  if (path === "/admin/claims") {
    const queue = [...data.claims].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
    return frame("Claim review", "Decide evidence per claim. Upgrades require a sufficient review; revocations require a reason. Demo claims keep a visible demo marker.", (
      <div className="admin-intelligence-list">
        {queue.map((claim) => (
          <div className="card admin-intelligence-row" key={claim.id}>
            <span><strong>{claim.name}</strong><small>{claim.subjectType} · {claim.status} · {claim.claimant}{claim.public ? "" : " · not public"}</small><small>{claim.value}</small></span>
            <EvidenceBadge level={claim.evidenceLevel} compact demo={claim.provenance === "demo"} />
            <span className="admin-actions">
              {noteField(claim.id)}
              <span className="row wrap">
                {(["sufficient", "needs-more-evidence", "insufficient"] as const).map((result) => (
                  <button key={result} type="button" className="button light" onClick={() => void run(async () => { const outcome = reviewClaim(claim, result, reviewer, note[claim.id] ?? "", now()); await actions.save("claims", outcome.claim); await actions.save("evidence_reviews", outcome.review); await actions.save("verification_events", outcome.event); await actions.save("audit_events", outcome.audit); }, `Claim marked ${result.replaceAll("-", " ")}.`)}>
                    {result === "sufficient" ? "Evidence sufficient" : result === "insufficient" ? "Insufficient" : "Request more"}
                  </button>
                ))}
                <button type="button" className="button light" onClick={() => void run(async () => { const outcome = revokeClaim(claim, reviewer, note[claim.id] ?? "", now()); await actions.save("claims", outcome.claim); await actions.save("verification_events", outcome.event); await actions.save("audit_events", outcome.audit); }, "Verification revoked.")}>
                  <ShieldX size={14} aria-hidden /> Revoke
                </button>
              </span>
            </span>
          </div>
        ))}
      </div>
    ));
  }

  if (path === "/admin/evidence")
    return frame("Private evidence", "Files live in a private bucket. Reviewers receive short-lived signed links from the server; public pages expose metadata only.", (
      <div className="admin-intelligence-list">
        {data.artifacts.map((artifact) => (
          <div className="card admin-intelligence-row" key={artifact.id}>
            <span><strong>{artifact.name}</strong><small>{artifact.kind.replaceAll("-", " ")} · {artifact.mimeType || "type not recorded"} · {artifact.private ? "private" : "public metadata"}</small><small>{artifact.publicMetadata}</small></span>
            <LockKeyhole size={16} aria-label="Private" />
            <button
              type="button"
              className="button light"
              onClick={() =>
                void run(async () => {
                  if (!isSupabase || !artifact.storagePath) throw new Error("No file exists for demo evidence. In connected mode the evidence function issues a 60-second signed link.");
                  const { supabase } = await import("../data/supabase");
                  const { data: response, error } = await supabase.functions.invoke("evidence", { body: { action: "download", artifactId: artifact.id } });
                  if (error || !response?.url) throw new Error("Signed link refused.");
                  window.open(response.url as string, "_blank", "noopener,noreferrer");
                }, "Signed link opened (expires in 60 seconds).")
              }
            >
              Open with signed link
            </button>
          </div>
        ))}
      </div>
    ));

  if (path === "/admin/attestations")
    return frame("Customer attestations", "Tokens are stored only as hashes, scoped to claims, single-use and expiring.", (
      <div className="admin-intelligence-list">
        {data.attestations.map((attestation) => (
          <div className="card admin-intelligence-row" key={attestation.id}>
            <span><strong>{attestation.name}</strong><small>{attestation.status} · {attestation.claimIds?.length ?? 0} scoped claims · identity {attestation.customerIdentityVisibility} · expires {attestation.expiresAt.slice(0, 10)}</small>{attestation.decisions && <small>{Object.values(attestation.decisions).filter((value) => value === "confirm").length} confirmed · {Object.values(attestation.decisions).filter((value) => value === "reject").length} rejected</small>}</span>
            <Badge>{attestation.provenance === "demo" ? "DEMO" : "LIVE"}</Badge>
            <span className="row wrap">
              {attestation.id === "demo-attestation" && attestation.status === "pending" && <Link className="button light" to="/verify/demo-attestation-token-illustrative-only-not-a-secret">Open demo walkthrough</Link>}
              {attestation.status === "pending" && (
                <button type="button" className="button light" onClick={() => void run(async () => { await actions.save("attestations", { ...attestation, status: "revoked", revokedAt: now().toISOString() }); await actions.save("audit_events", auditEvent(reviewer, "attestation", attestation.id, "attestation-revoked", now())); }, "Invitation revoked.")}>Revoke</button>
              )}
            </span>
          </div>
        ))}
      </div>
    ));

  if (path === "/admin/blueprints")
    return frame("Blueprint publication", "Approval requires a confirmed sanitization checklist and a rights declaration. Automated scanning assists but does not replace review.", (
      <div className="admin-intelligence-list">
        {data.blueprints.map((blueprint) => {
          const findings = scanFields({ description: blueprint.description, setupNotes: blueprint.setupNotes, knownLimitations: blueprint.knownLimitations, license: blueprint.license });
          const gate = blueprintPublicationGate({ ...blueprint, moderationState: "approved" });
          return (
            <div className="card admin-intelligence-row" key={blueprint.id}>
              <span><Link to={`/blueprints/${blueprint.slug}`}><strong>{blueprint.name}</strong></Link><small>{blueprint.publicationState} · {blueprint.moderationState} · checklist {blueprint.sanitizationChecklist?.length ?? 0}/{sanitizationChecklist.length}</small>{!gate.ready && <small className="warn">{gate.missing.join(" ")}</small>}<small>{findings.length ? `${findings.length} scanner finding(s): ${findings.map((finding) => finding.kind).join(", ")}` : "Scanner: no findings in public text."}</small></span>
              <RightsBadge rights={blueprint.reuseRights} />
              <span className="row wrap">
                <button type="button" className="button light" onClick={() => void run(async () => { const outcome = moderateBlueprint(blueprint, "approve", reviewer, now()); await actions.save("blueprints", outcome.blueprint); await actions.save("audit_events", outcome.audit); }, "Blueprint approved and published.")}>Approve</button>
                <button type="button" className="button light" onClick={() => void run(async () => { const outcome = moderateBlueprint(blueprint, "reject", reviewer, now()); await actions.save("blueprints", outcome.blueprint); await actions.save("audit_events", outcome.audit); }, "Blueprint rejected.")}>Reject</button>
              </span>
            </div>
          );
        })}
      </div>
    ));

  if (path === "/admin/compatibility")
    return frame("Compatibility review", "Change a relationship type only with recorded evidence. Observed-together never silently becomes compatible.", (
      <div className="admin-intelligence-list">
        {data.relationships.map((relationship) => {
          const submissions = relationshipEvidence.filter((item) => item.relationshipId === relationship.id);
          return (
            <div className="card admin-intelligence-row" key={relationship.id}>
              <span><strong>{relationship.name}</strong><small>{relationship.sourceLabel}</small>{submissions.map((item) => <small key={item.id}>Submitted: <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{item.sourceUrl}</a> — {item.notes}</small>)}</span>
              <span className="row wrap"><RelationshipTypeBadge type={relationship.relationshipType} /><EvidenceBadge level={relationship.evidenceLevel} compact /></span>
              <span className="admin-actions">
                {noteField(relationship.id, "Evidence note (required to change type)")}
                <span className="row wrap">
                  <select aria-label={`New type for ${relationship.name}`} defaultValue={relationship.relationshipType} onChange={(event) => setNote((current) => ({ ...current, [`${relationship.id}:type`]: event.target.value }))}>
                    {["native-integration", "api-compatible", "webhook-compatible", "connector-available", "requires-middleware", "custom-integration-required", "observed-together", "incompatible", "unknown"].map((type) => <option key={type} value={type}>{type.replaceAll("-", " ")}</option>)}
                  </select>
                  {(["confirmed", "conditional", "failed"] as const).map((result) => (
                    <button key={result} type="button" className="button light" onClick={() => void run(async () => { const outcome = reviewRelationship(relationship, (note[`${relationship.id}:type`] as TechnologyRelationshipType) ?? relationship.relationshipType, result, reviewer, note[relationship.id] ?? "", now()); await actions.save("technology_relationships", outcome.relationship); await actions.save("compatibility_checks", outcome.check); await actions.save("audit_events", outcome.audit); }, `Compatibility check recorded (${result}).`)}>{result}</button>
                  ))}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    ));

  if (path === "/admin/staleness") {
    const date = now();
    return frame("Freshness", "States are computed from review dates and triggers such as retired products or failed checks.", (
      <div className="admin-intelligence-list">
        {data.implementations.map((record) => {
          const freshness = implementationFreshness(record, date);
          return (
            <div className="card admin-intelligence-row" key={record.id}>
              <span><strong>{record.name}</strong><small>Implementation evidence · {freshness.reasons.join(" ")}</small></span>
              <StalenessBadge state={freshness.state} />
              <span className="row wrap">
                <button type="button" className="button light" onClick={() => void run(async () => { await actions.save("implementation_records", { ...record, lastEvidenceReviewAt: date.toISOString().slice(0, 10), nextEvidenceReviewAt: new Date(date.getTime() + 180 * 86400000).toISOString().slice(0, 10) }); await actions.save("audit_events", auditEvent(reviewer, "implementation", record.id, "evidence-rereviewed", date)); }, "Marked reviewed today; next review scheduled in 180 days.")}><CalendarClock size={14} aria-hidden /> Reviewed today</button>
                <button type="button" className="button light" onClick={() => void run(async () => { const outcome = moderateImplementation(record, "archive", reviewer, date); await actions.save("implementation_records", outcome.record); await actions.save("audit_events", outcome.audit); }, "Record archived.")}><Archive size={14} aria-hidden /> Archive</button>
              </span>
            </div>
          );
        })}
        {data.blueprints.map((blueprint) => {
          const version = data.versions.find((item) => item.id === blueprint.currentVersionId);
          const freshness = blueprintFreshness(blueprint, version, data.blueprintItems.filter((item) => item.blueprintVersionId === version?.id), data.products, data.relationships, data.checks, date);
          return (
            <div className="card admin-intelligence-row" key={blueprint.id}>
              <span><strong>{blueprint.name}</strong><small>Blueprint compatibility · {freshness.reasons.join(" ")}</small></span>
              <StalenessBadge state={freshness.state} />
              <button type="button" className="button light" onClick={() => void run(async () => { await actions.save("blueprints", { ...blueprint, compatibilityState: "archived" }); await actions.save("audit_events", auditEvent(reviewer, "blueprint", blueprint.id, "blueprint-archived", date)); }, "Blueprint archived.")}><Archive size={14} aria-hidden /> Archive</button>
            </div>
          );
        })}
      </div>
    ));
  }

  if (path === "/admin/audit") {
    const intelligence = [...audit].filter((event) => ["implementation", "claim", "blueprint", "technology-relationship", "attestation"].includes(event.entityType)).sort((a, b) => b.at.localeCompare(a.at));
    return frame("Audit history", "Append-only record of evidence-domain changes. Ordinary users cannot edit history; in connected mode only the database writes these rows.", (
      <div className="admin-intelligence-list">
        {intelligence.map((event) => (
          <div className="card admin-intelligence-row" key={event.id}>
            <span><strong>{event.action}</strong><small>{event.entityType} · {event.entityId} · by {event.actorId}</small><small>{event.name}</small></span>
            <time dateTime={event.at}>{event.at.slice(0, 16).replace("T", " ")}</time>
          </div>
        ))}
        {!intelligence.length && <EmptyState title="No audit events yet" description="Review actions in the other queues create audit events here." to="/admin/claims" action="Open claim review" />}
      </div>
    ));
  }

  return frame("Review queues", "Choose a queue.", (
    <div className="grid three">
      <Link className="card workspace-row" to="/admin/claims"><ShieldCheck size={20} aria-hidden /><span><strong>Claims</strong><small>{data.claims.filter((claim) => claim.status === "pending").length} pending</small></span></Link>
      <Link className="card workspace-row" to="/admin/blueprints"><GitBranch size={20} aria-hidden /><span><strong>Blueprints</strong><small>{data.blueprints.filter((blueprint) => blueprint.moderationState === "pending").length} pending</small></span></Link>
      <Link className="card workspace-row" to="/admin/implementations"><FileSearch size={20} aria-hidden /><span><strong>Implementations</strong><small>{data.implementations.filter((record) => record.moderationState === "pending").length} pending</small></span></Link>
    </div>
  ));
}
