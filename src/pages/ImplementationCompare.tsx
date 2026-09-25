import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CircleHelp, Scale } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, ButtonLink, EmptyState, Skeleton } from "../components/ui";
import { EvidenceBadge, StalenessBadge } from "../components/intelligence";
import { useRecords } from "../state";

export default function ImplementationCompare() {
  const [params] = useSearchParams();
  const [emphasis, setEmphasis] = useState("context");
  const ids = (params.get("ids") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 3);
  const { data: implementations = [], isLoading } = useRecords("implementation_records");
  const { data: contexts = [] } = useRecords("implementation_contexts");
  const { data: metrics = [] } = useRecords("implementation_metrics");
  const { data: definitions = [] } = useRecords("metric_definitions");
  const { data: stackItems = [] } = useRecords("implementation_stack_items");
  const { data: products = [] } = useRecords("products");
  const selected = implementations.filter((item) => ids.includes(item.id));
  const metricIds = useMemo(
    () => [
      ...new Set(
        selected.flatMap((implementation) =>
          metrics
            .filter((metric) => metric.implementationId === implementation.id)
            .map((metric) => metric.metricDefinitionId),
        ),
      ),
    ],
    [selected, metrics],
  );

  if (isLoading) return <Skeleton />;
  if (selected.length < 2)
    return (
      <EmptyState
        title="Choose two or three implementations"
        description="Comparison is contextual. Select records that solve a similar outcome, then inspect differences rather than relying on one score."
        to="/implementations"
        action="Choose implementations"
      />
    );

  const contextFor = (id: string) => contexts.find((context) => context.implementationId === id);
  const metricFor = (id: string, metricId: string) =>
    metrics.find(
      (metric) =>
        metric.implementationId === id && metric.metricDefinitionId === metricId,
    );
  const productsFor = (id: string) =>
    stackItems
      .filter((item) => item.implementationId === id)
      .map((item) => products.find((product) => product.id === item.productId)?.name ?? item.productId);

  return (
    <>
      <Link className="back-inline" to="/implementations">
        <ArrowLeft size={16} /> Back to implementations
      </Link>
      <PageHeading
        eyebrow="IMPLEMENTATION COMPARISON"
        title="Compare the context before the result."
        description="The same technology can produce different observations in different operating environments. Missing or incomparable data stays visible."
        action={
          <ButtonLink to="/solution-compiler">
            Adapt to my business <ArrowRight size={16} />
          </ButtonLink>
        }
      />
      <div className="compare-emphasis card">
        <div>
          <Scale size={21} />
          <span>
            <strong>No universal winner</strong>
            <small>Change the visual emphasis without generating a hidden composite score.</small>
          </span>
        </div>
        <label>
          Emphasize
          <select value={emphasis} onChange={(event) => setEmphasis(event.target.value)}>
            <option value="context">Context</option>
            <option value="economics">Economics</option>
            <option value="evidence">Evidence</option>
            <option value="outcomes">Observed outcomes</option>
          </select>
        </label>
      </div>

      <div className={`implementation-comparison emphasis-${emphasis}`}>
        <div className="comparison-header-row comparison-row">
          <div className="comparison-label">Dimension</div>
          {selected.map((implementation) => (
            <div key={implementation.id}>
              <Badge>{implementation.demo ? "DEMO" : "IMPLEMENTATION"}</Badge>
              <Link to={`/implementations/${implementation.slug}`}>
                <strong>{implementation.name}</strong>
                <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>

        <ComparisonRow label="Business type" values={selected.map((item) => item.businessType)} emphasis={emphasis === "context"} />
        <ComparisonRow label="Organization size" values={selected.map((item) => item.organizationSizeBand)} emphasis={emphasis === "context"} />
        <ComparisonRow label="Region" values={selected.map((item) => item.region)} emphasis={emphasis === "context"} />
        <ComparisonRow
          label="Locations"
          values={selected.map((item) => String(contextFor(item.id)?.locations ?? "Not disclosed"))}
          emphasis={emphasis === "context"}
        />
        <ComparisonRow
          label="Operating volume"
          values={selected.map((item) => contextFor(item.id)?.volumeLabel ?? "Not disclosed")}
          emphasis={emphasis === "context"}
        />
        <ComparisonRow
          label="Existing systems"
          values={selected.map((item) => contextFor(item.id)?.existingSystems.join(", ") || "Not recorded")}
          emphasis={emphasis === "context"}
        />
        <ComparisonRow
          label="Implementation duration"
          values={selected.map((item) => item.implementationDuration)}
          emphasis={emphasis === "economics"}
        />
        <ComparisonRow
          label="Illustrative setup cost"
          values={selected.map((item) =>
            item.implementationCost == null
              ? "Not disclosed"
              : `${item.implementationCostCurrency} ${item.implementationCost.toLocaleString()}`,
          )}
          emphasis={emphasis === "economics"}
        />
        <ComparisonRow
          label="Illustrative monthly cost"
          values={selected.map((item) =>
            item.ongoingMonthlyCost == null
              ? "Not disclosed"
              : `${item.implementationCostCurrency} ${item.ongoingMonthlyCost.toLocaleString()}`,
          )}
          emphasis={emphasis === "economics"}
        />
        <ComparisonRow
          label="Maintenance"
          values={selected.map((item) =>
            item.maintenanceHoursPerMonth == null
              ? "Not disclosed"
              : `${item.maintenanceHoursPerMonth} hrs/month`,
          )}
          emphasis={emphasis === "economics"}
        />
        <div className={`comparison-row ${emphasis === "evidence" ? "comparison-emphasized" : ""}`}>
          <div className="comparison-label">Evidence</div>
          {selected.map((item) => (
            <div key={item.id} className="comparison-evidence-cell">
              <EvidenceBadge level={item.verificationState} />
              <StalenessBadge state={item.stalenessState} />
              <small>Last reviewed {item.lastEvidenceReviewAt}</small>
            </div>
          ))}
        </div>
        <ComparisonRow
          label="Technology stack"
          values={selected.map((item) => productsFor(item.id).join(" → "))}
        />

        {metricIds.map((metricId) => {
          const definition = definitions.find((candidate) => candidate.id === metricId);
          return (
            <div
              className={`comparison-row metric-comparison-row ${emphasis === "outcomes" ? "comparison-emphasized" : ""}`}
              key={metricId}
            >
              <div className="comparison-label">
                <strong>{definition?.name ?? metricId}</strong>
                <small>{definition?.unit}</small>
              </div>
              {selected.map((implementation) => {
                const metric = metricFor(implementation.id, metricId);
                return (
                  <div key={implementation.id}>
                    {metric ? (
                      <>
                        <strong>
                          {metric.baselineValue ?? "—"} → {metric.observedValue ?? "—"} {metric.unit}
                        </strong>
                        <EvidenceBadge level={metric.evidenceLevel} compact />
                        <small>Observed comparison; no causal attribution</small>
                      </>
                    ) : (
                      <span className="comparison-missing"><CircleHelp size={14} /> Not recorded</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="comparison-mobile-note card">
        <strong>On smaller screens</strong>
        <p>Each dimension becomes a vertically stacked record so values remain readable without horizontal body overflow.</p>
      </div>
    </>
  );
}

function ComparisonRow({
  label,
  values,
  emphasis = false,
}: {
  label: string;
  values: string[];
  emphasis?: boolean;
}) {
  return (
    <div className={`comparison-row ${emphasis ? "comparison-emphasized" : ""}`}>
      <div className="comparison-label">{label}</div>
      {values.map((value, index) => (
        <div key={`${label}-${index}`}>{value || "Not recorded"}</div>
      ))}
    </div>
  );
}
