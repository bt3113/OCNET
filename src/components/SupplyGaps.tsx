import { useState } from "react";
import { Link } from "react-router-dom";
import { useMarketplace } from "../data/marketplace-hooks";
import { supplyGaps, taxonomyPath } from "../data/use-case-domain";
import { SupplyGapIndicator } from "./marketplace";

/**
 * Where Builds are missing. Counts are supply facts from published records; they are
 * never presented as buyer demand, because Oracnet does not measure demand.
 */
export function SupplyGaps({ creatorId }: { creatorId?: string }) {
  const market = useMarketplace();
  const [category, setCategory] = useState("");
  if (market.isLoading) return null;
  const rows = supplyGaps(market.marketplace).filter((row) => !category || row.useCase.categoryId === category);
  const topCategories = market.categories.filter((item) => item.level === "category").sort((a, b) => a.sortOrder - b.sortOrder);
  const proposals = market.proposals.filter((proposal) => proposal.creatorId === creatorId);
  return (
    <section className="card supply-gaps" aria-labelledby="supply-gaps-title">
      <div className="row between wrap">
        <div>
          <h2 id="supply-gaps-title">Use Cases with few or no Builds</h2>
          <p className="muted small-print">Published supply only. These counts show where Builds are missing — not how many buyers are looking.</p>
        </div>
        <label className="inline-select">
          Category{" "}
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All</option>
            {topCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table className="supply-gap-table">
          <caption className="sr-only">Approved Use Cases ordered by fewest published Builds</caption>
          <thead>
            <tr>
              <th scope="col">Use Case</th>
              <th scope="col">Builds</th>
              <th scope="col">Technologies</th>
              <th scope="col">Implementations</th>
              <th scope="col">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((row) => (
              <tr key={row.useCase.id}>
                <td className="name">
                  <Link to={`/use-cases/${row.useCase.slug}`}>{row.useCase.name}</Link>
                  <br />
                  <small className="muted">{taxonomyPath(row.useCase, market.categories)}</small> <SupplyGapIndicator builds={row.builds} />
                </td>
                <td className="num" data-label="Builds">{row.builds}</td>
                <td className="num" data-label="Technologies">{row.technologies}</td>
                <td className="num" data-label="Implementations">{row.implementations}</td>
                <td className="action">
                  <Link className="text-button" to={`/creator/builds/new?useCase=${row.useCase.id}`}>
                    Publish a Build
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {proposals.length > 0 && (
        <>
          <h3 className="tab-section-title">Your Use Case proposals</h3>
          <ul className="moderation-history">
            {proposals.map((proposal) => (
              <li key={proposal.id}>
                “{proposal.suggestedTitle}” <span className={`moderation-status ${proposal.status}`}>{proposal.status === "pending" ? "Pending review" : proposal.status}</span>
                {proposal.reviewNote && <small className="muted"> · {proposal.reviewNote}</small>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
