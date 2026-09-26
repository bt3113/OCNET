import type { Product, Provider, SolutionStack, UseCase } from "./model";
import type { UseCaseAlias, UseCaseRedirect, UseCaseSource } from "./marketplace-model";
import { normalizeLabel } from "./use-case-text.ts";

/**
 * xAI / Grok: a Technology Vendor, its products and its vendor-stated Use Cases.
 *
 * A vendor saying "Grok can be used for X" is recorded as a Use Case with a
 * UseCaseSource — never as a Build. Builds are complete solutions published by
 * Solution Providers; none exists here.
 *
 * SOURCED, NOT DEMO: product descriptions and use-case statements are summarised from
 * xAI's public pages (principally https://x.ai/grok/use-cases, plus the API docs
 * linked below), read on SOURCED_AT. The profile is UNCLAIMED — xAI has not
 * reviewed or approved it. Nothing here is an Oracnet test result, a customer
 * deployment or an outcome claim, and no pricing, regions or compatibility are
 * asserted beyond what the sources state.
 */
export const XAI_PROVIDER_ID = "xai";
export const XAI_USE_CASES_URL = "https://x.ai/grok/use-cases";
const SOURCED_AT = "2026-09-26";
const sourced = "third-party sourced" as const;
const attributeSource = `Summarised from xAI's public pages on ${SOURCED_AT}; not confirmed by xAI.`;

export const xaiProvider: Provider = {
  id: XAI_PROVIDER_ID,
  slug: XAI_PROVIDER_ID,
  name: "xAI",
  description: "Company behind Grok — assistant, API, voice, image/video generation and coding agent",
  category: "ai-software",
  color: "dark",
  initials: "x",
  website: "https://x.ai",
  region: "Global",
  specialties: ["Language models", "Voice agents", "Image & video generation", "Coding agents"],
  provenance: sourced,
  listing: {
    status: "unclaimed",
    compiledBy: "Oracnet catalogue",
    sourcedAt: SOURCED_AT,
    tagline: "AI solutions for every workflow",
    about:
      "xAI builds the Grok family of models and products. Its public use-case page describes the work Grok can be used for; Oracnet records each statement as a vendor-stated Use Case and links back to the page.",
    note: "xAI's website currently brands its pages as “SpaceXAI”.",
    sources: [
      { label: "Grok use cases", url: XAI_USE_CASES_URL },
      { label: "Grok API overview", url: "https://docs.x.ai/overview" },
      { label: "Voice API guide", url: "https://docs.x.ai/docs/guides/voice" },
      { label: "Imagine API", url: "https://x.ai/api/imagine" },
    ],
  },
};

const productRows: [
  id: string,
  name: string,
  description: string,
  capabilityIds: string[],
  operatorSkill: Product["operatorSkill"],
  sourceUrl: string,
][] = [
  ["grok", "Grok", "Assistant app for chat, voice and image generation", ["assistant", "language"], "no-code", "https://x.ai/grok"],
  ["grok-api", "Grok API", "Text, code, voice, image and video models through one API", ["language", "document-extraction", "translation", "content-generation"], "developer", "https://docs.x.ai/overview"],
  ["grok-voice", "Grok Voice Agent API", "Realtime speech-to-speech voice agents with tool use; text-to-speech and speech-to-text", ["voice"], "developer", "https://docs.x.ai/docs/guides/voice"],
  ["grok-imagine", "Grok Imagine API", "Image and video generation from text or image references", ["image-generation", "video"], "developer", "https://x.ai/api/imagine"],
  ["grok-build", "Grok Build", "Agentic coding on the API and CLI: plan, refactor, debug and build", ["coding-agent"], "developer", XAI_USE_CASES_URL],
];

export const xaiProducts: Product[] = productRows.map(([id, name, description, capabilityIds, operatorSkill, sourceUrl]) => ({
  id,
  slug: id,
  name,
  description,
  providerId: XAI_PROVIDER_ID,
  category: "ai-software",
  capabilityIds,
  deployment: "Cloud",
  pricing: "See provider pricing",
  integrations: [],
  initials: { grok: "G", "grok-api": "GA", "grok-voice": "GV", "grok-imagine": "GI", "grok-build": "GB" }[id] ?? "G",
  color: "dark",
  deploymentOptions: ["cloud"],
  operatorSkill,
  attributeSource,
  sourceUrl,
  provenance: sourced,
}));

type VendorStatement = {
  id: string;
  title: string;
  definition: string;
  categoryId: string;
  subcategoryId: string;
  /** xAI's wording as captured. */
  statement: string;
  productIds: string[];
  /** Earlier Oracnet listing name (kept as an alternate search label). */
  formerLabel: string;
  legacyBuildSlug: string;
  docUrl?: string;
};

