import { useMemo } from "react";
import { useRecords } from "../state";
import { solutionProviders } from "./solution-providers";
import type { MarketplaceData } from "./use-case-domain";

/** Loads the marketplace graph (taxonomy, supply and evidence) once per page. */
export function useMarketplace() {
  const queries = {
    useCases: useRecords("use_cases"),
    categories: useRecords("use_case_categories"),
    sources: useRecords("use_case_sources"),
    aliases: useRecords("use_case_aliases"),
    redirects: useRecords("use_case_redirects"),
    proposals: useRecords("use_case_proposals"),
    builds: useRecords("builds"),
    offers: useRecords("build_offers"),
    products: useRecords("products"),
    vendors: useRecords("providers"),
    creators: useRecords("creator_profiles"),
    integrators: useRecords("integrators"),
    consultants: useRecords("consultants"),
    implementations: useRecords("implementation_records"),
    implementationUseCases: useRecords("implementation_use_cases"),
    implementationStackItems: useRecords("implementation_stack_items"),
    contexts: useRecords("implementation_contexts"),
    metrics: useRecords("implementation_metrics"),
    definitions: useRecords("metric_definitions"),
    claims: useRecords("claims"),
    blueprints: useRecords("blueprints"),
    blueprintItems: useRecords("blueprint_stack_items"),
    versions: useRecords("blueprint_versions"),
  };
  const values = Object.values(queries);
  const isLoading = values.some((query) => query.isLoading);
  const isError = values.some((query) => query.isError);
  const creators = queries.creators.data;
  const integrators = queries.integrators.data;
  const consultants = queries.consultants.data;
  const providers = useMemo(() => solutionProviders(creators ?? [], integrators ?? [], consultants ?? []), [creators, integrators, consultants]);
  const data = {
    useCases: queries.useCases.data ?? [],
    categories: queries.categories.data ?? [],
    sources: queries.sources.data ?? [],
    aliases: queries.aliases.data ?? [],
    redirects: queries.redirects.data ?? [],
    proposals: queries.proposals.data ?? [],
    builds: queries.builds.data ?? [],
    offers: queries.offers.data ?? [],
    products: queries.products.data ?? [],
    vendors: queries.vendors.data ?? [],
    creators: creators ?? [],
    integrators: integrators ?? [],
    consultants: consultants ?? [],
    implementations: queries.implementations.data ?? [],
    implementationUseCases: queries.implementationUseCases.data ?? [],
    implementationStackItems: queries.implementationStackItems.data ?? [],
    contexts: queries.contexts.data ?? [],
    metrics: queries.metrics.data ?? [],
    definitions: queries.definitions.data ?? [],
    claims: queries.claims.data ?? [],
    blueprints: queries.blueprints.data ?? [],
    blueprintItems: queries.blueprintItems.data ?? [],
    versions: queries.versions.data ?? [],
    providers,
  };
  const marketplace: MarketplaceData = data;
  return { ...data, marketplace, isLoading, isError, refetch: () => values.forEach((query) => void query.refetch()) };
}
export type MarketplaceState = ReturnType<typeof useMarketplace>;

/** Solution Provider profiles only, for pages that just need to link to them. */
export function useSolutionProviders() {
  const creators = useRecords("creator_profiles").data;
  const integrators = useRecords("integrators").data;
  const consultants = useRecords("consultants").data;
  return useMemo(() => solutionProviders(creators ?? [], integrators ?? [], consultants ?? []), [creators, integrators, consultants]);
}
