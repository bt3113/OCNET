import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useSolutionProviders } from "../data/marketplace-hooks";
import { providerForImplementer } from "../data/solution-providers";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarDays, CircleDollarSign, Download, FileKey2, GitBranch, MessageSquare, Send, Users, Wrench } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Breadcrumbs, EmptyState, ErrorState, Logo, Skeleton, TabbedSections } from "../components/ui";
import {
  BeforeAfterProcess,
  BlueprintCard,
  ClaimsPanel,
  ContextSimilarityPanel,
  ContextSummary,
  EvidenceBadge,
  ImplementationCard,
  MetricCard,
  MetricProvenanceDrawer,
  ProvenanceTimeline,
  RightsBadge,
  StalenessBadge,
  implementationCostLabel,
} from "../components/intelligence";
import { useActions, useRecords, useUI } from "../state";
import { implementationBundle, isPublicRecord, provBundle, useIntelligence } from "../data/intelligence-hooks";
import { implementationFreshness, blueprintFreshness } from "../data/staleness";
import { evidenceCoverage } from "../data/evidence";
import { formatMetricValue } from "../data/metrics";
import { compareContexts, contextFromImplementation } from "../data/context-similarity";
import { provenanceTimeline, toProvDocument } from "../data/provenance";
import { computeFingerprint } from "../data/fingerprint";
import { downloadJson } from "../data/manifest";
import { rightsCatalogue } from "../data/rights";
import { capabilityLabel } from "../data/taxonomy";
import { track } from "../data/analytics";
import { isSupabase } from "../data/repository";
import type { ImplementationMetric } from "../data/intelligence-model";

const ArchitectureMap = lazy(() => import("../components/ArchitectureMap"));


