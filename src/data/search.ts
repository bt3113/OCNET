import type { Build, CreatorProfile } from "./build-model";
import type {
  Product,
  Provider,
  UseCase,
  SolutionStack,
  Article,
} from "./model";
import type {
  Blueprint,
  BlueprintStackItem,
  Claim,
  ImplementationContext,
  ImplementationRecord,
  ImplementationStackItem,
  ImplementationUseCase,
} from "./intelligence-model";
import { capabilityLabel } from "./taxonomy";
import { evidenceLevelInfo } from "./evidence";
import { rightsCatalogue } from "./rights";
import { isPublicBuild, completeness } from "./build-domain";
export type SearchType =
  | "Implementation"
  | "Blueprint"
  | "Build"
  | "Technology"
  | "Use case"
  | "Creator"
  | "Provider"
  | "Implementer"
  | "Stack"
  | "Resource";
export interface SearchDocument {
  id: string;
  name: string;
  description: string;
  text: string;
  type: SearchType;
  path: string;
  updatedAt?: string;
  completeness: number;
  provenance: string;
  /** Last evidence review / validation date (ISO) where applicable. */
  reviewedAt?: string;
}
export interface SearchCatalogue {
  implementations?: ImplementationRecord[];
  implementationContexts?: ImplementationContext[];
  implementationStackItems?: ImplementationStackItem[];
  implementationUseCases?: ImplementationUseCase[];
  claims?: Claim[];
  blueprints?: Blueprint[];
  blueprintItems?: BlueprintStackItem[];
  builds: Build[];
  products: Product[];
  creators: CreatorProfile[];
  providers: Provider[];
  implementers?: Provider[];
  cases: UseCase[];
  stacks: SolutionStack[];
  articles: Article[];
}
export function searchDocuments(c: SearchCatalogue): SearchDocument[] {
  const implementations = c.implementations ?? [];
  const implementationContexts = c.implementationContexts ?? [];
  const blueprints = c.blueprints ?? [];
  const implementers = c.implementers ?? [];
  return [
    ...implementations
      .filter(
        (implementation) =>
          implementation.publicationState === "published" &&
          implementation.moderationState === "approved" &&
          implementation.visibility === "public",
      )
      .map((implementation) => {
        const context = implementationContexts.find(
          (item) => item.implementationId === implementation.id,
        );
        const completenessScore = [
          implementation.summary,
          implementation.contextSummary,
          implementation.implementationDuration,
          context?.volumeLabel,
          implementation.lastEvidenceReviewAt,
        ].filter(Boolean).length;
        return {
          id: implementation.id,
          name: implementation.name,
          description: implementation.summary,
          text: [
            implementation.industry,
            implementation.businessType,
            implementation.organizationSizeBand,
            implementation.region,
            implementation.contextSummary,
            implementation.problemStatement,
            evidenceLevelInfo[implementation.verificationState].label,
            context?.existingSystems.join(" "),
            context?.workflowCharacteristics.join(" "),
            ...(c.implementationStackItems ?? [])
              .filter((item) => item.implementationId === implementation.id)
              .flatMap((item) => [c.products.find((product) => product.id === item.productId)?.name ?? "", capabilityLabel(item.capabilityId)]),
            ...(c.implementationUseCases ?? [])
              .filter((link) => link.implementationId === implementation.id)
              .map((link) => c.cases.find((useCase) => useCase.id === link.useCaseId)?.name ?? ""),
            ...[...new Set((c.claims ?? []).filter((claim) => claim.public && (claim.subjectId === implementation.id || claim.subjectId.startsWith(`${implementation.id}-`))).map((claim) => evidenceLevelInfo[claim.evidenceLevel].label))],
          ].join(" "),
          type: "Implementation" as const,
          path: "/implementations/" + implementation.slug,
          updatedAt: implementation.updatedAt,
          reviewedAt: implementation.lastEvidenceReviewAt,
          completeness: Math.min(100, completenessScore * 16),
          provenance: implementation.provenance,
        };
      }),
    ...blueprints
      .filter(
        (blueprint) =>
          blueprint.publicationState === "published" &&
          blueprint.moderationState === "approved",
      )
      .map((blueprint) => ({
        id: blueprint.id,
        name: blueprint.name,
        description: blueprint.description,
        text: [
          ...blueprint.capabilityIds.map(capabilityLabel),
          ...(blueprint.capabilityIds.includes("human-escalation") ? ["human approval review exception"] : []),
          ...(c.blueprintItems ?? [])
            .filter((item) => item.blueprintVersionId === blueprint.currentVersionId)
            .flatMap((item) => [item.productId, ...item.alternativeProductIds].map((id) => c.products.find((product) => product.id === id)?.name ?? "")),
          ...blueprint.requiredSkills,
          rightsCatalogue[blueprint.reuseRights].label,
          blueprint.estimatedComplexity,
          blueprint.knownLimitations,
          blueprint.compatibilityState,
        ].join(" "),
        type: "Blueprint" as const,
        path: "/blueprints/" + blueprint.slug,
        updatedAt: blueprint.updatedAt,
        reviewedAt: blueprint.lastValidatedAt,
        completeness: 75,
        provenance: blueprint.provenance,
      })),
    ...c.builds.filter(isPublicBuild).map((build) => ({
      id: build.id,
      name: build.name,
      description: build.tagline,
      text: [
        build.description,
        build.industry,
        ...build.capabilityIds,
        ...build.stack.map(
          (item) => c.products.find((product) => product.id === item.productId)?.name ?? "",
        ),
        ...build.useCaseIds.map(
          (id) => c.cases.find((useCase) => useCase.id === id)?.name ?? "",
        ),
        c.creators.find((creator) => creator.id === build.creatorId)?.name ?? "",
      ].join(" "),
      type: "Build" as const,
      path: "/builds/" + build.slug,
      updatedAt: build.updatedAt,
      completeness: completeness(build),
      provenance: build.provenance,
    })),
    ...c.products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      text: [
        ...product.capabilityIds,
        product.category,
        c.providers.find((provider) => provider.id === product.providerId)?.name,
      ].join(" "),
      type: "Technology" as const,
      path: "/technologies/" + product.slug,
      completeness: 50,
      provenance: product.provenance,
    })),
    ...c.cases.map((useCase) => ({
      id: useCase.id,
      name: useCase.name,
      description: useCase.description,
      text: useCase.outcome,
      type: "Use case" as const,
      path: "/use-cases/" + useCase.slug,
      completeness: 50,
      provenance: useCase.provenance,
    })),
    ...c.creators.map((creator) => ({
      id: creator.id,
      name: creator.name,
      description: creator.headline,
      text: [
        creator.bio,
        ...creator.expertise,
        ...creator.technologyIds.map(
          (id) => c.products.find((product) => product.id === id)?.name ?? "",
        ),
      ].join(" "),
      type: "Creator" as const,
      path: "/creators/" + creator.slug,
      completeness: 50,
      provenance: creator.provenance,
    })),
    ...c.providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      text: provider.specialties.join(" "),
      type: "Provider" as const,
      path: "/providers/" + provider.slug,
      completeness: 50,
      provenance: provider.provenance,
    })),
    ...implementers.map((provider) => ({
      id: `implementer-${provider.id}`,
      name: provider.name,
      description: provider.description,
      text: [provider.region, ...provider.specialties].join(" "),
      type: "Implementer" as const,
      path: "/integrators/" + provider.slug,
      completeness: 50,
      provenance: provider.provenance,
    })),
    ...c.stacks.map((stack) => ({
      id: stack.id,
      name: stack.name,
      description: stack.description,
      text: stack.items
        .map(
          (item) =>
            c.products.find((product) => product.id === item.productId)?.name ?? "",
        )
        .join(" "),
      type: "Stack" as const,
      path: "/solution-stacks/" + stack.slug,
      completeness: 50,
      provenance: stack.provenance,
    })),
    ...c.articles.map((article) => ({
      id: article.id,
      name: article.name,
      description: article.description,
      text: article.body,
      type: "Resource" as const,
      path: "/resources/" + article.slug,
      completeness: 50,
      provenance: article.provenance,
    })),
  ];
}
const stop = new Set(["a", "an", "the", "to", "for", "using", "use", "uses", "with", "and", "i", "want", "can", "who", "people", "me", "show", "of", "in", "that", "my", "our", "we", "this", "year"]);

