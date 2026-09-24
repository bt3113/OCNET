import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { GitFork, Share2, ExternalLink } from "lucide-react";
import { useActions, useRecords, useUI } from "../state";
import { isSupabase } from "../data/repository";
import {
  canReadBuild,
  isPublicBuild,
  relatedBuilds,
  remixBuild,
} from "../data/build-domain";
import {
  Badge,
  Breadcrumbs,
  ButtonLink,
  EmptyState,
  ErrorState,
  Logo,
  SaveButton,
  Skeleton,
  Tabs,
} from "../components/ui";
import {
  BuildCard,
  BuildCompareButton,
  CollectionPicker,
  SafeLink,
  ShareDialog,
} from "../components/builds/cards";
import {
  BuildComments,
  BuildGallery,
  BuildOfferCard,
  BuildReport,
  BuildSomething,
  CreatorContact,
} from "../components/builds/interactions";
const ArchitectureGraph = lazy(
  () => import("../components/builds/ArchitectureGraph"),
);
export default function BuildDetail() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "Overview";
  const {
    data: builds = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("builds");
  const { data: creators = [] } = useRecords("creator_profiles");
  const { data: products = [] } = useRecords("products");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: offers = [] } = useRecords("build_offers");
  const { data: updates = [] } = useRecords("build_updates");
  const { userId, roles, notify } = useUI();
  const actions = useActions();
  const navigate = useNavigate();
  const [share, setShare] = useState(false);
  const [contact, setContact] = useState(false);
  const [busy, setBusy] = useState(false);
  const exact = useQuery({
    queryKey: ["build-detail", slug],
    enabled: isSupabase && !!slug,
    queryFn: async () => {
      const { supabase } = await import("../data/supabase");
      const { data, error } = await supabase.rpc("get_build", {
        target_slug: slug,
      });
      if (error) throw error;
      return data as import("../data/build-model").Build | null;
    },
  });
  const b = builds.find((b) => b.slug === slug) ?? exact.data;
  if (isLoading || (isSupabase && exact.isLoading)) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;
  if (!b || !canReadBuild(b, userId, roles.includes("admin")))
    return (
      <EmptyState
        title="Build not found"
        description="This build is private, unavailable, or its link has changed."
        to="/builds"
        action="Explore public builds"
      />
    );
  const creator = creators.find((c) => c.id === b.creatorId);
  const ownCreator = creators.find((c) => c.ownerId === userId);
  const similar = relatedBuilds(b, builds).slice(0, 3);
  async function remix() {
    if (!b) return;
    if (!userId) {
      navigate("/sign-in");
      return;
    }
    if (!ownCreator) {
      navigate("/creator/profile");
      notify("Create your creator profile before remixing.");
      return;
    }
    setBusy(true);
    try {
      const draft = remixBuild(
        b,
        userId,
        ownCreator.id,
        creator?.name ?? "original creator",
      );
      draft.provenance = isSupabase ? "creator supplied" : "demo";
      await actions.save("builds", draft);
      await actions.save("build_forks", {
        id: crypto.randomUUID(),
        name: draft.name,
        buildId: draft.id,
        parentBuildId: b.id,
        ownerId: userId,
        attribution: draft.attribution,
        provenance: draft.provenance,
      });
      notify("Private blueprint remix created. No source code copied.");
      navigate("/creator/builds/" + draft.id + "/edit");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Remix could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Breadcrumbs
        items={[{ name: "Builds", to: "/builds" }, { name: b.name }]}
      />
      <header className="build-detail-header">
        <div>
          <div className="row wrap">
            <Badge>
              {b.provenance === "demo"
                ? "Illustrative demo build"
                : b.provenance}
            </Badge>
            <Badge>
              {b.verification === "verified"
                ? "Evidence verified"
                : "Not independently verified"}
            </Badge>
            {!isPublicBuild(b) && (
              <Badge>
                {b.visibility} · {b.moderation}
              </Badge>
            )}
          </div>
          <h1>{b.name}</h1>
          <p className="build-tagline">{b.tagline}</p>
          <div className="row wrap">
            <Link className="creator-byline" to={"/creators/" + creator?.slug}>
              <span className={"mini-avatar " + creator?.color}>
                {creator?.name[0]}
              </span>
              {creator?.name}
            </Link>
            <span className="muted">
              Updated{" "}
              {new Date(b.updatedAt).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="tag">{b.industry}</span>
          </div>
        </div>
        <div className="build-actions">
          <SaveButton id={b.id} name={b.name} type="builds" />
          <CollectionPicker entityId={b.id} entityType="builds" name={b.name} />
          <button className="button light" onClick={() => setShare(true)}>
            <Share2 size={16} />
            Share
          </button>
          {b.cloneAllowed && (
            <button
              className="button dark"
              onClick={() => void remix()}
              disabled={busy}
            >
              <GitFork size={16} />
              {busy ? "Creating…" : "Remix build"}
            </button>
          )}
          {b.ownerId === userId && (
            <ButtonLink
              to={"/creator/builds/" + b.id + "/edit"}
              variant="light"
            >
              Edit build
            </ButtonLink>
          )}
        </div>
      </header>
      <div className="build-detail-layout">
        <section>
          <Tabs
            items={[
              "Overview",
              "Stack & architecture",
              "Implementation",
              "Offers",
              "Sources",
              "Updates & questions",
            ]}
            value={tab}
            onChange={(t) => setParams({ tab: t }, { replace: true })}
          />
          {tab === "Overview" ? (
            <>
              <BuildGallery build={b} />
              <div className="card prose">
                <h2>What this build does</h2>
                <p>{b.description}</p>
                <div className="grid two">
                  <div>
                    <h3>The problem</h3>
                    <p>
                      {b.problem ||
                        "The creator has not supplied a separate problem statement."}
                    </p>
                  </div>
                  <div>
                    <h3>Who it is for</h3>
                    <p>
                      {b.intendedUsers ||
                        "Explore fit with the creator before adoption."}
                    </p>
                  </div>
                </div>
                <h3>Creator notes</h3>
                <p>{b.notes || "No additional notes supplied."}</p>
              </div>
              <h2 className="subheading">Inside the stack</h2>
              <div className="build-stack-list">
                {b.stack.map((s) => {
                  const p = products.find((p) => p.id === s.productId);
                  return p ? (
                    <Link
                      className="card stack-summary"
                      key={s.id}
                      to={"/technologies/" + p.slug}
                    >
                      <Logo initials={p.initials} color={p.color} />
                      <span>
                        <small>{s.role}</small>
                        <strong>{p.name}</strong>
                      </span>
                      <ExternalLink size={16} />
                    </Link>
                  ) : null;
                })}
              </div>
              <button
                className="button light"
                onClick={() => setParams({ tab: "Stack & architecture" })}
              >
                Explore architecture and alternatives →
              </button>
            </>
          ) : tab === "Stack & architecture" ? (
            <>
              <Suspense fallback={<Skeleton />}>
                <ArchitectureGraph key={b.id} build={b} />
              </Suspense>
              <div className="card prose">
                <h2>Why these tools?</h2>
                {b.stack.map((s) => (
                  <section key={s.id}>
                    <h3>
                      {products.find((p) => p.id === s.productId)?.name} ·{" "}
                      {s.role}
                    </h3>
                    <p>{s.notes || "No rationale supplied yet."}</p>
                    <Badge>
                      {s.evidence === "creator-confirmed"
                        ? "Stack confirmed by creator"
                        : s.evidence}
                    </Badge>
                    {s.sourceUrl && (
                      <SafeLink url={s.sourceUrl}>Source evidence →</SafeLink>
                    )}
                  </section>
                ))}
              </div>
            </>
          ) : tab === "Implementation" ? (
            <div className="card prose">
              <h2>Implementation notes</h2>
              <Badge>
                {b.provenance === "demo"
                  ? "Demo implementation information"
                  : "Creator-supplied information"}
              </Badge>
              <dl className="detail-list">
                {[
                  ["Difficulty", b.difficulty],
                  ["Build time", b.buildTime || "Not supplied"],
                  [
                    "Build cost",
                    b.buildCost
                      ? `${b.buildCost} ${b.currency} · creator reported`
                      : "Not supplied",
                  ],
                  [
                    "Source code",
                    b.sourceAvailable
                      ? "Linked by creator — check license"
                      : "Not supplied",
                  ],
                  [
                    "Blueprint remix",
                    b.cloneAllowed
                      ? "Permitted with attribution"
                      : "Not permitted",
                  ],
                  [
                    "Commercial reuse",
                    b.commercialUseAllowed
                      ? "Creator permits — check license"
                      : "Not granted",
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <h3>Requirements</h3>
              <p>{b.requirements || "Not supplied"}</p>
              <h3>Setup</h3>
              <p className="preserve-lines">{b.setupNotes || "Not supplied"}</p>
              <h3>Known limitations</h3>
              <p>
                {b.limitations ||
                  "Not supplied. Ask the creator about constraints."}
              </p>
              <h3>License & attribution</h3>
              <p>{b.license || "No reuse permission specified."}</p>
              <p>{b.attribution}</p>
              {b.forkedFromBuildId && (
                <Link
                  to={
                    "/builds/" +
                    builds.find((x) => x.id === b.forkedFromBuildId)?.slug
                  }
                >
                  View original blueprint →
                </Link>
              )}
            </div>
          ) : tab === "Offers" ? (
            <>
              <p className="notice">
                Offers are attached to this work. Oracnet is the neutral
                marketplace; the creator delivers the implementation. No
                payments are collected in this prototype.
              </p>
              <div className="grid two">
                {offers
                  .filter(
                    (o) =>
                      o.buildId === b.id &&
                      o.active &&
                      o.moderation === "approved",
                  )
                  .map((o) => (
                    <BuildOfferCard key={o.id} build={b} offer={o} />
                  ))}
              </div>
              {!offers.some(
                (o) =>
                  o.buildId === b.id && o.active && o.moderation === "approved",
              ) && (
                <EmptyState
                  title="No active offers"
                  description="You can still use this build for research or request an implementation."
                  to={"/app/projects/new?build=" + b.id}
                  action="Create a project brief"
                />
              )}
            </>
          ) : tab === "Sources" ? (
            <div className="card prose">
              <h2>Sources & evidence</h2>
              <p>
                Links support context. A linked product or public repository
                does not independently verify a deployment or grant reuse
                rights.
              </p>
              {b.sources.map((s) => (
                <div className="source-row" key={s.id}>
                  <SafeLink url={s.url}>
                    {s.label} <ExternalLink size={15} />
                  </SafeLink>
                  <Badge>{s.evidence}</Badge>
                  <small>{s.kind}</small>
                </div>
              ))}
              {!b.sources.length && <p>No sources supplied yet.</p>}
              <p>{b.attribution}</p>
              <BuildReport build={b} />
            </div>
          ) : (
            <>
              <div className="card">
                <h2>Build changelog</h2>
                {updates
                  .filter((u) => u.buildId === b.id)
                  .map((u) => (
                    <article className="timeline-item" key={u.id}>
                      <small>{new Date(u.date).toLocaleDateString()}</small>
                      <h3>{u.name}</h3>
                      <p>{u.body}</p>
                    </article>
                  ))}
                {!updates.some((u) => u.buildId === b.id) && (
                  <p>No updates recorded yet.</p>
                )}
              </div>
              <BuildComments build={b} />
            </>
          )}
        </section>
        <aside className="build-context">
          <div className="card">
            <Badge>FROM INSPIRATION TO ACTION</Badge>
            <h2>Your starting point</h2>
            <p>
              Understand the blueprint. Explore alternatives. Make it work for
              your outcome.
            </p>
            <BuildSomething build={b} onRemix={() => void remix()} />
            <button className="button light" onClick={() => setContact(true)}>
              Contact creator
            </button>
            <BuildCompareButton build={b} />
            <Link className="text-link" to="/compare?type=builds">
              Open build comparison →
            </Link>
            {b.demoUrl && (
              <SafeLink className="button light" url={b.demoUrl}>
                Open demo <ExternalLink size={15} />
              </SafeLink>
            )}
            {b.sourceAvailable && b.githubUrl && (
              <SafeLink className="button light" url={b.githubUrl}>
                View source <ExternalLink size={15} />
              </SafeLink>
            )}
          </div>
          <div className="card">
            <h3>Outcomes this supports</h3>
            {cases
              .filter((u) => b.useCaseIds.includes(u.id))
              .map((u) => (
                <Link
                  className="context-link"
                  key={u.id}
                  to={"/use-cases/" + u.slug}
                >
                  {u.outcome || u.name} →
                </Link>
              ))}
            <p className="muted">
              {b.provenance === "demo"
                ? "This is an illustrative example, not a verified real-world deployment."
                : "Implementation claims are supplied by the creator unless evidence says otherwise."}
            </p>
            <BuildReport build={b} />
          </div>
        </aside>
      </div>
      {similar.length > 0 && (
        <>
          <div className="section-title">
            <h2>Similar builds</h2>
            <span className="muted">Shared use cases and stack components</span>
          </div>
          <div className="build-grid">
            {similar.map((b) => (
              <BuildCard key={b.id} build={b} />
            ))}
          </div>
        </>
      )}
      <ShareDialog build={b} open={share} close={() => setShare(false)} />
      <CreatorContact
        build={b}
        open={contact}
        close={() => setContact(false)}
      />
    </>
  );
}
