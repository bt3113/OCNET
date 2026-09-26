import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import type { Provider } from "../data/model";
import { useRecords, useUI } from "../state";
import { isPublicBuild } from "../data/build-domain";
import { isPublicRecord } from "../data/intelligence-hooks";
import { BuildCard } from "../components/builds/cards";
import { PageHeading } from "../components/layout";
import { Breadcrumbs, Logo, TabbedSections, TechnologyCard } from "../components/ui";
import { xaiListingSection } from "../data/vendor-xai";

const statusLabel = (provider: Provider) =>
  provider.listing?.status === "claimed"
    ? "Maintained by the company"
    : provider.listing
      ? "Unclaimed · compiled from public pages"
      : provider.provenance === "demo"
        ? "Sample directory profile"
        : provider.provenance;

/**
 * A technology company's profile: what it lists (use cases), what it sells
 * (products), what independent records say (evidence) and where every statement
 * came from (sources and claim status).
 */
export function ProviderProfile({ provider }: { provider: Provider }) {
  const { setContact } = useUI();
  const [params, setParams] = useSearchParams();
  const { data: products = [] } = useRecords("products");
  const { data: builds = [] } = useRecords("builds");
  const { data: useCases = [] } = useRecords("use_cases");
  const { data: implementations = [] } = useRecords("implementation_records");
  const { data: stackItems = [] } = useRecords("implementation_stack_items");
  const { data: relationships = [] } = useRecords("technology_relationships");

  const own = products.filter((product) => product.providerId === provider.id);
  const ownIds = new Set(own.map((product) => product.id));
  const listings = builds.filter((build) => build.creatorId === provider.id && isPublicBuild(build));
  const sections = [...new Set(listings.map((build) => xaiListingSection(build.id) ?? build.industry))];
  const mappedUseCases = useCases.filter((useCase) => listings.some((build) => build.useCaseIds.includes(useCase.id)));
  const creatorBuilds = builds.filter((build) => build.creatorId !== provider.id && isPublicBuild(build) && build.stack.some((item) => ownIds.has(item.productId)));
  const records = implementations.filter((record) => isPublicRecord(record) && stackItems.some((item) => item.implementationId === record.id && ownIds.has(item.productId)));
  const typedRelationships = relationships.filter((relationship) => ownIds.has(relationship.sourceProductId) || ownIds.has(relationship.targetProductId));
  const listing = provider.listing;

  const tab = params.get("tab") ?? (listings.length ? "use-cases" : "products");
  const selectTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: true });
  };

  const useCasesTab = (
    <>
      {sections.map((section) => (
        <section className="intelligence-section" key={section} aria-labelledby={`section-${section}`}>
          <h2 id={`section-${section}`} className="tab-section-title">{section}</h2>
          <div className="build-grid">
            {listings
              .filter((build) => (xaiListingSection(build.id) ?? build.industry) === section)
              .map((build) => (
                <BuildCard key={build.id} build={build} />
              ))}
          </div>
        </section>
      ))}
      {!!mappedUseCases.length && (
        <section className="intelligence-section" aria-labelledby="mapped-heading">
          <h2 id="mapped-heading" className="tab-section-title">Where these fit on Oracnet</h2>
          <p className="tab-section-note">Each listing is mapped to a business outcome, where you can compare {provider.name} with other approaches.</p>
          <div className="row wrap">
            {mappedUseCases.map((useCase) => (
              <Link key={useCase.id} className="chip-link" to={`/use-cases/${useCase.slug}`}>{useCase.name}</Link>
            ))}
          </div>
        </section>
      )}
    </>
  );

  const productsTab = (
    <section className="intelligence-section">
      <div className="grid three">
        {own.map((product) => (
          <TechnologyCard key={product.id} product={product} />
        ))}
      </div>
      {!own.length && <p className="muted">No products are listed for this company yet.</p>}
    </section>
  );

  const evidenceTab = (
    <section className="intelligence-section">
      <p className="tab-section-note">Use-case listings are the company’s own descriptions. Evidence comes from independent records about deployments.</p>
      <dl className="provider-evidence-facts">
        <div><dt>Implementation records using its products</dt><dd>{records.length}</dd></div>
        <div><dt>Typed compatibility relationships</dt><dd>{typedRelationships.length}</dd></div>
        <div><dt>Creator builds using its products</dt><dd>{creatorBuilds.length}</dd></div>
        <div><dt>Verified reviews</dt><dd>None</dd></div>
      </dl>
      {records.length ? (
        <ul className="build-links">
          {records.map((record) => (
            <li key={record.id}><Link to={`/implementations/${record.slug}`}>{record.name}</Link></li>
          ))}
        </ul>
      ) : (
        <p className="muted">No implementation record references {provider.name}’s products yet. The first published record will appear here with its own evidence.</p>
      )}
      {!!creatorBuilds.length && (
        <ul className="build-links">
          {creatorBuilds.map((build) => (
            <li key={build.id}><Link to={`/builds/${build.slug}`}>{build.name}</Link> <span className="muted">— creator build</span></li>
          ))}
        </ul>
      )}
    </section>
  );

  const aboutTab = (
    <section className="intelligence-section provider-about">
      {listing ? (
        <>
          <p className="lead-text">{listing.about}</p>
          {listing.note && <p className="muted">{listing.note}</p>}
          <h2 className="tab-section-title">Sources</h2>
          <p className="tab-section-note">Read on {listing.sourcedAt}. Oracnet links every listing back to the page it came from.</p>
          <ul className="provider-sources">
            {listing.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={13} aria-hidden /></a>
                <span className="muted"> {source.url.replace(/^https:\/\//, "")}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="lead-text">{provider.description}. This is a sample directory profile for demonstrating discovery and contact workflows. It is not a verified supplier submission or an endorsement.</p>
      )}
      <h2 className="tab-section-title">How company profiles work</h2>
      <ol className="provider-lifecycle">
        <li className={listing?.status !== "claimed" ? "current" : "done"}><strong>Compiled</strong><span>Oracnet summarises the company’s public pages, with links and a retrieval date.</span></li>
        <li className={listing?.status === "claimed" ? "current" : ""}><strong>Claimed</strong><span>The company verifies its domain and takes over its profile and listings.</span></li>
        <li><strong>Maintained</strong><span>The company publishes use cases, products and documentation; independent records and reviews stay separate.</span></li>
      </ol>
      <Link className="button light" to="/provider/claims">Claim this profile</Link>
    </section>
  );

  return (
    <>
      <Breadcrumbs items={[{ name: "Providers", to: "/providers" }, { name: provider.name }]} />
      <header className="implementation-detail-hero provider-hero">
        <div>
          <div className="row provider-title">
            <Logo initials={provider.initials} color={provider.color} />
            <PageHeading eyebrow={`TECHNOLOGY COMPANY · ${statusLabel(provider).toUpperCase()}`} title={provider.name} description={listing?.tagline ?? provider.description} />
          </div>
          <dl className="implementation-header-facts">
            <div><dt>Products</dt><dd>{own.length}</dd></div>
            <div><dt>Use-case listings</dt><dd>{listings.length}</dd></div>
            <div><dt>Region</dt><dd>{provider.region}</dd></div>
            <div><dt>Implementation records</dt><dd>{records.length}</dd></div>
          </dl>
          {listing?.status === "unclaimed" && (
            <p className="provider-listing-note" role="note">
              <ShieldCheck size={16} aria-hidden /> Compiled by {listing.compiledBy} from {provider.name}’s public pages on {listing.sourcedAt}. {provider.name} has not reviewed this profile.
            </p>
          )}
        </div>
        <aside className="card implementation-hero-actions">
          <strong>Talk to {provider.name}</strong>
          <p>Questions about pricing, availability and data terms go to the company directly.</p>
          {provider.website && (
            <a className="button dark" href={provider.website} target="_blank" rel="noopener noreferrer">
              Visit official website <ExternalLink size={15} aria-hidden />
            </a>
          )}
          <button type="button" className="button light" onClick={() => setContact(provider)}>
            Contact {provider.name}
          </button>
          <Link className="button light" to="/solution-compiler">
            Compare against my requirements <ArrowRight size={15} aria-hidden />
          </Link>
        </aside>
      </header>

      <TabbedSections
        label={`${provider.name} profile sections`}
        active={tab}
        onChange={selectTab}
        tabs={[
          ...(listings.length ? [{ id: "use-cases", label: "Use cases", count: listings.length, content: useCasesTab }] : []),
          { id: "products", label: "Products", count: own.length, content: productsTab },
          { id: "evidence", label: "Evidence", count: records.length, content: evidenceTab },
          { id: "about", label: "About & sources", content: aboutTab },
        ]}
      />
    </>
  );
}
