import type { IntelligenceTables, EvidenceLevel } from "./intelligence-model";
import type { Product, Provider, SolutionStack, UseCase } from "./model";
import { hashToken } from "./attestation.ts";

/**
 * ILLUSTRATIVE DEMO DATA. Every business, outcome, cost, claim, review and
 * relationship below is synthetic. Product names refer to real vendors only as
 * catalogue components; relationship types and administration-skill notes are
 * illustrative and must be confirmed in provider documentation. Nothing here
 * describes a real customer or a verified outcome.
 */
const now = "2026-09-25T09:00:00Z";
const demo = "demo" as const;
const level: EvidenceLevel = "demo";
const illustrativeAttribute = "Illustrative Oracnet demo assessment — confirm with the provider.";

/** Public, intentionally non-secret token for the demo attestation walkthrough. */
export const DEMO_ATTESTATION_TOKEN = "demo-attestation-token-illustrative-only-not-a-secret";

export const intelligenceProviders: Provider[] = [
  ["hubspot", "HubSpot", "https://www.hubspot.com", "automation", "orange"],
  ["pipedrive", "Pipedrive", "https://www.pipedrive.com", "automation", "green"],
  ["google-workspace", "Google Workspace", "https://workspace.google.com", "automation", "blue"],
  ["cal-com", "Cal.com", "https://cal.com", "automation", "dark"],
  ["make", "Make", "https://www.make.com", "automation", "violet"],
  ["slack", "Slack", "https://slack.com", "automation", "peach"],
].map(([id, name, website, category, color]) => ({
  id,
  slug: id,
  name,
  description: "Sample directory profile. See the official website for product information.",
  website,
  category,
  color,
  initials: name.slice(0, 1),
  region: "Global",
  specialties: [],
  provenance: demo,
}));

const productRows: [string, string, string, string[], string, Product["operatorSkill"], string[] | undefined][] = [
  ["hubspot", "HubSpot CRM", "hubspot", ["crm", "follow-up"], "orange", "no-code", ["cloud"]],
  ["pipedrive", "Pipedrive", "pipedrive", ["crm"], "green", "no-code", ["cloud"]],
  ["google-calendar", "Google Calendar", "google-workspace", ["calendar"], "blue", "no-code", ["cloud"]],
  ["cal-com", "Cal.com", "cal-com", ["calendar"], "dark", "no-code", ["cloud", "self-hosted"]],
  ["make", "Make", "make", ["automation"], "violet", "low-code", ["cloud"]],
  ["slack", "Slack", "slack", ["human-escalation", "messaging"], "peach", "no-code", ["cloud"]],
];

export const intelligenceProducts: Product[] = productRows.map(([id, name, providerId, capabilityIds, color, operatorSkill, deploymentOptions]) => ({
  id,
  slug: id,
  name,
  description: "Illustrative catalogue entry · confirm features and terms with the provider.",
  providerId,
  category: "automation",
  capabilityIds,
  deployment: "Cloud",
  pricing: "Contact provider",
  integrations: [],
  initials: name.slice(0, 1),
  color,
  operatorSkill,
  deploymentOptions,
  attributeSource: illustrativeAttribute,
  provenance: demo,
}));

/** Administration-skill and deployment notes for existing catalogue products used by records. */
export const productAttributeOverrides: Record<string, Partial<Product>> = {
  twilio: { operatorSkill: "low-code", deploymentOptions: ["cloud"], capabilityIds: ["telephony", "inbound-channel", "messaging"] },
  vapi: { operatorSkill: "low-code", deploymentOptions: ["cloud"] },
  claude: { operatorSkill: "low-code", deploymentOptions: ["cloud"] },
  "openai-api": { operatorSkill: "low-code", deploymentOptions: ["cloud"] },
  n8n: { operatorSkill: "low-code", deploymentOptions: ["cloud", "self-hosted"] },
  supabase: { operatorSkill: "developer", deploymentOptions: ["cloud", "self-hosted"] },
  "webflow-sites": { operatorSkill: "no-code", deploymentOptions: ["cloud"], capabilityIds: ["website", "forms", "inbound-channel"] },
  "flow-agent": { availableRegions: ["North America"] },
};

export const intelligenceUseCases: UseCase[] = [
  ["enquiry-to-booking", "Answer, qualify and book inbound enquiries", "Make sure every call, message and web enquiry gets a fast answer, the right questions and a booked slot — with people handling the exceptions.", "Turn more enquiries into booked work", "Workflow", "sand"],
  ["lead-qualification-routing", "Qualify and route inbound leads", "Structure inbound project enquiries so the right person reviews the right lead quickly.", "Spend sales time on the right conversations", "Workflow", "peach"],
  ["after-hours-reservations", "Handle after-hours reservation requests", "Capture reservation and booking requests outside opening hours without losing them.", "Stop losing out-of-hours demand", "Headphones", "violet"],
].map(([id, name, description, outcome, icon, color]) => ({
  id,
  slug: id,
  name,
  description,
  outcome,
  category: "automation",
  icon,
  color,
  stackId: `${id}-pattern`,
  provenance: demo,
}));

export const intelligenceStacks: SolutionStack[] = [
  { id: "enquiry-to-booking-pattern", name: "Enquiry → qualification → booking pattern", useCaseId: "enquiry-to-booking", items: [
    { capabilityId: "telephony", productId: "twilio", alternativeIds: [] },
    { capabilityId: "language", productId: "claude", alternativeIds: ["openai-api"] },
    { capabilityId: "automation", productId: "n8n", alternativeIds: ["make"] },
    { capabilityId: "crm", productId: "hubspot", alternativeIds: ["pipedrive"] },
    { capabilityId: "calendar", productId: "google-calendar", alternativeIds: ["cal-com"] },
  ] },
  { id: "lead-qualification-routing-pattern", name: "Lead triage and routing pattern", useCaseId: "lead-qualification-routing", items: [
    { capabilityId: "forms", productId: "webflow-sites", alternativeIds: [] },
    { capabilityId: "language", productId: "openai-api", alternativeIds: ["claude"] },
    { capabilityId: "crm", productId: "pipedrive", alternativeIds: ["hubspot"] },
  ] },
  { id: "after-hours-reservations-pattern", name: "Voice reservation request pattern", useCaseId: "after-hours-reservations", items: [
    { capabilityId: "telephony", productId: "twilio", alternativeIds: [] },
    { capabilityId: "voice", productId: "vapi", alternativeIds: [] },
    { capabilityId: "automation", productId: "n8n", alternativeIds: ["make"] },
  ] },
].map((stack) => ({
  ...stack,
  slug: stack.id,
  description: "A conceptual solution pattern: a typical composition, broader than any Blueprint. Validate every component for your context.",
  provenance: demo,
}));

