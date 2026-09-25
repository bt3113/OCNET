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
  ImplementationContext,
  ImplementationRecord,
} from "./intelligence-model";
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
}
export interface SearchCatalogue {
  implementations: ImplementationRecord[];
  implementationContexts: ImplementationContext[];
  blueprints: Blueprint[];
  builds: Build[];
  products: Product[];
  creators: CreatorProfile[];
  providers: Provider[];
  implementers: Provider[];
  cases: UseCase[];
  stacks: SolutionStack[];
  articles: Article[];
}
export function searchDocuments(c: SearchCatalogue): SearchDocument[] {
  return [
    ...c.implementations
      .filter(
        (implementation) =>
          implementation.publicationState === "published" &&
          implementation.moderationState === "approved" &&
          implementation.visibility === "public",
      )
      .map((implementation) => {
        const context = c.implementationContexts.find(
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
            implementation.verificationState,
            context?.existingSystems.join(" "),
            context?.workflowCharacteristics.join(" "),
          ].join(" "),
          type: "Implementation" as const,
          path: "/implementations/" + implementation.slug,
          updatedAt: implementation.updatedAt,
          completeness: Math.min(100, completenessScore * 16),
          provenance: implementation.provenance,
        };
      }),
    ...c.blueprints
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
          ...blueprint.capabilityIds,
          ...blueprint.requiredSkills,
          blueprint.reuseRights,
          blueprint.estimatedComplexity,
          blueprint.knownLimitations,
          blueprint.compatibilityState,
        ].join(" "),
        type: "Blueprint" as const,
        path: "/blueprints/" + blueprint.slug,
        updatedAt: blueprint.updatedAt,
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
    ...c.implementers.map((provider) => ({
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
const stop = new Set([
  "a",
  "an",
  "the",
  "to",
  "for",
  "using",
  "with",
  "and",
  "i",
  "want",
  "can",
  "who",
  "people",
  "me",
  "show",
  "projects",
  "build",
  "builds",
]);
export function searchIndex(
  docs: SearchDocument[],
  query: string,
  type?: string,
) {
  const terms =
    query
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((term) => !stop.has(term)) ?? [];
  return docs
    .filter((document) => !type || document.type === type)
    .map((document) => {
      const name = document.name.toLowerCase();
      const text = [document.name, document.description, document.text]
        .join(" ")
        .toLowerCase();
      const matches = terms.filter((term) => text.includes(term)).length;
      const exact = name === query.toLowerCase() ? 100 : 0;
      const score =
        exact +
        terms.reduce(
          (total, term) =>
            total + (name.includes(term) ? 12 : text.includes(term) ? 5 : 0),
          0,
        ) +
        (document.type === "Implementation" ? 2 : 0) +
        document.completeness / 100;
      return { ...document, score, matches };
    })
    .filter((document) => !terms.length || document.matches === terms.length)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") ||
        a.name.localeCompare(b.name),
    );
}
