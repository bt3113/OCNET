import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import { PageHeading } from "../components/layout";
import {
  EmptyState,
  ErrorState,
  Modal,
  Skeleton,
} from "../components/ui";
import {
  EvidencePrincipleNotice,
  ImplementationCard,
} from "../components/intelligence";
import { useRecords } from "../state";

export default function ImplementationDiscovery() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const q = params.get("q") ?? "";
  const businessType = params.get("business") ?? "";
  const size = params.get("size") ?? "";
  const region = params.get("region") ?? "";
  const evidence = params.get("evidence") ?? "";
  const blueprintOnly = params.get("blueprint") === "yes";
  const {
    data: implementations = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("implementation_records");
  const { data: contexts = [] } = useRecords("implementation_contexts");
  const { data: metrics = [] } = useRecords("implementation_metrics");
  const { data: definitions = [] } = useRecords("metric_definitions");

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const publicImplementations = useMemo(
    () =>
      implementations
        .filter(
          (item) =>
            item.publicationState === "published" &&
            item.moderationState === "approved" &&
            item.visibility === "public",
        )
        .filter((item) => {
          const text = [
            item.name,
            item.summary,
            item.businessType,
            item.industry,
            item.contextSummary,
          ]
            .join(" ")
            .toLowerCase();
          return (
            (!q || text.includes(q.toLowerCase())) &&
            (!businessType || item.businessType === businessType) &&
            (!size || item.organizationSizeBand === size) &&
            (!region || item.region === region) &&
            (!evidence || item.verificationState === evidence) &&
            (!blueprintOnly || item.derivedBlueprintIds.length > 0)
          );
        })
        .sort((a, b) => b.lastEvidenceReviewAt.localeCompare(a.lastEvidenceReviewAt)),
    [
      implementations,
      q,
      businessType,
      size,
      region,
      evidence,
      blueprintOnly,
    ],
  );

  const businessTypes = [...new Set(implementations.map((item) => item.businessType))];
  const sizes = [...new Set(implementations.map((item) => item.organizationSizeBand))];
  const regions = [...new Set(implementations.map((item) => item.region))];

  const filters = (
    <div className="intelligence-filter-controls">
      <label>
        Business type
        <select value={businessType} onChange={(e) => set("business", e.target.value)}>
          <option value="">All business types</option>
          {businessTypes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        Organization size
        <select value={size} onChange={(e) => set("size", e.target.value)}>
          <option value="">Any size</option>
          {sizes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        Region
        <select value={region} onChange={(e) => set("region", e.target.value)}>
          <option value="">Any region</option>
          {regions.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        Evidence
        <select value={evidence} onChange={(e) => set("evidence", e.target.value)}>
          <option value="">Any evidence level</option>
          <option value="customer-attested">Customer attested</option>
          <option value="evidence-reviewed">Evidence reviewed</option>
          <option value="platform-observed">Platform observed</option>
          <option value="independently-audited">Independently audited</option>
          <option value="creator-reported">Creator reported</option>
          <option value="demo">Demo / synthetic</option>
          <option value="unverified">Unverified</option>
        </select>
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={blueprintOnly}
          onChange={(e) => set("blueprint", e.target.checked ? "yes" : "")}
        />
        Reusable Blueprint available
      </label>
      <button className="button light" type="button" onClick={() => setParams({})}>
        <X size={15} /> Clear
      </button>
    </div>
  );

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;

  return (
    <>
      <PageHeading
        eyebrow="IMPLEMENTATION INTELLIGENCE"
        title="See what was implemented — with context."
        description="Compare structured implementation records before deciding what to reuse, change, or procure. Demo records are explicitly synthetic and do not represent real customers."
        action={
          <Link className="button dark" to="/solution-compiler">
            Build a requirement profile <ArrowRight size={17} />
          </Link>
        }
      />
      <EvidencePrincipleNotice />
      <div className="card implementation-filter-bar">
        <div className="filter-search">
          <Search size={20} />
          <input
            aria-label="Search implementation records"
            placeholder="Search outcome, business type, technology context…"
            value={q}
            onChange={(e) => set("q", e.target.value)}
          />
          <button
            className="button light filter-toggle"
            type="button"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={17} /> Filters
          </button>
        </div>
        <div className="desktop-filters">{filters}</div>
      </div>
      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Refine implementation context"
        description="Use structured filters rather than a hidden recommendation score."
      >
        {filters}
        <button className="button dark" onClick={() => setFiltersOpen(false)}>
          Show {publicImplementations.length} records
        </button>
      </Modal>
      <div className="implementation-results-head">
        <div>
          <strong>{publicImplementations.length} implementation records</strong>
          <span>Current demo dataset · no paid ranking</span>
        </div>
        {selected.length > 0 && (
          <Link
            className="button dark"
            to={`/compare/implementations?ids=${encodeURIComponent(selected.join(","))}`}
          >
            Compare {selected.length} <ArrowRight size={16} />
          </Link>
        )}
      </div>
      <div className="implementation-grid">
        {publicImplementations.map((implementation) => (
          <div className="implementation-select-wrap" key={implementation.id}>
            <label className="implementation-compare-toggle">
              <input
                type="checkbox"
                checked={selected.includes(implementation.id)}
                onChange={(e) => {
                  setSelected((current) => {
                    if (!e.target.checked)
                      return current.filter((id) => id !== implementation.id);
                    if (current.length >= 3) return current;
                    return [...current, implementation.id];
                  });
                }}
              />
              Compare
            </label>
            <ImplementationCard
              implementation={implementation}
              context={contexts.find(
                (context) => context.implementationId === implementation.id,
              )}
              metrics={metrics.filter(
                (metric) => metric.implementationId === implementation.id,
              )}
              metricDefinitions={definitions}
            />
          </div>
        ))}
      </div>
      {!publicImplementations.length && (
        <EmptyState
          title="No implementation records match"
          description="Clear a filter or broaden the outcome. Missing evidence stays missing rather than being inferred."
          to="/implementations"
          action="Clear filters"
        />
      )}
    </>
  );
}
