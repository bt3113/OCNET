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
 * SOURCED, NOT DEMO: the use-case catalogue below was checked against the live
 * xAI use-case index and the linked official detail pages on SOURCED_AT. The
 * profile remains UNCLAIMED — source verification is not vendor endorsement.
 */
export const XAI_PROVIDER_ID = "xai";
export const XAI_USE_CASES_URL = "https://x.ai/grok/use-cases";
const SOURCED_AT = "2026-09-26";
const sourced = "third-party sourced" as const;
const attributeSource = `Summarised from xAI's public pages and checked on ${SOURCED_AT}; not confirmed or maintained by xAI.`;

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
      "xAI builds the Grok family of models and products. Its public use-case page describes work Grok can be used for; Oracnet records each statement as a vendor-stated Use Case and links to the official detail page.",
    note: "This profile is compiled from public xAI pages. xAI has not claimed, reviewed or endorsed the Oracnet profile.",
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
  ["grok-build", "Grok Build", "Agentic coding on the API and CLI: plan, refactor, debug and build", ["coding-agent"], "developer", "https://x.ai/grok/use-cases/code-planning"],
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
  /** xAI's short wording as displayed on its use-case index. */
  statement: string;
  productIds: string[];
  sourceUrl: string;
  /** Earlier Oracnet labels kept as alternate search labels. */
  aliases?: string[];
  /** Earlier releases exposed some statements as /builds/xai-* pages. */
  legacyBuildSlug?: string;
};

/**
 * Verified against https://x.ai/grok/use-cases and the official detail pages on
 * SOURCED_AT. Public titles are the vendor's live titles. Category/subcategory and
 * the concise `definition` are Oracnet editorial structure, kept separate from the
 * captured source statement.
 */
