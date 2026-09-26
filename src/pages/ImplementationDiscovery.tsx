import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Scale, Search, SlidersHorizontal, X } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Drawer, EmptyState, ErrorState, Skeleton } from "../components/ui";
import { ImplementationCard } from "../components/intelligence";
import { isPublicRecord, useIntelligence } from "../data/intelligence-hooks";
import { implementationFreshness } from "../data/staleness";
import { compareContexts, contextFromImplementation } from "../data/context-similarity";
import { evidenceLevelInfo } from "../data/evidence";
import { track } from "../data/analytics";
import type { EvidenceLevel, ImplementationRecord } from "../data/intelligence-model";

const costBands: Record<string, [number, number]> = { "under-1k": [0, 999], "1k-3k": [1000, 3000], "3k-6k": [3000, 6000], "over-6k": [6000, Number.POSITIVE_INFINITY] };
const ongoingBands: Record<string, [number, number]> = { "under-200": [0, 199], "200-500": [200, 500], "over-500": [500, Number.POSITIVE_INFINITY] };
const durationBands: Record<string, [number, number]> = { "up-to-2": [0, 2], "3-5": [3, 5], "over-5": [6, Number.POSITIVE_INFINITY] };
const weeks = (duration: string) => {
  const match = duration.match(/(\d+)\s*(week|month)/i);
  if (!match) return null;
  return Number(match[1]) * (/month/i.test(match[2]) ? 4 : 1);
};
const overlaps = (low: number | null | undefined, high: number | null | undefined, band: [number, number]) =>
  low != null && (high ?? low) >= band[0] && low <= band[1];

const filterLabels: Record<string, string> = {
  q: "Search",
  useCase: "Use case",
  industry: "Industry",
  business: "Business type",
  size: "Size",
  region: "Region",
  tech: "Technology",
  implementer: "Implementer",
  evidence: "Evidence method",
  attested: "Customer-attested claims",
  reviewed: "Evidence-reviewed claims",
  cost: "Setup cost",
  ongoing: "Ongoing cost",
  duration: "Duration",
  blueprint: "Blueprint available",
  freshness: "Freshness",
  similarTo: "Similar context to",
};

