import type { Build, BuildOffer, CreatorProfile } from "./build-model";
import type { SolutionProviderType } from "./marketplace-model";

/**
 * ILLUSTRATIVE DEMO DATA for the Build-first marketplace: Solution Provider types,
 * Use Case assignments for the demo Builds (primary first, at most three), and two
 * Builds that complete the Build → Blueprint → Implementation chain for the existing
 * illustrative records. Nothing here describes a real company or customer.
 */

export const creatorProviderTypes: Record<string, { providerType: SolutionProviderType; integratorId?: string }> = {
  "alex-chen": { providerType: "Independent Builder" },
  "northstar-studio": { providerType: "Studio", integratorId: "partner-0" },
  "maya-rivera": { providerType: "Freelancer" },
};

export const integratorProviderTypes: Record<string, SolutionProviderType> = {
  "partner-0": "Studio",
  "partner-1": "Systems Integrator",
  "partner-2": "Agency",
  "partner-3": "Agency",
  "partner-4": "Consultancy",
};

/** Primary Use Case first. Every list has one to three entries. */
export const buildUseCaseAssignments: Record<string, string[]> = {
  "ai-dental-receptionist": ["enquiry-to-booking", "handle-customer-inquiries-with-voice-agents"],
  "product-video-engine": ["product-video-website", "generate-video-clips-with-audio"],
  "support-resolution-desk": ["customer-support"],
  "research-workbench": ["business-analytics"],
  "invoice-review-flow": ["review-supplier-invoices", "document-data-extraction"],
  "commerce-content-studio": ["ecommerce-store", "write-campaign-copy-in-brand-voice"],
};

export const marketplaceCreators: CreatorProfile[] = [
  {
    id: "atlas-automation",
    slug: "atlas-automation",
    ownerId: "demo-atlas",
    name: "Atlas Automation",
    headline: "Small automations that answer the phone for you.",
    bio: "Fictional demo agency. Its Builds and linked records are illustrative examples, not real client work.",
    location: "Global",
    website: "",
    github: "",
    expertise: ["Telephony automation", "Lead routing"],
    technologyIds: ["twilio", "make", "openai-api", "google-calendar"],
    useCaseIds: ["enquiry-to-booking", "lead-qualification-routing"],
    available: true,
    kind: "company",
    verification: "unverified",
    color: "blue",
    providerType: "Agency",
    integratorId: "partner-2",
    provenance: "demo",
  },
];

const base = {
  visibility: "public" as const,
  publication: "published" as const,
  moderation: "approved" as const,
  verification: "unverified" as const,
  category: "automation",
  demoUrl: "",
  githubUrl: "",
  sourceAvailable: false,
  commercialUseAllowed: false,
  currency: "GBP",
  buildTime: "",
  buildCost: "",
  featured: true,
  ownershipConfirmed: true,
  provenance: "demo" as const,
};

const node = (buildId: string, index: number, productId: string, capabilityId: string, role: string) => ({
  id: `${buildId}-node-${index}`,
  productId,
  capabilityId,
  role,
  notes: "Illustrative component choice. Confirm availability, data handling and compatibility with the vendor.",
  alternativeIds: [] as string[],
  evidence: "demo" as const,
  x: (index % 3) * 300,
  y: Math.floor(index / 3) * 170,
});

