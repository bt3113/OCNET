import type {
  ImplementationMetric,
  MeasurementPeriod,
  MetricDefinition,
} from "./intelligence-model";

/**
 * Metric arithmetic and comparison. Output wording is observational
 * ("observed after implementation"); it never attributes cause.
 */
export interface MetricChange {
  absolute: number | null;
  /** Relative change; null when invalid (no baseline, zero baseline, or rate units). */
  percentage: number | null;
  /** Percentage-point change for rate metrics measured in %. */
  percentagePoints: number | null;
  movement: "higher" | "lower" | "unchanged" | null;
  /** Whether the movement is in the metric's stated preferred direction. */
  inPreferredDirection: boolean | null;
  notes: string[];
}

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

export function metricChange(
  baseline: number | null,
  observed: number | null,
  unit: string,
  direction: MetricDefinition["direction"] = "neutral",
): MetricChange {
  const notes: string[] = [];
  if (baseline == null || observed == null) {
    notes.push(baseline == null ? "No baseline recorded, so no change can be calculated." : "No observed value recorded.");
    return { absolute: null, percentage: null, percentagePoints: null, movement: null, inPreferredDirection: null, notes };
  }
  const absolute = round(observed - baseline, 4);
  const rate = unit.trim() === "%";
  const percentagePoints = rate ? round(absolute, 2) : null;
  let percentage: number | null = null;
  if (rate) notes.push("Rate metric: change is shown in percentage points.");
  else if (baseline === 0) notes.push("Baseline is zero, so a relative change is undefined.");
  else percentage = round(((observed - baseline) / Math.abs(baseline)) * 100, 1);
  const movement = absolute > 0 ? "higher" : absolute < 0 ? "lower" : "unchanged";
  const inPreferredDirection =
    direction === "neutral" || movement === "unchanged"
      ? null
      : (direction === "lower-better") === (movement === "lower");
  return { absolute, percentage, percentagePoints, movement, inPreferredDirection, notes };
}

export function formatMetricValue(value: number | null, unit: string) {
  if (value == null) return "Not recorded";
  const formatted = value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
  if (unit === "%") return `${formatted}%`;
  if (unit === "GBP") return `£${formatted}`;
  if (unit === "count") return formatted;
  return `${formatted} ${unit}`;
}

/** Plain-language, non-causal description of the observed difference. */
export function describeChange(change: MetricChange, unit: string) {
  if (change.absolute == null || change.movement == null) return "Change not calculable from the recorded values.";
  if (change.movement === "unchanged") return "Observed value equal to baseline.";
  const size =
    change.percentagePoints != null
      ? `${Math.abs(change.percentagePoints).toLocaleString("en-GB")} percentage points`
      : `${formatMetricValue(Math.abs(change.absolute), unit)}${change.percentage != null ? ` (${Math.abs(change.percentage)}%)` : ""}`;
  return `Observed ${size} ${change.movement} than baseline after implementation.`;
}

export type Comparability = "comparable" | "not-comparable" | "missing" | "not-disclosed";

function periodDays(period?: MeasurementPeriod) {
  if (!period?.startDate || !period.endDate) return null;
  return (Date.parse(period.endDate) - Date.parse(period.startDate)) / 86400000 + 1;
}

/**
 * Two metric values are comparable only if they use the same definition and unit
 * and their measurement periods are both known and of similar length.
 */
export function metricComparability(
  a: ImplementationMetric | undefined,
  b: ImplementationMetric | undefined,
  periods: MeasurementPeriod[] = [],
): { state: Comparability; reason: string } {
  if (!a || !b) return { state: "missing", reason: "Not recorded for one of the implementations." };
  if (a.observedValue == null || b.observedValue == null) return { state: "not-disclosed", reason: "Observed value not disclosed." };
  if (a.metricDefinitionId !== b.metricDefinitionId || a.unit !== b.unit)
    return { state: "not-comparable", reason: "Different metric definitions or units." };
  const pa = periodDays(periods.find((period) => period.id === a.measurementPeriodId));
  const pb = periodDays(periods.find((period) => period.id === b.measurementPeriodId));
  if (pa == null || pb == null) return { state: "not-comparable", reason: "Measurement period missing for at least one value." };
  if (Math.max(pa, pb) / Math.min(pa, pb) > 2) return { state: "not-comparable", reason: "Measurement periods differ in length by more than 2×." };
  return { state: "comparable", reason: "Same definition, unit and similar measurement period length." };
}

/** Enough points for a time series chart? Two points are shown as two explicit values instead. */
export function isTimeSeries(points: { at: string; value: number }[]) {
  return points.length >= 3;
}
