import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { ButtonLink, ErrorState, SectionTitle, Skeleton, TechnologyCard } from "../components/ui";
import { ImplementationCard } from "../components/intelligence";
import { BuildCard } from "../components/builds/cards";
import { SolutionProviderCard, UseCaseCard, plural } from "../components/marketplace";
import { useMarketplace } from "../data/marketplace-hooks";
import { useMarketplaceSearch } from "../data/search-hook";
import { primarySearchTypes } from "../data/search";
import { approvedUseCases, getUseCaseStats, isIndexableBuild } from "../data/use-case-domain";
import { providerFacts } from "./SolutionProviders";

const isPublicRecord = (record: { publicationState: string; moderationState: string; visibility: string }) =>
  record.publicationState === "published" && record.moderationState === "approved" && record.visibility === "public";

export default function Home() {
  const market = useMarketplace();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [intent, setIntent] = useState("");
  const suggestions = useMarketplaceSearch(q).data.filter((item) => primarySearchTypes.includes(item.type)).slice(0, 6);
  if (market.isLoading) return <Skeleton />;
  if (market.isError) return <ErrorState retry={market.refetch} />;

  const useCases = approvedUseCases(market.useCases);
  const stats = new Map(useCases.map((useCase) => [useCase.id, getUseCaseStats(useCase.id, market.marketplace)]));
  const featuredUseCases = [...useCases]
    .sort((a, b) => stats.get(b.id)!.builds.length - stats.get(a.id)!.builds.length || stats.get(b.id)!.implementations.length - stats.get(a.id)!.implementations.length || a.name.localeCompare(b.name))
    .slice(0, 6);
  const categories = market.categories.filter((category) => category.level === "category").sort((a, b) => a.sortOrder - b.sortOrder);
  const indexable = market.builds.filter((build) => isIndexableBuild(build, market.useCases));
  const builds = [...indexable].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const records = market.implementations.filter(isPublicRecord).sort((a, b) => b.lastEvidenceReviewAt.localeCompare(a.lastEvidenceReviewAt)).slice(0, 3);
  const providers = market.providers
    .map((provider) => ({ provider, facts: providerFacts(provider, market) }))
    .filter(({ facts }) => facts.builds.length || facts.implementations.length)
    .sort((a, b) => b.facts.implementations.length + b.facts.builds.length - (a.facts.implementations.length + a.facts.builds.length) || a.provider.name.localeCompare(b.provider.name))
    .slice(0, 3);
  const usedProductIds = new Set(indexable.flatMap((build) => build.stack.map((item) => item.productId)));
  const technologies = market.products.filter((product) => usedProductIds.has(product.id)).slice(0, 3);

  return (
    <>
      <div className="home-intro intelligence-home-intro">
        <div>
          <h1>What are you trying to get done?</h1>
          <p>Find the Use Case, compare the Builds that address it, check real deployments, then choose who builds it for you.</p>
        </div>
      </div>
      <form
        className="intent-search intelligence-intent-search home-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/use-cases");
        }}
      >
        <Search size={23} aria-hidden />
        <input aria-label="Search Use Cases, Builds, technologies and Solution Providers" placeholder="e.g. chase overdue invoices, book appointments, Grok" value={q} onChange={(event) => setQ(event.target.value)} />
        <button className="button dark">
          Search <ArrowRight size={17} aria-hidden />
        </button>
      </form>
      {q.trim().length > 1 && (
        <ul className="home-suggestions card" aria-label="Suggestions">
          {suggestions.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Link to={item.path}>
                <span className="search-result-type">{item.type}</span>
                <strong>{item.name}</strong>
              </Link>
            </li>
          ))}
          {!suggestions.length && <li className="muted">No published match yet. Press Search to see everything, or browse Use Cases.</li>}
        </ul>
      )}
      <nav className="category-tiles home-categories" aria-label="Browse Use Cases by category">
        {categories.map((category) => (
          <Link key={category.id} to={`/use-cases?category=${category.id}`}>
            <strong>{category.name}</strong>
            <span>{plural(useCases.filter((useCase) => useCase.categoryId === category.id).length, "Use Case")}</span>
          </Link>
        ))}
      </nav>

      <SectionTitle title="Browse Use Cases" to="/use-cases" label={`All ${useCases.length} Use Cases`} />
      <div className="use-case-grid">
        {featuredUseCases.map((useCase) => {
          const item = stats.get(useCase.id)!;
          return <UseCaseCard key={useCase.id} useCase={useCase} categories={market.categories} counts={{ builds: item.builds.length, technologies: item.technologies.length, implementations: item.implementations.length }} />;
        })}
      </div>

      <SectionTitle title="Recent Builds" to="/builds" label="All Builds" />
      <div className="build-grid">
        {builds.map((build) => (
          <BuildCard key={build.id} build={build} />
        ))}
      </div>

      <SectionTitle title="Implementation evidence" to="/implementations" label="All deployments" />
      <p className="section-note">Real deployments with their context, results and evidence level. Demo records are illustrative.</p>
      <div className="implementation-grid home-implementation-grid">
        {records.map((record) => (
          <ImplementationCard key={record.id} implementation={record} context={market.contexts.find((context) => context.implementationId === record.id)} metrics={market.metrics.filter((metric) => metric.implementationId === record.id)} metricDefinitions={market.definitions} />
        ))}
      </div>

      <div className="home-split">
        <section>
          <SectionTitle title="Solution Providers" to="/solution-providers" label="All providers" />
          <div className="home-provider-list">
            {providers.map(({ provider, facts }) => (
              <SolutionProviderCard key={provider.id} provider={provider} facts={{ builds: facts.builds.length, implementations: facts.implementations.length, attested: 0, useCases: facts.useCaseIds.length }} />
            ))}
          </div>
        </section>
        <section>
          <SectionTitle title="Technologies in Builds" to="/technologies" label="All technologies" />
          <div className="home-provider-list">
            {technologies.map((product) => (
              <TechnologyCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>

      <section className="card home-compiler-cta" aria-labelledby="find-solution-heading">
        <Sparkles size={22} aria-hidden />
        <div>
          <h2 id="find-solution-heading">Have a structured requirement? Find a solution.</h2>
          <p>Describe your constraints. Oracnet checks them against published Blueprints and shows where deployment evidence exists — and where it doesn’t.</p>
          <form
            className="home-compiler-form"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(intent.trim() ? `/solution-compiler?intent=${encodeURIComponent(intent.trim())}` : "/solution-compiler");
            }}
          >
            <input aria-label="Describe your requirement" placeholder="e.g. Salon with two sites wants faster replies to booking messages" value={intent} onChange={(event) => setIntent(event.target.value)} />
            <button className="button light">
              Find a solution <ArrowRight size={16} aria-hidden />
            </button>
          </form>
        </div>
      </section>

      <div className="build-footer-banner intelligence-footer-banner">
        <div>
          <span className="eyebrow">FOR SOLUTION PROVIDERS</span>
          <h2>Publish a Build for the work you already deliver.</h2>
          <p>Attach it to up to three Use Cases, explain how it works and link real deployments when you have them.</p>
        </div>
        <ButtonLink to="/creator/builds/new">
          Publish a Build <ArrowRight size={17} aria-hidden />
        </ButtonLink>
      </div>
    </>
  );
}
