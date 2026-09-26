import type { Build, BuildStackItem, CreatorProfile } from "./build-model";
import type { Product, Provider, SolutionStack, UseCase } from "./model";

/**
 * xAI / Grok catalogue entries and use-case listings.
 *
 * SOURCED, NOT DEMO: product descriptions and use-case listings are summarised from
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
      "xAI builds the Grok family of models and products. Its public use-case page groups Grok into development, content, business operations, integrations and visual work. The listings on this profile follow that page and link back to it.",
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

/** Oracnet outcomes that xAI's listings map to where no existing use case fits. */
export const xaiRelatedUseCases: UseCase[] = [
  ["software-development", "Speed up software development with coding agents", "Plan, implement and debug code changes with an AI coding agent, with engineers reviewing every change.", "Ship reviewed changes faster", "Cpu"],
  ["marketing-content", "Produce marketing and business content with AI", "Draft long-form writing and campaign copy in your brand voice, with people editing and approving.", "Publish consistent content with less effort", "Sparkles"],
  ["translation-localization", "Translate and localize content", "Adapt product, support and marketing content for new markets with context-aware translation and human review.", "Reach customers in their language", "Globe"],
  ["document-data-extraction", "Extract structured data from documents", "Turn contracts, invoices and forms into structured records, with exceptions routed to a person.", "Stop re-keying documents", "FileText"],
  ["visual-content-generation", "Generate images and video for marketing", "Create product mockups, illustrations, concept art and short video clips, then iterate with your team.", "Produce visual concepts faster", "Video"],
  ["internal-ai-assistants", "Build assistants connected to internal systems", "Connect a model to your own tools and data to answer questions and run approved automations.", "Put company knowledge to work", "Workflow"],
].map(([id, name, description, outcome, icon], index) => ({
  id,
  slug: id,
  name,
  description,
  outcome,
  category: "ai-software",
  icon,
  color: ["violet", "peach", "blue", "sand", "pink", "green"][index],
  stackId: `${id}-pattern`,
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
  pattern("software-development", "Coding agent with review pattern", [
    { capabilityId: "coding-agent", productId: "grok-build", alternativeIds: [] },
    { capabilityId: "language", productId: "grok-api", alternativeIds: ["claude", "openai-api"] },
    { capabilityId: "hosting", productId: "vercel-hosting", alternativeIds: [] },
  ]),
  pattern("marketing-content", "Drafting and publishing pattern", [
    { capabilityId: "content-generation", productId: "grok-api", alternativeIds: ["claude", "openai-api"] },
    { capabilityId: "automation", productId: "n8n", alternativeIds: ["make"] },
    { capabilityId: "website", productId: "webflow-sites", alternativeIds: ["site-canvas"] },
  ]),
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
  pattern("visual-content-generation", "Generate, review, publish visuals pattern", [
    { capabilityId: "image-generation", productId: "grok-imagine", alternativeIds: [] },
    { capabilityId: "video", productId: "runway-video", alternativeIds: ["grok-imagine", "video-studio"] },
    { capabilityId: "website", productId: "webflow-sites", alternativeIds: ["site-canvas"] },
  ]),
  pattern("internal-ai-assistants", "Connected internal assistant pattern", [
    { capabilityId: "language", productId: "grok-api", alternativeIds: ["claude", "openai-api"] },
    { capabilityId: "automation", productId: "n8n", alternativeIds: ["make"] },
    { capabilityId: "messaging", productId: "slack", alternativeIds: [] },
  ]),
];

/**
 * xAI's company showcase. Its Builds are use-case listings compiled from the source
 * page, so they carry "third-party sourced" provenance and no reuse rights.
 */
export const xaiCreator: CreatorProfile = {
  id: XAI_PROVIDER_ID,
  slug: XAI_PROVIDER_ID,
  ownerId: "oracnet-catalogue",
  name: "xAI",
  headline: "Grok use cases, as listed by xAI",
  bio: `Unclaimed company profile. Oracnet compiled these listings from xAI's public use-case page (${XAI_USE_CASES_URL}) on ${SOURCED_AT}. xAI has not reviewed them. They describe what the provider says Grok can be used for — not tested results or customer deployments.`,
  location: "Global",
  website: "https://x.ai",
  github: "",
  expertise: ["Language models", "Voice agents", "Image & video generation", "Coding agents"],
  technologyIds: xaiProducts.map((product) => product.id),
  useCaseIds: ["customer-support", ...xaiRelatedUseCases.map((useCase) => useCase.id)],
  available: false,
  kind: "company",
  verification: "unverified",
  color: "dark",
  provenance: sourced,
};

type Listing = {
  slug: string;
  name: string;
  /** xAI's own description, lightly edited for length. */
  listed: string;
  section: string;
  useCaseIds: string[];
  intendedUsers: string;
  nodes: [productId: string, capabilityId: string, role: string][];
  edges?: string[];
  docUrl?: string;
};

const listings: Listing[] = [
  {
    slug: "voice-customer-support",
    name: "Voice agents for customer support",
    listed: "Deploy voice AI to handle customer inquiries, route calls and reduce wait times.",
    section: "Business operations",
    useCaseIds: ["customer-support"],
    intendedUsers: "Support and contact-centre teams evaluating voice automation.",
    nodes: [["grok-voice", "voice", "Realtime voice agent"]],
    docUrl: "https://docs.x.ai/docs/guides/voice",
  },
  {
    slug: "plan-and-implement-code",
    name: "Plan and implement code changes",
    listed: "Use plan mode to architect changes, then implement them across files with Grok Build.",
    section: "Development & engineering",
    useCaseIds: ["software-development"],
    intendedUsers: "Engineering teams evaluating agentic coding tools.",
    nodes: [["grok-build", "coding-agent", "Coding agent (plan mode)"]],
  },
  {
    slug: "trace-errors-root-cause",
    name: "Trace errors to their root cause",
    listed: "Trace errors across logs, code and stack traces to find root causes.",
    section: "Development & engineering",
    useCaseIds: ["software-development"],
    intendedUsers: "Engineers and on-call teams investigating incidents.",
    nodes: [["grok-build", "coding-agent", "Debugging agent"]],
  },
  {
    slug: "generate-technical-docs",
    name: "Generate technical documentation",
    listed: "Generate architecture docs, API references and runbooks from your codebase.",
    section: "Development & engineering",
    useCaseIds: ["software-development"],
    intendedUsers: "Engineering and platform teams with under-documented systems.",
    nodes: [["grok-build", "coding-agent", "Codebase reader"], ["grok-api", "content-generation", "Documentation drafting"]],
    edges: ["Code context"],
  },
  {
    slug: "long-form-writing",
    name: "Long-form writing and reports",
    listed: "Write blog posts, reports and proposals with structured outlines and iterative refinement.",
    section: "Content creation",
    useCaseIds: ["marketing-content"],
    intendedUsers: "Marketing, strategy and bid teams producing long documents.",
    nodes: [["grok", "assistant", "Drafting assistant"]],
  },
  {
    slug: "brand-voice-copy",
    name: "Campaign copy in your brand voice",
    listed: "Generate ad copy, email sequences and social posts that match your brand voice.",
    section: "Content creation",
    useCaseIds: ["marketing-content"],
    intendedUsers: "Marketing teams producing campaign variations.",
    nodes: [["grok-api", "content-generation", "Copy generation"]],
  },
  {
    slug: "translation-localization",
    name: "Translation and localization",
    listed: "Adapt content for different markets with nuanced, context-aware translation.",
    section: "Content creation",
    useCaseIds: ["translation-localization"],
    intendedUsers: "Teams publishing product, support or marketing content in several languages.",
    nodes: [["grok-api", "translation", "Translation model"]],
  },
  {
    slug: "document-processing",
    name: "Document processing",
    listed: "Parse contracts, invoices and forms to extract structured data at scale.",
    section: "Business operations",
    useCaseIds: ["document-data-extraction"],
    intendedUsers: "Finance, legal and operations teams handling document-heavy workflows.",
    nodes: [["grok-api", "document-extraction", "Structured extraction"]],
  },
  {
    slug: "imagine-visual-concepts",
    name: "Product mockups and concept art",
    listed: "Create product mockups, illustrations and concept art with the Imagine API; transform photos, apply style transfers and iterate on visual concepts.",
    section: "Visual content",
    useCaseIds: ["visual-content-generation"],
    intendedUsers: "Design, product and marketing teams exploring visual concepts.",
    nodes: [["grok-imagine", "image-generation", "Image generation and editing"]],
    docUrl: "https://x.ai/api/imagine",
  },
  {
    slug: "imagine-video-clips",
    name: "Video clips with synchronized audio",
    listed: "Generate video clips with synchronized audio for social, ads and presentations.",
    section: "Visual content",
    useCaseIds: ["visual-content-generation", "product-video-website"],
    intendedUsers: "Marketing and social teams producing short-form video.",
    nodes: [["grok-imagine", "video", "Video generation"]],
    docUrl: "https://x.ai/api/imagine",
  },
  {
    slug: "custom-integrations",
    name: "Custom assistants and automations",
    listed: "Connect Grok to your internal systems to build custom assistants and automations.",
    section: "Integration & customization",
    useCaseIds: ["internal-ai-assistants"],
    intendedUsers: "Teams building internal tools on top of a model API.",
    nodes: [["grok-api", "language", "Model with tool calling"]],
  },
];

export const xaiBuilds: Build[] = listings.map((listing, index) => {
  const id = `xai-${listing.slug}`;
  const stack: BuildStackItem[] = listing.nodes.map(([productId, capabilityId, role], i) => ({
    id: `${id}-node-${i}`,
    productId,
    capabilityId,
    role,
    notes: "Named by xAI for this use case.",
    alternativeIds: [],
    evidence: "detected",
    sourceUrl: listing.docUrl ?? XAI_USE_CASES_URL,
    x: i * 320,
    y: 0,
  }));
  return {
    id,
    slug: id,
    name: listing.name,
    tagline: listing.listed,
    description: `xAI lists this under “${listing.section}”: “${listing.listed}” Oracnet summarises the listing and links to the source. It is a provider use case — not a tested implementation, a customer deployment or an outcome claim.`,
    problem: listing.listed,
    intendedUsers: listing.intendedUsers,
    notes: `Listed by xAI in the “${listing.section}” section of its use-case page.`,
    ownerId: xaiCreator.ownerId,
    creatorId: xaiCreator.id,
    visibility: "public",
    publication: "published",
    moderation: "approved",
    verification: "unverified",
    category: "ai-software",
    industry: listing.section,
    useCaseIds: listing.useCaseIds,
    capabilityIds: stack.map((item) => item.capabilityId),
    stack,
    connections: stack.slice(1).map((item, i) => ({
      id: `${id}-edge-${i}`,
      fromId: stack[i].id,
      toId: item.id,
      label: listing.edges?.[i] ?? "Output",
    })),
    // No artwork: provider listings get a typographic cover rather than borrowed imagery.
    media: [],
    sources: [
      { id: `${id}-source`, url: XAI_USE_CASES_URL, label: "xAI — Grok use cases (source of this listing)", kind: "documentation", evidence: sourced },
      ...(listing.docUrl
        ? [{ id: `${id}-docs`, url: listing.docUrl, label: "xAI product documentation", kind: "documentation" as const, evidence: sourced }]
        : []),
    ],
    demoUrl: "",
    githubUrl: "",
    sourceAvailable: false,
    cloneAllowed: false,
    commercialUseAllowed: false,
    license: "Provider use-case listing. Oracnet grants no reuse rights; use of Grok is governed by xAI's own terms.",
    attribution: `Listing text © xAI, summarised from ${XAI_USE_CASES_URL}.`,
    buildTime: "",
    buildCost: "",
    currency: "USD",
    difficulty: "Not stated by provider",
    requirements: "An xAI account; API access for the API-based products. Check xAI's documentation for current availability, pricing and data terms.",
    setupNotes: "Start from xAI's documentation linked in Sources. Define your acceptance criteria and a human review step before a pilot.",
    limitations: "Summarised from the provider's public page. Oracnet has not tested these capabilities, and no customer outcome is claimed.",
    createdAt: `${SOURCED_AT}T09:${String(index).padStart(2, "0")}:00Z`,
    updatedAt: `${SOURCED_AT}T09:${String(index).padStart(2, "0")}:00Z`,
    featured: false,
    ownershipConfirmed: true,
    provenance: sourced,
  };
});

/** Group xAI's listings the way its page does. */
export const xaiListingSections = [...new Set(listings.map((listing) => listing.section))];
export const xaiListingSection = (buildId: string) => listings.find((listing) => `xai-${listing.slug}` === buildId)?.section;
