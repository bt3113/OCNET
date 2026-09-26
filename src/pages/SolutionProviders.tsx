import { useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Breadcrumbs, EmptyState, ErrorState, Logo, Skeleton, TabbedSections } from "../components/ui";
import { EmptyMarketplaceState, EntityCountRow, SolutionProviderCard, TaxonomyBreadcrumb, plural } from "../components/marketplace";
import { BuildCard } from "../components/builds/cards";
import { ImplementationCard } from "../components/intelligence";
import { useMarketplace, type MarketplaceState } from "../data/marketplace-hooks";
import { implementationBundle, useIntelligence } from "../data/intelligence-hooks";
import { findSolutionProvider, type SolutionProvider } from "../data/solution-providers";
import { isIndexableBuild } from "../data/use-case-domain";
import { useUI } from "../state";
import { track } from "../data/analytics";

type Intelligence = ReturnType<typeof useIntelligence>;

const isPublicRecord = (record: { publicationState: string; moderationState: string; visibility: string }) =>
  record.publicationState === "published" && record.moderationState === "approved" && record.visibility === "public";

/** Profile facts derived from marketplace records, not from self-written copy. */
export function providerFacts(provider: SolutionProvider, market: MarketplaceState, intel?: Intelligence) {
  const builds = market.builds.filter((build) => build.creatorId === provider.creatorId && isIndexableBuild(build, market.useCases));
  const implementations = market.implementations.filter((record) => isPublicRecord(record) && !!provider.integratorId && record.implementerIds.includes(provider.integratorId));
  const attested = intel
    ? implementations.filter((record) => implementationBundle(intel, record).claims.some((claim) => claim.public && claim.evidenceLevel === "customer-attested")).length
    : 0;
  const recordUseCases = market.implementationUseCases.filter((link) => implementations.some((record) => record.id === link.implementationId)).map((link) => link.useCaseId);
  const useCaseIds = [...new Set([...builds.flatMap((build) => build.useCaseIds), ...recordUseCases])].filter((id) => market.useCases.some((useCase) => useCase.id === id && (useCase.status ?? "approved") === "approved"));
  const technologyIds = [...new Set([...builds.flatMap((build) => build.stack.map((item) => item.productId)), ...market.implementationStackItems.filter((item) => implementations.some((record) => record.id === item.implementationId)).map((item) => item.productId)])];
  const regions = [...new Set([provider.region, ...implementations.map((record) => record.region)].filter((region) => region && region !== "Not stated"))];
  const services = market.offers.filter((offer) => offer.active && offer.moderation === "approved" && builds.some((build) => build.id === offer.buildId));
  return { builds, implementations, attested, useCaseIds, technologyIds, regions, services };
}

export default function SolutionProviders() {
  const { slug } = useParams();
  const market = useMarketplace();
  if (market.isLoading) return <Skeleton />;
  if (market.isError) return <ErrorState retry={market.refetch} />;
  return slug ? <SolutionProviderProfile slug={slug} market={market} /> : <SolutionProviderDirectory market={market} />;
}

function SolutionProviderDirectory({ market }: { market: MarketplaceState }) {
  const [params, setParams] = useSearchParams();
  const type = params.get("type") ?? "";
  const rows = useMemo(
    () =>
      market.providers
        .map((provider) => ({ provider, facts: providerFacts(provider, market) }))
        .filter(({ provider }) => !type || provider.type === type)
        .sort((a, b) => b.facts.implementations.length - a.facts.implementations.length || b.facts.builds.length - a.facts.builds.length || a.provider.name.localeCompare(b.provider.name)),
    [market, type],
  );
  const types = [...new Set(market.providers.map((provider) => provider.type))].sort();
  return (
    <>
      <PageHeading
        eyebrow="SOLUTION PROVIDERS"
        title="Who can build this for you?"
        description="Agencies, studios, freelancers, consultancies and systems integrators. Profiles are ordered by published Builds and deployments, not by payment or self-description."
      />
      <div className="row wrap provider-type-filter" role="group" aria-label="Provider type">
        {["", ...types].map((value) => (
          <button key={value || "all"} type="button" className={`chip-link${type === value ? " selected" : ""}`} aria-pressed={type === value} onClick={() => setParams(value ? { type: value } : {}, { replace: true })}>
            {value || "All providers"}
          </button>
        ))}
      </div>
      <p className="muted small-print">Solution Providers are not verified or certified by Oracnet unless a profile says so. Technology companies such as xAI are listed separately as <Link to="/technology-vendors">Technology Vendors</Link>.</p>
      <div className="provider-grid">
        {rows.map(({ provider, facts }) => (
          <SolutionProviderCard key={provider.id} provider={provider} facts={{ builds: facts.builds.length, implementations: facts.implementations.length, attested: facts.attested, useCases: facts.useCaseIds.length }} />
        ))}
      </div>
      {!rows.length && <EmptyMarketplaceState title="No Solution Providers of this type yet." description="Choose another type." />}
    </>
  );
}

