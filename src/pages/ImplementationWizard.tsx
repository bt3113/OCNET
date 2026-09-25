import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Eye, LockKeyhole, Plus, Save, ShieldAlert, Trash2 } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, ErrorState, Skeleton } from "../components/ui";
import { AttestationInviteDialog } from "../components/attestation";
import { useActions, useUI } from "../state";
import { useIntelligence } from "../data/intelligence-hooks";
import { isSupabase } from "../data/repository";
import { blueprintScan, buildSubmission, emptyDraft, lines, proposedClaims, recordScan, validateStep, type ContributionDraft, type Submission } from "../data/contribution";
import { sanitizationChecklist } from "../data/sanitization";
import { rightsCatalogue } from "../data/rights";
import { capabilityLabel, capabilityLabels, sizeBands } from "../data/taxonomy";
import type { EvidenceArtifact, ReuseRights } from "../data/intelligence-model";

const steps = [
  "Customer & identity",
  "Business context",
  "Problem & baseline",
  "Before process",
  "Process changes",
  "After process",
  "Architecture & stack",
  "Timeline & economics",
  "Observed outcomes",
  "Claims",
  "Evidence",
  "Rights & confidentiality",
  "Customer attestation",
  "Blueprint derivation",
  "Review & submit",
] as const;
const draftKey = "oracnet:implementation-draft:v2";

function Scope({ kind }: { kind: "public" | "private" }) {
  return kind === "public" ? (
    <span className="field-scope public"><Eye size={12} aria-hidden /> PUBLIC</span>
  ) : (
    <span className="field-scope private"><LockKeyhole size={12} aria-hidden /> PRIVATE VERIFICATION DATA</span>
  );
}

function Field({ label, scope, children, help }: { label: string; scope?: "public" | "private"; children: ReactNode; help?: string }) {
  return (
    <label className="wizard-field">
      <span className="wizard-field-label">{label} {scope && <Scope kind={scope} />}</span>
      {children}
      {help && <small className="muted">{help}</small>}
    </label>
  );
}

const num = (value: string) => (value === "" ? null : Number(value));