export default function ImplementationDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const actions = useActions();
  const { userId, notify, setContact } = useUI();
  const data = useIntelligence();
  const solutionProviderList = useSolutionProviders();
  const { data: allBuilds = [] } = useRecords("builds");
  const [metric, setMetric] = useState<ImplementationMetric | null>(null);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const hashTab: Record<string, string> = { problem: "overview", context: "overview", process: "overview", architecture: "architecture", stack: "architecture", timeline: "architecture", economics: "results", outcomes: "results", evidence: "evidence", reuse: "evidence", alternatives: "next", request: "next" };
  const tab = params.get("tab") ?? hashTab[location.hash.slice(1)] ?? "overview";
  const selectTab = (id: string) => {
    const nextParams = new URLSearchParams(params);
    if (id === "overview") nextParams.delete("tab");
    else nextParams.set("tab", id);
    setParams(nextParams, { replace: true });
  };
  const record = data.implementations.find((item) => item.slug === slug);
  const visible = record && (isPublicRecord(record) || record.ownerId === userId);

  useEffect(() => {
    if (record?.id) track("implementation_view", record.id);
  }, [record?.id]);

  const bundle = useMemo(() => (record ? implementationBundle(data, record) : null), [data, record]);

  if (data.isLoading) return <Skeleton />;
  if (data.isError) return <ErrorState retry={data.refetch} />;
  if (!record || !visible || !bundle)
    return <EmptyState title="Implementation record not found" description="It may be private, archived or not yet approved." to="/implementations" action="Explore implementations" />;

  const now = new Date();
  const freshness = implementationFreshness(record, now);
  const useCases = data.useCases.filter((useCase) => bundle.useCaseIds.includes(useCase.id));
  const implementers = data.implementers.filter((partner) => record.implementerIds.includes(partner.id));
  const sourceBuild = allBuilds.find((build) => build.id === record.sourceBuildId && build.visibility === "public" && build.publication === "published");
  const derived = data.blueprints.filter((blueprint) => record.derivedBlueprintIds.includes(blueprint.id) && blueprint.publicationState === "published" && blueprint.moderationState === "approved");
  const coverage = evidenceCoverage(bundle.claims.filter((claim) => claim.public));
  const timeline = provenanceTimeline(provBundle(bundle));
  const fingerprint = computeFingerprint({
    record,
    context: bundle.context,
    useCaseIds: bundle.useCaseIds,
    stackItems: bundle.stack,
    connections: bundle.connections,
    processSteps: bundle.steps,
    relationships: data.relationships,
  });
  const here = contextFromImplementation(record, bundle.context, bundle.useCaseIds);
  const alternatives = data.implementations
    .filter((item) => item.id !== record.id && isPublicRecord(item))
    .map((item) => {
      const itemUseCases = data.useCaseLinks.filter((link) => link.implementationId === item.id).map((link) => link.useCaseId);
      return {
        item,
        sameOutcome: itemUseCases.some((id) => bundle.useCaseIds.includes(id)),
        similarity: compareContexts(here, contextFromImplementation(item, data.contexts.find((context) => context.implementationId === item.id), itemUseCases)),
      };
    })
    .sort((a, b) => Number(b.sameOutcome) - Number(a.sameOutcome) || b.similarity.score - a.similarity.score)
    .slice(0, 3);

  async function createRequest(mode: "private" | "competing") {
    if (!record || !bundle) return;
    if (isSupabase && !userId) {
      notify("Sign in before creating a private requirement.");
      navigate("/sign-in");
      return;
    }
    const id = crypto.randomUUID();
    try {
      await actions.save("projects", {
        id,
        name: `Something like: ${record.name}`,
        sourceImplementationId: record.id,
        sourceBlueprintId: derived[0]?.id,
        sourceBuildId: record.sourceBuildId,
        sourceStackProductIds: bundle.stack.map((item) => item.productId),
        description: `Private requirement seeded from the implementation record “${record.name}”. Edit every assumption: this record describes another business.`,
        contextSummary: record.contextSummary,
        category: "automation",
        budget: "To be discussed",
        timeline: "To be discussed",
        status: mode === "competing" ? "open" : "draft",
        capabilities: [...new Set(bundle.stack.map((item) => item.capabilityId))],
        desiredOutcomes: bundle.metrics.map((item) => item.name),
        currentSystems: bundle.context?.existingSystems ?? [],
        provenance: isSupabase ? "community supplied" : "demo",
      });
    } catch {
      return;
    }
    track("implementation_request_started", record.id);
    notify(mode === "competing" ? "Requirement created and opened for proposals (demo — no suppliers are notified)." : "Private requirement created from this record.");
    navigate(`/app/projects/${id}`);
  }

  const period = (id?: string) => bundle.periods.find((item) => item.id === id);
  const definition = (id: string) => data.definitions.find((item) => item.id === id);
  const product = (id: string) => data.products.find((item) => item.id === id);

  const headline = ["first-response-time", "missed-enquiry-rate", "booking-rate", "qualified-lead-rate", "manual-handling-hours"]
    .map((id) => bundle.metrics.find((item) => item.metricDefinitionId === id && item.baselineValue != null && item.observedValue != null))
    .filter((item): item is ImplementationMetric => !!item)
    .slice(0, 3);
  const metricCards = (items: ImplementationMetric[]) => (
    <div className="metric-grid">
      {items.map((item) => (
        <MetricCard
          key={item.id}
          metric={item}
          definition={definition(item.metricDefinitionId)}
          period={period(item.measurementPeriodId)}
          demo={record.demo}
          onProvenance={() => {
            setMetric(item);
            track("metric_provenance_opened", item.id);
          }}
        />
      ))}
    </div>
  );

  const overview = (
    <>
      <section className="intelligence-section" aria-labelledby="problem-heading">
        <h2 id="problem-heading" className="tab-section-title">What was not working</h2>
        <p className="lead-text">{record.problemStatement ?? "Not recorded."}</p>
      </section>
      <section className="intelligence-section" aria-labelledby="process-heading">
        <h2 id="process-heading" className="tab-section-title">How the work changed</h2>
        <BeforeAfterProcess steps={bundle.steps} />
      </section>
      <section className="intelligence-section" aria-labelledby="context-heading">
        <h2 id="context-heading" className="tab-section-title">Business context</h2>
        <p className="tab-section-note">Read the context before the results: the same architecture behaves differently in a different business.</p>
        <ContextSummary implementation={record} context={bundle.context} />
      </section>
    </>
  );

  const architecture = (
    <>
      <section className="intelligence-section" aria-labelledby="architecture-heading">
        <h2 id="architecture-heading" className="tab-section-title">Components and data flows</h2>
        <p className="tab-section-note">Components used together here do not by themselves prove official product compatibility.</p>
        <Suspense fallback={<div className="card skeleton architecture-skeleton" role="status" aria-label="Loading architecture" />}>
          <ArchitectureMap
            kind="observed"
            title={record.name}
            nodes={bundle.stack.map((item) => ({ id: item.id, productId: item.productId, capabilityId: item.capabilityId, role: item.role, evidenceLevel: item.evidenceLevel }))}
            edges={bundle.connections.map((connection) => ({ id: connection.id, from: connection.fromItemId, to: connection.toItemId, label: connection.label, dataFlow: connection.dataFlow, trustBoundary: connection.trustBoundary }))}
            products={data.products}
            relationships={data.relationships}
          />
        </Suspense>
      </section>
      <section className="intelligence-section" aria-labelledby="stack-heading">
        <h2 id="stack-heading" className="tab-section-title">Components by capability</h2>
        <div className="stack-table card" role="list">
          {bundle.stack.map((item) => {
            const component = product(item.productId);
            return (
              <div role="listitem" key={item.id} className="stack-row">
                {component ? <Logo initials={component.initials} color={component.color} /> : <span className="logo-tile sand">?</span>}
                <span>
                  <small>{capabilityLabel(item.capabilityId)}</small>
                  {component ? <Link to={`/technologies/${component.slug}`}>{component.name}</Link> : <strong>{item.productId}</strong>}
                </span>
                <span className="muted">{item.role}</span>
                <EvidenceBadge level={item.evidenceLevel} compact />
              </div>
            );
          })}
        </div>
      </section>
      <section className="intelligence-section" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="tab-section-title">Timeline</h2>
        <ol className="implementation-timeline card">
          <li><CalendarDays size={16} aria-hidden /><span><strong>Baseline measured</strong><small>{record.baselinePeriodStart ?? "?"} → {record.baselinePeriodEnd ?? "?"}</small></span></li>
          <li><Wrench size={16} aria-hidden /><span><strong>Implementation started</strong><small>{record.implementationStartDate ?? "Not disclosed"}</small></span></li>
          <li><Send size={16} aria-hidden /><span><strong>Went live</strong><small>{record.goLiveDate ?? "Not disclosed"} · {record.implementationDuration}</small></span></li>
          <li><CalendarDays size={16} aria-hidden /><span><strong>Results observed</strong><small>{record.measurementPeriodStart ?? "?"} → {record.measurementPeriodEnd ?? "?"}</small></span></li>
        </ol>
      </section>
    </>
  );

  const results = (
    <>
      <section className="intelligence-section" aria-labelledby="outcomes-heading">
        <h2 id="outcomes-heading" className="tab-section-title">Baseline and observed values</h2>
        <p className="tab-section-note">Observed after implementation — not a causal claim and not a forecast for your business. Open “Provenance” on any value for its period, source and evidence.</p>
        {metricCards(bundle.metrics)}
        {record.knownLimitations && <p className="notice limitations-note"><strong>Known limitations:</strong> {record.knownLimitations}</p>}
      </section>
      <section className="intelligence-section" aria-labelledby="economics-heading">
        <h2 id="economics-heading" className="tab-section-title">Cost and effort</h2>
        <p className="tab-section-note">Missing values stay missing.{record.demo ? " All values are illustrative." : ""}</p>
        <div className="economics-grid">
          <div className="card economics-card"><CircleDollarSign size={22} aria-hidden /><small>Setup cost</small><strong>{implementationCostLabel(record)}</strong><span>Disclosure: {record.costDisclosureType.replaceAll("-", " ")}</span></div>
          <div className="card economics-card"><CircleDollarSign size={22} aria-hidden /><small>Ongoing software cost</small><strong>{record.ongoingMonthlyCost == null ? "Not disclosed" : `£${record.ongoingMonthlyCost.toLocaleString("en-GB")} / month`}</strong><span>Disclosure: {record.ongoingCostDisclosureType.replaceAll("-", " ")}</span></div>
          <div className="card economics-card"><Wrench size={22} aria-hidden /><small>Maintenance</small><strong>{record.maintenanceHoursPerMonth == null ? "Not disclosed" : `${record.maintenanceHoursPerMonth} h / month`}</strong><span>Burden: {record.maintenanceBurden ?? "not stated"}</span></div>
          <div className="card economics-card"><CalendarDays size={22} aria-hidden /><small>Duration</small><strong>{record.implementationDuration}</strong><span>Start to go-live</span></div>
        </div>
      </section>
    </>
  );

  const evidence = (
    <>
      <section className="intelligence-section" aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="tab-section-title">Evidence for each claim</h2>
        <p className="tab-section-note">{coverage.summary} Open a claim to see who made it, how it was measured and how it was reviewed.</p>
        <div className="evidence-layout">
          <ClaimsPanel claims={bundle.claims} links={bundle.links} artifacts={bundle.artifacts} reviews={bundle.reviews} />
          <aside className="card">
            <h3>Provenance history</h3>
            <ProvenanceTimeline events={timeline} />
            <button type="button" className="button light" onClick={() => downloadJson(`${record.slug}-prov.json`, toProvDocument(provBundle(bundle)))}>
              <Download size={15} aria-hidden /> Export W3C PROV-JSON
            </button>
            <details className="fingerprint-details">
              <summary>Implementation fingerprint v{fingerprint.fingerprintVersion}</summary>
              <p className="muted">Normalized public attributes used for similarity and duplicate detection. <code>{fingerprint.digest.slice(0, 16)}</code></p>
              <p className="muted">{fingerprint.tokens.filter((token) => token.startsWith("cap:") || token.startsWith("edge:")).length} capability / handoff tokens · no customer-identifying fields.</p>
            </details>
          </aside>
        </div>
      </section>
      <section className="intelligence-section" aria-labelledby="rights-heading">
        <h2 id="rights-heading" className="tab-section-title">Reuse rights for this record</h2>
        <div className="card record-rights">
          <RightsBadge rights={record.rightsState} />
          <p>{rightsCatalogue[record.rightsState].description} Publishing a record does not grant anyone the right to reuse the customer’s configuration.</p>
        </div>
      </section>
    </>
  );

  const next = (
    <>
      <section className="intelligence-section" aria-labelledby="request-heading">
        <h2 id="request-heading" className="tab-section-title">Get something similar</h2>
        <p className="tab-section-note">Each option starts a private, editable requirement. Nothing is sent to suppliers without your review{isSupabase ? "" : ", and the demo never contacts anyone"}.</p>
        <div className="request-options">
          <button type="button" className="card request-option" onClick={() => void createRequest("private")}>
            <FileKey2 size={22} aria-hidden />
            <strong>Create a private requirement</strong>
            <span>Prefilled with context, capabilities and systems — all editable.</span>
          </button>
          <button type="button" className="card request-option" onClick={() => void createRequest("competing")}>
            <Users size={22} aria-hidden />
            <strong>Request competing proposals</strong>
            <span>Open a requirement to several implementers.</span>
          </button>
          <button type="button" className="card request-option" disabled={!implementers.length} onClick={() => { if (implementers[0]) { setContact(implementers[0]); track("implementer_contacted", implementers[0].id); } }}>
            <MessageSquare size={22} aria-hidden />
            <strong>Contact the original implementer</strong>
            <span>{implementers[0] ? `Message ${implementers[0].name}.` : "No implementer recorded."}</span>
          </button>
        </div>
      </section>
      {!!derived.length && (
        <section className="intelligence-section" aria-labelledby="blueprint-heading">
          <h2 id="blueprint-heading" className="tab-section-title">Reusable Blueprint</h2>
          <p className="tab-section-note">A sanitized pattern derived from this record, with its own rights — not the customer’s system.</p>
          <div className="grid three">
            {derived.map((blueprint) => {
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
        </section>
      )}
      <section className="intelligence-section" aria-labelledby="alternatives-heading">
        <h2 id="alternatives-heading" className="tab-section-title">Similar implementations</h2>
        <p className="tab-section-note">Same outcome first, then closest business context.</p>
        <div className="alternative-grid">
          {alternatives.map(({ item, similarity }) => (
            <div key={item.id} className="comparable-pair">
              <ImplementationCard
                implementation={item}
                context={data.contexts.find((context) => context.implementationId === item.id)}
                metrics={data.metrics.filter((entry) => entry.implementationId === item.id)}
                metricDefinitions={data.definitions}
                freshness={implementationFreshness(item, now).state}
              />
              <details className="similarity-details">
                <summary>Why this is similar — {similarity.level} context match</summary>
                <ContextSimilarityPanel similarity={similarity} title="Compared with this record" />
              </details>
              <Link className="text-button" to={`/compare/implementations?ids=${encodeURIComponent(`${record.id},${item.id}`)}`}>Compare side by side <ArrowRight size={14} aria-hidden /></Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  return (
    <>
      <Breadcrumbs items={[{ name: "Implementations", to: "/implementations" }, { name: record.name }]} />
      <header className="implementation-detail-hero">
        <div>
          <PageHeading eyebrow={`IMPLEMENTATION RECORD · ${record.industry.toUpperCase()}`} title={record.name} description={record.summary} />
          <div className="row wrap implementation-badges">
            <EvidenceBadge level={record.verificationState} />
            <StalenessBadge state={freshness.state} />
            {useCases.map((useCase) => <Link key={useCase.id} className="chip-link" to={`/use-cases/${useCase.slug}`}>{useCase.name}</Link>)}
          </div>
          <dl className="implementation-header-facts">
            <div><dt>Business</dt><dd>{record.businessType}</dd></div>
            <div><dt>Size</dt><dd>{record.organizationSizeBand}</dd></div>
            <div><dt>Region</dt><dd>{record.region}</dd></div>
            <div><dt>Went live</dt><dd>{record.goLiveDate ?? "Not disclosed"}</dd></div>
            <div><dt>Setup cost</dt><dd>{implementationCostLabel(record)}</dd></div>
            {sourceBuild && <div><dt>Build used</dt><dd><Link to={`/builds/${sourceBuild.slug}`}>{sourceBuild.name}</Link></dd></div>}
            <div><dt>Solution Provider</dt><dd>{implementers.map((partner) => <Link key={partner.id} to={providerForImplementer(solutionProviderList, partner.id) ? `/solution-providers/${providerForImplementer(solutionProviderList, partner.id)!.slug}` : `/solution-providers`}>{partner.name}</Link>)}{!implementers.length && "Not recorded"}</dd></div>
          </dl>
        </div>
        <aside className="implementation-hero-actions card">
          <strong>Want something like this?</strong>
          <p>Start a private requirement from this record, or reuse its Blueprint.</p>
          <button type="button" className="button dark" onClick={() => selectTab("next")}>Get something similar <ArrowRight size={17} aria-hidden /></button>
          {derived[0] && <Link className="button light" to={`/blueprints/${derived[0].slug}`}>Open reusable Blueprint <GitBranch size={16} aria-hidden /></Link>}
          <Link className="button light" to={`/compare/implementations?ids=${encodeURIComponent([record.id, ...alternatives.slice(0, 1).map((entry) => entry.item.id)].join(","))}`}>Compare with an alternative</Link>
          <small className="muted">{coverage.summary}</small>
        </aside>
      </header>

      {!!headline.length && (
        <section className="headline-results" aria-label="Key observed results">
          {headline.map((item) => (
            <div key={item.id} className="headline-result">
              <small>{definition(item.metricDefinitionId)?.name ?? item.name}</small>
              <strong>{formatMetricValue(item.baselineValue, item.unit)} <span aria-hidden>→</span><span className="sr-only">to</span> {formatMetricValue(item.observedValue, item.unit)}</strong>
              <span>baseline → observed after implementation</span>
            </div>
          ))}
        </section>
      )}

      <TabbedSections
        label="Implementation record sections"
        active={tab}
        onChange={selectTab}
        tabs={[
          { id: "overview", label: "Overview", content: overview },
          { id: "architecture", label: "Architecture", count: bundle.stack.length, content: architecture },
          { id: "results", label: "Results & cost", count: bundle.metrics.length, content: results },
          { id: "evidence", label: "Evidence", count: bundle.claims.filter((claim) => claim.public).length, content: evidence },
          { id: "next", label: "Similar & next steps", content: next },
        ]}
      />

      <MetricProvenanceDrawer
        metric={metric}
        definition={metric ? definition(metric.metricDefinitionId) : undefined}
        periods={bundle.periods}
        claims={bundle.claims}
        links={bundle.links}
        artifacts={bundle.artifacts}
        reviews={bundle.reviews}
        demo={record.demo}
        onClose={() => setMetric(null)}
      />
    </>
  );
}
