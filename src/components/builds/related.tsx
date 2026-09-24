import { Link } from "react-router-dom";
import { useRecords } from "../../state";
import { isPublicBuild } from "../../data/build-domain";
import { BuildCard, CreatorCard } from "./cards";
export function RelatedBuilds({
  productId,
  providerId,
  useCaseId,
  category,
}: {
  productId?: string;
  providerId?: string;
  useCaseId?: string;
  category?: string;
}) {
  const { data: builds = [] } = useRecords("builds");
  const { data: products = [] } = useRecords("products");
  const { data: creators = [] } = useRecords("creator_profiles");
  const { data: cases = [] } = useRecords("use_cases");
  const matching = builds.filter(
    (b) =>
      isPublicBuild(b) &&
      (!productId || b.stack.some((s) => s.productId === productId)) &&
      (!providerId ||
        b.stack.some((s) =>
          products.some(
            (p) => p.id === s.productId && p.providerId === providerId,
          ),
        )) &&
      (!useCaseId || b.useCaseIds.includes(useCaseId)) &&
      (!category || b.category === category),
  );
  const co = products.filter(
    (p) =>
      p.id !== productId &&
      matching.some((b) => b.stack.some((s) => s.productId === p.id)),
  );
  return (
    <section className="related-builds">
      <div className="section-title">
        <h2>{useCaseId ? "See how it’s implemented" : "Used in builds"}</h2>
        <Link
          to={
            "/builds?" +
            (productId
              ? "technology=" + productId
              : useCaseId
                ? "useCase=" + useCaseId
                : category
                  ? "category=" + category
                  : "")
          }
        >
          Explore builds →
        </Link>
      </div>
      <p className="muted">
        {matching.length
          ? `${matching.length} public ${matching.every((b) => b.provenance === "demo") ? "demo " : ""}builds from recorded stack relationships.`
          : "No public builds reference this item yet. Be the first to contribute evidence."}
      </p>
      <div className="build-grid">
        {matching.slice(0, 3).map((b) => (
          <BuildCard key={b.id} build={b} />
        ))}
      </div>
      {productId && co.length > 0 && (
        <div className="card co-occurrence">
          <h3>Appears alongside</h3>
          <p>
            Co-occurrence in these records is not a compatibility guarantee.
          </p>
          <div className="stack-chips">
            {co.map((p) => (
              <Link key={p.id} to={"/technologies/" + p.slug}>
                {p.name}
              </Link>
            ))}
          </div>
          <h3>Use cases represented</h3>
          <div className="stack-chips">
            {cases
              .filter((c) => matching.some((b) => b.useCaseIds.includes(c.id)))
              .map((c) => (
                <Link key={c.id} to={"/use-cases/" + c.slug}>
                  {c.outcome || c.name}
                </Link>
              ))}
          </div>
        </div>
      )}
      {useCaseId && matching.length > 0 && (
        <>
          <h3 className="subheading">Creators with relevant work</h3>
          <div className="grid three">
            {creators
              .filter((c) => matching.some((b) => b.creatorId === c.id))
              .map((c) => (
                <CreatorCard key={c.id} creator={c} />
              ))}
          </div>
        </>
      )}
    </section>
  );
}
