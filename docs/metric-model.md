# Metric model

`metric_definitions`: id, slug, name, description, unit, direction (`higher-better` / `lower-better` / `neutral`), category, calculation method, comparison rules. The service-business enquiry template defines inbound enquiries/month, missed enquiry rate, median first-response time, manual handling hours/week, qualification rate, booking rate, no-show rate, implementation cost, ongoing software cost and maintenance hours/month.

`implementation_metrics`: definition, baseline and observed values, unit, measurement period, source label, evidence level, notes, absolute and percentage change. Each value has a matching claim (`predicate = observed-value`) carrying claimant, method, period and limitations.

## Calculation (`src/data/metrics.ts`)

- Absolute change = observed − baseline.
- Rates measured in `%` change in **percentage points**; their relative change is not reported.
- Relative change is undefined for a zero or missing baseline and is shown as “not calculable”.
- `inPreferredDirection` reports whether movement matches the definition’s direction; neutral metrics report none.

## Language

Values are always “observed after implementation”. The UI and tests reject causal phrasing (“caused”, “resulted in”, “thanks to”). An outcome in one business is never extrapolated to another; context similarity panels repeat that it is not a prediction.

## Comparability

Two values compare only with the same definition and unit and known measurement periods whose lengths differ by at most 2×. Otherwise the comparison page shows MISSING, NOT DISCLOSED or NOT COMPARABLE with the reason.

## Visualization

With only a baseline and an observed value the UI shows two explicit numbers, not a chart. `isTimeSeries()` requires at least three points before a chart would be drawn; no time-series data exists yet, so no charts are rendered. Each metric card shows period, source and evidence, and opens a provenance drawer with definition, periods, claim, evidence signals, artifacts and reviews (all text, so screen readers get the same information).