export default function ImplementationWizard() {
  const { userId, notify } = useUI();
  const actions = useActions();
  const data = useIntelligence();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Submission | null>(null);
  const [invite, setInvite] = useState(false);
  const [draft, setDraft] = useState<ContributionDraft>(() => {
    try {
      const stored = localStorage.getItem(draftKey);
      return stored ? { ...emptyDraft, ...(JSON.parse(stored) as Partial<ContributionDraft>) } : emptyDraft;
    } catch {
      return emptyDraft;
    }
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      } catch {
        // Autosave is best-effort.
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft]);
  const templateMetrics = useMemo(() => data.definitions.filter((definition) => definition.category === "service-enquiry-booking" && !["implementation-cost", "monthly-software-cost", "maintenance-hours"].includes(definition.id)), [data.definitions]);

  if (data.isLoading) return <Skeleton />;
  if (data.isError) return <ErrorState retry={data.refetch} />;

  const patch = <K extends keyof ContributionDraft>(key: K, value: ContributionDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const error = validateStep(step, draft);
  const next = () => {
    if (error) {
      notify(error);
      return;
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
    requestAnimationFrame(() => document.getElementById("wizard-step-title")?.focus());
  };
  const claims = proposedClaims(draft, data.definitions);
  const recordFindings = recordScan(draft);
  const blueprintFindings = blueprintScan(draft);

  async function submit() {
    const firstInvalid = steps.findIndex((_, index) => validateStep(index, draft));
    if (firstInvalid >= 0) {
      setStep(firstInvalid);
      notify(validateStep(firstInvalid, draft)!);
      return;
    }
    if (isSupabase && !userId) {
      notify("Sign in before submitting an implementation record.");
      return;
    }
    if (recordFindings.some((finding) => finding.severity === "block")) {
      notify("Remove credentials, tokens or internal endpoints from the public fields before submitting.");
      return;
    }
    setSaving(true);
    try {
      const submission = buildSubmission(draft, {
        id: `implementation-${crypto.randomUUID()}`,
        ownerId: userId || "demo-user",
        now: new Date(),
        demo: !isSupabase,
        definitions: data.definitions,
        products: data.products,
      });
      // Order matters in connected mode: the record exists before the Blueprint that
      // derives from it, and the Blueprint exists before the record links to it.
      await actions.save("implementation_records", { ...submission.record, derivedBlueprintIds: [] });
      await actions.save("implementation_contexts", submission.context);
      await actions.save("implementation_use_cases", submission.useCase);
      for (const row of submission.steps) await actions.save("implementation_process_steps", row);
      for (const row of submission.stack) await actions.save("implementation_stack_items", row);
      for (const row of submission.connections) await actions.save("implementation_connections", row);
      for (const row of submission.periods) await actions.save("measurement_periods", row);
      for (const row of submission.metrics) await actions.save("implementation_metrics", row);
      for (const row of submission.claims) await actions.save("claims", row);
      for (const row of submission.artifacts) await actions.save("evidence_artifacts", row);
      for (const row of submission.links) await actions.save("claim_evidence", row);
      if (submission.blueprint) {
        await actions.save("blueprints", submission.blueprint.blueprint);
        await actions.save("blueprint_versions", submission.blueprint.version);
        for (const row of submission.blueprint.items) await actions.save("blueprint_stack_items", row);
        for (const row of submission.blueprint.connections) await actions.save("blueprint_connections", row);
        await actions.save("blueprint_licenses", submission.blueprint.license);
        await actions.save("implementation_records", submission.record);
      }
      if (isSupabase && submission.privateCustomerName) {
        const { supabase } = await import("../data/supabase");
        const { error: identityError } = await supabase
          .from("implementation_customer_identities")
          .upsert({ implementationId: submission.record.id, customerName: submission.privateCustomerName });
        if (identityError) notify("Record saved, but the private customer name could not be stored. Add it from your workspace.");
      }
      localStorage.removeItem(draftKey);
      setDone(submission);
      notify("Implementation submitted for moderation.");
    } catch {
      // useActions surfaced the error; the draft stays saved.
    } finally {
      setSaving(false);
    }
  }

  if (done)
    return (
      <div className="card wizard-done" role="status">
        <Badge>{isSupabase ? "SUBMITTED" : "DEMO SUBMISSION"}</Badge>
        <h1>Submitted for moderation.</h1>
        <p>Your record is visible to you now and becomes public after review. Claims start as creator-reported; evidence levels change only through attestation or review.{done.blueprint ? " The derived Blueprint is a separate draft awaiting moderation." : ""}</p>
        {!isSupabase && <p className="muted">Demo: saved in this browser only. {done.privateCustomerName ? "The private customer name you entered was not stored anywhere in demo mode." : ""}</p>}
        <div className="row wrap">
          <Link className="button dark" to={`/implementations/${done.record.slug}`}>View your record</Link>
          {draft.inviteCustomer && <button type="button" className="button light" onClick={() => setInvite(true)}>Invite the customer to attest</button>}
          <Link className="button light" to="/creator/implementations">Implementer workspace</Link>
        </div>
        {invite && <AttestationInviteDialog record={done.record} claims={done.claims} open onClose={() => setInvite(false)} />}
      </div>
    );

  const productOptions = [...data.products].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHeading
        eyebrow="CONTRIBUTE AN IMPLEMENTATION RECORD"
        title="Document what happened — without exposing customer secrets."
        description="Fifteen short steps separate public context from private verification data. Fields are marked PUBLIC or PRIVATE. Your draft saves automatically in this browser."
      />
      <div className="implementation-wizard-shell">
        <nav className="implementation-wizard-steps" aria-label="Submission steps">
          {steps.map((label, index) => (
            <button type="button" key={label} className={index === step ? "active" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined} onClick={() => index <= step && setStep(index)} disabled={index > step}>
              <span>{index < step ? <Check size={13} aria-hidden /> : index + 1}</span>
              {label}
            </button>
          ))}
        </nav>
        <section className="card implementation-wizard-panel" aria-labelledby="wizard-step-title">
          <div className="wizard-panel-head">
            <div>
              <span className="eyebrow">STEP {step + 1} OF {steps.length}</span>
              <h2 id="wizard-step-title" tabIndex={-1}>{steps[step]}</h2>
            </div>
            <span className="autosave-state" role="status"><Save size={14} aria-hidden /> {savedAt ? `Draft saved ${savedAt}` : "Autosave on"}</span>
          </div>

          {step === 0 && (
            <div className="form-stack">
              <Field label="Customer or organization name" scope="private" help="Used only for verification. Never shown publicly unless you choose Public identity and have permission.">
                <input value={draft.customerName} onChange={(event) => patch("customerName", event.target.value)} autoComplete="off" />
              </Field>
              <fieldset className="radio-group">
                <legend>How should the customer appear publicly?</legend>
                {([["public", "Public identity", "Name appears on the record (requires permission)."], ["anonymous", "Anonymous publicly", "Described by sector and size only."], ["private", "Private to Oracnet", "Only reviewers know who the customer is."]] as const).map(([value, label, help]) => (
                  <label key={value} className="radio-card">
                    <input type="radio" name="customer-visibility" checked={draft.customerVisibility === value} onChange={() => patch("customerVisibility", value)} />
                    <span><strong>{label}</strong><small>{help}</small></span>
                  </label>
                ))}
              </fieldset>
              <label className="checkbox-label"><input type="checkbox" checked={draft.customerPermission} onChange={(event) => patch("customerPermission", event.target.checked)} /> The customer has given permission to publish this record{draft.customerVisibility === "public" ? " with their name" : ""}.</label>
            </div>
          )}

          {step === 1 && (
            <div className="form-stack">
              <Field label="Record name" scope="public"><input value={draft.name} onChange={(event) => patch("name", event.target.value)} placeholder="e.g. Multi-location enquiry automation" /></Field>
              <Field label="One-line summary" scope="public"><textarea rows={2} value={draft.summary} onChange={(event) => patch("summary", event.target.value)} /></Field>
              <div className="grid two">
                <Field label="Outcome / use case" scope="public">
                  <select value={draft.useCaseId} onChange={(event) => patch("useCaseId", event.target.value)}>
                    {data.useCases.filter((item) => ["enquiry-to-booking", "lead-qualification-routing", "after-hours-reservations"].includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </Field>
                <Field label="Business type" scope="public"><input value={draft.businessType} onChange={(event) => patch("businessType", event.target.value)} placeholder="e.g. Property maintenance services" /></Field>
                <Field label="Industry" scope="public"><input value={draft.industry} onChange={(event) => patch("industry", event.target.value)} /></Field>
                <Field label="Organization size" scope="public"><select value={draft.organizationSizeBand} onChange={(event) => patch("organizationSizeBand", event.target.value)}>{sizeBands.map((band) => <option key={band}>{band}</option>)}</select></Field>
                <Field label="Region" scope="public"><select value={draft.region} onChange={(event) => patch("region", event.target.value)}>{["United Kingdom", "Europe", "North America", "Global"].map((region) => <option key={region}>{region}</option>)}</select></Field>
                <Field label="Locations" scope="public"><input type="number" min={1} value={draft.locations ?? ""} onChange={(event) => patch("locations", num(event.target.value))} /></Field>
                <Field label="Monthly volume (from)" scope="public"><input type="number" min={0} value={draft.volumeMin ?? ""} onChange={(event) => patch("volumeMin", num(event.target.value))} placeholder="Optional" /></Field>
                <Field label="Monthly volume (to)" scope="public"><input type="number" min={0} value={draft.volumeMax ?? ""} onChange={(event) => patch("volumeMax", num(event.target.value))} placeholder="Optional" /></Field>
                <Field label="In-house technical capability" scope="public">
                  <select value={draft.technicalCapability} onChange={(event) => patch("technicalCapability", event.target.value as ContributionDraft["technicalCapability"])}>
                    <option value="none">None</option><option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                  </select>
                </Field>
                <Field label="Existing systems (comma separated)" scope="public"><input value={draft.existingSystems} onChange={(event) => patch("existingSystems", event.target.value)} placeholder="e.g. HubSpot CRM, Phone" /></Field>
              </div>
              <Field label="Business context" scope="public" help="Describe the business so others can judge comparability. Do not include the customer’s name if identity is withheld."><textarea rows={4} value={draft.contextSummary} onChange={(event) => patch("contextSummary", event.target.value)} /></Field>
            </div>
          )}

          {step === 2 && (
            <div className="form-stack">
              <Field label="What problem existed before?" scope="public"><textarea rows={5} value={draft.problem} onChange={(event) => patch("problem", event.target.value)} /></Field>
              <fieldset className="metric-picker">
                <legend>Metrics you measured (same definition before and after)</legend>
                {templateMetrics.map((definition) => (
                  <div key={definition.id} className="metric-picker-row">
                    <label className="checkbox-label"><input type="checkbox" checked={draft.metricIds.includes(definition.id)} onChange={(event) => patch("metricIds", event.target.checked ? [...draft.metricIds, definition.id] : draft.metricIds.filter((id) => id !== definition.id))} /> {definition.name} <small className="muted">({definition.unit})</small></label>
                    {draft.metricIds.includes(definition.id) && (
                      <input type="number" aria-label={`Baseline ${definition.name}`} placeholder="Baseline" value={draft.baseline[definition.id] ?? ""} onChange={(event) => patch("baseline", { ...draft.baseline, [definition.id]: num(event.target.value) })} />
                    )}
                  </div>
                ))}
              </fieldset>
              <div className="grid two">
                <Field label="Baseline period start" scope="public"><input type="date" value={draft.baselineStart} onChange={(event) => patch("baselineStart", event.target.value)} /></Field>
                <Field label="Baseline period end" scope="public"><input type="date" value={draft.baselineEnd} onChange={(event) => patch("baselineEnd", event.target.value)} /></Field>
              </div>
            </div>
          )}

          {step === 3 && <Field label="Process before (one step per line)" scope="public" help="What actually happened, including manual steps."><textarea rows={8} value={draft.beforeProcess} onChange={(event) => patch("beforeProcess", event.target.value)} /></Field>}
          {step === 4 && <Field label="What changed (one change per line)" scope="public" help="Operating changes, separate from technology choices."><textarea rows={8} value={draft.processChange} onChange={(event) => patch("processChange", event.target.value)} /></Field>}
          {step === 5 && <Field label="Process after (one step per line)" scope="public" help="Include human review and exception paths explicitly."><textarea rows={8} value={draft.afterProcess} onChange={(event) => patch("afterProcess", event.target.value)} /></Field>}

          {step === 6 && (
            <div className="form-stack">
              <p className="muted">Record components that were actually used. Listing them together records co-occurrence only; compatibility is verified separately.</p>
              {draft.stack.map((item, index) => (
                <div key={index} className="stack-editor-row">
                  <span className="stack-index">{index + 1}</span>
                  <select aria-label={`Component ${index + 1} product`} value={item.productId} onChange={(event) => { const product = data.products.find((entry) => entry.id === event.target.value); patch("stack", draft.stack.map((entry, position) => (position === index ? { ...entry, productId: event.target.value, capabilityId: product?.capabilityIds[0] ?? entry.capabilityId } : entry))); }}>
                    {productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                  <select aria-label={`Component ${index + 1} capability`} value={item.capabilityId} onChange={(event) => patch("stack", draft.stack.map((entry, position) => (position === index ? { ...entry, capabilityId: event.target.value } : entry)))}>
                    {Object.keys(capabilityLabels).map((id) => <option key={id} value={id}>{capabilityLabel(id)}</option>)}
                  </select>
                  <input aria-label={`Component ${index + 1} role`} placeholder="Role, e.g. Exception queue" value={item.role} onChange={(event) => patch("stack", draft.stack.map((entry, position) => (position === index ? { ...entry, role: event.target.value } : entry)))} />
                  <button type="button" className="icon-button" aria-label={`Remove component ${index + 1}`} onClick={() => patch("stack", draft.stack.filter((_, position) => position !== index))}><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" className="button light" onClick={() => patch("stack", [...draft.stack, { productId: productOptions[0]?.id ?? "", capabilityId: productOptions[0]?.capabilityIds[0] ?? "automation", role: "" }])}><Plus size={15} aria-hidden /> Add component</button>
              {draft.stack.length >= 2 && (
                <fieldset className="connection-editor">
                  <legend>Connections (data flows)</legend>
                  {draft.connections.map((edge, index) => (
                    <div key={index} className="stack-editor-row">
                      <select aria-label={`Connection ${index + 1} from`} value={edge.from} onChange={(event) => patch("connections", draft.connections.map((entry, position) => (position === index ? { ...entry, from: Number(event.target.value) } : entry)))}>
                        {draft.stack.map((item, position) => <option key={position} value={position}>{position + 1}. {data.products.find((product) => product.id === item.productId)?.name}</option>)}
                      </select>
                      <select aria-label={`Connection ${index + 1} to`} value={edge.to} onChange={(event) => patch("connections", draft.connections.map((entry, position) => (position === index ? { ...entry, to: Number(event.target.value) } : entry)))}>
                        {draft.stack.map((item, position) => <option key={position} value={position}>{position + 1}. {data.products.find((product) => product.id === item.productId)?.name}</option>)}
                      </select>
                      <input aria-label={`Connection ${index + 1} label`} placeholder="Label" value={edge.label} onChange={(event) => patch("connections", draft.connections.map((entry, position) => (position === index ? { ...entry, label: event.target.value } : entry)))} />
                      <input aria-label={`Connection ${index + 1} data`} placeholder="Data passed" value={edge.dataFlow} onChange={(event) => patch("connections", draft.connections.map((entry, position) => (position === index ? { ...entry, dataFlow: event.target.value } : entry)))} />
                      <label className="checkbox-label small"><input type="checkbox" checked={edge.trustBoundary} onChange={(event) => patch("connections", draft.connections.map((entry, position) => (position === index ? { ...entry, trustBoundary: event.target.checked } : entry)))} /> Leaves the business</label>
                      <button type="button" className="icon-button" aria-label={`Remove connection ${index + 1}`} onClick={() => patch("connections", draft.connections.filter((_, position) => position !== index))}><Trash2 size={15} /></button>
                    </div>
                  ))}
                  <button type="button" className="button light" onClick={() => patch("connections", [...draft.connections, { from: 0, to: 1, label: "", dataFlow: "", trustBoundary: false }])}><Plus size={15} aria-hidden /> Add connection</button>
                </fieldset>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="grid two">
              <Field label="Implementation start" scope="public"><input type="date" value={draft.startDate} onChange={(event) => patch("startDate", event.target.value)} /></Field>
              <Field label="Go-live" scope="public"><input type="date" value={draft.goLiveDate} onChange={(event) => patch("goLiveDate", event.target.value)} /></Field>
              <Field label="Duration" scope="public"><input value={draft.duration} onChange={(event) => patch("duration", event.target.value)} placeholder="e.g. 5 weeks" /></Field>
              <Field label="Setup cost disclosure" scope="public">
                <select value={draft.costDisclosure} onChange={(event) => patch("costDisclosure", event.target.value as ContributionDraft["costDisclosure"])}>
                  <option value="not-disclosed">Not disclosed</option><option value="exact">Exact</option><option value="range">Range</option>
                </select>
              </Field>
              {draft.costDisclosure !== "not-disclosed" && <Field label={draft.costDisclosure === "range" ? "Cost from (GBP)" : "Cost (GBP)"} scope="public"><input type="number" min={0} value={draft.costLow ?? ""} onChange={(event) => patch("costLow", num(event.target.value))} /></Field>}
              {draft.costDisclosure === "range" && <Field label="Cost to (GBP)" scope="public"><input type="number" min={0} value={draft.costHigh ?? ""} onChange={(event) => patch("costHigh", num(event.target.value))} /></Field>}
              <Field label="Ongoing software cost / month (GBP)" scope="public"><input type="number" min={0} value={draft.monthlyCost ?? ""} onChange={(event) => patch("monthlyCost", num(event.target.value))} placeholder="Leave blank if not disclosed" /></Field>
              <Field label="Maintenance hours / month" scope="public"><input type="number" min={0} value={draft.maintenanceHours ?? ""} onChange={(event) => patch("maintenanceHours", num(event.target.value))} /></Field>
              <Field label="Maintenance burden" scope="public"><select value={draft.maintenanceBurden} onChange={(event) => patch("maintenanceBurden", event.target.value as ContributionDraft["maintenanceBurden"])}><option value="unknown">Not stated</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
            </div>
          )}

          {step === 8 && (
            <div className="form-stack">
              <div className="notice"><ShieldAlert size={18} aria-hidden /><p>Record “observed after implementation”. Oracnet never presents before/after values as proof that the implementation caused the change.</p></div>
              {draft.metricIds.map((id) => {
                const definition = data.definitions.find((item) => item.id === id);
                return (
                  <Field key={id} label={`${definition?.name ?? id} — observed (${definition?.unit})`} scope="public" help={`Baseline: ${draft.baseline[id] ?? "not recorded"}`}>
                    <input type="number" value={draft.observed[id] ?? ""} onChange={(event) => patch("observed", { ...draft.observed, [id]: num(event.target.value) })} />
                  </Field>
                );
              })}
              <div className="grid two">
                <Field label="Observed period start" scope="public"><input type="date" value={draft.observedStart} onChange={(event) => patch("observedStart", event.target.value)} /></Field>
                <Field label="Observed period end" scope="public"><input type="date" value={draft.observedEnd} onChange={(event) => patch("observedEnd", event.target.value)} /></Field>
              </div>
              <Field label="Measurement notes & limitations" scope="public"><textarea rows={4} value={draft.measurementNotes} onChange={(event) => patch("measurementNotes", event.target.value)} placeholder="Definition changes, seasonality, exclusions…" /></Field>
            </div>
          )}

          {step === 9 && (
            <div className="form-stack">
              <p className="muted">Each material statement becomes a separate claim with its own evidence. New claims start as creator-reported and pending review.</p>
              {claims.map((claim) => {
                const option = draft.claimOptions[claim.key] ?? { include: true, method: "", limitations: "" };
                const set = (value: Partial<typeof option>) => patch("claimOptions", { ...draft.claimOptions, [claim.key]: { ...option, ...value } });
                return (
                  <div key={claim.key} className="claim-editor card">
                    <label className="checkbox-label"><input type="checkbox" checked={option.include} onChange={(event) => set({ include: event.target.checked })} /> <strong>{claim.name}</strong> <span className="muted">{claim.value}{claim.unit && claim.unit !== "GBP" ? ` ${claim.unit}` : ""}</span></label>
                    {option.include && (
                      <div className="grid two">
                        <Field label="How do you know? (evidence method)" scope="public"><input value={option.method} onChange={(event) => set({ method: event.target.value })} placeholder="e.g. CRM export, phone system report" /></Field>
                        <Field label="Known limitations" scope="public"><input value={option.limitations} onChange={(event) => set({ limitations: event.target.value })} /></Field>
                      </div>
                    )}
                  </div>
                );
              })}
              {!claims.length && <p className="muted">No claims yet — add components, dates, cost or observed values in earlier steps.</p>}
            </div>
          )}

          {step === 10 && (
            <div className="form-stack">
              <div className="notice"><LockKeyhole size={18} aria-hidden /><p>Evidence files are private. {isSupabase ? "After submission, upload files from your workspace; they go to a private bucket and reviewers receive short-lived signed links." : "The static demo does not accept files — describe what exists instead."} Only the description below is shown publicly as metadata.</p></div>
              {draft.evidence.map((item, index) => (
                <div key={index} className="stack-editor-row">
                  <select aria-label={`Evidence ${index + 1} type`} value={item.kind} onChange={(event) => patch("evidence", draft.evidence.map((entry, position) => (position === index ? { ...entry, kind: event.target.value as EvidenceArtifact["kind"] } : entry)))}>
                    {["analytics-export", "system-log", "invoice", "screenshot", "deployment-documentation", "customer-attestation", "contract-excerpt", "public-case-study", "other"].map((kind) => <option key={kind} value={kind}>{kind.replaceAll("-", " ")}</option>)}
                  </select>
                  <input aria-label={`Evidence ${index + 1} description`} placeholder="What it shows (public metadata)" value={item.description} onChange={(event) => patch("evidence", draft.evidence.map((entry, position) => (position === index ? { ...entry, description: event.target.value } : entry)))} />
                  <button type="button" className="icon-button" aria-label={`Remove evidence ${index + 1}`} onClick={() => patch("evidence", draft.evidence.filter((_, position) => position !== index))}><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" className="button light" onClick={() => patch("evidence", [...draft.evidence, { kind: "analytics-export", description: "" }])}><Plus size={15} aria-hidden /> Add evidence item</button>
            </div>
          )}

          {step === 11 && (
            <div className="form-stack">
              <Field label="Rights for this record" scope="public" help="Controls what others may do with what you publish. It is separate from any Blueprint.">
                <select value={draft.rightsState} onChange={(event) => patch("rightsState", event.target.value as ReuseRights)}>
                  {Object.entries(rightsCatalogue).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}
                </select>
              </Field>
              <p className="muted">{rightsCatalogue[draft.rightsState].description}</p>
              {!!recordFindings.length && (
                <div className="scan-findings" role="alert">
                  <strong>The scanner flagged possible sensitive content in public fields:</strong>
                  <ul>{recordFindings.map((finding, index) => <li key={index}>{finding.field}: {finding.kind.replaceAll("-", " ")} ({finding.excerpt}){finding.severity === "block" ? " — must be removed" : " — review"}</li>)}</ul>
                </div>
              )}
              <label className="checkbox-label"><input type="checkbox" checked={draft.confidentialityConfirmed} onChange={(event) => patch("confidentialityConfirmed", event.target.checked)} /> Public fields contain no credentials, customer data, private prompts, internal endpoints or confidential business rules.</label>
            </div>
          )}

          {step === 12 && (
            <div className="form-stack">
              <p>A customer attestation lets the customer confirm or reject individual claims. The link is single-use, expires, and shows only the claims you choose.</p>
              <label className="checkbox-label"><input type="checkbox" checked={draft.inviteCustomer} onChange={(event) => patch("inviteCustomer", event.target.checked)} /> Invite the customer after submission</label>
              <p className="muted">{isSupabase ? "The invitation is created and emailed by the server; the token is never stored in plain text." : "Demo: you will get a link to open yourself. No email is sent."}</p>
            </div>
          )}

          {step === 13 && (
            <div className="form-stack">
              <label className="checkbox-label"><input type="checkbox" checked={draft.deriveBlueprint} onChange={(event) => patch("deriveBlueprint", event.target.checked)} /> Derive a separate, reusable Blueprint</label>
              {draft.deriveBlueprint && (
                <>
                  <Field label="Blueprint name" scope="public"><input value={draft.blueprintName} onChange={(event) => patch("blueprintName", event.target.value)} /></Field>
                  <Field label="Description (no customer details)" scope="public"><textarea rows={3} value={draft.blueprintDescription} onChange={(event) => patch("blueprintDescription", event.target.value)} /></Field>
                  <Field label="Setup notes" scope="public"><textarea rows={3} value={draft.blueprintSetupNotes} onChange={(event) => patch("blueprintSetupNotes", event.target.value)} /></Field>
                  <Field label="Blueprint reuse rights" scope="public">
                    <select value={draft.blueprintRights} onChange={(event) => patch("blueprintRights", event.target.value as ReuseRights)}>
                      {Object.entries(rightsCatalogue).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}
                    </select>
                  </Field>
                  {!!blueprintFindings.length && (
                    <div className="scan-findings" role="alert">
                      <strong>Scanner findings in text that would become public:</strong>
                      <ul>{blueprintFindings.map((finding, index) => <li key={index}>{finding.field}: {finding.kind.replaceAll("-", " ")} ({finding.excerpt}){finding.severity === "block" ? " — must be removed" : " — review"}</li>)}</ul>
                    </div>
                  )}
                  <fieldset className="sanitization-checklist">
                    <legend>Sanitization checklist — confirm each item</legend>
                    {sanitizationChecklist.map((item) => (
                      <label key={item.id} className="checkbox-label"><input type="checkbox" checked={draft.sanitizationConfirmed.includes(item.id)} onChange={(event) => patch("sanitizationConfirmed", event.target.checked ? [...draft.sanitizationConfirmed, item.id] : draft.sanitizationConfirmed.filter((id) => id !== item.id))} /> {item.label}</label>
                    ))}
                  </fieldset>
                  <p className="muted small-print">Automated scanning assists you; it cannot guarantee that everything sensitive was removed, and it is not legal clearance. The Blueprint is published only after moderation.</p>
                </>
              )}
            </div>
          )}

          {step === 14 && (
            <div className="form-stack">
              <div className="review-columns">
                <div className="card review-public">
                  <Scope kind="public" />
                  <h3>{draft.name || "Untitled record"}</h3>
                  <p>{draft.summary || draft.problem.slice(0, 200)}</p>
                  <dl className="detail-list">
                    <div><dt>Customer shown as</dt><dd>{draft.customerVisibility === "public" && draft.customerPermission ? draft.customerName || "(name pending)" : draft.customerVisibility === "anonymous" ? "Withheld publicly" : "Private to Oracnet"}</dd></div>
                    <div><dt>Business</dt><dd>{draft.businessType} · {draft.organizationSizeBand} · {draft.region}</dd></div>
                    <div><dt>Components</dt><dd>{draft.stack.map((item) => data.products.find((product) => product.id === item.productId)?.name).join(", ") || "None"}</dd></div>
                    <div><dt>Process steps</dt><dd>{lines(draft.beforeProcess).length} before · {lines(draft.processChange).length} changes · {lines(draft.afterProcess).length} after</dd></div>
                    <div><dt>Claims</dt><dd>{claims.filter((claim) => draft.claimOptions[claim.key]?.include !== false).length} (creator-reported, pending review)</dd></div>
                    <div><dt>Rights</dt><dd>{rightsCatalogue[draft.rightsState].label}</dd></div>
                    <div><dt>Blueprint</dt><dd>{draft.deriveBlueprint ? `${draft.blueprintName} — separate draft, pending moderation` : "None"}</dd></div>
                  </dl>
                </div>
                <div className="card review-private">
                  <Scope kind="private" />
                  <dl className="detail-list">
                    <div><dt>Customer name</dt><dd>{draft.customerName || "Not provided"}</dd></div>
                    <div><dt>Evidence items</dt><dd>{draft.evidence.length} (files private to reviewers)</dd></div>
                    <div><dt>Attestation</dt><dd>{draft.inviteCustomer ? "Invite after submission" : "Not requested"}</dd></div>
                  </dl>
                  <p className="muted small-print">Nothing in this panel appears on the public record, in search, or in page metadata.</p>
                </div>
              </div>
              <label className="checkbox-label"><input type="checkbox" checked={draft.declaration} onChange={(event) => patch("declaration", event.target.checked)} /> I confirm this describes a real implementation accurately, distinguishes observation from causation, and contains no secrets.</label>
              <button className="button dark" disabled={saving} type="button" onClick={() => void submit()}>{saving ? "Submitting…" : "Submit for moderation"} <ArrowRight size={17} aria-hidden /></button>
            </div>
          )}

          <div className="wizard-navigation">
            <button className="button light" type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft size={16} aria-hidden /> Back</button>
            {step < steps.length - 1 && <button className="button dark" type="button" onClick={next}>Continue <ArrowRight size={16} aria-hidden /></button>}
          </div>
          {error && step < steps.length - 1 && <p className="muted wizard-hint" aria-live="polite">{error}</p>}
        </section>
      </div>
      <div className="wizard-privacy-foot"><LockKeyhole size={16} aria-hidden /> {isSupabase ? "Submissions are reviewed before publication." : "Demo mode: everything stays in this browser. Do not enter real confidential information."}</div>
    </>
  );
}
