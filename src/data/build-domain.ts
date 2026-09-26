import { z } from "zod";
import type { Build, BuildOffer, CreatorProfile } from "./build-model";
import type { Product } from "./model";
export const safeUrl = (value: string): string | undefined => {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
};
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
export const isPublicBuild = (b: Build) =>
  b.visibility === "public" &&
  b.publication === "published" &&
  b.moderation === "approved";
export const canReadBuild = (b: Build, userId: string, admin = false) =>
  isPublicBuild(b) ||
  (b.visibility === "unlisted" &&
    b.publication === "published" &&
    b.moderation === "approved") ||
  b.ownerId === userId ||
  admin;
export const buildSchema = z.object({
  name: z.string().trim().min(5).max(120),
  tagline: z.string().trim().min(10).max(200),
  description: z.string().trim().min(40).max(12000),
  creatorId: z.string().min(1),
  category: z.string().min(1),
  useCaseIds: z.array(z.string()).max(3), // min 1 incl. a proposal: see buildUseCaseErrors
  stack: z
    .array(
      z.object({
        productId: z.string().min(1),
        role: z.string().trim().min(2),
        evidence: z.enum(["detected", "creator-confirmed", "demo"]),
      }),
    )
    .min(1),
  ownershipConfirmed: z.literal(true, {
    error: "Confirm your rights to publish this work.",
  }),
});
export function validateBuild(b: Build): string[] {
  const r = buildSchema.safeParse(b);
  const errors = r.success
    ? []
    : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  if (b.stack.some((s) => s.evidence === "detected"))
    errors.push("Confirm every detected technology before publishing.");
  if (b.cloneAllowed && !b.license.trim())
    errors.push("Describe the blueprint license before allowing remixing.");
  for (const s of b.sources)
    if (!safeUrl(s.url)) errors.push("Use valid HTTP(S) source links.");
  if (b.demoUrl && !safeUrl(b.demoUrl))
    errors.push("Demo URL must be HTTP(S).");
  if (b.githubUrl && !safeUrl(b.githubUrl))
    errors.push("Repository URL must be HTTP(S).");
  if (
    b.connections.some(
      (c) =>
        !b.stack.some((s) => s.id === c.fromId) ||
        !b.stack.some((s) => s.id === c.toId) ||
        c.fromId === c.toId,
    )
  )
    errors.push(
      "Architecture connections must link two different stack items.",
    );
  return errors;
}
export function completeness(b: Build) {
  return Math.round(
    ([
      b.description.length >= 40,
      b.media.length > 0,
      b.stack.length > 0,
      b.useCaseIds.length > 0,
      b.sources.length > 0,
      b.connections.length > 0,
      !!b.setupNotes,
      !!b.limitations,
    ].filter(Boolean).length /
      8) *
      100,
  );
}
export function newBuild(ownerId: string, creatorId: string): Build {
  const id = crypto.randomUUID();
  return {
    id,
    slug: `untitled-${id.slice(0, 8)}`,
    name: "Untitled build",
    tagline: "",
    description: "",
    problem: "",
    intendedUsers: "",
    notes: "",
    ownerId,
    creatorId,
    visibility: "draft",
    publication: "draft",
    moderation: "pending",
    verification: "unverified",
    category: "ai-software",
    industry: "",
    useCaseIds: [],
    capabilityIds: [],
    stack: [],
    connections: [],
    media: [],
    sources: [],
    demoUrl: "",
    githubUrl: "",
    sourceAvailable: false,
    cloneAllowed: false,
    commercialUseAllowed: false,
    license: "",
    attribution: "",
    buildTime: "",
    buildCost: "",
    currency: "USD",
    difficulty: "Intermediate",
    requirements: "",
    setupNotes: "",
    limitations: "",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    featured: false,
    ownershipConfirmed: false,
    provenance: "demo",
  };
}
export function remixBuild(
  source: Build,
  ownerId: string,
  creatorId: string,
  creatorName: string,
): Build {
  if (!source.cloneAllowed)
    throw new Error("This creator has not permitted blueprint remixes.");
  const draft = newBuild(ownerId, creatorId);
  const ids = new Map(source.stack.map((s) => [s.id, crypto.randomUUID()]));
  return {
    ...source,
    ...draft,
    name: `${source.name} — remix`,
    slug: slugify(source.name) + "-remix-" + draft.id.slice(0, 8),
    tagline: source.tagline,
    description: source.description,
    problem: source.problem,
    intendedUsers: source.intendedUsers,
    category: source.category,
    industry: source.industry,
    useCaseIds: [...source.useCaseIds],
    capabilityIds: [...source.capabilityIds],
    stack: source.stack.map((s) => ({ ...s, id: ids.get(s.id)! })),
    connections: source.connections.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      fromId: ids.get(c.fromId)!,
      toId: ids.get(c.toId)!,
    })),
    sources: source.sources.map(s => ({ ...s, id: crypto.randomUUID() })),
    license: source.license,
    cloneAllowed: source.cloneAllowed,
    commercialUseAllowed: source.commercialUseAllowed,
    sourceAvailable: false,
    forkedFromBuildId: source.id,
    attribution:
      `Blueprint remixed from ${source.name} by ${creatorName}. ${source.attribution}`.trim(),
    notes:
      "Remixes copy the structured blueprint, not source code or proprietary media.",
  };
}
export function relatedBuilds(build: Build, all: Build[]) {
  const ids = new Set(build.stack.map((s) => s.productId));
  return all
    .filter((b) => b.id !== build.id && isPublicBuild(b))
    .map((b) => ({
      build: b,
      score:
        b.useCaseIds.filter((i) => build.useCaseIds.includes(i)).length * 3 +
        b.stack.filter((s) => ids.has(s.productId)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.build);
}
export interface BuildFilters {
  q?: string;
  useCase?: string;
  category?: string;
  industry?: string;
  technology?: string;
  creator?: string;
  source?: string;
  remix?: string;
  offer?: string;
  recent?: string;
}
export function filterBuilds(
  builds: Build[],
  f: BuildFilters,
  products: Product[],
  creators: CreatorProfile[],
  offers: BuildOffer[],
) {
  return builds.filter(
    (b) =>
      isPublicBuild(b) &&
      (!f.q ||
        [
          b.name,
          b.tagline,
          b.description,
          ...b.stack.map(
            (s) => products.find((p) => p.id === s.productId)?.name ?? "",
          ),
          creators.find((c) => c.id === b.creatorId)?.name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(f.q.toLowerCase())) &&
      (!f.useCase || b.useCaseIds.includes(f.useCase)) &&
      (!f.category || b.category === f.category) &&
      (!f.industry || b.industry === f.industry) &&
      (!f.technology || b.stack.some((s) => s.productId === f.technology)) &&
      (!f.creator || b.creatorId === f.creator) &&
      (!f.source || (b.sourceAvailable && !!b.license)) &&
      (!f.remix || b.cloneAllowed) &&
      (!f.offer ||
        offers.some(
          (o) => o.buildId === b.id && o.active && o.moderation === "approved",
        )) &&
      (!f.recent || Date.now() - Date.parse(b.updatedAt) < 30 * 86400000),
  );
}
export function offerAction(o: BuildOffer) {
  if (!o.active || o.moderation !== "approved") return "Unavailable";
  if (o.checkoutMode === "demo") return "Preview demo offer";
  if (o.checkoutMode === "external" && safeUrl(o.externalUrl))
    return "Continue on creator website";
  return o.pricingModel === "free" ? "Request guide" : "Request implementation";
}
export function offerPrice(o: BuildOffer) {
  if (o.pricingModel === "free") return "Free";
  if (o.pricingModel === "request quote" || o.price === null)
    return "Request quote";
  const amount = new Intl.NumberFormat("en", {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(o.currency) ? o.currency : "USD",
    maximumFractionDigits: 0,
  }).format(o.price);
  return `${o.pricingModel === "starting from" ? "From " : ""}${amount}${o.pricingModel === "monthly" ? "/mo" : o.pricingModel === "yearly" ? "/yr" : ""}`;
}
