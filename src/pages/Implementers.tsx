import { Link, useParams } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Layers3, MapPin, MessageSquare, ShieldCheck } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, Breadcrumbs, EmptyState, ErrorState, Logo, Skeleton } from "../components/ui";
import { BlueprintCard, EvidenceBadge, ImplementationCard, SectionIntro } from "../components/intelligence";
import { isPublicRecord, implementationBundle, useIntelligence } from "../data/intelligence-hooks";
import { implementationFreshness } from "../data/staleness";
import { capabilityLabel } from "../data/taxonomy";
import { useUI } from "../state";
import { track } from "../data/analytics";
import type { Provider } from "../data/model";

type Data = ReturnType<typeof useIntelligence>;

/** Demonstrated experience only: counts come from published records and their claims. */
function experience(data: Data, partner: Provider) {
  const records = data.implementations.filter((record) => record.implementerIds.includes(partner.id) && isPublicRecord(record));
  const bundles = records.map((record) => implementationBundle(data, record));
  const claims = bundles.flatMap((bundle) => bundle.claims.filter((claim) => claim.public));
  const technologies = [...new Set(bundles.flatMap((bundle) => bundle.stack.map((item) => item.productId)))];
  const useCases = [...new Set(bundles.flatMap((bundle) => bundle.useCaseIds))];
  const blueprints = data.blueprints.filter((blueprint) => records.some((record) => record.derivedBlueprintIds.includes(blueprint.id)) && blueprint.publicationState === "published" && blueprint.moderationState === "approved");
  return {
    records,
    technologies,
    useCases,
    blueprints,
    industries: [...new Set(records.map((record) => record.industry))],
    regions: [...new Set(records.map((record) => record.region))],
    attested: records.filter((record) => implementationBundle(data, record).claims.some((claim) => claim.evidenceLevel === "customer-attested")).length,
    reviewedClaims: claims.filter((claim) => claim.evidenceLevel === "evidence-reviewed").length,
    illustrative: records.every((record) => record.demo),
  };
}

export default function Implementers() {
  const { slug } = useParams();
  const data = useIntelligence();
  if (data.isLoading) return <Skeleton />;
  if (data.isError) return <ErrorState retry={data.refetch} />;
  return slug ? <ImplementerProfile slug={slug} data={data} /> : <ImplementerDirectory data={data} />;
}

function ImplementerDirectory({ data }: { data: Data }) {
  const partners = data.implementers
    .map((partner) => ({ partner, stats: experience(data, partner) }))
    .sort((a, b) => b.stats.records.length - a.stats.records.length || a.partner.name.localeCompare(b.partner.name));
  return (
    <>
      <PageHeading
        eyebrow="IMPLEMENTERS"
        title="Find people by what they have actually deployed."
        description="Profiles are ordered by published implementation records, not by marketing copy, ratings or payment. All current partners and records are fictional demo data."
      />
      <div className="implementer-directory-grid">
        {partners.map(({ partner, stats }) => (
          <article className="card implementer-card" key={partner.id}>
            <div className="row between"><Logo initials={partner.initials} color={partner.color} /><Badge>DEMO PROFILE</Badge></div>
            <Link to={`/implementers/${partner.slug}`}><h3>{partner.name} <ArrowRight size={16} aria-hidden /></h3></Link>
            <p>{partner.description}</p>
            <div className="implementer-facts">
              <span><ClipboardCheck size={14} aria-hidden /> {stats.records.length} published implementation record{stats.records.length === 1 ? "" : "s"}</span>
              <span><ShieldCheck size={14} aria-hidden /> {stats.attested} with customer-attested claims</span>
              <span><Layers3 size={14} aria-hidden /> {stats.blueprints.length} Blueprint{stats.blueprints.length === 1 ? "" : "s"} from their records</span>
              <span><MapPin size={14} aria-hidden /> {stats.regions.join(", ") || partner.region}</span>
            </div>
            {!!stats.technologies.length && <div className="tags">{stats.technologies.map((id) => <span key={id}>{data.products.find((product) => product.id === id)?.name ?? id}</span>)}</div>}
          </article>
        ))}
      </div>
      {!partners.length && <EmptyState title="No implementers yet" description="Profiles become useful through demonstrated work and evidence." />}
    </>
  );
}

