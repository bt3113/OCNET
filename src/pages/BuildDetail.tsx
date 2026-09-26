import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { GitFork, Layers3, Share2, ExternalLink } from "lucide-react";
import { useMarketplace } from "../data/marketplace-hooks";
import { providerForCreator } from "../data/solution-providers";
import { buildMaturity } from "../data/use-case-domain";
import { truthLevel } from "../data/marketplace-model";
import { xaiLegacyBuildRedirects } from "../data/vendor-xai";
import { formatMetricValue } from "../data/metrics";
import { evidenceLevelInfo } from "../data/evidence";
import { rightsCatalogue } from "../data/rights";
import { BuildImplementationList, MarketplaceMaturity, ProviderLink, TaxonomyBreadcrumb } from "../components/marketplace";
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
  SaveButton,
  Skeleton,
  TabbedSections,
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
  const market = useMarketplace();
  const b = builds.find((b) => b.slug === slug) ?? exact.data;
  const legacyUseCase = slug ? xaiLegacyBuildRedirects[slug] : undefined;
  if (legacyUseCase) return <Navigate replace to={`/use-cases/${legacyUseCase}`} />;
  if (isLoading || market.isLoading || (isSupabase && exact.isLoading)) return <Skeleton />;
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
  const approvedOffers = offers.filter((o) => o.buildId === b.id && o.active && o.moderation === "approved");
  const provider = providerForCreator(market.providers, b.creatorId);
  const blueprint = market.blueprints.find((item) => item.id === b.blueprintId);
  const blueprintVersion = market.versions.find((item) => item.id === blueprint?.currentVersionId);
  const deployments = market.implementations.filter(
    (record) => record.sourceBuildId === b.id && record.publicationState === "published" && record.moderationState === "approved" && record.visibility === "public",
  );
  const maturity = buildMaturity(b, market.blueprints, market.implementations);
  const selectedUseCases = b.useCaseIds.map((id) => market.useCases.find((useCase) => useCase.id === id)).filter((useCase): useCase is NonNullable<typeof useCase> => !!useCase);
  const truth = truthLevel(b.provenance);
  const legacyTabs: Record<string, string> = { Overview: "overview", "Stack & architecture": "how-it-works", Implementation: "how-it-works", Offers: "service", Sources: "sources", "Updates & questions": "updates" };
  const activeTab = legacyTabs[tab] ?? tab.toLowerCase();
  const selectTab = (id: string) => setParams(id === "overview" ? {} : { tab: id }, { replace: true });
  const describe = (record: (typeof deployments)[number]) => {
    const metric = market.metrics.find((item) => item.implementationId === record.id && item.baselineValue != null && item.observedValue != null);
    const definition = market.definitions.find((item) => item.id === metric?.metricDefinitionId);
    return {
      context: `${record.businessType} · ${record.region}`,
      result: metric ? `${definition?.name ?? metric.name}: ${formatMetricValue(metric.baselineValue, metric.unit)} → ${formatMetricValue(metric.observedValue, metric.unit)} (observed after implementation)` : undefined,
      evidence: `Evidence: ${evidenceLevelInfo[record.verificationState].label}`,
    };
  };
  return (
    <>
      <Breadcrumbs items={[{ name: "Builds", to: "/builds" }, { name: b.name }]} />
      <header className="build-detail-header">
        <div>
          <div className="row wrap build-status-row">
            <span className={`truth-chip truth-${truth}`}>{truth === "illustrative" ? "Illustrative demo Build" : truth === "third-party-sourced" ? "Third-party sourced" : "Published by a Solution Provider"}</span>
            <MarketplaceMaturity maturity={maturity} />
            {!isPublicBuild(b) && (
              <Badge>
                {b.visibility} · {b.moderation}
              </Badge>
            )}
          </div>
          <h1>{b.name}</h1>
          <p className="build-tagline">{b.tagline}</p>
          <div className="row wrap">
            <span className="creator-byline">
              <span className={"mini-avatar " + (provider?.color ?? creator?.color)}>{(provider?.name ?? creator?.name ?? "?")[0]}</span>
              Built by&nbsp;<ProviderLink provider={provider} fallback={creator?.name ?? "Unknown provider"} />
              {provider && <span className="muted">&nbsp;· {provider.type}</span>}
            </span>
            <span className="muted">
              Updated{" "}
              {new Date(b.updatedAt).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          {!!selectedUseCases.length && (
            <ul className="build-use-cases" aria-label="Use Cases this Build handles">
              {selectedUseCases.map((useCase, index) => (
                <li key={useCase.id}>
                  <span className="use-case-chip-role">{index === 0 ? "Primary" : "Also"}</span>
                  <Link to={`/use-cases/${useCase.slug}`}>{useCase.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="build-actions">
          <SaveButton id={b.id} name={b.name} type="builds" />
          <CollectionPicker entityId={b.id} entityType="builds" name={b.name} />
          <button className="button light" onClick={() => setShare(true)}>
            <Share2 size={16} />
            Share
          </button>
          {b.cloneAllowed && (
            <button className="button light" onClick={() => void remix()} disabled={busy}>
              <GitFork size={16} />
              {busy ? "Creating…" : "Remix build"}
            </button>
          )}
          {b.ownerId === userId && (
            <ButtonLink to={"/creator/builds/" + b.id + "/edit"} variant="light">
              Edit build
            </ButtonLink>
          )}
        </div>
      </header>
      <div className="build-detail-layout">
        <section>
          <TabbedSections
            label="Build sections"
            active={activeTab}
            onChange={selectTab}
            tabs={[
              {
                id: "overview",
                label: "Overview",
                content: (
                  <>
                    <BuildGallery build={b} />
                    <div className="card prose">
                      <h2>What this Build does</h2>
                      <p>{b.description}</p>
                      <div className="grid two">
                        <div>
                          <h3>The problem</h3>
                          <p>{b.problem || "The provider has not supplied a separate problem statement."}</p>
                        </div>
                        <div>
                          <h3>Who it is for</h3>
                          <p>{b.intendedUsers || "Explore fit with the provider before adoption."}</p>
                        </div>
                      </div>
                      <h3>Use Cases</h3>
                      <ul className="build-use-case-detail">
                        {selectedUseCases.map((useCase, index) => (
                          <li key={useCase.id}>
                            <Link to={`/use-cases/${useCase.slug}`}>{useCase.name}</Link>
                            <small>
                              {index === 0 ? "Primary" : "Secondary"} · <TaxonomyBreadcrumb useCase={useCase} categories={market.categories} />
                            </small>
                          </li>
                        ))}
                      </ul>
                      {b.notes && (
                        <>
                          <h3>Provider notes</h3>
                          <p className="muted small-print">Notes from the provider — not deployment evidence.</p>
                          <p>{b.notes}</p>
                        </>
                      )}
                    </div>
                  </>
                ),
              },
              {
                id: "how-it-works",
                label: "How it works",
                count: b.stack.length,
                content: (
                  <>
                    <div className="card build-blueprint-panel">
                      <Layers3 size={20} aria-hidden />
                      {blueprint ? (
                        <div>
                          <strong>
                            Blueprint: <Link to={`/blueprints/${blueprint.slug}`}>{blueprint.name}</Link>
                          </strong>
                          <p className="muted">
                            Version {blueprintVersion?.version ?? "—"} · {rightsCatalogue[blueprint.reuseRights].label}. The Blueprint is the reusable, versioned architecture behind this Build; its rights govern reuse.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <strong>No reusable Blueprint published for this Build yet.</strong>
                          <p className="muted">The architecture below is the provider’s own description of this Build.</p>
                        </div>
                      )}
                    </div>
                    <Suspense fallback={<Skeleton />}>
                      <ArchitectureGraph key={b.id} build={b} />
                    </Suspense>
                    <div className="card prose">
                      <h2>Technologies and their roles</h2>
                      {b.stack.map((s) => {
                        const product = products.find((p) => p.id === s.productId);
                        return (
                          <section key={s.id} className="stack-role">
                            <h3>
                              {product ? <Link to={`/technologies/${product.slug}`}>{product.name}</Link> : s.productId} · {s.role}
                            </h3>
                            <p>{s.notes || "No rationale supplied yet."}</p>
                            {s.sourceUrl && <SafeLink url={s.sourceUrl}>Source →</SafeLink>}
                          </section>
                        );
                      })}
                      <h3>Requirements</h3>
                      <p>{b.requirements || "Not supplied"}</p>
                      <h3>Setup</h3>
                      <p className="preserve-lines">{b.setupNotes || "Not supplied"}</p>
                      <h3>Known limitations</h3>
                      <p>{b.limitations || "Not supplied. Ask the provider about constraints."}</p>
                      <dl className="detail-list">
                        {[
                          ["Difficulty", b.difficulty],
                          ["Build time", b.buildTime || "Not supplied"],
                          ["Build cost", b.buildCost ? `${b.buildCost} ${b.currency} · provider reported` : "Not supplied"],
                          ["Blueprint remix", b.cloneAllowed ? "Permitted with attribution" : "Not permitted"],
                          ["Commercial reuse", b.commercialUseAllowed ? "Provider permits — check license" : "Not granted"],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      {b.forkedFromBuildId && <Link to={"/builds/" + builds.find((x) => x.id === b.forkedFromBuildId)?.slug}>View original blueprint →</Link>}
                    </div>
                  </>
                ),
              },
              {
                id: "proof",
                label: "Proof",
                count: deployments.length,
                content: (
                  <section className="intelligence-section">
                    <p className="tab-section-note">Real deployments linked to this Build. Each has its own evidence, customer context and limitations.</p>
                    <BuildImplementationList records={deployments} describe={describe} />
                    {b.ownerId === userId && (
                      <ButtonLink to={`/implementation/new?build=${b.id}`} variant="light">
                        Add a real deployment
                      </ButtonLink>
                    )}
                  </section>
                ),
              },
              {
                id: "service",
                label: "Service",
                count: approvedOffers.length,
                content: (
                  <section className="intelligence-section">
                    <p className="tab-section-note">What {provider?.name ?? "the provider"} offers for this Build. Oracnet is the neutral marketplace; the provider delivers the work. No payments are collected in this prototype.</p>
                    <div className="grid two">
                      {approvedOffers.map((o) => (
                        <BuildOfferCard key={o.id} build={b} offer={o} />
                      ))}
                    </div>
                    {!approvedOffers.length && <p className="muted">No services listed for this Build yet.</p>}
                    <div className="row wrap">
                      <button className="button dark" onClick={() => setContact(true)}>
                        Request a proposal
                      </button>
                      <ButtonLink to={"/app/projects/new?build=" + b.id} variant="light">
                        Create a project brief
                      </ButtonLink>
                    </div>
                  </section>
                ),
              },
              {
                id: "sources",
                label: "Sources",
                content: (
                  <div className="card prose">
                    <h2>Sources, rights and provenance</h2>
                    <p>Links support context. A linked product or public repository does not verify a deployment or grant reuse rights.</p>
                    {b.sources.map((s) => (
                      <div className="source-row" key={s.id}>
                        <SafeLink url={s.url}>
                          {s.label} <ExternalLink size={15} />
                        </SafeLink>
                        <Badge>{s.evidence}</Badge>
                        <small>{s.kind}</small>
                      </div>
                    ))}
                    {!b.sources.length && <p className="muted">No sources supplied yet.</p>}
                    {b.demoUrl && (
                      <p>
                        <SafeLink url={b.demoUrl}>Live demo</SafeLink>
                      </p>
                    )}
                    {b.sourceAvailable && b.githubUrl && (
                      <p>
                        <SafeLink url={b.githubUrl}>Repository</SafeLink>
                      </p>
                    )}
                    <h3>License</h3>
                    <p>{b.license || "No reuse permission specified."}</p>
                    <p>{b.attribution}</p>
                    <h3>Provenance</h3>
                    <p>
                      {truth === "illustrative"
                        ? "Illustrative demo data: the provider, Build and any linked records are fictional."
                        : truth === "third-party-sourced"
                          ? "Summarised from a public source."
                          : "Published by a Solution Provider on Oracnet."}
                    </p>
                    <BuildReport build={b} />
                  </div>
                ),
              },
              {
                id: "updates",
                label: "Updates & questions",
                content: (
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
                      {!updates.some((u) => u.buildId === b.id) && <p>No updates recorded yet.</p>}
                    </div>
                    <BuildComments build={b} />
                  </>
                ),
              },
            ]}
          />
        </section>
        <aside className="build-context">
          <div className="card">
            <h2>Get this built</h2>
            <p>Ask {provider?.name ?? "the provider"} to adapt this Build, or brief several providers.</p>
            <BuildSomething build={b} onRemix={() => void remix()} />
            <button className="button light" onClick={() => setContact(true)}>
              Contact {provider?.name ?? "provider"}
            </button>
            <BuildCompareButton build={b} />
          </div>
          <div className="card build-evidence-summary">
            <h3>Evidence at a glance</h3>
            <dl className="detail-list">
              <div>
                <dt>Blueprint</dt>
                <dd>{blueprint ? `v${blueprintVersion?.version ?? "—"}` : "None"}</dd>
              </div>
              <div>
                <dt>Linked deployments</dt>
                <dd>{deployments.length}</dd>
              </div>
              <div>
                <dt>Verification</dt>
                <dd>{b.verification === "verified" ? "Evidence verified" : "Not independently verified"}</dd>
              </div>
            </dl>
            <p className="muted small-print">{deployments.length ? "See Proof for each deployment’s evidence." : "No real deployment has been linked to this Build yet."}</p>
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