export const metricDefinitions: IntelligenceTables["metric_definitions"][] = [
  ["inbound-enquiries", "Inbound enquiries / month", "count", "neutral", "Count of distinct inbound enquiries across phone, web and messaging in the period."],
  ["missed-enquiry-rate", "Missed enquiry rate", "%", "lower-better", "Enquiries with no human or automated response within one business day ÷ inbound enquiries."],
  ["first-response-time", "Median first-response time", "minutes", "lower-better", "Median minutes from enquiry receipt to first meaningful response."],
  ["manual-handling-hours", "Manual handling hours / week", "hours", "lower-better", "Staff hours per week spent reading, triaging and re-keying enquiries."],
  ["qualified-lead-rate", "Qualification rate", "%", "higher-better", "Enquiries meeting documented qualification criteria ÷ inbound enquiries."],
  ["booking-rate", "Booking rate", "%", "higher-better", "Enquiries that result in a confirmed booking ÷ inbound enquiries."],
  ["no-show-rate", "No-show rate", "%", "lower-better", "Booked appointments not attended ÷ booked appointments."],
  ["implementation-cost", "Implementation cost", "GBP", "lower-better", "One-off setup cost paid to implementers and vendors."],
  ["monthly-software-cost", "Ongoing software cost / month", "GBP", "lower-better", "Recurring monthly subscription and usage cost for the stack."],
  ["maintenance-hours", "Maintenance hours / month", "hours", "lower-better", "Hours per month spent maintaining the workflow after go-live."],
].map(([id, name, unit, direction, calculationMethod]) => ({
  id,
  slug: id,
  name,
  description: `${name}. Demo values are illustrative only.`,
  unit,
  direction: direction as IntelligenceTables["metric_definitions"]["direction"],
  category: "service-enquiry-booking",
  calculationMethod,
  comparisonRules: "Compare only with the same definition and unit, and measurement periods of similar length. Rates compare in percentage points.",
  provenance: demo,
}));

interface Row {
  id: string;
  name: string;
  summary: string;
  problem: string;
  businessType: string;
  size: string;
  region: string;
  context: string;
  locations: number;
  volume: [number, number];
  systems: string[];
  technical: "none" | "basic" | "intermediate" | "advanced";
  duration: string;
  cost: { type: "exact" | "range" | "not-disclosed"; low?: number; high?: number };
  monthly: number | null;
  maintenance: number | null;
  burden: "low" | "medium" | "high";
  useCaseId: string;
  implementerId: string;
  creatorId: string;
  blueprintIds: string[];
  /** Build this deployment was delivered from, when one is published. */
  sourceBuildId?: string;
  reviewedAt: string;
  nextReviewAt: string;
  dates: { start: string; live: string; baseline: [string, string]; observed: [string, string] };
  limitations: string;
  afterHoursShare?: number;
}

const rows: Row[] = [
  {
    id: "property-enquiry-automation",
    name: "Multi-location property maintenance enquiry automation",
    summary: "Phone and web enquiries for a four-branch maintenance business are captured, qualified and booked, with staff handling exceptions.",
    problem: "Enquiries arrived by phone and web form across four branches. Calls went unanswered at peak times, and staff re-keyed details into the CRM before calling customers back to book.",
    businessType: "Property maintenance services",
    size: "11–50 employees",
    region: "United Kingdom",
    context: "Fictional UK property maintenance business with four branches, a central operations team, HubSpot as CRM and no in-house developers.",
    locations: 4,
    volume: [1000, 1500],
    systems: ["Phone", "Website form", "HubSpot CRM", "Google Calendar"],
    technical: "none",
    duration: "5 weeks",
    cost: { type: "range", low: 3500, high: 5000 },
    monthly: 690,
    maintenance: 4,
    burden: "medium",
    useCaseId: "enquiry-to-booking",
    implementerId: "partner-0",
    creatorId: "alex-chen",
    blueprintIds: ["inquiry-booking-reference"],
    sourceBuildId: "service-enquiry-booking-system",
    reviewedAt: "2026-09-20",
    nextReviewAt: "2027-03-20",
    dates: { start: "2026-05-04", live: "2026-06-08", baseline: ["2026-04-01", "2026-04-30"], observed: ["2026-07-01", "2026-07-31"] },
    limitations: "Observed period includes a seasonal peak; the booking definition changed from 'visit scheduled' to 'visit confirmed' in June.",
    afterHoursShare: 31,
  },
  {
    id: "salon-booking-followup",
    name: "Two-salon enquiry, booking and follow-up workflow",
    summary: "Website and message enquiries receive an immediate acknowledgement, structured questions and a booking link, with staff approving non-standard requests.",
    problem: "Staff answered booking messages between clients, so replies were slow and reminders were inconsistent.",
    businessType: "Salon and beauty services",
    size: "1–10 employees",
    region: "United Kingdom",
    context: "Fictional two-location salon receiving website, social and SMS enquiries with no dedicated technical staff.",
    locations: 2,
    volume: [600, 800],
    systems: ["Website form", "SMS", "Cal.com"],
    technical: "none",
    duration: "3 weeks",
    cost: { type: "exact", low: 2600, high: 2600 },
    monthly: 410,
    maintenance: 2,
    burden: "low",
    useCaseId: "enquiry-to-booking",
    implementerId: "partner-1",
    creatorId: "maya-rivera",
    blueprintIds: [],
    reviewedAt: "2026-08-14",
    nextReviewAt: "2027-02-14",
    dates: { start: "2026-05-18", live: "2026-06-08", baseline: ["2026-04-01", "2026-04-30"], observed: ["2026-07-01", "2026-07-31"] },
    limitations: "No-show figures come from the booking tool only; walk-ins are excluded.",
  },
  {
    id: "agency-lead-routing",
    name: "Agency lead qualification and routing",
    summary: "Inbound project enquiries are structured and routed to the right person in the CRM before a human sales conversation.",
    problem: "Project enquiries were copied manually from forms and inboxes into the CRM, and good leads waited days for a reply.",
    businessType: "Creative agency",
    size: "11–50 employees",
    region: "Europe",
    context: "Fictional agency in Ireland receiving several hundred inbound enquiries per month via web forms and email, with one operations lead comfortable configuring SaaS tools.",
    locations: 1,
    volume: [400, 500],
    systems: ["Website form", "Email", "Pipedrive", "Slack"],
    technical: "basic",
    duration: "2 weeks",
    cost: { type: "not-disclosed" },
    monthly: 280,
    maintenance: 2,
    burden: "low",
    useCaseId: "lead-qualification-routing",
    implementerId: "partner-2",
    creatorId: "maya-rivera",
    blueprintIds: ["lightweight-enquiry-triage"],
    reviewedAt: "2026-07-02",
    nextReviewAt: "2027-01-02",
    dates: { start: "2026-04-06", live: "2026-04-20", baseline: ["2026-02-01", "2026-03-31"], observed: ["2026-05-01", "2026-06-30"] },
    limitations: "Qualification criteria were written during the project, so the baseline qualification rate was reconstructed retrospectively.",
  },
  {
    id: "hospitality-reservation-assist",
    name: "Multi-site after-hours reservation assistance",
    summary: "After-hours calls to three venues are answered by a voice interface that captures structured reservation requests for staff to confirm.",
    problem: "Calls outside opening hours went to voicemail and many were never returned; the reservations team spent mornings working through callbacks.",
    businessType: "Hospitality group",
    size: "51–200 employees",
    region: "United Kingdom",
    context: "Fictional three-venue hospitality group with a central reservations team and frequent after-hours calls.",
    locations: 3,
    volume: [1500, 2100],
    systems: ["Phone", "Reservation system", "Email", "Slack"],
    technical: "basic",
    duration: "6 weeks",
    cost: { type: "exact", low: 5200, high: 5200 },
    monthly: 930,
    maintenance: 5,
    burden: "medium",
    useCaseId: "after-hours-reservations",
    implementerId: "partner-0",
    creatorId: "alex-chen",
    blueprintIds: ["voice-reservation-reference"],
    reviewedAt: "2026-02-10",
    nextReviewAt: "2026-08-10",
    dates: { start: "2025-12-01", live: "2026-01-12", baseline: ["2025-11-01", "2025-11-30"], observed: ["2026-01-15", "2026-02-14"] },
    limitations: "Reservation-system integration is manual: staff re-enter confirmed requests. Observed period spans a holiday month.",
    afterHoursShare: 44,
  },
  {
    id: "trades-missed-call-textback",
    name: "Plumbing & heating missed-call text-back",
    summary: "Missed calls to a single-site trades business trigger an SMS with a short qualification form and booking link.",
    problem: "Engineers could not answer calls on jobs, and missed callers usually rang the next firm on the list.",
    businessType: "Plumbing and heating trades",
    size: "1–10 employees",
    region: "United Kingdom",
    context: "Fictional single-site plumbing and heating business with no office staff; the owner handles bookings between jobs.",
    locations: 1,
    volume: [200, 350],
    systems: ["Phone", "Google Calendar", "HubSpot CRM"],
    technical: "none",
    duration: "1 week",
    cost: { type: "exact", low: 900, high: 900 },
    monthly: 95,
    maintenance: 1,
    burden: "low",
    useCaseId: "enquiry-to-booking",
    implementerId: "partner-2",
    creatorId: "maya-rivera",
    blueprintIds: ["missed-call-textback"],
    sourceBuildId: "missed-call-textback-kit",
    reviewedAt: "2025-08-01",
    nextReviewAt: "2026-02-01",
    dates: { start: "2025-05-05", live: "2025-05-12", baseline: ["2025-03-01", "2025-04-30"], observed: ["2025-06-01", "2025-07-31"] },
    limitations: "Evidence last reviewed over a year ago; SMS provider pricing and templates may have changed since.",
  },
];