/**
 * Captured from search-index copies of x.ai/grok/use-cases (the page itself was not
 * reachable from the build environment). Titles are Oracnet's normalised labels; the
 * `statement` is xAI's wording as captured and must be checked against the live page.
 */
const statements: VendorStatement[] = [
  { id: "handle-customer-inquiries-with-voice-agents", title: "Handle customer inquiries with voice agents", definition: "Answer and route inbound customer calls with a voice agent, with people handling exceptions.", categoryId: "customer-service", subcategoryId: "cs-voice", statement: "Deploy voice AI to handle customer inquiries, route calls, and reduce wait times.", productIds: ["grok-voice"], formerLabel: "Voice agents for customer support", legacyBuildSlug: "xai-voice-customer-support", docUrl: "https://docs.x.ai/docs/guides/voice" },
  { id: "plan-and-implement-code-changes", title: "Plan and implement code changes", definition: "Plan a code change, then implement it across files with engineers reviewing the result.", categoryId: "software-development", subcategoryId: "sd-coding", statement: "Use plan mode to architect changes, then implement across files with Grok Build.", productIds: ["grok-build"], formerLabel: "Plan and implement code changes", legacyBuildSlug: "xai-plan-and-implement-code" },
  { id: "trace-errors-to-their-root-cause", title: "Trace errors to their root cause", definition: "Investigate an error across logs, code and stack traces to find what caused it.", categoryId: "software-development", subcategoryId: "sd-debugging", statement: "Trace errors across logs, code, and stack traces to find root causes in minutes.", productIds: ["grok-build"], formerLabel: "Trace errors to their root cause", legacyBuildSlug: "xai-trace-errors-root-cause" },
  { id: "generate-technical-documentation", title: "Generate technical documentation from a codebase", definition: "Produce architecture docs, API references and runbooks from existing code.", categoryId: "software-development", subcategoryId: "sd-documentation", statement: "Generate architecture docs, API references, and runbooks from your codebase.", productIds: ["grok-build", "grok-api"], formerLabel: "Generate technical documentation", legacyBuildSlug: "xai-generate-technical-docs" },
  { id: "draft-long-form-content", title: "Draft long-form articles, reports and proposals", definition: "Outline and draft long documents, then refine them with editors.", categoryId: "marketing", subcategoryId: "mk-content", statement: "Write blog posts, reports, and proposals with structured outlines and iterative refinement.", productIds: ["grok"], formerLabel: "Long-form writing and reports", legacyBuildSlug: "xai-long-form-writing" },
  { id: "write-campaign-copy-in-brand-voice", title: "Write campaign copy in a brand voice", definition: "Draft ad copy, email sequences and social posts that follow brand guidelines.", categoryId: "marketing", subcategoryId: "mk-campaigns", statement: "Generate ad copy, email sequences, and social posts that match your brand voice.", productIds: ["grok-api"], formerLabel: "Campaign copy in your brand voice", legacyBuildSlug: "xai-brand-voice-copy" },
  { id: "translation-localization", title: "Translate and localize content", definition: "Adapt product, support and marketing content for new markets, with human review.", categoryId: "marketing", subcategoryId: "mk-localization", statement: "Adapt content for different markets with nuanced, context-aware translation.", productIds: ["grok-api"], formerLabel: "Translation and localization", legacyBuildSlug: "xai-translation-localization" },
  { id: "document-data-extraction", title: "Extract structured data from documents", definition: "Turn contracts, invoices and forms into structured records, with exceptions routed to a person.", categoryId: "operations", subcategoryId: "ops-documents", statement: "Parse contracts, invoices, and forms to extract structured data at scale.", productIds: ["grok-api"], formerLabel: "Document processing", legacyBuildSlug: "xai-document-processing" },
  { id: "create-product-mockups-and-concept-art", title: "Create product mockups and concept art", definition: "Generate and iterate on product mockups, illustrations and concept art.", categoryId: "marketing", subcategoryId: "mk-visual", statement: "Create product mockups, illustrations, and concept art with the Imagine API. Transform photos, apply style transfers, and iterate on visual concepts.", productIds: ["grok-imagine"], formerLabel: "Product mockups and concept art", legacyBuildSlug: "xai-imagine-visual-concepts", docUrl: "https://x.ai/api/imagine" },
  { id: "generate-video-clips-with-audio", title: "Generate short video clips with synchronized audio", definition: "Produce short video clips with audio for social posts, ads and presentations.", categoryId: "marketing", subcategoryId: "mk-visual", statement: "Generate video clips with synchronized audio for social, ads, and presentations.", productIds: ["grok-imagine"], formerLabel: "Video clips with synchronized audio", legacyBuildSlug: "xai-imagine-video-clips", docUrl: "https://x.ai/api/imagine" },
  { id: "internal-ai-assistants", title: "Build custom assistants connected to internal systems", definition: "Connect a model to your own tools and data to answer questions and run approved automations.", categoryId: "operations", subcategoryId: "ops-internal-tools", statement: "Connect Grok to your internal systems to build custom assistants and automations.", productIds: ["grok-api"], formerLabel: "Custom assistants and automations", legacyBuildSlug: "xai-custom-integrations" },
];

