import { useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, ArrowRight } from "lucide-react";
import { useRecords } from "../state";
import { PageHeading } from "../components/layout";
import {
  TechnologyCard,
  ProviderCard,
  UseCaseCard,
  CategoryCard,
  SolutionStackCard,
  Pagination,
  EmptyState,
  ErrorState,
  Skeleton,
  Modal,
  ButtonLink,
  Badge,
} from "../components/ui";
export default function Discovery() {
  const location = useLocation();
  const path = location.pathname.split("/")[1];
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const query = params.get("q") || "";
  const category = params.get("category") || "";
  const deployment = params.get("deployment") || "";
  const region = params.get("region") || "";
  const sort = params.get("sort") || "recommended";
  const page = Number(params.get("page") || 1);
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("products");
  const { data: categories = [] } = useRecords("categories");
  const { data: providers = [] } = useRecords("providers");
  const { data: integrators = [] } = useRecords("integrators");
  const { data: consultants = [] } = useRecords("consultants");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: stacks = [] } = useRecords("solution_stacks");
  const titles: Record<string, [string, string]> = {
    explore: [
      "What do you want to achieve?",
      "Start with an outcome. Discover the tools and partners to get there.",
    ],
    search: [
      "Search the ecosystem",
      "Find the capabilities, technologies, and people for your next idea.",
    ],
    technologies: [
      "Technology, with possibility",
      "Explore products and platforms for what you want to build.",
    ],
    marketplace: [
      "The technology marketplace",
      "Find the right tools. Understand your options. Build with confidence.",
    ],
    providers: [
      "Meet the technology providers",
      "Explore the companies behind your next technology stack.",
    ],
    integrators: [
      "Find your implementation partner",
      "Connect with specialists who help turn technology into working solutions.",
    ],
    consultants: [
      "Independent expertise",
      "Find advice for your technology decisions and implementation plans.",
    ],
    "use-cases": [
      "Start with what you want to achieve",
      "From business challenge to practical solution stack.",
    ],
    "solution-stacks": [
      "Better together. Built for an outcome.",
      "Explore capability maps that connect the pieces of your next idea.",
    ],
    categories: [
      "Explore by category",
      "A connected ecosystem of technology and expertise.",
    ],
  };
  const [title, description] = titles[path] || titles.explore;
  const providerType = ["providers", "integrators", "consultants"].includes(
    path,
  );
  const source =
    path === "providers"
      ? providers
      : path === "integrators"
        ? integrators
        : consultants;
  const filteredProducts = products
    .filter(
      (p) =>
        (p.name + " " + p.description + " " + p.capabilityIds.join(" "))
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (!category || p.category === category) &&
        (!deployment || p.deployment === deployment),
    )
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : 0));
  const filteredProviders = source
    .filter(
      (p) =>
        (p.name + " " + p.description)
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (!region || p.region === region) &&
        (!category || p.category === category),
    )
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : 0));
  const filteredCases = cases.filter(
    (p) =>
      (p.name + " " + p.description)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!category || p.category === category),
  );
  const filters = (
    <div className="filter-controls">
      <label>
        Category
        <select
          value={category}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {providerType ? (
        <label>
          Region
          <select
            value={region}
            onChange={(e) => set("region", e.target.value)}
          >
            <option value="">All regions</option>
            {["Global", "Europe", "North America"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Deployment
          <select
            value={deployment}
            onChange={(e) => set("deployment", e.target.value)}
          >
            <option value="">Any deployment</option>
            <option>Cloud</option>
            <option>Hybrid</option>
          </select>
        </label>
      )}
      <label>
        Sort by
        <select value={sort} onChange={(e) => set("sort", e.target.value)}>
          <option value="recommended">Discovery order</option>
          <option value="name">Name A–Z</option>
        </select>
      </label>
      <button className="button light" onClick={() => setParams({})}>
        <X size={15} />
        Clear filters
      </button>
    </div>
  );
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;
  return (
    <>
      <PageHeading
        eyebrow="DISCOVER THE ECOSYSTEM"
        title={title}
        description={description}
      />
      {path === "explore" && (
        <div className="explore-banner">
          <div>
            <Badge>USE-CASE FIRST</Badge>
            <h2>
              Tell us your outcome.
              <br />
              Find your starting point.
            </h2>
            <p>
              Explore a solution stack, compare suppliers, or share a project
              brief.
            </p>
            <ButtonLink to="/use-cases">
              Explore use cases
              <ArrowRight size={18} />
            </ButtonLink>
          </div>
          <div className="orbit-art">
            <span>Outcome</span>
            <span>Capabilities</span>
            <span>Technology</span>
          </div>
        </div>
      )}
      <div className="filter-bar card">
        <div className="filter-search">
          <Search size={20} />
          <input
            aria-label="Filter results"
            placeholder="Search by name, capability, or outcome…"
            value={query}
            onChange={(e) => set("q", e.target.value)}
          />
          <button
            className="button light filter-toggle"
            onClick={() => setDrawer(true)}
          >
            <SlidersHorizontal size={18} />
            Filters
          </button>
        </div>
        <div className="desktop-filters">{filters}</div>
      </div>
      <Modal
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Refine your discovery"
        description="Combine filters to narrow your options."
      >
        {filters}
        <button className="button dark" onClick={() => setDrawer(false)}>
          Show results
          <ArrowRight size={17} />
        </button>
      </Modal>
      <div className="results-label">
        <span>
          {providerType
            ? filteredProviders.length
            : path === "use-cases"
              ? filteredCases.length
              : path === "categories"
                ? categories.length
                : path === "solution-stacks"
                  ? stacks.length
                  : filteredProducts.length}{" "}
          {providerType ? "partners" : "results"}
        </span>
        <Badge>Sample catalogue · no paid ranking</Badge>
      </div>
      {path === "categories" ? (
        <div className="grid four">
          {categories
            .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
            .map((c) => (
              <CategoryCard item={c} key={c.id} />
            ))}
        </div>
      ) : path === "use-cases" ? (
        <div className="usecase-grid">
          {filteredCases.map((c) => (
            <UseCaseCard item={c} key={c.id} />
          ))}
        </div>
      ) : path === "solution-stacks" ? (
        <div className="grid three">
          {stacks
            .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
            .map((s) => (
              <SolutionStackCard stack={s} key={s.id} />
            ))}
        </div>
      ) : providerType ? (
        <>
          <div className="grid two">
            {filteredProviders.slice((page - 1) * 8, page * 8).map((p) => (
              <ProviderCard provider={p} key={p.id} type={path} />
            ))}
          </div>
          {!filteredProviders.length && (
            <EmptyState
              title="No partners match these filters"
              description="Try another category or clear your search."
            />
          )}
          <Pagination
            page={page}
            count={Math.ceil(filteredProviders.length / 8)}
            onChange={(p) => set("page", String(p))}
          />
        </>
      ) : (
        <>
          {path === "search" && filteredCases.length > 0 && (
            <>
              <h2 className="subheading">Matching use cases</h2>
              <div className="usecase-grid">
                {filteredCases.slice(0, 3).map((c) => (
                  <UseCaseCard item={c} key={c.id} />
                ))}
              </div>
              <h2 className="subheading">Technologies</h2>
            </>
          )}
          <div className="grid three">
            {filteredProducts.slice((page - 1) * 9, page * 9).map((p) => (
              <TechnologyCard product={p} key={p.id} />
            ))}
          </div>
          {!filteredProducts.length && (
            <EmptyState
              title="No technologies match these filters"
              description="Try a broader search or clear a filter."
            />
          )}
          <Pagination
            page={page}
            count={Math.ceil(filteredProducts.length / 9)}
            onChange={(p) => set("page", String(p))}
          />
          {path === "search" && (
            <>
              <h2 className="subheading">Providers</h2>
              <div className="grid two">
                {providers
                  .filter((p) =>
                    (p.name + " " + p.description)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <ProviderCard provider={p} key={p.id} />
                  ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