export const implementationRecords: IntelligenceTables["implementation_records"][] = rows.map((r) => ({
  id: r.id,
  slug: r.id,
  name: r.name,
  summary: r.summary,
  problemStatement: r.problem,
  ownerId: "demo-user",
  customerDisplayName: "Fictional demo business",
  customerIdentityVisibility: "anonymous",
  industry: r.businessType === "Hospitality group" ? "Hospitality" : "Business services",
  businessType: r.businessType,
  organizationSizeBand: r.size,
  employeeCountRange: r.size,
  region: r.region,
  contextSummary: r.context,
  baselinePeriodStart: r.dates.baseline[0],
  baselinePeriodEnd: r.dates.baseline[1],
  measurementPeriodStart: r.dates.observed[0],
  measurementPeriodEnd: r.dates.observed[1],
  implementationStartDate: r.dates.start,
  goLiveDate: r.dates.live,
  implementationDuration: r.duration,
  implementationCost: r.cost.type === "exact" ? r.cost.low! : null,
  implementationCostLow: r.cost.low ?? null,
  implementationCostHigh: r.cost.high ?? null,
  implementationCostCurrency: "GBP",
  costDisclosureType: r.cost.type,
  ongoingMonthlyCost: r.monthly,
  ongoingCostDisclosureType: r.monthly == null ? "not-disclosed" : "exact",
  maintenanceHoursPerMonth: r.maintenance,
  maintenanceBurden: r.burden,
  knownLimitations: r.limitations,
  categoryTemplateId: "service-enquiry-booking",
  verificationState: level,
  publicationState: "published",
  moderationState: "approved",
  visibility: "public",
  rightsState: "reference-architecture",
  customerPermissionState: "not-required",
  implementerIds: [r.implementerId],
  creatorIds: [r.creatorId],
  providerIds: [],
  derivedBlueprintIds: r.blueprintIds,
  sourceBuildId: r.sourceBuildId,
  lastEvidenceReviewAt: r.reviewedAt,
  nextEvidenceReviewAt: r.nextReviewAt,
  stalenessState: "unknown",
  demo: true,
  provenance: demo,
  createdAt: now,
  updatedAt: now,
}));

export const implementationContexts: IntelligenceTables["implementation_contexts"][] = rows.map((r) => ({
  id: `${r.id}-context`,
  name: `${r.name} context`,
  implementationId: r.id,
  locations: r.locations,
  volumeLabel: `${r.volume[0].toLocaleString("en-GB")}–${r.volume[1].toLocaleString("en-GB")} illustrative enquiries / month`,
  monthlyVolume: Math.round((r.volume[0] + r.volume[1]) / 2),
  monthlyVolumeMin: r.volume[0],
  monthlyVolumeMax: r.volume[1],
  existingSystems: r.systems,
  technicalCapability: r.technical,
  regulatoryConstraints: [r.region === "United Kingdom" ? "UK GDPR" : "EU GDPR"],
  processMaturity: "Documented but manually operated",
  workflowCharacteristics: ["Inbound enquiries", "Human exception handling", ...(r.afterHoursShare ? ["After-hours demand"] : [])],
  dataSensitivity: "medium",
  humanApprovalRequired: true,
  maintenanceTolerance: r.technical === "none" ? "low" : "medium",
  extensions: (r.afterHoursShare ? { afterHoursShare: r.afterHoursShare } : {}) as Record<string, number>,
  provenance: demo,
}));

export const implementationUseCases: IntelligenceTables["implementation_use_cases"][] = rows.map((r) => ({
  id: `${r.id}-use-case`,
  name: r.useCaseId,
  implementationId: r.id,
  useCaseId: r.useCaseId,
  provenance: demo,
}));

const process: Record<string, { before: string[]; change: string[]; after: string[] }> = {
  "property-enquiry-automation": {
    before: ["Phone call or web form arrives", "Enquiry lands in a shared inbox or voicemail", "Staff member reads the enquiry", "Staff qualify the job by phone", "Staff re-key details into HubSpot", "Staff call back to agree a visit"],
    change: ["Standard qualification questions agreed per job type", "Automated capture of calls and web forms", "Exception rules defined for emergencies and complaints", "Branch diaries exposed as bookable availability"],
    after: ["Phone call or web form arrives", "Automated capture and acknowledgement", "Structured qualification questions", "HubSpot contact and deal created", "Availability checked and visit booked", "Automated confirmation and reminder", "Human exception queue for emergencies and complaints"],
  },
  "salon-booking-followup": {
    before: ["Message or call arrives", "Stylist replies between clients", "Staff check the diary manually", "Manual confirmation message", "Reminder sent if remembered"],
    change: ["Single enquiry form across channels", "Automated first response", "Non-standard requests routed for staff approval"],
    after: ["Enquiry arrives", "Immediate acknowledgement", "Structured service questions", "Booking link for standard services", "Staff approve non-standard requests", "Automated reminder and follow-up"],
  },
  "agency-lead-routing": {
    before: ["Website form or email", "Shared inbox", "Manual research on the company", "Copy into Pipedrive", "Sales lead reviews when available"],
    change: ["Written qualification criteria", "Normalized project brief", "Routing rules by service line"],
    after: ["Website form or email", "Structured brief extraction", "Pipedrive deal created with brief", "Routed to service-line owner", "Human sales review before any reply"],
  },
  "hospitality-reservation-assist": {
    before: ["After-hours call", "Voicemail", "Morning callback list", "Reservation lookup", "Callback to confirm"],
    change: ["Structured voice intake for reservation requests", "Reservation request schema", "Staff confirmation for every request"],
    after: ["After-hours call", "Voice intake captures request", "Request stored and posted to staff channel", "Staff check availability", "Staff confirm with the guest"],
  },
  "trades-missed-call-textback": {
    before: ["Call rings out while on a job", "Caller tries another firm", "Owner returns calls in the evening"],
    change: ["Missed-call trigger", "Short qualification form by SMS", "Booking slots published from calendar"],
    after: ["Missed call", "Automatic SMS with qualification form", "Qualified job added to CRM", "Customer picks a slot", "Owner reviews urgent jobs"],
  },
};

