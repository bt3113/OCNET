import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  DatabaseZap,
  ExternalLink,
  GitBranch,
  Layers3,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow,
} from "lucide-react";
import type { Product } from "../data/model";
import type {
  Blueprint,
  BlueprintStackItem,
  BlueprintVersion,
  Claim,
  ContextSimilarity,
  EvidenceLevel,
  ImplementationConnection,
  ImplementationContext,
  ImplementationMetric,
  ImplementationProcessStep,
  ImplementationRecord,
  ImplementationStackItem,
  MetricDefinition,
  SolutionCandidate,
  SolutionCandidateItem,
  SolutionExplanation,
} from "../data/intelligence-model";
import { Badge, ButtonLink, Logo, Modal, SaveButton } from "./ui";

const evidenceLabels: Record<EvidenceLevel, string> = {
  "creator-reported": "Creator reported",
  "customer-attested": "Customer attested",
  "evidence-reviewed": "Evidence reviewed",
  "platform-observed": "Platform observed",
  "independently-audited": "Independently audited",
  demo: "Demo / synthetic",
  unverified: "Unverified",
};

export function EvidenceBadge({
  level,
  compact = false,
}: {
  level: EvidenceLevel;
  compact?: boolean;
}) {
  const icon =
    level === "unverified" ? (
      <CircleHelp size={compact ? 13 : 15} />
    ) : level === "demo" ? (
      <TriangleAlert size={compact ? 13 : 15} />
    ) : (
      <ShieldCheck size={compact ? 13 : 15} />
    );
  return (
    <span className={`evidence-badge evidence-${level}`} title={evidenceLabels[level]}>
      {icon}
      {compact ? evidenceLabels[level].replace(" / synthetic", "") : evidenceLabels[level]}
    </span>
  );
}

export function StalenessBadge({ state }: { state: ImplementationRecord["stalenessState"] | Blueprint["compatibilityState"] }) {
  return (
    <span className={`staleness-badge staleness-${state}`}>
      <Clock3 size={13} />
      {state.replaceAll("-", " ")}
    </span>
  );
}

export function ImplementationCard({
  implementation,
  context,
  metrics = [],
  metricDefinitions = [],
  similarity,
}: {
  implementation: ImplementationRecord;
  context?: ImplementationContext;
  metrics?: ImplementationMetric[];
  metricDefinitions?: MetricDefinition[];
  similarity?: Pick<ContextSimilarity, "level" | "score" | "reasons">;
}) {
  const responseMetric = metrics.find((metric) => metric.metricDefinitionId === "first-response-time");
  const bookingMetric = metrics.find((metric) => metric.metricDefinitionId === "booking-rate");
  const metricName = (id: string) => metricDefinitions.find((definition) => definition.id === id)?.name ?? id;
  return (
    <article className="card implementation-card">
      <div className="implementation-card-top">
        <div className="row wrap">
          <Badge>{implementation.demo ? "ILLUSTRATIVE RECORD" : "IMPLEMENTATION"}</Badge>
          <EvidenceBadge level={implementation.verificationState} compact />
          <StalenessBadge state={implementation.stalenessState} />
        </div>
        <SaveButton id={implementation.id} name={implementation.name} type="implementation" />
      </div>
      <Link to={`/implementations/${implementation.slug}`} className="implementation-card-title">
        <h3>{implementation.name}</h3>
        <ArrowRight size={17} />
      </Link>
      <p>{implementation.summary}</p>
      <dl className="implementation-context-strip">
        <div>
          <dt>Business</dt>
          <dd>{implementation.businessType}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{implementation.organizationSizeBand}</dd>
        </div>
        <div>
          <dt>Volume</dt>
          <dd>{context?.volumeLabel ?? "Not disclosed"}</dd>
        </div>
      </dl>
      {(responseMetric || bookingMetric) && (
        <div className="implementation-outcomes-inline">
          {[responseMetric, bookingMetric].filter(Boolean).map((metric) => (
            <div key={metric!.id}>
              <small>{metricName(metric!.metricDefinitionId)}</small>
              <strong>
                {metric!.baselineValue ?? "—"} → {metric!.observedValue ?? "—"} {metric!.unit}
              </strong>
              <span>illustrative observed comparison</span>
            </div>
          ))}
        </div>
      )}
      {similarity && (
        <div className={`similarity-pill similarity-${similarity.level}`}>
          <GitBranch size={15} />
          <strong>{similarity.level} context similarity</strong>
          <span>{similarity.score}/100</span>
        </div>
      )}
      <div className="card-foot implementation-card-foot">
        <span>
          {implementation.implementationDuration} · {implementation.region}
        </span>
        <strong>
          {implementation.implementationCost == null
            ? "Cost not disclosed"
            : `${implementation.implementationCostCurrency} ${implementation.implementationCost.toLocaleString()} illustrative setup`}
        </strong>
      </div>
    </article>
  );
}

