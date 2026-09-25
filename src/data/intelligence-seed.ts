import type { IntelligenceTables, EvidenceLevel } from "./intelligence-model";

const now = "2026-09-25T09:00:00Z";
const demo = "demo" as const;
const level: EvidenceLevel = "demo";

export const metricDefinitions: IntelligenceTables["metric_definitions"][] = [
  ["inbound-enquiries", "Inbound enquiries / month", "count", "neutral"],
  ["missed-enquiry-rate", "Missed enquiry rate", "%", "lower-better"],
  ["first-response-time", "Median first-response time", "minutes", "lower-better"],
  ["manual-handling-hours", "Manual handling hours / week", "hours", "lower-better"],
  ["qualified-lead-rate", "Qualified lead rate", "%", "higher-better"],
  ["booking-rate", "Booking rate", "%", "higher-better"],
  ["no-show-rate", "No-show rate", "%", "lower-better"],
  ["cost-per-booking", "Cost per booked customer", "GBP", "lower-better"],
  ["monthly-software-cost", "Monthly software cost", "GBP", "lower-better"],
  ["implementation-cost", "Implementation cost", "GBP", "lower-better"],
  ["maintenance-hours", "Maintenance hours / month", "hours", "lower-better"],
].map(([id, name, unit, direction]) => ({
  id,
  slug: id,
  name,
  description: `${name} for the implementation context. Demo values are illustrative only.`,
  unit,
  direction: direction as IntelligenceTables["metric_definitions"]["direction"],
  category: "service-business-enquiry",
  calculationMethod: "Record the same definition before and after implementation for the stated measurement period.",
  comparisonRules: "Compare only when business context, definition and measurement period are sufficiently similar.",
  provenance: demo,
}));

const implementationRows: Array<{
  id: string;
  name: string;
  summary: string;
  businessType: string;
  size: string;
  region: string;
  context: string;
  locations: number;
  volume: number;
  systems: string[];
  technical: "none" | "basic" | "intermediate" | "advanced";
  duration: string;
  cost: number;
  monthly: number;
  maintenance: number;
  blueprintIds: string[];
  sourceBuildId?: string;
}> = [
  {
    id: "property-enquiry-automation",
    name: "Multi-location property enquiry automation",
    summary: "Illustrative record showing how a service business could capture, qualify and route enquiries while keeping human review for exceptions.",
    businessType: "Property maintenance services",
    size: "11–50 employees",
    region: "United Kingdom",
    context: "Synthetic four-location service operator handling a high volume of web and phone enquiries with a small central operations team.",
    locations: 4,
    volume: 1250,
    systems: ["Phone", "Shared inbox", "CRM"],
    technical: "none",
    duration: "5 weeks",
    cost: 4200,
    monthly: 690,
    maintenance: 4,
    blueprintIds: ["inquiry-booking-reference"],
    sourceBuildId: "ai-dental-receptionist",
  },
  {
    id: "salon-booking-followup",
    name: "Salon booking and follow-up workflow",
    summary: "Illustrative two-location enquiry-to-booking workflow with automated acknowledgement, structured qualification and staff escalation.",
    businessType: "Salon and beauty services",
    size: "1–10 employees",
    region: "United Kingdom",
    context: "Synthetic two-location salon business receiving website, social and phone enquiries with no dedicated technical team.",
    locations: 2,
    volume: 720,
    systems: ["Website", "Calendar", "Messaging"],
    technical: "none",
    duration: "3 weeks",
    cost: 2600,
    monthly: 410,
    maintenance: 2,
    blueprintIds: ["inquiry-booking-reference"],
  },
  {
    id: "agency-lead-routing",
    name: "Agency lead qualification and routing",
    summary: "Illustrative implementation record for triaging inbound project enquiries before a human sales conversation.",
    businessType: "Creative agency",
    size: "11–50 employees",
    region: "Europe",
    context: "Synthetic agency receiving several hundred inbound enquiries per month and manually copying data between forms, inboxes and its CRM.",
    locations: 1,
    volume: 460,
    systems: ["Website form", "Email", "CRM"],
    technical: "basic",
    duration: "2 weeks",
    cost: 1800,
    monthly: 280,
    maintenance: 2,
    blueprintIds: ["lightweight-enquiry-triage"],
  },
  {
    id: "hospitality-reservation-assist",
    name: "Multi-site reservation assistance",
    summary: "Illustrative hospitality workflow combining voice intake, structured reservation requests and human exception handling.",
    businessType: "Hospitality group",
    size: "51–200 employees",
    region: "United Kingdom",
    context: "Synthetic three-site hospitality operator with a central reservations team and frequent after-hours calls.",
    locations: 3,
    volume: 1800,
    systems: ["Phone", "Reservation system", "Email"],
    technical: "basic",
    duration: "6 weeks",
    cost: 5200,
    monthly: 930,
    maintenance: 5,
    blueprintIds: ["voice-reservation-reference"],
  },
];

