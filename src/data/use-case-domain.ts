import type { Build } from "./build-model";
import type { Product, UseCase } from "./model";
import type {
  Blueprint,
  BlueprintStackItem,
  Claim,
  ImplementationRecord,
  ImplementationStackItem,
  ImplementationUseCase,
} from "./intelligence-model";
import type { UseCaseAlias, UseCaseCategory, UseCaseProposal, UseCaseRedirect, UseCaseSource } from "./marketplace-model";
import { contentTokens, normalizeLabel } from "./use-case-text.ts";
import { providerForCreator, providerForImplementer, type SolutionProvider } from "./solution-providers.ts";

/** A Build may address one to three Use Cases (after AWS Marketplace's solution listings). */
export const MAX_USE_CASES_PER_BUILD = 3;
export const MAX_PROPOSALS_PER_BUILD = 1;

export const isApprovedUseCase = (useCase: Pick<UseCase, "status">) => (useCase.status ?? "approved") === "approved";
export const approvedUseCases = (useCases: UseCase[]) => useCases.filter(isApprovedUseCase);

const isPublicBuild = (build: Build) => build.visibility === "public" && build.publication === "published" && build.moderation === "approved";
const isPublicRecord = (record: ImplementationRecord) =>
  record.publicationState === "published" && record.moderationState === "approved" && record.visibility === "public";

/**
 * A Build is listed in marketplace discovery and counts only when it is public and at
 * least one of its Use Cases is approved. A Build relying solely on a pending proposal
 * stays out of discovery until the proposal is approved or mapped.
 */
export function isIndexableBuild(build: Build, useCases: UseCase[]) {
  if (!isPublicBuild(build)) return false;
  return build.useCaseIds.some((id) => useCases.some((useCase) => useCase.id === id && isApprovedUseCase(useCase)));
}

/** Selected Use Case slots in use, counting a pending proposal. */
export const countUseCaseSlots = (build: Pick<Build, "useCaseIds" | "useCaseProposalId">) => build.useCaseIds.length + (build.useCaseProposalId ? 1 : 0);

/** Business rules for a Build's Use Cases. The first id is the primary Use Case. */
export function buildUseCaseErrors(build: Pick<Build, "useCaseIds" | "useCaseProposalId">, useCases: UseCase[], publishing = true): string[] {
  const errors: string[] = [];
  const total = countUseCaseSlots(build);
  if (new Set(build.useCaseIds).size !== build.useCaseIds.length) errors.push("Each Use Case can be selected once.");
  if (total > MAX_USE_CASES_PER_BUILD) errors.push(`Choose at most ${MAX_USE_CASES_PER_BUILD} Use Cases, including a proposed one.`);
  if (publishing && total < 1) errors.push("Choose at least one Use Case this Build is designed to handle.");
  for (const id of build.useCaseIds) {
    const useCase = useCases.find((item) => item.id === id);
    if (!useCase) errors.push("A selected Use Case no longer exists. Choose another.");
    else if (!isApprovedUseCase(useCase)) errors.push(`“${useCase.name}” is not an approved Use Case.`);
  }
  return errors;
}

/** One new Use Case proposal per Build, and only while a slot is free. */
export const canPropose = (build: Pick<Build, "useCaseIds" | "useCaseProposalId">) =>
  !build.useCaseProposalId && countUseCaseSlots(build) < MAX_USE_CASES_PER_BUILD;

/** Add a Use Case, keeping order (first = primary). Refuses duplicates and a fourth slot. */
export function addUseCase(build: Pick<Build, "useCaseIds" | "useCaseProposalId">, id: string): string[] {
  if (build.useCaseIds.includes(id) || countUseCaseSlots(build) >= MAX_USE_CASES_PER_BUILD) return build.useCaseIds;
  return [...build.useCaseIds, id];
}
export const removeUseCase = (ids: string[], id: string) => ids.filter((item) => item !== id);
/** Make `id` the primary Use Case by moving it first; the others keep their order. */
export const makePrimary = (ids: string[], id: string) => (ids.includes(id) ? [id, ...ids.filter((item) => item !== id)] : ids);

