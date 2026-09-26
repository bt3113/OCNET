import { useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Breadcrumbs, ButtonLink, Drawer, EmptyState, ErrorState, Logo, Skeleton, TabbedSections } from "../components/ui";
import {
  EmptyMarketplaceState,
  EntityCountRow,
  ProviderLink,
  SourceProvenancePanel,
  TaxonomyBreadcrumb,
  UseCaseCard,
  UseCaseSourceBadge,
  plural,
  sourceLabel,
  technologyBasisText,
} from "../components/marketplace";
import { BuildCard } from "../components/builds/cards";
import { ImplementationCard } from "../components/intelligence";
import { useMarketplace, type MarketplaceState } from "../data/marketplace-hooks";
import { approvedUseCases, getUseCaseStats, resolveUseCase, suggestUseCases, type UseCaseStats } from "../data/use-case-domain";
import type { UseCase } from "../data/model";

export default function UseCases() {
  const { slug } = useParams();
  const market = useMarketplace();
  if (market.isLoading) return <Skeleton />;
  if (market.isError) return <ErrorState retry={market.refetch} />;
  return slug ? <UseCaseDetail slug={slug} market={market} /> : <UseCaseDiscovery market={market} />;
}

const sorts = {
  builds: "Most Builds",
  evidence: "Most implementation evidence",
  recent: "Recently added",
  name: "Alphabetical",
} as const;

