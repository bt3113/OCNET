import { Link } from "react-router-dom";
import { ArrowRight, Plus, Download, X } from "lucide-react";
import { useRecords, useActions, useUI } from "../state";
import { PageHeading } from "../components/layout";
import { EmptyState, Logo, Badge, ButtonLink } from "../components/ui";
export default function Compare() {
  const { data: comparisons = [] } = useRecords("comparisons");
  const { data: products = [] } = useRecords("products");
  const actions = useActions();
  const { notify } = useUI();
  const ids = comparisons.find((c) => c.id === "current")?.productIds ?? [];
  const selected = products.filter((p) => ids.includes(p.id));
  return (
    <>
      <PageHeading
        eyebrow="SIDE BY SIDE"
        title="A clearer view of your options"
        description="Compare capabilities and deployment approaches. Confirm terms and technical fit with each supplier."
        action={
          <ButtonLink to="/technologies" variant="light">
            <Plus size={17} />
            Add technology
          </ButtonLink>
        }
      />
      {!selected.length ? (
        <EmptyState
          title="Good decisions start with comparison"
          description="Use the compare icon on any technology to add up to four options here."
          to="/technologies"
          action="Find technologies"
        />
      ) : (
        <>
          <div className="row between compare-toolbar">
            <Badge>{selected.length} technologies · Sample data</Badge>
            <button
              className="button light"
              onClick={() => {
                const blob = new Blob([JSON.stringify(selected, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "oracnet-comparison.json";
                a.click();
                URL.revokeObjectURL(url);
                notify("Comparison exported");
              }}
            >
              <Download size={16} />
              Export comparison
            </button>
          </div>
          <div
            className="comparison-grid"
            style={{
              gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))`,
            }}
          >
            {selected.map((p) => (
              <article key={p.id} className="card comparison-card">
                <div className="row between">
                  <Logo initials={p.initials} color={p.color} />
                  <button
                    className="icon-button"
                    aria-label={"Remove " + p.name}
                    onClick={() =>
                      void actions.save("comparisons", {
                        id: "current",
                        name: "My comparison",
                        productIds: ids.filter((id) => id !== p.id),
                        provenance: "demo",
                      })
                    }
                  >
                    <X size={18} />
                  </button>
                </div>
                <h2>{p.name}</h2>
                <p>{p.description}</p>
                <dl className="comparison-details">
                  {[
                    ["Capability", p.capabilityIds.join(", ")],
                    ["Deployment", p.deployment],
                    ["Pricing", p.pricing],
                    ["Reviews", "Not yet rated"],
                    ["Integration evidence", "Not verified"],
                    ["Source", "Demo catalogue"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <Link className="button dark" to={"/technologies/" + p.slug}>
                  View technology
                  <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
