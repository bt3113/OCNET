import { BuildImage } from "../components/builds/BuildImage";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { useActions, useRecords, useUI } from "../state";
import { list, save, isSupabase } from "../data/repository";
import type { Build, BuildOffer, OfferType } from "../data/build-model";
import type { UseCaseProposal } from "../data/marketplace-model";
import { useMarketplace } from "../data/marketplace-hooks";
import { buildUseCaseErrors, canPropose, isApprovedUseCase } from "../data/use-case-domain";
import { UseCasePicker, type ProposalInput } from "../components/builds/UseCasePicker";
import {
  completeness,
  newBuild,
  slugify,
  validateBuild,
  safeUrl,
} from "../data/build-domain";
import { importPublicRepository, importPublicUrl } from "../data/import-public";
import { PageHeading, WorkspaceNotice } from "../components/layout";
import {
  Badge,
  ButtonLink,
  EmptyState,
  ErrorState,
  Skeleton,
} from "../components/ui";
import { assetUrl } from "../components/builds/cards";
import { BuildGallery } from "../components/builds/interactions";
/** The Build publisher, in the order a Solution Provider thinks about a Build. */
const steps = ["Basics", "Use Cases", "How it works", "Proof", "Service", "Review"];
const stepTitles = [
  "Describe the Build",
  "Choose the work it does",
  "Show how it works",
  "Link real deployments",
  "Offer a service (optional)",
  "Review before publishing",
];
export default function BuildWizard() {
  const { id } = useParams();
  const { userId, roles } = useUI();
  const {
    data: builds = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("builds");
  const { data: creators = [], isLoading: loadingCreators } =
    useRecords("creator_profiles");
  const { data: collaborators = [] } = useRecords("build_collaborators");
  const { data: members = [] } = useRecords("organization_memberships");
  const { data: useCases = [], isLoading: loadingUseCases } = useRecords("use_cases");
  const creator = creators.find((c) => c.ownerId === userId);
  // "Publish a Build for this Use Case" links prefill the primary Use Case.
  const prefill = new URLSearchParams(window.location.search).get("useCase");
  const prefilled = useCases.find((useCase) => (useCase.id === prefill || useCase.slug === prefill) && isApprovedUseCase(useCase));
  const existing = builds.find((b) => b.id === id);
  if (isLoading || loadingCreators || loadingUseCases) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;
  if (!userId)
    return (
      <EmptyState
        title="Sign in to publish a build"
        to="/sign-in"
        action="Sign in"
      />
    );
  if (!creator)
    return (
      <EmptyState
        title="Introduce yourself first"
        description="Create a creator profile so your work has clear attribution."
        to="/creator/profile"
        action="Create creator profile"
      />
    );
  if (
    id &&
    (!existing ||
      !(
        existing.ownerId === userId ||
        roles.includes("admin") ||
        collaborators.some(
          (c) => c.buildId === id && c.userId === userId && c.role === "editor",
        ) ||
        members.some(
          (m) =>
            m.organizationId === existing.organizationId &&
            m.userId === userId &&
            m.role !== "viewer",
        )
      ))
  )
    return (
      <EmptyState
        title="Build editing is unavailable"
        to="/creator/builds"
        action="Your builds"
      />
    );
  return (
    <BuildEditor
      key={id || "new"}
      initial={
        existing ?? {
          ...newBuild(userId, creator.id),
          useCaseIds: prefilled ? [prefilled.id] : [],
          provenance: isSupabase ? "creator supplied" : "demo",
        }
      }
    />
  );
}
function BuildEditor({ initial }: { initial: Build }) {
  const [draft, setDraft] = useState(initial);
  const baseline = useRef(initial);
  const [step, setStep] = useState(() =>
    new URLSearchParams(window.location.search).get("stage") === "offers"
      ? 4
      : 0,
  );
  const [saveState, setSaveState] = useState("Draft ready");
  const [errors, setErrors] = useState<string[]>([]);
  const [importUrl, setImportUrl] = useState("");
  const [importKind, setImportKind] = useState("github");
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tool, setTool] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [offer, setOffer] = useState<BuildOffer | null>(null);
  const { userId, notify } = useUI();
  const client = useQueryClient();
  const actions = useActions();
  const navigate = useNavigate();
  const { data: products = [] } = useRecords("products");
  const market = useMarketplace();
  const creator = market.creators.find((item) => item.id === draft.creatorId);
  const providerName = creator?.name ?? "";
  // The pending proposal is looked up by Build, not only by the draft's (debounced) link,
  // so a lost autosave or a moderator's decision never leaves it orphaned or stale.
  const proposal = market.proposals.find((item) => item.buildId === draft.id && item.status === "pending");
  const proposalLink = proposal?.id ?? null;
  useEffect(() => {
    if (market.isLoading || (draft.useCaseProposalId ?? null) === proposalLink) return;
    setDraft((current) => ({ ...current, useCaseProposalId: proposalLink, updatedAt: new Date().toISOString() }));
  }, [market.isLoading, draft.useCaseProposalId, proposalLink]);
  const ownBlueprints = market.blueprints.filter(
    (blueprint) => blueprint.buildId === draft.id || blueprint.maintainerId === draft.creatorId || blueprint.id === draft.blueprintId,
  );
  const linkedRecords = market.implementations.filter((record) => record.sourceBuildId === draft.id);
  const { data: categories = [] } = useRecords("categories");
  const { data: organizations = [] } = useRecords("organizations");
  const { data: members = [] } = useRecords("organization_memberships");
  const { data: offers = [] } = useRecords("build_offers");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef(Promise.resolve());
  const published = useRef(false);
  function update(p: Partial<Build>) {
    setDraft((d) => ({ ...d, ...p, updatedAt: new Date().toISOString() }));
  }
  useEffect(() => {
    if (draft === baseline.current) return;
    published.current = false;
    setSaveState("Saving…");
    timer.current = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        if (published.current) return;
        try {
          await save("builds", draft);
          client.setQueryData(["builds"], await list("builds"));
          setSaveState("Draft autosaved");
        } catch (e) {
          setSaveState("Autosave failed — retry or save before leaving");
          notify(e instanceof Error ? e.message : "Draft could not be saved");
        }
      });
    }, 650);
    return () => clearTimeout(timer.current);
  }, [draft, client, notify]);
  async function saveNow() {
    clearTimeout(timer.current);
    await queue.current;
    try {
      await actions.save("builds", draft);
      setSaveState("Draft saved");
      notify("Draft saved");
    } catch {
      /* handled */
    }
  }
  async function publish() {
    const problems = [...buildUseCaseErrors(draft, market.useCases), ...validateBuild(draft)];
    setErrors(problems);
    if (problems.length) {
      setStep(steps.length - 1);
      return;
    }
    setBusy(true);
    clearTimeout(timer.current);
    published.current = true;
    await queue.current;
    try {
      const result = {
        ...draft,
        slug:
          initial.publication === "published"
            ? initial.slug
            : slugify(draft.name) + "-" + draft.id.slice(0, 6),
        visibility:
          draft.visibility === "draft" ? ("public" as const) : draft.visibility,
        publication: "published" as const,
        moderation: isSupabase ? ("pending" as const) : ("approved" as const),
        provenance: isSupabase
          ? ("creator supplied" as const)
          : ("demo" as const),
        updatedAt: new Date().toISOString(),
      };
      await actions.save("builds", result);
      await actions.save("build_updates", {
        id: crypto.randomUUID(),
        buildId: result.id,
        ownerId: userId,
        name:
          initial.publication === "published"
            ? "Blueprint updated"
            : "Build published",
        body: "Creator updated the structured blueprint and implementation information.",
        date: new Date().toISOString(),
        provenance: result.provenance,
      });
      notify(
        isSupabase
          ? "Build submitted for moderation"
          : "Demo build published in this browser",
      );
      navigate("/builds/" + result.slug);
    } catch {
      published.current = false;
    } finally {
      setBusy(false);
    }
  }
  async function propose(input: ProposalInput) {
    if (!canPropose({ ...draft, useCaseProposalId: proposalLink })) {
      notify("A Build can have one proposed Use Case, within its three Use Case slots.");
      return;
    }
    await saveNow();
    const record: UseCaseProposal = {
      id: crypto.randomUUID(),
      name: input.suggestedTitle,
      buildId: draft.id,
      creatorId: draft.creatorId,
      proposedBy: userId,
      originalText: input.originalText,
      suggestedTitle: input.suggestedTitle,
      suggestedCategoryId: input.suggestedCategoryId,
      suggestedSubcategoryId: input.suggestedSubcategoryId,
      status: "pending",
      createdAt: new Date().toISOString(),
      provenance: isSupabase ? "community supplied" : "demo",
    };
    try {
      await actions.save("use_case_proposals", record);
      update({ useCaseProposalId: record.id });
      notify("Proposal submitted. It stays private until a moderator reviews it.");
    } catch {
      /* handled */
    }
  }
  async function withdrawProposal() {
    if (!proposal) return;
    try {
      await actions.remove("use_case_proposals", proposal.id);
    } catch {
      return;
    }
    update({ useCaseProposalId: null });
    notify("Proposal withdrawn");
  }
  async function doImport() {
    setImporting(true);
    setErrors([]);
    try {
      const r = await (importKind === "github"
        ? importPublicRepository(importUrl)
        : importPublicUrl(importUrl));
      update({
        name: r.name || draft.name,
        tagline: r.description.slice(0, 200),
        description: r.description,
        githubUrl: importKind === "github" ? r.sourceUrl : "",
        demoUrl: r.homepage,
        license: r.license,
        sourceAvailable: importKind === "github",
        sources: [
          ...draft.sources,
          {
            id: crypto.randomUUID(),
            url: r.sourceUrl,
            label: "Imported public source",
            kind: importKind === "github" ? "repository" : "documentation",
            evidence: "third-party sourced",
          },
        ],
        notes:
          (r.language ? "Repository language: " + r.language + "\n" : "") +
          (r.readme
            ? "README excerpt (untrusted text; review before publication):\n" +
              r.readme.slice(0, 6000)
            : ""),
        stack: [
          ...draft.stack,
          ...r.detected
            .filter(
              (s) => !draft.stack.some((x) => x.productId === s.productId),
            )
            .map((s, i) => ({
              id: crypto.randomUUID(),
              productId: s.productId,
              capabilityId:
                products.find((p) => p.id === s.productId)?.capabilityIds[0] ||
                "",
              role: "Confirm role",
              notes: s.evidence,
              alternativeIds: [],
              evidence: "detected" as const,
              sourceUrl: r.sourceUrl,
              x: (i % 2) * 320,
              y: Math.floor(i / 2) * 170,
            })),
        ],
      });
      notify(
        "Metadata imported. Review all details and confirm detected technologies.",
      );
    } catch (e) {
      setErrors([
        e instanceof Error ? e.message : "Import failed. Continue manually.",
      ]);
    } finally {
      setImporting(false);
    }
  }
  async function upload(file: File) {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      notify("Use a PNG, JPEG or WebP image up to 2 MB.");
      return;
    }
    try {
      let url: string;
      if (isSupabase) {
        const { supabaseUpload } = await import("../data/uploads");
        url = await supabaseUpload(file, "build-media", true);
      } else {
        url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      update({
        media: [
          ...draft.media,
          {
            id: crypto.randomUUID(),
            type: "image",
            url,
            alt: file.name.replace(/\.[^.]+$/, ""),
          },
        ],
      });
    } catch {
      notify("Upload failed. Please retry.");
    }
  }
  const field = (label: string, key: keyof Build, multiline = false) => (
    <label>
      {label}
      {multiline ? (
        <textarea
          value={String(draft[key] ?? "")}
          rows={4}
          maxLength={12000}
          onChange={(e) => update({ [key]: e.target.value })}
        />
      ) : (
        <input
          value={String(draft[key] ?? "")}
          maxLength={key === "name" ? 120 : 500}
          onChange={(e) => update({ [key]: e.target.value })}
        />
      )}
    </label>
  );
  return (
    <>
      <WorkspaceNotice />
      <PageHeading
        eyebrow="PUBLISH A BUILD"
        title={initial.publication === "published" ? "Edit your Build" : "Publish a Build"}
        description="A Build is a complete solution you designed or can deliver, for one to three Use Cases. Buyers see how it works, what proves it, and how to get it."
        action={
          <ButtonLink to="/creator/builds" variant="light">
            Your builds
          </ButtonLink>
        }
      />
      <div className="publish-layout">
        <aside className="publish-steps">
          <ol>
            {steps.map((s, i) => (
              <li key={s}>
                <button
                  aria-current={step === i ? "step" : undefined}
                  className={step === i ? "active" : ""}
                  onClick={() => setStep(i)}
                >
                  <span>{i < step ? <Check size={14} /> : i + 1}</span>
                  {s}
                </button>
              </li>
            ))}
          </ol>
          <div className="card">
            <strong>{completeness(draft)}% complete</strong>
            <progress value={completeness(draft)} max={100} />
            <small>
              Completeness measures supplied information, not quality or
              performance.
            </small>
          </div>
        </aside>
        <section>
          <div className="publish-status">
            <span>
              Step {step + 1} of {steps.length} · {steps[step]}
            </span>
            <span role="status">{saveState}</span>
          </div>
          <div className="card form-card build-editor">
            <h2>{stepTitles[step]}</h2>
            {errors.length > 0 && (
              <div className="validation-errors" role="alert">
                <strong>Please review</strong>
                <ul>
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {step === 0 ? (
              <>
                <details className="publish-nested" open={!draft.name}>
                  <summary>Import from a public repository or URL (optional)</summary>

                <p>
                  Import public repository metadata or a project URL to prefill
                  this form, or skip this and fill it in below. Nothing is
                  published without your review.
                </p>
                <label>
                  Import method
                  <select
                    value={importKind}
                    onChange={(e) => setImportKind(e.target.value)}
                  >
                    <option value="github">Public GitHub repository</option>
                    <option value="url">Project URL</option>
                  </select>
                </label>
                <label>
                  Public project URL
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                  />
                </label>
                <button
                  className="button dark"
                  disabled={importing || !importUrl}
                  onClick={() => void doImport()}
                >
                  {importing ? "Reading public metadata…" : "Import metadata"}
                </button>
                <p className="notice">
                  Only public repositories. No GitHub access tokens or private
                  repository scopes are requested. Detected technologies require
                  your confirmation.
                </p>
              
                </details>

                {field("Build name", "name")}
                {field("Short outcome / tagline", "tagline")}
                {field("Description", "description", true)}
                <div className="grid two">
                  <label>
                    Category
                    <select
                      value={draft.category}
                      onChange={(e) => update({ category: e.target.value })}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {field("Industry", "industry")}
                </div>
                {field("Problem solved", "problem", true)}
                {field("Intended users", "intendedUsers")}
                <label>
                  Publish visibility
                  <select
                    value={
                      draft.visibility === "draft" ? "public" : draft.visibility
                    }
                    onChange={(e) =>
                      update({
                        visibility: e.target.value as Build["visibility"],
                      })
                    }
                  >
                    <option value="public">Public after moderation</option>
                    <option value="unlisted">
                      Unlisted — anyone with the link
                    </option>
                    <option value="private">Private</option>
                  </select>
                </label>
                <label>
                  Owning organization
                  <select
                    value={draft.organizationId || ""}
                    onChange={(e) =>
                      update({ organizationId: e.target.value || undefined })
                    }
                  >
                    <option value="">Personal build</option>
                    {organizations
                      .filter((o) =>
                        members.some(
                          (m) =>
                            m.organizationId === o.id &&
                            m.userId === userId &&
                            m.role !== "viewer",
                        ),
                      )
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                  </select>
                </label>
              
                <details className="publish-nested">
                  <summary>Media ({draft.media.length})</summary>

                <p>
                  The first image is your cover. Upload original or
                  appropriately licensed media.
                </p>
                <label>
                  Add image (PNG, JPEG, WebP · up to 2 MB)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      if (e.target.files?.[0]) void upload(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="editor-media">
                  {draft.media.map((m, i) => (
                    <div className="card" key={m.id}>
                      {m.type === "image" && (
                        <BuildImage src={assetUrl(m.url)} alt={m.alt} />
                      )}
                      <label>
                        Media description
                        <input
                          value={m.alt}
                          onChange={(e) =>
                            update({
                              media: draft.media.map((x) =>
                                x.id === m.id
                                  ? { ...x, alt: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <div className="row">
                        <button
                          className="button light"
                          disabled={i === 0}
                          onClick={() =>
                            update({
                              media: [
                                m,
                                ...draft.media.filter((x) => x.id !== m.id),
                              ],
                            })
                          }
                        >
                          Make cover
                        </button>
                        <button
                          className="icon-button"
                          aria-label={"Remove media " + (i + 1)}
                          onClick={() =>
                            update({
                              media: draft.media.filter((x) => x.id !== m.id),
                            })
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <label>
                  YouTube or Vimeo video URL
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </label>
                <button
                  className="button light"
                  onClick={() => {
                    if (!safeUrl(videoUrl)) {
                      notify("Enter a valid HTTP(S) video URL.");
                      return;
                    }
                    update({
                      media: [
                        ...draft.media,
                        {
                          id: crypto.randomUUID(),
                          type: "video",
                          url: videoUrl,
                          alt: "Creator video demo",
                        },
                      ],
                    });
                    setVideoUrl("");
                  }}
                >
                  Add video link
                </button>
                {field("Live demo URL (optional)", "demoUrl")}
              
                </details>
              </>
            ) : step === 1 ? (
              <UseCasePicker
                build={draft}
                onChange={(useCaseIds) => update({ useCaseIds })}
                useCases={market.useCases}
                aliases={market.aliases}
                categories={market.categories}
                marketplace={market.marketplace}
                providerName={providerName}
                proposal={proposal}
                onPropose={propose}
                onWithdraw={withdrawProposal}
              />
            ) : step === 2 ? (
              <>
                <h3>Blueprint</h3>
                <p>
                  A Blueprint is the reusable, versioned architecture behind this Build. Link one you maintain, or describe the stack and connections below.
                </p>
                <label>
                  Linked Blueprint
                  <select value={draft.blueprintId ?? ""} onChange={(e) => update({ blueprintId: e.target.value || null })}>
                    <option value="">No Blueprint linked</option>
                    {ownBlueprints.map((blueprint) => (
                      <option key={blueprint.id} value={blueprint.id}>
                        {blueprint.name}
                      </option>
                    ))}
                  </select>
                </label>
                <h3>Stack</h3>

                <label>
                  Search technology catalogue
                  <input
                    value={tool}
                    onChange={(e) => setTool(e.target.value)}
                    placeholder="Search Claude, Supabase, n8n…"
                  />
                </label>
                <div className="tool-picker">
                  {products
                    .filter(
                      (p) =>
                        (p.name + " " + p.description)
                          .toLowerCase()
                          .includes(tool.toLowerCase()) &&
                        !draft.stack.some((s) => s.productId === p.id),
                    )
                    .slice(0, 8)
                    .map((p) => (
                      <button
                        className="button light"
                        key={p.id}
                        onClick={() => {
                          const i = draft.stack.length;
                          update({
                            stack: [
                              ...draft.stack,
                              {
                                id: crypto.randomUUID(),
                                productId: p.id,
                                capabilityId: p.capabilityIds[0] || "",
                                role: p.capabilityIds[0] || "Component",
                                notes: "",
                                alternativeIds: [],
                                evidence: "creator-confirmed",
                                x: (i % 2) * 320,
                                y: Math.floor(i / 2) * 170,
                              },
                            ],
                          });
                          setTool("");
                        }}
                      >
                        <Plus size={15} />
                        {p.name}
                      </button>
                    ))}
                </div>
                <div className="editor-stack">
                  {draft.stack.map((s, i) => (
                    <div className="card" key={s.id}>
                      <div className="row between">
                        <h3>
                          {products.find((p) => p.id === s.productId)?.name}
                        </h3>
                        <div className="row">
                          <button
                            className="icon-button"
                            disabled={i === 0}
                            aria-label={"Move up " + s.productId}
                            onClick={() => {
                              const a = [...draft.stack];
                              [a[i - 1], a[i]] = [a[i], a[i - 1]];
                              update({ stack: a });
                            }}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            className="icon-button"
                            disabled={i === draft.stack.length - 1}
                            aria-label={"Move down " + s.productId}
                            onClick={() => {
                              const a = [...draft.stack];
                              [a[i], a[i + 1]] = [a[i + 1], a[i]];
                              update({ stack: a });
                            }}
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={"Remove " + s.productId}
                            onClick={() =>
                              update({
                                stack: draft.stack.filter((x) => x.id !== s.id),
                                connections: draft.connections.filter(
                                  (c) => c.fromId !== s.id && c.toId !== s.id,
                                ),
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <label>
                        Role / capability
                        <input
                          value={s.role}
                          onChange={(e) =>
                            update({
                              stack: draft.stack.map((x) =>
                                x.id === s.id
                                  ? { ...x, role: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Why this technology?
                        <textarea
                          value={s.notes}
                          onChange={(e) =>
                            update({
                              stack: draft.stack.map((x) =>
                                x.id === s.id
                                  ? { ...x, notes: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Suggested alternative
                        <select
                          value={s.alternativeIds[0] || ""}
                          onChange={(e) =>
                            update({
                              stack: draft.stack.map((x) =>
                                x.id === s.id
                                  ? {
                                      ...x,
                                      alternativeIds: e.target.value
                                        ? [e.target.value]
                                        : [],
                                    }
                                  : x,
                              ),
                            })
                          }
                        >
                          <option value="">None specified</option>
                          {products
                            .filter((p) => p.id !== s.productId)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      {s.evidence === "detected" ? (
                        <label className="check-field">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() =>
                              update({
                                stack: draft.stack.map((x) =>
                                  x.id === s.id
                                    ? { ...x, evidence: "creator-confirmed" }
                                    : x,
                                ),
                              })
                            }
                          />
                          I confirm this technology is used in the build
                        </label>
                      ) : (
                        <Badge>{s.evidence}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              
                <h3>Architecture</h3>

                <p>
                  Describe direction and meaning. Connections are illustrative
                  unless independently confirmed.
                </p>
                <div className="grid two">
                  <label>
                    From component
                    <select
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    >
                      <option value="">Choose source</option>
                      {draft.stack.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.role} ·{" "}
                          {products.find((p) => p.id === s.productId)?.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    To component
                    <select value={to} onChange={(e) => setTo(e.target.value)}>
                      <option value="">Choose destination</option>
                      {draft.stack
                        .filter((s) => s.id !== from)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.role} ·{" "}
                            {products.find((p) => p.id === s.productId)?.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <label>
                  Connection meaning
                  <input
                    value={edgeLabel}
                    onChange={(e) => setEdgeLabel(e.target.value)}
                    placeholder="Send validated appointment request"
                    maxLength={120}
                  />
                </label>
                <button
                  className="button light"
                  disabled={!from || !to || from === to || !edgeLabel.trim()}
                  onClick={() => {
                    update({
                      connections: [
                        ...draft.connections,
                        {
                          id: crypto.randomUUID(),
                          fromId: from,
                          toId: to,
                          label: edgeLabel,
                        },
                      ],
                    });
                    setEdgeLabel("");
                  }}
                >
                  Connect components
                </button>
                {draft.connections.map((c) => (
                  <div className="connection-row" key={c.id}>
                    <span>
                      {draft.stack.find((s) => s.id === c.fromId)?.role} →{" "}
                      {draft.stack.find((s) => s.id === c.toId)?.role}
                      <small>{c.label}</small>
                    </span>
                    <button
                      className="icon-button"
                      aria-label={"Remove connection " + c.label}
                      onClick={() =>
                        update({
                          connections: draft.connections.filter(
                            (x) => x.id !== c.id,
                          ),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <h3>Canvas positions</h3>
                <p>
                  Keyboard-accessible layout controls. Positions are shown in
                  the public architecture explorer.
                </p>
                {draft.stack.map((s) => (
                  <div className="row wrap" key={s.id}>
                    <strong>{s.role}</strong>
                    {(["x", "y"] as const).map((k) => (
                      <label key={k}>
                        {k.toUpperCase()} position for {s.role}
                        <input
                          type="number"
                          min={0}
                          max={2000}
                          step={20}
                          value={s[k]}
                          onChange={(e) =>
                            update({
                              stack: draft.stack.map((x) =>
                                x.id === s.id
                                  ? {
                                      ...x,
                                      [k]: Math.max(
                                        0,
                                        Math.min(2000, Number(e.target.value)),
                                      ),
                                    }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                ))}
              
                <h3>Delivery facts</h3>

                <div className="grid two">
                  {field("Build time (creator reported)", "buildTime")}
                  {field(
                    "Build cost (creator reported, optional)",
                    "buildCost",
                  )}
                </div>
                <div className="grid two">
                  {field("Currency", "currency")}
                  <label>
                    Difficulty
                    <select
                      value={draft.difficulty}
                      onChange={(e) => update({ difficulty: e.target.value })}
                    >
                      {["Beginner", "Intermediate", "Advanced"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {field("Requirements", "requirements", true)}
                {field("Setup notes", "setupNotes", true)}
                {field("Known limitations", "limitations", true)}
                {field("Creator notes", "notes", true)}
                
              </>
            ) : step === 3 ? (
              <>
                <h3>Real deployments</h3>
                <p>
                  Proof is an Implementation Record: a real deployment with its context, results and evidence level. Creator notes are not proof.
                </p>
                {linkedRecords.length ? (
                  <ul className="build-links">
                    {linkedRecords.map((record) => (
                      <li key={record.id}>
                        <Link to={"/implementations/" + record.slug}>{record.name}</Link>{" "}
                        <span className="muted">
                          — {record.publicationState} · {record.moderationState}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No Implementation Record is linked to this Build yet.</p>
                )}
                <Link className="button light" to={"/implementation/new?build=" + draft.id} onClick={() => void saveNow()}>
                  <Plus size={15} /> Add a real deployment
                </Link>
                <h3>Source and licence</h3>
{field("GitHub / source URL", "githubUrl")}
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={draft.sourceAvailable}
                    onChange={(e) =>
                      update({ sourceAvailable: e.target.checked })
                    }
                  />
                  Source code is available at the linked URL
                </label>
                {field("Source / blueprint license", "license")}
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={draft.cloneAllowed}
                    onChange={(e) => update({ cloneAllowed: e.target.checked })}
                  />
                  Allow attributed remix of the structured blueprint (not source
                  code)
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={draft.commercialUseAllowed}
                    onChange={(e) =>
                      update({ commercialUseAllowed: e.target.checked })
                    }
                  />
                  I grant commercial blueprint reuse under the stated license
                </label>
                {field("Attribution", "attribution")}
                <h3>Sources & evidence</h3>
                {draft.sources.map((s) => (
                  <div className="connection-row" key={s.id}>
                    <span>
                      {s.label}
                      <small>{s.url}</small>
                    </span>
                    <button
                      className="icon-button"
                      aria-label={"Remove source " + s.label}
                      onClick={() =>
                        update({
                          sources: draft.sources.filter((x) => x.id !== s.id),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <label>
                  Source label
                  <input
                    value={sourceLabel}
                    onChange={(e) => setSourceLabel(e.target.value)}
                  />
                </label>
                <label>
                  Source URL
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </label>
                <button
                  className="button light"
                  onClick={() => {
                    if (!safeUrl(sourceUrl) || !sourceLabel.trim()) {
                      notify("Add a valid URL and label.");
                      return;
                    }
                    update({
                      sources: [
                        ...draft.sources,
                        {
                          id: crypto.randomUUID(),
                          label: sourceLabel,
                          url: sourceUrl,
                          kind: "documentation",
                          evidence: isSupabase ? "creator supplied" : "demo",
                        },
                      ],
                    });
                    setSourceLabel("");
                    setSourceUrl("");
                  }}
                >
                  Add source
                </button>
              
              </>
            ) : step === 4 ? (
              <>
                <p>
                  Keep the build useful on its own. Offers are optional. No card
                  collection or live platform checkout.
                </p>
                {offers
                  .filter((o) => o.buildId === draft.id)
                  .map((o) => (
                    <div className="connection-row" key={o.id}>
                      <span>
                        {o.name}
                        <small>
                          {o.offerType} · {o.active ? "Active" : "Paused"} ·{" "}
                          {o.moderation}
                        </small>
                      </span>
                      <button
                        className="button light"
                        onClick={() => setOffer(o)}
                      >
                        Edit offer
                      </button>
                    </div>
                  ))}
                <button
                  className="button light"
                  onClick={() =>
                    setOffer({
                      id: crypto.randomUUID(),
                      name: "",
                      buildId: draft.id,
                      ownerId: userId,
                      description: "",
                      offerType: "Full implementation",
                      pricingModel: "request quote",
                      price: null,
                      currency: "USD",
                      deliveryTime: "",
                      checkoutMode: "contact",
                      externalUrl: "",
                      active: true,
                      moderation: "pending",
                      provenance: isSupabase ? "creator supplied" : "demo",
                    })
                  }
                >
                  Add offer
                </button>
                {offer && (
                  <div className="offer-editor">
                    <label>
                      Offer title
                      <input
                        value={offer.name}
                        onChange={(e) =>
                          setOffer({ ...offer, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Offer description
                      <textarea
                        value={offer.description}
                        onChange={(e) =>
                          setOffer({ ...offer, description: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Offer type
                      <select
                        value={offer.offerType}
                        onChange={(e) =>
                          setOffer({
                            ...offer,
                            offerType: e.target.value as OfferType,
                          })
                        }
                      >
                        {[
                          "Free guide",
                          "Template",
                          "Source package",
                          "Starter kit",
                          "Setup service",
                          "Customisation",
                          "Full implementation",
                          "Support plan",
                          "Consultation",
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Pricing model
                      <select
                        value={offer.pricingModel}
                        onChange={(e) =>
                          setOffer({
                            ...offer,
                            pricingModel: e.target
                              .value as BuildOffer["pricingModel"],
                          })
                        }
                      >
                        {[
                          "free",
                          "fixed",
                          "starting from",
                          "monthly",
                          "yearly",
                          "request quote",
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <div className="grid two">
                      <label>
                        Price (creator supplied)
                        <input
                          type="number"
                          min={0}
                          value={offer.price ?? ""}
                          onChange={(e) =>
                            setOffer({
                              ...offer,
                              price: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        />
                      </label>
                      <label>
                        Currency
                        <input
                          value={offer.currency}
                          maxLength={3}
                          onChange={(e) =>
                            setOffer({
                              ...offer,
                              currency: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Delivery estimate
                      <input
                        value={offer.deliveryTime}
                        onChange={(e) =>
                          setOffer({ ...offer, deliveryTime: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Checkout mode
                      <select
                        value={offer.checkoutMode}
                        onChange={(e) =>
                          setOffer({
                            ...offer,
                            checkoutMode: e.target
                              .value as BuildOffer["checkoutMode"],
                          })
                        }
                      >
                        <option value="contact">Contact creator</option>
                        <option value="external">
                          External creator checkout
                        </option>
                        <option value="demo">Demo preview only</option>
                      </select>
                    </label>
                    {offer.checkoutMode === "external" && (
                      <label>
                        External checkout URL
                        <input
                          type="url"
                          value={offer.externalUrl}
                          onChange={(e) =>
                            setOffer({ ...offer, externalUrl: e.target.value })
                          }
                        />
                      </label>
                    )}
                    <button
                      className="button dark"
                      onClick={async () => {
                        if (
                          offer.name.length < 5 ||
                          offer.description.length < 20 ||
                          (!["free", "request quote"].includes(
                            offer.pricingModel,
                          ) &&
                            offer.price === null) ||
                          (offer.checkoutMode === "external" &&
                            !safeUrl(offer.externalUrl))
                        ) {
                          notify(
                            "Provide a title, description, valid price and checkout URL where applicable.",
                          );
                          return;
                        }
                        await saveNow();
                        try {
                          await actions.save("build_offers", {
                            ...offer,
                            moderation: isSupabase ? "pending" : "approved",
                          });
                          setOffer(null);
                          notify("Offer saved");
                        } catch {
                          /* handled */
                        }
                      }}
                    >
                      Save offer
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3>Use Cases</h3>
                <ol className="review-use-cases">
                  {draft.useCaseIds.map((useCaseId, index) => {
                    const useCase = market.useCases.find((item) => item.id === useCaseId);
                    return (
                      <li key={useCaseId}>
                        <strong>{useCase?.name ?? "Removed Use Case"}</strong> <span className="muted">{index === 0 ? "Primary" : "Secondary"}</span>
                      </li>
                    );
                  })}
                  {proposal && (
                    <li>
                      <strong>{proposal.suggestedTitle}</strong> <span className="muted">Proposed · pending review</span>
                    </li>
                  )}
                </ol>
                {!draft.useCaseIds.length && (
                  <button type="button" className="text-button" onClick={() => setStep(1)}>
                    Choose a Use Case
                  </button>
                )}
                <Badge>
                  Public-page preview ·{" "}
                  {draft.visibility === "draft" ? "public" : draft.visibility}
                </Badge>
                <h2>{draft.name}</h2>
                <p className="build-tagline">{draft.tagline}</p>
                <BuildGallery build={draft} />
                <p>{draft.description}</p>
                <h3>Stack</h3>
                <div className="tags">
                  {draft.stack.map((s) => (
                    <span key={s.id}>
                      {products.find((p) => p.id === s.productId)?.name} ·{" "}
                      {s.role}
                    </span>
                  ))}
                </div>
                <p>{draft.attribution}</p>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={draft.ownershipConfirmed}
                    onChange={(e) =>
                      update({ ownershipConfirmed: e.target.checked })
                    }
                  />
                  I own this work or have permission to publish it, including
                  its media and attributed blueprint.
                </label>
                <p className="notice">
                  {isSupabase
                    ? "Publication is reviewed before public discovery. Verification is a separate process."
                    : "Demo publication stays in this browser and is clearly labelled. No public server record is created."}
                </p>
              </>
            )}
            <div className="publish-footer">
              <button className="button light" onClick={() => void saveNow()}>
                Save draft
              </button>
              <div className="row">
                <button
                  className="button light"
                  disabled={step === 0}
                  onClick={() => {
                    setErrors([]);
                    setStep(step - 1);
                  }}
                >
                  Back
                </button>
                {step < steps.length - 1 ? (
                  <button
                    className="button dark"
                    onClick={() => {
                      setErrors([]);
                      setStep(step + 1);
                    }}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    className="button dark"
                    disabled={busy}
                    onClick={() => void publish()}
                  >
                    {busy
                      ? "Publishing…"
                      : isSupabase
                        ? "Submit for review"
                        : "Publish demo build"}
                  </button>
                )}
              </div>
            </div>
          </div>
          <Link className="text-link" to={"/builds/" + draft.slug}>
            Open saved page preview →
          </Link>
        </section>
      </div>
    </>
  );
}