export const processSteps: IntelligenceTables["implementation_process_steps"][] = Object.entries(process).flatMap(([implementationId, phases]) =>
  (["before", "change", "after"] as const).flatMap((phase) =>
    phases[phase].map((description, position) => ({
      id: `${implementationId}-${phase}-${position}`,
      name: description,
      implementationId,
      phase,
      position,
      description,
      humanRole: /human|staff|owner|sales|manual|review|approve/i.test(description) ? "Human decision or effort" : "System or process step",
      provenance: demo,
    })),
  ),
);

type StackRow = [productId: string, capabilityId: string, role: string];
const stacks: Record<string, StackRow[]> = {
  "property-enquiry-automation": [
    ["twilio", "telephony", "Inbound calls and SMS"],
    ["vapi", "voice", "Voice interface"],
    ["claude", "language", "Qualification and extraction"],
    ["n8n", "automation", "Workflow orchestration"],
    ["hubspot", "crm", "CRM record and follow-up"],
    ["google-calendar", "calendar", "Branch availability"],
    ["slack", "human-escalation", "Exception queue"],
  ],
  "salon-booking-followup": [
    ["twilio", "messaging", "SMS enquiries and reminders"],
    ["openai-api", "language", "Structured service questions"],
    ["make", "automation", "Workflow orchestration"],
    ["cal-com", "calendar", "Booking links"],
    ["slack", "human-escalation", "Staff approval"],
  ],
  "agency-lead-routing": [
    ["webflow-sites", "forms", "Website enquiry form"],
    ["openai-api", "language", "Brief extraction"],
    ["n8n", "automation", "Routing workflow"],
    ["pipedrive", "crm", "Deal pipeline"],
    ["slack", "human-escalation", "Sales review"],
  ],
  "hospitality-reservation-assist": [
    ["twilio", "telephony", "After-hours calls"],
    ["vapi", "voice", "Voice intake"],
    ["claude", "language", "Request structuring"],
    ["n8n", "automation", "Request handoff"],
    ["supabase", "database", "Request store"],
    ["slack", "human-escalation", "Staff confirmation"],
  ],
  "trades-missed-call-textback": [
    ["twilio", "telephony", "Missed-call trigger and SMS"],
    ["make", "automation", "Workflow"],
    ["openai-api", "language", "Qualification summary"],
    ["hubspot", "crm", "Job record"],
    ["google-calendar", "calendar", "Available slots"],
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
    notes: "Illustrative component. Product compatibility and commercial terms must be validated before production use.",
    x: 0,
    y: i,
    provenance: demo,
  })),
);

/** Edges as [from index, to index, label, data flow, crosses trust boundary]. */
const edges: Record<string, [number, number, string, string, boolean][]> = {
  "property-enquiry-automation": [
    [0, 1, "Call audio", "Caller audio stream", true],
    [1, 2, "Transcript", "Call transcript for qualification", true],
    [1, 3, "Structured enquiry", "Enquiry fields (job type, postcode, urgency)", false],
    [3, 4, "Create contact + deal", "Contact and job details", true],
    [3, 5, "Check availability", "Branch and slot request", true],
    [3, 6, "Exception", "Enquiries needing a human", true],
  ],
  "salon-booking-followup": [
    [0, 2, "Inbound SMS", "Message text", true],
    [2, 1, "Classify request", "Message text", true],
    [2, 3, "Booking link", "Service and preferred time", true],
    [2, 4, "Approval request", "Non-standard requests", true],
  ],
  "agency-lead-routing": [
    [0, 2, "Form submission", "Project brief", false],
    [2, 1, "Extract brief", "Brief text", true],
    [2, 3, "Create deal", "Structured brief", true],
    [2, 4, "Notify owner", "Deal link", true],
  ],
  "hospitality-reservation-assist": [
    [0, 1, "Call audio", "Caller audio stream", true],
    [1, 2, "Transcript", "Reservation request transcript", true],
    [1, 3, "Structured request", "Party size, date, time, contact", false],
    [3, 4, "Store request", "Reservation request", true],
    [3, 5, "Staff confirmation", "Request summary", true],
  ],
  "trades-missed-call-textback": [
    [0, 1, "Missed-call webhook", "Caller number", true],
    [1, 2, "Summarize answers", "Form answers", true],
    [1, 3, "Create job", "Customer and job details", true],
    [1, 4, "Offer slots", "Available slots", true],
  ],
};

export const implementationConnections: IntelligenceTables["implementation_connections"][] = Object.entries(edges).flatMap(([implementationId, list]) =>
  list.map(([from, to, label, dataFlow, trustBoundary], index) => ({
    id: `${implementationId}-connection-${index}`,
    name: label,
    implementationId,
    fromItemId: `${implementationId}-stack-${from}`,
    toItemId: `${implementationId}-stack-${to}`,
    label,
    dataFlow,
    trustBoundary,
    evidenceLevel: level,
    provenance: demo,
  })),
);

export const implementationCapabilities: IntelligenceTables["implementation_capabilities"][] = implementationStackItems.map((i) => ({
  id: `${i.id}-capability`,
  name: i.role,
  implementationId: i.implementationId,
  capabilityId: i.capabilityId,
  provenance: demo,
}));

const metricValues: Record<string, [string, number | null, number | null][]> = {
  "property-enquiry-automation": [
    ["inbound-enquiries", 1180, 1320],
    ["missed-enquiry-rate", 23, 6],
    ["first-response-time", 47, 4],
    ["manual-handling-hours", 22, 8],
    ["booking-rate", 18, 23],
    ["monthly-software-cost", null, 690],
    ["maintenance-hours", null, 4],
  ],
  "salon-booking-followup": [
    ["inbound-enquiries", 690, 720],
    ["first-response-time", 31, 5],
    ["manual-handling-hours", 14, 7],
    ["booking-rate", 24, 29],
    ["no-show-rate", 14, 10],
    ["monthly-software-cost", null, 410],
  ],
  "agency-lead-routing": [
    ["inbound-enquiries", 450, 460],
    ["first-response-time", 95, 12],
    ["manual-handling-hours", 16, 6],
    ["qualified-lead-rate", 38, 45],
    ["monthly-software-cost", null, 280],
  ],
  "hospitality-reservation-assist": [
    ["inbound-enquiries", 1650, 1800],
    ["missed-enquiry-rate", 21, 9],
    ["first-response-time", 26, 3],
    ["manual-handling-hours", 35, 18],
    ["monthly-software-cost", null, 930],
  ],
  "trades-missed-call-textback": [
    ["inbound-enquiries", 260, 280],
    ["missed-enquiry-rate", 41, 12],
    ["booking-rate", 20, 27],
    ["monthly-software-cost", null, 95],
  ],
};