function ImplementerProfile({ slug, data }: { slug: string; data: Data }) {
  const { setContact } = useUI();
  const partner = data.implementers.find((item) => item.slug === slug);
  if (!partner) return <EmptyState title="Implementer not found" to="/implementers" action="All implementers" />;
  const stats = experience(data, partner);
  const now = new Date();
  return (
    <>
      <Breadcrumbs items={[{ name: "Implementers", to: "/implementers" }, { name: partner.name }]} />
      <header className="implementation-detail-hero">
        <div>
          <div className="row wrap"><Badge>DEMO PROFILE</Badge><span className="badge">Identity not verified</span></div>
          <PageHeading eyebrow="IMPLEMENTER" title={partner.name} description={partner.description} />
          <dl className="implementation-header-facts">
            <div><dt>Industries (from records)</dt><dd>{stats.industries.join(", ") || "None recorded"}</dd></div>
            <div><dt>Use cases</dt><dd>{stats.useCases.map((id) => data.useCases.find((item) => item.id === id)?.name ?? id).join(", ") || "None recorded"}</dd></div>
            <div><dt>Regions (from records)</dt><dd>{stats.regions.join(", ") || partner.region}</dd></div>
            <div><dt>Availability</dt><dd>Not recorded</dd></div>
            <div><dt>Minimum engagement</dt><dd>Not recorded</dd></div>
            <div><dt>Certifications</dt><dd>None verified by Oracnet</dd></div>
          </dl>
        </div>
        <aside className="card implementation-hero-actions">
          <strong>Demonstrated experience</strong>
          <p>{stats.records.length} published records · {stats.attested} with customer-attested claims · {stats.reviewedClaims} evidence-reviewed claims.</p>
          {stats.illustrative && stats.records.length > 0 && <p className="muted">All of these records are illustrative demo data.</p>}
          <button type="button" className="button dark" onClick={() => { setContact(partner); track("implementer_contacted", partner.id); }}><MessageSquare size={16} aria-hidden /> Contact</button>
        </aside>
      </header>
      <section className="intelligence-section">
        <SectionIntro eyebrow="IMPLEMENTATION RECORDS" title="Deployments recorded for this implementer" />
        <div className="implementation-grid">
          {stats.records.map((record) => (
            <ImplementationCard key={record.id} implementation={record} context={data.contexts.find((context) => context.implementationId === record.id)} metrics={data.metrics.filter((metric) => metric.implementationId === record.id)} metricDefinitions={data.definitions} freshness={implementationFreshness(record, now).state} />
          ))}
        </div>
        {!stats.records.length && <p className="muted">No published implementation records yet. A profile without records shows no experience claims.</p>}
      </section>
      <section className="intelligence-section">
        <SectionIntro eyebrow="TECHNOLOGIES DEPLOYED" title="Components used in their records" />
        <div className="stack-table card">
          {stats.technologies.map((id) => {
            const product = data.products.find((item) => item.id === id);
            const count = stats.records.filter((record) => data.stackItems.some((item) => item.implementationId === record.id && item.productId === id)).length;
            return (
              <div key={id} className="stack-row">
                {product ? <Logo initials={product.initials} color={product.color} /> : <span className="logo-tile sand">?</span>}
                <span><small>{product?.capabilityIds.map(capabilityLabel).join(", ")}</small>{product ? <Link to={`/technologies/${product.slug}`}>{product.name}</Link> : id}</span>
                <span className="muted">{count} record{count === 1 ? "" : "s"}</span>
                <EvidenceBadge level={stats.illustrative ? "demo" : "creator-reported"} compact />
              </div>
            );
          })}
        </div>
      </section>
      {!!stats.blueprints.length && (
        <section className="intelligence-section">
          <SectionIntro eyebrow="BLUEPRINTS" title="Reusable patterns derived from their work" />
          <div className="grid three">
            {stats.blueprints.map((blueprint) => (
              <BlueprintCard key={blueprint.id} blueprint={blueprint} version={data.versions.find((item) => item.id === blueprint.currentVersionId)} stackItems={data.blueprintItems.filter((item) => item.blueprintVersionId === blueprint.currentVersionId)} products={data.products} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
