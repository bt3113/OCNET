import type {
  Blueprint,
  BlueprintConnection,
  BlueprintLicense,
  BlueprintStackItem,
  BlueprintVersion,
  Claim,
  ClaimEvidence,
  CustomerIdentityVisibility,
  EvidenceArtifact,
  ImplementationConnection,
  ImplementationContext,
  ImplementationMetric,
  ImplementationProcessStep,
  ImplementationRecord,
  ImplementationStackItem,
  ImplementationUseCase,
  Level3,
  MeasurementPeriod,
  MetricDefinition,
  ReuseRights,
  TechnicalCapability,
} from "./intelligence-model";
import type { Product } from "./model";
import { metricChange } from "./metrics";
import { sanitizationChecklist, sanitizationGate, scanFields } from "./sanitization";

/**
 * Contributor draft → normalized evidence-graph rows. Pure and deterministic
 * given the id/now inputs, so the wizard, tests and a future server endpoint
 * can share it. Private verification data (customer name, contact) never
 * enters public fields.
 */
export interface ContributionDraft {
  customerName: string;
  customerVisibility: CustomerIdentityVisibility;
  customerPermission: boolean;
  name: string;
  summary: string;
  useCaseId: string;
  industry: string;
  businessType: string;
  organizationSizeBand: string;
  region: string;
  locations: number | null;
  volumeMin: number | null;
  volumeMax: number | null;
  existingSystems: string;
  technicalCapability: TechnicalCapability;
  contextSummary: string;
  problem: string;
  metricIds: string[];
  baseline: Record<string, number | null>;
  observed: Record<string, number | null>;
  baselineStart: string;
  baselineEnd: string;
  observedStart: string;
  observedEnd: string;
  measurementNotes: string;
  beforeProcess: string;
  processChange: string;
  afterProcess: string;
  stack: { productId: string; capabilityId: string; role: string }[];
  connections: { from: number; to: number; label: string; dataFlow: string; trustBoundary: boolean }[];
  startDate: string;
  goLiveDate: string;
  duration: string;
  costDisclosure: "exact" | "range" | "not-disclosed";
  costLow: number | null;
  costHigh: number | null;
  monthlyCost: number | null;
  maintenanceHours: number | null;
  maintenanceBurden: Level3 | "unknown";
  claimOptions: Record<string, { include: boolean; method: string; limitations: string }>;
  evidence: { kind: EvidenceArtifact["kind"]; description: string }[];
  rightsState: ReuseRights;
  confidentialityConfirmed: boolean;
  inviteCustomer: boolean;
  deriveBlueprint: boolean;
  blueprintName: string;
  blueprintDescription: string;
  blueprintRights: ReuseRights;
  blueprintSetupNotes: string;
  sanitizationConfirmed: string[];
  declaration: boolean;
}

export const emptyDraft: ContributionDraft = {
  customerName: "",
  customerVisibility: "anonymous",
  customerPermission: false,
  name: "",
  summary: "",
  useCaseId: "enquiry-to-booking",
  industry: "Business services",
  businessType: "",
  organizationSizeBand: "1–10 employees",
  region: "United Kingdom",
  locations: 1,
  volumeMin: null,
  volumeMax: null,
  existingSystems: "",
  technicalCapability: "none",
  contextSummary: "",
  problem: "",
  metricIds: ["first-response-time", "manual-handling-hours"],
  baseline: {},
  observed: {},
  baselineStart: "",
  baselineEnd: "",
  observedStart: "",
  observedEnd: "",
  measurementNotes: "",
  beforeProcess: "",
  processChange: "",
  afterProcess: "",
  stack: [],
  connections: [],
  startDate: "",
  goLiveDate: "",
  duration: "",
  costDisclosure: "not-disclosed",
  costLow: null,
  costHigh: null,
  monthlyCost: null,
  maintenanceHours: null,
  maintenanceBurden: "unknown",
  claimOptions: {},
  evidence: [],
  rightsState: "showcase-only",
  confidentialityConfirmed: false,
  inviteCustomer: false,
  deriveBlueprint: false,
  blueprintName: "",
  blueprintDescription: "",
  blueprintRights: "reference-architecture",
  blueprintSetupNotes: "",
  sanitizationConfirmed: [],
  declaration: false,
};

