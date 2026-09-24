import type { Build, CreatorProfile } from "./build-model";
import type {
  Product,
  Provider,
  UseCase,
  SolutionStack,
  Article,
} from "./model";
import { isPublicBuild, completeness } from "./build-domain";
export type SearchType =
  | "Build"
  | "Technology"
  | "Use case"
  | "Creator"
  | "Provider"
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
  builds: Build[];
  products: Product[];
  creators: CreatorProfile[];
  providers: Provider[];
  cases: UseCase[];
  stacks: SolutionStack[];
  articles: Article[];
}
export function searchDocuments(c: SearchCatalogue): SearchDocument[] {
  return [
    ...c.builds.filter(isPublicBuild).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.tagline,
      text: [
        b.description,
        b.industry,
        ...b.capabilityIds,
        ...b.stack.map(
          (s) => c.products.find((p) => p.id === s.productId)?.name ?? "",
        ),
        ...b.useCaseIds.map((i) => c.cases.find((u) => u.id === i)?.name ?? ""),
        c.creators.find((x) => x.id === b.creatorId)?.name ?? "",
      ].join(" "),
      type: "Build" as const,
      path: "/builds/" + b.slug,
      updatedAt: b.updatedAt,
      completeness: completeness(b),
      provenance: b.provenance,
    })),
    ...c.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      text: [
        ...p.capabilityIds,
        p.category,
        c.providers.find((v) => v.id === p.providerId)?.name,
      ].join(" "),
      type: "Technology" as const,
      path: "/technologies/" + p.slug,
      completeness: 50,
      provenance: p.provenance,
    })),
    ...c.cases.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      text: p.outcome,
      type: "Use case" as const,
      path: "/use-cases/" + p.slug,
      completeness: 50,
      provenance: p.provenance,
    })),
    ...c.creators.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.headline,
      text: [
        p.bio,
        ...p.expertise,
        ...p.technologyIds.map(
          (i) => c.products.find((x) => x.id === i)?.name ?? "",
        ),
      ].join(" "),
      type: "Creator" as const,
      path: "/creators/" + p.slug,
      completeness: 50,
      provenance: p.provenance,
    })),
    ...c.providers.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      text: p.specialties.join(" "),
      type: "Provider" as const,
      path: "/providers/" + p.slug,
      completeness: 50,
      provenance: p.provenance,
    })),
    ...c.stacks.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      text: p.items
        .map((i) => c.products.find((x) => x.id === i.productId)?.name ?? "")
        .join(" "),
      type: "Stack" as const,
      path: "/solution-stacks/" + p.slug,
      completeness: 50,
      provenance: p.provenance,
    })),
    ...c.articles.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      text: p.body,
      type: "Resource" as const,
      path: "/resources/" + p.slug,
      completeness: 50,
      provenance: p.provenance,
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
      ?.filter((t) => !stop.has(t)) ?? [];
  return docs
    .filter((d) => !type || d.type === type)
    .map((d) => {
      const name = d.name.toLowerCase(),
        text = [d.name, d.description, d.text].join(" ").toLowerCase();
      const matches = terms.filter((t) => text.includes(t)).length;
      const exact = name === query.toLowerCase() ? 100 : 0;
      const score =
        exact +
        terms.reduce(
          (n, t) => n + (name.includes(t) ? 12 : text.includes(t) ? 5 : 0),
          0,
        ) +
        (d.type === "Build" ? 2 : 0) +
        d.completeness / 100;
      return { ...d, score, matches };
    })
    .filter((d) => !terms.length || d.matches === terms.length)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") ||
        a.name.localeCompare(b.name),
    );
}