/** Tiny deterministic stemmer: good enough to align "automate"/"automation", "calls"/"call". */
export function stem(word: string) {
  let value = word.toLowerCase();
  for (const suffix of ["ions", "ion", "ing", "ies", "es", "ed", "s", "e"]) {
    if (value.length - suffix.length >= 4 && value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length) + (suffix === "ies" ? "y" : "");
      break;
    }
  }
  return value;
}

const synonyms: Record<string, string[]> = {
  restaurant: ["hospitality", "reservation"],
  restaurants: ["hospitality", "reservation"],
  hotel: ["hospitality"],
  salon: ["beauty"],
  plumber: ["plumbing", "trades"],
  crm: ["hubspot", "pipedrive"],
  enquiry: ["inquiry", "lead"],
  inquiry: ["enquiry"],
  booking: ["reservation", "appointment"],
  "customer-attested": ["customer attested"],
};

const typeWords: Record<string, SearchType> = {
  implementation: "Implementation",
  implementations: "Implementation",
  blueprint: "Blueprint",
  blueprints: "Blueprint",
  technology: "Technology",
  technologies: "Technology",
  implementer: "Implementer",
  implementers: "Implementer",
};

const tokenize = (text: string) => (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).map(stem);

export function parseQuery(query: string, now = new Date()) {
  let rest = query.toLowerCase();
  let reviewedYear: number | undefined;
  const reviewed = rest.match(/reviewed (this year|in (\d{4}))/);
  if (reviewed) {
    reviewedYear = reviewed[2] ? Number(reviewed[2]) : now.getFullYear();
    rest = rest.replace(reviewed[0], " ");
  }
  let impliedType: SearchType | undefined;
  const words = (rest.match(/[a-z0-9-]+/g) ?? []).filter((word) => {
    if (typeWords[word] && !impliedType) {
      impliedType = typeWords[word];
      return false;
    }
    return !stop.has(word);
  });
  const groups = words.map((word) => [...new Set([word, ...(synonyms[word] ?? [])].flatMap((term) => tokenize(term)))]);
  /** Evidence qualifiers narrow results; they are never optional terms. */
  const required = words.filter((word) => /attest|audit|verified/.test(word)).map((word) => tokenize(word).filter((token) => !["customer", "independ"].includes(token)));
  return { groups: groups.filter((group) => group.length), required: required.filter((group) => group.length), reviewedYear, impliedType };
}