export const implementationRecords: IntelligenceTables["implementation_records"][] = implementationRows.map((r) => ({
  id: r.id,
  slug: r.id,
  name: r.name,
  summary: r.summary,
  ownerId: "demo-user",
  customerDisplayName: "Synthetic demo business",
  customerIdentityVisibility: "anonymous",
  industry: "Business services",
  businessType: r.businessType,
  organizationSizeBand: r.size,
  employeeCountRange: r.size,
  region: r.region,
  contextSummary: r.context,
  baselinePeriodStart: "2026-05-01",
  baselinePeriodEnd: "2026-05-31",
  measurementPeriodStart: "2026-07-01",
  measurementPeriodEnd: "2026-07-31",
  implementationStartDate: "2026-06-01",
  goLiveDate: "2026-06-30",
  implementationDuration: r.duration,
  implementationCost: r.cost,
  implementationCostCurrency: "GBP",
  costDisclosureType: "exact",
  ongoingMonthlyCost: r.monthly,
  ongoingCostDisclosureType: "exact",
  maintenanceHoursPerMonth: r.maintenance,
  verificationState: level,
  publicationState: "published",
  moderationState: "approved",
  visibility: "public",
  rightsState: "reference-architecture",
  customerPermissionState: "not-required",
  implementerIds: [r.id === "agency-lead-routing" ? "partner-1" : "partner-0"],
  creatorIds: [r.id === "agency-lead-routing" ? "maya-rivera" : "alex-chen"],
  providerIds: ["anthropic", "openai"],
  derivedBlueprintIds: r.blueprintIds,
  sourceBuildId: r.sourceBuildId,
  lastEvidenceReviewAt: "2026-09-20",
  nextEvidenceReviewAt: "2026-12-20",
  stalenessState: "current",
  demo: true,
  provenance: demo,
  createdAt: now,
  updatedAt: now,
}));

export const implementationContexts: IntelligenceTables["implementation_contexts"][] = implementationRows.map((r) => ({
  id: `${r.id}-context`,
  name: `${r.name} context`,
  implementationId: r.id,
  locations: r.locations,
  volumeLabel: `${r.volume.toLocaleString()} illustrative enquiries/month`,
  monthlyVolume: r.volume,
  existingSystems: r.systems,
  technicalCapability: r.technical,
  regulatoryConstraints: r.region === "United Kingdom" ? ["UK data protection review required"] : ["Regional data protection review required"],
  processMaturity: "Documented but manually operated",
  workflowCharacteristics: ["Inbound enquiries", "Human exception handling", "Business-hours and after-hours demand"],
  provenance: demo,
}));

const beforeAfter: Record<string, { before: string[]; change: string[]; after: string[] }> = {
  "property-enquiry-automation": {
    before: ["Website/phone enquiry", "Shared inbox", "Manual qualification", "Manual CRM update", "Staff calls customer"],
    change: ["Standardized intake fields", "Introduced automated acknowledgement", "Added human exception queue"],
    after: ["Website/phone enquiry", "Structured capture", "Automated qualification", "CRM routing", "Booking request", "Human exception queue"],
  },
  "salon-booking-followup": {
    before: ["Message or call", "Staff checks availability", "Manual reply", "Manual reminder"],
    change: ["Unified enquiry capture", "Automated first response", "Structured booking request"],
    after: ["Enquiry", "Acknowledgement", "Qualification", "Calendar request", "Staff approval", "Follow-up"],
  },
  "agency-lead-routing": {
    before: ["Website form", "Inbox", "Manual research", "CRM copy", "Sales review"],
    change: ["Added qualification rules", "Normalized project brief", "Automated CRM routing"],
    after: ["Website form", "Structured qualification", "CRM", "Priority queue", "Human sales review"],
  },
  "hospitality-reservation-assist": {
    before: ["Phone call", "Manual note", "Reservation lookup", "Callback"],
    change: ["Structured voice intake", "Reservation request schema", "Human review for exceptions"],
    after: ["Phone", "Voice intake", "Reservation request", "Availability handoff", "Human exception queue", "Confirmation"],
  },
};

