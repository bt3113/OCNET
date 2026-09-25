import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileKey2,
  LockKeyhole,
  Save,
  ShieldCheck,
} from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, Skeleton } from "../components/ui";
import { useActions, useRecords, useUI } from "../state";
import { isSupabase } from "../data/repository";
import type {
  CustomerIdentityVisibility,
  ImplementationRecord,
  ReuseRights,
} from "../data/intelligence-model";

const steps = [
  "Customer / context",
  "Problem & baseline",
  "Existing process",
  "Process change",
  "Architecture",
  "Technology stack",
  "Timeline & economics",
  "Outcomes / measurement",
  "Evidence",
  "Rights & confidentiality",
  "Customer attestation",
  "Blueprint derivation",
  "Review & publish",
] as const;

interface Draft {
  name: string;
  summary: string;
  businessType: string;
  industry: string;
  organizationSizeBand: string;
  region: string;
  locations: number | null;
  monthlyVolume: number | null;
  contextSummary: string;
  existingSystems: string;
  technicalCapability: "none" | "basic" | "intermediate" | "advanced";
  problem: string;
  baselineFirstResponse: number | null;
  beforeProcess: string;
  processChange: string;
  afterProcess: string;
  stackProductIds: string[];
  implementationDuration: string;
  implementationCost: number | null;
  ongoingMonthlyCost: number | null;
  maintenanceHours: number | null;
  observedFirstResponse: number | null;
  observedManualHours: number | null;
  baselineManualHours: number | null;
  measurementNotes: string;
  evidenceDescription: string;
  evidenceKind: "customer-attestation" | "analytics-export" | "screenshot" | "system-log" | "deployment-documentation" | "public-case-study" | "other";
  customerIdentityVisibility: CustomerIdentityVisibility;
  rightsState: ReuseRights;
  permissionConfirmed: boolean;
  attestationRequested: boolean;
  blueprintRequested: boolean;
  blueprintName: string;
  ownershipConfirmed: boolean;
}

const initialDraft: Draft = {
  name: "",
  summary: "",
  businessType: "Service business",
  industry: "Business services",
  organizationSizeBand: "1–10 employees",
  region: "United Kingdom",
  locations: 1,
  monthlyVolume: null,
  contextSummary: "",
  existingSystems: "",
  technicalCapability: "none",
  problem: "",
  baselineFirstResponse: null,
  beforeProcess: "",
  processChange: "",
  afterProcess: "",
  stackProductIds: [],
  implementationDuration: "",
  implementationCost: null,
  ongoingMonthlyCost: null,
  maintenanceHours: null,
  observedFirstResponse: null,
  observedManualHours: null,
  baselineManualHours: null,
  measurementNotes: "",
  evidenceDescription: "",
  evidenceKind: "other",
  customerIdentityVisibility: "anonymous",
  rightsState: "showcase-only",
  permissionConfirmed: false,
  attestationRequested: false,
  blueprintRequested: false,
  blueprintName: "",
  ownershipConfirmed: false,
};

const draftKey = "oracnet:implementation-draft:v1";

