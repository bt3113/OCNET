import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Download, FileKey2, GitBranch, LockKeyhole, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, Breadcrumbs, EmptyState, ErrorState, Skeleton } from "../components/ui";
import { BlueprintCard, IllustrativeNotice, ImplementationCard, RightsBadge, SectionIntro, StalenessBadge } from "../components/intelligence";
import { useActions, useUI } from "../state";
import { isPublicRecord, useIntelligence } from "../data/intelligence-hooks";
import { blueprintFreshness, implementationFreshness } from "../data/staleness";
import { buildManifest, downloadJson, toCycloneDx, toSpdx } from "../data/manifest";
import { canReuse, blueprintPublicationGate, rightsCatalogue } from "../data/rights";
import { sanitizationChecklist } from "../data/sanitization";
import { capabilityLabel } from "../data/taxonomy";
import { track } from "../data/analytics";
import { isSupabase } from "../data/repository";

const ArchitectureMap = lazy(() => import("../components/ArchitectureMap"));

export default function Blueprints() {
  const { slug } = useParams();
  return slug ? <BlueprintDetail slug={slug} /> : <BlueprintList />;
}

function BlueprintList() {
  const data = useIntelligence();
  const [params, setParams] = useSearchParams();
  const rights = params.get("rights") ?? "";
  const useCase = params.get("useCase") ?? "";
  if (data.isLoading) return <Skeleton />;
  if (data.isError) return <ErrorState retry={data.refetch} />;
  const now = new Date();
  const published = data.blueprints
    .filter((blueprint) => blueprint.publicationState === "published" && blueprint.moderationState === "approved")
    .filter((blueprint) => (!rights || blueprint.reuseRights === rights) && (!useCase || blueprint.useCaseIds.includes(useCase)));
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  return (
    <>
      <PageHeading
        eyebrow="REUSABLE BLUEPRINTS"
        title="Reuse the pattern — not the customer’s private system."
        description="Blueprints are sanitized, versioned reference architectures with explicit reuse rights. They are separate from implementation records: a public record never grants reuse permission."
        action={<Link className="button dark" to="/solution-compiler">Adapt to my context <ArrowRight size={17} aria-hidden /></Link>}
      />
      <div className="blueprint-principles card">
        <div><LockKeyhole size={22} aria-hidden /><strong>Sanitized</strong><span>Publishers confirm credentials, customer data, schemas and private logic are removed.</span></div>
        <div><GitBranch size={22} aria-hidden /><strong>Versioned</strong><span>Each version keeps its own manifest, validation date and change notes.</span></div>
        <div><FileKey2 size={22} aria-hidden /><strong>Rights-aware</strong><span>Showcase, reference, personal, commercial, open-source or custom terms.</span></div>
      </div>
      <div className="card implementation-filter-bar">
        <div className="intelligence-filter-controls">
          <label>
            Reuse rights
            <select value={rights} onChange={(event) => set("rights", event.target.value)}>
              <option value="">Any rights</option>
              {Object.entries(rightsCatalogue).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}
            </select>
          </label>
          <label>
            Use case
            <select value={useCase} onChange={(event) => set("useCase", event.target.value)}>
              <option value="">Any use case</option>
              {data.useCases.filter((item) => data.blueprints.some((blueprint) => blueprint.useCaseIds.includes(item.id))).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="grid three blueprint-list-grid">
        {published.map((blueprint) => {
          const version = data.versions.find((item) => item.id === blueprint.currentVersionId);
          const items = data.blueprintItems.filter((item) => item.blueprintVersionId === blueprint.currentVersionId);
          return (
            <BlueprintCard
              key={blueprint.id}
              blueprint={blueprint}
              version={version}
              stackItems={items}
              products={data.products}
              freshness={blueprintFreshness(blueprint, version, items, data.products, data.relationships, data.checks, now).state}
            />
          );
        })}
      </div>
      {!published.length && <EmptyState title="No Blueprints match" description="Reusable assets appear only once rights, sanitization and moderation are complete." to="/blueprints" action="Clear filters" />}
    </>
  );
}

function BlueprintDetail({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const actions = useActions();
  const { userId, notify } = useUI();
  const data = useIntelligence();
  const [versionId, setVersionId] = useState("");
  const blueprint = data.blueprints.find((item) => item.slug === slug);
  useEffect(() => {
    if (blueprint?.id) track("blueprint_view", blueprint.id);
  }, [blueprint?.id]);

  if (data.isLoading) return <Skeleton />;
  if (data.isError) return <ErrorState retry={data.refetch} />;
  const visible = blueprint && ((blueprint.publicationState === "published" && blueprint.moderationState === "approved") || blueprint.ownerId === userId);
  if (!blueprint || !visible) return <EmptyState title="Blueprint not found" description="It may be private, a draft, or not yet approved." to="/blueprints" action="Explore Blueprints" />;

  const now = new Date();
  const versions = data.versions.filter((version) => version.blueprintId === blueprint.id).sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  const version = versions.find((item) => item.id === versionId) ?? versions.find((item) => item.id === blueprint.currentVersionId) ?? versions[0];
  const isCurrent = version?.id === blueprint.currentVersionId;
  const items = data.blueprintItems.filter((item) => item.blueprintVersionId === version?.id);
  const edges = data.blueprintConnections.filter((edge) => edge.blueprintVersionId === version?.id);
  const freshness = blueprintFreshness(blueprint, version, items, data.products, data.relationships, data.checks, now);
  const license = data.licenses.find((item) => item.blueprintId === blueprint.id);
  const gate = blueprintPublicationGate(blueprint);
  const source = data.implementations.find((record) => record.id === blueprint.derivedFromImplementationId && isPublicRecord(record));
  const productIds = new Set(items.flatMap((item) => (item.productId ? [item.productId] : [])));
  const usedBy = data.implementations.filter((record) => {
    if (!isPublicRecord(record) || record.id === source?.id) return false;
    const stack = data.stackItems.filter((item) => item.implementationId === record.id).map((item) => item.productId);
    return stack.filter((id) => productIds.has(id)).length >= Math.max(2, Math.ceil(productIds.size * 0.6));
  });
  const manifest = version
    ? buildManifest({ blueprint, version, items: data.blueprintItems, connections: data.blueprintConnections, requirements: data.requirements, license, products: data.products, providers: data.providers })
    : null;
  const reference = canReuse(blueprint, "reference");
  const commercial = canReuse(blueprint, "commercial");

  async function request() {
    if (!blueprint) return;
    if (isSupabase && !userId) {
      notify("Sign in before creating a private requirement.");
      navigate("/sign-in");
      return;
    }
    const id = crypto.randomUUID();
    try {
      await actions.save("projects", {
        id,
        name: `Implement: ${blueprint.name}`,
        sourceBlueprintId: blueprint.id,
        sourceImplementationId: blueprint.derivedFromImplementationId,
        sourceStackProductIds: [...productIds],
        description: `Private requirement seeded from Blueprint “${blueprint.name}” v${version?.version}. Rights: ${rightsCatalogue[blueprint.reuseRights].label}. Validate every integration for your context.`,
        contextSummary: "Describe your business context before inviting proposals.",
        category: "automation",
        budget: "To be discussed",
        timeline: "To be discussed",
        status: "draft",
        capabilities: blueprint.capabilityIds,
        desiredOutcomes: blueprint.useCaseIds,
        currentSystems: [],
        provenance: isSupabase ? "community supplied" : "demo",
      });
    } catch {
      return;
    }
    track("blueprint_started", blueprint.id);
    notify("Private requirement created from this Blueprint.");
    navigate(`/app/projects/${id}`);
  }

  return (
    <>
      <Breadcrumbs items={[{ name: "Blueprints", to: "/blueprints" }, { name: blueprint.name }]} />
      <header className="blueprint-detail-hero">
        <div>
          <div className="row wrap">
            <Badge>{blueprint.demo ? "DEMO BLUEPRINT" : "BLUEPRINT"}</Badge>
            <RightsBadge rights={blueprint.reuseRights} />
            <StalenessBadge state={freshness.state} />
            {blueprint.publicationState !== "published" && <Badge>DRAFT · not public</Badge>}
          </div>
          <PageHeading eyebrow="SANITIZED REFERENCE ARCHITECTURE" title={blueprint.name} description={blueprint.description} />
          <div className="tags">{blueprint.capabilityIds.map((capability) => <span key={capability}>{capabilityLabel(capability)}</span>)}</div>
          {blueprint.demo && <IllustrativeNotice>Demo Blueprint. Component relationships, estimates and license text are illustrative.</IllustrativeNotice>}
        </div>
        <aside className="card blueprint-action-card">
          <strong>Reuse state</strong>
          <dl className="detail-list">
            <div><dt>Rights</dt><dd>{rightsCatalogue[blueprint.reuseRights].label}</dd></div>
            <div><dt>Reference use</dt><dd>{reference.allowed === true ? "Permitted" : reference.allowed === "conditional" ? "Check terms" : "Not permitted"}</dd></div>
            <div><dt>Commercial use</dt><dd>{commercial.allowed === true ? "Permitted" : commercial.allowed === "conditional" ? "Check terms" : "Not granted"}</dd></div>
            <div><dt>Source available</dt><dd>{blueprint.sourceAvailable ? "Yes" : "No"}</dd></div>
            <div><dt>Maintainer</dt><dd>{blueprint.maintainerId}</dd></div>
          </dl>
          <button className="button dark" type="button" onClick={() => void request()}>Request implementation <ArrowRight size={17} aria-hidden /></button>
          <p className="muted small-print">An implementer delivers it for you. Public visibility is not a license.</p>
        </aside>
      </header>

      <section className="blueprint-version-bar card" aria-label="Version history">
        <div>
          <span className="eyebrow">VERSION HISTORY</span>
          <strong>{isCurrent ? "Viewing the current version." : "Viewing a historical version — not the current recommendation."}</strong>
          <small className="muted">{version?.changeNotes}</small>
        </div>
        <label>
          Version
          <select value={version?.id ?? ""} onChange={(event) => setVersionId(event.target.value)}>
            {versions.map((item) => (
              <option key={item.id} value={item.id}>v{item.version} · {item.createdAt ?? item.lastValidatedAt}{item.id === blueprint.currentVersionId ? " · current" : ""}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="intelligence-section">
        <SectionIntro eyebrow="REFERENCE ARCHITECTURE" title={`Capability slots in v${version?.version}`}>Dashed slots can take the recorded alternatives. Swapping a component requires re-checking compatibility — the Solution Compiler does this for you.</SectionIntro>
        <Suspense fallback={<div className="card skeleton architecture-skeleton" role="status" aria-label="Loading architecture" />}>
          <ArchitectureMap
            key={version?.id}
            kind="reference"
            title={`${blueprint.name} v${version?.version}`}
            nodes={items.map((item) => ({ id: item.id, productId: item.productId, capabilityId: item.capabilityId, role: item.role, alternatives: item.alternativeProductIds }))}
            edges={edges.map((edge) => ({ id: edge.id, from: edge.fromItemId, to: edge.toItemId, label: edge.label, dataFlow: edge.dataFlow, trustBoundary: edge.trustBoundary }))}
            products={data.products}
            relationships={data.relationships}
          />
        </Suspense>
      </section>

      <div className="blueprint-detail-columns">
        <section>
          <SectionIntro eyebrow="REQUIREMENTS" title="What you still need to provide" />
          <div className="blueprint-requirements">
            {data.requirements.filter((item) => item.blueprintId === blueprint.id).map((requirement) => (
              <div className="card" key={requirement.id}>
                <CheckCircle2 size={19} aria-hidden />
                <div><strong>{requirement.name}</strong><p>{requirement.description}</p><span>{requirement.type} · {requirement.required ? "required" : "optional"}</span></div>
              </div>
            ))}
          </div>
          <div className="card blueprint-limitations">
            <ShieldAlert size={22} aria-hidden />
            <div>
              <h3>Known limitations</h3>
              <p>{blueprint.knownLimitations}</p>
              {blueprint.setupNotes && <p><strong>Setup notes:</strong> {blueprint.setupNotes}</p>}
              <p><strong>Skills:</strong> {blueprint.requiredSkills.join(", ")} · <strong>Complexity:</strong> {blueprint.estimatedComplexity}</p>
            </div>
          </div>
          <div className="card manifest-card">
            <h3>Machine-readable manifest</h3>
            <p className="muted">Oracnet’s canonical model, exported to open standards for tooling. Third-party SaaS components are listed as services; their licenses are NOASSERTION.</p>
            {manifest && (
              <div className="row wrap">
                <button type="button" className="button light" onClick={() => downloadJson(`${blueprint.slug}-v${version?.version}-manifest.json`, manifest)}><Download size={15} aria-hidden /> Oracnet manifest</button>
                <button type="button" className="button light" onClick={() => downloadJson(`${blueprint.slug}-v${version?.version}.cdx.json`, toCycloneDx(manifest))}><Download size={15} aria-hidden /> CycloneDX 1.7</button>
                <button type="button" className="button light" onClick={() => downloadJson(`${blueprint.slug}-v${version?.version}.spdx.json`, toSpdx(manifest))}><Download size={15} aria-hidden /> SPDX 2.3</button>
              </div>
            )}
          </div>
        </section>
        <aside>
          <div className="card blueprint-license-card">
            <FileKey2 size={22} aria-hidden />
            <h3>Rights & license</h3>
            <RightsBadge rights={blueprint.reuseRights} />
            <p>{rightsCatalogue[blueprint.reuseRights].description}</p>
            <p className="muted">{license?.licenseText ?? blueprint.license}</p>
            <dl className="detail-list">
              <div><dt>Attribution</dt><dd>{license?.attributionRequired ? "Required" : "Not specified"}</dd></div>
              <div><dt>Rights declared</dt><dd>{blueprint.rightsDeclaredAt ?? "Not declared"}</dd></div>
            </dl>
          </div>
          <div className="card">
            <ShieldCheck size={22} aria-hidden />
            <h3>Sanitization</h3>
            {blueprint.sanitizationConfirmedAt ? (
              <p>Publisher confirmed all {sanitizationChecklist.length} checklist items on {blueprint.sanitizationConfirmedAt}. Automated scanning assists but does not guarantee removal.</p>
            ) : (
              <p>Sanitization has not been confirmed — this Blueprint cannot be published.</p>
            )}
            {!gate.ready && <ul className="gate-list">{gate.missing.map((item) => <li key={item}>{item}</li>)}</ul>}
          </div>
          <div className="card blueprint-maintenance-card">
            <Wrench size={22} aria-hidden />
            <h3>Compatibility freshness</h3>
            <StalenessBadge state={freshness.state} />
            <ul className="freshness-reasons">{freshness.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            {version?.compatibilityNotes && <p className="muted">{version.compatibilityNotes}</p>}
          </div>
        </aside>
      </div>

      {source && (
        <section className="intelligence-section">
          <SectionIntro eyebrow="DERIVED FROM" title="The implementation record stays separate">This Blueprint points back to the record that inspired it without copying customer-specific data.</SectionIntro>
          <div className="grid two">
            <ImplementationCard
              implementation={source}
              context={data.contexts.find((context) => context.implementationId === source.id)}
              metrics={data.metrics.filter((metric) => metric.implementationId === source.id)}
              metricDefinitions={data.definitions}
              freshness={implementationFreshness(source, now).state}
            />
          </div>
        </section>
      )}
      {!!usedBy.length && (
        <section className="intelligence-section">
          <SectionIntro eyebrow="SIMILAR RECORDED STACKS" title="Other records using most of these components" />
          <div className="grid two">
            {usedBy.map((record) => (
              <ImplementationCard key={record.id} implementation={record} context={data.contexts.find((context) => context.implementationId === record.id)} metrics={data.metrics.filter((metric) => metric.implementationId === record.id)} metricDefinitions={data.definitions} freshness={implementationFreshness(record, now).state} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