export const processSteps: IntelligenceTables["implementation_process_steps"][] = Object.entries(beforeAfter).flatMap(([implementationId, phases]) =>
  (["before", "change", "after"] as const).flatMap((phase) =>
    phases[phase].map((description, position) => ({
      id: `${implementationId}-${phase}-${position}`,
      name: description,
      implementationId,
      phase,
      position,
      description,
      humanRole: description.toLowerCase().includes("human") || description.toLowerCase().includes("staff") ? "Human decision/review remains" : "System or process step",
      provenance: demo,
    })),
  ),
);

const stacks: Record<string, Array<[string, string, string]>> = {
  "property-enquiry-automation": [
    ["twilio", "telephony", "Inbound communication"],
    ["vapi", "voice", "Voice interface"],
    ["claude", "language", "Reasoning / qualification"],
    ["n8n", "automation", "Workflow orchestration"],
    ["supabase", "database", "Structured event store"],
  ],
  "salon-booking-followup": [
    ["twilio", "telephony", "Messaging / calls"],
    ["openai-api", "language", "Structured qualification"],
    ["n8n", "automation", "Workflow orchestration"],
    ["supabase", "database", "Booking request store"],
  ],
  "agency-lead-routing": [
    ["openai-api", "language", "Lead brief extraction"],
    ["n8n", "automation", "Workflow orchestration"],
    ["supabase", "database", "Lead evidence store"],
    ["vercel-hosting", "hosting", "Review workspace"],
  ],
  "hospitality-reservation-assist": [
    ["twilio", "telephony", "Inbound calls"],
    ["vapi", "voice", "Voice interface"],
    ["claude", "language", "Intent / request structuring"],
    ["n8n", "automation", "Reservation handoff"],
    ["supabase", "database", "Request/event store"],
  ],
};

export const implementationStackItems: IntelligenceTables["implementation_stack_items"][] = Object.entries(stacks).flatMap(([implementationId, items]) =>
  items.map(([productId, capabilityId, role], i) => ({
    id: `${implementationId}-stack-${i}`,
    name: role,
    implementationId,
    productId,
    capabilityId,
    role,
    evidenceLevel: level,
    notes: "Synthetic demo component. Product compatibility and commercial terms must be validated before production use.",
    x: (i % 2) * 320,
    y: Math.floor(i / 2) * 160,
    provenance: demo,
  })),
);

export const implementationConnections: IntelligenceTables["implementation_connections"][] = Object.keys(stacks).flatMap((implementationId) => {
  const items = implementationStackItems.filter((i) => i.implementationId === implementationId);
  return items.slice(1).map((item, index) => ({
    id: `${implementationId}-connection-${index}`,
    name: `${items[index].role} → ${item.role}`,
    implementationId,
    fromItemId: items[index].id,
    toItemId: item.id,
    label: "Illustrative handoff",
    dataFlow: "Structured request/event data",
    trustBoundary: index === 0,
    evidenceLevel: level,
    provenance: demo,
  }));
});

export const implementationUseCases: IntelligenceTables["implementation_use_cases"][] = implementationRecords.map((i) => ({
  id: `${i.id}-use-case`,
  name: "AI customer support",
  implementationId: i.id,
  useCaseId: "customer-support",
  provenance: demo,
}));

export const implementationCapabilities: IntelligenceTables["implementation_capabilities"][] = implementationStackItems.map((i) => ({
  id: `${i.id}-capability`,
  name: i.role,
  implementationId: i.implementationId,
  capabilityId: i.capabilityId,
  provenance: demo,
}));

