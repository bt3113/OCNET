import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CalendarDays, CircleDollarSign, Download, FileKey2, GitBranch, Layers3, MessageSquare, Send, Users, Wrench } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, Breadcrumbs, EmptyState, ErrorState, Logo, Skeleton } from "../components/ui";
import {
  BeforeAfterProcess,
  BlueprintCard,
  ClaimsPanel,
  ContextSimilarityPanel,
  ContextSummary,
  EvidenceBadge,
  IllustrativeNotice,
  ImplementationCard,
  MetricCard,
  MetricProvenanceDrawer,
  ProvenanceTimeline,
  RightsBadge,
  SectionIntro,
  StalenessBadge,
  implementationCostLabel,
} from "../components/intelligence";
import { useActions, useUI } from "../state";
import { implementationBundle, isPublicRecord, provBundle, useIntelligence } from "../data/intelligence-hooks";
import { implementationFreshness, blueprintFreshness } from "../data/staleness";
import { evidenceCoverage } from "../data/evidence";
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

const sections = [
  ["problem", "Problem"],
  ["context", "Context"],
  ["process", "Process change"],
  ["architecture", "Architecture"],
  ["stack", "Stack"],
  ["timeline", "Implementation"],
  ["economics", "Economics"],
  ["outcomes", "Outcomes"],
  ["evidence", "Claims & evidence"],
  ["reuse", "Reuse"],
  ["alternatives", "Alternatives"],
  ["request", "Request similar"],
] as const;

