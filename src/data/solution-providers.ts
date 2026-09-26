import type { CreatorProfile } from "./build-model";
import type { Integrator, Provider } from "./model";
import type { SolutionProviderType } from "./marketplace-model";

/**
 * Solution Providers: agencies, studios, freelancers, consultancies, systems
 * integrators and independent builders who design, build or deliver solutions.
 *
 * Storage keeps the legacy tables (creator_profiles, integrators, consultants); this
 * adapter presents them as one public concept. Technology Vendors (the `providers`
 * table, e.g. xAI) are a different concept and never appear here.
 */
export interface SolutionProvider {
  /** Canonical public slug. */
  id: string;
  slug: string;
  name: string;
  type: SolutionProviderType;
  headline: string;
  description: string;
  region: string;
  initials: string;
  color: string;
  website?: string;
  creatorId?: string;
  integratorId?: string;
  consultantId?: string;
  /** Old public paths that must keep resolving to this profile. */
  legacyPaths: string[];
  verification: "unverified" | "verified";
  provenance: string;
}

const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const creatorType = (creator: CreatorProfile): SolutionProviderType =>
  creator.providerType ?? (creator.kind === "individual" ? "Independent Builder" : creator.kind === "studio" ? "Studio" : "Agency");

export function solutionProviders(creators: CreatorProfile[], integrators: Integrator[] | Provider[], consultants: Integrator[] | Provider[] = []): SolutionProvider[] {
  const result: SolutionProvider[] = [];
  const taken = new Set<string>();
  const unique = (slug: string) => {
    let value = slug;
    for (let i = 2; taken.has(value); i++) value = `${slug}-${i}`;
    taken.add(value);
    return value;
  };
  for (const creator of creators) {
    const linked = integrators.find((partner) => partner.id === creator.integratorId);
    const slug = unique(creator.slug);
    result.push({
      id: slug,
      slug,
      name: creator.name,
      type: creatorType(creator),
      headline: creator.headline,
      description: creator.bio,
      region: creator.location || linked?.region || "Not stated",
      initials: creator.name.slice(0, 1),
      color: creator.color,
      website: creator.website || undefined,
      creatorId: creator.id,
      integratorId: linked?.id,
      legacyPaths: [`/creators/${creator.slug}`, ...(linked ? [`/implementers/${linked.slug}`, `/integrators/${linked.slug}`] : [])],
      verification: creator.verification,
      provenance: creator.provenance,
    });
  }
  const linkedIds = new Set(creators.map((creator) => creator.integratorId).filter(Boolean));
  for (const partner of integrators as Integrator[]) {
    if (linkedIds.has(partner.id)) continue;
    const slug = unique(slugOf(partner.name));
    result.push({
      id: slug,
      slug,
      name: partner.name,
      type: partner.providerType ?? "Systems Integrator",
      headline: partner.description,
      description: partner.description,
      region: partner.region,
      initials: partner.initials,
      color: partner.color,
      website: partner.website || undefined,
      integratorId: partner.id,
      legacyPaths: [`/implementers/${partner.slug}`, `/integrators/${partner.slug}`],
      verification: "unverified",
      provenance: partner.provenance,
    });
  }
  for (const consultant of consultants as Integrator[]) {
    const slug = unique(slugOf(consultant.name));
    result.push({
      id: slug,
      slug,
      name: consultant.name,
      type: consultant.providerType ?? "Consultancy",
      headline: consultant.description,
      description: consultant.description,
      region: consultant.region,
      initials: consultant.initials,
      color: consultant.color,
      website: consultant.website || undefined,
      consultantId: consultant.id,
      legacyPaths: [`/consultants/${consultant.slug}`],
      verification: "unverified",
      provenance: consultant.provenance,
    });
  }
  return result;
}

/** Resolve a canonical slug, or an old /creators, /implementers, /integrators or /consultants path. */
export function findSolutionProvider(providers: SolutionProvider[], slugOrPath: string) {
  return providers.find((provider) => provider.slug === slugOrPath || provider.legacyPaths.includes(slugOrPath));
}

export const providerForCreator = (providers: SolutionProvider[], creatorId?: string) =>
  creatorId ? providers.find((provider) => provider.creatorId === creatorId) : undefined;

export const providerForImplementer = (providers: SolutionProvider[], integratorId?: string) =>
  integratorId ? providers.find((provider) => provider.integratorId === integratorId) : undefined;

/** A Blueprint maintainer may be recorded as a creator or an implementer id. */
export const providerForMaintainer = (providers: SolutionProvider[], maintainerId?: string) =>
  maintainerId ? providers.find((provider) => provider.creatorId === maintainerId || provider.integratorId === maintainerId || provider.slug === maintainerId) : undefined;
