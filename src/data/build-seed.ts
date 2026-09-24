import type {
  Build,
  CreatorProfile,
  BuildOffer,
  BuildTables,
} from "./build-model";
import type { Product, Provider } from "./model";
export const buildProviders: Provider[] = [
  [
    "supabase",
    "Supabase",
    "https://supabase.com",
    "data-infrastructure",
    "green",
  ],
  ["n8n", "n8n", "https://n8n.io", "automation", "orange"],
  ["twilio", "Twilio", "https://www.twilio.com", "automation", "pink"],
  ["vapi", "Vapi", "https://vapi.ai", "ai-software", "green"],
  ["elevenlabs", "ElevenLabs", "https://elevenlabs.io", "ai-software", "dark"],
  ["shopify", "Shopify", "https://www.shopify.com", "automation", "green"],
].map(([id, name, website, category, color]) => ({
  id,
  slug: id,
  name,
  description:
    "Sample directory profile. See the official website for product information.",
  website,
  category,
  color,
  initials: name.slice(0, 1),
  region: "Global",
  specialties: [],
  provenance: "demo",
}));
export const buildProducts: Product[] = [
  [
    "supabase",
    "Supabase",
    "supabase",
    "data-infrastructure",
    "database",
    "green",
  ],
  ["n8n", "n8n", "n8n", "automation", "automation", "orange"],
  ["twilio", "Twilio", "twilio", "automation", "telephony", "pink"],
  ["vapi", "Vapi", "vapi", "ai-software", "voice", "green"],
  ["elevenlabs", "ElevenLabs", "elevenlabs", "ai-software", "voice", "dark"],
  ["shopify", "Shopify", "shopify", "automation", "commerce", "green"],
].map(([id, name, providerId, category, capability, color]) => ({
  id,
  slug: id,
  name,
  description:
    "Illustrative catalogue entry · confirm features and terms with the provider.",
  providerId,
  category,
  capabilityIds: [capability],
  deployment: "Cloud",
  pricing: "Contact provider",
  integrations: [],
  initials: name.slice(0, 1),
  color,
  provenance: "demo",
}));
export const creators: CreatorProfile[] = [
  {
    id: "alex-chen",
    slug: "alex-chen",
    ownerId: "demo-user",
    name: "Alex Chen",
    headline: "Useful AI, connected to everyday work.",
    bio: "Fictional demo creator exploring practical voice agents and internal tools. The builds in this profile are illustrative blueprints, not verified deployments.",
    location: "London",
    website: "",
    github: "",
    expertise: ["Voice AI", "Customer support", "Automation"],
    technologyIds: ["claude", "supabase", "vapi"],
    useCaseIds: ["customer-support", "business-analytics"],
    available: true,
    kind: "individual",
    verification: "unverified",
    color: "sand",
    provenance: "demo",
  },
  {
    id: "northstar-studio",
    slug: "northstar-studio",
    ownerId: "demo-studio",
    organizationId: "northstar",
    name: "Northstar Studio",
    headline: "From product catalogue to content pipeline.",
    bio: "Fictional studio sharing sample content systems and commerce workflows. All implementation offers are demonstrations.",
    location: "Europe",
    website: "",
    github: "",
    expertise: ["Ecommerce", "Video", "Workflow design"],
    technologyIds: ["runway-video", "n8n", "shopify"],
    useCaseIds: ["product-video-website", "ecommerce-store"],
    available: true,
    kind: "studio",
    verification: "unverified",
    color: "peach",
    provenance: "demo",
  },
  {
    id: "maya-rivera",
    slug: "maya-rivera",
    ownerId: "demo-maya",
    name: "Maya Rivera",
    headline: "Calm, understandable systems for busy teams.",
    bio: "Fictional demo builder focusing on document workflows, evidence and human review.",
    location: "North America",
    website: "",
    github: "",
    expertise: ["Knowledge systems", "Data", "Research"],
    technologyIds: ["openai-api", "supabase", "vercel-hosting"],
    useCaseIds: ["business-analytics", "customer-support"],
    available: false,
    kind: "individual",
    verification: "unverified",
    color: "violet",
    provenance: "demo",
  },
];
const examples = [
  [
    "ai-dental-receptionist",
    "AI dental receptionist",
    "Turn missed calls into a clear appointment request.",
    "Healthcare",
    "alex-chen",
    "customer-support",
    "vapi,claude,twilio,supabase",
    "Voice interface,Reasoning,Telephony,Database",
    "voice",
  ],
  [
    "product-video-engine",
    "Product video engine",
    "From a product photo to a review-ready video campaign.",
    "Commerce",
    "northstar-studio",
    "product-video-website",
    "shopify,n8n,runway-video,supabase",
    "Product catalogue,Workflow orchestration,Video generation,Asset storage",
    "video",
  ],
  [
    "support-resolution-desk",
    "Support resolution desk",
    "Give support teams a grounded first draft, with a human in control.",
    "Customer service",
    "alex-chen",
    "customer-support",
    "claude,supabase,vercel-hosting",
    "Reasoning,Knowledge store,Workspace hosting",
    "support",
  ],
  [
    "research-workbench",
    "Research workbench",
    "Keep questions, sources and research notes in one traceable workspace.",
    "Research",
    "maya-rivera",
    "business-analytics",
    "openai-api,supabase,vercel-hosting",
    "Research assistance,Source database,Application hosting",
    "research",
  ],
  [
    "invoice-review-flow",
    "Invoice review flow",
    "Extract invoice details and route exceptions for human approval.",
    "Operations",
    "maya-rivera",
    "business-analytics",
    "n8n,openai-api,supabase",
    "Workflow orchestration,Document extraction,Review queue",
    "invoice",
  ],
  [
    "commerce-content-studio",
    "Commerce content studio",
    "Create product copy and visual briefs from a shared catalogue.",
    "Commerce",
    "northstar-studio",
    "ecommerce-store",
    "shopify,claude,n8n,webflow-sites",
    "Product catalogue,Content drafting,Automation,Website",
    "commerce",
  ],
];
export const builds: Build[] = examples.map(
  (
    [id, name, tagline, industry, creatorId, useCaseId, tools, roles, art],
    index,
  ) => {
    const creator = creators.find((c) => c.id === creatorId)!;
    const stack = tools.split(",").map((productId, i) => ({
      id: `${id}-node-${i}`,
      productId,
      capabilityId: roles.split(",")[i].toLowerCase().replaceAll(" ", "-"),
      role: roles.split(",")[i],
      notes:
        "Chosen here to demonstrate this responsibility. Confirm API access, data handling and compatibility before implementation.",
      alternativeIds:
        productId === "claude"
          ? ["openai-api"]
          : productId === "openai-api"
            ? ["claude"]
            : [],
      evidence: "demo" as const,
      x: (i % 2) * 320,
      y: Math.floor(i / 2) * 170,
    }));
    return {
      id,
      slug: id,
      name,
      tagline,
      description: `${tagline} This sample build maps the implementation from input through processing to a human-reviewed output. It is an illustrative blueprint for exploring the marketplace, not evidence of a live deployment.`,
      problem:
        index === 0
          ? "Busy reception teams cannot always answer every inbound call."
          : "Manual handoffs make the workflow difficult to repeat and review.",
      intendedUsers:
        index === 0
          ? "Practice operations teams evaluating a non-clinical appointment workflow."
          : "Operations and product teams evaluating a focused pilot.",
      notes:
        "Start with synthetic data, define acceptance criteria, and keep a person responsible for the final decision.",
      ownerId: creator.ownerId,
      creatorId,
      organizationId: creator.organizationId,
      visibility: "public",
      publication: "published",
      moderation: "approved",
      verification: "unverified",
      category: index === 1 || index === 4 ? "automation" : "ai-software",
      industry,
      useCaseIds: [useCaseId],
      capabilityIds: stack.map((s) => s.capabilityId),
      stack,
      connections: stack.slice(1).map((s, i) => ({
        id: `${id}-edge-${i}`,
        fromId: stack[i].id,
        toId: s.id,
        label: [
          "Validated request",
          "Structured context",
          "Review-ready output",
        ][i],
      })),
      media: [
        {
          id: id + "-cover",
          type: "image",
          url: `media/build-${art}.svg`,
          alt: `Original illustrative ${name} workflow preview — demo`,
        },
        {
          id: id + "-detail",
          type: "image",
          url: "media/workspace.svg",
          alt: "Illustrative workspace, not a vendor screenshot",
        },
      ],
      sources: [
        {
          id: id + "-source",
          url: "https://supabase.com/docs",
          label: "Supplier documentation · not deployment evidence",
          kind: "documentation",
          evidence: "demo",
        },
      ],
      demoUrl: "",
      githubUrl: "",
      sourceAvailable: false,
      cloneAllowed: index !== 4,
      commercialUseAllowed: false,
      license:
        index !== 4
          ? "Oracnet demo blueprint: attribution required; non-commercial exploration only. No source-code rights are granted."
          : "Showcase only. All rights reserved.",
      attribution: `Original illustrative blueprint by ${creator.name} (fictional demo persona).`,
      buildTime: "",
      buildCost: "",
      currency: "USD",
      difficulty: "Intermediate",
      requirements:
        "Provider accounts, API access, synthetic test data and a designated human reviewer.",
      setupNotes:
        "1. Define the input and expected outcome.\n2. Configure each component with least privilege.\n3. Connect the workflow using the architecture as a blueprint.\n4. Test failure cases before expanding the pilot.",
      limitations:
        index === 0
          ? "Not clinical advice. No patient data should be used in this demo. Production healthcare workflows require an independent security and compliance assessment."
          : "No guaranteed compatibility, performance or production readiness. Validate every integration and failure path.",
      createdAt: `2026-09-${String(10 + index).padStart(2, "0")}T10:00:00Z`,
      updatedAt: `2026-09-${String(24 - index).padStart(2, "0")}T10:00:00Z`,
      featured: index < 2,
      ownershipConfirmed: true,
      provenance: "demo",
    };
  },
);
export const buildOffers: BuildOffer[] = builds
  .filter((_, i) => i < 3)
  .flatMap((b) => [
    {
      id: b.id + "-guide",
      buildId: b.id,
      ownerId: b.ownerId,
      name: "Blueprint walkthrough",
      description:
        "A guided explanation of the sample architecture, decisions and pilot checklist.",
      offerType: "Free guide" as const,
      pricingModel: "free" as const,
      price: null,
      currency: "USD",
      deliveryTime: "Discuss with creator",
      checkoutMode: "demo" as const,
      externalUrl: "",
      active: true,
      moderation: "approved" as const,
      provenance: "demo" as const,
    },
    {
      id: b.id + "-implementation",
      buildId: b.id,
      ownerId: b.ownerId,
      name: "Adapt this to your workflow",
      description:
        "Discuss your requirements, evaluate feasibility, and agree a separate implementation scope with the creator.",
      offerType: "Full implementation" as const,
      pricingModel: "request quote" as const,
      price: null,
      currency: "USD",
      deliveryTime: "Agreed after scoping",
      checkoutMode: "contact" as const,
      externalUrl: "",
      active: true,
      moderation: "approved" as const,
      provenance: "demo" as const,
    },
  ]);