export default function ImplementationDiscovery() {
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState(false);
  const data = useIntelligence();
  const get = (key: string) => params.get(key) ?? "";
  const compare = get("compare").split(",").filter(Boolean);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    if (key !== "q" && key !== "compare" && value) track("filter_use", key);
  };
  const now = useMemo(() => new Date(), []);

  const rows = useMemo(() => {
    const publicRecords = data.implementations.filter(isPublicRecord);
    const reference = publicRecords.find((record) => record.id === params.get("similarTo"));
    const linkedUseCases = (id: string) => data.useCaseLinks.filter((link) => link.implementationId === id).map((link) => link.useCaseId);
    const referenceVector = reference ? contextFromImplementation(reference, data.contexts.find((context) => context.implementationId === reference.id), linkedUseCases(reference.id)) : null;
    return publicRecords
      .map((record) => {
        const context = data.contexts.find((item) => item.implementationId === record.id);
        const stack = data.stackItems.filter((item) => item.implementationId === record.id);
        const metricIds = new Set(data.metrics.filter((metric) => metric.implementationId === record.id).map((metric) => metric.id));
        const claims = data.claims.filter((claim) => claim.public && (claim.subjectId === record.id || metricIds.has(claim.subjectId)));
        const similarity = referenceVector && record.id !== reference?.id ? compareContexts(referenceVector, contextFromImplementation(record, context, linkedUseCases(record.id))) : undefined;
        return { record, context, stack, claims, useCases: linkedUseCases(record.id), freshness: implementationFreshness(record, now).state, similarity };
      })
      .filter(({ record, context, stack, claims, useCases, freshness, similarity }) => {
        const q = get("q").toLowerCase();
        const text = [record.name, record.summary, record.businessType, record.industry, record.contextSummary, ...(context?.existingSystems ?? []), ...stack.map((item) => data.products.find((product) => product.id === item.productId)?.name ?? "")]
          .join(" ")
          .toLowerCase();
        const cost = costBands[get("cost")];
        const ongoing = ongoingBands[get("ongoing")];
        const duration = durationBands[get("duration")];
        const recordWeeks = weeks(record.implementationDuration);
        return (
          (!q || q.split(/\s+/).every((term) => text.includes(term))) &&
          (!get("useCase") || useCases.includes(get("useCase"))) &&
          (!get("industry") || record.industry === get("industry")) &&
          (!get("business") || record.businessType === get("business")) &&
          (!get("size") || record.organizationSizeBand === get("size")) &&
          (!get("region") || record.region === get("region")) &&
          (!get("tech") || stack.some((item) => item.productId === get("tech"))) &&
          (!get("implementer") || record.implementerIds.includes(get("implementer"))) &&
          (!get("evidence") || record.verificationState === get("evidence") || claims.some((claim) => claim.evidenceLevel === get("evidence"))) &&
          (!get("attested") || claims.some((claim) => claim.evidenceLevel === "customer-attested")) &&
          (!get("reviewed") || claims.some((claim) => claim.evidenceLevel === "evidence-reviewed")) &&
          (!get("cost") || (get("cost") === "undisclosed" ? record.costDisclosureType === "not-disclosed" : !!cost && overlaps(record.implementationCostLow ?? record.implementationCost, record.implementationCostHigh ?? record.implementationCost, cost))) &&
          (!get("ongoing") || (!!ongoing && overlaps(record.ongoingMonthlyCost, record.ongoingMonthlyCost, ongoing))) &&
          (!get("duration") || (!!duration && recordWeeks != null && recordWeeks >= duration[0] && recordWeeks <= duration[1])) &&
          (!get("blueprint") || record.derivedBlueprintIds.some((id) => data.blueprints.some((blueprint) => blueprint.id === id && blueprint.publicationState === "published" && blueprint.moderationState === "approved"))) &&
          (!get("freshness") || freshness === get("freshness")) &&
          (!get("similarTo") || (similarity != null && (get("minSimilarity") === "medium" ? similarity.level !== "low" : true)))
        );
      })
      .sort((a, b) =>
        get("similarTo")
          ? (b.similarity?.score ?? -1) - (a.similarity?.score ?? -1)
          : get("sort") === "cost"
            ? (a.record.implementationCostLow ?? a.record.implementationCost ?? Infinity) - (b.record.implementationCostLow ?? b.record.implementationCost ?? Infinity)
            : b.record.lastEvidenceReviewAt.localeCompare(a.record.lastEvidenceReviewAt),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params, now]);

  if (data.isLoading) return <Skeleton />;
  if (data.isError) return <ErrorState retry={data.refetch} />;

  const publicRecords = data.implementations.filter(isPublicRecord);
  const distinct = (values: string[]) => [...new Set(values)].filter(Boolean).sort();
  const technologies = distinct(data.stackItems.filter((item) => publicRecords.some((record) => record.id === item.implementationId)).map((item) => item.productId));
  const active = Object.keys(filterLabels).filter((key) => params.get(key));
  const toggleCompare = (record: ImplementationRecord) => {
    const next = compare.includes(record.id) ? compare.filter((id) => id !== record.id) : [...compare, record.id].slice(-3);
    set("compare", next.join(","));
  };
  const select = (key: string, label: string, options: [string, string][]) => (
    <label key={key}>
      {label}
      <select value={get(key)} onChange={(event) => set(key, event.target.value)}>
        <option value="">Any</option>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );
  const check = (key: string, label: string) => (
    <label className="checkbox-label" key={key}>
      <input type="checkbox" checked={!!get(key)} onChange={(event) => set(key, event.target.checked ? "yes" : "")} />
      {label}
    </label>
  );
  const group = (title: string, children: ReactNode) => (
    <fieldset className="filter-group">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
  const secondary = ["business", "size", "similarTo", "implementer", "blueprint", "evidence", "reviewed", "freshness", "ongoing", "duration"];
  const filters = (
    <div className="implementation-filters">
      {group("Most used", <>
        {select("useCase", "Use case", data.useCases.filter((useCase) => data.useCaseLinks.some((link) => link.useCaseId === useCase.id)).map((useCase) => [useCase.id, useCase.name]))}
        {select("industry", "Industry", distinct(publicRecords.map((record) => record.industry)).map((value) => [value, value]))}
        {select("region", "Region", distinct(publicRecords.map((record) => record.region)).map((value) => [value, value]))}
        {select("tech", "Technology", technologies.map((id) => [id, data.products.find((product) => product.id === id)?.name ?? id]))}
        {select("cost", "Setup cost", [["under-1k", "Under £1k"], ["1k-3k", "£1k–£3k"], ["3k-6k", "£3k–£6k"], ["over-6k", "Over £6k"], ["undisclosed", "Not disclosed"]])}
        {check("attested", "Has customer-attested claims")}
      </>)}
      <details className="more-filters" open={secondary.some((key) => params.get(key)) || undefined}>
        <summary>More filters</summary>
        {group("Context", <>
          {select("business", "Business type", distinct(publicRecords.map((record) => record.businessType)).map((value) => [value, value]))}
          {select("size", "Organization size", distinct(publicRecords.map((record) => record.organizationSizeBand)).map((value) => [value, value]))}
          {select("similarTo", "Similar context to", publicRecords.map((record) => [record.id, record.name]))}
        </>)}
        {group("Delivery", <>
          {select("implementer", "Implementer", data.implementers.filter((partner) => publicRecords.some((record) => record.implementerIds.includes(partner.id))).map((partner) => [partner.id, partner.name]))}
          {check("blueprint", "Reusable Blueprint available")}
          {select("ongoing", "Ongoing cost / month", [["under-200", "Under £200"], ["200-500", "£200–£500"], ["over-500", "Over £500"]])}
          {select("duration", "Implementation duration", [["up-to-2", "Up to 2 weeks"], ["3-5", "3–5 weeks"], ["over-5", "Over 5 weeks"]])}
        </>)}
        {group("Evidence", <>
          {select("evidence", "Evidence method", (Object.keys(evidenceLevelInfo) as EvidenceLevel[]).map((level) => [level, evidenceLevelInfo[level].label]))}
          {check("reviewed", "Has evidence-reviewed claims")}
          {select("freshness", "Freshness", [["current", "Current"], ["review-due", "Review due"], ["stale", "Stale"], ["unknown", "Unknown"]])}
        </>)}
      </details>
    </div>
  );

  return (
    <>
      <PageHeading
        eyebrow="IMPLEMENTATION RECORDS"
        title="See what comparable businesses actually implemented."
        description="Context, architecture, cost and observed results for each deployment — with evidence on every claim. Observed values, not forecasts."
        action={<Link className="button dark" to="/solution-compiler">Build a requirement profile <ArrowRight size={17} aria-hidden /></Link>}
      />
      <div className="discovery-layout">
        <aside className="discovery-filters card" aria-label="Filters">
          <div className="row between"><strong>Filters</strong>{!!active.length && <button type="button" className="text-button" onClick={() => setParams(compare.length ? { compare: compare.join(",") } : {}, { replace: true })}>Clear all</button>}</div>
          {filters}
        </aside>
        <div className="discovery-results">
          <div className="card filter-search-bar">
            <Search size={19} aria-hidden />
            <input aria-label="Search implementation records" placeholder="Search outcome, business, system or technology…" value={get("q")} onChange={(event) => set("q", event.target.value)} />
            <button className="button light filter-toggle" type="button" onClick={() => setSheet(true)} aria-label={`Filters${active.length ? ` (${active.length} active)` : ""}`}>
              <SlidersHorizontal size={17} aria-hidden /> Filters{active.length ? ` · ${active.length}` : ""}
            </button>
          </div>
          {!!active.length && (
            <div className="active-filters" aria-label="Active filters">
              {active.map((key) => (
                <button type="button" key={key} onClick={() => set(key, "")} aria-label={`Remove filter ${filterLabels[key]}`}>
                  {filterLabels[key]}: {key === "tech" ? data.products.find((product) => product.id === get(key))?.name : key === "similarTo" ? publicRecords.find((record) => record.id === get(key))?.name : get(key)} <X size={12} aria-hidden />
                </button>
              ))}
            </div>
          )}
          <div className="implementation-results-head">
            <div>
              <strong role="status" aria-live="polite">{rows.length} implementation record{rows.length === 1 ? "" : "s"}</strong>
              <span>Organic ordering only — no paid placement.</span>
            </div>
            <label className="sort-control">
              Sort
              <select value={get("similarTo") ? "similarity" : get("sort") || "reviewed"} disabled={!!get("similarTo")} onChange={(event) => set("sort", event.target.value === "reviewed" ? "" : event.target.value)}>
                <option value="reviewed">Most recently reviewed</option>
                <option value="cost">Lowest disclosed setup cost</option>
                {get("similarTo") && <option value="similarity">Context similarity</option>}
              </select>
            </label>
          </div>
          <div className="implementation-grid">
            {rows.map(({ record, context, freshness, similarity }) => (
              <ImplementationCard
                key={record.id}
                implementation={record}
                context={context}
                metrics={data.metrics.filter((metric) => metric.implementationId === record.id)}
                metricDefinitions={data.definitions}
                freshness={freshness}
                similarity={similarity}
                compare={{ selected: compare.includes(record.id), disabled: compare.length >= 3, toggle: () => toggleCompare(record) }}
              />
            ))}
          </div>
          {!rows.length && <EmptyState title="No implementation records match" description="Remove a filter or broaden the search. Missing evidence stays missing — nothing is inferred to fill gaps." to="/implementations" action="Clear filters" />}
        </div>
      </div>
      {compare.length > 0 && (
        <div className="comparison-tray" role="region" aria-label="Comparison tray">
          <Scale size={18} aria-hidden />
          <span><strong>{compare.length} of 3 selected</strong> {compare.map((id) => data.implementations.find((record) => record.id === id)?.name).filter(Boolean).join(" · ")}</span>
          <button type="button" className="button light" onClick={() => set("compare", "")}>Clear</button>
          {compare.length >= 2 ? (
            <Link className="button dark" to={`/compare/implementations?ids=${encodeURIComponent(compare.join(","))}`} onClick={() => track("implementation_compared", compare.join(","))}>
              Compare <ArrowRight size={15} aria-hidden />
            </Link>
          ) : (
            <span className="muted">Select one more</span>
          )}
        </div>
      )}
      <Drawer open={sheet} onClose={() => setSheet(false)} title="Filter implementation records" description="Filters apply immediately and are saved in the page address.">
        {filters}
        <button className="button dark sheet-done" type="button" onClick={() => setSheet(false)}>Show {rows.length} record{rows.length === 1 ? "" : "s"}</button>
      </Drawer>
    </>
  );
}
