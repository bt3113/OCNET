import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, EmptyState, Skeleton } from "../components/ui";
import { useMarketplaceSearch } from "../data/search-hook";
import type { SearchType } from "../data/search";

const types: Array<"All" | SearchType> = [
  "All",
  "Implementation",
  "Blueprint",
  "Use case",
  "Technology",
  "Implementer",
  "Build",
  "Provider",
  "Creator",
  "Stack",
  "Resource",
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const type = (params.get("type") ?? "All") as "All" | SearchType;
  const results = useMarketplaceSearch(q, type === "All" ? undefined : type);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && value !== "All") next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <>
      <PageHeading
        eyebrow="SEARCH THE EVIDENCE GRAPH"
        title="Search outcomes, implementations, Blueprints and technology."
        description="Keyword and entity search stays separate from the Solution Compiler. Search retrieves recorded information; the compiler evaluates structured constraints."
      />
      <div className="card unified-search-bar">
        <div className="filter-search">
          <SearchIcon size={21} />
          <input
            autoFocus
            aria-label="Search Oracnet"
            value={q}
            onChange={(event) => set("q", event.target.value)}
            placeholder="Try ‘booking’, ‘property’, ‘Twilio’, or ‘customer support’"
          />
        </div>
        <div className="unified-search-types" aria-label="Search result type">
          {types.map((value) => (
            <button
              type="button"
              key={value}
              className={type === value ? "active" : ""}
              onClick={() => set("type", value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="search-results-heading">
        <div>
          <SlidersHorizontal size={16} />
          <strong>{results.data.length} result{results.data.length === 1 ? "" : "s"}</strong>
        </div>
        <Badge>Organic relevance · no paid ranking</Badge>
      </div>
      {results.isLoading ? (
        <Skeleton />
      ) : results.data.length ? (
        <div className="unified-search-results">
          {results.data.map((result) => (
            <Link className="card unified-search-result" key={`${result.type}-${result.id}`} to={result.path}>
              <span className="search-result-type">{result.type}</span>
              <div>
                <h3>{result.name}</h3>
                <p>{result.description}</p>
                <small>{result.provenance}</small>
              </div>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={q ? "No recorded entities match this query" : "Start with an outcome, technology or implementation"}
          description="Try a broader term or use the Solution Compiler when the question is about what would fit a specific business context."
          to="/solution-compiler"
          action="Open Solution Compiler"
        />
      )}
    </>
  );
}