const metricValues: Record<string, Array<[string, number | null, number | null]>> = {
  "property-enquiry-automation": [
    ["inbound-enquiries", 1250, 1250],
    ["first-response-time", 47, 4],
    ["manual-handling-hours", 22, 8],
    ["booking-rate", 18, 23],
    ["monthly-software-cost", null, 690],
    ["maintenance-hours", null, 4],
  ],
  "salon-booking-followup": [
    ["inbound-enquiries", 720, 720],
    ["first-response-time", 31, 5],
    ["manual-handling-hours", 14, 7],
    ["booking-rate", 24, 29],
    ["no-show-rate", 14, 10],
    ["monthly-software-cost", null, 410],
  ],
  "agency-lead-routing": [
    ["inbound-enquiries", 460, 460],
    ["first-response-time", 95, 12],
    ["manual-handling-hours", 16, 6],
    ["qualified-lead-rate", 38, 45],
    ["monthly-software-cost", null, 280],
  ],
  "hospitality-reservation-assist": [
    ["inbound-enquiries", 1800, 1800],
    ["missed-enquiry-rate", 21, 9],
    ["first-response-time", 26, 3],
    ["manual-handling-hours", 35, 18],
    ["monthly-software-cost", null, 930],
  ],
};

export const measurementPeriods: IntelligenceTables["measurement_periods"][] = implementationRecords.flatMap((i) => [
  {
    id: `${i.id}-baseline-period`,
    name: "Baseline period",
    implementationId: i.id,
    kind: "baseline" as const,
    startDate: i.baselinePeriodStart,
    endDate: i.baselinePeriodEnd,
    notes: "Synthetic demonstration period.",
    provenance: demo,
  },
  {
    id: `${i.id}-observed-period`,
    name: "Observed period",
    implementationId: i.id,
    kind: "observed" as const,
    startDate: i.measurementPeriodStart,
    endDate: i.measurementPeriodEnd,
    notes: "Synthetic demonstration period. Observed values do not establish causality.",
    provenance: demo,
  },
]);

export const implementationMetrics: IntelligenceTables["implementation_metrics"][] = Object.entries(metricValues).flatMap(([implementationId, values]) =>
  values.map(([metricDefinitionId, baselineValue, observedValue]) => {
    const definition = metricDefinitions.find((d) => d.id === metricDefinitionId)!;
    const absoluteChange = baselineValue == null || observedValue == null ? null : observedValue - baselineValue;
    const percentageChange = baselineValue == null || observedValue == null || baselineValue === 0 ? null : ((observedValue - baselineValue) / baselineValue) * 100;
    return {
      id: `${implementationId}-${metricDefinitionId}`,
      name: definition.name,
      implementationId,
      metricDefinitionId,
      baselineValue,
      observedValue,
      unit: definition.unit,
      measurementPeriodId: `${implementationId}-observed-period`,
      absoluteChange,
      percentageChange,
      evidenceLevel: level,
      sourceLabel: "Synthetic illustrative measurement",
      notes: "Demo value only. It is not a claim about a real customer or a prediction for another business.",
      provenance: demo,
    };
  }),
);