const statements: VendorStatement[] = [
  {
    id: "synthesize-research-across-sources",
    title: "Synthesize research across sources",
    definition: "Combine findings from multiple sources into a structured research synthesis with citations.",
    categoryId: "data-analytics",
    subcategoryId: "an-research",
    statement: "Pull together findings from papers, reports, and datasets into structured summaries with citations.",
    productIds: ["grok"],
    sourceUrl: "https://x.ai/grok/use-cases/research-synthesis",
  },
  {
    id: "monitor-news-and-market-signals",
    title: "Monitor news and market signals",
    definition: "Track changing news and market signals and surface relevant developments for review.",
    categoryId: "data-analytics",
    subcategoryId: "an-market-intelligence",
    statement: "Track developments in real time across the web and X to stay ahead of fast-moving topics.",
    productIds: ["grok"],
    sourceUrl: "https://x.ai/grok/use-cases/market-monitoring",
  },
  {
    id: "analyze-financial-data-and-filings",
    title: "Analyze financial data and filings",
    definition: "Analyze filings, reports and financial models to extract figures and identify material signals.",
    categoryId: "finance",
    subcategoryId: "fin-analysis",
    statement: "Process earnings reports, SEC filings, and financial models to surface key insights quickly.",
    productIds: ["grok"],
    sourceUrl: "https://x.ai/grok/use-cases/financial-analysis",
  },
  {
    id: "plan-and-implement-code-changes",
    title: "Plan and implement code changes",
    definition: "Plan a code change, then implement it across files with engineers reviewing the result.",
    categoryId: "software-development",
    subcategoryId: "sd-coding",
    statement: "Use plan mode to architect changes, then implement across files with Grok Build.",
    productIds: ["grok-build", "grok"],
    sourceUrl: "https://x.ai/grok/use-cases/code-planning",
    legacyBuildSlug: "xai-plan-and-implement-code",
  },
  {
    id: "trace-errors-to-their-root-cause",
    title: "Debug production issues faster",
    definition: "Investigate production errors across logs, code and stack traces to find likely root causes.",
    categoryId: "software-development",
    subcategoryId: "sd-debugging",
    statement: "Trace errors across logs, code, and stack traces to find root causes in minutes.",
    productIds: ["grok-build", "grok"],
    sourceUrl: "https://x.ai/grok/use-cases/debugging",
    aliases: ["Trace errors to their root cause"],
    legacyBuildSlug: "xai-trace-errors-root-cause",
  },
  {
    id: "generate-technical-documentation",
    title: "Write and review technical docs",
    definition: "Create and review architecture documentation, API references and operational runbooks from a codebase.",
    categoryId: "software-development",
    subcategoryId: "sd-documentation",
    statement: "Generate architecture docs, API references, and runbooks from your codebase.",
    productIds: ["grok-build", "grok"],
    sourceUrl: "https://x.ai/grok/use-cases/technical-docs",
    aliases: ["Generate technical documentation", "Generate technical documentation from a codebase"],
    legacyBuildSlug: "xai-generate-technical-docs",
  },
  {
    id: "draft-long-form-content",
    title: "Draft and iterate on long-form content",
    definition: "Outline, draft and refine long-form business or editorial content with human review.",
    categoryId: "marketing",
    subcategoryId: "mk-content",
    statement: "Write blog posts, reports, and proposals with structured outlines and iterative refinement.",
    productIds: ["grok"],
    sourceUrl: "https://x.ai/grok/use-cases/long-form-writing",
    aliases: ["Long-form writing and reports", "Draft long-form articles, reports and proposals"],
    legacyBuildSlug: "xai-long-form-writing",
  },
  {
    id: "write-campaign-copy-in-brand-voice",
    title: "Create marketing copy across channels",
    definition: "Draft marketing copy for ads, email and social channels while following brand guidance.",
    categoryId: "marketing",
    subcategoryId: "mk-campaigns",
    statement: "Generate ad copy, email sequences, and social posts that match your brand voice.",
    productIds: ["grok"],
    sourceUrl: "https://x.ai/grok/use-cases/marketing-copy",
    aliases: ["Campaign copy in your brand voice", "Write campaign copy in a brand voice"],
    legacyBuildSlug: "xai-brand-voice-copy",
  },
  {
    id: "translation-localization",
    title: "Translate and localize content",
    definition: "Adapt product, support and marketing content for other languages and markets, with human review.",
    categoryId: "marketing",
    subcategoryId: "mk-localization",
    statement: "Adapt content for different markets with nuanced, context-aware translation.",
    productIds: ["grok"],
    sourceUrl: "https://x.ai/grok/use-cases/translation",
    aliases: ["Translation and localization"],
    legacyBuildSlug: "xai-translation-localization",
  },
  {
    id: "handle-customer-inquiries-with-voice-agents",
    title: "Automate workflows with voice agents",
    definition: "Use voice agents to handle inbound customer conversations, routing and workflow actions with human exceptions.",
    categoryId: "customer-service",
    subcategoryId: "cs-voice",
    statement: "Deploy voice AI to handle customer inquiries, route calls, and reduce wait times.",
    productIds: ["grok-voice", "grok-api"],
    sourceUrl: "https://x.ai/grok/use-cases/voice-agents",
    aliases: ["Voice agents for customer support", "Handle customer inquiries with voice agents"],
    legacyBuildSlug: "xai-voice-customer-support",
  },
  {
    id: "document-data-extraction",
    title: "Process and extract from documents",
    definition: "Extract structured records from contracts, invoices and forms, routing exceptions for review.",
    categoryId: "operations",
    subcategoryId: "ops-documents",
    statement: "Parse contracts, invoices, and forms to extract structured data at scale.",
    productIds: ["grok-api"],
    sourceUrl: "https://x.ai/grok/use-cases/document-processing",
    aliases: ["Document processing", "Extract structured data from documents"],
    legacyBuildSlug: "xai-document-processing",
  },
  {
    id: "internal-ai-assistants",
    title: "Build internal tools with the API",
    definition: "Connect a model API to internal systems to create assistants and approved automations.",
    categoryId: "operations",
    subcategoryId: "ops-internal-tools",
    statement: "Connect Grok to your internal systems to build custom assistants and automations.",
    productIds: ["grok-api"],
    sourceUrl: "https://x.ai/grok/use-cases/internal-tools",
    aliases: ["Custom assistants and automations", "Build custom assistants connected to internal systems"],
    legacyBuildSlug: "xai-custom-integrations",
  },
  {
    id: "create-product-mockups-and-concept-art",
    title: "Generate images from descriptions",
    definition: "Generate visual concepts, mockups and illustrations from text descriptions and iterate on them.",
    categoryId: "marketing",
    subcategoryId: "mk-visual",
    statement: "Create product mockups, illustrations, and concept art with the Imagine API.",
    productIds: ["grok-imagine", "grok"],
    sourceUrl: "https://x.ai/grok/use-cases/image-generation",
    aliases: ["Product mockups and concept art", "Create product mockups and concept art"],
    legacyBuildSlug: "xai-imagine-visual-concepts",
  },
  {
    id: "edit-and-restyle-existing-images",
    title: "Edit and restyle existing images",
    definition: "Transform or restyle existing images and iterate on visual concepts.",
    categoryId: "marketing",
    subcategoryId: "mk-visual",
    statement: "Transform photos, apply style transfers, and iterate on visual concepts.",
    productIds: ["grok-imagine", "grok"],
    sourceUrl: "https://x.ai/grok/use-cases/image-editing",
  },
  {
    id: "generate-video-clips-with-audio",
    title: "Create short videos from prompts",
    definition: "Generate short video clips from prompts for marketing, social and presentation use.",
    categoryId: "marketing",
    subcategoryId: "mk-visual",
    statement: "Generate video clips with synchronized audio for social, ads, and presentations.",
    productIds: ["grok-imagine", "grok"],
    sourceUrl: "https://x.ai/grok/use-cases/video-generation",
    aliases: ["Video clips with synchronized audio", "Generate short video clips with synchronized audio"],
    legacyBuildSlug: "xai-imagine-video-clips",
  },
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
  updatedAt: `${SOURCED_AT}T16:20:00Z`,
  provenance: sourced,
}));

