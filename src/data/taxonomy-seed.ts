import type { UseCase } from "./model";
import type { UseCaseAlias, UseCaseCategory, UseCaseRedirect, UseCaseSource } from "./marketplace-model";
import { normalizeLabel } from "./use-case-text.ts";

/**
 * Oracnet's work taxonomy: Category → Subcategory → Use Case.
 * Editorial structure, not demo data about customers.
 */
const tree: [id: string, name: string, description: string, children: [id: string, name: string, description: string][]][] = [
  ["customer-service", "Customer Service", "Answering, routing and resolving customer contact.", [
    ["cs-inbound-enquiries", "Inbound Enquiries", "Capturing and responding to new enquiries."],
    ["cs-bookings", "Bookings & Reservations", "Turning requests into booked time."],
    ["cs-support", "Support & Helpdesk", "Answering existing customers’ questions."],
    ["cs-voice", "Voice & Contact Centre", "Handling phone calls and voice channels."],
  ]],
  ["sales", "Sales", "Finding, qualifying and converting demand.", [
    ["sales-lead-management", "Lead Management", "Qualifying, routing and following up leads."],
  ]],
  ["finance", "Finance", "Money in, money out and financial records.", [
    ["fin-ar", "Accounts Receivable", "Invoicing customers and collecting payment."],
    ["fin-ap", "Accounts Payable", "Receiving, checking and paying supplier invoices."],
  ]],
  ["software-development", "Software Development", "Building, changing and maintaining software.", [
    ["sd-coding", "Coding & Change Management", "Planning and making code changes."],
    ["sd-debugging", "Debugging & Reliability", "Finding and fixing faults."],
    ["sd-documentation", "Documentation", "Explaining systems to the people who run them."],
  ]],
  ["marketing", "Marketing", "Creating and distributing content and campaigns.", [
    ["mk-content", "Content Creation", "Writing long-form and editorial content."],
    ["mk-campaigns", "Campaigns", "Copy and assets for campaigns and channels."],
    ["mk-visual", "Visual Content", "Images, video and visual concepts."],
    ["mk-localization", "Localization", "Adapting content for other languages and markets."],
  ]],
  ["operations", "Operations", "Running the business day to day.", [
    ["ops-documents", "Document Processing", "Turning documents into structured data."],
    ["ops-internal-tools", "Internal Assistants & Automation", "Tools and assistants for the team itself."],
    ["ops-quality", "Quality & Inspection", "Checking products and processes."],
    ["ops-warehouse", "Warehouse & Logistics", "Moving and storing goods."],
    ["ops-facilities", "Facilities & Assets", "Monitoring buildings and physical assets."],
  ]],
  ["commerce", "Commerce", "Selling online.", [
    ["com-online-store", "Online Store", "Running and growing an online shop."],
  ]],
  ["data-analytics", "Data & Analytics", "Turning data into decisions.", [
    ["an-reporting", "Reporting & Insights", "Reports, dashboards and analysis."],
  ]],
];

export const useCaseCategories: UseCaseCategory[] = tree.flatMap(([id, name, description, children], index) => [
  { id, slug: id, name, description, level: "category" as const, sortOrder: index, provenance: "inferred" as const },
  ...children.map(([childId, childName, childDescription], childIndex) => ({
    id: childId,
    slug: childId,
    name: childName,
    description: childDescription,
    level: "subcategory" as const,
    parentId: id,
    sortOrder: childIndex,
    provenance: "inferred" as const,
  })),
]);

/**
 * Existing editorial Use Cases: category placement and, where the old title named a
 * broad area rather than a piece of work, a clearer title. Old titles stay searchable
 * as alternate labels.
 */
export const editorialUseCaseUpdates: Record<string, { categoryId: string; subcategoryId: string; name?: string; description?: string }> = {
  "enquiry-to-booking": { categoryId: "customer-service", subcategoryId: "cs-inbound-enquiries" },
  "lead-qualification-routing": { categoryId: "sales", subcategoryId: "sales-lead-management" },
  "after-hours-reservations": { categoryId: "customer-service", subcategoryId: "cs-bookings" },
  "product-video-website": { categoryId: "marketing", subcategoryId: "mk-visual" },
  "quality-inspection": { categoryId: "operations", subcategoryId: "ops-quality", name: "Detect production-line defects with computer vision" },
  "customer-support": { categoryId: "customer-service", subcategoryId: "cs-support", name: "Answer customer support questions with AI assistance" },
  "ecommerce-store": { categoryId: "commerce", subcategoryId: "com-online-store", name: "Run an online store with connected AI tools" },
  "warehouse-automation": { categoryId: "operations", subcategoryId: "ops-warehouse", name: "Coordinate warehouse operations with robotics" },
  "business-analytics": { categoryId: "data-analytics", subcategoryId: "an-reporting", name: "Turn business data into reports and insights" },
  "drone-inspection": { categoryId: "operations", subcategoryId: "ops-facilities", name: "Inspect remote assets with drone imagery" },
  "connected-facility": { categoryId: "operations", subcategoryId: "ops-facilities", name: "Monitor building conditions with sensors" },
};