export const measurementPeriods: IntelligenceTables["measurement_periods"][] = implementationRecords.flatMap((i) => [
  { id: `${i.id}-baseline-period`, name: "Baseline period", implementationId: i.id, kind: "baseline" as const, startDate: i.baselinePeriodStart, endDate: i.baselinePeriodEnd, notes: "Illustrative baseline period before go-live.", provenance: demo },
  { id: `${i.id}-observed-period`, name: "Observed period", implementationId: i.id, kind: "observed" as const, startDate: i.measurementPeriodStart, endDate: i.measurementPeriodEnd, notes: "Illustrative period after go-live. Observed values do not establish causality.", provenance: demo },
]);

export const implementationMetrics: IntelligenceTables["implementation_metrics"][] = Object.entries(metricValues).flatMap(([implementationId, values]) =>
  values.map(([metricDefinitionId, baselineValue, observedValue]) => {
    const definition = metricDefinitions.find((d) => d.id === metricDefinitionId)!;
    const absoluteChange = baselineValue == null || observedValue == null ? null : observedValue - baselineValue;
    const percentageChange = baselineValue == null || observedValue == null || baselineValue === 0 || definition.unit === "%" ? null : ((observedValue - baselineValue) / baselineValue) * 100;
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
      sourceLabel: metricDefinitionId.includes("cost") ? "Illustrative invoice summary" : "Illustrative CRM / phone-system export",
      notes: "Demo value only. It is not a claim about a real customer or a prediction for another business.",
      provenance: demo,
    };
  }),
);

const claimant = (id: string) => rows.find((r) => r.id === id)!;
export const claims: IntelligenceTables["claims"][] = [
  ...rows.flatMap((r) => [
    {
      id: `${r.id}-architecture-claim`,
      name: "Architecture as recorded",
      subjectType: "implementation" as const,
      subjectId: r.id,
      predicate: "architecture-deployed",
      value: `Deployed with ${stacks[r.id].length} components as shown in the architecture map.`,
      claimant: "Illustrative implementer",
      claimantType: "implementer" as const,
      evidenceMethod: "Illustrative deployment documentation",
      status: "accepted" as const,
      evidenceLevel: level,
      reviewedAt: r.reviewedAt,
      public: true,
      provenance: demo,
    },
    {
      id: `${r.id}-dates-claim`,
      name: "Implementation dates",
      subjectType: "implementation" as const,
      subjectId: r.id,
      predicate: "went-live",
      value: `Go-live ${r.dates.live} after ${r.duration}.`,
      claimant: "Illustrative implementer",
      claimantType: "implementer" as const,
      evidenceMethod: "Illustrative project plan",
      status: "accepted" as const,
      evidenceLevel: level,
      reviewedAt: r.reviewedAt,
      public: true,
      provenance: demo,
    },
    ...(r.cost.type === "not-disclosed"
      ? []
      : [{
          id: `${r.id}-cost-claim`,
          name: "Implementation cost",
          subjectType: "implementation" as const,
          subjectId: r.id,
          predicate: "implementation-cost",
          value: r.cost.type === "range" ? `£${r.cost.low!.toLocaleString("en-GB")}–£${r.cost.high!.toLocaleString("en-GB")}` : `£${r.cost.low!.toLocaleString("en-GB")}`,
          unit: "GBP",
          claimant: "Illustrative implementer",
          claimantType: "implementer" as const,
          evidenceMethod: "Illustrative invoice summary",
          limitations: "Excludes internal staff time.",
          status: "accepted" as const,
          evidenceLevel: level,
          reviewedAt: r.reviewedAt,
          public: true,
          provenance: demo,
        }]),
  ]),
  ...implementationMetrics.map((m) => ({
    id: `${m.id}-claim`,
    name: m.name,
    subjectType: "metric" as const,
    subjectId: m.id,
    predicate: "observed-value",
    value: m.observedValue == null ? "Not recorded" : String(m.observedValue),
    unit: m.unit,
    period: `${claimant(m.implementationId).dates.observed[0]} to ${claimant(m.implementationId).dates.observed[1]}`,
    measurementPeriodId: m.measurementPeriodId,
    claimant: "Illustrative implementer",
    claimantType: "implementer" as const,
    evidenceMethod: m.sourceLabel,
    limitations: claimant(m.implementationId).limitations,
    status: "accepted" as const,
    evidenceLevel: level,
    reviewedAt: claimant(m.implementationId).reviewedAt,
    public: true,
    provenance: demo,
  })),
];

export const evidenceArtifacts: IntelligenceTables["evidence_artifacts"][] = rows.flatMap((r) => [
  {
    id: `${r.id}-export-evidence`,
    name: "Illustrative CRM / phone-system export (metadata only)",
    ownerId: "demo-user",
    kind: "analytics-export" as const,
    publicMetadata: "Demo metadata only. No file exists in the static demo and no real customer data was ever collected.",
    storagePath: "",
    mimeType: "text/csv",
    private: true,
    provenance: demo,
  },
  {
    id: `${r.id}-docs-evidence`,
    name: "Illustrative deployment documentation (metadata only)",
    ownerId: "demo-user",
    kind: "deployment-documentation" as const,
    publicMetadata: "Demo metadata only. Describes what a real contributor would upload privately for review.",
    storagePath: "",
    mimeType: "application/pdf",
    private: true,
    provenance: demo,
  },
]);

export const claimEvidence: IntelligenceTables["claim_evidence"][] = claims.map((claim) => {
  const implementationId = claim.subjectType === "implementation" ? claim.subjectId : implementationMetrics.find((m) => m.id === claim.subjectId)!.implementationId;
  return {
    id: `${claim.id}-evidence-link`,
    name: "Demo evidence link",
    claimId: claim.id,
    evidenceArtifactId: `${implementationId}-${claim.subjectType === "metric" ? "export" : "docs"}-evidence`,
    relationship: "supports" as const,
    provenance: demo,
  };
});

export const evidenceReviews: IntelligenceTables["evidence_reviews"][] = [
  {
    id: "property-booking-review",
    name: "Demo reviewer request",
    claimId: "property-enquiry-automation-booking-rate-claim",
    reviewerId: "demo-reviewer",
    result: "needs-more-evidence",
    notes: "Demo review illustrating the workflow: booking definition changed mid-period, so reviewer asks for a consistent definition before any evidence upgrade.",
    reviewedAt: "2026-09-20T10:00:00Z",
    provenance: demo,
  },
];