export default function ImplementationDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const actions = useActions();
  const { userId, notify, setContact } = useUI();
  const data = useIntelligence();
  const [metric, setMetric] = useState<ImplementationMetric | null>(null);
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

  return (
    <>
      <Breadcrumbs items={[{ name: "Implementations", to: "/implementations" }, { name: record.name }]} />
      <header className="implementation-detail-hero">
        <div>
          <div className="row wrap implementation-badges">
            <Badge>{record.demo ? "ILLUSTRATIVE RECORD" : "IMPLEMENTATION RECORD"}</Badge>
            <EvidenceBadge level={record.verificationState} />
            <StalenessBadge state={freshness.state} />
          </div>
          <PageHeading eyebrow="IMPLEMENTATION RECORD" title={record.name} description={record.summary} />
          <dl className="implementation-header-facts">
            <div><dt>Business</dt><dd>{record.businessType} · {record.organizationSizeBand}</dd></div>
            <div><dt>Industry</dt><dd>{record.industry}</dd></div>
            <div><dt>Use case</dt><dd>{useCases.map((useCase) => <Link key={useCase.id} to={`/use-cases/${useCase.slug}`}>{useCase.name}</Link>)}</dd></div>
            <div><dt>Went live</dt><dd>{record.goLiveDate ?? "Not disclosed"}</dd></div>
            <div><dt>Implementer</dt><dd>{implementers.map((partner) => <Link key={partner.id} to={`/implementers/${partner.slug}`}>{partner.name}</Link>)}{!implementers.length && "Not recorded"}</dd></div>
            <div><dt>Evidence last reviewed</dt><dd>{record.lastEvidenceReviewAt}</dd></div>
          </dl>
          {record.demo && <IllustrativeNotice />}
        </div>
        <aside className="implementation-hero-actions card">
          <strong>Use this as evidence, not a promise.</strong>
          <p>{coverage.summary} Freshness: {freshness.reasons[0]}</p>
          <a className="button dark" href="#request">Build something like this <ArrowRight size={17} aria-hidden /></a>
          {derived[0] && <Link className="button light" to={`/blueprints/${derived[0].slug}`}>Open reusable Blueprint <GitBranch size={16} aria-hidden /></Link>}
          <Link className="button light" to={`/compare/implementations?ids=${encodeURIComponent([record.id, ...alternatives.slice(0, 1).map((entry) => entry.item.id)].join(","))}`}>Compare with an alternative</Link>
        </aside>
      </header>

      <nav className="section-nav" aria-label="On this page">
        {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <section className="intelligence-section" id="problem">
        <SectionIntro eyebrow="THE PROBLEM" title="What was not working" />
        <p className="lead-text card">{record.problemStatement ?? "Not recorded."}</p>
      </section>

      <section className="intelligence-section" id="context">
        <SectionIntro eyebrow="BUSINESS CONTEXT" title="Who this describes">Read the context before the outcome: the same architecture behaves differently in a different business.</SectionIntro>
        <ContextSummary implementation={record} context={bundle.context} />
      </section>

      <section className="intelligence-section" id="process">
        <SectionIntro eyebrow="BEFORE → PROCESS CHANGE → AFTER" title="How the work changed">The operating change is recorded separately from the technology that supports it.</SectionIntro>
        <BeforeAfterProcess steps={bundle.steps} />
      </section>

      <section className="intelligence-section" id="architecture">
        <SectionIntro eyebrow="ARCHITECTURE" title="Recorded components and data flows">Components appearing together here do not by themselves prove official product compatibility.</SectionIntro>
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

      <section className="intelligence-section" id="stack">
        <SectionIntro eyebrow="TECHNOLOGY STACK" title="Components by capability" />
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

      <section className="intelligence-section" id="timeline">
        <SectionIntro eyebrow="IMPLEMENTATION PROCESS" title="Dates and measurement windows" />
        <ol className="implementation-timeline card">
          <li><CalendarDays size={16} aria-hidden /><span><strong>Baseline measured</strong><small>{record.baselinePeriodStart ?? "?"} → {record.baselinePeriodEnd ?? "?"}</small></span></li>
          <li><Wrench size={16} aria-hidden /><span><strong>Implementation started</strong><small>{record.implementationStartDate ?? "Not disclosed"}</small></span></li>
          <li><Send size={16} aria-hidden /><span><strong>Went live</strong><small>{record.goLiveDate ?? "Not disclosed"} · {record.implementationDuration}</small></span></li>
          <li><CalendarDays size={16} aria-hidden /><span><strong>Outcomes observed</strong><small>{record.measurementPeriodStart ?? "?"} → {record.measurementPeriodEnd ?? "?"}</small></span></li>
        </ol>
      </section>

      <section className="intelligence-section" id="economics">
        <SectionIntro eyebrow="ECONOMICS" title="What the record discloses">Missing values stay missing. {record.demo ? "All values are illustrative." : ""}</SectionIntro>
        <div className="economics-grid">
          <div className="card economics-card"><CircleDollarSign size={22} aria-hidden /><small>Setup cost</small><strong>{implementationCostLabel(record)}</strong><span>Disclosure: {record.costDisclosureType.replaceAll("-", " ")}</span></div>
          <div className="card economics-card"><CircleDollarSign size={22} aria-hidden /><small>Ongoing software cost</small><strong>{record.ongoingMonthlyCost == null ? "Not disclosed" : `£${record.ongoingMonthlyCost.toLocaleString("en-GB")} / month`}</strong><span>Disclosure: {record.ongoingCostDisclosureType.replaceAll("-", " ")}</span></div>
          <div className="card economics-card"><Wrench size={22} aria-hidden /><small>Maintenance</small><strong>{record.maintenanceHoursPerMonth == null ? "Not disclosed" : `${record.maintenanceHoursPerMonth} h / month`}</strong><span>Burden: {record.maintenanceBurden ?? "not stated"}</span></div>
          <div className="card economics-card"><CalendarDays size={22} aria-hidden /><small>Duration</small><strong>{record.implementationDuration}</strong><span>Start to go-live</span></div>
        </div>
      </section>

      <section className="intelligence-section" id="outcomes">
        <SectionIntro eyebrow="OBSERVED OUTCOMES" title="Baseline and observed values">Each value shows its own period and source. “Observed after implementation” is not a causal claim and not a forecast for your business.</SectionIntro>
        <div className="metric-grid">
          {bundle.metrics.map((item) => (
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
        {record.knownLimitations && <p className="notice limitations-note"><strong>Known limitations:</strong> {record.knownLimitations}</p>}
      </section>

      <section className="intelligence-section" id="evidence">
        <SectionIntro eyebrow="CLAIMS & EVIDENCE" title="Evidence is attached to individual claims">{coverage.summary} Open a claim to see its claimant, method, evidence and review history.</SectionIntro>
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

      <section className="intelligence-section" id="reuse">
        <SectionIntro eyebrow="WHAT IS REUSABLE" title="The record and the reusable pattern are separate">Publishing a record does not grant anyone the right to reuse the customer’s configuration.</SectionIntro>
        <div className="reuse-grid">
          <div className="card">
            <FileKey2 size={22} aria-hidden />
            <h3>This record</h3>
            <RightsBadge rights={record.rightsState} />
            <p>{rightsCatalogue[record.rightsState].description}</p>
          </div>
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
          {!derived.length && <div className="card"><Layers3 size={22} aria-hidden /><h3>No published Blueprint</h3><p>No sanitized, rights-declared Blueprint has been derived from this record.</p></div>}
        </div>
      </section>

      <section className="intelligence-section" id="alternatives">
        <SectionIntro eyebrow="ALTERNATIVE IMPLEMENTATIONS" title="Other ways businesses approached this">Ranked by same outcome, then context similarity to this record.</SectionIntro>
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
              <ContextSimilarityPanel similarity={similarity} title="Compared with this record" />
              <Link className="text-button" to={`/compare/implementations?ids=${encodeURIComponent(`${record.id},${item.id}`)}`}>Compare side by side <ArrowRight size={14} aria-hidden /></Link>
            </div>
          ))}
        </div>
      </section>

      {!!implementers.length && (
        <section className="intelligence-section">
          <SectionIntro eyebrow="IMPLEMENTERS" title="Who delivered it" />
          <div className="grid two">
            {implementers.map((partner) => (
              <Link className="card implementer-evidence-card" key={partner.id} to={`/implementers/${partner.slug}`}>
                <Logo initials={partner.initials} color={partner.color} />
                <div>
                  <strong>{partner.name}</strong>
                  <p>{partner.description}</p>
                  <span>{data.implementations.filter((item) => item.implementerIds.includes(partner.id) && isPublicRecord(item)).length} published implementation records <ArrowRight size={14} aria-hidden /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="intelligence-section" id="request">
        <SectionIntro eyebrow="REQUEST SOMETHING SIMILAR" title="Turn this record into your own requirement">Every option starts a private, editable requirement. Nothing is sent to suppliers without your review{isSupabase ? "" : ", and the demo never contacts anyone"}.</SectionIntro>
        <div className="request-options">
          <button type="button" className="card request-option" disabled={!implementers.length} onClick={() => { if (implementers[0]) { setContact(implementers[0]); track("implementer_contacted", implementers[0].id); } }}>
            <MessageSquare size={22} aria-hidden />
            <strong>Contact the original implementer</strong>
            <span>{implementers[0] ? `Message ${implementers[0].name}.` : "No implementer recorded."}</span>
          </button>
          <button type="button" className="card request-option" onClick={() => void createRequest("competing")}>
            <Users size={22} aria-hidden />
            <strong>Request competing proposals</strong>
            <span>Open a requirement to several implementers.</span>
          </button>
          {derived[0] ? (
            <Link className="card request-option" to={`/blueprints/${derived[0].slug}`}>
              <Layers3 size={22} aria-hidden />
              <strong>Start from the Blueprint</strong>
              <span>Use the sanitized pattern, not the customer system.</span>
            </Link>
          ) : (
            <div className="card request-option disabled" aria-disabled="true">
              <Layers3 size={22} aria-hidden />
              <strong>Start from a Blueprint</strong>
              <span>No Blueprint derived from this record.</span>
            </div>
          )}
          <button type="button" className="card request-option" onClick={() => void createRequest("private")}>
            <FileKey2 size={22} aria-hidden />
            <strong>Create a private requirement</strong>
            <span>Prefilled with context, capabilities and systems — all editable.</span>
          </button>
        </div>
      </section>

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
