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
  SaveButton,
  Skeleton,
  TechnologyCard,
} from "../components/ui";
import {
  BlueprintCard,
  EvidenceBadge,
  ImplementationCard,
} from "../components/intelligence";
import { useRecords } from "../state";

export default function TechnologyIntelligenceDetail() {
  const { slug } = useParams();
  const { data: products = [], isLoading } = useRecords("products");
  const { data: providers = [] } = useRecords("providers");
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
  const coProducts = [
    ...new Set(
      productRelationships.map((relationship) =>
        relationship.sourceProductId === product.id
          ? relationship.targetProductId
          : relationship.sourceProductId,
      ),
    ),
  ]
    .map((id) => products.find((candidate) => candidate.id === id))
    .filter((item): item is NonNullable<typeof item> => !!item);

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Technologies", to: "/technologies" },
          { name: product.name },
        ]}
      />
      <div className="technology-intelligence-hero">
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
            {relatedImplementations.length} synthetic Oracnet record{relatedImplementations.length === 1 ? "" : "s"} currently reference this product.
          </p>
          <small>Demo counts are derived from records; they are not market-share claims.</small>
        </div>
      </div>

      <section className="intelligence-section">
        <div className="section-title-text">
          <span className="eyebrow">USED IN IMPLEMENTATIONS</span>
          <h2>See the product inside an operating context</h2>
          <p>Use an implementation record to understand role and surrounding components before evaluating the product in isolation.</p>
        </div>
        <div className="implementation-grid">
          {relatedImplementations.map((implementation) => (
            <ImplementationCard
              key={implementation.id}
              implementation={implementation}
              context={contexts.find((context) => context.implementationId === implementation.id)}
              metrics={metrics.filter((metric) => metric.implementationId === implementation.id)}
              metricDefinitions={definitions}
            />
          ))}
        </div>
        {!relatedImplementations.length && (
          <div className="card empty-inline">No approved implementation record references this technology yet.</div>
        )}
      </section>

      <section className="intelligence-section">
        <div className="section-title-text">
          <span className="eyebrow">RECORDED RELATIONSHIPS</span>
          <h2>Compatibility is a claim with provenance</h2>
          <p>Appearing together does not automatically mean native or officially supported integration.</p>
        </div>
        <div className="relationship-grid">
          {productRelationships.map((relationship) => {
            const otherId = relationship.sourceProductId === product.id
              ? relationship.targetProductId
              : relationship.sourceProductId;
            const other = products.find((candidate) => candidate.id === otherId);
            const check = checks.find((candidate) => candidate.relationshipId === relationship.id);
            return (
              <div className="card technology-relationship-card" key={relationship.id}>
                <GitMerge size={20} />
                <div>
                  <strong>{other?.name ?? otherId}</strong>
                  <span>{relationship.relationshipType.replaceAll("-", " ")}</span>
                  <p>{relationship.sourceLabel}</p>
                  <div className="row wrap">
                    <EvidenceBadge level={relationship.evidenceLevel} compact />
                    <Badge>{check?.result ?? "unknown"}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!productRelationships.length && (
          <div className="card empty-inline">No evidence-backed compatibility relationship has been recorded.</div>
        )}
      </section>

      {!!relatedBlueprints.length && (
        <section className="intelligence-section">
          <div className="section-title-text">
            <span className="eyebrow">BLUEPRINTS</span>
            <h2>Reference architectures using {product.name}</h2>
          </div>
          <div className="grid three">
            {relatedBlueprints.map((blueprint) => (
              <BlueprintCard
                key={blueprint.id}
                blueprint={blueprint}
                version={versions.find((version) => version.id === blueprint.currentVersionId)}
                stackItems={blueprintItems.filter((item) => item.blueprintVersionId === blueprint.currentVersionId)}
                products={products}
              />
            ))}
          </div>
        </section>
      )}

      {!!coProducts.length && (
        <section className="intelligence-section">
          <div className="section-title-text">
            <span className="eyebrow">CO-OCCURRING COMPONENTS</span>
            <h2>Products connected in recorded relationships</h2>
          </div>
          <div className="grid three">
            {coProducts.slice(0, 6).map((candidate) => (
              <TechnologyCard key={candidate.id} product={candidate} />
            ))}
          </div>
        </section>
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
