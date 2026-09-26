import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, GitBranch, Layers3, Workflow } from "lucide-react";
import { PageHeading } from "../components/layout";
import {
  Breadcrumbs,
  ButtonLink,
  EmptyState,
  Skeleton,
  StackVisualizer,
  TabbedSections,
  TechnologyCard,
} from "../components/ui";
import {
  BlueprintCard,
  ImplementationCard,
} from "../components/intelligence";
import { useRecords } from "../state";
import { isPublicRecord } from "../data/intelligence-hooks";
import { templateForUseCase } from "../data/category-templates";
import { capabilityLabel } from "../data/taxonomy";

export default function UseCaseIntelligenceDetail() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "records";
  const selectTab = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "records") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  };
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
  const { data: integrators = [] } = useRecords("integrators");
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
    (implementation) => implementationIds.includes(implementation.id) && isPublicRecord(implementation),
  );
  const template = templateForUseCase(useCase.id);
  const nonDemo = relatedImplementations.filter((implementation) => !implementation.demo);
  const implementers = integrators.filter((partner) => relatedImplementations.some((record) => record.implementerIds.includes(partner.id)));
  const relatedBlueprints = blueprints.filter(
    (blueprint) => blueprint.useCaseIds.includes(useCase.id) && blueprint.publicationState === "published" && blueprint.moderationState === "approved",
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
          <PageHeading eyebrow="BUSINESS OUTCOME" title={useCase.name} description={useCase.description} />
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
      <TabbedSections
        label="Use case sections"
        active={tab}
        onChange={selectTab}
        tabs={[
          { id: "records", label: "Implementations", count: relatedImplementations.length, content: (<>
      <section className="intelligence-section">
        <div className="section-title-text">
          <h2>Businesses that implemented this outcome</h2>
          <p>{relatedImplementations.length} published record{relatedImplementations.length === 1 ? "" : "s"}. Different businesses chose different architectures for the same outcome.</p>
        </div>
        {relatedImplementations.length >= 2 && (
          <Link className="button light compare-link" to={`/compare/implementations?ids=${encodeURIComponent(relatedImplementations.slice(0, 3).map((item) => item.id).join(","))}`}>
            Compare these approaches <ArrowRight size={15} />
          </Link>
        )}
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

        <p className="tab-section-note">
          {nonDemo.length >= 5
            ? `${nonDemo.length} non-demo records are available; pattern summaries will be shown with their sample size.`
            : `Cross-record patterns are not shown: Oracnet needs at least five real (non-illustrative) records for an outcome, and this one has ${nonDemo.length}.`}
        </p>
          </>) },
          { id: "blueprints", label: "Blueprints", count: relatedBlueprints.length, content: (<>
      <section className="intelligence-section">
        <div className="section-title-text">
          <h2>Reusable Blueprints for this outcome</h2>
          <p>Sanitized patterns with their own reuse rights. A Blueprint does not inherit any record’s evidence.</p>
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

          </>) },
          { id: "needs", label: "What it needs", content: (<>
      {template && (
        <section className="intelligence-section">
          <div className="section-title-text">
            <h2>What an approach needs to provide</h2>
            <p>Capabilities, not vendors. Any product that fills a slot can be evaluated in the Solution Compiler.</p>
          </div>
          <div className="capability-map">
            {template.requiredCapabilities.map((capability) => (
              <div key={capability} className="card capability-slot required"><small>Required</small><strong>{capabilityLabel(capability)}</strong><span>Satisfied by: {(template.capabilityEquivalents[capability] ?? [capability]).map(capabilityLabel).join(", ")}</span></div>
            ))}
            {template.optionalCapabilities.map((capability) => (
              <div key={capability} className="card capability-slot"><small>Common, optional</small><strong>{capabilityLabel(capability)}</strong></div>
            ))}
          </div>
        </section>
      )}

      {pattern && (
        <section className="intelligence-section">
          <div className="section-title-text">
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

          </>) },
          { id: "technology", label: "Technologies & implementers", count: relatedProducts.length, content: (<>
      <section className="intelligence-section">
        <div className="section-title-text">
          <h2>Technologies in related patterns and Blueprints</h2>
        </div>
        <div className="grid three">
          {relatedProducts.slice(0, 6).map((product) => (
            <TechnologyCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {!!implementers.length && (
        <section className="intelligence-section">
          <div className="section-title-text">
            <h2>People with published records for this outcome</h2>
          </div>
          <div className="grid three">
            {implementers.map((partner) => (
              <Link key={partner.id} className="card workspace-row" to={`/implementers/${partner.slug}`}>
                <span className="category-icon sand"><Workflow size={20} /></span>
                <span><strong>{partner.name}</strong><small>{relatedImplementations.filter((record) => record.implementerIds.includes(partner.id)).length} record(s) for this outcome</small></span>
              </Link>
            ))}
          </div>
        </section>
      )}

          </>) },
        ]}
      />

      <div className="implementation-request-banner">
        <div>
          <Workflow size={25} />
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
