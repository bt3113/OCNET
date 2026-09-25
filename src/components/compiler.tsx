import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CheckCircle2, CircleHelp, Download, FileSearch, Layers3, Plus, RotateCcw, Scale, ShieldCheck, TriangleAlert, X } from "lucide-react";
import type { Product, UseCase } from "../data/model";
import type {
  ImplementationRecord,
  RequirementField,
  RequirementProfile,
  RequirementStrength,
  SolutionCandidate,
  SolutionCandidateItem,
} from "../data/intelligence-model";
import type { CompiledSolution, CompilerCatalogue, CompilerStage, DecisionTrace } from "../data/solution-compiler";
import { verifyReproducibility } from "../data/solution-compiler";
import { downloadJson } from "../data/manifest";
import { fieldLabels, strengthOf } from "../data/requirement";
import { sizeBands, capabilityLabel } from "../data/taxonomy";
import { Badge, Drawer, Logo } from "./ui";
import { EvidenceBadge, RelationshipTypeBadge, RightsBadge, StalenessBadge } from "./intelligence";

const money = (value: number | null | undefined) => (value == null ? null : `£${value.toLocaleString("en-GB")}`);
export function rangeText(range: { low: number | null; high: number | null }, suffix = "") {
  if (range.low == null && range.high == null) return "Not recorded";
  if (range.low === range.high) return `${money(range.low)}${suffix}`;
  return `${money(range.low)}–${money(range.high)}${suffix}`;
}
const hoursText = (range: { low: number | null; high: number | null }) =>
  range.low == null ? "Not recorded" : range.low === range.high ? `${range.low} h/month` : `${range.low}–${range.high} h/month`;

function StrengthControl({ field, profile, onChange }: { field: RequirementField; profile: RequirementProfile; onChange: (strength: RequirementStrength) => void }) {
  const current = strengthOf(profile, field);
  return (
    <div className="strength-control" role="radiogroup" aria-label={`${fieldLabels[field]} strength`}>
      {(["hard", "soft", "informational"] as const).map((strength) => (
        <button
          key={strength}
          type="button"
          role="radio"
          aria-checked={current === strength}
          className={current === strength ? "active" : ""}
          onClick={() => onChange(strength)}
        >
          {strength === "informational" ? "Info" : strength[0].toUpperCase() + strength.slice(1)}
        </button>
      ))}
    </div>
  );
}

