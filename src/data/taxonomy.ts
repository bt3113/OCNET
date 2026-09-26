/**
 * Small, explicit taxonomies used to normalize free-text context so records can be
 * compared deterministically. Unknown values stay unknown; nothing is guessed.
 */

export interface TaxonomyNode {
  code: string;
  label: string;
  parent?: string;
  /** Lower-case phrases that map free text to this node. */
  synonyms: string[];
}

export const businessTaxonomy: TaxonomyNode[] = [
  { code: "services", label: "Service business", synonyms: ["service business", "services"] },
  { code: "services.home-property", label: "Home & property services", parent: "services", synonyms: ["home services", "property services"] },
  { code: "services.home-property.maintenance", label: "Property maintenance services", parent: "services.home-property", synonyms: ["property maintenance", "maintenance company", "facilities maintenance", "repairs", "handyman"] },
  { code: "services.home-property.trades", label: "Trades (plumbing, electrical, HVAC)", parent: "services.home-property", synonyms: ["plumbing", "plumber", "electrician", "electrical", "hvac", "heating", "roofing"] },
  { code: "services.home-property.cleaning", label: "Cleaning services", parent: "services.home-property", synonyms: ["cleaning", "cleaners", "janitorial"] },
  { code: "services.personal", label: "Personal services", parent: "services", synonyms: ["personal services"] },
  { code: "services.personal.salon", label: "Salon and beauty services", parent: "services.personal", synonyms: ["salon", "beauty", "hair", "barber", "nail", "spa"] },
  { code: "services.personal.fitness", label: "Fitness studio", parent: "services.personal", synonyms: ["fitness", "gym", "yoga", "pilates", "personal trainer"] },
  { code: "services.professional", label: "Professional services", parent: "services", synonyms: ["professional services", "consultancy", "accountant", "accounting", "law firm", "legal services"] },
  { code: "services.professional.agency", label: "Creative agency", parent: "services.professional", synonyms: ["agency", "creative agency", "design studio", "marketing agency", "studio"] },
  { code: "hospitality", label: "Hospitality", synonyms: ["hospitality"] },
  { code: "hospitality.food", label: "Restaurants & food service", parent: "hospitality", synonyms: ["restaurant", "cafe", "bar", "pub", "food service"] },
  { code: "hospitality.group", label: "Hospitality group", parent: "hospitality", synonyms: ["hospitality group", "hotel", "venue"] },
];

export const regionTaxonomy: Record<string, { macro: string; regime: string }> = {
  "United Kingdom": { macro: "Europe", regime: "UK GDPR" },
  Ireland: { macro: "Europe", regime: "EU GDPR" },
  Europe: { macro: "Europe", regime: "EU GDPR" },
  Germany: { macro: "Europe", regime: "EU GDPR" },
  France: { macro: "Europe", regime: "EU GDPR" },
  "North America": { macro: "North America", regime: "US/Canadian state and federal" },
  "United States": { macro: "North America", regime: "US state and federal" },
  Canada: { macro: "North America", regime: "PIPEDA" },
  Global: { macro: "Global", regime: "Multiple" },
};

export const sizeBands = [
  "1–10 employees",
  "11–50 employees",
  "51–200 employees",
  "201+ employees",
] as const;

export const capabilityLabels: Record<string, string> = {
  "inbound-channel": "Inbound channel",
  telephony: "Telephony / messaging",
  voice: "Voice interface",
  language: "Reasoning / language model",
  qualification: "Qualification",
  crm: "CRM",
  calendar: "Calendar / booking",
  automation: "Workflow orchestration",
  "follow-up": "Follow-up",
  "human-escalation": "Human escalation",
  analytics: "Analytics",
  database: "Structured data store",
  hosting: "Hosting",
  forms: "Web forms",
  messaging: "Messaging",
  assistant: "AI assistant",
  "coding-agent": "Coding agent",
  "content-generation": "Content generation",
  "document-extraction": "Document extraction",
  translation: "Translation",
  "image-generation": "Image generation",
  video: "Video generation",
  website: "Website",
};

export function capabilityLabel(id: string) {
  return capabilityLabels[id] ?? id.replaceAll("-", " ");
}

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

/** Resolve free text to the most specific taxonomy node whose synonym it contains. */
export function resolveBusinessType(text: string): TaxonomyNode | undefined {
  const value = normalize(text);
  if (!value) return undefined;
  const exact = businessTaxonomy.find((node) => normalize(node.label) === value);
  if (exact) return exact;
  const depth = (node: TaxonomyNode) => node.code.split(".").length;
  return [...businessTaxonomy]
    .sort((a, b) => depth(b) - depth(a) || a.code.localeCompare(b.code))
    .find((node) => node.synonyms.some((synonym) => new RegExp(`\\b${synonym}`).test(value)));
}

/** Depth of the deepest shared ancestor divided by the deeper node's depth (0..1). */
export function taxonomyAffinity(a?: TaxonomyNode, b?: TaxonomyNode) {
  if (!a || !b) return null;
  const left = a.code.split(".");
  const right = b.code.split(".");
  let shared = 0;
  while (shared < Math.min(left.length, right.length) && left[shared] === right[shared]) shared += 1;
  return shared / Math.max(left.length, right.length);
}

/** Parse "11–50 employees" / "201+ employees" into a numeric range. */
export function parseSizeBand(band: string): [number, number] | null {
  const match = band.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (match) return [Number(match[1]), Number(match[2])];
  const open = band.match(/(\d+)\s*\+/);
  if (open) return [Number(open[1]), Number.POSITIVE_INFINITY];
  return null;
}

/** Overlap of two numeric ranges relative to the narrower range (0..1). */
export function rangeOverlap(a: [number, number], b: [number, number]) {
  const low = Math.max(a[0], b[0]);
  const high = Math.min(a[1], b[1]);
  if (high < low) return 0;
  const width = (range: [number, number]) =>
    Number.isFinite(range[1]) ? range[1] - range[0] : Math.max(range[0], 1);
  const narrow = Math.min(width(a), width(b));
  if (narrow <= 0) return 1;
  return Math.min(1, (Number.isFinite(high) ? high - low : narrow) / narrow);
}

/** Ratio similarity for positive magnitudes on a log scale (1 = identical, 0 = 10x apart). */
export function magnitudeSimilarity(a: number, b: number) {
  if (a <= 0 || b <= 0) return a === b ? 1 : 0;
  return Math.max(0, 1 - Math.abs(Math.log10(a) - Math.log10(b)));
}

export function jaccard<T>(a: Iterable<T>, b: Iterable<T>) {
  const left = new Set(a);
  const right = new Set(b);
  if (!left.size && !right.size) return null;
  let shared = 0;
  for (const value of left) if (right.has(value)) shared += 1;
  return shared / (left.size + right.size - shared);
}

export function normalizeSystemName(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "");
}

export function regionInfo(region: string) {
  return regionTaxonomy[region];
}