function SolutionProviderProfile({ slug, market }: { slug: string; market: MarketplaceState }) {
  const intel = useIntelligence();
  const { setContact } = useUI();
  const [params, setParams] = useSearchParams();
  const provider = findSolutionProvider(market.providers, slug);
  if (!provider) return <EmptyState title="Solution Provider not found" to="/solution-providers" action="All Solution Providers" />;
  if (provider.slug !== slug) return <Navigate replace to={`/solution-providers/${provider.slug}`} />;
  if (intel.isLoading) return <Skeleton />;
  const facts = providerFacts(provider, market, intel);
  const contactTarget = market.integrators.find((item) => item.id === provider.integratorId) ?? market.consultants.find((item) => item.id === provider.consultantId);
  const tab = params.get("tab") ?? "overview";
  const selectTab = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "overview") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  };
  const useCases = market.useCases.filter((useCase) => facts.useCaseIds.includes(useCase.id));
  return (
    <>
      <Breadcrumbs items={[{ name: "Solution Providers", to: "/solution-providers" }, { name: provider.name }]} />
      <header className="implementation-detail-hero provider-hero">
        <div>
          <div className="row provider-title">
            <Logo initials={provider.initials} color={provider.color} />
            <PageHeading eyebrow={`SOLUTION PROVIDER · ${provider.type.toUpperCase()}`} title={provider.name} description={provider.headline} />
          </div>
          <dl className="implementation-header-facts">
            <div><dt>Builds</dt><dd>{facts.builds.length}</dd></div>
            <div><dt>Implementation Records</dt><dd>{facts.implementations.length}</dd></div>
            <div><dt>Customer-attested deployments</dt><dd>{facts.attested}</dd></div>
            <div><dt>Use Cases</dt><dd>{facts.useCaseIds.length}</dd></div>
            <div><dt>Technologies</dt><dd>{facts.technologyIds.length}</dd></div>
            <div><dt>Regions</dt><dd>{facts.regions.join(", ") || "Not stated"}</dd></div>
          </dl>
          <p className="provider-listing-note" role="note">
            {provider.verification === "verified" ? "Identity verified by Oracnet." : "Identity and certifications are not verified by Oracnet."}
            {provider.provenance === "demo" ? " This is an illustrative demo profile; its Builds and records are fictional." : ""}
          </p>
        </div>
        <aside className="card implementation-hero-actions">
          <strong>Work with {provider.name}</strong>
          <p>Ask about a Build, request a proposal, or share a project brief.</p>
          {contactTarget ? (
            <button
              type="button"
              className="button dark"
              onClick={() => {
                setContact(contactTarget);
                track("implementer_contacted", contactTarget.id);
              }}
            >
              <MessageSquare size={16} aria-hidden /> Contact {provider.name}
            </button>
          ) : (
            <Link className="button dark" to={facts.builds[0] ? `/builds/${facts.builds[0].slug}?tab=Service` : "/app/projects/new"}>
              Request a proposal
            </Link>
          )}
          <Link className="button light" to="/app/projects/new">
            Post a project
          </Link>
        </aside>
      </header>
      <TabbedSections
        label={`${provider.name} profile sections`}
        active={tab}
        onChange={selectTab}
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <section className="intelligence-section">
                <p className="lead-text">{provider.description}</p>
                <EntityCountRow counts={[[facts.builds.length, "Build"], [facts.implementations.length, "Implementation Record"], [facts.services.length, "service"]]} />
              </section>
            ),
          },
          {
            id: "builds",
            label: "Builds",
            count: facts.builds.length,
            content: facts.builds.length ? (
              <div className="build-grid intelligence-section">
                {facts.builds.map((build) => (
                  <BuildCard key={build.id} build={build} />
                ))}
              </div>
            ) : (
              <EmptyMarketplaceState title="No Builds published yet." description="Builds are complete solutions this provider has designed or can deliver." />
            ),
          },
          {
            id: "implementations",
            label: "Implementations",
            count: facts.implementations.length,
            content: facts.implementations.length ? (
              <div className="implementation-grid intelligence-section">
                {facts.implementations.map((record) => (
                  <ImplementationCard key={record.id} implementation={record} context={market.contexts.find((context) => context.implementationId === record.id)} metrics={market.metrics.filter((metric) => metric.implementationId === record.id)} metricDefinitions={market.definitions} />
                ))}
              </div>
            ) : (
              <EmptyMarketplaceState title="No deployments recorded." description="A profile without Implementation Records makes no deployment claims." />
            ),
          },
          {
            id: "use-cases",
            label: "Use Cases & technologies",
            count: useCases.length,
            content: (
              <section className="intelligence-section">
                <h2 className="tab-section-title">Use Cases</h2>
                <ul className="provider-use-cases">
                  {useCases.map((useCase) => (
                    <li key={useCase.id}>
                      <Link to={`/use-cases/${useCase.slug}`}>{useCase.name}</Link> <TaxonomyBreadcrumb useCase={useCase} categories={market.categories} />
                    </li>
                  ))}
                </ul>
                {!useCases.length && <p className="muted">None yet.</p>}
                <h2 className="tab-section-title">Technologies used</h2>
                <div className="tags">
                  {facts.technologyIds.map((id) => {
                    const product = market.products.find((item) => item.id === id);
                    return product ? (
                      <Link key={id} to={`/technologies/${product.slug}`}>
                        {product.name}
                      </Link>
                    ) : null;
                  })}
                </div>
              </section>
            ),
          },
          {
            id: "services",
            label: "Services",
            count: facts.services.length,
            content: facts.services.length ? (
              <ul className="service-list intelligence-section">
                {facts.services.map((offer) => {
                  const build = facts.builds.find((item) => item.id === offer.buildId)!;
                  return (
                    <li key={offer.id} className="card">
                      <span className="provider-type">{offer.offerType}</span>
                      <strong>{offer.name}</strong>
                      <p>{offer.description}</p>
                      <small className="muted">
                        For <Link to={`/builds/${build.slug}`}>{build.name}</Link> · {offer.pricingModel === "request quote" ? "Price on request" : offer.pricingModel} · {offer.deliveryTime || "Delivery agreed after scoping"}
                      </small>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyMarketplaceState title="No services listed." description="Services are offers attached to this provider’s Builds." />
            ),
          },
          {
            id: "evidence",
            label: "Evidence",
            content: (
              <section className="intelligence-section">
                <dl className="provider-evidence-facts">
                  <div><dt>Published Implementation Records</dt><dd>{facts.implementations.length}</dd></div>
                  <div><dt>With customer-attested claims</dt><dd>{facts.attested}</dd></div>
                  <div><dt>Verification</dt><dd>{provider.verification === "verified" ? "Verified" : "Not verified"}</dd></div>
                  <div><dt>Reviews</dt><dd>None published</dd></div>
                </dl>
                <p className="tab-section-note">Counts come from records others can inspect. {plural(facts.builds.length, "Build")} describe solutions; only Implementation Records describe deployments.</p>
              </section>
            ),
          },
        ]}
      />
    </>
  );
}
