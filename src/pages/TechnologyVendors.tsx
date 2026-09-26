import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import type { Provider } from "../data/model";
import { useUI } from "../state";
import { PageHeading } from "../components/layout";
import { Breadcrumbs, EmptyState, ErrorState, Logo, Skeleton, TabbedSections, TechnologyCard } from "../components/ui";
import { EmptyMarketplaceState, EntityCountRow, TaxonomyBreadcrumb, TechnologyVendorCard, plural } from "../components/marketplace";
import { BuildCard } from "../components/builds/cards";
import { useMarketplace, type MarketplaceState } from "../data/marketplace-hooks";
import { getUseCaseStats, isIndexableBuild } from "../data/use-case-domain";

const isPublicRecord = (record: { publicationState: string; moderationState: string; visibility: string }) =>
  record.publicationState === "published" && record.moderationState === "approved" && record.visibility === "public";

export default function TechnologyVendors() {
  const { slug } = useParams();
  const market = useMarketplace();
  if (market.isLoading) return <Skeleton />;
  if (market.isError) return <ErrorState retry={market.refetch} />;
  if (!slug) return <VendorDirectory market={market} />;
  const vendor = market.vendors.find((item) => item.slug === slug);
  return vendor ? <TechnologyVendorProfile vendor={vendor} market={market} /> : <EmptyState title="Technology Vendor not found" to="/technology-vendors" action="All Technology Vendors" />;
}

const vendorUseCaseIds = (vendor: Provider, market: MarketplaceState) =>
  [...new Set(market.sources.filter((source) => source.sourceType === "technology-vendor" && source.sourceEntityId === vendor.id).map((source) => source.useCaseId))];

function VendorDirectory({ market }: { market: MarketplaceState }) {
  const vendors = [...market.vendors].sort((a, b) => Number(!!b.listing) - Number(!!a.listing) || a.name.localeCompare(b.name));
  return (
    <>
      <PageHeading
        eyebrow="TECHNOLOGY VENDORS"
        title="The companies behind the technologies."
        description="Vendor profiles list products and what the vendor says they can be used for. Independent Builds and deployments are shown separately from vendor statements."
      />
      <div className="provider-grid">
        {vendors.map((vendor) => (
          <TechnologyVendorCard key={vendor.id} vendor={vendor} products={market.products.filter((product) => product.providerId === vendor.id).length} useCases={vendorUseCaseIds(vendor, market).length} />
        ))}
      </div>
    </>
  );
}

/**
 * Keeps four things apart: what the vendor sells (products), what the vendor says
 * they can be used for (vendor-stated Use Cases), what independent Solution Providers
 * built with them (Builds), and what was actually deployed (Implementation Records).
 */
