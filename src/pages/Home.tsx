import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Cpu,
  GitBranch,
  LayoutGrid,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useRecords, useUI } from "../state";
import { isPublicBuild } from "../data/build-domain";
import {
  ButtonLink,
  ErrorState,
  SectionTitle,
  Skeleton,
} from "../components/ui";
import {
  BlueprintCard,
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
  const visibleBuilds = builds.filter(isPublicBuild).length;
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;

  return (
    <>
      <div className="home-intro intelligence-home-intro">
        <div>
          <h1>What are you trying to improve?</h1>
          <p>
            See how comparable businesses implemented it, understand the
            technology and evidence, then find someone who can deploy something
            similar.
          </p>
        </div>
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
        <span>Try</span>
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

      <ol className="how-steps" aria-label="How Oracnet works">
        <li>
          <span>1</span>
          <div>
            <strong>Describe the outcome</strong>
            <p>Turn a goal into requirements you can check: budget, systems you keep, constraints.</p>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>See what comparable businesses did</strong>
            <p>Context, architecture, cost and observed results — with evidence on each claim.</p>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Reuse or hire</strong>
            <p>Start from a reusable Blueprint or request a proposal from an implementer.</p>
          </div>
        </li>
      </ol>

      <SectionTitle
        title="Recent implementation records"
        to="/implementations"
        label="View all records"
      />
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

      <SectionTitle
        title="Reusable Blueprints"
        to="/blueprints"
        label="View all Blueprints"
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

      <SectionTitle title="Browse the catalogue" />
      <div className="browse-tiles">
        {[
          { to: "/use-cases", Icon: GitBranch, title: "Use cases", text: `${cases.length} outcomes with example stacks` },
          { to: "/technologies", Icon: Cpu, title: "Technologies", text: `${usedProductIds.size} seen in implementation records` },
          { to: "/implementers", Icon: Users, title: "Implementers", text: `${integrators.length} delivery partners` },
          { to: "/builds", Icon: LayoutGrid, title: "Builds", text: `${visibleBuilds} creator project showcases` },
        ].map(({ to, Icon, title, text }) => (
          <Link key={to} className="card browse-tile" to={to}>
            <Icon size={20} aria-hidden />
            <strong>{title}</strong>
            <span>{text}</span>
          </Link>
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

      <div className="build-footer-banner intelligence-footer-banner">
        <div>
          <ShieldCheck size={25} />
          <span className="eyebrow">IMPLEMENTED SOMETHING REAL?</span>
          <h2>Document what you deployed.</h2>
          <p>
            Customer names stay private. Publish only what you have the right to
            share.
          </p>
        </div>
        <ButtonLink to="/implementation/new">
          Add implementation record <ArrowRight size={17} />
        </ButtonLink>
      </div>
    </>
  );
}