export const attestations: IntelligenceTables["attestations"][] = [
  {
    id: "demo-attestation",
    name: "Demo customer attestation invitation",
    implementationId: "property-enquiry-automation",
    ownerId: "demo-user",
    tokenHash: hashToken(DEMO_ATTESTATION_TOKEN),
    expiresAt: "2027-09-25T00:00:00Z",
    status: "pending",
    customerIdentityVisibility: "anonymous",
    attestorLabel: "Fictional operations manager",
    claimIds: [
      "property-enquiry-automation-architecture-claim",
      "property-enquiry-automation-dates-claim",
      "property-enquiry-automation-first-response-time-claim",
      "property-enquiry-automation-manual-handling-hours-claim",
    ],
    purpose: "claim-attestation",
    createdAt: "2026-09-21T09:00:00Z",
    provenance: demo,
  },
];

export const verificationEvents: IntelligenceTables["verification_events"][] = rows.map((r) => ({
  id: `${r.id}-verification-event`,
  name: "Record labelled as illustrative demo data",
  subjectType: "implementation",
  subjectId: r.id,
  action: "labelled-demo",
  actorId: "system",
  at: `${r.reviewedAt}T09:00:00Z`,
  nextLevel: "demo" as const,
  provenance: demo,
}));

export const blueprints: IntelligenceTables["blueprints"][] = [
  {
    id: "inquiry-booking-reference",
    slug: "inquiry-booking-reference",
    name: "Service enquiry-to-booking reference Blueprint",
    ownerId: "demo-user",
    description: "Sanitized reference architecture for capturing calls and web enquiries, qualifying them, updating the CRM, booking against availability and routing exceptions to people.",
    derivedFromImplementationId: "property-enquiry-automation",
    buildId: "service-enquiry-booking-system",
    useCaseIds: ["enquiry-to-booking"],
    capabilityIds: ["telephony", "voice", "language", "automation", "crm", "calendar", "human-escalation"],
    currentVersionId: "inquiry-booking-reference-v1-1",
    estimatedComplexity: "medium",
    requiredSkills: ["Workflow configuration", "CRM field mapping", "Telephony setup"],
    license: "Demo reference architecture — no production materials licensed",
    reuseRights: "reference-architecture",
    sourceAvailable: false,
    commercialUseAllowed: false,
    maintainerId: "northstar-studio",
    lastValidatedAt: "2026-09-20",
    compatibilityState: "unknown",
    knownLimitations: "Customer-specific CRM fields, branch rules, emergency escalation rules and compliance controls are intentionally absent.",
    publicationState: "published",
    moderationState: "approved",
    sanitizationConfirmedAt: "2026-09-20",
    sanitizationChecklist: ["credentials", "customer-data", "schemas", "prompts", "business-rules", "endpoints", "documents", "brand"],
    rightsDeclaredAt: "2026-09-20",
    setupNotes: "Map job types to qualification questions first; connect availability last.",
    demo: true,
    provenance: demo,
  },
  {
    id: "lightweight-enquiry-triage",
    slug: "lightweight-enquiry-triage",
    name: "Lightweight lead triage Blueprint",
    ownerId: "demo-user",
    description: "Lower-complexity web-form-to-CRM pattern for small teams that do not need voice automation.",
    derivedFromImplementationId: "agency-lead-routing",
    useCaseIds: ["lead-qualification-routing", "enquiry-to-booking"],
    capabilityIds: ["forms", "language", "automation", "crm", "human-escalation"],
    currentVersionId: "lightweight-enquiry-triage-v1",
    estimatedComplexity: "low",
    requiredSkills: ["Form mapping", "Workflow configuration"],
    license: "Demo commercial license — illustrative terms only",
    reuseRights: "commercial-license",
    sourceAvailable: true,
    commercialUseAllowed: true,
    maintainerId: "maya-rivera",
    lastValidatedAt: "2026-08-30",
    compatibilityState: "unknown",
    knownLimitations: "No telephony or booking; enquiries still need a human reply.",
    publicationState: "published",
    moderationState: "approved",
    sanitizationConfirmedAt: "2026-08-30",
    sanitizationChecklist: ["credentials", "customer-data", "schemas", "prompts", "business-rules", "endpoints", "documents", "brand"],
    rightsDeclaredAt: "2026-08-30",
    demo: true,
    provenance: demo,
  },
  {
    id: "voice-reservation-reference",
    slug: "voice-reservation-reference",
    name: "Voice reservation request Blueprint",
    ownerId: "demo-user",
    description: "Reference pattern for taking reservation requests by phone out of hours, structuring them and keeping staff confirmation for every booking.",
    derivedFromImplementationId: "hospitality-reservation-assist",
    useCaseIds: ["after-hours-reservations"],
    capabilityIds: ["telephony", "voice", "language", "automation", "database", "human-escalation"],
    currentVersionId: "voice-reservation-reference-v1",
    estimatedComplexity: "high",
    requiredSkills: ["Telephony configuration", "Workflow integration", "Security review"],
    license: "Showcase only — no reuse granted",
    reuseRights: "showcase-only",
    sourceAvailable: false,
    commercialUseAllowed: false,
    maintainerId: "alex-chen",
    lastValidatedAt: "2026-03-10",
    compatibilityState: "unknown",
    knownLimitations: "Reservation-system adapters are omitted and must be designed per venue.",
    publicationState: "published",
    moderationState: "approved",
    sanitizationConfirmedAt: "2026-03-10",
    sanitizationChecklist: ["credentials", "customer-data", "schemas", "prompts", "business-rules", "endpoints", "documents", "brand"],
    rightsDeclaredAt: "2026-03-10",
    demo: true,
    provenance: demo,
  },
  {
    id: "missed-call-textback",
    slug: "missed-call-textback",
    name: "Missed-call text-back Blueprint",
    ownerId: "demo-user",
    description: "Minimal pattern: a missed call triggers an SMS with a short qualification form, a CRM record and bookable slots.",
    derivedFromImplementationId: "trades-missed-call-textback",
    buildId: "missed-call-textback-kit",
    useCaseIds: ["enquiry-to-booking"],
    capabilityIds: ["telephony", "automation", "language", "calendar", "human-escalation"],
    currentVersionId: "missed-call-textback-v2",
    estimatedComplexity: "low",
    requiredSkills: ["SMS template setup", "Calendar sharing"],
    license: "Demo open-source style license — illustrative",
    reuseRights: "open-source",
    sourceAvailable: true,
    commercialUseAllowed: true,
    maintainerId: "atlas-automation",
    lastValidatedAt: "2026-07-01",
    compatibilityState: "unknown",
    knownLimitations: "Only handles missed calls; answered calls and web enquiries are out of scope.",
    publicationState: "published",
    moderationState: "approved",
    sanitizationConfirmedAt: "2026-07-01",
    sanitizationChecklist: ["credentials", "customer-data", "schemas", "prompts", "business-rules", "endpoints", "documents", "brand"],
    rightsDeclaredAt: "2026-07-01",
    demo: true,
    provenance: demo,
  },
  {
    id: "salon-followup-draft",
    slug: "salon-followup-draft",
    name: "Salon follow-up Blueprint (draft)",
    ownerId: "demo-user",
    description: "Draft derived from the salon record; awaiting sanitization confirmation and moderation. Not publicly listed.",
    derivedFromImplementationId: "salon-booking-followup",
    useCaseIds: ["enquiry-to-booking"],
    capabilityIds: ["messaging", "language", "automation", "calendar"],
    currentVersionId: "salon-followup-draft-v0",
    estimatedComplexity: "low",
    requiredSkills: ["Workflow configuration"],
    license: "Rights not yet declared",
    reuseRights: "showcase-only",
    sourceAvailable: false,
    commercialUseAllowed: false,
    maintainerId: "maya-rivera",
    lastValidatedAt: "2026-09-01",
    compatibilityState: "unknown",
    knownLimitations: "Draft.",
    publicationState: "draft",
    moderationState: "pending",
    demo: true,
    provenance: demo,
  },
];

