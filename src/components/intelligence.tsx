import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Eye,
  FileKey2,
  GitBranch,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Workflow,
} from "lucide-react";
import type { Product } from "../data/model";
import type {
  Blueprint,
  BlueprintStackItem,
  BlueprintVersion,
  Claim,
  ClaimEvidence,
  ContextSimilarity,
  EvidenceArtifact,
  EvidenceLevel,
  EvidenceReview,
  ImplementationContext,
  ImplementationMetric,
  ImplementationProcessStep,
  ImplementationRecord,
  MeasurementPeriod,
  MetricDefinition,
  ReuseRights,
  StalenessState,
  TechnologyRelationshipType,
} from "../data/intelligence-model";
import { evidenceLevelInfo, evidenceSignals } from "../data/evidence";
import { describeChange, formatMetricValue, metricChange } from "../data/metrics";
import { rightsCatalogue } from "../data/rights";
import { computeFreshness, freshnessPolicies, implementationFreshness, stalenessLabels } from "../data/staleness";
import { similaritySummary } from "../data/context-similarity";
import type { TimelineEvent } from "../data/provenance";
import { Drawer, SaveButton } from "./ui";

export function EvidenceBadge({ level, compact = false, demo = false }: { level: EvidenceLevel; compact?: boolean; demo?: boolean }) {
  const icon =
    level === "unverified" ? <CircleHelp size={13} aria-hidden /> : level === "demo" ? <TriangleAlert size={13} aria-hidden /> : level === "creator-reported" ? <UserRound size={13} aria-hidden /> : <ShieldCheck size={13} aria-hidden />;
  const label = evidenceLevelInfo[level].label;
  return (
    <span className={`evidence-badge evidence-${level} ${demo && level !== "demo" ? "evidence-on-demo" : ""}`}>
      {icon}
      {compact ? (level === "demo" ? "Illustrative" : label.replace(" / illustrative", "")) : label}
      {demo && level !== "demo" ? " · demo" : ""}
    </span>
  );
}

export function StalenessBadge({ state }: { state: StalenessState }) {
  return (
    <span className={`staleness-badge staleness-${state}`}>
      <Clock3 size={13} aria-hidden />
      {stalenessLabels[state]}
    </span>
  );
}

export function RightsBadge({ rights }: { rights: ReuseRights }) {
  return (
    <span className={`rights-badge rights-${rights}`}>
      <FileKey2 size={13} aria-hidden />
      {rightsCatalogue[rights].label}
    </span>
  );
}

const relationshipLabels: Record<TechnologyRelationshipType, string> = {
  "native-integration": "Native integration",
  "api-compatible": "API compatible",
  "webhook-compatible": "Webhook compatible",
  "connector-available": "Connector available",
  "requires-middleware": "Requires middleware",
  "custom-integration-required": "Custom integration required",
  "observed-together": "Observed together — not verified compatibility",
  incompatible: "Incompatible",
  unknown: "Unknown",
};

export function RelationshipTypeBadge({ type }: { type: TechnologyRelationshipType }) {
  return <span className={`relationship-badge relationship-${type}`}>{relationshipLabels[type]}</span>;
}

export function IllustrativeNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="illustrative-notice" role="note">
      <TriangleAlert size={18} aria-hidden />
      <p>
        <strong>ILLUSTRATIVE RECORD.</strong>{" "}
        {children ?? "Fictional business and synthetic values that demonstrate the evidence model. Not a real customer, outcome or verification."}
      </p>
    </div>
  );
}

function costLabel(record: ImplementationRecord) {
  if (record.costDisclosureType === "not-disclosed") return "Setup cost not disclosed";
  const low = record.implementationCostLow ?? record.implementationCost;
  const high = record.implementationCostHigh ?? record.implementationCost;
  if (low == null) return "Setup cost not disclosed";
  const range = low === high || high == null ? `£${low.toLocaleString("en-GB")}` : `£${low.toLocaleString("en-GB")}–£${high.toLocaleString("en-GB")}`;
  return `${range} setup${record.demo ? " (illustrative)" : ""}`;
}
export { costLabel as implementationCostLabel };

