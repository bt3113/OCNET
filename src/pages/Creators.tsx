import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useRecords } from "../state";
import { isPublicBuild } from "../data/build-domain";
import { PageHeading } from "../components/layout";
import {
  Badge,
  Breadcrumbs,
  ButtonLink,
  EmptyState,
  ErrorState,
  Logo,
  Skeleton,
  Tabs,
} from "../components/ui";
import {
  BuildCard,
  CreatorCard,
  FollowButton,
  SafeLink,
} from "../components/builds/cards";
import { BuildOfferCard } from "../components/builds/interactions";
export default function Creators() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState("Builds");
  const {
    data: creators = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("creator_profiles");
  const { data: builds = [] } = useRecords("builds");
  const { data: products = [] } = useRecords("products");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: offers = [] } = useRecords("build_offers");
  function set(k: string, v: string) {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  }
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;
  const c = creators.find((c) => c.slug === slug);
  if (slug && !c)
    return (
      <EmptyState
        title="Creator not found"
        to="/creators"
        action="Explore creators"
      />
    );
  if (!c) {
    const filtered = creators.filter(
      (c) =>
        (c.name + " " + c.bio + " " + c.expertise.join(" "))
          .toLowerCase()
          .includes((params.get("q") || "").toLowerCase()) &&
        (!params.get("available") || c.available) &&
        (!params.get("technology") ||
          c.technologyIds.includes(params.get("technology")!)) &&
        (!params.get("useCase") ||
          c.useCaseIds.includes(params.get("useCase")!)) &&
        (!params.get("region") || c.location === params.get("region")),
    );
    return (
      <>
        <PageHeading
          eyebrow="PEOPLE BEHIND THE WORK"
          title="Meet the creators."
          description="Explore the work first. Connect with the people and studios behind it."
          action={
            <ButtonLink to="/creator/profile">Create your profile</ButtonLink>
          }
        />
        <div className="card creator-filters">
          <label>
            Name or expertise
            <input
              value={params.get("q") || ""}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Voice AI, commerce, research…"
            />
          </label>
          {[
            ["technology", "Technology", products],
            ["useCase", "Use case", cases],
            [
              "region",
              "Region",
              [...new Set(creators.map((c) => c.location))].map((s) => ({
                id: s,
                name: s,
              })),
            ],
          ].map(([key, label, items]) => (
            <label key={String(key)}>
              {String(label)}
              <select
                value={params.get(String(key)) || ""}
                onChange={(e) => set(String(key), e.target.value)}
              >
                <option value="">All</option>
                {(items as { id: string; name: string }[]).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="check-field">
            <input
              type="checkbox"
              checked={params.get("available") === "yes"}
              onChange={(e) => set("available", e.target.checked ? "yes" : "")}
            />
            Open to enquiries
          </label>
          <button className="button light" onClick={() => setParams({})}>
            Clear filters
          </button>
        </div>
        <div className="results-label">
          <span>{filtered.length} creators</span>
          <Badge>Sample profiles · no fabricated ratings</Badge>
        </div>
        <div className="grid three">
          {filtered.map((c) => (
            <CreatorCard key={c.id} creator={c} />
          ))}
        </div>
        {!filtered.length && (
          <EmptyState
            title="No creators match"
            description="Try another technology or clear a filter."
            to="/creators"
            action="View creators"
          />
        )}
      </>
    );
  }
  const work = builds.filter((b) => b.creatorId === c.id && isPublicBuild(b));
  const tools = products.filter((p) =>
    work.some((b) => b.stack.some((s) => s.productId === p.id)),
  );
  return (
    <>
      <Breadcrumbs
        items={[{ name: "Creators", to: "/creators" }, { name: c.name }]}
      />
      <header className="creator-profile card">
        <Logo
          initials={c.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)}
          color={c.color}
        />
        <div>
          <div className="row wrap">
            <Badge>{c.kind}</Badge>
            <Badge>{c.provenance}</Badge>
          </div>
          <h1>{c.name}</h1>
          <p className="build-tagline">{c.headline}</p>
          <span className="muted">
            {c.location} ·{" "}
            {c.available
              ? "Open to implementation enquiries"
              : "Currently sharing work"}
          </span>
        </div>
        <FollowButton creator={c} />
      </header>
      <Tabs
        items={["Builds", "Offers", "Stacks", "About"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Builds" ? (
        <>
          <div className="section-title">
            <h2>Published work</h2>
            <span>
              {work.length} public{" "}
              {work.every((b) => b.provenance === "demo") ? "demo " : ""}builds
            </span>
          </div>
          <div className="build-grid">
            {work.map((b) => (
              <BuildCard key={b.id} build={b} />
            ))}
          </div>
          {!work.length && (
            <EmptyState
              title="No published builds yet"
              to="/builds"
              action="Explore builds"
            />
          )}
        </>
      ) : tab === "Offers" ? (
        <div className="grid two">
          {offers
            .filter(
              (o) =>
                o.active &&
                o.moderation === "approved" &&
                work.some((b) => b.id === o.buildId),
            )
            .map((o) => (
              <BuildOfferCard
                key={o.id}
                offer={o}
                build={work.find((b) => b.id === o.buildId)!}
              />
            ))}
        </div>
      ) : tab === "Stacks" ? (
        <div className="grid two">
          {work.map((b) => (
            <article className="card" key={b.id}>
              <h2>
                <Link to={"/builds/" + b.slug + "?tab=Stack+%26+architecture"}>
                  {b.name}
                </Link>
              </h2>
              <div className="stack-chips">
                {b.stack.map((s) => (
                  <Link
                    key={s.id}
                    to={
                      "/technologies/" +
                      products.find((p) => p.id === s.productId)?.slug
                    }
                  >
                    {products.find((p) => p.id === s.productId)?.name} ·{" "}
                    {s.role}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="detail-columns">
          <section className="card prose">
            <h2>About {c.name}</h2>
            <p>{c.bio}</p>
            <h3>Expertise</h3>
            <div className="tags">
              {c.expertise.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <h3>Technologies in published work</h3>
            <div className="stack-chips">
              {tools.map((p) => (
                <Link key={p.id} to={"/technologies/" + p.slug}>
                  {p.name}
                </Link>
              ))}
            </div>
            <h3>Use-case specialisms</h3>
            {cases
              .filter((u) => c.useCaseIds.includes(u.id))
              .map((u) => (
                <p key={u.id}>
                  <Link to={"/use-cases/" + u.slug}>{u.name} →</Link>
                </p>
              ))}
          </section>
          <aside className="card">
            <h3>Profile evidence</h3>
            <p>
              {c.verification === "verified"
                ? "Profile verification approved"
                : "Not independently verified"}
            </p>
            <p>
              No ratings, client testimonials or deployment claims are implied.
            </p>
            <SafeLink url={c.website}>Website →</SafeLink>
            <SafeLink url={c.github}>GitHub →</SafeLink>
          </aside>
        </div>
      )}
    </>
  );
}