export const lines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Claims the contributor can make, derived from what they entered. */
export function proposedClaims(draft: ContributionDraft, definitions: MetricDefinition[]) {
  const claims: { key: string; name: string; predicate: string; value: string; unit?: string }[] = [];
  if (draft.stack.length) claims.push({ key: "architecture", name: "Architecture as recorded", predicate: "architecture-deployed", value: `Deployed with ${draft.stack.length} components as recorded.` });
  if (draft.goLiveDate) claims.push({ key: "dates", name: "Implementation dates", predicate: "went-live", value: `Go-live ${draft.goLiveDate}${draft.duration ? ` after ${draft.duration}` : ""}.` });
  if (draft.costDisclosure !== "not-disclosed" && draft.costLow != null)
    claims.push({ key: "cost", name: "Implementation cost", predicate: "implementation-cost", value: draft.costDisclosure === "range" && draft.costHigh != null ? `£${draft.costLow.toLocaleString("en-GB")}–£${draft.costHigh.toLocaleString("en-GB")}` : `£${draft.costLow.toLocaleString("en-GB")}`, unit: "GBP" });
  for (const id of draft.metricIds) {
    const value = draft.observed[id];
    if (value == null) continue;
    const definition = definitions.find((item) => item.id === id);
    claims.push({ key: `metric:${id}`, name: definition?.name ?? id, predicate: "observed-value", value: String(value), unit: definition?.unit });
  }
  return claims;
}

export function validateStep(step: number, draft: ContributionDraft): string | null {
  switch (step) {
    case 0:
      return draft.customerVisibility === "public" && !draft.customerPermission ? "A public customer identity needs the customer’s permission." : null;
    case 1:
      return draft.name.trim().length < 5 || draft.contextSummary.trim().length < 20 || !draft.businessType.trim() ? "Add a record name, business type and a short business context." : null;
    case 2:
      return draft.problem.trim().length < 20 ? "Describe the problem that existed before the implementation." : null;
    case 3:
      return lines(draft.beforeProcess).length ? null : "Record at least one step of the process before the implementation.";
    case 5:
      return lines(draft.afterProcess).length ? null : "Record the process after the implementation.";
    case 6:
      if (draft.stack.length < 2) return "Add at least two components that were actually used.";
      return draft.connections.some((edge) => edge.from === edge.to) ? "A connection must join two different components." : null;
    case 7:
      if (draft.costDisclosure === "range" && (draft.costLow == null || draft.costHigh == null || draft.costLow > draft.costHigh)) return "Enter a valid cost range, or choose not disclosed.";
      if (draft.costDisclosure === "exact" && draft.costLow == null) return "Enter the cost, or choose not disclosed.";
      return draft.goLiveDate && draft.startDate && draft.goLiveDate < draft.startDate ? "Go-live cannot be before the start date." : null;
    case 8:
      return draft.observedStart && draft.observedEnd && draft.observedEnd < draft.observedStart ? "The observed period ends before it starts." : null;
    case 11:
      return draft.confidentialityConfirmed ? null : "Confirm that the public fields contain no confidential information.";
    case 13: {
      if (!draft.deriveBlueprint) return null;
      if (draft.blueprintName.trim().length < 5) return "Name the Blueprint.";
      const gate = sanitizationGate(draft.sanitizationConfirmed, blueprintScan(draft));
      if (gate.blocking.length) return `Remove sensitive content before deriving a Blueprint (${gate.blocking.map((item) => item.kind).join(", ")}).`;
      return gate.missing.length ? "Confirm every sanitization checklist item." : null;
    }
    case 14:
      return draft.declaration ? null : "Confirm the submission declaration.";
    default:
      return null;
  }
}

/** Text that would travel into a public Blueprint, scanned for secrets/PII. */
export function blueprintScan(draft: ContributionDraft) {
  return scanFields({
    "Blueprint name": draft.blueprintName,
    "Blueprint description": draft.blueprintDescription,
    "Setup notes": draft.blueprintSetupNotes,
    "Process after": draft.afterProcess,
    "Connection labels": draft.connections.map((edge) => `${edge.label} ${edge.dataFlow}`).join("\n"),
  });
}

/** Public-text scan for the record itself (customer name is private and not scanned into public output). */
export function recordScan(draft: ContributionDraft) {
  return scanFields({
    Name: draft.name,
    Summary: draft.summary,
    "Business context": draft.contextSummary,
    Problem: draft.problem,
    "Process before": draft.beforeProcess,
    "Process change": draft.processChange,
    "Process after": draft.afterProcess,
    "Measurement notes": draft.measurementNotes,
  });
}

export interface Submission {
  record: ImplementationRecord;
  context: ImplementationContext;
  useCase: ImplementationUseCase;
  steps: ImplementationProcessStep[];
  stack: ImplementationStackItem[];
  connections: ImplementationConnection[];
  periods: MeasurementPeriod[];
  metrics: ImplementationMetric[];
  claims: Claim[];
  artifacts: EvidenceArtifact[];
  links: ClaimEvidence[];
  blueprint?: { blueprint: Blueprint; version: BlueprintVersion; items: BlueprintStackItem[]; connections: BlueprintConnection[]; license: BlueprintLicense };
  /** Kept out of every public row. Stored only in the private verification table in connected mode. */
  privateCustomerName: string;
}

