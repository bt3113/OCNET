import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useRecords } from "../state";
import { filterBuilds, type BuildFilters } from "../data/build-domain";
import { approvedUseCases, isIndexableBuild } from "../data/use-case-domain";
import { useMarketplaceSearch } from "../data/search-hook";
import { PageHeading } from "../components/layout";
import {
  Badge,
  ButtonLink,
  EmptyState,
  ErrorState,
  Modal,
  Pagination,
  Skeleton,
} from "../components/ui";
import { BuildCard } from "../components/builds/cards";
export default function BuildDiscovery() {
  const { pathname } = useLocation();
  const searchPage = pathname === "/search";
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const {
    data: builds = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("builds");
  const { data: products = [] } = useRecords("products");
  const { data: creators = [] } = useRecords("creator_profiles");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: taxonomy = [] } = useRecords("use_case_categories");
  const { data: offers = [] } = useRecords("build_offers");
  const q = params.get("q") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  function set(k: string, v: string) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next, { replace: true });
  }
  const filters = Object.fromEntries(params) as BuildFilters;
  const approvedCases = approvedUseCases(cases).sort((a, b) => a.name.localeCompare(b.name));
  const workCategories = taxonomy.filter((item) => item.level === "category").sort((a, b) => a.sortOrder - b.sortOrder);
  let filtered = filterBuilds(
    builds,
    { ...filters, category: "", q: "" },
    products,
    creators,
    offers,
  )
    .filter((b) => isIndexableBuild(b, cases))
    .filter((b) => !params.get("category") || b.useCaseIds.some((id) => cases.find((useCase) => useCase.id === id)?.categoryId === params.get("category")));
  const search = useMarketplaceSearch(
    q,
    searchPage ? params.get("type") || undefined : "Build",
  );
  const matches = search.data;
  filtered = filtered.filter((b) =>
    matches.some((m) => m.type === "Build" && m.id === b.id),
  );
  filtered.sort((a, b) =>
    params.get("sort") === "name"
      ? a.name.localeCompare(b.name)
      : params.get("sort") === "recent"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : matches.findIndex((m) => m.id === a.id) -
          matches.findIndex((m) => m.id === b.id),
  );
  const control = (
    <div className="build-filter-fields">
      {(
        [
          ["useCase", "Use Case", approvedCases],
          ["category", "Category", workCategories],
          ["technology", "Technology used", products],
          ["creator", "Solution Provider", creators],
          [
            "industry",
            "Industry",
            [...new Set(builds.map((b) => b.industry))].map((s) => ({
              id: s,
              name: s,
            })),
          ],
        ] as const
      ).map(([key, label, rows]) => (
        <label key={key}>
          {label}
          <select
            value={params.get(key) || ""}
            onChange={(e) => set(key, e.target.value)}
          >
            <option value="">Any</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      ))}
      {[
        ["source", "Source available with license"],
        ["remix", "Blueprint remix permitted"],
        ["offer", "Implementation offer available"],
        ["recent", "Updated within 30 days"],
      ].map(([key, label]) => (
        <label className="check-field" key={key}>
          <input
            type="checkbox"
            checked={params.get(key) === "yes"}
            onChange={(e) => set(key, e.target.checked ? "yes" : "")}
          />
          {label}
        </label>
      ))}
      <button className="button light" onClick={() => setParams({})}>
        Clear all filters
      </button>
    </div>
  );
  if (isLoading || search.isLoading) return <Skeleton />;
  if (isError || search.isError)
    return (
      <ErrorState
        retry={() => {
          void refetch();
          void search.refetch();
        }}
      />
    );
  return (
    <>
      <PageHeading
        eyebrow="BUILDS"
        title={
          searchPage
            ? "Search the implementation graph"
            : pathname === "/explore"
              ? "What do you want to build?"
              : "Complete solutions, published by Solution Providers."
        }
        description={
          searchPage
            ? "Connected results across builds, technologies, use cases and the people behind them."
            : "Each Build shows how a solution works and which Use Cases it handles. Deployment evidence is shown separately, on each Build’s Proof tab."
        }
        action={
          <ButtonLink to="/creator/builds/new">
            <Plus size={17} />
            Publish a Build
          </ButtonLink>
        }
      />
      <div className="build-discovery-layout">
        {!searchPage && (
          <aside className="build-filter-sidebar card">
            <h2>Find your starting point</h2>
            {control}
          </aside>
        )}
        <section>
          <div className="card build-search-bar">
            <Search size={20} />
            <input
              aria-label="Search builds"
              placeholder="Try ‘customer support using Claude’"
              value={q}
              onChange={(e) => set("q", e.target.value)}
            />
            <button
              className="button light build-filter-toggle"
              onClick={() => setDrawer(true)}
            >
              <SlidersHorizontal size={17} />
              Filters
            </button>
          </div>
          <div className="row between wrap results-label">
            <span role="status">
              {searchPage ? matches.length : filtered.length}{" "}
              {searchPage ? "matching records" : "builds"}
            </span>
            {searchPage ? null : (
              <label>
                Sort builds
                <select
                  value={params.get("sort") || "relevance"}
                  onChange={(e) => set("sort", e.target.value)}
                >
                  <option value="relevance">Relevance & completeness</option>
                  <option value="recent">Recently updated</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            )}
          </div>
          <div className="active-filters">
            {[...params]
              .filter(([k]) => !["page", "q", "sort", "type"].includes(k))
              .map(([k, v]) => (
                <button key={k} onClick={() => set(k, "")}>
                  {k}: {v}
                  <X size={13} />
                </button>
              ))}
          </div>
          <p className="ranking-note">
            {searchPage
              ? "Keyword matching across connected records."
              : "Ordered by relevance and blueprint completeness."}{" "}
            No paid ranking. Sample builds are clearly labelled.
          </p>
          {searchPage ? (
            <div className="search-result-list">
              {matches.slice((page - 1) * 12, page * 12).map((r) => (
                <Link className="card search-result" key={r.path} to={r.path}>
                  <Badge>
                    {r.type} · {r.provenance}
                  </Badge>
                  <h2>{r.name}</h2>
                  <p>{r.description}</p>
                  <span>Explore {r.type.toLowerCase()} →</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="build-grid discovery-grid">
              {filtered.slice((page - 1) * 6, page * 6).map((b) => (
                <BuildCard key={b.id} build={b} />
              ))}
            </div>
          )}
          {!(searchPage ? matches : filtered).length && (
            <EmptyState
              title="No matches yet"
              description="Try fewer filters, a technology name, or a broader outcome."
              to="/builds"
              action="Explore all builds"
            />
          )}
          <Pagination
            page={page}
            count={Math.ceil(
              (searchPage ? matches.length : filtered.length) /
                (searchPage ? 12 : 6),
            )}
            onChange={(n) => set("page", String(n))}
          />
        </section>
      </div>
      <Modal
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Filter builds"
        description="Combine technologies, outcomes and reuse permissions."
      >
        {control}
        <button className="button dark" onClick={() => setDrawer(false)}>
          Show {filtered.length} builds
        </button>
      </Modal>
    </>
  );
}