export function MetricCard({
  metric,
  definition,
  onEvidence,
}: {
  metric: ImplementationMetric;
  definition?: MetricDefinition;
  onEvidence?: () => void;
}) {
  const delta = metric.percentageChange;
  return (
    <article className="metric-card card">
      <div className="row between">
        <div>
          <small>{definition?.category ?? "Observed metric"}</small>
          <h3>{definition?.name ?? metric.name}</h3>
        </div>
        <EvidenceBadge level={metric.evidenceLevel} compact />
      </div>
      <div className="metric-values">
        <div>
          <span>Baseline</span>
          <strong>{metric.baselineValue == null ? "—" : `${metric.baselineValue} ${metric.unit}`}</strong>
        </div>
        <ArrowRight size={20} />
        <div>
          <span>Observed after implementation</span>
          <strong>{metric.observedValue == null ? "—" : `${metric.observedValue} ${metric.unit}`}</strong>
        </div>
      </div>
      {delta != null && (
        <p className="metric-delta">
          {delta > 0 ? "+" : ""}{delta.toFixed(1)}% relative change · observation, not causal attribution
        </p>
      )}
      <div className="metric-source">
        <span>{metric.sourceLabel}</span>
        {onEvidence && (
          <button type="button" className="text-button" onClick={onEvidence}>
            See provenance <ArrowRight size={14} />
          </button>
        )}
      </div>
    </article>
  );
}

