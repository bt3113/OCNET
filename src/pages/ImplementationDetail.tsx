import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  GitBranch,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { PageHeading } from "../components/layout";
import {
  Badge,
  Breadcrumbs,
  ButtonLink,
  EmptyState,
  ErrorState,
  Modal,
  Skeleton,
} from "../components/ui";
import {
  BeforeAfterProcess,
  BlueprintCard,
  ClaimEvidencePanel,
  ContextSummary,
  EvidenceBadge,
  EvidencePrincipleNotice,
  ImplementationArchitecture,
  ImplementationCard,
  MetricCard,
  StalenessBadge,
} from "../components/intelligence";
import { useActions, useRecords, useUI } from "../state";
import type { ImplementationMetric } from "../data/intelligence-model";

export default function ImplementationDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const actions = useActions();
  const { userId, notify } = useUI();
  const [metricEvidence, setMetricEvidence] = useState<ImplementationMetric | null>(null);
  const {
    data: implementations = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("implementation_records");
  const { data: contexts = [] } = useRecords("implementation_contexts");
  const { data: processSteps = [] } = useRecords("implementation_process_steps");
  const { data: stackItems = [] } = useRecords("implementation_stack_items");
  const { data: connections = [] } = useRecords("implementation_connections");
  const { data: metrics = [] } = useRecords("implementation_metrics");
  const { data: definitions = [] } = useRecords("metric_definitions");
  const { data: claims = [] } = useRecords("claims");
  const { data: blueprints = [] } = useRecords("blueprints");
  const { data: blueprintVersions = [] } = useRecords("blueprint_versions");
  const { data: blueprintItems = [] } = useRecords("blueprint_stack_items");
  const { data: products = [] } = useRecords("products");
  const { data: integrators = [] } = useRecords("integrators");

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;
  const implementation = implementations.find((item) => item.slug === slug);
  if (!implementation)
    return (
      <EmptyState
        title="Implementation record not found"
        description="This record may be private, archived, or no longer available."
        to="/implementations"
        action="Explore implementations"
      />
    );
  const activeImplementation = implementation;

  const context = contexts.find((item) => item.implementationId === activeImplementation.id);
  const recordMetrics = metrics.filter((item) => item.implementationId === activeImplementation.id);
  const recordSteps = processSteps.filter((item) => item.implementationId === activeImplementation.id);
  const recordStack = stackItems.filter((item) => item.implementationId === activeImplementation.id);
  const recordConnections = connections.filter((item) => item.implementationId === activeImplementation.id);
  const recordClaims = claims.filter((claim) => {
    if (claim.subjectType === "implementation") return claim.subjectId === activeImplementation.id;
    if (claim.subjectType === "metric")
      return recordMetrics.some((metric) => metric.id === claim.subjectId);
    return false;
  });
  const derivedBlueprints = blueprints.filter((blueprint) =>
    activeImplementation.derivedBlueprintIds.includes(blueprint.id),
  );
  const relatedImplementations = implementations
    .filter(
      (item) =>
        item.id !== activeImplementation.id &&
        item.businessType !== "" &&
        item.publicationState === "published",
    )
    .slice(0, 2);
  const implementers = integrators.filter((partner) =>
    activeImplementation.implementerIds.includes(partner.id),
  );

  async function requestSimilar() {
    if (!userId) {
      notify("Sign in before creating a private implementation request.");
      navigate("/sign-in");
      return;
    }
    const id = crypto.randomUUID();
    await actions.save("projects", {
      id,
      name: `Something like ${activeImplementation.name}`,
      sourceImplementationId: activeImplementation.id,
      sourceBlueprintId: activeImplementation.derivedBlueprintIds[0],
      sourceBuildId: activeImplementation.sourceBuildId,
      description: `Private requirement seeded from the implementation record “${activeImplementation.name}”. Review every assumption before sending it to suppliers.`,
      contextSummary: activeImplementation.contextSummary,
      category: "automation",
      budget: activeImplementation.implementationCost == null
        ? "To be discussed"
        : `Reference only: ${activeImplementation.implementationCostCurrency} ${activeImplementation.implementationCost.toLocaleString()} illustrative setup in the source record`,
      timeline: activeImplementation.implementationDuration,
      status: "draft",
      capabilities: recordStack.map((item) => item.capabilityId),
      desiredOutcomes: recordMetrics.map((metric) => metric.name),
      currentSystems: context?.existingSystems ?? [],
      provenance: activeImplementation.demo ? "demo" : "community supplied",
    });
    notify("Private project draft created from this implementation record.");
    navigate(`/app/projects/${id}`);
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Implementations", to: "/implementations" },
          { name: activeImplementation.name },
        ]}
      />
      <div className="implementation-detail-hero">
        <div>
          <div className="row wrap implementation-badges">
            <Badge>{activeImplementation.demo ? "ILLUSTRATIVE RECORD" : "IMPLEMENTATION RECORD"}</Badge>
            <EvidenceBadge level={activeImplementation.verificationState} />
            <StalenessBadge state={activeImplementation.stalenessState} />
          </div>
          <PageHeading
            eyebrow="IMPLEMENTATION INTELLIGENCE"
            title={activeImplementation.name}
            description={activeImplementation.summary}
          />
          <div className="row wrap implementation-meta-line">
            <span>{activeImplementation.businessType}</span>
            <span>{activeImplementation.organizationSizeBand}</span>
            <span>{activeImplementation.region}</span>
            <span>Evidence reviewed {activeImplementation.lastEvidenceReviewAt}</span>
          </div>
        </div>
        <div className="implementation-hero-actions card">
          <strong>Use this as evidence, not a promise.</strong>
          <p>
            Start from the recorded context, then adapt the requirements to your business.
          </p>
          <button className="button dark" type="button" onClick={() => void requestSimilar().catch(() => {})}>
            Build something like this <ArrowRight size={17} />
          </button>
          {derivedBlueprints[0] && (
            <ButtonLink to={`/blueprints/${derivedBlueprints[0].slug}`} variant="light">
              Open sanitized blueprint <GitBranch size={16} />
            </ButtonLink>
          )}
        </div>
      </div>
      <EvidencePrincipleNotice />

      <ContextSummary implementation={activeImplementation} context={context} />

      <section className="intelligence-section">
        <div className="section-title-text">
          <span className="eyebrow">PROCESS</span>
          <h2>What changed operationally</h2>
          <p>The implementation record keeps the operating process separate from the technology stack.</p>
        </div>
        <BeforeAfterProcess steps={recordSteps} />
      </section>

      <section className="intelligence-section">
        <div className="section-title-text">
          <span className="eyebrow">ARCHITECTURE</span>
          <h2>Recorded technology configuration</h2>
          <p>Co-occurrence in this record does not automatically prove official product compatibility.</p>
        </div>
        <ImplementationArchitecture
          items={recordStack}
          connections={recordConnections}
          products={products}
        />
      </section>

      <section className="intelligence-section">
        <div className="section-title-text">
          <span className="eyebrow">OBSERVED OUTCOMES</span>
          <h2>Baseline versus observed values</h2>
          <p>
            These synthetic values demonstrate the measurement model. A real record would preserve source, period and verification for each claim.
          </p>
        </div>
        <div className="metric-grid">
          {recordMetrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              definition={definitions.find((definition) => definition.id === metric.metricDefinitionId)}
              onEvidence={() => setMetricEvidence(metric)}
            />
          ))}
        </div>
      </section>

      <section className="intelligence-section economics-section">
        <div className="section-title-text">
          <span className="eyebrow">IMPLEMENTATION ECONOMICS</span>
          <h2>What the record discloses</h2>
        </div>
        <div className="economics-grid">
          <div className="card economics-card">
            <CircleDollarSign size={22} />
            <small>Illustrative setup cost</small>
            <strong>
              {activeImplementation.implementationCost == null
                ? "Not disclosed"
                : `${activeImplementation.implementationCostCurrency} ${activeImplementation.implementationCost.toLocaleString()}`}
            </strong>
            <span>{activeImplementation.costDisclosureType.replaceAll("-", " ")}</span>
          </div>
          <div className="card economics-card">
            <CalendarDays size={22} />
            <small>Implementation duration</small>
            <strong>{activeImplementation.implementationDuration}</strong>
            <span>Demo schedule</span>
          </div>
          <div className="card economics-card">
            <CircleDollarSign size={22} />
            <small>Illustrative monthly stack cost</small>
            <strong>
              {activeImplementation.ongoingMonthlyCost == null
                ? "Not disclosed"
                : `${activeImplementation.implementationCostCurrency} ${activeImplementation.ongoingMonthlyCost.toLocaleString()}`}
            </strong>
            <span>{activeImplementation.ongoingCostDisclosureType.replaceAll("-", " ")}</span>
          </div>
          <div className="card economics-card">
            <Wrench size={22} />
            <small>Maintenance</small>
            <strong>
              {activeImplementation.maintenanceHoursPerMonth == null
                ? "Not disclosed"
                : `${activeImplementation.maintenanceHoursPerMonth} hrs / month`}
            </strong>
            <span>Illustrative operating effort</span>
          </div>
        </div>
      </section>

      <section className="intelligence-section">
        <div className="section-title-text">
          <span className="eyebrow">CLAIMS & PROVENANCE</span>
          <h2>Evidence is attached to individual claims</h2>
          <p>No single green tick turns every statement on a record into verified fact.</p>
        </div>
        <ClaimEvidencePanel claims={recordClaims} />
      </section>

      {!!derivedBlueprints.length && (
        <section className="intelligence-section">
          <div className="section-title-text">
            <span className="eyebrow">WHAT IS REUSABLE</span>
            <h2>Sanitized reference blueprint</h2>
            <p>The deployment record and reusable intellectual property are separate objects.</p>
          </div>
          <div className="grid two">
            {derivedBlueprints.map((blueprint) => (
              <BlueprintCard
                key={blueprint.id}
                blueprint={blueprint}
                version={blueprintVersions.find((version) => version.id === blueprint.currentVersionId)}
                stackItems={blueprintItems.filter((item) => item.blueprintVersionId === blueprint.currentVersionId)}
                products={products}
              />
            ))}
          </div>
        </section>
      )}

      {!!implementers.length && (
        <section className="intelligence-section">
          <div className="section-title-text">
            <span className="eyebrow">IMPLEMENTATION HELP</span>
            <h2>Recorded implementer relationship</h2>
            <p>In production, implementer profiles should emphasize demonstrated records rather than self-written claims.</p>
          </div>
          <div className="grid two">
            {implementers.map((partner) => (
              <Link className="card implementer-evidence-card" key={partner.id} to={`/integrators/${partner.slug}`}>
                <span className="category-icon sand"><ClipboardCheck size={22} /></span>
                <div>
                  <strong>{partner.name}</strong>
                  <p>{partner.description}</p>
                  <span>Relationship recorded in this synthetic implementation <ArrowRight size={14} /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!!relatedImplementations.length && (
        <section className="intelligence-section">
          <div className="section-title-text">
            <span className="eyebrow">ALTERNATIVE IMPLEMENTATIONS</span>
            <h2>Compare another approach</h2>
          </div>
          <div className="grid two">
            {relatedImplementations.map((item) => (
              <ImplementationCard
                key={item.id}
                implementation={item}
                context={contexts.find((candidate) => candidate.implementationId === item.id)}
                metrics={metrics.filter((metric) => metric.implementationId === item.id)}
                metricDefinitions={definitions}
              />
            ))}
          </div>
        </section>
      )}

      <div className="implementation-request-banner">
        <div>
          <ShieldCheck size={25} />
          <span className="eyebrow">FROM EVIDENCE TO PROCUREMENT</span>
          <h2>Use the record to define your requirement — not copy the customer's system.</h2>
          <p>Your draft keeps source references while letting you change context, constraints, stack and desired outcomes.</p>
        </div>
        <button className="button dark" type="button" onClick={() => void requestSimilar().catch(() => {})}>
          Create private requirement <ArrowRight size={17} />
        </button>
      </div>

      <Modal
        open={!!metricEvidence}
        onClose={() => setMetricEvidence(null)}
        title={metricEvidence?.name ?? "Metric provenance"}
        description="Claim-level provenance for this recorded value."
      >
        {metricEvidence && (
          <div className="metric-provenance-panel">
            <EvidenceBadge level={metricEvidence.evidenceLevel} />
            <dl className="detail-list">
              <div><dt>Source</dt><dd>{metricEvidence.sourceLabel}</dd></div>
              <div><dt>Baseline</dt><dd>{metricEvidence.baselineValue ?? "Not recorded"} {metricEvidence.unit}</dd></div>
              <div><dt>Observed</dt><dd>{metricEvidence.observedValue ?? "Not recorded"} {metricEvidence.unit}</dd></div>
              <div><dt>Measurement</dt><dd>See record measurement period</dd></div>
            </dl>
            <p>{metricEvidence.notes}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
