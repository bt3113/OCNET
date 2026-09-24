import { Link } from "react-router-dom";
import { useActions, useRecords, useUI } from "../../state";
import { Badge } from "../ui";
export function BuildComparisonPanel() {
  const { userId } = useUI();
  const { data: records = [] } = useRecords("build_comparisons");
  const { data: builds = [] } = useRecords("builds");
  const { data: products = [] } = useRecords("products");
  const actions = useActions();
  const r = records.find((r) => r.ownerId === userId);
  if (!r?.buildIds.length) return null;
  return (
    <section>
      <h2 className="subheading">Build comparison</h2>
      <p>
        Compare recorded implementation choices, not unverified performance.
      </p>
      <div className="build-comparison">
        {builds
          .filter((b) => r.buildIds.includes(b.id))
          .map((b) => (
            <article className="card" key={b.id}>
              <Badge>{b.provenance}</Badge>
              <h3>
                <Link to={"/builds/" + b.slug}>{b.name}</Link>
              </h3>
              <p>{b.tagline}</p>
              <dl className="comparison-details">
                {[
                  [
                    "Stack",
                    b.stack
                      .map(
                        (s) => products.find((p) => p.id === s.productId)?.name,
                      )
                      .join(", "),
                  ],
                  ["Industry", b.industry],
                  [
                    "Blueprint remix",
                    b.cloneAllowed
                      ? "Permitted with attribution"
                      : "Showcase only",
                  ],
                  [
                    "Source",
                    b.sourceAvailable
                      ? "Creator-supplied link"
                      : "Not supplied",
                  ],
                  ["License", b.license || "Not specified"],
                  ["Reported cost", b.buildCost || "Not supplied"],
                  ["Reported time", b.buildTime || "Not supplied"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <button
                className="button light"
                onClick={() =>
                  void actions.save("build_comparisons", {
                    ...r,
                    buildIds: r.buildIds.filter((x) => x !== b.id),
                  })
                }
              >
                Remove build
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