export interface UseCaseSuggestion {
  useCase: UseCase;
  score: number;
  /** Why it matched, in plain words. */
  reason: string;
  /** Visible label that matched, when it was an alternate label (hidden labels are never shown). */
  matchedLabel?: string;
}

/**
 * Deterministic Use Case suggestions from free text: exact and prefix matches on titles
 * and labels, token overlap (stemmed), then description overlap. No model, no guessing:
 * the provider always chooses.
 */
export function suggestUseCases(
  text: string,
  catalogue: { useCases: UseCase[]; aliases: UseCaseAlias[] },
  options: { limit?: number; exclude?: string[] } = {},
): UseCaseSuggestion[] {
  const query = normalizeLabel(text);
  const queryTokens = new Set(contentTokens(text));
  if (!query || !queryTokens.size) return [];
  const exclude = new Set(options.exclude ?? []);
  const results: UseCaseSuggestion[] = [];
  for (const useCase of approvedUseCases(catalogue.useCases)) {
    if (exclude.has(useCase.id)) continue;
    const labels: { label: string; hidden: boolean; alias: boolean }[] = [
      { label: useCase.name, hidden: false, alias: false },
      ...catalogue.aliases
        .filter((alias) => alias.useCaseId === useCase.id)
        .map((alias) => ({ label: alias.label, hidden: alias.aliasType === "hidden-search" || alias.aliasType === "original-source", alias: true })),
    ];
    let best = { score: 0, reason: "", matchedLabel: undefined as string | undefined };
    for (const entry of labels) {
      const normalized = normalizeLabel(entry.label);
      const tokens = contentTokens(entry.label);
      const overlap = tokens.filter((token) => queryTokens.has(token)).length;
      let score = 0;
      let reason = "";
      if (normalized === query) [score, reason] = [100, "Exact match"];
      else if (normalized.startsWith(query) && query.length >= 3) [score, reason] = [80, "Starts with your text"];
      else if (overlap && tokens.length) {
        const coverage = overlap / Math.max(tokens.length, 1);
        score = 30 + Math.round(coverage * 40) + overlap * 3;
        reason = coverage >= 0.6 ? "Strong word match" : "Partial word match";
      }
      if (entry.alias) score -= 4;
      if (score > best.score) best = { score, reason, matchedLabel: entry.alias && !entry.hidden ? entry.label : undefined };
    }
    const descriptionOverlap = contentTokens(useCase.description).filter((token) => queryTokens.has(token)).length;
    if (!best.score && descriptionOverlap >= 2) best = { score: 15 + descriptionOverlap * 3, reason: "Matches the description", matchedLabel: undefined };
    else best.score += Math.min(descriptionOverlap, 3);
    if (best.score >= 30 || (best.score >= 15 && best.reason === "Matches the description")) results.push({ useCase, ...best });
  }
  return results.sort((a, b) => b.score - a.score || a.useCase.name.localeCompare(b.useCase.name)).slice(0, options.limit ?? 8);
}

export interface MarketplaceData {
  useCases: UseCase[];
  sources: UseCaseSource[];
  builds: Build[];
  products: Product[];
  implementations: ImplementationRecord[];
  implementationUseCases: ImplementationUseCase[];
  implementationStackItems: ImplementationStackItem[];
  blueprints: Blueprint[];
  blueprintItems: BlueprintStackItem[];
  providers: SolutionProvider[];
  claims?: Claim[];
}

export interface TechnologyBasis {
  productId: string;
  vendorListed: boolean;
  builds: number;
  blueprints: number;
  implementations: number;
}

export interface UseCaseStats {
  builds: Build[];
  implementations: ImplementationRecord[];
  blueprints: Blueprint[];
  technologies: TechnologyBasis[];
  providerIds: string[];
}

const publishedBlueprint = (blueprint: Blueprint) => blueprint.publicationState === "published" && blueprint.moderationState === "approved";