/** Editorial Use Cases with no supply yet (they show the aliases and supply-gap views working). */
export const editorialUseCases: UseCase[] = [
  ["chase-overdue-invoices", "Chase overdue invoices", "Send reminders for unpaid invoices and escalate the ones that stay overdue.", "fin-ar"],
  ["review-supplier-invoices", "Review supplier invoices before approval", "Check incoming supplier invoices against orders and route exceptions for approval.", "fin-ap"],
].map(([id, name, description, subcategoryId]) => ({
  id,
  slug: id,
  name,
  description,
  outcome: name,
  category: "automation",
  icon: "FileText",
  color: "sand",
  stackId: "",
  categoryId: "finance",
  subcategoryId,
  status: "approved" as const,
  originType: "oracnet-editorial" as const,
  originEntityId: "oracnet-editorial",
  createdBy: "oracnet-editorial",
  createdAt: "2026-09-26T09:00:00Z",
  updatedAt: "2026-09-26T09:00:00Z",
  provenance: "inferred" as const,
}));

const alias = (useCaseId: string, label: string, aliasType: UseCaseAlias["aliasType"], source = "Oracnet editorial"): UseCaseAlias => ({
  id: `alias-${useCaseId}-${normalizeLabel(label).replace(/ /g, "-")}`,
  name: label,
  useCaseId,
  label,
  aliasType,
  normalizedLabel: normalizeLabel(label),
  language: "en",
  source,
  provenance: "inferred",
});

export const editorialAliases: UseCaseAlias[] = [
  alias("chase-overdue-invoices", "Automate overdue invoice follow-up", "alternate"),
  alias("chase-overdue-invoices", "Invoice payment reminders", "alternate"),
  alias("chase-overdue-invoices", "invoice chasing", "hidden-search"),
  alias("chase-overdue-invoices", "overdue invoice followup", "hidden-search"),
  alias("chase-overdue-invoices", "dunning", "hidden-search"),
  alias("review-supplier-invoices", "Invoice approval workflow", "alternate"),
  alias("review-supplier-invoices", "accounts payable automation", "hidden-search"),
  alias("enquiry-to-booking", "Missed call follow-up", "alternate"),
  alias("enquiry-to-booking", "enquiry handling", "hidden-search"),
  alias("enquiry-to-booking", "inquiry to appointment", "hidden-search"),
  alias("lead-qualification-routing", "Lead triage", "alternate"),
  alias("lead-qualification-routing", "lead scoring", "hidden-search"),
  alias("after-hours-reservations", "Out-of-hours bookings", "alternate"),
  alias("plan-and-implement-code-changes", "AI coding agent", "hidden-search"),
  alias("plan-and-implement-code-changes", "code change automation", "hidden-search"),
  alias("trace-errors-to-their-root-cause", "root cause analysis", "hidden-search"),
  alias("document-data-extraction", "invoice parsing", "hidden-search"),
  alias("document-data-extraction", "OCR data extraction", "hidden-search"),
  ...Object.entries({
    "quality-inspection": "Quality inspection in manufacturing",
    "customer-support": "AI customer support",
    "ecommerce-store": "AI-powered ecommerce store",
    "warehouse-automation": "Warehouse automation",
    "business-analytics": "Business analytics with AI",
    "drone-inspection": "Remote asset inspection",
    "connected-facility": "Connected facility monitoring",
  }).map(([useCaseId, label]) => alias(useCaseId, label, "alternate", "Earlier Oracnet title")),
];

/** Editorial Use Cases are attributed to Oracnet's editors. */
export function editorialSource(useCase: Pick<UseCase, "id" | "name" | "description">): UseCaseSource {
  return {
    id: `editorial-source-${useCase.id}`,
    name: `Oracnet editorial: ${useCase.name}`,
    useCaseId: useCase.id,
    sourceType: "oracnet-editorial",
    sourceEntityId: "oracnet-editorial",
    originalTitle: useCase.name,
    originalDescription: useCase.description,
    productIds: [],
    attribution: "Oracnet editorial taxonomy",
    status: "active",
    provenance: "inferred",
  };
}

export const legacyRedirects: UseCaseRedirect[] = [];