export const xaiUseCases: UseCase[] = statements.map((item) => ({
  id: item.id,
  slug: item.id,
  name: item.title,
  description: item.definition,
  outcome: item.title,
  category: "ai-software",
  icon: "Sparkles",
  color: "sand",
  stackId: item.id === "translation-localization" || item.id === "document-data-extraction" || item.id === "internal-ai-assistants" ? `${item.id}-pattern` : "",
  categoryId: item.categoryId,
  subcategoryId: item.subcategoryId,
  status: "approved",
  originType: "technology-vendor-sourced",
  originEntityId: XAI_PROVIDER_ID,
  createdBy: "oracnet-catalogue",
  createdAt: `${SOURCED_AT}T09:00:00Z`,
  updatedAt: `${SOURCED_AT}T09:00:00Z`,
  provenance: sourced,
}));

export const xaiUseCaseSources: UseCaseSource[] = statements.map((item) => ({
  id: `xai-source-${item.id}`,
  name: `xAI: ${item.title}`,
  useCaseId: item.id,
  sourceType: "technology-vendor",
  sourceEntityId: XAI_PROVIDER_ID,
  originalDescription: item.statement,
  productIds: item.productIds,
  sourceUrl: XAI_USE_CASES_URL,
  retrievedAt: SOURCED_AT,
  lastCheckedAt: SOURCED_AT,
  captureMethod: "Search-index copy of the page; verify wording against the live page.",
  attribution: "© xAI. Quoted from its public use-case page for attribution.",
  status: "needs-verification",
  provenance: sourced,
}));

export const xaiUseCaseAliases: UseCaseAlias[] = statements
  .filter((item) => normalizeLabel(item.formerLabel) !== normalizeLabel(item.title))
  .map((item) => ({
    id: `xai-alias-${item.id}`,
    name: item.formerLabel,
    useCaseId: item.id,
    label: item.formerLabel,
    aliasType: "alternate",
    normalizedLabel: normalizeLabel(item.formerLabel),
    language: "en",
    source: "Earlier Oracnet listing label",
    provenance: sourced,
  }));

/** Earlier releases published these statements as /builds/xai-* pages. */
export const xaiLegacyBuildRedirects: Record<string, string> = Object.fromEntries(
  statements.map((item) => [item.legacyBuildSlug, item.id]),
);

/** Broad areas that earlier releases listed as Use Cases now point at the taxonomy. */
export const xaiRetiredUseCaseRedirects: UseCaseRedirect[] = [
  ["software-development", "category", "software-development"],
  ["marketing-content", "category", "marketing"],
  ["visual-content-generation", "category", "mk-visual"],
].map(([fromSlug, targetType, target]) => ({
  id: fromSlug,
  name: fromSlug,
  fromSlug,
  targetType: targetType as UseCaseRedirect["targetType"],
  target,
  reason: "retired-broad-area",
  provenance: "inferred",
}));

const pattern = (useCaseId: string, name: string, items: SolutionStack["items"]): SolutionStack => ({
  id: `${useCaseId}-pattern`,
  slug: `${useCaseId}-pattern`,
  name,
  useCaseId,
  items,
  description:
    "An Oracnet editorial pattern: a typical composition with interchangeable components. It is not published or endorsed by any vendor listed in it; validate every component for your context.",
  provenance: "inferred",
});

export const xaiRelatedStacks: SolutionStack[] = [
  pattern("translation-localization", "Translate, review, publish pattern", [
    { capabilityId: "translation", productId: "grok-api", alternativeIds: ["claude", "openai-api"] },
    { capabilityId: "automation", productId: "n8n", alternativeIds: ["make"] },
    { capabilityId: "website", productId: "webflow-sites", alternativeIds: ["site-canvas"] },
  ]),
  pattern("document-data-extraction", "Extract, validate, store pattern", [
    { capabilityId: "document-extraction", productId: "grok-api", alternativeIds: ["openai-api", "claude"] },
    { capabilityId: "automation", productId: "n8n", alternativeIds: ["make"] },
    { capabilityId: "database", productId: "supabase", alternativeIds: [] },
  ]),
  pattern("internal-ai-assistants", "Connected internal assistant pattern", [
    { capabilityId: "language", productId: "grok-api", alternativeIds: ["claude", "openai-api"] },
    { capabilityId: "automation", productId: "n8n", alternativeIds: ["make"] },
    { capabilityId: "messaging", productId: "slack", alternativeIds: [] },
  ]),
];
