import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  GitBranch,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useRecords, useUI } from "../state";
import { isPublicBuild } from "../data/build-domain";
import { BuildCard } from "../components/builds/cards";
import {
  Badge,
  ButtonLink,
  ErrorState,
  SectionTitle,
  Skeleton,
  TechnologyCard,
  UseCaseCard,
} from "../components/ui";
import {
  BlueprintCard,
  EvidencePrincipleNotice,
  ImplementationCard,
} from "../components/intelligence";

export default function Home() {
  const { userId } = useUI();
  const {
    data: implementations = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("implementation_records");
  const { data: contexts = [] } = useRecords("implementation_contexts");
  const { data: metrics = [] } = useRecords("implementation_metrics");
  const { data: definitions = [] } = useRecords("metric_definitions");
  const { data: blueprints = [] } = useRecords("blueprints");
  const { data: blueprintVersions = [] } = useRecords("blueprint_versions");
  const { data: blueprintItems = [] } = useRecords("blueprint_stack_items");
  const { data: stackItems = [] } = useRecords("implementation_stack_items");
  const { data: builds = [] } = useRecords("builds");
  const { data: products = [] } = useRecords("products");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: integrators = [] } = useRecords("integrators");
  const { data: updates = [] } = useRecords("updates");
  const { data: allSaved = [] } = useRecords("saved_items");
  const saves = allSaved.filter((saved) => !saved.ownerId || saved.ownerId === userId);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const publicImplementations = implementations
    .filter(
      (item) =>
        item.publicationState === "published" &&
        item.moderationState === "approved" &&
        item.visibility === "public",
    )
    .sort((a, b) => b.lastEvidenceReviewAt.localeCompare(a.lastEvidenceReviewAt));
  const publishedBlueprints = blueprints.filter(
    (item) =>
      item.publicationState === "published" && item.moderationState === "approved",
  );
  const usedProductIds = new Set(
    stackItems
      .filter((item) =>
        publicImplementations.some(
          (implementation) => implementation.id === item.implementationId,
        ),
      )
      .map((item) => item.productId),
  );
  const usedProducts = products.filter((product) => usedProductIds.has(product.id));
  const visibleBuilds = builds.filter(isPublicBuild).slice(0, 3);
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;

  return (
    <>
      <div className="home-intro intelligence-home-intro">
        <div>
          <span className="eyebrow">OUTCOME → EVIDENCE → ARCHITECTURE → PROCUREMENT</span>
          <h1>What do you want your business to do better?</h1>
          <p>
            See how comparable implementations are structured, understand the
            technology and evidence, then decide what to reuse or who to hire.
          </p>
        </div>
        <ButtonLink to="/implementation/new" variant="light">
          <Plus size={17} />
          Document an implementation
        </ButtonLink>
      </div>
      <form
        className="intent-search intelligence-intent-search"
        onSubmit={(event) => {
          event.preventDefault();
          const intent = q.trim();
          navigate(
            intent
              ? "/solution-compiler?intent=" + encodeURIComponent(intent)
              : "/solution-compiler",
          );
        }}
      >
        <Search size={23} />
        <input
          aria-label="What are you trying to improve?"
          placeholder="Respond to enquiries faster, automate bookings, qualify leads…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <button className="button dark">
          Structure the problem <ArrowRight size={17} />
        </button>
      </form>
      <div className="intent-chips">
        <span>Start with an outcome</span>
        {[
          "Automate missed enquiries",
          "Qualify leads before sales",
          "Handle after-hours reservations",
          "Reduce manual follow-up",
        ].map((intent) => (
          <Link
            key={intent}
            to={"/solution-compiler?intent=" + encodeURIComponent(intent)}
          >
            {intent} <ArrowRight size={13} />
          </Link>
        ))}
      </div>

      <EvidencePrincipleNotice />

      <SectionTitle
        title="Implementation records"
        to="/implementations"
        label="Explore implementation intelligence"
      />
      <p className="section-note">
        Current homepage records are synthetic demonstrations. The product model
        is designed for claim-level provenance and real evidence later.
      </p>
      <div className="implementation-grid home-implementation-grid">
        {publicImplementations.slice(0, 3).map((implementation) => (
          <ImplementationCard
            key={implementation.id}
            implementation={implementation}
            context={contexts.find(
              (context) => context.implementationId === implementation.id,
            )}
            metrics={metrics.filter(
              (metric) => metric.implementationId === implementation.id,
            )}
            metricDefinitions={definitions}
          />
        ))}
      </div>

      <div className="home-intelligence-band">
        <div className="card home-compare-callout">
          <GitBranch size={27} />
          <span className="eyebrow">COMPARE APPROACHES</span>
          <h2>The same outcome can have several architectures.</h2>
          <p>
            Compare business context, baseline, cost, evidence, maintenance and
            observed outcomes without declaring one universal winner.
          </p>
          <Link
            to={
              publicImplementations.length >= 2
                ? `/compare/implementations?ids=${publicImplementations
                    .slice(0, 3)
                    .map((item) => item.id)
                    .join(",")}`
                : "/implementations"
            }
          >
            Compare implementation approaches <ArrowRight size={16} />
          </Link>
        </div>
        <div className="card home-compiler-callout">
          <Sparkles size={27} />
          <span className="eyebrow">SOLUTION COMPILER</span>
          <h2>Make your constraints explicit.</h2>
          <p>
            Oracnet V1 uses deterministic context matching and constraint
            evaluation—not a hidden chatbot—to surface feasible reference
            directions and trade-offs.
          </p>
          <Link to="/solution-compiler">
            Build a requirement profile <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <SectionTitle title="Explore by use case" to="/use-cases" />
      <div className="usecase-grid">
        {cases.slice(0, 6).map((useCase) => (
          <UseCaseCard key={useCase.id} item={useCase} />
        ))}
      </div>

      <SectionTitle
        title="Reusable Blueprints"
        to="/blueprints"
        label="Explore sanitized reference architectures"
      />
      <div className="grid three">
        {publishedBlueprints.slice(0, 3).map((blueprint) => (
          <BlueprintCard
            key={blueprint.id}
            blueprint={blueprint}
            version={blueprintVersions.find(
              (version) => version.id === blueprint.currentVersionId,
            )}
            stackItems={blueprintItems.filter(
              (item) => item.blueprintVersionId === blueprint.currentVersionId,
            )}
            products={products}
          />
        ))}
      </div>

      <SectionTitle
        title="Technologies seen in implementation records"
        to="/technologies"
      />
      <div className="grid three home-tech-grid">
        {usedProducts.slice(0, 6).map((product) => (
          <TechnologyCard key={product.id} product={product} />
        ))}
      </div>

      <SectionTitle
        title="Implementation partners"
        to="/implementers"
        label="Explore implementers"
      />
      <div className="grid three">
        {integrators.slice(0, 3).map((partner) => {
          const count = publicImplementations.filter((implementation) =>
            implementation.implementerIds.includes(partner.id),
          ).length;
          return (
            <Link
              className="card home-implementer-card"
              key={partner.id}
              to={`/integrators/${partner.slug}`}
            >
              <span className={"logo-tile " + partner.color}>
                {partner.initials}
              </span>
              <div>
                <strong>{partner.name}</strong>
                <p>{partner.description}</p>
                <span>
                  {count} linked demo implementation record{count === 1 ? "" : "s"}
                </span>
              </div>
              <ArrowRight size={17} />
            </Link>
          );
        })}
      </div>

      <SectionTitle
        title="Community Builds"
        to="/builds"
        label="Explore project showcases"
      />
      <p className="section-note">
        Builds remain a creator/project layer. A Build is not automatically a
        verified deployment record.
      </p>
      <div className="build-grid">
        {visibleBuilds.map((build) => (
          <BuildCard key={build.id} build={build} />
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

      <SectionTitle title="Evidence & implementation resources" to="/resources" />
      <div className="grid three">
        {updates.slice(0, 3).map((update) => (
          <Link
            className="card ecosystem-note"
            key={update.id}
            to={"/updates/" + update.slug}
          >
            <Badge>{update.category} · SAMPLE</Badge>
            <h3>{update.name}</h3>
            <p>{update.description}</p>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>

      <div className="build-footer-banner intelligence-footer-banner">
        <div>
          <ShieldCheck size={25} />
          <span className="eyebrow">IMPLEMENTED SOMETHING REAL?</span>
          <h2>Document the context, architecture and evidence.</h2>
          <p>
            Keep customer-specific IP private. Publish only what you have rights
            to disclose, and derive a separate reusable Blueprint when appropriate.
          </p>
        </div>
        <ButtonLink to="/implementation/new">
          Add implementation record <ArrowRight size={17} />
        </ButtonLink>
      </div>
    </>
  );
}