export const blueprints: IntelligenceTables["blueprints"][] = [
  {
    id: "inquiry-booking-reference",
    slug: "inquiry-booking-reference",
    name: "Service enquiry-to-booking reference blueprint",
    ownerId: "demo-user",
    description: "A sanitized reference architecture for capturing enquiries, acknowledging them quickly, structuring qualification, routing to business systems and preserving a human exception path.",
    derivedFromImplementationId: "property-enquiry-automation",
    useCaseIds: ["customer-support"],
    capabilityIds: ["telephony", "voice", "language", "automation", "database"],
    currentVersionId: "inquiry-booking-reference-v1",
    estimatedComplexity: "medium",
    requiredSkills: ["Workflow configuration", "API credentials", "Business rule mapping"],
    license: "Demo reference architecture — not licensed for production use",
    reuseRights: "reference-architecture",
    sourceAvailable: false,
    commercialUseAllowed: false,
    maintainerId: "alex-chen",
    lastValidatedAt: "2026-09-20",
    compatibilityState: "current",
    knownLimitations: "Customer-specific CRM fields, calendars, authentication, exception rules and compliance controls are intentionally absent.",
    publicationState: "published",
    moderationState: "approved",
    demo: true,
    provenance: demo,
  },
  {
    id: "lightweight-enquiry-triage",
    slug: "lightweight-enquiry-triage",
    name: "Lightweight lead triage blueprint",
    ownerId: "demo-user",
    description: "A lower-complexity web-form-to-review pattern for small teams that do not need voice automation.",
    derivedFromImplementationId: "agency-lead-routing",
    useCaseIds: ["customer-support"],
    capabilityIds: ["language", "automation", "database", "hosting"],
    currentVersionId: "lightweight-enquiry-triage-v1",
    estimatedComplexity: "low",
    requiredSkills: ["Workflow configuration", "Form mapping"],
    license: "Demo reference architecture — not licensed for production use",
    reuseRights: "reference-architecture",
    sourceAvailable: false,
    commercialUseAllowed: false,
    maintainerId: "maya-rivera",
    lastValidatedAt: "2026-09-20",
    compatibilityState: "current",
    knownLimitations: "Does not include telephony or customer-specific CRM schemas.",
    publicationState: "published",
    moderationState: "approved",
    demo: true,
    provenance: demo,
  },
  {
    id: "voice-reservation-reference",
    slug: "voice-reservation-reference",
    name: "Voice reservation request blueprint",
    ownerId: "demo-user",
    description: "A reference pattern for accepting a reservation request by phone, structuring the request, routing it and retaining a human exception path.",
    derivedFromImplementationId: "hospitality-reservation-assist",
    useCaseIds: ["customer-support"],
    capabilityIds: ["telephony", "voice", "language", "automation", "database"],
    currentVersionId: "voice-reservation-reference-v1",
    estimatedComplexity: "high",
    requiredSkills: ["Telephony configuration", "Workflow integration", "Security review"],
    license: "Demo reference architecture — not licensed for production use",
    reuseRights: "reference-architecture",
    sourceAvailable: false,
    commercialUseAllowed: false,
    maintainerId: "alex-chen",
    lastValidatedAt: "2026-09-20",
    compatibilityState: "review-due",
    knownLimitations: "Reservation-system adapters are deliberately omitted and must be designed per customer.",
    publicationState: "published",
    moderationState: "approved",
    demo: true,
    provenance: demo,
  },
];

export const blueprintVersions: IntelligenceTables["blueprint_versions"][] = blueprints.map((b) => ({
  id: b.currentVersionId,
  name: `${b.name} v1.0`,
  blueprintId: b.id,
  version: "1.0",
  changeNotes: "Initial synthetic reference version.",
  lastValidatedAt: b.lastValidatedAt,
  compatibilityState: b.compatibilityState,
  completeness: 74,
  provenance: demo,
}));

const blueprintProducts: Record<string, Array<[string, string, string, string[]]>> = {
  "inquiry-booking-reference-v1": [
    ["telephony", "twilio", "Communication channel", []],
    ["voice", "vapi", "Voice interface", []],
    ["language", "claude", "Reasoning / extraction", ["openai-api"]],
    ["automation", "n8n", "Workflow orchestration", ["flow-agent"]],
    ["database", "supabase", "Structured event store", []],
  ],
  "lightweight-enquiry-triage-v1": [
    ["language", "openai-api", "Brief extraction", ["claude"]],
    ["automation", "n8n", "Workflow orchestration", ["flow-agent"]],
    ["database", "supabase", "Lead store", []],
    ["hosting", "vercel-hosting", "Review interface hosting", []],
  ],
  "voice-reservation-reference-v1": [
    ["telephony", "twilio", "Communication channel", []],
    ["voice", "vapi", "Voice interface", []],
    ["language", "claude", "Intent structuring", ["openai-api"]],
    ["automation", "n8n", "Reservation handoff", ["flow-agent"]],
    ["database", "supabase", "Request event store", []],
  ],
};

