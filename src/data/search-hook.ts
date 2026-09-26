import { useRecords } from "../state";
import { useQuery } from "@tanstack/react-query";
import { isSupabase } from "./repository";
import { searchIndex, searchDocuments, type SearchDocument } from "./search";

export function useSearchIndex() {
  const { data: implementations = [] } = useRecords("implementation_records");
  const { data: implementationContexts = [] } = useRecords("implementation_contexts");
  const { data: blueprints = [] } = useRecords("blueprints");
  const { data: blueprintItems = [] } = useRecords("blueprint_stack_items");
  const { data: implementationStackItems = [] } = useRecords("implementation_stack_items");
  const { data: implementationUseCases = [] } = useRecords("implementation_use_cases");
  const { data: claims = [] } = useRecords("claims");
  const { data: builds = [] } = useRecords("builds");
  const { data: products = [] } = useRecords("products");
  const { data: creators = [] } = useRecords("creator_profiles");
  const { data: providers = [] } = useRecords("providers");
  const { data: implementers = [] } = useRecords("integrators");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: stacks = [] } = useRecords("solution_stacks");
  const { data: articles = [] } = useRecords("articles");
  const { data: aliases = [] } = useRecords("use_case_aliases");
  const { data: categories = [] } = useRecords("use_case_categories");
  const { data: useCaseSources = [] } = useRecords("use_case_sources");
  const { data: consultants = [] } = useRecords("consultants");
  return searchDocuments({
    implementations,
    implementationContexts,
    implementationStackItems,
    implementationUseCases,
    claims,
    blueprints,
    blueprintItems,
    builds,
    products,
    creators,
    providers,
    implementers,
    cases,
    stacks,
    articles,
    aliases,
    categories,
    useCaseSources,
    consultants,
  });
}

export function useMarketplaceSearch(query: string, type?: string) {
  const docs = useSearchIndex();
  const remote = useQuery({
    queryKey: ["catalogue-search", query, type],
    enabled: isSupabase,
    queryFn: async () => {
      const { supabase } = await import("./supabase");
      const { data, error } = await supabase.rpc("search_catalogue", {
        query,
        kind: type ?? null,
        result_limit: 100,
      });
      if (error) throw error;
      return data as SearchDocument[];
    },
  });
  return {
    ...remote,
    data: isSupabase ? (remote.data ?? []) : searchIndex(docs, query, type),
  };
}