function TagInput({ id, values, onChange, placeholder }: { id: string; values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const additions = draft.split(",").map((value) => value.trim()).filter(Boolean);
    if (additions.length) onChange([...new Set([...values, ...additions])]);
    setDraft("");
  };
  return (
    <div className="tag-input">
      {values.map((value) => (
        <span key={value} className="requirement-tag">
          {value}
          <button type="button" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((item) => item !== value))}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
      />
      <button type="button" className="icon-button" aria-label={`Add to ${placeholder}`} onClick={commit}>
        <Plus size={14} />
      </button>
    </div>
  );
}

function RequirementCard({
  field,
  profile,
  onConfirm,
  onStrength,
  strength = true,
  children,
}: {
  field: RequirementField;
  profile: RequirementProfile;
  onConfirm: () => void;
  onStrength: (strength: RequirementStrength) => void;
  strength?: boolean;
  children: ReactNode;
}) {
  const inferred = profile.inferredFields?.includes(field);
  return (
    <div className={`requirement-card ${inferred ? "inferred" : ""}`}>
      <div className="requirement-card-head">
        <label htmlFor={`req-${field}`}>{fieldLabels[field]}</label>
        {inferred && (
          <button type="button" className="inferred-chip" onClick={onConfirm} aria-label={`${fieldLabels[field]} was inferred from your text. Confirm value`}>
            INFERRED · confirm <Check size={12} aria-hidden />
          </button>
        )}
      </div>
      {children}
      {strength && <StrengthControl field={field} profile={profile} onChange={onStrength} />}
    </div>
  );
}

export function RequirementBuilder({
  profile,
  useCases,
  onChange,
}: {
  profile: RequirementProfile;
  useCases: UseCase[];
  onChange: (profile: RequirementProfile) => void;
}) {
  const set = <K extends keyof RequirementProfile>(key: K, value: RequirementProfile[K], field?: RequirementField) =>
    onChange({
      ...profile,
      [key]: value,
      inferredFields: field ? (profile.inferredFields ?? []).filter((item) => item !== field) : profile.inferredFields,
    });
  const confirm = (field: RequirementField) => onChange({ ...profile, inferredFields: (profile.inferredFields ?? []).filter((item) => item !== field) });
  const strength = (field: RequirementField) => (value: RequirementStrength) => onChange({ ...profile, strengths: { ...profile.strengths, [field]: value } });
  const card = (field: RequirementField, children: ReactNode, withStrength = true) => (
    <RequirementCard field={field} profile={profile} onConfirm={() => confirm(field)} onStrength={strength(field)} strength={withStrength}>
      {children}
    </RequirementCard>
  );
  const number = (value: string) => (value === "" ? null : Math.max(0, Number(value)));
  return (
    <div className="requirement-builder">
      <div className="requirement-group">
        <h3>Outcome & business</h3>
        <div className="requirement-grid">
          {card("useCaseId", (
            <select id="req-useCaseId" value={profile.useCaseId ?? ""} onChange={(event) => set("useCaseId", event.target.value || undefined, "useCaseId")}>
              <option value="">Not selected</option>
              {useCases.map((useCase) => <option key={useCase.id} value={useCase.id}>{useCase.name}</option>)}
            </select>
          ))}
          {card("businessType", <input id="req-businessType" value={profile.businessType} onChange={(event) => set("businessType", event.target.value, "businessType")} placeholder="e.g. Property services" />, false)}
          {card("organizationSizeBand", (
            <select id="req-organizationSizeBand" value={profile.organizationSizeBand} onChange={(event) => set("organizationSizeBand", event.target.value, "organizationSizeBand")}>
              <option value="">Not stated</option>
              {sizeBands.map((band) => <option key={band}>{band}</option>)}
            </select>
          ), false)}
          {card("locations", <input id="req-locations" type="number" min={1} value={profile.locations ?? ""} onChange={(event) => set("locations", number(event.target.value), "locations")} />, false)}
          {card("monthlyVolume", <input id="req-monthlyVolume" type="number" min={0} value={profile.monthlyVolume ?? ""} onChange={(event) => set("monthlyVolume", number(event.target.value), "monthlyVolume")} placeholder="Enquiries / month" />, false)}
          {card("region", (
            <select id="req-region" value={profile.region} onChange={(event) => set("region", event.target.value, "region")}>
              <option value="">Not stated</option>
              {["United Kingdom", "Europe", "North America", "Global"].map((region) => <option key={region}>{region}</option>)}
            </select>
          ))}
        </div>
      </div>
      <div className="requirement-group">
        <h3>Systems</h3>
        <div className="requirement-grid wide">
          {card("currentSystems", <TagInput id="req-currentSystems" values={profile.currentSystems} onChange={(values) => set("currentSystems", values, "currentSystems")} placeholder="Add a current system" />, false)}
          {card("mustKeepSystems", <TagInput id="req-mustKeepSystems" values={profile.mustKeepSystems} onChange={(values) => set("mustKeepSystems", values, "mustKeepSystems")} placeholder="Add a system to keep" />)}
          {card("requiredIntegrations", <TagInput id="req-requiredIntegrations" values={profile.requiredIntegrations} onChange={(values) => set("requiredIntegrations", values, "requiredIntegrations")} placeholder="Add a required integration" />)}
        </div>
      </div>
      <div className="requirement-group">
        <h3>Budget, team & controls</h3>
        <div className="requirement-grid">
          {card("budgetMax", (
            <div className="budget-pair">
              <input aria-label="Minimum setup budget (GBP)" type="number" min={0} value={profile.budgetMin ?? ""} onChange={(event) => set("budgetMin", number(event.target.value), "budgetMax")} placeholder="Min £" />
              <span aria-hidden>–</span>
              <input id="req-budgetMax" aria-label="Maximum setup budget (GBP)" type="number" min={0} value={profile.budgetMax ?? ""} onChange={(event) => set("budgetMax", number(event.target.value), "budgetMax")} placeholder="Max £" />
            </div>
          ))}
          {card("ongoingBudgetMax", <input id="req-ongoingBudgetMax" type="number" min={0} value={profile.ongoingBudgetMax ?? ""} onChange={(event) => set("ongoingBudgetMax", number(event.target.value), "ongoingBudgetMax")} placeholder="Max £ / month" />)}
          {card("technicalCapability", (
            <select id="req-technicalCapability" value={profile.technicalCapability} onChange={(event) => set("technicalCapability", event.target.value as RequirementProfile["technicalCapability"], "technicalCapability")}>
              <option value="none">None — nobody codes</option>
              <option value="basic">Basic — configures SaaS tools</option>
              <option value="intermediate">Intermediate — some scripting</option>
              <option value="advanced">Advanced — in-house developers</option>
            </select>
          ))}
          {card("humanApprovalRequired", (
            <label className="toggle-row">
              <input id="req-humanApprovalRequired" type="checkbox" checked={profile.humanApprovalRequired} onChange={(event) => set("humanApprovalRequired", event.target.checked, "humanApprovalRequired")} />
              {profile.humanApprovalRequired ? "Required for exceptions" : "Not required"}
            </label>
          ))}
          {card("maintenanceTolerance", (
            <select id="req-maintenanceTolerance" value={profile.maintenanceTolerance} onChange={(event) => set("maintenanceTolerance", event.target.value as RequirementProfile["maintenanceTolerance"], "maintenanceTolerance")}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          ), false)}
          {card("dataResidency", (
            <select id="req-dataResidency" value={profile.dataResidency ?? ""} onChange={(event) => set("dataResidency", event.target.value || undefined, "dataResidency")}>
              <option value="">No requirement</option>
              <option value="UK">UK</option>
              <option value="EU">EU</option>
              <option value="US">US</option>
            </select>
          ))}
          {card("deploymentPreference", (
            <select id="req-deploymentPreference" value={profile.deploymentPreference} onChange={(event) => set("deploymentPreference", event.target.value, "deploymentPreference")}>
              <option>Cloud</option>
              <option>Self-hosted</option>
            </select>
          ))}
          {card("commercialReuseRequired", (
            <label className="toggle-row">
              <input id="req-commercialReuseRequired" type="checkbox" checked={!!profile.commercialReuseRequired} onChange={(event) => set("commercialReuseRequired", event.target.checked, "commercialReuseRequired")} />
              Need rights to reuse the Blueprint commercially
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SolutionCompilerProgress({ stages }: { stages: CompilerStage[] }) {
  return (
    <ol className="compiler-progress" aria-label="Compiler stages" aria-live="polite">
      {stages.map((stage) => (
        <li key={stage.id}>
          <CheckCircle2 size={17} aria-hidden />
          <span>
            <strong>{stage.label}</strong>
            <small>{stage.detail}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

function AlternativeComponentSelector({
  item,
  products,
  onChange,
}: {
  item: SolutionCandidateItem;
  products: Product[];
  onChange: (productId: string) => void;
}) {
  const options = [item.productId, ...item.alternativeProductIds];
  const name = (id: string) => products.find((product) => product.id === id)?.name ?? id;
  const product = products.find((candidate) => candidate.id === item.productId);
  return (
    <div className="candidate-slot">
      {product ? <Logo initials={product.initials} color={product.color} /> : <span className="logo-tile sand">?</span>}
      <div>
        <small>{capabilityLabel(item.capabilityId)}</small>
        {options.length > 1 ? (
          <select aria-label={`Component for ${capabilityLabel(item.capabilityId)}`} value={item.productId} onChange={(event) => onChange(event.target.value)}>
            {options.map((id) => <option key={id} value={id}>{name(id)}</option>)}
          </select>
        ) : (
          <strong>{name(item.productId)}</strong>
        )}
      </div>
    </div>
  );
}

export function SolutionCandidateCard({
  candidate,
  items,
  products,
  implementations,
  onSubstitute,
  onExplain,
  onRequest,
}: {
  candidate: SolutionCandidate;
  items: SolutionCandidateItem[];
  products: Product[];
  implementations: ImplementationRecord[];
  onSubstitute: (slotId: string, productId: string) => void;
  onExplain: () => void;
  onRequest: () => void;
}) {
  const slots = items.filter((item) => item.candidateId === candidate.id);
  const source = candidate.explanation?.blueprintSource;
  const relationships = candidate.explanation?.relationships ?? [];
  const typed = relationships.filter((relationship) => relationship.outcome === "satisfied" && !["custom-integration-required", "requires-middleware"].includes(relationship.relationshipType)).length;
  return (
    <article className={`card solution-candidate ${candidate.dominated ? "solution-dominated" : ""} ${candidate.feasible ? "" : "solution-infeasible"}`} aria-label={`Option: ${candidate.name}`}>
      <div className="solution-candidate-head">
        <div className="row wrap">
          {candidate.tradeoffLabels.map((label) => <span key={label} className="tradeoff-label">{label}</span>)}
          {!candidate.feasible && <span className="tradeoff-label danger"><TriangleAlert size={13} aria-hidden /> Not feasible</span>}
          {candidate.feasible && candidate.dominated && <span className="tradeoff-label muted-label">Dominated on recorded trade-offs</span>}
          {candidate.substituted && <span className="tradeoff-label muted-label">Modified by you · re-validated</span>}
        </div>
        <h3>{candidate.name}</h3>
        <div className="row wrap candidate-meta">
          {source && <span>Blueprint v{source.version}</span>}
          {source && <RightsBadge rights={source.rights} />}
          {source && <StalenessBadge state={source.freshness} />}
          {!!candidate.equivalentVariants && <span className="muted">+{candidate.equivalentVariants} equivalent component variant{candidate.equivalentVariants === 1 ? "" : "s"}</span>}
        </div>
      </div>
      {!candidate.feasible && (
        <div className="candidate-infeasible" role="alert">
          <strong>Your change makes this option infeasible:</strong>
          <ul>{candidate.constraintResults.filter((result) => result.strength === "hard" && result.outcome === "violated").map((result) => <li key={result.id}>{result.reason}</li>)}</ul>
        </div>
      )}
      <div className="candidate-slots">
        {slots.map((item) => (
          <AlternativeComponentSelector key={item.id} item={item} products={products} onChange={(productId) => onSubstitute(item.slotId!, productId)} />
        ))}
      </div>
      <dl className="candidate-objectives">
        <div><dt>Setup cost</dt><dd>{rangeText(candidate.objectives.setupCost)}</dd></div>
        <div><dt>Ongoing</dt><dd>{rangeText(candidate.objectives.monthlyCost, " / month")}</dd></div>
        <div><dt>Maintenance</dt><dd>{hoursText(candidate.objectives.maintenanceHours)}</dd></div>
        <div><dt>Complexity</dt><dd>{candidate.objectives.complexity} units</dd></div>
        <div><dt>Typed compatibility</dt><dd>{typed} of {relationships.length} handoffs</dd></div>
        <div><dt>Implementation evidence</dt><dd>{candidate.objectives.implementationEvidence} record{candidate.objectives.implementationEvidence === 1 ? "" : "s"}</dd></div>
      </dl>
      <p className="cost-basis">Cost basis: {candidate.explanation?.costBasis ?? "Not recorded"}</p>
      <div className="candidate-constraints">
        <span><ShieldCheck size={15} aria-hidden /> {candidate.satisfiedHardConstraints.length} hard constraints satisfied</span>
        {!!candidate.unknownHardConstraints.length && <span className="warn"><CircleHelp size={15} aria-hidden /> {candidate.unknownHardConstraints.length} hard constraint{candidate.unknownHardConstraints.length === 1 ? "" : "s"} unknown</span>}
        {!!candidate.softPreferenceMisses.length && <span className="muted"><X size={15} aria-hidden /> {candidate.softPreferenceMisses.length} preference{candidate.softPreferenceMisses.length === 1 ? "" : "s"} not met</span>}
      </div>
      <div className="row wrap solution-actions">
        <button type="button" className="button light" onClick={onExplain}>
          Why this appears <FileSearch size={15} aria-hidden />
        </button>
        {source && (
          <Link className="button light" to={`/blueprints/${source.blueprintId}`}>
            Blueprint <Layers3 size={15} aria-hidden />
          </Link>
        )}
        <button type="button" className="button dark" onClick={onRequest} disabled={!candidate.feasible}>
          Request proposals <ArrowRight size={15} aria-hidden />
        </button>
      </div>
      {!!candidate.sourceImplementationIds.length && (
        <p className="candidate-evidence-line">
          Published records using most of these components: {candidate.sourceImplementationIds.map((id, index) => {
            const record = implementations.find((item) => item.id === id);
            return (
              <span key={id}>
                {index > 0 && ", "}
                <Link to={`/implementations/${record?.slug ?? id}`}>{record?.name ?? id}</Link>
              </span>
            );
          })}
        </p>
      )}
    </article>
  );
}

function ExplainSection({ title, items, icon, empty = "None recorded." }: { title: string; items: ReactNode[]; icon: ReactNode; empty?: string }) {
  return (
    <section className="explain-section">
      <h4>{icon} {title}</h4>
      {items.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="muted">{empty}</p>}
    </section>
  );
}

export function SolutionExplanationDrawer({
  candidate,
  products,
  implementations,
  onClose,
}: {
  candidate: SolutionCandidate | null;
  products: Product[];
  implementations: ImplementationRecord[];
  onClose: () => void;
}) {
  const name = (id: string) => products.find((product) => product.id === id)?.name ?? id;
  const explanation = candidate?.explanation;
  return (
    <Drawer open={!!candidate} onClose={onClose} title={candidate ? `Why “${candidate.name}” appears` : "Explanation"} description="Every statement below is derived from recorded data and the constraint results — not generated text.">
      {candidate && explanation && (
        <div className="explanation-body">
          <ExplainSection title="Why it fits" icon={<CheckCircle2 size={16} />} items={explanation.whyItFits} />
          <ExplainSection title="Why it may not fit" icon={<TriangleAlert size={16} />} items={explanation.whyItMayNotFit} />
          <ExplainSection
            title="Hard constraints satisfied"
            icon={<ShieldCheck size={16} />}
            items={candidate.constraintResults.filter((result) => result.strength === "hard" && result.outcome === "satisfied").map((result) => <><strong>{result.label}.</strong> {result.reason}</>)}
          />
          <ExplainSection
            title="Hard constraints unknown"
            icon={<CircleHelp size={16} />}
            items={candidate.constraintResults.filter((result) => result.strength === "hard" && result.outcome === "unknown").map((result) => <><strong>{result.label}.</strong> {result.reason}</>)}
            empty="None — every hard constraint could be evaluated."
          />
          <ExplainSection
            title="Soft preferences"
            icon={<Scale size={16} />}
            items={candidate.constraintResults.filter((result) => result.strength === "soft").map((result) => <><strong>{result.outcome === "satisfied" ? "Met" : result.outcome === "unknown" ? "Unknown" : "Not met"}: {result.label}.</strong> {result.reason}</>)}
          />
          <ExplainSection
            title="Comparable implementations"
            icon={<Layers3 size={16} />}
            items={explanation.comparableImplementations.map((entry) => {
              const record = implementations.find((item) => item.id === entry.implementationId);
              return <><Link to={`/implementations/${record?.slug ?? entry.implementationId}`}>{record?.name ?? entry.implementationId}</Link> — {entry.summary}</>;
            })}
            empty="No published record uses most of these components with a medium or high context match."
          />
          {explanation.blueprintSource && (
            <ExplainSection
              title="Blueprint source"
              icon={<Layers3 size={16} />}
              items={[<><Link to={`/blueprints/${explanation.blueprintSource.blueprintId}`}>{candidate.name}</Link> v{explanation.blueprintSource.version} · <RightsBadge rights={explanation.blueprintSource.rights} /> · <StalenessBadge state={explanation.blueprintSource.freshness} /></>]}
            />
          )}
          <section className="explain-section">
            <h4><ShieldCheck size={16} /> Technology relationships</h4>
            <ul className="relationship-uses">
              {explanation.relationships.map((relationship, index) => (
                <li key={index}>
                  <strong>{name(relationship.fromProductId)} ↔ {name(relationship.toProductId)}</strong>
                  <span className="row wrap">
                    <RelationshipTypeBadge type={relationship.relationshipType} />
                    {relationship.evidenceLevel && <EvidenceBadge level={relationship.evidenceLevel} compact />}
                  </span>
                  <small>{relationship.note}</small>
                </li>
              ))}
            </ul>
          </section>
          <ExplainSection title="Evidence coverage" icon={<FileSearch size={16} />} items={[explanation.evidenceCoverage]} />
          <ExplainSection title="Unverified areas" icon={<CircleHelp size={16} />} items={explanation.unverifiedAreas} empty="None flagged by the engine. Production validation is still required." />
          <ExplainSection
            title="Economics"
            icon={<Scale size={16} />}
            items={[
              `Setup: ${rangeText(candidate.objectives.setupCost)}`,
              `Ongoing: ${rangeText(candidate.objectives.monthlyCost, " / month")}`,
              `Maintenance: ${hoursText(candidate.objectives.maintenanceHours)}`,
              `Basis: ${explanation.costBasis}. Not a quote.`,
            ]}
          />
        </div>
      )}
    </Drawer>
  );
}

const tradeoffRows: { label: string; value: (candidate: SolutionCandidate) => string; better: string }[] = [
  { label: "Setup cost", value: (c) => rangeText(c.objectives.setupCost), better: "lower" },
  { label: "Ongoing cost", value: (c) => rangeText(c.objectives.monthlyCost, "/mo"), better: "lower" },
  { label: "Maintenance", value: (c) => hoursText(c.objectives.maintenanceHours), better: "lower" },
  { label: "Complexity", value: (c) => `${c.objectives.complexity}`, better: "lower" },
  { label: "Typed compatibility", value: (c) => `${Math.round(c.objectives.compatibilityCoverage * 100)}% of handoffs`, better: "higher" },
  { label: "Implementation evidence", value: (c) => `${c.objectives.implementationEvidence} records`, better: "higher" },
  { label: "Flexibility", value: (c) => `${c.objectives.flexibility} swappable slots`, better: "higher" },
  { label: "Hard constraints unknown", value: (c) => `${c.unknownHardConstraints.length}`, better: "lower" },
];

export function SolutionTradeoffView({ candidates }: { candidates: SolutionCandidate[] }) {
  if (candidates.length < 2) return null;
  return (
    <div className="tradeoff-table-wrap card">
      <table className="tradeoff-table">
        <caption>Raw trade-off values for the non-dominated options. There is no combined score and no overall winner.</caption>
        <thead>
          <tr>
            <th scope="col">Objective</th>
            {candidates.map((candidate) => <th scope="col" key={candidate.id}>{candidate.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {tradeoffRows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}<small>{row.better} is better</small></th>
              {candidates.map((candidate) => <td key={candidate.id} data-label={candidate.name}>{row.value(candidate)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DecisionTraceDrawer({
  open,
  onClose,
  result,
  catalogue,
}: {
  open: boolean;
  onClose: () => void;
  result: CompiledSolution;
  catalogue: CompilerCatalogue;
}) {
  const [check, setCheck] = useState<string | null>(null);
  const trace: DecisionTrace = result.trace;
  return (
    <Drawer open={open} onClose={onClose} title="Decision trace" description="Everything needed to reproduce and audit this run.">
      <div className="trace-body">
        <dl className="detail-list">
          <div><dt>Engine</dt><dd>{trace.engineVersion}</dd></div>
          <div><dt>Ruleset</dt><dd>{trace.rulesetVersion}</dd></div>
          <div><dt>Fingerprint schema</dt><dd>{trace.fingerprintSchemaVersion}</dd></div>
          <div><dt>Evaluated as of</dt><dd>{trace.asOf}</dd></div>
          <div><dt>Catalogue digest</dt><dd><code>{trace.catalogueDigest.slice(0, 16)}…</code></dd></div>
          <div><dt>Result digest</dt><dd><code>{result.run.resultDigest?.slice(0, 16)}…</code></dd></div>
        </dl>
        <div className="row wrap">
          <button
            type="button"
            className="button light"
            onClick={() => setCheck(verifyReproducibility(result.run, catalogue).reason)}
          >
            <RotateCcw size={15} aria-hidden /> Re-run and compare
          </button>
          <button type="button" className="button light" onClick={() => downloadJson(`${result.run.id}-trace.json`, { run: { ...result.run, trace: undefined }, trace })}>
            <Download size={15} aria-hidden /> Download trace JSON
          </button>
        </div>
        {check && <p className="notice" role="status">{check}</p>}
        <h4>Candidate pool</h4>
        <ul>{trace.candidatePool.map((entry) => <li key={entry.versionId}>{entry.versionId}: {entry.assignments} combinations{entry.truncated ? " (truncated at the enumeration cap)" : ""}</li>)}</ul>
        <h4>Constraints applied</h4>
        <ul>{trace.constraintsApplied.map((constraint) => <li key={constraint.id}><Badge>{constraint.strength}</Badge> {constraint.label}</li>)}</ul>
        <h4>Exclusions ({trace.exclusions.length})</h4>
        <ul>{trace.exclusions.map((exclusion) => <li key={exclusion.id}><strong>{exclusion.id}</strong> — {exclusion.reason}</li>)}</ul>
        <h4>Evidence used</h4>
        <p className="muted">Relationships: {trace.compatibilityEvidenceIds.join(", ") || "none"}</p>
        <p className="muted">Implementation records: {trace.implementationEvidenceIds.join(", ") || "none"}</p>
        {!!trace.substitutions.length && (
          <>
            <h4>Your substitutions</h4>
            <ul>{trace.substitutions.map((item, index) => <li key={index}>{item.fromProductId} → {item.toProductId} ({item.feasible ? "still feasible" : "infeasible"})</li>)}</ul>
          </>
        )}
      </div>
    </Drawer>
  );
}