export const blueprintStackItems: IntelligenceTables["blueprint_stack_items"][] = Object.entries(blueprintProducts).flatMap(([blueprintVersionId, items]) =>
  items.map(([capabilityId, productId, role, alternativeProductIds], index) => ({
    id: `${blueprintVersionId}-item-${index}`,
    name: role,
    blueprintVersionId,
    capabilityId,
    productId,
    role,
    required: true,
    alternativeProductIds,
    configurationRequirements: "Validate credentials, fields, rate limits, data handling and error paths for the target business.",
    x: (index % 2) * 320,
    y: Math.floor(index / 2) * 160,
    provenance: demo,
  })),
);

export const blueprintConnections: IntelligenceTables["blueprint_connections"][] = blueprintVersions.flatMap((version) => {
  const items = blueprintStackItems.filter((i) => i.blueprintVersionId === version.id);
  return items.slice(1).map((item, index) => ({
    id: `${version.id}-edge-${index}`,
    name: `${items[index].role} → ${item.role}`,
    blueprintVersionId: version.id,
    fromItemId: items[index].id,
    toItemId: item.id,
    label: "Reference handoff",
    dataFlow: "Structured business event",
    trustBoundary: index === 0,
    provenance: demo,
  }));
});

export const blueprintRequirements: IntelligenceTables["blueprint_requirements"][] = blueprints.flatMap((b) => [
  {
    id: `${b.id}-req-1`,
    name: "Business-system access",
    blueprintId: b.id,
    type: "system" as const,
    description: "Authorized access to the target business systems and test/sandbox environment where available.",
    required: true,
    provenance: demo,
  },
  {
    id: `${b.id}-req-2`,
    name: "Exception ownership",
    blueprintId: b.id,
    type: "operational" as const,
    description: "A named human owner for ambiguous, failed or sensitive cases.",
    required: true,
    provenance: demo,
  },
]);

export const blueprintLicenses: IntelligenceTables["blueprint_licenses"][] = blueprints.map((b) => ({
  id: `${b.id}-license`,
  name: b.license,
  blueprintId: b.id,
  rights: b.reuseRights,
  licenseText: "Synthetic demonstration only. No production-use rights are granted by this demo record.",
  attributionRequired: true,
  commercialUseAllowed: false,
  provenance: demo,
}));

export const claims: IntelligenceTables["claims"][] = [
  ...implementationRecords.map((i) => ({
    id: `${i.id}-architecture-claim`,
    name: "Implementation architecture",
    subjectType: "implementation" as const,
    subjectId: i.id,
    predicate: "architecture-recorded",
    value: "Synthetic architecture recorded for interface demonstration",
    claimant: "Oracnet demo dataset",
    status: "accepted" as const,
    evidenceLevel: level,
    reviewedAt: "2026-09-20",
    public: true,
    provenance: demo,
  })),
  ...implementationMetrics.map((m) => ({
    id: `${m.id}-claim`,
    name: m.name,
    subjectType: "metric" as const,
    subjectId: m.id,
    predicate: "observed-value",
    value: m.observedValue == null ? "Not recorded" : String(m.observedValue),
    unit: m.unit,
    period: "Synthetic July 2026 period",
    claimant: "Oracnet demo dataset",
    status: "accepted" as const,
    evidenceLevel: level,
    reviewedAt: "2026-09-20",
    public: true,
    provenance: demo,
  })),
];

export const evidenceArtifacts: IntelligenceTables["evidence_artifacts"][] = implementationRecords.map((i) => ({
  id: `${i.id}-demo-evidence`,
  name: "Synthetic demonstration evidence metadata",
  ownerId: "demo-user",
  kind: "other",
  publicMetadata: "Demo-only metadata. No real customer evidence or private file exists.",
  storagePath: "",
  mimeType: "text/plain",
  private: true,
  provenance: demo,
}));

export const claimEvidence: IntelligenceTables["claim_evidence"][] = claims.map((claim) => {
  const implementationId = claim.subjectType === "implementation" ? claim.subjectId : implementationMetrics.find((m) => m.id === claim.subjectId)?.implementationId;
  return {
    id: `${claim.id}-evidence-link`,
    name: "Demo evidence link",
    claimId: claim.id,
    evidenceArtifactId: `${implementationId ?? implementationRecords[0].id}-demo-evidence`,
    relationship: "context",
    provenance: demo,
  };
});