export function ImplementationCard({
  implementation,
  context,
  metrics = [],
  metricDefinitions = [],
  freshness,
  similarity,
  compare,
}: {
  implementation: ImplementationRecord;
  context?: ImplementationContext;
  metrics?: ImplementationMetric[];
  metricDefinitions?: MetricDefinition[];
  freshness?: StalenessState;
  similarity?: ContextSimilarity;
  compare?: { selected: boolean; disabled: boolean; toggle: () => void };
}) {
  const highlights = ["first-response-time", "missed-enquiry-rate", "booking-rate", "qualified-lead-rate"]
    .map((id) => metrics.find((metric) => metric.metricDefinitionId === id && metric.baselineValue != null && metric.observedValue != null))
    .filter((metric): metric is ImplementationMetric => !!metric)
    .slice(0, 2);
  const definition = (id: string) => metricDefinitions.find((item) => item.id === id);
  const state = freshness ?? implementationFreshness(implementation, new Date()).state;
  return (
    <article className="card implementation-card">
      <div className="implementation-card-top">
        <span className="card-eyebrow">
          {[implementation.businessType, context?.locations ? `${context.locations} location${context.locations === 1 ? "" : "s"}` : null, implementation.region].filter(Boolean).join(" · ")}
        </span>
        <div className="row implementation-card-actions">
          {compare && (
            <label className="compare-check">
              <input type="checkbox" checked={compare.selected} disabled={compare.disabled && !compare.selected} onChange={compare.toggle} />
              Compare
            </label>
          )}
          <SaveButton id={implementation.id} name={implementation.name} type="implementation" />
        </div>
      </div>
      <Link to={`/implementations/${implementation.slug}`} className="implementation-card-title">
        <h3>{implementation.name}</h3>
        <ArrowRight size={17} aria-hidden />
      </Link>
      <p className="card-summary">{implementation.summary}</p>
      {!!highlights.length && (
        <div className="implementation-outcomes-inline">
          {highlights.map((metric) => (
            <div key={metric.id}>
              <small>{definition(metric.metricDefinitionId)?.name ?? metric.name}</small>
              <strong>
                {formatMetricValue(metric.baselineValue, metric.unit)} → {formatMetricValue(metric.observedValue, metric.unit)}
              </strong>
            </div>
          ))}
        </div>
      )}
      {similarity && (
        <div className={`similarity-pill similarity-${similarity.level}`}>
          <GitBranch size={15} aria-hidden />
          <strong>{similarity.level[0].toUpperCase() + similarity.level.slice(1)} context similarity</strong>
        </div>
      )}
      <div className="card-foot implementation-card-foot">
        <span className="row">
          <EvidenceBadge level={implementation.verificationState} compact />
          {state !== "current" && <StalenessBadge state={state} />}
        </span>
        <strong>{costLabel(implementation)}</strong>
      </div>
    </article>
  );
}

export function MetricCard({
  metric,
  definition,
  period,
  demo,
  onProvenance,
}: {
  metric: ImplementationMetric;
  definition?: MetricDefinition;
  period?: MeasurementPeriod;
  demo: boolean;
  onProvenance: () => void;
}) {
  const change = metricChange(metric.baselineValue, metric.observedValue, metric.unit, definition?.direction);
  return (
    <article className="metric-card card">
      <div className="row between metric-card-head">
        <h3>{definition?.name ?? metric.name}</h3>
        <EvidenceBadge level={metric.evidenceLevel} compact />
      </div>
      <div className="metric-values" role="group" aria-label={`${definition?.name ?? metric.name}: baseline ${formatMetricValue(metric.baselineValue, metric.unit)}, observed ${formatMetricValue(metric.observedValue, metric.unit)}`}>
        <div>
          <span>Baseline</span>
          <strong>{formatMetricValue(metric.baselineValue, metric.unit)}</strong>
        </div>
        <ArrowRight size={18} aria-hidden />
        <div>
          <span>Observed after implementation</span>
          <strong>{formatMetricValue(metric.observedValue, metric.unit)}</strong>
        </div>
      </div>
      <p className="metric-delta">
        {describeChange(change, metric.unit)}
        {change.inPreferredDirection != null && (
          <span> {change.inPreferredDirection ? "In the metric’s preferred direction." : "Against the metric’s preferred direction."}</span>
        )}
      </p>
      <dl className="metric-meta">
        <div><dt>Period</dt><dd>{period?.startDate && period.endDate ? `${period.startDate} → ${period.endDate}` : "Not recorded"}</dd></div>
        <div><dt>Source</dt><dd>{metric.sourceLabel}{demo ? " (illustrative)" : ""}</dd></div>
      </dl>
      <button type="button" className="text-button metric-provenance-button" onClick={onProvenance}>
        Provenance &amp; evidence <ArrowRight size={14} aria-hidden />
      </button>
    </article>
  );
}