function TechnologyVendorProfile({ vendor, market }: { vendor: Provider; market: MarketplaceState }) {
  const { setContact } = useUI();
  const [params, setParams] = useSearchParams();
  const products = market.products.filter((product) => product.providerId === vendor.id);
  const productIds = new Set(products.map((product) => product.id));
  const useCaseIds = vendorUseCaseIds(vendor, market);
  const useCases = market.useCases.filter((useCase) => useCaseIds.includes(useCase.id));
  const builds = market.builds.filter((build) => isIndexableBuild(build, market.useCases) && build.stack.some((item) => productIds.has(item.productId)));
  const records = market.implementations.filter((record) => isPublicRecord(record) && market.implementationStackItems.some((item) => item.implementationId === record.id && productIds.has(item.productId)));
  const listing = vendor.listing;
  const tab = params.get("tab") ?? (useCases.length ? "use-cases" : "products");
  const selectTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: true });
  };
  return (
    <>
      <Breadcrumbs items={[{ name: "Technology Vendors", to: "/technology-vendors" }, { name: vendor.name }]} />
      <header className="implementation-detail-hero provider-hero">
        <div>
          <div className="row provider-title">
            <Logo initials={vendor.initials} color={vendor.color} />
            <PageHeading
              eyebrow={`TECHNOLOGY VENDOR · ${listing ? (listing.status === "claimed" ? "MAINTAINED BY THE VENDOR" : "UNCLAIMED · COMPILED FROM PUBLIC PAGES") : vendor.provenance === "demo" ? "SAMPLE DIRECTORY PROFILE" : "DIRECTORY PROFILE"}`}
              title={vendor.name}
              description={listing?.tagline ?? vendor.description}
            />
          </div>
          <dl className="implementation-header-facts">
            <div><dt>Products</dt><dd>{products.length}</dd></div>
            <div><dt>Vendor-stated Use Cases</dt><dd>{useCases.length}</dd></div>
            <div><dt>Independent Builds</dt><dd>{builds.length}</dd></div>
            <div><dt>Implementation Records</dt><dd>{records.length}</dd></div>
          </dl>
          {listing?.status === "unclaimed" && (
            <p className="provider-listing-note" role="note">
              <ShieldCheck size={16} aria-hidden /> Compiled from public vendor pages by {listing.compiledBy} on {listing.sourcedAt}. {vendor.name} has not reviewed this profile.
            </p>
          )}
        </div>
        <aside className="card implementation-hero-actions">
          <strong>Talk to {vendor.name}</strong>
          <p>Pricing, availability and data terms come from the vendor directly.</p>
          {vendor.website && (
            <a className="button dark" href={vendor.website} target="_blank" rel="noopener noreferrer">
              Visit official website <ExternalLink size={15} aria-hidden />
            </a>
          )}
          <button type="button" className="button light" onClick={() => setContact(vendor)}>
            Contact {vendor.name}
          </button>
        </aside>
      </header>

      <TabbedSections
        label={`${vendor.name} profile sections`}
        active={tab}
        onChange={selectTab}
        tabs={[
          ...(useCases.length
            ? [
                {
                  id: "use-cases",
                  label: "Vendor-stated Use Cases",
                  count: useCases.length,
                  content: (
                    <section className="intelligence-section">
                      <p className="tab-section-note">
                        What {vendor.name} says its technology can be used for. These are vendor statements, not Builds and not deployment evidence. Each Use Case is shared: any Solution Provider can publish a Build for it.
                      </p>
                      <ul className="vendor-use-case-list">
                        {useCases.map((useCase) => {
                          const stats = getUseCaseStats(useCase.id, market.marketplace);
                          const source = market.sources.find((item) => item.useCaseId === useCase.id && item.sourceEntityId === vendor.id);
                          return (
                            <li key={useCase.id} className="card">
                              <TaxonomyBreadcrumb useCase={useCase} categories={market.categories} />
                              <Link to={`/use-cases/${useCase.slug}`}>
                                <strong>{useCase.name}</strong>
                              </Link>
                              {source && <blockquote>“{source.originalDescription}”</blockquote>}
                              <EntityCountRow counts={[[stats.builds.length, "Build"], [stats.technologies.length, "Technology", "Technologies"], [stats.implementations.length, "Implementation"]]} />
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ),
                },
              ]
            : []),
          {
            id: "products",
            label: "Products",
            count: products.length,
            content: (
              <section className="intelligence-section">
                <div className="grid three">
                  {products.map((product) => (
                    <TechnologyCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ),
          },
          {
            id: "builds",
            label: "Independent Builds",
            count: builds.length,
            content: builds.length ? (
              <section className="intelligence-section">
                <p className="tab-section-note">Complete solutions published by Solution Providers that use {vendor.name}’s technology. {vendor.name} did not publish them and cannot remove them.</p>
                <div className="build-grid">
                  {builds.map((build) => (
                    <BuildCard key={build.id} build={build} />
                  ))}
                </div>
              </section>
            ) : (
              <EmptyMarketplaceState title={`No independent Builds use ${vendor.name}’s technology yet.`} description="Solution Providers can publish one for any of the Use Cases above." />
            ),
          },
          {
            id: "evidence",
            label: "Implementation evidence",
            count: records.length,
            content: records.length ? (
              <ul className="build-links intelligence-section">
                {records.map((record) => (
                  <li key={record.id}>
                    <Link to={`/implementations/${record.slug}`}>{record.name}</Link> <span className="muted">— {record.businessType} · {record.region}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyMarketplaceState title="No deployment evidence published." description={`No public Implementation Record uses ${vendor.name}’s products yet. Vendor statements are not deployment evidence.`} />
            ),
          },
          {
            id: "about",
            label: "About & sources",
            content: (
              <section className="intelligence-section provider-about">
                <p className="lead-text">{listing?.about ?? `${vendor.description}. Sample directory profile; see the official website for product information.`}</p>
                {listing?.note && <p className="muted">{listing.note}</p>}
                {listing && (
                  <>
                    <h2 className="tab-section-title">Sources</h2>
                    <p className="tab-section-note">Read on {listing.sourcedAt}.</p>
                    <ul className="provider-sources">
                      {listing.sources.map((source) => (
                        <li key={source.url}>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            {source.label} <ExternalLink size={13} aria-hidden />
                          </a>
                          <span className="muted"> {source.url.replace(/^https:\/\//, "")}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <h2 className="tab-section-title">If {vendor.name} claims this profile</h2>
                <p className="tab-section-note">
                  A claimed profile lets the vendor maintain company details, products and its own use-case statements. It does not let the vendor delete or rewrite independent Builds, Implementation Records, evidence or reviews.
                </p>
                <Link className="button light" to="/provider/claims">
                  Claim this profile <ArrowRight size={14} aria-hidden />
                </Link>
                <EntityCountRow className="muted" counts={[[products.length, "product"], [useCases.length, "vendor statement"]]} />
                <p className="muted small-print">{plural(builds.length, "independent Build")} and {plural(records.length, "deployment record")} reference this vendor’s products.</p>
              </section>
            ),
          },
        ]}
      />
    </>
  );
}