function UseCaseDiscovery({ market }: { market: MarketplaceState }) {
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState(false);
  const get = (key: string) => params.get(key) ?? "";
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "category") next.delete("subcategory");
    setParams(next, { replace: true });
  };
  const approved = approvedUseCases(market.useCases);
  const stats = useMemo(() => new Map(approved.map((useCase) => [useCase.id, getUseCaseStats(useCase.id, market.marketplace)])), [approved, market.marketplace]);
  const categories = market.categories.filter((category) => category.level === "category").sort((a, b) => a.sortOrder - b.sortOrder);
  const subcategories = market.categories.filter((category) => category.level === "subcategory" && (!get("category") || category.parentId === get("category")));
  const q = get("q");
  const ranking = q ? suggestUseCases(q, market, { limit: 200 }).map((item) => item.useCase.id) : null;
  const matched = ranking ? new Set(ranking) : null;
  const rows = approved
    .filter((useCase) => !matched || matched.has(useCase.id))
    .filter((useCase) => !get("category") || useCase.categoryId === get("category"))
    .filter((useCase) => !get("subcategory") || useCase.subcategoryId === get("subcategory"))
    .filter((useCase) => {
      const item = stats.get(useCase.id)!;
      if (get("builds") === "with" && !item.builds.length) return false;
      if (get("builds") === "none" && item.builds.length) return false;
      if (get("evidence") === "yes" && !item.implementations.length) return false;
      if (get("technology") && !item.technologies.some((basis) => basis.productId === get("technology"))) return false;
      if (get("origin") && (useCase.originType ?? "oracnet-editorial") !== get("origin")) return false;
      return true;
    })
    .sort((a, b) => {
      const sa = stats.get(a.id)!;
      const sb = stats.get(b.id)!;
      switch (get("sort")) {
        case "evidence":
          return sb.implementations.length - sa.implementations.length || sb.builds.length - sa.builds.length || a.name.localeCompare(b.name);
        case "recent":
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || a.name.localeCompare(b.name);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return ranking ? ranking.indexOf(a.id) - ranking.indexOf(b.id) : sb.builds.length - sa.builds.length || sb.implementations.length - sa.implementations.length || a.name.localeCompare(b.name);
      }
    });
  const active = ["q", "category", "subcategory", "builds", "evidence", "technology", "origin"].filter((key) => get(key));
  const technologies = market.products.filter((product) => [...stats.values()].some((item) => item.technologies.some((basis) => basis.productId === product.id)));
  const select = (key: string, label: string, options: [string, string][], all = "Any") => (
    <label key={key}>
      {label}
      <select value={get(key)} onChange={(event) => set(key, event.target.value)}>
        <option value="">{all}</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  const filters = (
    <div className="use-case-filters">
      {select("category", "Category", categories.map((category) => [category.id, category.name]), "All categories")}
      {select("subcategory", "Subcategory", subcategories.map((category) => [category.id, category.name]), "All subcategories")}
      {select("builds", "Build availability", [["with", "Has Builds"], ["none", "No Builds yet"]])}
      {select("evidence", "Implementation evidence", [["yes", "Has implementation evidence"]])}
      {select("technology", "Technology", technologies.map((product) => [product.id, product.name]))}
      {select("origin", "Source", [["technology-vendor-sourced", "Listed by a technology vendor"], ["solution-provider-proposed", "Proposed by a Solution Provider"], ["oracnet-editorial", "Oracnet editorial"]])}
    </div>
  );
  return (
    <>
      <PageHeading
        eyebrow="USE CASES"
        title="What work do you need done?"
        description="Each Use Case is a specific piece of work. See the Builds that address it, the technologies involved and any real deployments."
        action={
          <ButtonLink to="/creator/builds/new" variant="light">
            <Plus size={16} aria-hidden /> Publish a Build
          </ButtonLink>
        }
      />
      <nav className="category-tiles" aria-label="Browse by category">
        {categories.map((category) => {
          const count = approved.filter((useCase) => useCase.categoryId === category.id).length;
          return (
            <button
              key={category.id}
              type="button"
              className={get("category") === category.id ? "selected" : ""}
              aria-pressed={get("category") === category.id}
              onClick={() => set("category", get("category") === category.id ? "" : category.id)}
            >
              <strong>{category.name}</strong>
              <span>{plural(count, "Use Case")}</span>
            </button>
          );
        })}
      </nav>
      <div className="card filter-search-bar">
        <Search size={19} aria-hidden />
        <input aria-label="Search Use Cases" placeholder="Search work, e.g. “chase overdue invoices”" value={q} onChange={(event) => set("q", event.target.value)} />
        <button className="button light filter-toggle" type="button" onClick={() => setSheet(true)} aria-label={`Filters${active.length ? ` (${active.length} active)` : ""}`}>
          <SlidersHorizontal size={17} aria-hidden /> Filters{active.length ? ` · ${active.length}` : ""}
        </button>
      </div>
      <div className="card use-case-filter-bar">{filters}</div>
      <Drawer open={sheet} onClose={() => setSheet(false)} title="Filter Use Cases" description="Filters apply as you choose them.">
        {filters}
        <button type="button" className="button dark" onClick={() => setSheet(false)}>
          Show {plural(rows.length, "Use Case")}
        </button>
      </Drawer>
      <div className="row between wrap discovery-results-head">
        <p role="status">
          <strong>{plural(rows.length, "Use Case")}</strong>
          <span className="muted"> · counts are published supply, not popularity</span>
        </p>
        <label className="inline-select">
          Sort
          <select value={get("sort") || "builds"} onChange={(event) => set("sort", event.target.value === "builds" ? "" : event.target.value)}>
            {Object.entries(sorts).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!!active.length && (
        <div className="active-filters" aria-label="Active filters">
          {active.map((key) => (
            <button type="button" key={key} onClick={() => set(key, "")} aria-label={`Remove filter ${key}`}>
              {key === "category" || key === "subcategory"
                ? market.categories.find((category) => category.id === get(key))?.name
                : key === "technology"
                  ? market.products.find((product) => product.id === get(key))?.name
                  : key === "q"
                    ? `“${q}”`
                    : get(key).replaceAll("-", " ")}{" "}
              <X size={12} aria-hidden />
            </button>
          ))}
        </div>
      )}
      {rows.length ? (
        <div className="use-case-grid">
          {rows.map((useCase) => {
            const item = stats.get(useCase.id)!;
            return (
              <UseCaseCard
                key={useCase.id}
                useCase={useCase}
                categories={market.categories}
                counts={{ builds: item.builds.length, technologies: item.technologies.length, implementations: item.implementations.length }}
                source={useCase.originType === "technology-vendor-sourced" ? <UseCaseSourceBadge useCase={useCase} vendors={market.vendors} providers={market.providers} /> : undefined}
                action={
                  !item.builds.length ? (
                    <Link className="text-button" to={`/creator/builds/new?useCase=${useCase.id}`}>
                      Publish a Build
                    </Link>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      ) : (
        <EmptyMarketplaceState
          title="No Use Case matches"
          description="Try fewer filters or different words. If the work you need is missing, post a project or ask a Solution Provider to propose it."
          actions={
            <>
              <ButtonLink to="/app/projects/new" variant="light">
                Post a project
              </ButtonLink>
              <button type="button" className="button light" onClick={() => setParams({}, { replace: true })}>
                Clear filters
              </button>
            </>
          }
        />
      )}
    </>
  );
}

function UseCaseDetail({ slug, market }: { slug: string; market: MarketplaceState }) {
  const [params, setParams] = useSearchParams();
  const resolution = resolveUseCase(slug, market.useCases, market.redirects, market.categories);
  if (resolution.kind === "redirect") return <Navigate replace to={resolution.to} />;
  if (resolution.kind === "missing") return <EmptyState title="Use Case not found" description="It may have been renamed, merged or not yet approved." to="/use-cases" action="Browse Use Cases" />;
  const useCase = resolution.useCase;
  const stats = getUseCaseStats(useCase.id, market.marketplace);
  const sources = market.sources.filter((source) => source.useCaseId === useCase.id);
  const vendorSource = sources.find((source) => source.sourceType === "technology-vendor");
  const vendor = market.vendors.find((item) => item.id === vendorSource?.sourceEntityId);
  const tab = params.get("tab") ?? "builds";
  const selectTab = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "builds") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  };
  const visibleAliases = market.aliases.filter((alias) => alias.useCaseId === useCase.id && alias.aliasType === "alternate");
  return (
    <>
      <Breadcrumbs items={[{ name: "Use Cases", to: "/use-cases" }, { name: useCase.name }]} />
      <header className="implementation-detail-hero use-case-hero">
        <div>
          <div className="eyebrow">
            <TaxonomyBreadcrumb useCase={useCase} categories={market.categories} />
          </div>
          <h1>{useCase.name}</h1>
          <p className="lead-text">{useCase.description}</p>
          <dl className="implementation-header-facts use-case-facts">
            <div><dt>Builds</dt><dd>{stats.builds.length}</dd></div>
            <div><dt>Technologies</dt><dd>{stats.technologies.length}</dd></div>
            <div><dt>Implementations</dt><dd>{stats.implementations.length}</dd></div>
            <div><dt>Solution Providers</dt><dd>{stats.providerIds.length}</dd></div>
          </dl>
          <p className="use-case-origin">
            {vendorSource ? (
              <>
                Originally listed by {vendor ? <Link to={`/technology-vendors/${vendor.slug}`}>{vendor.name}</Link> : "a technology vendor"}
                {vendorSource.sourceUrl && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={vendorSource.sourceUrl} target="_blank" rel="noopener noreferrer">
                      source
                    </a>
                  </>
                )}
                {vendorSource.lastCheckedAt && <> · checked {vendorSource.lastCheckedAt}</>}. Use Cases are shared marketplace infrastructure — the originating vendor does not own it, and any Solution Provider can publish a Build for it.
              </>
            ) : (
              <>{sourceLabel(useCase, market.vendors, market.providers)} · Use Cases are shared marketplace infrastructure; any Solution Provider can publish a Build for it.</>
            )}
          </p>
        </div>
        <aside className="card implementation-hero-actions">
          <strong>{stats.builds.length ? "Get this work done" : "No Builds yet"}</strong>
          <p>
            {stats.builds.length
              ? "Compare the Builds, then ask a Solution Provider for a proposal."
              : "No Solution Provider has published a Build for this Use Case yet. You can still post a project."}
          </p>
          <ButtonLink to={`/app/projects/new?useCase=${useCase.id}`}>Post a project</ButtonLink>
          <Link className="button light" to="/solution-compiler">
            Find a solution
          </Link>
          <Link className="button light" to={`/creator/builds/new?useCase=${useCase.id}`}>
            Publish a Build for this Use Case
          </Link>
        </aside>
      </header>

      <TabbedSections
        label="Use Case sections"
        active={tab}
        onChange={selectTab}
        tabs={[
          { id: "builds", label: "Builds", count: stats.builds.length, content: <BuildsTab useCase={useCase} stats={stats} /> },
          { id: "technologies", label: "Technologies", count: stats.technologies.length, content: <TechnologiesTab stats={stats} market={market} /> },
          { id: "implementations", label: "Implementations", count: stats.implementations.length, content: <ImplementationsTab stats={stats} market={market} /> },
          { id: "providers", label: "Solution Providers", count: stats.providerIds.length, content: <ProvidersTab stats={stats} market={market} /> },
          {
            id: "sources",
            label: "Sources & about",
            content: (
              <section className="intelligence-section">
                <h2 className="tab-section-title">Where this Use Case came from</h2>
                <p className="tab-section-note">Sources are attribution, not ownership. Vendor wording is kept as captured and never rewritten.</p>
                <SourceProvenancePanel sources={sources} vendors={market.vendors} providers={market.providers} />
                {!!visibleAliases.length && (
                  <>
                    <h3>Also known as</h3>
                    <ul className="alias-list">
                      {visibleAliases.map((alias) => (
                        <li key={alias.id}>{alias.label}</li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            ),
          },
        ]}
      />
    </>
  );
}

function BuildsTab({ useCase, stats }: { useCase: UseCase; stats: UseCaseStats }) {
  return (
    <section className="intelligence-section">
      {stats.builds.length ? (
        <>
          <p className="tab-section-note">Complete solutions published by Solution Providers. A Build shows how a solution works; deployment evidence is listed separately.</p>
          <div className="build-grid">
            {stats.builds.map((build) => (
              <BuildCard key={build.id} build={build} />
            ))}
          </div>
        </>
      ) : (
        <EmptyMarketplaceState
          title="No Builds have been published for this Use Case yet."
          description="This is a gap in published supply, not a measure of demand."
          actions={
            <>
              <ButtonLink to={`/creator/builds/new?useCase=${useCase.id}`} variant="light">
                Publish a Build
              </ButtonLink>
              <ButtonLink to={`/app/projects/new?useCase=${useCase.id}`} variant="light">
                Post a project
              </ButtonLink>
            </>
          }
        />
      )}
    </section>
  );
}

function TechnologiesTab({ stats, market }: { stats: UseCaseStats; market: MarketplaceState }) {
  if (!stats.technologies.length) return <EmptyMarketplaceState title="No technologies recorded yet." description="Technologies appear here when a vendor lists them, a Build uses them or a deployment records them." />;
  return (
    <section className="intelligence-section">
      <p className="tab-section-note">Each technology shows why it appears here. Appearing together does not mean products are officially compatible.</p>
      <ul className="technology-basis-list">
        {stats.technologies.map((basis) => {
          const product = market.products.find((item) => item.id === basis.productId)!;
          const vendor = market.vendors.find((item) => item.id === product.providerId);
          return (
            <li key={basis.productId} className="card">
              <Logo initials={product.initials} color={product.color} />
              <div>
                <Link to={`/technologies/${product.slug}`}>
                  <strong>{product.name}</strong>
                </Link>
                <small>{vendor?.name}</small>
              </div>
              <span className="technology-basis">{technologyBasisText(basis)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ImplementationsTab({ stats, market }: { stats: UseCaseStats; market: MarketplaceState }) {
  if (!stats.implementations.length)
    return <EmptyMarketplaceState title="No deployment evidence has been published yet." description="Implementation Records describe real deployments. Builds and vendor statements are not deployment evidence." />;
  return (
    <section className="intelligence-section">
      <div className="implementation-grid">
        {stats.implementations.map((record) => (
          <ImplementationCard
            key={record.id}
            implementation={record}
            context={market.contexts.find((context) => context.implementationId === record.id)}
            metrics={market.metrics.filter((metric) => metric.implementationId === record.id)}
            metricDefinitions={market.definitions}
          />
        ))}
      </div>
    </section>
  );
}

function ProvidersTab({ stats, market }: { stats: UseCaseStats; market: MarketplaceState }) {
  const providers = market.providers.filter((provider) => stats.providerIds.includes(provider.id));
  if (!providers.length) return <EmptyMarketplaceState title="No Solution Provider yet." description="Providers appear here when they publish a Build for this Use Case or document a deployment." />;
  return (
    <section className="intelligence-section">
      <ul className="provider-basis-list">
        {providers.map((provider) => {
          const builds = stats.builds.filter((build) => build.creatorId === provider.creatorId).length;
          const deployments = stats.implementations.filter((record) => provider.integratorId && record.implementerIds.includes(provider.integratorId)).length;
          return (
            <li key={provider.id} className="card">
              <div>
                <span className="provider-type">{provider.type}</span>
                <ProviderLink provider={provider} />
              </div>
              <EntityCountRow counts={[[builds, "Build"], [deployments, "Implementation"]]} />
              <Link className="text-button" to={`/solution-providers/${provider.slug}`}>
                View profile <ArrowRight size={13} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