export function MetricProvenanceDrawer({
  metric,
  definition,
  periods,
  claims,
  links,
  artifacts,
  reviews,
  demo,
  onClose,
}: {
  metric: ImplementationMetric | null;
  definition?: MetricDefinition;
  periods: MeasurementPeriod[];
  claims: Claim[];
  links: ClaimEvidence[];
  artifacts: EvidenceArtifact[];
  reviews: EvidenceReview[];
  demo: boolean;
  onClose: () => void;
}) {
  const claim = metric ? claims.find((item) => item.subjectType === "metric" && item.subjectId === metric.id) : undefined;
  const observed = periods.find((period) => period.id === metric?.measurementPeriodId);
  const baseline = periods.find((period) => period.kind === "baseline");
  return (
    <Drawer open={!!metric} onClose={onClose} title={metric ? `Provenance: ${definition?.name ?? metric.name}` : "Provenance"} description="How this value was produced, who claims it and what supports it.">
      {metric && (
        <div className="provenance-panel">
          {demo && <IllustrativeNotice>This value is synthetic. The panel shows what a real record would expose.</IllustrativeNotice>}
          <dl className="detail-list">
            <div><dt>Definition</dt><dd>{definition?.calculationMethod ?? "Not recorded"}</dd></div>
            <div><dt>Unit</dt><dd>{metric.unit}</dd></div>
            <div><dt>Baseline</dt><dd>{formatMetricValue(metric.baselineValue, metric.unit)} {baseline?.startDate ? `(${baseline.startDate} → ${baseline.endDate})` : ""}</dd></div>
            <div><dt>Observed</dt><dd>{formatMetricValue(metric.observedValue, metric.unit)} {observed?.startDate ? `(${observed.startDate} → ${observed.endDate})` : ""}</dd></div>
            <div><dt>Comparison rule</dt><dd>{definition?.comparisonRules ?? "Not recorded"}</dd></div>
          </dl>
          {claim ? <ClaimDetail claim={claim} links={links} artifacts={artifacts} reviews={reviews} /> : <p className="muted">No claim is attached to this value — treat it as unverified.</p>}
          <p className="muted small-print">Observed after implementation. This does not show that the implementation caused the change, and it is not a forecast for another business.</p>
        </div>
      )}
    </Drawer>
  );
}

/** Numeric claim values are formatted with their unit; text claims are shown verbatim. */
export function claimValue(claim: Pick<Claim, "value" | "unit">) {
  const numeric = claim.value.trim() !== "" && !Number.isNaN(Number(claim.value));
  return numeric && claim.unit ? formatMetricValue(Number(claim.value), claim.unit) : claim.value;
}

