import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Search as SearchIcon } from "lucide-react";
import { PageHeading } from "../components/layout";
import { ButtonLink, Skeleton } from "../components/ui";
import { EmptyMarketplaceState, plural } from "../components/marketplace";
import { useMarketplaceSearch } from "../data/search-hook";
import { primarySearchTypes, secondarySearchTypes, type SearchDocument, type SearchType } from "../data/search";

const typeLabels: Record<SearchType, string> = {
  "Use Case": "Use Cases",
  Build: "Builds",
  Technology: "Technologies",
  "Solution Provider": "Solution Providers",
  Implementation: "Implementations",
  Blueprint: "Blueprints",
  "Technology Vendor": "Technology Vendors",
  Stack: "Solution patterns",
  Resource: "Resources",
};

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const type = params.get("type") as SearchType | null;
  const results = useMarketplaceSearch(q, type ?? undefined);
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  const groups = [...primarySearchTypes, ...secondarySearchTypes]
    .map((kind) => ({ kind, items: results.data.filter((item) => item.type === kind) }))
    .filter((group) => group.items.length);
  const typeButton = (value: SearchType | "") => (
    <button type="button" key={value || "all"} className={(type ?? "") === value ? "active" : ""} aria-pressed={(type ?? "") === value} onClick={() => set("type", value)}>
      {value ? typeLabels[value] : "Everything"}
    </button>
  );
  return (
    <>
      <PageHeading eyebrow="SEARCH" title="Search Use Cases, Builds, technologies and providers." description="Search finds what is published. To check a structured requirement against published Blueprints, use Find a solution." />
      <div className="card unified-search-bar">
        <div className="filter-search">
          <SearchIcon size={21} aria-hidden />
          <input autoFocus aria-label="Search Oracnet" value={q} onChange={(event) => set("q", event.target.value)} placeholder="Try “invoice chasing”, “booking”, “Grok” or “Northstar”" />
        </div>
        <div className="unified-search-types" role="group" aria-label="Result type">
          {typeButton("")}
          {primarySearchTypes.map(typeButton)}
          <span className="search-type-divider" aria-hidden />
          {secondarySearchTypes.map(typeButton)}
        </div>
      </div>
      <p className="search-results-heading" role="status">
        <strong>{plural(results.data.length, "result")}</strong> <span className="muted">· organic relevance, no paid ranking</span>
      </p>
      {results.isLoading ? (
        <Skeleton />
      ) : groups.length ? (
        <div className="unified-search-results">
          {groups.map((group) => (
            <section key={group.kind} aria-labelledby={`results-${group.kind}`}>
              <h2 id={`results-${group.kind}`} className="tab-section-title">
                {typeLabels[group.kind]} <span className="muted">({group.items.length})</span>
              </h2>
              {group.items.map((result: SearchDocument) => (
                <Link className="card unified-search-result" key={`${result.type}-${result.id}`} to={result.path}>
                  <span className="search-result-type">{result.type}</span>
                  <div>
                    <h3>{result.name}</h3>
                    <p>{result.description}</p>
                  </div>
                  <ArrowRight size={18} aria-hidden />
                </Link>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <EmptyMarketplaceState
          title={q ? `Nothing published matches “${q}”` : "Search for the work you need done"}
          description={q ? "Try fewer or different words, browse Use Cases by category, or post a project so Solution Providers can respond." : "Start with a piece of work, a technology or a provider name."}
          actions={
            <>
              <ButtonLink to="/use-cases" variant="light">
                Browse Use Cases
              </ButtonLink>
              <ButtonLink to="/app/projects/new" variant="light">
                Post a project
              </ButtonLink>
            </>
          }
        />
      )}
    </>
  );
}