export const blueprintVersions: IntelligenceTables["blueprint_versions"][] = ([
  { id: "inquiry-booking-reference-v1", blueprintId: "inquiry-booking-reference", version: "1.0", createdAt: "2026-04-02", changeNotes: "Initial sanitized version: capture, qualification, orchestration and CRM.", lastValidatedAt: "2026-04-02", compatibilityState: "review-due", completeness: 62, setupCostLow: 3000, setupCostHigh: 4500, monthlyCostLow: 450, monthlyCostHigh: 650, maintenanceHoursLow: 3, maintenanceHoursHigh: 5, compatibilityNotes: "Superseded: no booking or human-escalation slot." },
  { id: "inquiry-booking-reference-v1-1", blueprintId: "inquiry-booking-reference", version: "1.1", createdAt: "2026-09-20", changeNotes: "Added calendar availability and a human exception queue; reasoning model became swappable.", lastValidatedAt: "2026-09-20", compatibilityState: "current", completeness: 81, setupCostLow: 3500, setupCostHigh: 5500, monthlyCostLow: 550, monthlyCostHigh: 800, maintenanceHoursLow: 3, maintenanceHoursHigh: 5, compatibilityNotes: "Relationships are illustrative demo records." },
  { id: "lightweight-enquiry-triage-v1", blueprintId: "lightweight-enquiry-triage", version: "1.0", createdAt: "2026-08-30", changeNotes: "Initial version.", lastValidatedAt: "2026-08-30", compatibilityState: "current", completeness: 76, setupCostLow: 1200, setupCostHigh: 2200, monthlyCostLow: 150, monthlyCostHigh: 300, maintenanceHoursLow: 1, maintenanceHoursHigh: 3 },
  { id: "voice-reservation-reference-v1", blueprintId: "voice-reservation-reference", version: "1.0", createdAt: "2026-03-10", changeNotes: "Initial version.", lastValidatedAt: "2026-03-10", compatibilityState: "review-due", completeness: 70, setupCostLow: 4500, setupCostHigh: 6500, monthlyCostLow: 800, monthlyCostHigh: 1100, maintenanceHoursLow: 4, maintenanceHoursHigh: 6 },
  { id: "missed-call-textback-v1", blueprintId: "missed-call-textback", version: "1.0", createdAt: "2025-05-20", changeNotes: "Initial version: SMS reply without CRM.", lastValidatedAt: "2025-05-20", compatibilityState: "stale", completeness: 55, setupCostLow: 500, setupCostHigh: 900, monthlyCostLow: 40, monthlyCostHigh: 100, maintenanceHoursLow: 1, maintenanceHoursHigh: 2 },
  { id: "missed-call-textback-v2", blueprintId: "missed-call-textback", version: "2.0", createdAt: "2026-07-01", changeNotes: "Added CRM record, swappable calendar and an owner-review step.", lastValidatedAt: "2026-07-01", compatibilityState: "current", completeness: 72, setupCostLow: 600, setupCostHigh: 1200, monthlyCostLow: 60, monthlyCostHigh: 150, maintenanceHoursLow: 1, maintenanceHoursHigh: 2 },
  { id: "salon-followup-draft-v0", blueprintId: "salon-followup-draft", version: "0.1", createdAt: "2026-09-01", changeNotes: "Draft.", lastValidatedAt: "2026-09-01", compatibilityState: "unknown", completeness: 30 },
] as Omit<IntelligenceTables["blueprint_versions"], "name" | "provenance">[]).map((version) => ({
  ...version,
  name: `v${version.version}`,
  costCurrency: "GBP",
  costBasis: "Illustrative maintainer estimate",
  provenance: demo,
}));

type SlotRow = [capabilityId: string, productId: string, role: string, alternatives: string[]];
const blueprintSlots: Record<string, SlotRow[]> = {
  "inquiry-booking-reference-v1": [
    ["telephony", "twilio", "Inbound calls", []],
    ["voice", "vapi", "Voice interface", []],
    ["language", "openai-api", "Qualification", []],
    ["automation", "n8n", "Workflow orchestration", []],
    ["crm", "hubspot", "CRM", []],
  ],
  "inquiry-booking-reference-v1-1": [
    ["telephony", "twilio", "Inbound calls", []],
    ["voice", "vapi", "Voice interface", []],
    ["language", "claude", "Qualification", ["openai-api"]],
    ["automation", "n8n", "Workflow orchestration", ["make", "flow-agent"]],
    ["crm", "hubspot", "CRM", ["pipedrive"]],
    ["calendar", "google-calendar", "Availability", ["cal-com"]],
    ["human-escalation", "slack", "Exception queue", []],
  ],
  "lightweight-enquiry-triage-v1": [
    ["forms", "webflow-sites", "Enquiry form", []],
    ["language", "openai-api", "Brief extraction", ["claude"]],
    ["automation", "n8n", "Routing workflow", ["make"]],
    ["crm", "pipedrive", "CRM", ["hubspot"]],
    ["human-escalation", "slack", "Human review", []],
  ],
  "voice-reservation-reference-v1": [
    ["telephony", "twilio", "Inbound calls", []],
    ["voice", "vapi", "Voice intake", []],
    ["language", "claude", "Request structuring", ["openai-api"]],
    ["automation", "n8n", "Request handoff", ["make"]],
    ["database", "supabase", "Request store", []],
    ["human-escalation", "slack", "Staff confirmation", []],
  ],
  "missed-call-textback-v1": [
    ["telephony", "twilio", "Missed-call trigger and SMS", []],
    ["automation", "make", "Workflow", []],
  ],
  "missed-call-textback-v2": [
    ["telephony", "twilio", "Missed-call trigger and SMS", []],
    ["automation", "make", "Workflow", ["n8n"]],
    ["language", "openai-api", "Qualification summary", ["claude"]],
    ["calendar", "google-calendar", "Available slots", ["cal-com"]],
    ["human-escalation", "slack", "Owner review", []],
  ],
  "salon-followup-draft-v0": [
    ["messaging", "twilio", "SMS", []],
    ["automation", "make", "Workflow", []],
  ],
};

export const blueprintStackItems: IntelligenceTables["blueprint_stack_items"][] = Object.entries(blueprintSlots).flatMap(([blueprintVersionId, items]) =>
  items.map(([capabilityId, productId, role, alternativeProductIds], index) => ({
    id: `${blueprintVersionId}-item-${index}`,
    name: role,
    blueprintVersionId,
    capabilityId,
    productId,
    role,
    required: true,
    alternativeProductIds,
    configurationRequirements: "Configure credentials, fields, rate limits, data handling and error paths for the target business. No customer configuration is included.",
    x: 0,
    y: index,
    provenance: demo,
  })),
);