export function buildSubmission(
  draft: ContributionDraft,
  input: { id: string; ownerId: string; now: Date; demo: boolean; definitions: MetricDefinition[]; products: Product[] },
): Submission {
  const { id, ownerId, now, demo } = input;
  const provenance = demo ? "demo" : "creator supplied";
  const at = now.toISOString();
  const today = at.slice(0, 10);
  const productIds = draft.stack.map((item) => item.productId);
  const record: ImplementationRecord = {
    id,
    slug: `${slugify(draft.name)}-${id.slice(-6)}`,
    name: draft.name.trim(),
    summary: draft.summary.trim() || draft.problem.trim().slice(0, 220),
    problemStatement: draft.problem.trim(),
    ownerId,
    customerDisplayName: draft.customerVisibility === "public" && draft.customerPermission ? draft.customerName.trim() || "Customer name pending" : draft.customerVisibility === "anonymous" ? "Customer identity withheld publicly" : "Private to Oracnet",
    customerIdentityVisibility: draft.customerVisibility,
    industry: draft.industry.trim(),
    businessType: draft.businessType.trim(),
    organizationSizeBand: draft.organizationSizeBand,
    employeeCountRange: draft.organizationSizeBand,
    region: draft.region,
    contextSummary: draft.contextSummary.trim(),
    baselinePeriodStart: draft.baselineStart || undefined,
    baselinePeriodEnd: draft.baselineEnd || undefined,
    measurementPeriodStart: draft.observedStart || undefined,
    measurementPeriodEnd: draft.observedEnd || undefined,
    implementationStartDate: draft.startDate || undefined,
    goLiveDate: draft.goLiveDate || undefined,
    implementationDuration: draft.duration.trim() || "Not disclosed",
    implementationCost: draft.costDisclosure === "exact" ? draft.costLow : null,
    implementationCostLow: draft.costDisclosure === "not-disclosed" ? null : draft.costLow,
    implementationCostHigh: draft.costDisclosure === "range" ? draft.costHigh : draft.costDisclosure === "exact" ? draft.costLow : null,
    implementationCostCurrency: "GBP",
    costDisclosureType: draft.costDisclosure,
    ongoingMonthlyCost: draft.monthlyCost,
    ongoingCostDisclosureType: draft.monthlyCost == null ? "not-disclosed" : "exact",
    maintenanceHoursPerMonth: draft.maintenanceHours,
    maintenanceBurden: draft.maintenanceBurden,
    knownLimitations: draft.measurementNotes.trim() || undefined,
    categoryTemplateId: "service-enquiry-booking",
    verificationState: "creator-reported",
    publicationState: "published",
    moderationState: "pending",
    visibility: "public",
    rightsState: draft.rightsState,
    customerPermissionState: draft.customerPermission ? "granted" : draft.customerVisibility === "public" ? "pending" : "not-required",
    implementerIds: [],
    creatorIds: [ownerId],
    providerIds: [...new Set(productIds.map((productId) => input.products.find((product) => product.id === productId)?.providerId).filter((value): value is string => !!value))],
    derivedBlueprintIds: [],
    lastEvidenceReviewAt: today,
    nextEvidenceReviewAt: new Date(now.getTime() + 180 * 86400000).toISOString().slice(0, 10),
    stalenessState: "unknown",
    demo,
    provenance,
    createdAt: at,
    updatedAt: at,
  };
  const systems = draft.existingSystems.split(",").map((value) => value.trim()).filter(Boolean);
  const context: ImplementationContext = {
    id: `${id}-context`,
    name: `${record.name} context`,
    provenance,
    implementationId: id,
    locations: draft.locations,
    volumeLabel: draft.volumeMin == null ? "Not disclosed" : `${draft.volumeMin.toLocaleString("en-GB")}${draft.volumeMax != null && draft.volumeMax !== draft.volumeMin ? `–${draft.volumeMax.toLocaleString("en-GB")}` : ""} / month`,
    monthlyVolume: draft.volumeMin == null ? null : Math.round((draft.volumeMin + (draft.volumeMax ?? draft.volumeMin)) / 2),
    monthlyVolumeMin: draft.volumeMin,
    monthlyVolumeMax: draft.volumeMax ?? draft.volumeMin,
    existingSystems: systems,
    existingSystemProductIds: systems.flatMap((name) => input.products.filter((product) => product.name.toLowerCase() === name.toLowerCase()).map((product) => product.id)),
    technicalCapability: draft.technicalCapability,
    regulatoryConstraints: [draft.region === "United Kingdom" ? "UK GDPR" : draft.region === "Europe" ? "EU GDPR" : "Regional data protection"],
    processMaturity: "Contributor supplied",
    workflowCharacteristics: [],
  };
  const steps: ImplementationProcessStep[] = (["before", "change", "after"] as const).flatMap((phase) =>
    lines(phase === "before" ? draft.beforeProcess : phase === "change" ? draft.processChange : draft.afterProcess).map((description, position) => ({
      id: `${id}-${phase}-${position}`,
      name: description,
      provenance,
      implementationId: id,
      phase,
      position,
      description,
      humanRole: /human|staff|owner|review|approv|manual|exception/i.test(description) ? "Human decision or effort" : "System or process step",
    })),
  );
  const stack: ImplementationStackItem[] = draft.stack.map((item, index) => ({
    id: `${id}-stack-${index}`,
    name: item.role || item.capabilityId,
    provenance,
    implementationId: id,
    productId: item.productId,
    capabilityId: item.capabilityId,
    role: item.role || item.capabilityId,
    evidenceLevel: "creator-reported",
    notes: "Contributor recorded this component. Compatibility is verified separately.",
    x: 0,
    y: index,
  }));
  const connections: ImplementationConnection[] = draft.connections
    .filter((edge) => edge.from !== edge.to && stack[edge.from] && stack[edge.to])
    .map((edge, index) => ({
      id: `${id}-connection-${index}`,
      name: edge.label || "Handoff",
      provenance,
      implementationId: id,
      fromItemId: stack[edge.from].id,
      toItemId: stack[edge.to].id,
      label: edge.label || "Handoff",
      dataFlow: edge.dataFlow || "Not described",
      trustBoundary: edge.trustBoundary,
      evidenceLevel: "creator-reported",
    }));
  const periods: MeasurementPeriod[] = [
    { id: `${id}-baseline-period`, name: "Baseline period", provenance, implementationId: id, kind: "baseline", startDate: draft.baselineStart || undefined, endDate: draft.baselineEnd || undefined, notes: "Contributor supplied." },
    { id: `${id}-observed-period`, name: "Observed period", provenance, implementationId: id, kind: "observed", startDate: draft.observedStart || undefined, endDate: draft.observedEnd || undefined, notes: "Contributor supplied. Observed values do not establish causality." },
  ];
  const metrics: ImplementationMetric[] = draft.metricIds.flatMap((metricId) => {
    const baseline = draft.baseline[metricId] ?? null;
    const observed = draft.observed[metricId] ?? null;
    if (baseline == null && observed == null) return [];
    const definition = input.definitions.find((item) => item.id === metricId);
    const unit = definition?.unit ?? "";
    const change = metricChange(baseline, observed, unit, definition?.direction);
    return [{
      id: `${id}-${metricId}`,
      name: definition?.name ?? metricId,
      provenance,
      implementationId: id,
      metricDefinitionId: metricId,
      baselineValue: baseline,
      observedValue: observed,
      unit,
      measurementPeriodId: `${id}-observed-period`,
      absoluteChange: change.absolute,
      percentageChange: change.percentage,
      evidenceLevel: "creator-reported",
      sourceLabel: "Contributor supplied",
      notes: draft.measurementNotes.trim(),
    }];
  });
  const claims: Claim[] = proposedClaims(draft, input.definitions)
    .filter((claim) => draft.claimOptions[claim.key]?.include !== false)
    .map((claim) => {
      const options = draft.claimOptions[claim.key];
      const metric = claim.key.startsWith("metric:") ? metrics.find((item) => item.metricDefinitionId === claim.key.slice(7)) : undefined;
      return {
        id: `${id}-claim-${claim.key.replace(/[^a-z0-9]+/gi, "-")}`,
        name: claim.name,
        provenance,
        subjectType: metric ? "metric" : "implementation",
        subjectId: metric?.id ?? id,
        predicate: claim.predicate,
        value: claim.value,
        unit: claim.unit,
        period: metric && draft.observedStart ? `${draft.observedStart} to ${draft.observedEnd}` : undefined,
        measurementPeriodId: metric ? `${id}-observed-period` : undefined,
        claimant: "Contributor",
        claimantType: "creator",
        evidenceMethod: options?.method || undefined,
        limitations: options?.limitations || undefined,
        status: "pending",
        evidenceLevel: "creator-reported",
        public: true,
      } satisfies Claim;
    });
  const artifacts: EvidenceArtifact[] = draft.evidence
    .filter((item) => item.description.trim())
    .map((item, index) => ({
      id: `${id}-evidence-${index}`,
      name: `${item.kind.replaceAll("-", " ")} (metadata)`,
      provenance,
      ownerId,
      kind: item.kind,
      publicMetadata: item.description.trim(),
      storagePath: "",
      mimeType: "",
      private: true,
    }));
  const links: ClaimEvidence[] = artifacts.flatMap((artifact) =>
    claims.map((claim) => ({ id: `${claim.id}-${artifact.id}`, name: "Contributor evidence link", provenance, claimId: claim.id, evidenceArtifactId: artifact.id, relationship: "context" as const })),
  );

  let blueprint: Submission["blueprint"];
  if (draft.deriveBlueprint) {
    const blueprintId = `blueprint-${id.slice(-12)}`;
    const versionId = `${blueprintId}-v1`;
    const gate = sanitizationGate(draft.sanitizationConfirmed, blueprintScan(draft));
    const items: BlueprintStackItem[] = stack.map((item, index) => ({
      id: `${versionId}-item-${index}`,
      name: item.role,
      provenance,
      blueprintVersionId: versionId,
      capabilityId: item.capabilityId,
      productId: item.productId,
      role: item.role,
      required: true,
      alternativeProductIds: [],
      configurationRequirements: "Supply your own credentials, fields and business rules. None are included.",
      x: 0,
      y: index,
    }));
    blueprint = {
      blueprint: {
        id: blueprintId,
        slug: `${slugify(draft.blueprintName)}-${blueprintId.slice(-6)}`,
        name: draft.blueprintName.trim(),
        provenance,
        ownerId,
        description: draft.blueprintDescription.trim() || `Sanitized pattern derived from “${record.name}”.`,
        derivedFromImplementationId: id,
        useCaseIds: [draft.useCaseId],
        capabilityIds: [...new Set(stack.map((item) => item.capabilityId))],
        currentVersionId: versionId,
        estimatedComplexity: stack.length <= 3 ? "low" : stack.length <= 6 ? "medium" : "high",
        requiredSkills: ["Integration validation", "Business-rule mapping"],
        license: "Declared by publisher",
        reuseRights: draft.blueprintRights,
        sourceAvailable: false,
        commercialUseAllowed: draft.blueprintRights === "commercial-license" || draft.blueprintRights === "open-source",
        maintainerId: ownerId,
        lastValidatedAt: today,
        compatibilityState: "unknown",
        knownLimitations: "Customer-specific fields, credentials, prompts and business rules are excluded and must be designed per deployment.",
        publicationState: "draft",
        moderationState: "pending",
        sanitizationConfirmedAt: gate.ready ? today : undefined,
        sanitizationChecklist: draft.sanitizationConfirmed.filter((item) => sanitizationChecklist.some((entry) => entry.id === item)),
        rightsDeclaredAt: today,
        setupNotes: draft.blueprintSetupNotes.trim() || undefined,
        demo,
      },
      version: {
        id: versionId,
        name: "v1.0",
        provenance,
        blueprintId,
        version: "1.0",
        createdAt: today,
        changeNotes: "Initial version derived from a contributor implementation record.",
        lastValidatedAt: today,
        compatibilityState: "unknown",
        completeness: 40,
      },
      items,
      connections: connections.map((edge, index) => ({
        id: `${versionId}-edge-${index}`,
        name: edge.label,
        provenance,
        blueprintVersionId: versionId,
        fromItemId: items[stack.findIndex((item) => item.id === edge.fromItemId)].id,
        toItemId: items[stack.findIndex((item) => item.id === edge.toItemId)].id,
        label: edge.label,
        dataFlow: edge.dataFlow,
        trustBoundary: edge.trustBoundary,
      })),
      license: {
        id: `${blueprintId}-license`,
        name: "Publisher declaration",
        provenance,
        blueprintId,
        rights: draft.blueprintRights,
        licenseText: "Terms declared by the publisher; pending moderation.",
        attributionRequired: true,
        commercialUseAllowed: draft.blueprintRights === "commercial-license" || draft.blueprintRights === "open-source",
      },
    };
    record.derivedBlueprintIds = [blueprintId];
  }
  return {
    record,
    context,
    useCase: { id: `${id}-use-case`, name: draft.useCaseId, provenance, implementationId: id, useCaseId: draft.useCaseId },
    steps,
    stack,
    connections,
    periods,
    metrics,
    claims,
    artifacts,
    links,
    blueprint,
    privateCustomerName: draft.customerName.trim(),
  };
}