function ClaimDetail({ claim, links, artifacts, reviews }: { claim: Claim; links: ClaimEvidence[]; artifacts: EvidenceArtifact[]; reviews: EvidenceReview[] }) {
  const signals = evidenceSignals(claim, links, artifacts, reviews, new Date());
  const linked = links.filter((link) => link.claimId === claim.id);
  const claimReviews = reviews.filter((review) => review.claimId === claim.id);
  return (
    <div className="claim-detail">
      <div className="row wrap">
        <EvidenceBadge level={claim.evidenceLevel} demo={claim.provenance === "demo"} />
        <span className="badge">{claim.status}</span>
      </div>
      <dl className="detail-list">
        <div><dt>Claim</dt><dd>{claimValue(claim)}</dd></div>
        <div><dt>Claimant</dt><dd>{claim.claimant}{claim.claimantType ? ` (${claim.claimantType})` : ""}</dd></div>
        <div><dt>Evidence method</dt><dd>{claim.evidenceMethod ?? "Not stated"}</dd></div>
        <div><dt>Evidence level</dt><dd>{evidenceLevelInfo[claim.evidenceLevel].description}</dd></div>
        <div><dt>Period</dt><dd>{claim.period ?? "Not applicable"}</dd></div>
        <div><dt>Last reviewed</dt><dd>{claim.reviewedAt?.slice(0, 10) ?? "Never"}</dd></div>
        <div><dt>Limitations</dt><dd>{signals.limitations.join(" ") || "None recorded"}</dd></div>
      </dl>
      <div className="signal-grid" aria-label="Evidence signals">
        <span><small>Independence</small>{signals.independence}</span>
        <span><small>Directness</small>{signals.directness}</span>
        <span><small>Freshness</small>{stalenessLabels[signals.freshness]}</span>
        <span><small>Review</small>{signals.reviewStatus.replaceAll("-", " ")}</span>
        <span><small>Specificity</small>{signals.specificity}</span>
      </div>
      {!!linked.length && (
        <ul className="evidence-artifact-list">
          {linked.map((link) => {
            const artifact = artifacts.find((item) => item.id === link.evidenceArtifactId);
            if (!artifact) return null;
            return (
              <li key={link.id}>
                {artifact.private ? <LockKeyhole size={15} aria-label="Private" /> : <Eye size={15} aria-label="Public" />}
                <span>
                  <strong>{artifact.name}</strong>
                  <small>{link.relationship} · {artifact.kind.replaceAll("-", " ")} · {artifact.private ? "file private to reviewers" : "public"}</small>
                  <small>{artifact.publicMetadata}</small>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {claimReviews.map((review) => (
        <p key={review.id} className="review-note"><ShieldCheck size={15} aria-hidden /> Review {review.reviewedAt.slice(0, 10)}: {review.result.replaceAll("-", " ")} — {review.notes}</p>
      ))}
    </div>
  );
}

export function ClaimsPanel({
  claims,
  links,
  artifacts,
  reviews,
}: {
  claims: Claim[];
  links: ClaimEvidence[];
  artifacts: EvidenceArtifact[];
  reviews: EvidenceReview[];
}) {
  const [open, setOpen] = useState<Claim | null>(null);
  const visible = claims.filter((claim) => claim.public);
  return (
    <>
      <div className="claim-list" role="list">
        {visible.map((claim) => (
          <div className="claim-row card" role="listitem" key={claim.id}>
            <div>
              <strong>{claim.name}</strong>
              <small>{claimValue(claim)}</small>
            </div>
            <div className="claim-row-meta">
              <span className="muted">{claim.claimant}</span>
              <EvidenceBadge level={claim.evidenceLevel} compact demo={claim.provenance === "demo"} />
              <button type="button" className="text-button" onClick={() => setOpen(claim)} aria-label={`Evidence for ${claim.name}`}>
                Evidence <ArrowRight size={14} aria-hidden />
              </button>
            </div>
          </div>
        ))}
        {!visible.length && <p className="muted">No public claims recorded.</p>}
      </div>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.name ?? "Claim"} description="Claim-level evidence. No record-wide verification tick.">
        {open && <ClaimDetail claim={open} links={links} artifacts={artifacts} reviews={reviews} />}
      </Drawer>
    </>
  );
}

export function BeforeAfterProcess({ steps }: { steps: ImplementationProcessStep[] }) {
  const columns = (["before", "change", "after"] as const).map((phase) => ({
    phase,
    title: phase === "before" ? "Before" : phase === "change" ? "What changed" : "After",
    items: steps.filter((step) => step.phase === phase).sort((a, b) => a.position - b.position),
  }));
  return (
    <div className="before-after-grid">
      {columns.map((column) => (
        <section className={`card process-column process-${column.phase}`} key={column.phase} aria-label={`${column.title} process`}>
          <div className="process-heading">
            {column.phase === "before" ? <Clock3 size={20} aria-hidden /> : column.phase === "change" ? <Workflow size={20} aria-hidden /> : <CheckCircle2 size={20} aria-hidden />}
            <h3>{column.title}</h3>
          </div>
          <ol>
            {column.items.map((step) => (
              <li key={step.id} className={/human/i.test(step.humanRole) ? "human-step" : ""}>
                <span aria-hidden>{step.position + 1}</span>
                <div>
                  <strong>{step.description}</strong>
                  {column.phase !== "change" && <small>{step.humanRole}</small>}
                </div>
              </li>
            ))}
            {!column.items.length && <li><div><strong>Not recorded</strong></div></li>}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function ContextSummary({ implementation, context }: { implementation: ImplementationRecord; context?: ImplementationContext }) {
  return (
    <div className="context-summary card">
      <p>{implementation.contextSummary}</p>
      <dl className="context-grid">
        <div><dt>Industry</dt><dd>{implementation.industry}</dd></div>
        <div><dt>Business</dt><dd>{implementation.businessType}</dd></div>
        <div><dt>Size</dt><dd>{implementation.organizationSizeBand}</dd></div>
        <div><dt>Region</dt><dd>{implementation.region}</dd></div>
        <div><dt>Locations</dt><dd>{context?.locations ?? "Not disclosed"}</dd></div>
        <div><dt>Volume / month</dt><dd>{context?.volumeLabel ?? "Not disclosed"}</dd></div>
        <div><dt>In-house technical capability</dt><dd>{context?.technicalCapability ?? "Unknown"}</dd></div>
        <div><dt>Regulatory context</dt><dd>{context?.regulatoryConstraints.join(", ") || "Not recorded"}</dd></div>
        <div><dt>Customer identity</dt><dd>{implementation.customerIdentityVisibility === "public" ? implementation.customerDisplayName : implementation.customerIdentityVisibility === "anonymous" ? "Withheld publicly" : "Private to Oracnet"}</dd></div>
      </dl>
      {!!context?.existingSystems.length && (
        <div className="tags" aria-label="Existing systems">
          {context.existingSystems.map((system) => <span key={system}>{system}</span>)}
        </div>
      )}
    </div>
  );
}

export function ContextSimilarityPanel({ similarity, title = "Context match" }: { similarity: ContextSimilarity; title?: string }) {
  const label = similarity.level[0].toUpperCase() + similarity.level.slice(1);
  return (
    <div className={`card context-similarity context-similarity-${similarity.level}`}>
      <span className="eyebrow">{title.toUpperCase()}</span>
      <h3><span className={`level-dot level-${similarity.level}`} aria-hidden /> {label} contextual similarity</h3>
      <p className="similarity-summary">{similaritySummary(similarity)}</p>
      {similarity.reasons.length > 4 && (
        <ul className="similarity-list" aria-label="Further similarities">
          {similarity.reasons.slice(4).map((reason) => <li key={reason}><CheckCircle2 size={15} aria-hidden /> {reason}</li>)}
        </ul>
      )}
      {!!similarity.differences.length && (
        <ul className="similarity-list differences" aria-label="Differences">
          {similarity.differences.map((difference) => <li key={difference}><CircleHelp size={15} aria-hidden /> Difference: {difference}</li>)}
        </ul>
      )}
      {!!similarity.unknowns?.length && <small>Not compared (missing data): {similarity.unknowns.join(", ")}.</small>}
      <small>Deterministic context matching. It does not predict that you will see the same outcome.</small>
    </div>
  );
}

export function BlueprintCard({
  blueprint,
  version,
  stackItems = [],
  products = [],
  freshness,
}: {
  blueprint: Blueprint;
  version?: BlueprintVersion;
  stackItems?: BlueprintStackItem[];
  products?: Product[];
  freshness?: StalenessState;
}) {
  const state = freshness ?? computeFreshness({ lastReviewedAt: version?.lastValidatedAt ?? blueprint.lastValidatedAt, archived: blueprint.compatibilityState === "archived" }, new Date(), freshnessPolicies.blueprintCompatibility).state;
  const names = stackItems.map((item) => products.find((candidate) => candidate.id === item.productId)?.name ?? item.role);
  const stackText = names.length > 4 ? `${names.slice(0, 4).join(", ")} +${names.length - 4} more` : names.join(", ");
  return (
    <article className="card blueprint-card">
      <div className="row between blueprint-card-top">
        <span className="card-eyebrow">Version {version?.version ?? "—"} · {blueprint.estimatedComplexity} complexity</span>
        {blueprint.demo && <span className="evidence-badge evidence-demo"><TriangleAlert size={13} aria-hidden />Illustrative</span>}
      </div>
      <Link to={`/blueprints/${blueprint.slug}`} className="blueprint-card-title">
        <h3>{blueprint.name}</h3>
        <ArrowRight size={16} aria-hidden />
      </Link>
      <p className="card-summary">{blueprint.description}</p>
      <p className="blueprint-stack-line">
        <span className="sr-only">Components: </span>
        {stackText}
      </p>
      <div className="card-foot blueprint-card-foot">
        <RightsBadge rights={blueprint.reuseRights} />
        {state !== "current" && <StalenessBadge state={state} />}
      </div>
    </article>
  );
}

export function ProvenanceTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return <p className="muted">No provenance events recorded.</p>;
  return (
    <ol className="provenance-timeline">
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`} className={`timeline-${event.kind}`}>
          <time dateTime={event.at}>{event.at.slice(0, 10)}</time>
          <div>
            <strong>{event.label}</strong>
            <small>{event.detail}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}



export function SectionIntro({ eyebrow, title, children, id }: { eyebrow: string; title: string; children?: ReactNode; id?: string }) {
  return (
    <div className="section-title-text" id={id}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
