import { Link, useParams } from "react-router-dom";
import { ArrowRight, GitBranch, Layers3, Workflow } from "lucide-react";
import { PageHeading } from "../components/layout";
import {
  Badge,
  Breadcrumbs,
  ButtonLink,
  EmptyState,
  Skeleton,
  StackVisualizer,
  TechnologyCard,
} from "../components/ui";
import {
  BlueprintCard,
  EvidencePrincipleNotice,
  ImplementationCard,
} from "../components/intelligence";
import { useRecords } from "../state";

export default function UseCaseIntelligenceDetail() {
  const { slug } = useParams();
  const { data: cases = [], isLoading } = useRecords("use_cases");
  const { data: stacks = [] } = useRecords("solution_stacks");
  const { data: products = [] } = useRecords("products");
  const { data: implementations = [] } = useRecords("implementation_records");
  const { data: contexts = [] } = useRecords("implementation_contexts");
  const { data: implementationUseCases = [] } = useRecords("implementation_use_cases");
  const { data: implementationMetrics = [] } = useRecords("implementation_metrics");
  const { data: definitions = [] } = useRecords("metric_definitions");
  const { data: blueprints = [] } = useRecords("blueprints");
  const { data: versions = [] } = useRecords("blueprint_versions");
  const { data: blueprintItems = [] } = useRecords("blueprint_stack_items");
  if (isLoading) return <Skeleton />;
  const useCase = cases.find((item) => item.slug === slug);
  if (!useCase)
    return (
      <EmptyState
        title="Use case not found"
        to="/use-cases"
        action="Explore use cases"
      />
    );
  const implementationIds = implementationUseCases
    .filter((relation) => relation.useCaseId === useCase.id)
    .map((relation) => relation.implementationId);
  const relatedImplementations = implementations.filter(
    (implementation) =>
      implementationIds.includes(implementation.id) &&
      implementation.publicationState === "published",
  );
  const relatedBlueprints = blueprints.filter((blueprint) =>
    blueprint.useCaseIds.includes(useCase.id),
  );
  const pattern = stacks.find((stack) => stack.id === useCase.stackId);
  const productIds = new Set([
    ...(pattern?.items.map((item) => item.productId) ?? []),
    ...blueprintItems
      .filter((item) => relatedBlueprints.some((blueprint) => blueprint.currentVersionId === item.blueprintVersionId))
      .flatMap((item) => (item.productId ? [item.productId] : [])),
  ]);
  const relatedProducts = products.filter((product) => productIds.has(product.id));

  return (
    <>
      <Breadcrumbs items={[{ name: "Use Cases", to: "/use-cases" }, { name: useCase.name }]} />
      <div className="usecase-intelligence-hero">
        <div>
          <Badge>BUSINESS OUTCOME</Badge>
          <PageHeading title={useCase.name} description={useCase.description} />
          <h2>{useCase.outcome}</h2>
        </div>
        <div className="card usecase-intelligence-action">
          <GitBranch size={24} />
          <strong>Start from observed implementations.</strong>
          <p>Then inspect reusable Blueprints and technology choices.</p>
          <ButtonLink to="/solution-compiler">
            Adapt this outcome to my business <ArrowRight size={16} />
          </ButtonLink>
        </div>
      </div>
      <EvidencePrincipleNotice />

      <section className="intelligence-section">
        <div className="section-title-text">
          <span className="eyebrow">COMPARABLE IMPLEMENTATIONS</span>
          <h2>How this outcome has been represented in Oracnet.</h2>
          <p>Current records are synthetic demonstrations until real customer evidence is onboarded.</p>
        </div>
        <div className="implementation-grid">
          {relatedImplementations.map((implementation) => (
            <ImplementationCard
              key={implementation.id}
              implementation={implementation}
              context={contexts.find((context) => context.implementationId === implementation.id)}
              metrics={implementationMetrics.filter((metric) => metric.implementationId === implementation.id)}
              metricDefinitions={definitions}
            />
          ))}
        </div>
        {!relatedImplementations.length && (
          <div className="card empty-inline">No approved implementation records have been attached to this use case yet.</div>
        )}
      </section>

      <section className="intelligence-section">
        <div className="section-title-text">
          <span className="eyebrow">REFERENCE BLUEPRINTS</span>
          <h2>Reusable architecture is separate from evidence.</h2>
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

      {pattern && (
        <section className="intelligence-section">
          <div className="section-title-text">
            <span className="eyebrow">SOLUTION PATTERN</span>
            <h2>Conceptual capability map</h2>
            <p>This is a pattern, not an observed deployment and not a guarantee of compatibility.</p>
          </div>
          <div className="pattern-callout card">
            <Layers3 size={22} />
            <div><strong>{pattern.name}</strong><p>{pattern.description}</p></div>
            <Link to={`/solution-stacks/${pattern.slug}`}>Open pattern <ArrowRight size={15} /></Link>
          </div>
          <StackVisualizer stack={pattern} products={products} />
        </section>
      )}

      <section className="intelligence-section">
        <div className="section-title-text">
          <span className="eyebrow">TECHNOLOGY CAPABILITY MAP</span>
          <h2>Products that appear in related patterns and Blueprints</h2>
        </div>
        <div className="grid three">
          {relatedProducts.slice(0, 6).map((product) => (
            <TechnologyCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <div className="implementation-request-banner">
        <div>
          <Workflow size={25} />
          <span className="eyebrow">FROM OUTCOME TO REQUIREMENT</span>
          <h2>Describe your context before choosing the technology.</h2>
          <p>The Solution Compiler makes business constraints explicit and shows multiple feasible directions.</p>
        </div>
        <ButtonLink to="/solution-compiler">
          Build a requirement profile <ArrowRight size={17} />
        </ButtonLink>
      </div>
    </>
  );
}
