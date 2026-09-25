import { useMemo } from "react";
import { useRecords } from "../state";
import type { CompilerCatalogue } from "./solution-compiler";
import type { ImplementationRecord } from "./intelligence-model";
import type { ProvBundle } from "./provenance";

/** Loads the evidence graph once per page and exposes typed selectors. */
export function useIntelligence() {
  const queries = {
    implementations: useRecords("implementation_records"),
    contexts: useRecords("implementation_contexts"),
    useCaseLinks: useRecords("implementation_use_cases"),
    processSteps: useRecords("implementation_process_steps"),
    stackItems: useRecords("implementation_stack_items"),
    connections: useRecords("implementation_connections"),
    metrics: useRecords("implementation_metrics"),
    definitions: useRecords("metric_definitions"),
    periods: useRecords("measurement_periods"),
    claims: useRecords("claims"),
    claimEvidence: useRecords("claim_evidence"),
    artifacts: useRecords("evidence_artifacts"),
    reviews: useRecords("evidence_reviews"),
    events: useRecords("verification_events"),
    attestations: useRecords("attestations"),
    blueprints: useRecords("blueprints"),
    versions: useRecords("blueprint_versions"),
    blueprintItems: useRecords("blueprint_stack_items"),
    blueprintConnections: useRecords("blueprint_connections"),
    requirements: useRecords("blueprint_requirements"),
    licenses: useRecords("blueprint_licenses"),
    relationships: useRecords("technology_relationships"),
    checks: useRecords("compatibility_checks"),
    products: useRecords("products"),
    providers: useRecords("providers"),
    useCases: useRecords("use_cases"),
    implementers: useRecords("integrators"),
  };
  const values = Object.values(queries);
  const isLoading = values.some((query) => query.isLoading);
  const isError = values.some((query) => query.isError);
  const data = {
    implementations: queries.implementations.data ?? [],
    contexts: queries.contexts.data ?? [],
    useCaseLinks: queries.useCaseLinks.data ?? [],
    processSteps: queries.processSteps.data ?? [],
    stackItems: queries.stackItems.data ?? [],
    connections: queries.connections.data ?? [],
    metrics: queries.metrics.data ?? [],
    definitions: queries.definitions.data ?? [],
    periods: queries.periods.data ?? [],
    claims: queries.claims.data ?? [],
    claimEvidence: queries.claimEvidence.data ?? [],
    artifacts: queries.artifacts.data ?? [],
    reviews: queries.reviews.data ?? [],
    events: queries.events.data ?? [],
    attestations: queries.attestations.data ?? [],
    blueprints: queries.blueprints.data ?? [],
    versions: queries.versions.data ?? [],
    blueprintItems: queries.blueprintItems.data ?? [],
    blueprintConnections: queries.blueprintConnections.data ?? [],
    requirements: queries.requirements.data ?? [],
    licenses: queries.licenses.data ?? [],
    relationships: queries.relationships.data ?? [],
    checks: queries.checks.data ?? [],
    products: queries.products.data ?? [],
    providers: queries.providers.data ?? [],
    useCases: queries.useCases.data ?? [],
    implementers: queries.implementers.data ?? [],
  };
  const catalogue: CompilerCatalogue = useMemo(
    () => ({
      implementations: data.implementations,
      contexts: data.contexts,
      implementationUseCases: data.useCaseLinks,
      implementationStackItems: data.stackItems,
      implementationConnections: data.connections,
      blueprints: data.blueprints,
      blueprintVersions: data.versions,
      blueprintItems: data.blueprintItems,
      blueprintConnections: data.blueprintConnections,
      products: data.products,
      relationships: data.relationships,
      compatibilityChecks: data.checks,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    values.map((query) => query.dataUpdatedAt),
  );
  return {
    ...data,
    catalogue,
    isLoading,
    isError,
    refetch: () => values.forEach((query) => void query.refetch()),
  };
}

export type IntelligenceData = ReturnType<typeof useIntelligence>;

export function isPublicRecord(record: ImplementationRecord) {
  return record.publicationState === "published" && record.moderationState === "approved" && record.visibility === "public";
}

export function implementationBundle(data: IntelligenceData, record: ImplementationRecord) {
  const metrics = data.metrics.filter((metric) => metric.implementationId === record.id);
  const metricIds = new Set(metrics.map((metric) => metric.id));
  const claims = data.claims.filter(
    (claim) => (claim.subjectType === "implementation" && claim.subjectId === record.id) || (claim.subjectType === "metric" && metricIds.has(claim.subjectId)),
  );
  const claimIds = new Set(claims.map((claim) => claim.id));
  const links = data.claimEvidence.filter((link) => claimIds.has(link.claimId));
  const artifactIds = new Set(links.map((link) => link.evidenceArtifactId));
  return {
    record,
    context: data.contexts.find((context) => context.implementationId === record.id),
    useCaseIds: data.useCaseLinks.filter((link) => link.implementationId === record.id).map((link) => link.useCaseId),
    steps: data.processSteps.filter((step) => step.implementationId === record.id),
    stack: data.stackItems.filter((item) => item.implementationId === record.id),
    connections: data.connections.filter((connection) => connection.implementationId === record.id),
    metrics,
    periods: data.periods.filter((period) => period.implementationId === record.id),
    claims,
    links,
    artifacts: data.artifacts.filter((artifact) => artifactIds.has(artifact.id)),
    reviews: data.reviews.filter((review) => claimIds.has(review.claimId)),
    attestations: data.attestations.filter((attestation) => attestation.implementationId === record.id),
    events: data.events.filter((event) => event.subjectId === record.id || claimIds.has(event.subjectId)),
  };
}

export type ImplementationBundle = ReturnType<typeof implementationBundle>;

export function provBundle(bundle: ImplementationBundle): ProvBundle {
  return {
    record: bundle.record,
    metrics: bundle.metrics,
    periods: bundle.periods,
    claims: bundle.claims,
    links: bundle.links,
    artifacts: bundle.artifacts,
    reviews: bundle.reviews,
    attestations: bundle.attestations,
    events: bundle.events,
  };
}
