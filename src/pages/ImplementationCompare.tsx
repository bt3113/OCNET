import { useEffect, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Scale } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, EmptyState, ErrorState, Skeleton } from "../components/ui";
import { EvidenceBadge, IllustrativeNotice, StalenessBadge, implementationCostLabel } from "../components/intelligence";
import { implementationBundle, isPublicRecord, useIntelligence } from "../data/intelligence-hooks";
import { implementationFreshness } from "../data/staleness";
import { formatMetricValue, metricComparability } from "../data/metrics";
import { evidenceCoverage } from "../data/evidence";
import { capabilityLabel } from "../data/taxonomy";
import { track } from "../data/analytics";

function Missing({ kind }: { kind: "missing" | "not-disclosed" | "not-comparable" }) {
  const label = kind === "missing" ? "MISSING" : kind === "not-disclosed" ? "NOT DISCLOSED" : "NOT COMPARABLE";
  return <span className={`missing-value missing-${kind}`}>{label}</span>;
}

export default function ImplementationCompare() {
  const [params] = useSearchParams();
  const data = useIntelligence();
  const ids = (params.get("ids") ?? "").split(",").map((value) => value.trim()).filter(Boolean).slice(0, 3);
  useEffect(() => {
    if (ids.length >= 2) track("implementation_compared", ids.join(","));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  if (data.isLoading) return <Skeleton />;
  if (data.isError) return <ErrorState retry={data.refetch} />;
  const selected = ids.map((id) => data.implementations.find((record) => record.id === id)).filter((record): record is NonNullable<typeof record> => !!record && isPublicRecord(record));

  const heading = (
    <PageHeading
      eyebrow="COMPARE IMPLEMENTATIONS"
      title="Compare the context before the result."
      description="Records are shown side by side without a winner, a rating or a hidden score. Values that are missing, undisclosed or measured differently are labelled rather than filled in."
    />
  );
  if (selected.length < 2)
    return (
      <>
        {heading}
        <EmptyState title="Choose two or three implementations" description="Pick records that address a similar outcome from the implementation list, then compare them here." to="/implementations" action="Choose implementations" />
      </>
    );

  const now = new Date();
  const bundles = selected.map((record) => implementationBundle(data, record));
  const metricIds = [...new Set(bundles.flatMap((bundle) => bundle.metrics.map((metric) => metric.metricDefinitionId)))];
  const Row = ({ label, children, hint }: { label: string; children: ReactNode[]; hint?: string }) => (
    <tr>
      <th scope="row">{label}{hint && <small>{hint}</small>}</th>
      {children.map((child, index) => <td key={index} data-label={selected[index].name}>{child}</td>)}
    </tr>
  );
  const Group = ({ title }: { title: string }) => (
    <tr className="comparison-group"><th scope="rowgroup" colSpan={selected.length + 1}>{title}</th></tr>
  );
  const steps = (phase: "before" | "after", index: number) => {
    const list = bundles[index].steps.filter((step) => step.phase === phase).sort((a, b) => a.position - b.position);
    return list.length ? <ol className="compact-steps">{list.map((step) => <li key={step.id}>{step.description}</li>)}</ol> : <Missing kind="missing" />;
  };

  return (
    <>
      <Link className="back-inline" to="/implementations"><ArrowLeft size={16} aria-hidden /> Back to implementations</Link>
      {heading}
      {selected.some((record) => record.demo) && <IllustrativeNotice>All compared records are illustrative. The comparison demonstrates structure, not real outcomes.</IllustrativeNotice>}
      <div className="compare-principle card">
        <Scale size={20} aria-hidden />
        <p><strong>No universal winner.</strong> A lower number in one business does not mean the same architecture will produce it in yours. Metrics are compared only when definitions, units and measurement periods line up.</p>
      </div>
      <div className="comparison-table-wrap card">
        <table className="comparison-table">
          <caption className="visually-hidden">Side-by-side comparison of {selected.length} implementation records</caption>
          <thead>
            <tr>
              <th scope="col">Dimension</th>
              {selected.map((record) => (
                <th scope="col" key={record.id}>
                  <Badge>{record.demo ? "ILLUSTRATIVE" : "RECORD"}</Badge>
                  <Link to={`/implementations/${record.slug}`}>{record.name} <ArrowRight size={14} aria-hidden /></Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Group title="Business context" />
            <Row label="Business">{selected.map((record) => `${record.businessType} · ${record.organizationSizeBand}`)}</Row>
            <Row label="Region">{selected.map((record) => record.region)}</Row>
            <Row label="Locations">{bundles.map((bundle) => bundle.context?.locations ?? <Missing kind="not-disclosed" />)}</Row>
            <Row label="Monthly volume">{bundles.map((bundle) => bundle.context?.volumeLabel ?? <Missing kind="not-disclosed" />)}</Row>
            <Row label="Existing systems">{bundles.map((bundle) => bundle.context?.existingSystems.join(", ") || <Missing kind="missing" />)}</Row>
            <Row label="Technical capability">{bundles.map((bundle) => bundle.context?.technicalCapability ?? <Missing kind="missing" />)}</Row>
            <Row label="Problem">{selected.map((record) => record.problemStatement ?? <Missing kind="missing" />)}</Row>

            <Group title="Process" />
            <Row label="Process before">{selected.map((_, index) => steps("before", index))}</Row>
            <Row label="Process after">{selected.map((_, index) => steps("after", index))}</Row>

            <Group title="Architecture" />
            <Row label="Technology stack">{bundles.map((bundle) => (
              <ul className="compact-steps">{bundle.stack.map((item) => <li key={item.id}>{capabilityLabel(item.capabilityId)}: {data.products.find((product) => product.id === item.productId)?.name ?? item.productId}</li>)}</ul>
            ))}</Row>
            <Row label="Data flows crossing a trust boundary">{bundles.map((bundle) => `${bundle.connections.filter((connection) => connection.trustBoundary).length} of ${bundle.connections.length}`)}</Row>
            <Row label="Reusable Blueprint">{selected.map((record) => {
              const blueprint = data.blueprints.find((item) => record.derivedBlueprintIds.includes(item.id) && item.publicationState === "published" && item.moderationState === "approved");
              return blueprint ? <Link to={`/blueprints/${blueprint.slug}`}>{blueprint.name}</Link> : <Missing kind="missing" />;
            })}</Row>

            <Group title="Economics" />
            <Row label="Implementation duration">{selected.map((record) => record.implementationDuration || <Missing kind="not-disclosed" />)}</Row>
            <Row label="Setup cost">{selected.map((record) => (record.costDisclosureType === "not-disclosed" ? <Missing kind="not-disclosed" /> : implementationCostLabel(record)))}</Row>
            <Row label="Ongoing cost">{selected.map((record) => (record.ongoingMonthlyCost == null ? <Missing kind="not-disclosed" /> : `£${record.ongoingMonthlyCost.toLocaleString("en-GB")} / month`))}</Row>
            <Row label="Maintenance">{selected.map((record) => (record.maintenanceHoursPerMonth == null ? <Missing kind="not-disclosed" /> : `${record.maintenanceHoursPerMonth} h / month (${record.maintenanceBurden ?? "burden not stated"})`))}</Row>

            <Group title="Observed metrics (baseline → observed)" />
            {metricIds.map((metricId) => {
              const definition = data.definitions.find((item) => item.id === metricId);
              const values = bundles.map((bundle) => bundle.metrics.find((metric) => metric.metricDefinitionId === metricId));
              const reference = values.find(Boolean);
              return (
                <Row key={metricId} label={definition?.name ?? metricId} hint={definition?.unit}>
                  {values.map((metric, index) => {
                    if (!metric) return <Missing key={index} kind="missing" />;
                    if (metric.observedValue == null) return <Missing key={index} kind="not-disclosed" />;
                    const comparable = reference && reference !== metric ? metricComparability(reference, metric, data.periods) : { state: "comparable" as const, reason: "" };
                    return (
                      <span key={index} className="metric-compare-cell">
                        <strong>{formatMetricValue(metric.baselineValue, metric.unit)} → {formatMetricValue(metric.observedValue, metric.unit)}</strong>
                        {comparable.state === "not-comparable" && <><Missing kind="not-comparable" /><small>{comparable.reason}</small></>}
                        <EvidenceBadge level={metric.evidenceLevel} compact />
                      </span>
                    );
                  })}
                </Row>
              );
            })}
            <Row label="Measurement period">{selected.map((record) => (record.measurementPeriodStart ? `${record.measurementPeriodStart} → ${record.measurementPeriodEnd}` : <Missing kind="missing" />))}</Row>

            <Group title="Evidence" />
            <Row label="Evidence method">{selected.map((record) => <EvidenceBadge key={record.id} level={record.verificationState} />)}</Row>
            <Row label="Claims beyond self-report">{bundles.map((bundle) => evidenceCoverage(bundle.claims.filter((claim) => claim.public)).summary)}</Row>
            <Row label="Evidence freshness">{selected.map((record) => <StalenessBadge key={record.id} state={implementationFreshness(record, now).state} />)}</Row>
            <Row label="Implementer">{selected.map((record) => {
              const partners = data.implementers.filter((partner) => record.implementerIds.includes(partner.id));
              return partners.length ? partners.map((partner) => <Link key={partner.id} to={`/implementers/${partner.slug}`}>{partner.name}</Link>) : <Missing kind="missing" />;
            })}</Row>
            <Row label="Known limitations">{selected.map((record) => record.knownLimitations ?? <Missing kind="missing" />)}</Row>
          </tbody>
        </table>
      </div>
      <div className="row wrap compare-actions">
        <Link className="button dark" to="/solution-compiler">Adapt to my business <ArrowRight size={16} aria-hidden /></Link>
        <Link className="button light" to="/implementations">Change selection</Link>
      </div>
    </>
  );
}