export const buildSeed: Partial<{
  [K in keyof BuildTables]: BuildTables[K][];
}> = {
  builds,
  creator_profiles: creators,
  build_offers: buildOffers,
  build_updates: builds.map((b) => ({
    id: b.id + "-update",
    buildId: b.id,
    ownerId: b.ownerId,
    name: "Blueprint published",
    body: "Initial illustrative architecture and implementation notes. No live deployment claim.",
    date: b.createdAt!,
    provenance: "demo",
  })),
  collections: [
    {
      id: "support-research",
      slug: "support-research",
      ownerId: "demo-user",
      name: "Customer support research",
      description:
        "A private place to connect useful builds, tools and next steps.",
      visibility: "private",
      provenance: "demo",
    },
  ],
  collection_items: [],
  organization_memberships: [
    {
      id: "northstar-member",
      organizationId: "northstar",
      userId: "demo-studio",
      role: "owner",
      name: "Northstar Studio membership",
      provenance: "demo",
    },
  ],
  user_roles: [
    {
      id: "demo-buyer",
      userId: "demo-user",
      role: "buyer",
      name: "Buyer",
      provenance: "demo",
    },
    {
      id: "demo-creator",
      userId: "demo-user",
      role: "creator",
      name: "Creator",
      provenance: "demo",
    },
  ],
};