const blueprintEdges: Record<string, [number, number, string, string, boolean][]> = {
  "inquiry-booking-reference-v1": [[0, 1, "Call audio", "Caller audio", true], [1, 2, "Transcript", "Transcript", true], [1, 3, "Structured enquiry", "Enquiry fields", false], [3, 4, "Create contact + deal", "Contact details", true]],
  "inquiry-booking-reference-v1-1": [[0, 1, "Call audio", "Caller audio", true], [1, 2, "Transcript", "Transcript", true], [1, 3, "Structured enquiry", "Enquiry fields", false], [3, 4, "Create contact + deal", "Contact details", true], [3, 5, "Check availability", "Slot request", true], [3, 6, "Exception", "Enquiry summary", true]],
  "lightweight-enquiry-triage-v1": [[0, 2, "Form submission", "Brief", false], [2, 1, "Extract brief", "Brief text", true], [2, 3, "Create deal", "Structured brief", true], [2, 4, "Notify reviewer", "Deal link", true]],
  "voice-reservation-reference-v1": [[0, 1, "Call audio", "Caller audio", true], [1, 2, "Transcript", "Transcript", true], [1, 3, "Structured request", "Request fields", false], [3, 4, "Store", "Request", true], [3, 5, "Staff confirmation", "Summary", true]],
  "missed-call-textback-v1": [[0, 1, "Missed-call webhook", "Caller number", true]],
  "missed-call-textback-v2": [[0, 1, "Missed-call webhook", "Caller number", true], [1, 2, "Summarize answers", "Form answers", true], [1, 3, "Offer slots", "Available slots", true], [1, 4, "Urgent job", "Job summary", true]],
  "salon-followup-draft-v0": [[0, 1, "Inbound SMS", "Message", true]],
};

export const blueprintConnections: IntelligenceTables["blueprint_connections"][] = Object.entries(blueprintEdges).flatMap(([versionId, list]) =>
  list.map(([from, to, label, dataFlow, trustBoundary], index) => ({
    id: `${versionId}-edge-${index}`,
    name: label,
    blueprintVersionId: versionId,
    fromItemId: `${versionId}-item-${from}`,
    toItemId: `${versionId}-item-${to}`,
    label,
    dataFlow,
    trustBoundary,
    provenance: demo,
  })),
);

export const blueprintRequirements: IntelligenceTables["blueprint_requirements"][] = blueprints.flatMap((b) => [
  { id: `${b.id}-req-1`, name: "Business-system access", blueprintId: b.id, type: "system" as const, description: "Authorized access to the target business systems, with a test environment where available.", required: true, provenance: demo },
  { id: `${b.id}-req-2`, name: "Exception ownership", blueprintId: b.id, type: "operational" as const, description: "A named person who owns ambiguous, failed or sensitive cases.", required: true, provenance: demo },
  { id: `${b.id}-req-3`, name: "Data-protection review", blueprintId: b.id, type: "security" as const, description: "Review of what personal data each component receives and where it is stored.", required: true, provenance: demo },
]);

export const blueprintLicenses: IntelligenceTables["blueprint_licenses"][] = blueprints.map((b) => ({
  id: `${b.id}-license`,
  name: b.license,
  blueprintId: b.id,
  rights: b.reuseRights,
  licenseText: "Synthetic demonstration license text. No real rights are granted by this demo record.",
  attributionRequired: true,
  commercialUseAllowed: b.commercialUseAllowed,
  provenance: demo,
}));

type RelRow = [string, string, IntelligenceTables["technology_relationships"]["relationshipType"], string?];
const relationshipRows: RelRow[] = [
  ["twilio", "vapi", "native-integration"],
  ["vapi", "claude", "native-integration"],
  ["vapi", "openai-api", "native-integration"],
  ["vapi", "n8n", "webhook-compatible"],
  ["vapi", "make", "webhook-compatible"],
  ["twilio", "n8n", "connector-available"],
  ["twilio", "make", "connector-available"],
  ["claude", "n8n", "connector-available"],
  ["openai-api", "n8n", "connector-available"],
  ["claude", "make", "connector-available"],
  ["openai-api", "make", "connector-available"],
  ["n8n", "hubspot", "connector-available"],
  ["n8n", "pipedrive", "connector-available"],
  ["n8n", "google-calendar", "connector-available"],
  ["n8n", "cal-com", "connector-available"],
  ["n8n", "slack", "connector-available"],
  ["n8n", "supabase", "connector-available"],
  ["make", "hubspot", "connector-available"],
  ["make", "pipedrive", "connector-available"],
  ["make", "google-calendar", "connector-available"],
  ["make", "cal-com", "connector-available"],
  ["make", "slack", "connector-available"],
  ["webflow-sites", "n8n", "webhook-compatible"],
  ["webflow-sites", "make", "connector-available"],
  ["hubspot", "google-calendar", "native-integration"],
  ["twilio", "hubspot", "observed-together"],
  ["vapi", "cal-com", "observed-together"],
  ["pipedrive", "cal-com", "requires-middleware", "n8n"],
  ["flow-agent", "pipedrive", "incompatible"],
  ["flow-agent", "hubspot", "unknown"],
];

export const technologyRelationships: IntelligenceTables["technology_relationships"][] = relationshipRows.map(([sourceProductId, targetProductId, relationshipType, middlewareProductId]) => ({
  id: `rel-${sourceProductId}-${targetProductId}`,
  name: `${sourceProductId} ↔ ${targetProductId}`,
  sourceProductId,
  targetProductId,
  relationshipType,
  middlewareProductId,
  sourceLabel:
    relationshipType === "observed-together"
      ? "Co-occurrence in illustrative Oracnet records. This is NOT a compatibility claim."
      : "Illustrative demo relationship — confirm in provider documentation before relying on it.",
  sourceType: "demo",
  conditions: relationshipType === "requires-middleware" ? ["Needs an orchestration layer between the two products."] : relationshipType === "incompatible" ? [] : ["Account-level configuration and credentials required."],
  lastCheckedAt: relationshipType === "incompatible" ? "2026-09-01" : "2026-09-20",
  evidenceLevel: level,
  notes:
    relationshipType === "incompatible"
      ? "Illustrative incompatibility between a fictional sample product and a CRM, used to demonstrate exclusion."
      : "Validate authentication, limits and data handling with both providers before production use.",
  provenance: demo,
}));

export const compatibilityChecks: IntelligenceTables["compatibility_checks"][] = technologyRelationships.map((r) => ({
  id: `${r.id}-check`,
  name: "Demo compatibility check",
  relationshipId: r.id,
  checkedAt: r.lastCheckedAt,
  result: r.relationshipType === "incompatible" ? "failed" : r.relationshipType === "observed-together" || r.relationshipType === "unknown" ? "unknown" : "conditional",
  conditions: r.conditions ?? [],
  evidenceLevel: level,
  provenance: demo,
}));

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
  evidence_reviews: evidenceReviews,
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
  staleness_reviews: [],
  implementation_fingerprints: [],
};
