import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, GitMerge, ShieldCheck } from "lucide-react";
import { PageHeading } from "../components/layout";
import {
  Badge,
  Breadcrumbs,
  ButtonLink,
  CompareButton,
  EmptyState,
  Logo,
  ReviewCard,
  SaveButton,
  Skeleton,
  Tabs,
  TechnologyCard,
} from "../components/ui";
import {
  BlueprintCard,
  EvidenceBadge,
  ImplementationCard,
  RelationshipTypeBadge,
  SectionIntro,
  StalenessBadge,
} from "../components/intelligence";
import { isPublicRecord } from "../data/intelligence-hooks";
import { relationshipFreshness } from "../data/staleness";
import { isPublicBuild } from "../data/build-domain";
import { ProductMediaList } from "../components/media";
import { useActions, useRecords, useUI } from "../state";

export default function TechnologyIntelligenceDetail() {
  const { slug } = useParams();
  const actions = useActions();
  const { notify } = useUI();
  const [tab, setTab] = useState("Implementation intelligence");
  const { data: products = [], isLoading } = useRecords("products");
  const { data: providers = [] } = useRecords("providers");
  const { data: reviews = [] } = useRecords("reviews");
  const { data: implementations = [] } = useRecords("implementation_records");
  const { data: contexts = [] } = useRecords("implementation_contexts");
  const { data: stackItems = [] } = useRecords("implementation_stack_items");
  const { data: metrics = [] } = useRecords("implementation_metrics");
  const { data: definitions = [] } = useRecords("metric_definitions");
  const { data: blueprints = [] } = useRecords("blueprints");
  const { data: versions = [] } = useRecords("blueprint_versions");
  const { data: blueprintItems = [] } = useRecords("blueprint_stack_items");
  const { data: relationships = [] } = useRecords("technology_relationships");
  const { data: checks = [] } = useRecords("compatibility_checks");
  const { data: useCaseLinks = [] } = useRecords("implementation_use_cases");
  const { data: useCases = [] } = useRecords("use_cases");
  const { data: builds = [] } = useRecords("builds");
  if (isLoading) return <Skeleton />;
  const product = products.find((item) => item.slug === slug);
  if (!product)
    return (
      <EmptyState
        title="Technology not found"
        to="/technologies"
        action="Explore technologies"
      />
    );
  const provider = providers.find((item) => item.id === product.providerId);
  const now = new Date();
  const relatedImplementationIds = stackItems
    .filter((item) => item.productId === product.id)
    .map((item) => item.implementationId);
  const relatedImplementations = implementations.filter((item) =>
    relatedImplementationIds.includes(item.id),
  );
  const relatedBlueprints = blueprints.filter((blueprint) =>
    blueprintItems.some(
      (item) =>
        item.blueprintVersionId === blueprint.currentVersionId &&
        item.productId === product.id,
    ),
  );
  const productRelationships = relationships.filter(
    (relationship) =>
      relationship.sourceProductId === product.id ||
      relationship.targetProductId === product.id,
  );
  const publicImplementations = relatedImplementations.filter(isPublicRecord);
  const recordStacks = publicImplementations.map((record) => new Set(stackItems.filter((item) => item.implementationId === record.id).map((item) => item.productId)));
  const coCounts = new Map<string, number>();
  for (const stack of recordStacks) for (const id of stack) if (id !== product.id) coCounts.set(id, (coCounts.get(id) ?? 0) + 1);
  const coOccurring = [...coCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const useCaseCountMap = new Map<string, number>();
  for (const link of useCaseLinks.filter((item) => publicImplementations.some((record) => record.id === item.implementationId)))
    useCaseCountMap.set(link.useCaseId, (useCaseCountMap.get(link.useCaseId) ?? 0) + 1);
  const useCaseCounts = [...useCaseCountMap.entries()].sort((a, b) => b[1] - a[1]);
  const alternativeIds = new Set(
    blueprintItems.flatMap((item) =>
      item.productId === product.id ? item.alternativeProductIds : item.alternativeProductIds.includes(product.id) && item.productId ? [item.productId, ...item.alternativeProductIds.filter((id) => id !== product.id)] : [],
    ),
  );
  const alternatives = products.filter((candidate) => alternativeIds.has(candidate.id));
  const relatedBuilds = builds.filter((build) => isPublicBuild(build) && build.stack.some((item) => item.productId === product.id));
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Technologies", to: "/technologies" },
          { name: product.name },
        ]}
      />
      <div className="detail-hero technology-intelligence-hero">
        <div className="technology-title-block">
          <Logo initials={product.initials} color={product.color} />
          <div>
            <Badge>TECHNOLOGY COMPONENT</Badge>
            <PageHeading title={product.name} description={product.description} />
            <div className="row wrap">
              <SaveButton id={product.id} name={product.name} />
              <CompareButton product={product} />
              {provider && (
                <Link to={`/providers/${provider.slug}`}>
                  {provider.name} <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="card technology-evidence-summary">
          <ShieldCheck size={22} />
          <strong>Implementation context</strong>
          <p>
            {publicImplementations.length} published record{publicImplementations.length === 1 ? "" : "s"} and {relatedBlueprints.length} Blueprint{relatedBlueprints.length === 1 ? "" : "s"} reference this product. {productRelationships.length} typed relationship{productRelationships.length === 1 ? "" : "s"} recorded.
          </p>
          <small>Demo counts are derived from records; they are not market-share claims.</small>
        </div>
      </div>

      <Tabs
        items={["Implementation intelligence", "Product details", "Media", "Reviews"]}
        value={tab}
        onChange={setTab}
      />

      {tab === "Reviews" ? (
        <section className="intelligence-section">
          <div className="section-title-text">
            <span className="eyebrow">BUYER REVIEWS</span>
            <h2>{reviews.some((review) => review.productId === product.id && review.status === "published") ? "Published buyer reviews" : "Not yet rated"}</h2>
            <p>Reviews submitted in demo mode stay local to this browser until demo moderation.</p>
          </div>
          <div className="detail-columns">
            <section>
              <div className="card prose">
                <form
                  className="form-stack"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const body = String(form.get("review")).trim();
                    if (body.length < 20) {
                      notify("Write at least 20 characters.");
                      return;
                    }
                    void actions
                      .save("reviews", {
                        id: crypto.randomUUID(),
                        name: "Demo buyer",
                        productId: product.id,
                        userId: "demo-user",
                        body,
                        rating: Number(form.get("rating")),
                        status: "pending",
                        provenance: "demo",
                      })
                      .then(() => notify("Review saved for demo moderation"))
                      .catch(() => {});
                    event.currentTarget.reset();
                  }}
                >
                  <label>
                    Your rating
                    <select name="rating">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option value={rating} key={rating}>
                          {rating} of 5
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Your experience
                    <textarea name="review" required minLength={20} maxLength={5000} />
                  </label>
                  <button className="button dark">Submit demo review</button>
                </form>
              </div>
              {reviews
                .filter((review) => review.productId === product.id)
                .map((review) => (
                  <div key={review.id}>
                    <Badge>{review.status} · Demo</Badge>
                    <ReviewCard {...review} />
                  </div>
                ))}
            </section>
            <aside>
              <div className="card side-card">
                <h3>Review boundary</h3>
                <p>Demo reviews are not treated as deployment evidence and do not affect Solution Compiler results.</p>
              </div>
            </aside>
          </div>
        </section>
      ) : tab === "Media" ? (
        <section className="intelligence-section">
          <div className="section-title-text">
            <span className="eyebrow">PRODUCT MEDIA</span>
            <h2>Provider and marketplace media</h2>
          </div>
          <ProductMediaList productId={product.id} />
        </section>
      ) : tab === "Product details" ? (
        <section className="intelligence-section">
          <div className="detail-columns">
            <section className="card prose">
              <h2>About {product.name}</h2>
              <p>{product.description}. Product availability, specifications, commercial terms, security and supported integrations must be confirmed directly with the provider.</p>
              <h3>Capabilities</h3>
              <div className="tags">
                {product.capabilityIds.map((capability) => <span key={capability}>{capability}</span>)}
              </div>
            </section>
            <aside className="card side-card">
              <h3>At a glance</h3>
              <dl className="detail-list">
                <div><dt>Deployment</dt><dd>{product.deployment}</dd></div>
                <div><dt>Pricing</dt><dd>{product.pricing}</dd></div>
                <div><dt>Provenance</dt><dd>{product.provenance}</dd></div>
              </dl>
            </aside>
          </div>
        </section>
      ) : (
        <>
          <section className="intelligence-section">
            <SectionIntro eyebrow="USED IN IMPLEMENTATION RECORDS" title="See the product inside an operating context">
              {publicImplementations.length} published record{publicImplementations.length === 1 ? "" : "s"} reference this product{publicImplementations.every((item) => item.demo) && publicImplementations.length ? " (all illustrative)" : ""}. Counts come from records only — they are not market share.
            </SectionIntro>
            <div className="implementation-grid">
              {publicImplementations.map((implementation) => (
                <ImplementationCard
                  key={implementation.id}
                  implementation={implementation}
                  context={contexts.find((context) => context.implementationId === implementation.id)}
                  metrics={metrics.filter((metric) => metric.implementationId === implementation.id)}
                  metricDefinitions={definitions}
                />
              ))}
            </div>
            {!publicImplementations.length && <div className="card empty-inline">No published implementation record references this technology yet.</div>}
          </section>

          {!!useCaseCounts.length && (
            <section className="intelligence-section">
              <SectionIntro eyebrow="OUTCOMES IN RECORDS" title="Use cases where it was recorded" />
              <div className="tags">
                {useCaseCounts.map(([useCaseId, count]) => {
                  const useCase = useCases.find((item) => item.id === useCaseId);
                  return <Link key={useCaseId} className="tag-link" to={`/use-cases/${useCase?.slug ?? useCaseId}`}>{useCase?.name ?? useCaseId} · {count} record{count === 1 ? "" : "s"}</Link>;
                })}
              </div>
            </section>
          )}

          <section className="intelligence-section">
            <SectionIntro eyebrow="TYPED RELATIONSHIPS" title="Compatibility is a claim with provenance">
              “Observed together” means two products appeared in the same record. It is not verified compatibility.
            </SectionIntro>
            <div className="relationship-grid">
              {productRelationships.map((relationship) => {
                const otherId = relationship.sourceProductId === product.id ? relationship.targetProductId : relationship.sourceProductId;
                const other = products.find((candidate) => candidate.id === otherId);
                const history = checks.filter((candidate) => candidate.relationshipId === relationship.id).sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
                return (
                  <div className="card technology-relationship-card" key={relationship.id}>
                    <strong>{other ? <Link to={`/technologies/${other.slug}`}>{other.name}</Link> : otherId}</strong>
                    <div className="row wrap">
                      <RelationshipTypeBadge type={relationship.relationshipType} />
                      {relationship.evidenceLevel !== "demo" && <EvidenceBadge level={relationship.evidenceLevel} compact />}
                      {relationshipFreshness(relationship, now).state !== "current" && <StalenessBadge state={relationshipFreshness(relationship, now).state} />}
                    </div>
                    <small>Source: {relationship.sourceLabel}</small>
                    {!!relationship.conditions?.length && <small>Conditions: {relationship.conditions.join(" ")}</small>}
                    <small>Last checked {relationship.lastCheckedAt}{history[0] ? ` · latest check ${history[0].result}` : ""}{history.length > 1 ? ` · ${history.length} checks recorded` : ""}</small>
                  </div>
                );
              })}
            </div>
            {!productRelationships.length && <div className="card empty-inline">No typed relationship has been recorded for this product.</div>}
          </section>

          {!!coOccurring.length && (
            <section className="intelligence-section">
              <SectionIntro eyebrow="CO-OCCURRING IN RECORDS" title="Components recorded alongside it">Co-occurrence counts published records containing both products. It says nothing about compatibility.</SectionIntro>
              <div className="stack-table card">
                {coOccurring.slice(0, 5).map(([id, count]) => {
                  const other = products.find((item) => item.id === id);
                  return (
                    <div key={id} className="stack-row">
                      {other ? <Logo initials={other.initials} color={other.color} /> : <span className="logo-tile sand">?</span>}
                      <span>{other ? <Link to={`/technologies/${other.slug}`}>{other.name}</Link> : id}</span>
                      <span className="muted">{count} record{count === 1 ? "" : "s"}</span>
                      <span />
                    </div>
                  );
                })}
              </div>
              {coOccurring.length > 5 && <p className="muted small-print">+ {coOccurring.length - 5} more components recorded alongside it.</p>}
            </section>
          )}

          {!!alternatives.length && (
            <section className="intelligence-section">
              <SectionIntro eyebrow="ALTERNATIVES" title="Recorded as swappable in Blueprints">Only alternatives a Blueprint maintainer recorded for the same capability slot. Swapping still requires a compatibility check.</SectionIntro>
              <div className="grid three">{alternatives.map((candidate) => <TechnologyCard key={candidate.id} product={candidate} />)}</div>
            </section>
          )}

          {!!relatedBlueprints.length && (
            <section className="intelligence-section">
              <SectionIntro eyebrow="BLUEPRINTS" title={`Reference architectures using ${product.name}`} />
              <div className="grid three">
                {relatedBlueprints.map((blueprint) => (
                  <BlueprintCard key={blueprint.id} blueprint={blueprint} version={versions.find((version) => version.id === blueprint.currentVersionId)} stackItems={blueprintItems.filter((item) => item.blueprintVersionId === blueprint.currentVersionId)} products={products} />
                ))}
              </div>
            </section>
          )}

          {!!relatedBuilds.length && (
            <section className="intelligence-section">
              <SectionIntro eyebrow="BUILDS" title="Creator projects using it">Builds are creator showcases, not deployment evidence.</SectionIntro>
              <ul className="build-links">{relatedBuilds.map((build) => <li key={build.id}><Link to={`/builds/${build.slug}`}>{build.name}</Link> <span className="muted">— {build.tagline}</span></li>)}</ul>
            </section>
          )}

          <section className="intelligence-section">
            <div className="card provider-actions">
              <strong>Are you the provider?</strong>
              <p>Providers can claim this profile, submit corrections and relationship evidence. They cannot remove independent implementation records; disputes go to moderation.</p>
              <div className="row wrap">
                <Link className="button light" to="/provider/compatibility">Submit relationship evidence</Link>
                <Link className="button light" to="/provider/implementations">Submit a correction</Link>
                <Link className="button light" to="/provider/claims">Claim this profile</Link>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="implementation-request-banner">
        <div>
          <GitMerge size={25} />
          <span className="eyebrow">DON’T START WITH A PRODUCT</span>
          <h2>Start with the business outcome and constraints.</h2>
          <p>Use the Solution Compiler to see where this technology may or may not fit among other feasible architectures.</p>
        </div>
        <ButtonLink to="/solution-compiler">
          Compile options <ArrowRight size={17} />
        </ButtonLink>
      </div>
    </>
  );
}
