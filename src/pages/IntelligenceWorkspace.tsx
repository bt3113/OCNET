import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  DatabaseZap,
  FileCheck2,
  GitBranch,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { PageHeading, WorkspaceNotice } from "../components/layout";
import { Badge, ButtonLink, EmptyState, Skeleton } from "../components/ui";
import {
  BlueprintCard,
  EvidenceBadge,
  ImplementationCard,
  StalenessBadge,
} from "../components/intelligence";
import { useActions, useRecords, useUI } from "../state";

export default function IntelligenceWorkspace() {
  const location = useLocation();
  const path = location.pathname;
  const { userId, roles, notify } = useUI();
  const actions = useActions();
  const { data: implementations = [], isLoading } = useRecords("implementation_records");
  const { data: contexts = [] } = useRecords("implementation_contexts");
  const { data: metrics = [] } = useRecords("implementation_metrics");
  const { data: definitions = [] } = useRecords("metric_definitions");
  const { data: blueprints = [] } = useRecords("blueprints");
  const { data: versions = [] } = useRecords("blueprint_versions");
  const { data: blueprintItems = [] } = useRecords("blueprint_stack_items");
  const { data: claims = [] } = useRecords("claims");
  const { data: evidence = [] } = useRecords("evidence_artifacts");
  const { data: attestations = [] } = useRecords("attestations");
  const { data: relationships = [] } = useRecords("technology_relationships");
  const { data: checks = [] } = useRecords("compatibility_checks");
  const { data: staleness = [] } = useRecords("staleness_reviews");
  const { data: requirementProfiles = [] } = useRecords("requirement_profiles");
  const { data: solutionRuns = [] } = useRecords("solution_runs");
  const { data: products = [] } = useRecords("products");
  const { data: projects = [] } = useRecords("projects");

  if (isLoading) return <Skeleton />;

  if (path === "/creator/implementations") {
    const mine = implementations.filter(
      (item) => item.ownerId === userId || item.demo,
    );
    return (
      <WorkspaceFrame
        eyebrow="IMPLEMENTER WORKSPACE"
        title="Implementation records"
        description="Document deployments separately from reusable Blueprints and commercial offers."
        action={<ButtonLink to="/implementation/new">Add implementation <ArrowRight size={16} /></ButtonLink>}
      >
        <div className="implementation-grid">
          {mine.map((item) => (
            <ImplementationCard
              key={item.id}
              implementation={item}
              context={contexts.find((context) => context.implementationId === item.id)}
              metrics={metrics.filter((metric) => metric.implementationId === item.id)}
              metricDefinitions={definitions}
            />
          ))}
        </div>
      </WorkspaceFrame>
    );
  }

  if (path === "/creator/blueprints") {
    const mine = blueprints.filter((item) => item.ownerId === userId || item.demo);
    return (
      <WorkspaceFrame
        eyebrow="IMPLEMENTER WORKSPACE"
        title="Blueprints"
        description="Maintain sanitized, versioned implementation patterns without treating customer IP as a reusable asset."
      >
        <div className="grid three">
          {mine.map((blueprint) => (
            <BlueprintCard
              key={blueprint.id}
              blueprint={blueprint}
              version={versions.find((version) => version.id === blueprint.currentVersionId)}
              stackItems={blueprintItems.filter((item) => item.blueprintVersionId === blueprint.currentVersionId)}
              products={products}
            />
          ))}
        </div>
      </WorkspaceFrame>
    );
  }

  if (path === "/creator/requests") {
    const sourced = projects.filter(
      (project) => project.sourceImplementationId || project.sourceBlueprintId,
    );
    return (
      <WorkspaceFrame
        eyebrow="IMPLEMENTER WORKSPACE"
        title="Implementation requests"
        description="Buyer requirements that originate from an Implementation Record or Blueprint remain procurement Projects, not evidence records."
      >
        <div className="workspace-list">
          {sourced.map((project) => (
            <Link className="card workspace-row" to={`/app/projects/${project.id}`} key={project.id}>
              <span className="category-icon sand"><SearchCheck size={20} /></span>
              <span><strong>{project.name}</strong><small>{project.status} · {project.budget}</small></span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
        {!sourced.length && <EmptyState title="No sourced requests yet" description="When a buyer requests something similar to a record or Blueprint, the private requirement appears here." />}
      </WorkspaceFrame>
    );
  }

  if (path === "/app/requirements") {
    return (
      <WorkspaceFrame
        eyebrow="BUYER WORKSPACE"
        title="Requirement profiles"
        description="Saved structured business requirements used by deterministic Solution Compiler runs."
        action={<ButtonLink to="/solution-compiler">New requirement <ArrowRight size={16} /></ButtonLink>}
      >
        <div className="workspace-list">
          {requirementProfiles.filter((profile) => profile.ownerId === userId || profile.ownerId === "demo-user").map((profile) => (
            <div className="card workspace-row" key={profile.id}>
              <span className="category-icon sand"><DatabaseZap size={20} /></span>
              <span><strong>{profile.name}</strong><small>{profile.businessType} · {profile.organizationSizeBand} · {profile.region}</small></span>
              <Badge>{profile.provenance}</Badge>
            </div>
          ))}
        </div>
        {!requirementProfiles.length && <EmptyState title="No saved requirement profiles" to="/solution-compiler" action="Open Solution Compiler" />}
      </WorkspaceFrame>
    );
  }

  if (path === "/app/solution-runs") {
    return (
      <WorkspaceFrame
        eyebrow="BUYER WORKSPACE"
        title="Solution runs"
        description="Every compiler run records engine/ruleset versions, candidate pool and explicit exclusions for reproducibility."
        action={<ButtonLink to="/solution-compiler">Run compiler <ArrowRight size={16} /></ButtonLink>}
      >
        <div className="workspace-list">
          {solutionRuns.filter((run) => run.ownerId === userId || run.ownerId === "demo-user").map((run) => (
            <div className="card workspace-row" key={run.id}>
              <span className="category-icon sand"><GitBranch size={20} /></span>
              <span><strong>{run.name}</strong><small>Engine {run.engineVersion} · ruleset {run.rulesetVersion} · {run.excluded.length} excluded</small></span>
              <Badge>{run.provenance}</Badge>
            </div>
          ))}
        </div>
        {!solutionRuns.length && <EmptyState title="No Solution Compiler runs yet" to="/solution-compiler" action="Compile options" />}
      </WorkspaceFrame>
    );
  }

  if (path === "/provider/implementations") {
    return (
      <WorkspaceFrame
        eyebrow="PROVIDER WORKSPACE"
        title="Implementations using your technologies"
        description="Usage is derived from recorded stack relationships. Providers can submit corrections but do not control independent records."
      >
        <div className="implementation-grid">
          {implementations.map((item) => (
            <ImplementationCard
              key={item.id}
              implementation={item}
              context={contexts.find((context) => context.implementationId === item.id)}
              metrics={metrics.filter((metric) => metric.implementationId === item.id)}
              metricDefinitions={definitions}
            />
          ))}
        </div>
      </WorkspaceFrame>
    );
  }

  if (path === "/provider/compatibility") {
    return (
      <WorkspaceFrame
        eyebrow="PROVIDER WORKSPACE"
        title="Compatibility & relationship evidence"
        description="Co-occurrence, native integration and compatibility are distinct relationship types with separate provenance."
      >
        <div className="relationship-grid">
          {relationships.map((relationship) => {
            const source = products.find((product) => product.id === relationship.sourceProductId);
            const target = products.find((product) => product.id === relationship.targetProductId);
            const check = checks.find((item) => item.relationshipId === relationship.id);
            return (
              <div className="card technology-relationship-card" key={relationship.id}>
                <GitBranch size={20} />
                <div><strong>{source?.name ?? relationship.sourceProductId} → {target?.name ?? relationship.targetProductId}</strong><span>{relationship.relationshipType.replaceAll("-", " ")}</span><p>{relationship.sourceLabel}</p><div className="row wrap"><EvidenceBadge level={relationship.evidenceLevel} compact /><Badge>{check?.result ?? "unknown"}</Badge></div></div>
              </div>
            );
          })}
        </div>
      </WorkspaceFrame>
    );
  }

  const admin = path.startsWith("/admin/");
  if (admin && !roles.includes("admin") && userId) {
    return <EmptyState title="Reviewer access required" description="Connected mode restricts verification operations to trusted roles." to="/" action="Back to marketplace" />;
  }
  if (path === "/admin/implementations") {
    return (
      <AdminQueue title="Implementation moderation" description="Review publication, customer privacy, rights and evidence state separately.">
        {implementations.map((item) => (
          <div className="card admin-intelligence-row" key={item.id}>
            <span><strong>{item.name}</strong><small>{item.moderationState} · {item.customerIdentityVisibility} customer identity</small></span>
            <div className="row wrap"><EvidenceBadge level={item.verificationState} compact /><StalenessBadge state={item.stalenessState} /></div>
            {item.demo ? <Badge>DEMO · immutable truth boundary</Badge> : (
              <button className="button light" onClick={() => void actions.save("implementation_records", { ...item, moderationState: "approved" }).then(() => notify("Implementation approved")).catch(() => {})}>Approve</button>
            )}
          </div>
        ))}
      </AdminQueue>
    );
  }
  if (path === "/admin/claims") {
    return <AdminQueue title="Claim review" description="Evidence decisions apply to individual claims rather than granting blanket verification.">{claims.map((claim) => <div className="card admin-intelligence-row" key={claim.id}><span><strong>{claim.name}</strong><small>{claim.subjectType} · {claim.status}</small></span><EvidenceBadge level={claim.evidenceLevel} compact /><span>{claim.value}</span></div>)}</AdminQueue>;
  }
  if (path === "/admin/evidence") {
    return <AdminQueue title="Private evidence metadata" description="Binary evidence must remain private; public pages expose metadata/provenance only.">{evidence.map((item) => <div className="card admin-intelligence-row" key={item.id}><span><strong>{item.name}</strong><small>{item.kind} · {item.private ? "private" : "public metadata"}</small></span><Badge>{item.provenance}</Badge><span>{item.publicMetadata}</span></div>)}</AdminQueue>;
  }
  if (path === "/admin/attestations") {
    return <AdminQueue title="Customer attestations" description="Production tokens are hashed, scoped, expiring and server validated.">{attestations.map((item) => <div className="card admin-intelligence-row" key={item.id}><span><strong>{item.name}</strong><small>{item.status} · identity {item.customerIdentityVisibility}</small></span><Badge>{item.provenance}</Badge>{item.provenance === "demo" && <Link to="/verify/demo-attestation">Preview demo flow <ArrowRight size={14} /></Link>}</div>)}</AdminQueue>;
  }
  if (path === "/admin/blueprints") {
    return <AdminQueue title="Blueprint publication" description="Rights, sanitization, version state and compatibility review are independent of implementation evidence."><div className="grid three">{blueprints.map((blueprint) => <BlueprintCard key={blueprint.id} blueprint={blueprint} version={versions.find((version) => version.id === blueprint.currentVersionId)} stackItems={blueprintItems.filter((item) => item.blueprintVersionId === blueprint.currentVersionId)} products={products} />)}</div></AdminQueue>;
  }
  if (path === "/admin/compatibility") {
    return <AdminQueue title="Compatibility evidence" description="Observed together never silently becomes confirmed compatibility.">{relationships.map((item) => <div className="card admin-intelligence-row" key={item.id}><span><strong>{item.name}</strong><small>{item.relationshipType.replaceAll("-", " ")}</small></span><EvidenceBadge level={item.evidenceLevel} compact /><Badge>{checks.find((check) => check.relationshipId === item.id)?.result ?? "unknown"}</Badge></div>)}</AdminQueue>;
  }
  if (path === "/admin/staleness") {
    return <AdminQueue title="Evidence & Blueprint freshness" description="Inventory can decay; stale records should not silently look current.">{staleness.map((item) => <div className="card admin-intelligence-row" key={item.id}><span><strong>{item.name}</strong><small>{item.entityType} · reviewed {item.reviewedAt}</small></span><StalenessBadge state={item.state} /><span>{item.reason}</span></div>)}</AdminQueue>;
  }

  return (
    <WorkspaceFrame
      eyebrow="IMPLEMENTATION INTELLIGENCE"
      title="Evidence workspace"
      description="Use the dedicated workspace links for implementation records, Blueprints, requirements, solution runs and verification operations."
    >
      <div className="grid three">
        <ButtonLink to="/creator/implementations" variant="light">Implementations <ArrowRight size={16} /></ButtonLink>
        <ButtonLink to="/creator/blueprints" variant="light">Blueprints <ArrowRight size={16} /></ButtonLink>
        <ButtonLink to="/solution-compiler" variant="light">Solution Compiler <ArrowRight size={16} /></ButtonLink>
      </div>
    </WorkspaceFrame>
  );
}

function WorkspaceFrame({ eyebrow, title, description, action, children }: { eyebrow: string; title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <><WorkspaceNotice /><PageHeading eyebrow={eyebrow} title={title} description={description} action={action} />{children}</>;
}

function AdminQueue({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <WorkspaceFrame eyebrow="REVIEW & VERIFICATION" title={title} description={description}>
      <div className="admin-intelligence-summary card"><FileCheck2 size={22} /><span><strong>Evidence operations are auditable.</strong><small>Demo actions stay browser-local; connected production actions are enforced by RLS/server roles.</small></span><ShieldCheck size={20} /></div>
      <div className="admin-intelligence-list">{children}</div>
    </WorkspaceFrame>
  );
}