/** Factual supply counts for one Use Case. Vendor statements are sources, never Builds. */
export function getUseCaseStats(useCaseId: string, data: MarketplaceData): UseCaseStats {
  const builds = data.builds.filter((build) => build.useCaseIds.includes(useCaseId) && isIndexableBuild(build, data.useCases));
  const implementationIds = new Set(data.implementationUseCases.filter((link) => link.useCaseId === useCaseId).map((link) => link.implementationId));
  const implementations = data.implementations.filter((record) => implementationIds.has(record.id) && isPublicRecord(record));
  const blueprints = data.blueprints.filter((blueprint) => blueprint.useCaseIds.includes(useCaseId) && publishedBlueprint(blueprint));
  const basis = new Map<string, TechnologyBasis>();
  const entry = (productId: string) => {
    if (!basis.has(productId)) basis.set(productId, { productId, vendorListed: false, builds: 0, blueprints: 0, implementations: 0 });
    return basis.get(productId)!;
  };
  for (const source of data.sources.filter((item) => item.useCaseId === useCaseId && item.sourceType === "technology-vendor"))
    for (const productId of source.productIds) entry(productId).vendorListed = true;
  for (const build of builds) for (const productId of new Set(build.stack.map((item) => item.productId))) entry(productId).builds++;
  for (const blueprint of blueprints)
    for (const productId of new Set(data.blueprintItems.filter((item) => item.blueprintVersionId === blueprint.currentVersionId && item.productId).map((item) => item.productId!)))
      entry(productId).blueprints++;
  for (const record of implementations)
    for (const productId of new Set(data.implementationStackItems.filter((item) => item.implementationId === record.id).map((item) => item.productId)))
      entry(productId).implementations++;
  const technologies = [...basis.values()]
    .filter((item) => data.products.some((product) => product.id === item.productId))
    .sort((a, b) => b.implementations - a.implementations || b.builds - a.builds || Number(b.vendorListed) - Number(a.vendorListed) || a.productId.localeCompare(b.productId));
  const providerIds = new Set<string>();
  for (const build of builds) {
    const provider = providerForCreator(data.providers, build.creatorId);
    if (provider) providerIds.add(provider.id);
  }
  for (const record of implementations)
    for (const implementerId of record.implementerIds) {
      const provider = providerForImplementer(data.providers, implementerId);
      if (provider) providerIds.add(provider.id);
    }
  return { builds, implementations, blueprints, technologies, providerIds: [...providerIds] };
}

/** Facts, not a score: what kind of supply a Build has. */
export type BuildMaturity = "build-only" | "build-blueprint" | "build-evidence";
export function buildMaturity(build: Build, blueprints: Blueprint[], implementations: ImplementationRecord[]): BuildMaturity {
  if (implementations.some((record) => record.sourceBuildId === build.id && isPublicRecord(record))) return "build-evidence";
  if (build.blueprintId && blueprints.some((blueprint) => blueprint.id === build.blueprintId && publishedBlueprint(blueprint))) return "build-blueprint";
  return "build-only";
}
export const maturityLabels: Record<BuildMaturity, string> = {
  "build-only": "Build only",
  "build-blueprint": "Build + Blueprint",
  "build-evidence": "Build + deployment evidence",
};

/** What the Solution Compiler can honestly do for a Use Case. */
export type CompilerCoverage = "catalogue-only" | "blueprint-available" | "evidence-available";
export function compilerCoverage(useCaseId: string, data: Pick<MarketplaceData, "blueprints" | "implementations" | "implementationUseCases">): CompilerCoverage {
  const blueprints = data.blueprints.filter((blueprint) => blueprint.useCaseIds.includes(useCaseId) && publishedBlueprint(blueprint));
  if (!blueprints.length) return "catalogue-only";
  const recordIds = new Set(data.implementationUseCases.filter((link) => link.useCaseId === useCaseId).map((link) => link.implementationId));
  return data.implementations.some((record) => recordIds.has(record.id) && isPublicRecord(record)) ? "evidence-available" : "blueprint-available";
}

export type UseCaseResolution =
  | { kind: "found"; useCase: UseCase }
  | { kind: "redirect"; to: string }
  | { kind: "missing" };

