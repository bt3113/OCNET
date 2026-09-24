import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Plus, GitFork } from "lucide-react";
import { useState } from "react";
import { useRecords, useUI } from "../state";
import { isPublicBuild } from "../data/build-domain";
import { BuildCard, CreatorCard } from "../components/builds/cards";
import {
  Badge,
  ButtonLink,
  CategoryCard,
  ErrorState,
  SectionTitle,
  Skeleton,
  SolutionStackCard,
  UseCaseCard,
} from "../components/ui";
export default function Home() {
  const { userId } = useUI();
  const {
    data: builds = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("builds");
  const { data: creators = [] } = useRecords("creator_profiles");
  const { data: products = [] } = useRecords("products");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: stacks = [] } = useRecords("solution_stacks");
  const { data: categories = [] } = useRecords("categories");
  const { data: updates = [] } = useRecords("updates");
  const { data: allSaved = [] } = useRecords("saved_items");
  const saves = allSaved.filter((s) => !s.ownerId || s.ownerId === userId);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const visible = builds.filter(isPublicBuild);
  const featured = visible.filter((b) => b.featured).slice(0, 2);
  const used = products
    .filter((p) =>
      visible.some((b) => b.stack.some((s) => s.productId === p.id)),
    )
    .slice(0, 8);
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;
  return (
    <>
      <div className="home-intro">
        <div>
          <span className="eyebrow">IDEAS → BUILDS → POSSIBILITIES</span>
          <h1>What do you want to build?</h1>
          <p>
            Discover useful builds. Understand the stack. Find your way forward.
          </p>
        </div>
        <ButtonLink to="/creator/builds/new" variant="light">
          <Plus size={17} />
          Share your build
        </ButtonLink>
      </div>
      <form
        className="intent-search"
        onSubmit={(e) => {
          e.preventDefault();
          navigate("/search?q=" + encodeURIComponent(q));
        }}
      >
        <Search size={23} />
        <input
          aria-label="What do you want to build?"
          placeholder="An AI receptionist, a product video engine, a research assistant…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="button dark">
          Explore <ArrowRight size={17} />
        </button>
      </form>
      <div className="intent-chips">
        <span>Start with an outcome</span>
        {[
          ["customer-support", "Customer support"],
          ["product-video-website", "Product videos"],
          ["business-analytics", "Knowledge & research"],
          ["warehouse-automation", "Physical automation"],
        ].map(([id, name]) => (
          <Link key={id} to={"/builds?useCase=" + id}>
            {name} <ArrowRight size={13} />
          </Link>
        ))}
      </div>
      <div className="home-build-layout">
        <section>
          <SectionTitle
            title="Noteworthy builds"
            to="/builds"
            label="Explore all builds"
          />
          <p className="section-note">
            Editorially selected demo blueprints. Explore the structure, not a
            popularity claim.
          </p>
          <div className="build-grid featured-grid">
            {featured.map((b) => (
              <BuildCard key={b.id} build={b} variant="featured" />
            ))}
          </div>
        </section>
        <aside className="home-context-rail">
          <div className="card build-guide">
            <span className="category-icon sand">
              <GitFork size={25} />
            </span>
            <h2>Don’t start from a blank page.</h2>
            <p>
              See the components, explore alternatives, and remix a blueprint
              into your own private draft.
            </p>
            <Link to="/how-it-works">
              How Oracnet works <ArrowRight size={16} />
            </Link>
          </div>
          <div className="card creators-rail">
            <div className="row between">
              <h2>People behind the work</h2>
              <Link
                to="/creators"
                className="icon-button"
                aria-label="View all creators"
              >
                <ArrowRight size={18} />
              </Link>
            </div>
            {creators.slice(0, 3).map((c) => (
              <Link
                className="creator-rail-row"
                key={c.id}
                to={"/creators/" + c.slug}
              >
                <span className={"avatar " + c.color}>{c.name[0]}</span>
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {c.available ? "Open to enquiries" : "Sharing work"} · Demo
                  </small>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </aside>
      </div>
      <SectionTitle title="Explore by use case" to="/use-cases" />
      <div className="usecase-grid">
        {cases.slice(0, 6).map((c) => (
          <UseCaseCard key={c.id} item={c} />
        ))}
      </div>
      <SectionTitle title="Stack patterns to explore" to="/solution-stacks" />
      <div className="grid three">
        {stacks.slice(0, 3).map((s) => (
          <SolutionStackCard key={s.id} stack={s} />
        ))}
      </div>
      <SectionTitle title="Technologies in these builds" to="/technologies" />
      <div className="technology-strip">
        {used.map((p) => (
          <Link key={p.id} to={"/technologies/" + p.slug}>
            <span className={"logo-tile " + p.color}>{p.initials}</span>
            <strong>{p.name}</strong>
            <small>
              {
                visible.filter((b) => b.stack.some((s) => s.productId === p.id))
                  .length
              }{" "}
              demo builds
            </small>
          </Link>
        ))}
      </div>
      <SectionTitle title="Recently published" to="/builds?sort=recent" />
      <div className="build-grid">
        {visible
          .slice()
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(2, 5)
          .map((b) => (
            <BuildCard key={b.id} build={b} />
          ))}
      </div>
      <SectionTitle
        title="Creators offering a next step"
        to="/creators?available=yes"
      />
      <div className="grid three">
        {creators
          .filter((c) => c.available)
          .map((c) => (
            <CreatorCard key={c.id} creator={c} />
          ))}
      </div>
      <SectionTitle title="Explore the ecosystem" to="/categories" />
      <div className="grid four">
        {categories.slice(0, 4).map((c) => (
          <CategoryCard key={c.id} item={c} />
        ))}
      </div>
      {saves.length > 0 && (
        <div className="card saved-home">
          <div>
            <h2>Pick up where you left off</h2>
            <p>{saves.length} saved discoveries in your workspace.</p>
          </div>
          <ButtonLink to="/app/saved" variant="light">
            Open saved
          </ButtonLink>
          <ButtonLink to="/collections" variant="light">
            Your collections
          </ButtonLink>
        </div>
      )}
      <SectionTitle title="From the ecosystem" to="/updates" />
      <div className="grid three">
        {updates.slice(0, 3).map((u) => (
          <Link
            className="card ecosystem-note"
            key={u.id}
            to={"/updates/" + u.slug}
          >
            <Badge>{u.category} · SAMPLE</Badge>
            <h3>{u.name}</h3>
            <p>{u.description}</p>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
      <div className="build-footer-banner">
        <div>
          <span className="eyebrow">BUILT SOMETHING USEFUL?</span>
          <h2>Show the outcome. Share the blueprint.</h2>
          <p>Help the next person understand how to build it.</p>
        </div>
        <ButtonLink to="/creator/builds/new">
          Publish a build <ArrowRight size={17} />
        </ButtonLink>
      </div>
    </>
  );
}
