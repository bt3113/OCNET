import { ProductMediaList } from "../components/media";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { useRecords, useActions, useUI } from "../state";
import { PageHeading } from "../components/layout";
import {
  Breadcrumbs,
  Badge,
  ButtonLink,
  Logo,
  Tabs,
  SaveButton,
  CompareButton,
  StackVisualizer,
  MediaGallery,
  TechnologyCard,
  ProviderCard,
  UseCaseCard,
  EmptyState,
  Skeleton,
  ErrorState,
  ReviewCard,
  CheckLine,
} from "../components/ui";
export default function Details() {
  const { slug } = useParams();
  const type = useLocation().pathname.split("/")[1];
  const [tab, setTab] = useState("Overview");
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("products");
  const { data: providers = [] } = useRecords("providers");
  const { data: integrators = [] } = useRecords("integrators");
  const { data: consultants = [] } = useRecords("consultants");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: stacks = [] } = useRecords("solution_stacks");
  const { data: categories = [] } = useRecords("categories");
  const { data: reviews = [] } = useRecords("reviews");
  const { setContact, notify } = useUI();
  const actions = useActions();
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;
  const p = products.find((p) => p.slug === slug);
  const provider = (
    type === "integrators"
      ? integrators
      : type === "consultants"
        ? consultants
        : providers
  ).find((p) => p.slug === slug);
  const useCase = cases.find((p) => p.slug === slug);
  const stack = stacks.find((s) =>
    type === "use-cases" ? s.id === useCase?.stackId : s.slug === slug,
  );
  const category = categories.find((c) => c.slug === slug);
  const item =
    type === "technologies"
      ? p
      : type === "use-cases"
        ? useCase
        : type === "solution-stacks"
          ? stack
          : type === "categories"
            ? category
            : provider;
  if (!item)
    return (
      <EmptyState
        title="We couldn’t find that page"
        description="The link may have changed. Explore the catalogue to find an alternative."
      />
    );
  return (
    <>
      <Breadcrumbs
        items={[
          { name: type.replaceAll("-", " "), to: "/" + type },
          { name: item.name },
        ]}
      />
      <div className="detail-hero">
        <div>
          <Badge>Demo content</Badge>
          <PageHeading title={item.name} description={item.description} />
          <div className="row wrap">
            <SaveButton id={item.id} name={item.name} type={type} />
            {p && type === "technologies" && <CompareButton product={p} />}
            <span className="muted">
              {provider
                ? "Sample profile · Not yet rated"
                : "Sample content · validate with providers"}
            </span>
          </div>
        </div>
        <div className="detail-hero-action">
          {provider ? (
            <>
              <Logo initials={provider.initials} color={provider.color} />
              <button
                className="button dark"
                onClick={() => setContact(provider)}
              >
                Contact {provider.name}
                <ArrowRight size={17} />
              </button>
            </>
          ) : p && type === "technologies" ? (
            <>
              <Logo initials={p.initials} color={p.color} />
              <button
                className="button dark"
                onClick={() =>
                  setContact(
                    providers.find((v) => v.id === p.providerId) ?? null,
                  )
                }
              >
                Contact provider
                <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <ButtonLink to="/app/projects/new">
              Start a project
              <ArrowRight size={17} />
            </ButtonLink>
          )}
        </div>
      </div>
      {(type === "use-cases" || type === "solution-stacks") && stack ? (
        <div className="detail-columns">
          <section>
            <Tabs
              items={["Overview", "Solution stack", "Implementation"]}
              value={tab}
              onChange={setTab}
            />
            {tab === "Overview" ? (
              <>
                <div className="card prose">
                  <h2>
                    {useCase?.outcome || "A stack built around your outcome"}
                  </h2>
                  <p>{item.description}</p>
                  <h3>How the pieces fit together</h3>
                  <p>
                    Start with the capabilities your workflow needs. Each step
                    below represents a responsibility in the system, with a
                    sample supplier you can explore or replace.
                  </p>
                  <CheckLine>
                    Define inputs, outputs, and success criteria
                  </CheckLine>
                  <CheckLine>Evaluate security and data handling</CheckLine>
                  <CheckLine>Validate integration with a small pilot</CheckLine>
                </div>
                <h2 className="subheading">Your solution stack</h2>
                <StackVisualizer stack={stack} products={products} />
              </>
            ) : tab === "Solution stack" ? (
              <StackVisualizer stack={stack} products={products} />
            ) : (
              <div className="card prose">
                <h2>From idea to implementation</h2>
                {[
                  "Write a measurable outcome and identify the users.",
                  "Validate each supplier and its data processing terms.",
                  "Check API access, compatibility, and operating costs.",
                  "Build a limited pilot with clear acceptance criteria.",
                  "Review the results with an implementation partner.",
                ].map((s, i) => (
                  <CheckLine key={s}>
                    {i + 1}. {s}
                  </CheckLine>
                ))}
                <ButtonLink to="/app/projects/new">
                  Create your project brief
                  <ArrowRight size={17} />
                </ButtonLink>
              </div>
            )}
          </section>
          <aside>
            <div className="card side-card">
              <h3>Make it yours</h3>
              <p>
                Use this stack as a starting point, then shape it around your
                requirements.
              </p>
              <dl className="detail-list">
                <div>
                  <dt>Capabilities</dt>
                  <dd>{stack.items.length}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>Demo architecture</dd>
                </div>
                <div>
                  <dt>Pricing</dt>
                  <dd>Contact providers</dd>
                </div>
              </dl>
              <ButtonLink to="/integrators" variant="light">
                Find an implementation partner
                <ArrowRight size={16} />
              </ButtonLink>
            </div>
            <div className="notice">
              <ShieldCheck />
              <p>
                Oracnet is a neutral discovery layer. Your chosen providers
                deliver the technology and services.
              </p>
            </div>
          </aside>
        </div>
      ) : type === "technologies" && p ? (
        <>
          <Tabs
            items={["Overview", "Media", "Integrations", "Reviews"]}
            value={tab}
            onChange={setTab}
          />
          <div className="detail-columns">
            <section>
              {tab === "Overview" ? (
                <>
                  <>
                    <MediaGallery />
                    {p && <ProductMediaList productId={p.id} />}
                  </>
                  <div className="card prose">
                    <h2>About {p.name}</h2>
                    <p>
                      {p.description}. This sample profile demonstrates how a
                      supplier listing will work. Product availability,
                      specifications, and commercial terms must be confirmed
                      directly with the provider.
                    </p>
                    <h3>Capabilities</h3>
                    <div className="tags">
                      {p.capabilityIds.map((c) => (
                        <span key={c}>{c}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : tab === "Media" ? (
                <>
                  <MediaGallery />
                  {p && <ProductMediaList productId={p.id} />}
                </>
              ) : tab === "Integrations" ? (
                <div className="card prose">
                  <h2>Compatibility starts with evidence</h2>
                  <p>
                    No verified integrations have been recorded for this sample
                    listing. Ask about supported APIs, authentication, data
                    formats, and failure handling.
                  </p>
                  <ButtonLink to="/solution-stacks">
                    Explore illustrative stacks
                    <ArrowRight size={17} />
                  </ButtonLink>
                </div>
              ) : (
                <>
                  <div className="card prose">
                    <h2>Not yet rated</h2>
                    <p>
                      No verified reviews are available. Reviews submitted in
                      demo mode are stored locally and queued for moderation.
                    </p>
                    <form
                      className="form-stack"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const body = String(f.get("review")).trim();
                        if (body.length < 20) {
                          notify("Write at least 20 characters.");
                          return;
                        }
                        void actions
                          .save("reviews", {
                            id: crypto.randomUUID(),
                            name: "Demo buyer",
                            productId: p.id,
                            userId: "demo-user",
                            body,
                            rating: Number(f.get("rating")),
                            status: "pending",
                            provenance: "demo",
                          })
                          .then(() =>
                            notify("Review saved for demo moderation"),
                          )
                          .catch(() => {});
                        e.currentTarget.reset();
                      }}
                    >
                      <label>
                        Your rating
                        <select name="rating">
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option value={n} key={n}>
                              {n} of 5
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Your experience
                        <textarea
                          name="review"
                          required
                          minLength={20}
                          maxLength={5000}
                        />
                      </label>
                      <button className="button dark">
                        Submit demo review
                      </button>
                    </form>
                  </div>
                  {reviews
                    .filter((r) => r.productId === p.id)
                    .map((r) => (
                      <div key={r.id}>
                        <Badge>{r.status} · Demo</Badge>
                        <ReviewCard {...r} />
                      </div>
                    ))}
                </>
              )}
            </section>
            <aside>
              <div className="card side-card">
                <h3>At a glance</h3>
                <dl className="detail-list">
                  <div>
                    <dt>Deployment</dt>
                    <dd>{p.deployment}</dd>
                  </div>
                  <div>
                    <dt>Pricing</dt>
                    <dd>{p.pricing}</dd>
                  </div>
                  <div>
                    <dt>Provenance</dt>
                    <dd>Demo</dd>
                  </div>
                  <div>
                    <dt>Verification</dt>
                    <dd>Not verified</dd>
                  </div>
                </dl>
              </div>
              {providers
                .filter((v) => v.id === p.providerId)
                .map((v) => (
                  <ProviderCard key={v.id} provider={v} />
                ))}
            </aside>
          </div>
          <h2 className="subheading">Explore alternatives</h2>
          <div className="grid three">
            {products
              .filter((x) => x.category === p.category && x.id !== p.id)
              .slice(0, 3)
              .map((x) => (
                <TechnologyCard product={x} key={x.id} />
              ))}
          </div>
        </>
      ) : type === "categories" && category ? (
        <>
          <h2 className="subheading">Start with a use case</h2>
          <div className="usecase-grid">
            {cases
              .filter((c) => c.category === category.id)
              .map((c) => (
                <UseCaseCard key={c.id} item={c} />
              ))}
          </div>
          <h2 className="subheading">Explore technologies</h2>
          <div className="grid three">
            {products
              .filter((p) => p.category === category.id)
              .map((p) => (
                <TechnologyCard product={p} key={p.id} />
              ))}
          </div>
          {category.id === "expert-partners" && (
            <div className="grid two">
              {integrators.map((p) => (
                <ProviderCard key={p.id} provider={p} type="integrators" />
              ))}
            </div>
          )}
        </>
      ) : provider ? (
        <>
          <Tabs
            items={["Overview", "Technologies", "Evidence"]}
            value={tab}
            onChange={setTab}
          />
          <div className="detail-columns">
            <section>
              {tab === "Overview" ? (
                <div className="card prose">
                  <h2>Meet {provider.name}</h2>
                  <p>
                    {provider.description}. This is a sample directory profile
                    for demonstrating discovery and contact workflows. It is not
                    a verified supplier submission or an endorsement.
                  </p>
                  <h3>Areas to discuss</h3>
                  <div className="tags">
                    {provider.specialties.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  <h3>Company media</h3>
                  <>
                    <MediaGallery />
                    {p && <ProductMediaList productId={p.id} />}
                  </>
                </div>
              ) : tab === "Technologies" ? (
                <div className="grid two">
                  {products
                    .filter((p) => p.providerId === provider.id)
                    .map((p) => (
                      <TechnologyCard product={p} key={p.id} />
                    ))}
                </div>
              ) : (
                <div className="card prose">
                  <h2>Evidence & verification</h2>
                  <p>
                    No verified deployments, reviews, or certifications have
                    been submitted for this demo profile.
                  </p>
                  <Link to="/trust">
                    Read our evidence principles <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </section>
            <aside>
              <div className="card side-card">
                <h3>Profile details</h3>
                <dl className="detail-list">
                  <div>
                    <dt>Region</dt>
                    <dd>{provider.region}</dd>
                  </div>
                  <div>
                    <dt>Reviews</dt>
                    <dd>Not yet rated</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>Demo</dd>
                  </div>
                </dl>
                {provider.website && (
                  <a
                    className="button light"
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit official website
                    <ExternalLink size={15} />
                  </a>
                )}
                <button
                  className="button dark"
                  onClick={() => setContact(provider)}
                >
                  Start a conversation
                  <ArrowRight size={17} />
                </button>
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </>
  );
}
