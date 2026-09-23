import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Sparkles, Play, Check } from "lucide-react";
import { useState } from "react";
import { useRecords } from "../state";
import {
  SectionTitle,
  ProviderCard,
  UseCaseCard,
  CategoryCard,
  ButtonLink,
  Logo,
  Modal,
  Skeleton,
  ErrorState,
  Icon,
} from "../components/ui";
export default function Home() {
  const {
    data: providers = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("providers");
  const { data: integrators = [] } = useRecords("integrators");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: categories = [] } = useRecords("categories");
  const { data: products = [] } = useRecords("products");
  const { data: articles = [] } = useRecords("articles");
  const [preview, setPreview] = useState(false);
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;
  return (
    <div className="home-page">
      <div className="home-top">
        <div className="home-main">
          <div className="home-intro">
            <div className="eyebrow">BUILD TOMORROW, TODAY</div>
            <h1>
              Find the right technology
              <br className="desktop-break" /> for what you want to build
            </h1>
            <p>
              Discover AI tools, robotics, hardware, and expert partners — all
              in one place.
            </p>
          </div>
          <div className="discovery-pills">
            {[
              [
                "/technologies?category=ai-software",
                "Sparkles",
                "AI & Software",
              ],
              [
                "/technologies?category=robotics-hardware",
                "Bot",
                "Robotics & Hardware",
              ],
              ["/integrators", "Users", "Integrators & Consultants"],
              ["/technologies", "LayoutGrid", "All Technologies"],
            ].map(([to, icon, name], i) => (
              <Link key={to} to={to} className={i === 0 ? "active" : ""}>
                <Icon name={icon} size={16} />
                {name}
              </Link>
            ))}
          </div>
          <section className="hero-feature">
            <div className="hero-copy">
              <span className="feature-label">
                <Sparkles size={13} />
                FEATURED USE CASE
              </span>
              <h2>
                Create a website for
                <br />
                AI-generated product videos
              </h2>
              <p>
                Launch a professional website that automatically generates
                product videos using AI. Combine no-code tools, AI video models,
                and hosting platforms to go from idea to launch — fast.
              </p>
              <ButtonLink to="/use-cases/product-video-website">
                View Full Use Case
                <ArrowRight size={18} />
              </ButtonLink>
            </div>
            <button
              className="product-preview"
              onClick={() => setPreview(true)}
              aria-label="Open product video concept preview"
            >
              <img
                src={import.meta.env.BASE_URL + "media/product.svg"}
                alt="Original product photography concept illustration"
              />
              <span className="play-icon">
                <Play size={18} fill="currentColor" />
              </span>
              <strong>
                Turn products
                <br />
                into compelling stories
              </strong>
            </button>
            <div className="hero-stack">
              <div className="eyebrow">SOLUTION STACK</div>
              {products.slice(0, 4).map((p) => (
                <Link key={p.id} to={"/technologies/" + p.slug}>
                  <Logo initials={p.initials} color={p.color} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.description}</small>
                  </span>
                  <ExternalLink size={14} />
                </Link>
              ))}
              <small className="stack-demo">Illustrative stack · Demo</small>
            </div>
          </section>
          <SectionTitle
            title="Explore by Category"
            to="/categories"
            label="View all categories"
          />
          <div className="category-grid">
            {categories.slice(0, 3).map((c) => (
              <CategoryCard key={c.id} item={c} />
            ))}
            <CategoryCard
              item={{
                id: "marketplace",
                slug: "automation",
                name: "Marketplace",
                description: "Discover and compare technology products",
                icon: "ShoppingBag",
                color: "pink",
                provenance: "demo",
              }}
            />
          </div>
        </div>
        <aside className="home-aside">
          <section className="card provider-panel">
            <SectionTitle title="Technology Providers" to="/providers" />
            {providers.slice(0, 5).map((p) => (
              <ProviderCard key={p.id} provider={p} compact />
            ))}
            <p className="panel-note">Sample profiles · Not yet rated</p>
          </section>
          <section className="card provider-panel">
            <SectionTitle title="Integrators & Consultants" to="/integrators" />
            {integrators.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                compact
                type="integrators"
              />
            ))}
            <p className="panel-note">Fictional partners · Demo directory</p>
          </section>
        </aside>
      </div>
      <SectionTitle
        title="Popular Use Cases"
        to="/use-cases"
        label="View all use cases"
      />
      <div className="usecase-grid">
        {cases.slice(0, 6).map((u) => (
          <UseCaseCard item={u} key={u.id} />
        ))}
      </div>
      <SectionTitle
        title="From the Ecosystem"
        to="/updates"
        label="View all updates"
      />
      <div className="article-grid">
        {articles.map((a, i) => (
          <Link
            to={"/updates/" + a.slug}
            className="card article-card"
            key={a.id}
          >
            <div className={"article-art art-" + i}>
              <Icon name={["Sparkles", "Workflow", "Bot"][i]} size={42} />
            </div>
            <div>
              <small className={"article-label label-" + i}>
                {a.category} · SAMPLE
              </small>
              <h3>{a.name}</h3>
              <p>{a.description}</p>
            </div>
          </Link>
        ))}
      </div>
      <section className="bottom-banner">
        <div>
          <div className="eyebrow">READY TO BUILD?</div>
          <h2>Turn your ideas into reality with Oracnet</h2>
          <p>
            Access technologies, partners, and resources — all in one place.
          </p>
        </div>
        <div>
          <ButtonLink to="/onboarding">
            Get Started Free
            <ArrowRight size={18} />
          </ButtonLink>
          <div className="banner-checks">
            <span>
              <Check size={13} />
              Discover solutions
            </span>
            <span>
              <Check size={13} />
              Compare providers
            </span>
          </div>
        </div>
      </section>
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="From product to possibility"
        description="Illustrative concept preview. This demo does not generate or play a vendor video."
      >
        <img
          className="concept-image"
          src={import.meta.env.BASE_URL + "media/product.svg"}
          alt="Product concept illustration"
        />
        <p>
          Connect a video generation tool, a website builder, and a hosting
          platform to explore this workflow.
        </p>
        <ButtonLink to="/use-cases/product-video-website">
          Explore the complete use case
          <ArrowRight size={17} />
        </ButtonLink>
      </Modal>
    </div>
  );
}