/** Resolve a Use Case slug, following merges and retired-area redirects. */
export function resolveUseCase(slug: string, useCases: UseCase[], redirects: UseCaseRedirect[], categories: UseCaseCategory[]): UseCaseResolution {
  const direct = useCases.find((useCase) => useCase.slug === slug || useCase.id === slug);
  if (direct?.status === "merged" && direct.mergedIntoId) {
    const target = useCases.find((useCase) => useCase.id === direct.mergedIntoId);
    if (target) return { kind: "redirect", to: `/use-cases/${target.slug}` };
  }
  if (direct && isApprovedUseCase(direct)) return { kind: "found", useCase: direct };
  const redirect = redirects.find((item) => item.fromSlug === slug);
  if (redirect?.targetType === "use-case") {
    const target = useCases.find((useCase) => useCase.id === redirect.target);
    if (target) return { kind: "redirect", to: `/use-cases/${target.slug}` };
  }
  if (redirect?.targetType === "category") {
    const category = categories.find((item) => item.id === redirect.target);
    if (category)
      return { kind: "redirect", to: category.level === "category" ? `/use-cases?category=${category.id}` : `/use-cases?category=${category.parentId}&subcategory=${category.id}` };
  }
  return { kind: "missing" };
}

export const taxonomyPath = (useCase: Pick<UseCase, "categoryId" | "subcategoryId">, categories: UseCaseCategory[]) =>
  [useCase.categoryId, useCase.subcategoryId]
    .map((id) => categories.find((category) => category.id === id)?.name)
    .filter(Boolean)
    .join(" › ");

// ───────────── Moderation ─────────────

export interface ModerationResult {
  useCase?: UseCase;
  proposal: UseCaseProposal;
  build?: Build;
  sources: UseCaseSource[];
  aliases: UseCaseAlias[];
  auditAction: string;
}

const now = () => new Date().toISOString();

function attachToBuild(build: Build | undefined, useCaseId: string): Build | undefined {
  if (!build) return undefined;
  const ids = build.useCaseIds.includes(useCaseId) ? build.useCaseIds : [...build.useCaseIds, useCaseId].slice(0, MAX_USE_CASES_PER_BUILD);
  return { ...build, useCaseIds: ids, useCaseProposalId: undefined, updatedAt: now() };
}

/** The proposal describes an existing Use Case: link the Build to it and keep the proposal as provenance. */
export function mapProposal(proposal: UseCaseProposal, target: UseCase, build: Build | undefined, reviewerId: string, note = ""): ModerationResult {
  return {
    proposal: { ...proposal, status: "mapped", resolvedUseCaseId: target.id, reviewedBy: reviewerId, reviewedAt: now(), reviewNote: note },
    build: attachToBuild(build, target.id),
    sources: [],
    aliases: [
      {
        id: `alias-proposal-${proposal.id}`,
        name: proposal.originalText,
        useCaseId: target.id,
        label: proposal.originalText,
        aliasType: "original-source",
        normalizedLabel: normalizeLabel(proposal.originalText),
        language: "en",
        source: `Proposal ${proposal.id}`,
        provenance: proposal.provenance,
      },
    ],
    auditAction: "use-case-proposal-mapped",
  };
}