export function BeforeAfterProcess({ steps }: { steps: ImplementationProcessStep[] }) {
  const columns = (["before", "change", "after"] as const).map((phase) => ({
    phase,
    title: phase === "before" ? "Before" : phase === "change" ? "Process change" : "After",
    items: steps.filter((step) => step.phase === phase).sort((a, b) => a.position - b.position),
  }));
  return (
    <div className="before-after-grid">
      {columns.map((column) => (
        <section className={`card process-column process-${column.phase}`} key={column.phase}>
          <div className="process-heading">
            {column.phase === "before" ? <Clock3 size={20} /> : column.phase === "change" ? <Workflow size={20} /> : <CheckCircle2 size={20} />}
            <h3>{column.title}</h3>
          </div>
          <ol>
            {column.items.map((step) => (
              <li key={step.id}>
                <span>{step.position + 1}</span>
                <div>
                  <strong>{step.description}</strong>
                  <small>{step.humanRole}</small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function ImplementationArchitecture({
  items,
  connections,
  products,
  kind = "observed",
}: {
  items: ImplementationStackItem[];
  connections: ImplementationConnection[];
  products: Product[];
  kind?: "observed" | "reference";
}) {
  const [selected, setSelected] = useState(items[0]?.id ?? "");
  const selectedItem = items.find((item) => item.id === selected);
  const selectedProduct = products.find((product) => product.id === selectedItem?.productId);
  return (
    <div className="architecture-shell card">
      <div className="architecture-head">
        <div>
          <span className="eyebrow">{kind === "observed" ? "OBSERVED ARCHITECTURE" : "REFERENCE ARCHITECTURE"}</span>
          <h3>Component and data-flow map</h3>
        </div>
        <Badge>{kind === "observed" ? "Recorded configuration" : "Reusable pattern"}</Badge>
      </div>
      <div className="architecture-flow" role="list" aria-label="Architecture components">
        {items.map((item, index) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          const connection = connections.find((candidate) => candidate.fromItemId === item.id);
          return (
            <div className="architecture-flow-unit" key={item.id}>
              <button
                type="button"
                role="listitem"
                className={`architecture-node ${selected === item.id ? "selected" : ""}`}
                onClick={() => setSelected(item.id)}
                aria-pressed={selected === item.id}
              >
                {product ? <Logo initials={product.initials} color={product.color} /> : <span className="logo-tile sand">?</span>}
                <span>
                  <small>{item.role}</small>
                  <strong>{product?.name ?? item.productId}</strong>
                  <em>{item.capabilityId}</em>
                </span>
              </button>
              {index < items.length - 1 && (
                <div className="architecture-edge" aria-hidden="true">
                  <ArrowRight size={18} />
                  <small>{connection?.label ?? "handoff"}</small>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selectedItem && (
        <div className="architecture-inspector">
          <div>
            <strong>{selectedItem.role}</strong>
            <p>{selectedProduct?.description ?? selectedItem.notes}</p>
          </div>
          <div className="row wrap">
            <EvidenceBadge level={selectedItem.evidenceLevel} compact />
            {selectedProduct && (
              <Link to={`/technologies/${selectedProduct.slug}`}>
                Technology profile <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      )}
      <div className="architecture-mobile-list">
        {items.map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          return (
            <div key={`${item.id}-mobile`}>
              <strong>{item.role}</strong>
              <span>{product?.name ?? item.productId}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ContextSummary({
  implementation,
  context,
}: {
  implementation: ImplementationRecord;
  context?: ImplementationContext;
}) {
  return (
    <div className="context-summary card">
      <div className="row between">
        <div>
          <span className="eyebrow">BUSINESS CONTEXT</span>
          <h2>What this record actually describes</h2>
        </div>
        <LockKeyhole size={22} />
      </div>
      <p>{implementation.contextSummary}</p>
      <dl className="context-grid">
        <div><dt>Business</dt><dd>{implementation.businessType}</dd></div>
        <div><dt>Size</dt><dd>{implementation.organizationSizeBand}</dd></div>
        <div><dt>Region</dt><dd>{implementation.region}</dd></div>
        <div><dt>Locations</dt><dd>{context?.locations ?? "Not disclosed"}</dd></div>
        <div><dt>Volume</dt><dd>{context?.volumeLabel ?? "Not disclosed"}</dd></div>
        <div><dt>Technical capability</dt><dd>{context?.technicalCapability ?? "Unknown"}</dd></div>
      </dl>
      {!!context?.existingSystems.length && (
        <div className="tags">
          {context.existingSystems.map((system) => <span key={system}>{system}</span>)}
        </div>
      )}
    </div>
  );
}

export function ContextSimilarityPanel({ similarity }: { similarity: { level: "high" | "medium" | "low"; score: number; reasons: string[]; differences: string[] } }) {
  return (
    <div className={`card context-similarity context-similarity-${similarity.level}`}>
      <div className="row between">
        <div>
          <span className="eyebrow">CONTEXT MATCH</span>
          <h3>{similarity.level[0].toUpperCase() + similarity.level.slice(1)} similarity</h3>
        </div>
        <strong className="similarity-score">{similarity.score}/100</strong>
      </div>
      <div className="similarity-meter" aria-label={`Context similarity ${similarity.score} out of 100`}>
        <span style={{ width: `${similarity.score}%` }} />
      </div>
      {similarity.reasons.map((reason) => <p key={reason}><CheckCircle2 size={15} /> {reason}</p>)}
      {similarity.differences.map((difference) => <p className="muted" key={difference}><CircleHelp size={15} /> {difference}</p>)}
      <small>Context similarity is deterministic matching, not a prediction of outcome.</small>
    </div>
  );
}

export function BlueprintCard({
  blueprint,
  version,
  stackItems = [],
  products = [],
}: {
  blueprint: Blueprint;
  version?: BlueprintVersion;
  stackItems?: BlueprintStackItem[];
  products?: Product[];
}) {
  return (
    <article className="card blueprint-card">
      <div className="row between">
        <span className="category-icon sand"><Layers3 size={22} /></span>
        <div className="row wrap">
          <Badge>{blueprint.demo ? "DEMO BLUEPRINT" : "BLUEPRINT"}</Badge>
          <StalenessBadge state={blueprint.compatibilityState} />
        </div>
      </div>
      <Link to={`/blueprints/${blueprint.slug}`}>
        <h3>{blueprint.name} <ArrowRight size={16} /></h3>
      </Link>
      <p>{blueprint.description}</p>
      <div className="blueprint-stack-mini">
        {stackItems.slice(0, 5).map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          return <span key={item.id}>{product?.name ?? item.role}</span>;
        })}
      </div>
      <dl className="blueprint-meta">
        <div><dt>Version</dt><dd>{version?.version ?? "—"}</dd></div>
        <div><dt>Complexity</dt><dd>{blueprint.estimatedComplexity}</dd></div>
        <div><dt>Reuse</dt><dd>{blueprint.reuseRights.replaceAll("-", " ")}</dd></div>
      </dl>
    </article>
  );
}

export function ClaimEvidencePanel({ claims }: { claims: Claim[] }) {
  return (
    <div className="claim-list">
      {claims.map((claim) => (
        <article className="claim-row card" key={claim.id}>
          <div>
            <strong>{claim.name}</strong>
            <small>{claim.predicate.replaceAll("-", " ")}</small>
          </div>
          <div className="claim-value">
            <span>{claim.value}{claim.unit ? ` ${claim.unit}` : ""}</span>
            <EvidenceBadge level={claim.evidenceLevel} compact />
          </div>
        </article>
      ))}
    </div>
  );
}

export function SolutionCandidateCard({
  candidate,
  items,
  products,
  explanations,
}: {
  candidate: SolutionCandidate;
  items: SolutionCandidateItem[];
  products: Product[];
  explanations: SolutionExplanation[];
}) {
  const [open, setOpen] = useState(false);
  const candidateItems = items.filter((item) => item.candidateId === candidate.id);
  const candidateExplanations = explanations.filter((explanation) => explanation.candidateId === candidate.id);
  const metrics = [
    ["Complexity", 100 - candidate.complexity],
    ["Evidence", candidate.evidenceStrength],
    ["Maintainability", 100 - candidate.maintenanceBurden],
    ["Flexibility", candidate.flexibility],
  ] as const;
  return (
    <article className={`card solution-candidate ${candidate.dominated ? "solution-dominated" : ""}`}>
      <div className="solution-candidate-head">
        <div>
          <Badge>{candidate.label}</Badge>
          <h3>{candidate.name}</h3>
          <p>{candidate.summary}</p>
        </div>
        <Scale size={24} />
      </div>
      <div className="candidate-products">
        {candidateItems.map((item) => {
          const product = products.find((candidateProduct) => candidateProduct.id === item.productId);
          return (
            <div key={item.id}>
              {product ? <Logo initials={product.initials} color={product.color} /> : <span className="logo-tile sand">?</span>}
              <span><small>{item.role}</small><strong>{product?.name ?? item.productId}</strong></span>
            </div>
          );
        })}
      </div>
      <div className="solution-tradeoffs">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <div className="row between"><span>{label}</span><strong>{Math.round(value)}</strong></div>
            <div className="tradeoff-meter"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
          </div>
        ))}
      </div>
      <dl className="solution-economics">
        <div><dt>Illustrative setup</dt><dd>{candidate.setupCost == null ? "Unknown" : `£${candidate.setupCost.toLocaleString()}`}</dd></div>
        <div><dt>Illustrative monthly</dt><dd>{candidate.monthlyCost == null ? "Unknown" : `£${candidate.monthlyCost.toLocaleString()}`}</dd></div>
      </dl>
      <div className="row wrap solution-actions">
        <button type="button" className="button light" onClick={() => setOpen(true)}>
          Why this appears <ArrowRight size={16} />
        </button>
        {candidate.sourceBlueprintId && (
          <ButtonLink to={`/blueprints/${candidate.sourceBlueprintId}`} variant="light">
            Open blueprint <ExternalLink size={15} />
          </ButtonLink>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={`Why ${candidate.name} appears`} description="Deterministic explanation from the recorded graph, constraints and evidence.">
        <div className="solution-explanation-list">
          {candidateExplanations.map((explanation) => (
            <div key={explanation.id}>
              {explanation.kind === "fit" ? <CheckCircle2 size={18} /> : explanation.kind === "unknown" ? <CircleHelp size={18} /> : <ShieldCheck size={18} />}
              <div><strong>{explanation.name}</strong><p>{explanation.text}</p></div>
            </div>
          ))}
          {!!candidate.risks.length && (
            <div><TriangleAlert size={18} /><div><strong>Risks / limitations</strong>{candidate.risks.map((risk) => <p key={risk}>{risk}</p>)}</div></div>
          )}
        </div>
      </Modal>
    </article>
  );
}

export function EvidencePrincipleNotice() {
  return (
    <div className="evidence-principle notice">
      <DatabaseZap size={21} />
      <div>
        <strong>Implementation intelligence, not performance promises.</strong>
        <p>Oracnet records context, provenance and observed values. A result in one business is not a forecast or causal claim for another.</p>
      </div>
    </div>
  );
}

export function CompilerEmptyState() {
  return (
    <div className="compiler-empty card">
      <span className="category-icon sand"><Sparkles size={25} /></span>
      <h2>Build a requirement profile, not a prompt.</h2>
      <p>Oracnet converts your business outcome into editable constraints, then checks structured implementation records and reference architectures.</p>
    </div>
  );
}

export function BlueprintArchitecture({
  blueprint,
  version,
  items,
  products,
}: {
  blueprint: Blueprint;
  version?: BlueprintVersion;
  items: BlueprintStackItem[];
  products: Product[];
}) {
  const ordered = useMemo(() => items.filter((item) => !version || item.blueprintVersionId === version.id), [items, version]);
  return (
    <div className="card blueprint-dependency-view">
      <div className="row between">
        <div><span className="eyebrow">VERSIONED DEPENDENCY MANIFEST</span><h3>{blueprint.name}</h3></div>
        <Badge>v{version?.version ?? "—"}</Badge>
      </div>
      <div className="dependency-steps">
        {ordered.map((item, index) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          return (
            <div className="dependency-step" key={item.id}>
              <span className="dependency-number">{index + 1}</span>
              <div>
                <small>{item.capabilityId}</small>
                <strong>{product?.name ?? item.role}</strong>
                <p>{item.configurationRequirements}</p>
                {!!item.alternativeProductIds.length && <span>Alternatives recorded: {item.alternativeProductIds.map((id) => products.find((p) => p.id === id)?.name ?? id).join(", ")}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
