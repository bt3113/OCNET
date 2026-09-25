/**
 * Category templates keep the schema horizontal: each launch category declares the
 * capability slots it needs, the metric definitions it records and the context
 * extensions that are meaningful for it. The initial wedge is service-business
 * enquiry → qualification → booking → follow-up.
 */
export interface CategoryTemplate {
  id: string;
  name: string;
  useCaseIds: string[];
  requiredCapabilities: string[];
  /** Alternative capabilities that satisfy a required one (e.g. voice OR telephony). */
  capabilityEquivalents: Record<string, string[]>;
  optionalCapabilities: string[];
  metricDefinitionIds: string[];
  contextExtensions: { key: string; label: string; type: "number" | "text" | "boolean" }[];
}

export const categoryTemplates: CategoryTemplate[] = [
  {
    id: "service-enquiry-booking",
    name: "Service-business enquiry → qualification → booking",
    useCaseIds: ["enquiry-to-booking", "lead-qualification-routing", "after-hours-reservations"],
    requiredCapabilities: ["inbound-channel", "language", "automation"],
    capabilityEquivalents: {
      "inbound-channel": ["inbound-channel", "telephony", "forms", "messaging", "voice"],
      language: ["language", "qualification"],
    },
    optionalCapabilities: ["crm", "calendar", "follow-up", "human-escalation", "analytics", "database"],
    metricDefinitionIds: [
      "inbound-enquiries",
      "missed-enquiry-rate",
      "first-response-time",
      "manual-handling-hours",
      "qualified-lead-rate",
      "booking-rate",
      "no-show-rate",
      "implementation-cost",
      "monthly-software-cost",
      "maintenance-hours",
    ],
    contextExtensions: [
      { key: "afterHoursShare", label: "Share of enquiries outside business hours (%)", type: "number" },
      { key: "bookingSystem", label: "Booking/scheduling system", type: "text" },
      { key: "serviceArea", label: "Service area", type: "text" },
    ],
  },
];

export function templateForUseCase(useCaseId?: string) {
  return categoryTemplates.find((template) => useCaseId && template.useCaseIds.includes(useCaseId));
}

/** Capabilities a candidate must provide for a requirement, with equivalents. */
export function requiredCapabilitySlots(useCaseId: string | undefined, extra: string[] = []) {
  const template = templateForUseCase(useCaseId);
  const base = template?.requiredCapabilities ?? [];
  return [...new Set([...base, ...extra])].map((capability) => ({
    capability,
    satisfiedBy: template?.capabilityEquivalents[capability] ?? [capability],
  }));
}