/**
 * Deterministic local search (demo mode). A document matches when at least 60%
 * of the query's term groups match (a group is a word plus its synonyms).
 * Ranking is organic: name matches, term coverage, then recency. No paid boost.
 */
export function searchIndex(docs: SearchDocument[], query: string, type?: string, now = new Date()) {
  const { groups, required, reviewedYear, impliedType } = parseQuery(query, now);
  const effectiveType = type ?? impliedType;
  const needed = Math.ceil(groups.length * 0.6);
  return docs
    .filter((document) => !effectiveType || document.type === effectiveType)
    .filter((document) => !reviewedYear || (document.reviewedAt ?? "").startsWith(String(reviewedYear)))
    .map((document) => {
      const nameTokens = new Set(tokenize(document.name));
      const allTokens = new Set(tokenize([document.name, document.description, document.text].join(" ")));
      const matched = groups.filter((group) => group.some((term) => allTokens.has(term)));
      const nameHits = groups.filter((group) => group.some((term) => nameTokens.has(term))).length;
      const exact = document.name.toLowerCase() === query.toLowerCase().trim() ? 100 : 0;
      const score = exact + nameHits * 12 + matched.length * 6 + document.completeness / 100;
      return { ...document, score, matches: matched.length };
    })
    .filter((document) => !groups.length || document.matches >= needed)
    .filter((document) => {
      const tokens = new Set(tokenize([document.name, document.description, document.text].join(" ")));
      return required.every((group) => group.every((term) => tokens.has(term)));
    })
    .sort((a, b) => b.score - a.score || (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || a.name.localeCompare(b.name));
}