export const xaiUseCaseSources: UseCaseSource[] = statements.map((item) => ({
  id: `xai-source-${item.id}`,
  name: `xAI: ${item.title}`,
  useCaseId: item.id,
  sourceType: "technology-vendor",
  sourceEntityId: XAI_PROVIDER_ID,
  originalTitle: item.title,
  originalDescription: item.statement,
  productIds: item.productIds,
  sourceUrl: item.sourceUrl,
  retrievedAt: SOURCED_AT,
  lastCheckedAt: SOURCED_AT,
  captureMethod: "Verified against the live xAI use-case index and linked official detail page on 2026-09-26.",
  attribution: "© xAI. Short vendor wording reproduced for source attribution.",
  status: "active",
  provenance: sourced,
}));

export const xaiUseCaseAliases: UseCaseAlias[] = statements.flatMap((item) =>
  [...new Set(item.aliases ?? [])]
    .filter((label) => normalizeLabel(label) !== normalizeLabel(item.title))
    .map((label, index) => ({
      id: `xai-alias-${item.id}-${index}`,
      name: label,
      useCaseId: item.id,
      label,
      aliasType: "alternate" as const,
      normalizedLabel: normalizeLabel(label),
      language: "en",
      source: "Earlier Oracnet label",
      provenance: sourced,
    })),
);

/** Earlier releases published eleven vendor statements as /builds/xai-* pages. */
export const xaiLegacyBuildRedirects: Record<string, string> = Object.fromEntries(
  statements.filter((item) => item.legacyBuildSlug).map((item) => [item.legacyBuildSlug!, item.id]),
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