export const marketplaceBuilds: Build[] = [
  {
    ...base,
    id: "service-enquiry-booking-system",
    slug: "service-enquiry-booking-system",
    name: "Service enquiry-to-booking system",
    tagline: "Capture every call and web enquiry, qualify it and book the visit — with people handling exceptions.",
    description:
      "Northstar’s illustrative solution for multi-site service businesses: calls and web forms are captured, qualified with a short set of questions, written to the CRM and booked against branch availability. Exceptions go to a staffed queue. The reusable Blueprint explains the architecture; one illustrative deployment is linked as a record.",
    problem: "Enquiries arrive across phone and web, go unanswered at peak times and are re-keyed by hand before anyone books the visit.",
    intendedUsers: "Operations teams at service businesses with several branches.",
    notes: "Design choices are explained in the Blueprint; customer-specific rules are deliberately left out.",
    ownerId: "demo-studio",
    creatorId: "northstar-studio",
    organizationId: "northstar",
    industry: "Service businesses",
    useCaseIds: ["enquiry-to-booking", "lead-qualification-routing"],
    capabilityIds: ["telephony", "voice", "language", "automation", "crm", "calendar", "human-escalation"],
    stack: [
      node("service-enquiry-booking-system", 0, "twilio", "telephony", "Inbound calls and SMS"),
      node("service-enquiry-booking-system", 1, "vapi", "voice", "Voice front door"),
      node("service-enquiry-booking-system", 2, "claude", "language", "Qualification questions"),
      node("service-enquiry-booking-system", 3, "n8n", "automation", "Orchestration"),
      node("service-enquiry-booking-system", 4, "hubspot", "crm", "CRM record"),
      node("service-enquiry-booking-system", 5, "google-calendar", "calendar", "Branch availability"),
      node("service-enquiry-booking-system", 6, "slack", "human-escalation", "Exception queue"),
    ],
    connections: [
      ["0", "1", "Call audio"],
      ["1", "2", "Transcript"],
      ["2", "3", "Structured enquiry"],
      ["3", "4", "Create contact + deal"],
      ["3", "5", "Check availability"],
      ["3", "6", "Exception"],
    ].map(([from, to, label], index) => ({
      id: `service-enquiry-booking-system-edge-${index}`,
      fromId: `service-enquiry-booking-system-node-${from}`,
      toId: `service-enquiry-booking-system-node-${to}`,
      label,
    })),
    media: [{ id: "service-enquiry-booking-system-cover", type: "image", url: "media/build-voice.svg", alt: "Original illustrative workflow preview — demo" }],
    sources: [],
    cloneAllowed: false,
    license: "Showcase of an illustrative solution. Reuse of the architecture is governed by the linked Blueprint’s rights.",
    attribution: "Illustrative Build by Northstar Studio (fictional demo provider).",
    difficulty: "Intermediate",
    requirements: "Telephony number, CRM access, shared branch calendars and a staffed exception queue.",
    setupNotes: "1. Map enquiry types and exception rules.\n2. Connect telephony and forms.\n3. Configure qualification questions.\n4. Connect CRM and calendars.\n5. Pilot on one branch before rolling out.",
    limitations: "Emergency handling, compliance controls and branch-specific rules must be designed per customer.",
    createdAt: "2026-09-18T10:00:00Z",
    updatedAt: "2026-09-24T10:00:00Z",
    blueprintId: "inquiry-booking-reference",
  },
  {
    ...base,
    id: "missed-call-textback-kit",
    slug: "missed-call-textback-kit",
    name: "Missed-call text-back kit",
    tagline: "Reply to every missed call by text with a short form and bookable slots.",
    description:
      "Atlas Automation’s illustrative kit for single-site trades businesses: a missed call triggers an SMS with a qualification form, creates a record and offers bookable slots. The open Blueprint documents the pattern; one illustrative deployment is linked.",
    problem: "Small trades businesses miss calls while on jobs and lose the enquiry.",
    intendedUsers: "Owner-operated trades and home-service businesses.",
    notes: "Deliberately minimal: answered calls and web enquiries are out of scope.",
    ownerId: "demo-atlas",
    creatorId: "atlas-automation",
    industry: "Trades",
    useCaseIds: ["enquiry-to-booking"],
    capabilityIds: ["telephony", "automation", "language", "calendar"],
    stack: [
      node("missed-call-textback-kit", 0, "twilio", "telephony", "Missed-call trigger and SMS"),
      node("missed-call-textback-kit", 1, "make", "automation", "Orchestration"),
      node("missed-call-textback-kit", 2, "openai-api", "language", "Form summary"),
      node("missed-call-textback-kit", 3, "google-calendar", "calendar", "Bookable slots"),
    ],
    connections: [
      ["0", "1", "Missed call"],
      ["1", "2", "Form answers"],
      ["1", "3", "Offer slots"],
    ].map(([from, to, label], index) => ({
      id: `missed-call-textback-kit-edge-${index}`,
      fromId: `missed-call-textback-kit-node-${from}`,
      toId: `missed-call-textback-kit-node-${to}`,
      label,
    })),
    media: [{ id: "missed-call-textback-kit-cover", type: "image", url: "media/build-support.svg", alt: "Original illustrative workflow preview — demo" }],
    sources: [],
    cloneAllowed: false,
    license: "Showcase of an illustrative solution. The linked Blueprint is published under its own open-source style terms.",
    attribution: "Illustrative Build by Atlas Automation (fictional demo provider).",
    difficulty: "Beginner",
    requirements: "A number that supports SMS forwarding and a shared calendar.",
    setupNotes: "1. Forward missed calls.\n2. Write the SMS and form.\n3. Share bookable slots.\n4. Test with colleagues before going live.",
    limitations: "Only missed calls; no voice answering.",
    createdAt: "2026-09-12T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    blueprintId: "missed-call-textback",
  },
];

export const marketplaceOffers: BuildOffer[] = [
  {
    id: "service-enquiry-booking-system-deploy",
    buildId: "service-enquiry-booking-system",
    ownerId: "demo-studio",
    name: "Adapt and deploy this system",
    description: "Scope your enquiry types and branches, adapt the Blueprint and deploy it with your team. Pricing is agreed after scoping.",
    offerType: "Full implementation",
    pricingModel: "request quote",
    price: null,
    currency: "GBP",
    deliveryTime: "Agreed after scoping",
    checkoutMode: "contact",
    externalUrl: "",
    active: true,
    moderation: "approved",
    provenance: "demo",
  },
  {
    id: "missed-call-textback-kit-setup",
    buildId: "missed-call-textback-kit",
    ownerId: "demo-atlas",
    name: "Set it up for your number",
    description: "Configure the kit for your phone number, calendar and questions, then hand it over with a short guide.",
    offerType: "Setup service",
    pricingModel: "request quote",
    price: null,
    currency: "GBP",
    deliveryTime: "Agreed after scoping",
    checkoutMode: "contact",
    externalUrl: "",
    active: true,
    moderation: "approved",
    provenance: "demo",
  },
];