export default function ImplementationWizard() {
  const navigate = useNavigate();
  const { userId, notify } = useUI();
  const actions = useActions();
  const { data: products = [], isLoading } = useRecords("products");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === "undefined") return initialDraft;
    const stored = localStorage.getItem(draftKey);
    if (!stored) return initialDraft;
    try {
      return { ...initialDraft, ...(JSON.parse(stored) as Partial<Draft>) };
    } catch {
      return initialDraft;
    }
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [draft]);

  const selectedProducts = useMemo(
    () => products.filter((product) => draft.stackProductIds.includes(product.id)),
    [products, draft.stackProductIds],
  );

  if (isLoading) return <Skeleton />;

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function lines(value: string) {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function validateCurrentStep() {
    if (step === 0 && (draft.name.trim().length < 5 || draft.contextSummary.trim().length < 20)) {
      notify("Add a clear implementation name and business context.");
      return false;
    }
    if (step === 1 && draft.problem.trim().length < 20) {
      notify("Describe the original problem and baseline context.");
      return false;
    }
    if (step === 2 && !lines(draft.beforeProcess).length) {
      notify("Record at least one step in the existing process.");
      return false;
    }
    if (step === 3 && !lines(draft.afterProcess).length) {
      notify("Record the process after implementation.");
      return false;
    }
    if (step === 5 && draft.stackProductIds.length < 2) {
      notify("Select at least two recorded technology components.");
      return false;
    }
    if (step === 9 && !draft.permissionConfirmed) {
      notify("Confirm that you have permission to publish the information entered here.");
      return false;
    }
    if (step === 12 && !draft.ownershipConfirmed) {
      notify("Confirm the publication and evidence declaration before publishing.");
      return false;
    }
    return true;
  }

  async function publish() {
    if (!validateCurrentStep()) return;
    if (isSupabase && !userId) {
      notify("Sign in before submitting an implementation record.");
      navigate("/sign-in");
      return;
    }
    setSaving(true);
    try {
      const id = `implementation-${crypto.randomUUID()}`;
      const slug = `${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${id.slice(-6)}`;
      const provenance = isSupabase ? "creator supplied" : "demo";
      const record: ImplementationRecord = {
        id,
        slug,
        name: draft.name.trim(),
        summary: draft.summary.trim() || draft.problem.trim().slice(0, 220),
        ownerId: userId || "demo-user",
        customerDisplayName:
          draft.customerIdentityVisibility === "public"
            ? "Contributor-provided customer identity"
            : draft.customerIdentityVisibility === "anonymous"
              ? "Customer identity withheld publicly"
              : "Private to Oracnet",
        customerIdentityVisibility: draft.customerIdentityVisibility,
        industry: draft.industry,
        businessType: draft.businessType,
        organizationSizeBand: draft.organizationSizeBand,
        employeeCountRange: draft.organizationSizeBand,
        region: draft.region,
        contextSummary: draft.contextSummary,
        baselinePeriodStart: undefined,
        baselinePeriodEnd: undefined,
        measurementPeriodStart: undefined,
        measurementPeriodEnd: undefined,
        implementationStartDate: undefined,
        goLiveDate: undefined,
        implementationDuration: draft.implementationDuration || "Not disclosed",
        implementationCost: draft.implementationCost,
        implementationCostCurrency: "GBP",
        costDisclosureType: draft.implementationCost == null ? "not-disclosed" : "exact",
        ongoingMonthlyCost: draft.ongoingMonthlyCost,
        ongoingCostDisclosureType: draft.ongoingMonthlyCost == null ? "not-disclosed" : "exact",
        maintenanceHoursPerMonth: draft.maintenanceHours,
        verificationState: isSupabase ? "creator-reported" : "demo",
        publicationState: "published",
        moderationState: isSupabase ? "pending" : "approved",
        visibility: "public",
        rightsState: draft.rightsState,
        customerPermissionState: draft.permissionConfirmed ? "granted" : "pending",
        implementerIds: [],
        creatorIds: [],
        providerIds: [
          ...new Set(selectedProducts.map((product) => product.providerId)),
        ],
        derivedBlueprintIds: [],
        lastEvidenceReviewAt: new Date().toISOString().slice(0, 10),
        stalenessState: "unknown",
        demo: !isSupabase,
        provenance,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await actions.save("implementation_records", record);
      await actions.save("implementation_contexts", {
        id: `${id}-context`,
        name: `${record.name} context`,
        implementationId: id,
        locations: draft.locations,
        volumeLabel: draft.monthlyVolume == null ? "Not disclosed" : `${draft.monthlyVolume.toLocaleString()} per month`,
        monthlyVolume: draft.monthlyVolume,
        existingSystems: draft.existingSystems.split(",").map((value) => value.trim()).filter(Boolean),
        technicalCapability: draft.technicalCapability,
        regulatoryConstraints: [],
        processMaturity: "Contributor supplied",
        workflowCharacteristics: ["Contributor supplied"],
        provenance,
      });
      const phases = [
        ["before", lines(draft.beforeProcess)],
        ["change", lines(draft.processChange)],
        ["after", lines(draft.afterProcess)],
      ] as const;
      for (const [phase, entries] of phases) {
        for (const [position, description] of entries.entries()) {
          await actions.save("implementation_process_steps", {
            id: `${id}-${phase}-${position}`,
            name: description,
            implementationId: id,
            phase,
            position,
            description,
            humanRole: /human|staff|review|approval/i.test(description)
              ? "Human decision/review recorded"
              : "System or process step",
            provenance,
          });
        }
      }
      const stackIds: string[] = [];
      for (const [index, product] of selectedProducts.entries()) {
        const stackId = `${id}-stack-${index}`;
        stackIds.push(stackId);
        await actions.save("implementation_stack_items", {
          id: stackId,
          name: product.name,
          implementationId: id,
          productId: product.id,
          capabilityId: product.capabilityIds[0] ?? "unknown",
          role: product.capabilityIds[0] ?? "Technology component",
          evidenceLevel: isSupabase ? "creator-reported" : "demo",
          notes: "Contributor selected this component. Compatibility must be verified separately.",
          x: (index % 2) * 320,
          y: Math.floor(index / 2) * 160,
          provenance,
        });
      }
      for (let index = 0; index < stackIds.length - 1; index += 1) {
        await actions.save("implementation_connections", {
          id: `${id}-connection-${index}`,
          name: `Recorded handoff ${index + 1}`,
          implementationId: id,
          fromItemId: stackIds[index],
          toItemId: stackIds[index + 1],
          label: "Contributor-recorded handoff",
          dataFlow: "Details require validation",
          trustBoundary: false,
          evidenceLevel: isSupabase ? "creator-reported" : "demo",
          provenance,
        });
      }
      const metricEntries = [
        ["first-response-time", draft.baselineFirstResponse, draft.observedFirstResponse, "minutes"],
        ["manual-handling-hours", draft.baselineManualHours, draft.observedManualHours, "hours"],
      ] as const;
      for (const [metricDefinitionId, baselineValue, observedValue, unit] of metricEntries) {
        if (baselineValue == null && observedValue == null) continue;
        const absoluteChange = baselineValue == null || observedValue == null ? null : observedValue - baselineValue;
        const percentageChange = baselineValue == null || observedValue == null || baselineValue === 0
          ? null
          : ((observedValue - baselineValue) / baselineValue) * 100;
        const metricId = `${id}-${metricDefinitionId}`;
        await actions.save("implementation_metrics", {
          id: metricId,
          name: metricDefinitionId.replaceAll("-", " "),
          implementationId: id,
          metricDefinitionId,
          baselineValue,
          observedValue,
          unit,
          absoluteChange,
          percentageChange,
          evidenceLevel: isSupabase ? "creator-reported" : "demo",
          sourceLabel: draft.evidenceDescription || "Contributor supplied; evidence not independently reviewed",
          notes: draft.measurementNotes,
          provenance,
        });
        await actions.save("claims", {
          id: `${metricId}-claim`,
          name: `${metricDefinitionId} observed value`,
          subjectType: "metric",
          subjectId: metricId,
          predicate: "observed-value",
          value: observedValue == null ? "Not recorded" : String(observedValue),
          unit,
          claimant: userId || "demo contributor",
          status: "pending",
          evidenceLevel: isSupabase ? "creator-reported" : "demo",
          public: true,
          provenance,
        });
      }
      if (draft.evidenceDescription.trim()) {
        const evidenceId = `${id}-evidence-1`;
        await actions.save("evidence_artifacts", {
          id: evidenceId,
          name: "Contributor evidence metadata",
          ownerId: userId || "demo-user",
          kind: draft.evidenceKind,
          publicMetadata: draft.evidenceDescription.trim(),
          storagePath: "",
          mimeType: "",
          private: true,
          provenance,
        });
      }
      if (draft.attestationRequested) {
        await actions.save("attestations", {
          id: `${id}-attestation`,
          name: "Customer attestation request",
          implementationId: id,
          ownerId: userId || "demo-user",
          tokenHash: isSupabase ? "server-generated-required" : "demo-not-a-live-token",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          customerIdentityVisibility: draft.customerIdentityVisibility,
          attestorLabel: "Customer representative",
          provenance,
        });
      }
      if (draft.blueprintRequested) {
        const blueprintId = `blueprint-${crypto.randomUUID()}`;
        const versionId = `${blueprintId}-v1`;
        await actions.save("blueprints", {
          id: blueprintId,
          slug: `${draft.blueprintName || draft.name}-blueprint`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          name: draft.blueprintName.trim() || `${draft.name} reference blueprint`,
          ownerId: userId || "demo-user",
          description: "Sanitized Blueprint draft derived from the submitted implementation. Customer-specific details must be reviewed before production publication.",
          derivedFromImplementationId: id,
          useCaseIds: [],
          capabilityIds: selectedProducts.flatMap((product) => product.capabilityIds),
          currentVersionId: versionId,
          estimatedComplexity: selectedProducts.length <= 3 ? "low" : selectedProducts.length <= 5 ? "medium" : "high",
          requiredSkills: ["Business-rule mapping", "Integration validation"],
          license: "Rights pending review",
          reuseRights: draft.rightsState,
          sourceAvailable: false,
          commercialUseAllowed: draft.rightsState === "commercial-license" || draft.rightsState === "open-source",
          maintainerId: userId || "demo-user",
          lastValidatedAt: new Date().toISOString().slice(0, 10),
          compatibilityState: "unknown",
          knownLimitations: "Customer-specific fields, credentials, schemas, prompts and proprietary rules must remain excluded.",
          publicationState: isSupabase ? "draft" : "published",
          moderationState: isSupabase ? "pending" : "approved",
          demo: !isSupabase,
          provenance,
        });
        await actions.save("blueprint_versions", {
          id: versionId,
          name: "Version 1.0",
          blueprintId,
          version: "1.0",
          changeNotes: "Initial sanitized draft generated from contributor-confirmed stack selections.",
          lastValidatedAt: new Date().toISOString().slice(0, 10),
          compatibilityState: "unknown",
          completeness: 45,
          provenance,
        });
        for (const [index, product] of selectedProducts.entries()) {
          await actions.save("blueprint_stack_items", {
            id: `${versionId}-item-${index}`,
            name: product.name,
            blueprintVersionId: versionId,
            capabilityId: product.capabilityIds[0] ?? "unknown",
            productId: product.id,
            role: product.capabilityIds[0] ?? "Technology component",
            required: true,
            alternativeProductIds: [],
            configurationRequirements: "Replace all customer-specific credentials, fields, business rules and private identifiers.",
            x: (index % 2) * 320,
            y: Math.floor(index / 2) * 160,
            provenance,
          });
        }
        record.derivedBlueprintIds = [blueprintId];
        await actions.save("implementation_records", record);
      }
      localStorage.removeItem(draftKey);
      notify(isSupabase ? "Implementation submitted for moderation." : "Demo implementation published locally.");
      navigate(`/implementations/${record.slug}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="CONTRIBUTE IMPLEMENTATION INTELLIGENCE"
        title="Document what happened — without exposing customer secrets."
        description="This workflow separates business context, observed metrics, evidence, rights and reusable Blueprint material. In demo mode everything stays in this browser."
      />
      <div className="implementation-wizard-shell">
        <aside className="implementation-wizard-steps" aria-label="Implementation submission steps">
          {steps.map((label, index) => (
            <button
              type="button"
              key={label}
              className={index === step ? "active" : index < step ? "complete" : ""}
              onClick={() => index <= step && setStep(index)}
            >
              <span>{index < step ? <Check size={14} /> : index + 1}</span>
              {label}
            </button>
          ))}
        </aside>
        <section className="card implementation-wizard-panel">
          <div className="wizard-panel-head">
            <div>
              <span className="eyebrow">STEP {step + 1} OF {steps.length}</span>
              <h2>{steps[step]}</h2>
            </div>
            <span className="autosave-state"><Save size={14} /> Browser autosave</span>
          </div>

          {step === 0 && (
            <div className="form-stack">
              <label>Implementation record name<input value={draft.name} onChange={(event) => patch("name", event.target.value)} placeholder="Example: Multi-location enquiry automation" /></label>
              <label>Short summary<textarea rows={3} value={draft.summary} onChange={(event) => patch("summary", event.target.value)} /></label>
              <div className="grid two">
                <label>Business type<input value={draft.businessType} onChange={(event) => patch("businessType", event.target.value)} /></label>
                <label>Industry<input value={draft.industry} onChange={(event) => patch("industry", event.target.value)} /></label>
                <label>Organization size<select value={draft.organizationSizeBand} onChange={(event) => patch("organizationSizeBand", event.target.value)}><option>1–10 employees</option><option>11–50 employees</option><option>51–200 employees</option><option>201+ employees</option></select></label>
                <label>Region<input value={draft.region} onChange={(event) => patch("region", event.target.value)} /></label>
                <label>Locations<input type="number" min="1" value={draft.locations ?? ""} onChange={(event) => patch("locations", event.target.value ? Number(event.target.value) : null)} /></label>
                <label>Monthly volume<input type="number" min="0" value={draft.monthlyVolume ?? ""} onChange={(event) => patch("monthlyVolume", event.target.value ? Number(event.target.value) : null)} placeholder="Optional" /></label>
              </div>
              <label>Business context<textarea rows={5} value={draft.contextSummary} onChange={(event) => patch("contextSummary", event.target.value)} placeholder="Describe the business, workflow, volume and constraints needed to interpret the implementation." /></label>
              <label>Existing systems<input value={draft.existingSystems} onChange={(event) => patch("existingSystems", event.target.value)} placeholder="Comma separated, e.g. CRM, shared inbox, phone" /></label>
              <label>Technical capability<select value={draft.technicalCapability} onChange={(event) => patch("technicalCapability", event.target.value as Draft["technicalCapability"])}><option value="none">None</option><option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
            </div>
          )}
          {step === 1 && (
            <div className="form-stack">
              <label>What problem existed before implementation?<textarea rows={7} value={draft.problem} onChange={(event) => patch("problem", event.target.value)} /></label>
              <label>Baseline median first-response time (minutes)<input type="number" min="0" value={draft.baselineFirstResponse ?? ""} onChange={(event) => patch("baselineFirstResponse", event.target.value ? Number(event.target.value) : null)} /></label>
              <label>Baseline manual handling hours / week<input type="number" min="0" value={draft.baselineManualHours ?? ""} onChange={(event) => patch("baselineManualHours", event.target.value ? Number(event.target.value) : null)} /></label>
            </div>
          )}
          {step === 2 && <ProcessEditor title="Existing process" help="One step per line. Record what actually happened before the implementation." value={draft.beforeProcess} onChange={(value) => patch("beforeProcess", value)} />}
          {step === 3 && (
            <div className="form-stack">
              <ProcessEditor title="Process changes" help="One change per line. Separate operating redesign from product selection." value={draft.processChange} onChange={(value) => patch("processChange", value)} />
              <ProcessEditor title="Process after implementation" help="One step per line. Include human review or exception paths explicitly." value={draft.afterProcess} onChange={(value) => patch("afterProcess", value)} />
            </div>
          )}
          {step === 4 && (
            <div className="wizard-explainer">
              <Badge>STRUCTURED ARCHITECTURE</Badge>
              <h3>Architecture follows the confirmed stack in V1.</h3>
              <p>After selecting components, Oracnet creates an ordered recorded handoff. The public page treats that as a contributor-recorded architecture, not proof of official compatibility.</p>
              <div className="notice"><ShieldCheck /><p>Production architecture editing should capture explicit data flows, trust boundaries and failure handling. No private credentials or internal URLs belong in the public record.</p></div>
            </div>
          )}
          {step === 5 && (
            <div className="form-stack">
              <p>Select the technologies that were actually used. Selection records co-occurrence only; compatibility is verified separately.</p>
              <div className="wizard-product-picker">
                {products.map((product) => (
                  <label key={product.id}>
                    <input type="checkbox" checked={draft.stackProductIds.includes(product.id)} onChange={(event) => patch("stackProductIds", event.target.checked ? [...draft.stackProductIds, product.id] : draft.stackProductIds.filter((id) => id !== product.id))} />
                    <span><strong>{product.name}</strong><small>{product.capabilityIds.join(", ")}</small></span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {step === 6 && (
            <div className="grid two">
              <label>Implementation duration<input value={draft.implementationDuration} onChange={(event) => patch("implementationDuration", event.target.value)} placeholder="Example: 5 weeks" /></label>
              <label>Implementation cost (GBP)<input type="number" min="0" value={draft.implementationCost ?? ""} onChange={(event) => patch("implementationCost", event.target.value ? Number(event.target.value) : null)} /></label>
              <label>Ongoing monthly cost (GBP)<input type="number" min="0" value={draft.ongoingMonthlyCost ?? ""} onChange={(event) => patch("ongoingMonthlyCost", event.target.value ? Number(event.target.value) : null)} /></label>
              <label>Maintenance hours / month<input type="number" min="0" value={draft.maintenanceHours ?? ""} onChange={(event) => patch("maintenanceHours", event.target.value ? Number(event.target.value) : null)} /></label>
            </div>
          )}
          {step === 7 && (
            <div className="form-stack">
              <div className="grid two">
                <label>Observed first-response time (minutes)<input type="number" min="0" value={draft.observedFirstResponse ?? ""} onChange={(event) => patch("observedFirstResponse", event.target.value ? Number(event.target.value) : null)} /></label>
                <label>Observed manual handling hours / week<input type="number" min="0" value={draft.observedManualHours ?? ""} onChange={(event) => patch("observedManualHours", event.target.value ? Number(event.target.value) : null)} /></label>
              </div>
              <label>Measurement notes<textarea rows={6} value={draft.measurementNotes} onChange={(event) => patch("measurementNotes", event.target.value)} placeholder="Explain the measurement period, definition changes, exclusions and anything that limits comparison." /></label>
              <div className="notice"><ShieldCheck /><p>Oracnet records “observed after implementation”. It does not turn before/after values into a causal claim.</p></div>
            </div>
          )}
          {step === 8 && (
            <div className="form-stack">
              <label>Evidence type<select value={draft.evidenceKind} onChange={(event) => patch("evidenceKind", event.target.value as Draft["evidenceKind"])}><option value="customer-attestation">Customer attestation</option><option value="analytics-export">Analytics export</option><option value="screenshot">Screenshot</option><option value="system-log">System log</option><option value="deployment-documentation">Deployment documentation</option><option value="public-case-study">Public case study</option><option value="other">Other</option></select></label>
              <label>Evidence metadata / description<textarea rows={6} value={draft.evidenceDescription} onChange={(event) => patch("evidenceDescription", event.target.value)} placeholder="Describe what exists. Private evidence files are not uploaded in the static demo." /></label>
              <div className="notice"><LockKeyhole /><p>Sensitive evidence is private by default. In production, files belong in a private Storage bucket with short-lived signed access and reviewer-only policies.</p></div>
            </div>
          )}
          {step === 9 && (
            <div className="form-stack">
              <label>Reuse / publication rights<select value={draft.rightsState} onChange={(event) => patch("rightsState", event.target.value as ReuseRights)}><option value="showcase-only">Showcase only</option><option value="reference-architecture">Reference architecture</option><option value="personal-use">Personal use</option><option value="commercial-license">Commercial license</option><option value="open-source">Open source</option><option value="custom-license">Custom license</option></select></label>
              <label className="checkbox-label"><input type="checkbox" checked={draft.permissionConfirmed} onChange={(event) => patch("permissionConfirmed", event.target.checked)} /> I have permission to publish the non-confidential implementation information entered here.</label>
              <div className="rights-checklist card">
                <strong>Do not publish</strong>
                <span>Credentials or API keys</span><span>Customer data</span><span>Private schemas</span><span>Confidential prompts</span><span>Internal API addresses</span><span>Proprietary decision logic without rights</span>
              </div>
            </div>
          )}
          {step === 10 && (
            <div className="form-stack">
              <label>Customer identity visibility<select value={draft.customerIdentityVisibility} onChange={(event) => patch("customerIdentityVisibility", event.target.value as CustomerIdentityVisibility)}><option value="public">Public identity</option><option value="anonymous">Anonymous publicly</option><option value="private">Private to Oracnet</option></select></label>
              <label className="checkbox-label"><input type="checkbox" checked={draft.attestationRequested} onChange={(event) => patch("attestationRequested", event.target.checked)} /> Prepare a customer attestation request</label>
              <div className="notice"><ShieldCheck /><p>In connected production mode, attestation tokens must be server-generated, stored as hashes, expire, and grant access only to the claims included in that invitation.</p></div>
            </div>
          )}
          {step === 11 && (
            <div className="form-stack">
              <label className="checkbox-label"><input type="checkbox" checked={draft.blueprintRequested} onChange={(event) => patch("blueprintRequested", event.target.checked)} /> Create a separate sanitized Blueprint draft</label>
              {draft.blueprintRequested && <label>Blueprint name<input value={draft.blueprintName} onChange={(event) => patch("blueprintName", event.target.value)} placeholder={`${draft.name || "Implementation"} reference blueprint`} /></label>}
              <div className="wizard-explainer"><FileKey2 size={24} /><h3>The Blueprint is not the customer implementation.</h3><p>It gets a separate version, license, rights state and dependency manifest. Customer-specific data and proprietary logic remain excluded.</p></div>
            </div>
          )}
          {step === 12 && (
            <div className="form-stack">
              <div className="wizard-review-grid">
                <div><small>Record</small><strong>{draft.name || "Untitled"}</strong><span>{draft.businessType} · {draft.organizationSizeBand}</span></div>
                <div><small>Technology components</small><strong>{selectedProducts.length}</strong><span>{selectedProducts.map((product) => product.name).join(", ") || "None selected"}</span></div>
                <div><small>Evidence state</small><strong>{isSupabase ? "Creator reported → moderation" : "Demo / synthetic"}</strong><span>{draft.evidenceDescription || "No evidence metadata entered"}</span></div>
                <div><small>Reuse</small><strong>{draft.rightsState.replaceAll("-", " ")}</strong><span>{draft.blueprintRequested ? "Separate Blueprint draft requested" : "No Blueprint requested"}</span></div>
              </div>
              <label className="checkbox-label"><input type="checkbox" checked={draft.ownershipConfirmed} onChange={(event) => patch("ownershipConfirmed", event.target.checked)} /> I confirm the submission distinguishes observation from causality, contains no secrets, and accurately describes its current evidence state.</label>
              <button className="button dark" disabled={saving} type="button" onClick={() => void publish().catch(() => {})}>{saving ? "Publishing…" : isSupabase ? "Submit for moderation" : "Publish demo record"} <ArrowRight size={17} /></button>
            </div>
          )}

          <div className="wizard-navigation">
            <button className="button light" type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft size={16} /> Back</button>
            {step < steps.length - 1 && <button className="button dark" type="button" onClick={() => validateCurrentStep() && setStep((current) => Math.min(steps.length - 1, current + 1))}>Continue <ArrowRight size={16} /></button>}
          </div>
        </section>
      </div>
      <div className="wizard-privacy-foot"><LockKeyhole size={16} /> Do not enter confidential customer evidence in the browser-local demo.</div>
    </>
  );
}

function ProcessEditor({
  title,
  help,
  value,
  onChange,
}: {
  title: string;
  help: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {title}
      <textarea rows={8} value={value} onChange={(event) => onChange(event.target.value)} placeholder="One step per line" />
      <small>{help}</small>
    </label>
  );
}