/** Approve a new Use Case under a reviewed title. The provider's original text stays in the source record. */
export function approveProposal(
  proposal: UseCaseProposal,
  review: { title: string; description: string; categoryId: string; subcategoryId: string },
  build: Build | undefined,
  reviewerId: string,
  existingSlugs: string[],
): ModerationResult {
  const baseSlug = normalizeLabel(review.title).replace(/ /g, "-").slice(0, 80) || "use-case";
  let slug = baseSlug;
  for (let i = 2; existingSlugs.includes(slug); i++) slug = `${baseSlug}-${i}`;
  const useCase: UseCase = {
    id: slug,
    slug,
    name: review.title.trim(),
    description: review.description.trim(),
    outcome: review.title.trim(),
    category: "automation",
    icon: "Sparkles",
    color: "sand",
    stackId: "",
    categoryId: review.categoryId,
    subcategoryId: review.subcategoryId,
    status: "approved",
    originType: "solution-provider-proposed",
    originEntityId: proposal.creatorId,
    createdBy: proposal.proposedBy,
    createdAt: now(),
    updatedAt: now(),
    provenance: proposal.provenance,
  };
  return {
    useCase,
    proposal: { ...proposal, status: "approved", resolvedUseCaseId: useCase.id, reviewedBy: reviewerId, reviewedAt: now() },
    build: attachToBuild(build, useCase.id),
    sources: [
      {
        id: `proposal-source-${proposal.id}`,
        name: `Proposed by ${proposal.creatorId}`,
        useCaseId: useCase.id,
        sourceType: "solution-provider",
        sourceEntityId: proposal.creatorId,
        originalTitle: proposal.originalText,
        originalDescription: proposal.suggestedTitle,
        productIds: [],
        retrievedAt: proposal.createdAt,
        attribution: "Proposed by a Solution Provider while publishing a Build",
        status: "active",
        provenance: proposal.provenance,
      },
    ],
    aliases:
      normalizeLabel(proposal.originalText) === normalizeLabel(useCase.name)
        ? []
        : [
            {
              id: `alias-proposal-${proposal.id}`,
              name: proposal.originalText,
              useCaseId: useCase.id,
              label: proposal.originalText,
              aliasType: "original-source",
              normalizedLabel: normalizeLabel(proposal.originalText),
              language: "en",
              source: `Proposal ${proposal.id}`,
              provenance: proposal.provenance,
            },
          ],
    auditAction: "use-case-proposal-approved",
  };
}

export function rejectProposal(proposal: UseCaseProposal, build: Build | undefined, reviewerId: string, note: string): ModerationResult {
  return {
    proposal: { ...proposal, status: "rejected", reviewedBy: reviewerId, reviewedAt: now(), reviewNote: note },
    build: build ? { ...build, useCaseProposalId: undefined, updatedAt: now() } : undefined,
    sources: [],
    aliases: [],
    auditAction: "use-case-proposal-rejected",
  };
}

export interface MergeResult {
  from: UseCase;
  builds: Build[];
  sources: UseCaseSource[];
  aliases: UseCaseAlias[];
  redirect: UseCaseRedirect;
}

/**
 * Merge `from` into `into`: Build links move (duplicates collapse, the primary stays
 * first), sources and aliases are re-pointed, the old title becomes an alternate label
 * and the old slug redirects. Nothing is deleted.
 */
export function mergeUseCases(from: UseCase, into: UseCase, data: { builds: Build[]; sources: UseCaseSource[]; aliases: UseCaseAlias[] }): MergeResult {
  if (from.id === into.id) throw new Error("A Use Case cannot be merged into itself.");
  const builds = data.builds
    .filter((build) => build.useCaseIds.includes(from.id))
    .map((build) => ({
      ...build,
      useCaseIds: [...new Set(build.useCaseIds.map((id) => (id === from.id ? into.id : id)))],
      updatedAt: now(),
    }));
  return {
    from: { ...from, status: "merged", mergedIntoId: into.id, updatedAt: now() },
    builds,
    sources: data.sources.filter((source) => source.useCaseId === from.id).map((source) => ({ ...source, useCaseId: into.id })),
    aliases: [
      ...data.aliases.filter((alias) => alias.useCaseId === from.id).map((alias) => ({ ...alias, useCaseId: into.id })),
      {
        id: `alias-merged-${from.id}`,
        name: from.name,
        useCaseId: into.id,
        label: from.name,
        aliasType: "alternate",
        normalizedLabel: normalizeLabel(from.name),
        language: "en",
        source: `Merged from ${from.slug}`,
        provenance: from.provenance,
      },
    ],
    redirect: { id: from.slug, name: from.slug, fromSlug: from.slug, targetType: "use-case", target: into.id, reason: "merged", provenance: from.provenance },
  };
}

/** Supply rows for the provider dashboard. Factual counts only — never framed as demand. */
export function supplyGaps(data: MarketplaceData) {
  return approvedUseCases(data.useCases)
    .map((useCase) => {
      const stats = getUseCaseStats(useCase.id, data);
      return { useCase, builds: stats.builds.length, technologies: stats.technologies.length, implementations: stats.implementations.length };
    })
    .sort((a, b) => a.builds - b.builds || b.technologies - a.technologies || a.useCase.name.localeCompare(b.useCase.name));
}