export const attestations: IntelligenceTables["attestations"][] = [
  {
    id: "demo-attestation",
    name: "Demo customer attestation preview",
    implementationId: "property-enquiry-automation",
    ownerId: "demo-user",
    tokenHash: "demo-hash-not-a-live-token",
    expiresAt: "2027-01-01T00:00:00Z",
    status: "pending",
    customerIdentityVisibility: "anonymous",
    attestorLabel: "Synthetic customer representative",
    provenance: demo,
  },
];

export const verificationEvents: IntelligenceTables["verification_events"][] = implementationRecords.map((i) => ({
  id: `${i.id}-verification-event`,
  name: "Demo evidence review",
  subjectType: "implementation",
  subjectId: i.id,
  action: "Synthetic record labelled demo",
  actorId: "system",
  at: "2026-09-20T09:00:00Z",
  nextLevel: "demo",
  provenance: demo,
}));

export const technologyRelationships: IntelligenceTables["technology_relationships"][] = [
  ["twilio", "vapi"],
  ["vapi", "claude"],
  ["vapi", "openai-api"],
  ["claude", "n8n"],
  ["openai-api", "n8n"],
  ["n8n", "supabase"],
].map(([sourceProductId, targetProductId], index) => ({
  id: `demo-relationship-${index}`,
  name: `${sourceProductId} + ${targetProductId}`,
  sourceProductId,
  targetProductId,
  relationshipType: "observed-together",
  sourceLabel: "Co-occurrence in synthetic Oracnet demo records; not an official compatibility claim.",
  lastCheckedAt: "2026-09-20",
  evidenceLevel: level,
  notes: "Validate official integration support, authentication, limits and data handling with both providers before production use.",
  provenance: demo,
}));

export const compatibilityChecks: IntelligenceTables["compatibility_checks"][] = technologyRelationships.map((r) => ({
  id: `${r.id}-check`,
  name: "Demo compatibility state",
  relationshipId: r.id,
  checkedAt: "2026-09-20",
  result: "unknown",
  conditions: ["Synthetic co-occurrence only; production compatibility has not been verified."],
  evidenceLevel: level,
  provenance: demo,
}));

export const stalenessReviews: IntelligenceTables["staleness_reviews"][] = [
  ...implementationRecords.map((i) => ({
    id: `${i.id}-staleness`,
    name: "Evidence freshness review",
    entityType: "implementation" as const,
    entityId: i.id,
    reviewedAt: i.lastEvidenceReviewAt,
    nextReviewAt: i.nextEvidenceReviewAt,
    state: i.stalenessState,
    reason: "Synthetic demonstration review schedule.",
    provenance: demo,
  })),
  ...blueprints.map((b) => ({
    id: `${b.id}-staleness`,
    name: "Blueprint compatibility review",
    entityType: "blueprint" as const,
    entityId: b.id,
    reviewedAt: b.lastValidatedAt,
    state: b.compatibilityState,
    reason: "Synthetic demonstration compatibility state.",
    provenance: demo,
  })),
];

export const intelligenceSeed: Partial<{
  [K in keyof IntelligenceTables]: IntelligenceTables[K][];
}> = {
  implementation_records: implementationRecords,
  implementation_contexts: implementationContexts,
  implementation_process_steps: processSteps,
  implementation_stack_items: implementationStackItems,
  implementation_connections: implementationConnections,
  implementation_use_cases: implementationUseCases,
  implementation_capabilities: implementationCapabilities,
  metric_definitions: metricDefinitions,
  implementation_metrics: implementationMetrics,
  measurement_periods: measurementPeriods,
  claims,
  claim_evidence: claimEvidence,
  evidence_artifacts: evidenceArtifacts,
  attestations,
  evidence_reviews: [],
  verification_events: verificationEvents,
  blueprints,
  blueprint_versions: blueprintVersions,
  blueprint_stack_items: blueprintStackItems,
  blueprint_connections: blueprintConnections,
  blueprint_requirements: blueprintRequirements,
  blueprint_licenses: blueprintLicenses,
  technology_relationships: technologyRelationships,
  relationship_evidence: [],
  compatibility_checks: compatibilityChecks,
  requirement_profiles: [],
  solution_runs: [],
  solution_candidates: [],
  solution_candidate_items: [],
  solution_explanations: [],
  staleness_reviews: stalenessReviews,
};
