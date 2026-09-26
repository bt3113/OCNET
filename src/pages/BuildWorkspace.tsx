import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus, ArrowRight, ShieldCheck } from "lucide-react";
import { useActions, useRecords, useUI } from "../state";
import { isSupabase } from "../data/repository";
import { demoPersonas } from "../data/identity";
import {
  completeness,
  isPublicBuild,
  safeUrl,
  slugify,
} from "../data/build-domain";
import type { CreatorProfile } from "../data/build-model";
import { PageHeading, WorkspaceNotice } from "../components/layout";
import {
  Badge,
  ButtonLink,
  DataTable,
  EmptyState,
  ErrorState,
  Modal,
  Skeleton,
} from "../components/ui";
import { BuildCard, SafeLink } from "../components/builds/cards";
import { SupplyGaps } from "../components/SupplyGaps";
export default function BuildWorkspace() {
  const [area, section = "overview"] = useLocation()
    .pathname.split("/")
    .filter(Boolean);
  const { userId, userName, roles, setPersona, notify } = useUI();
  const actions = useActions();
  const {
    data: builds = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("builds");
  const { data: creators = [] } = useRecords("creator_profiles");
  const { data: offers = [] } = useRecords("build_offers");
  const { data: products = [] } = useRecords("products");
  const { data: providers = [] } = useRecords("providers");
  const { data: reports = [] } = useRecords("reports");
  const { data: claims = [] } = useRecords("provider_claims");
  const { data: audits = [] } = useRecords("audit_events");
  const { data: comments = [] } = useRecords("build_comments");
  const { data: saves = [] } = useRecords("saved_items");
  const { data: forks = [] } = useRecords("build_forks");
  const { data: follows = [] } = useRecords("creator_follows");
  const { data: threads = [] } = useRecords("message_threads");
  const { data: events = [] } = useRecords("marketplace_events");
  const { data: members = [] } = useRecords("organization_memberships");
  const [confirm, setConfirm] = useState<{ id: string; action: string } | null>(
    null,
  );
  const [providerId, setProviderId] = useState("");
  const [evidence, setEvidence] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const creator = creators.find((c) => c.ownerId === userId);
  const mine = builds.filter(
    (b) =>
      b.ownerId === userId ||
      members.some(
        (m) => m.userId === userId && m.organizationId === b.organizationId,
      ),
  );
  const admin = roles.includes("admin");
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;
  if (!userId)
    return (
      <EmptyState
        title="Sign in to open your workspace"
        to="/sign-in"
        action="Sign in"
      />
    );
  async function audit(entityId: string, entityType: string, action: string) {
    if (!isSupabase)
      await actions.save("audit_events", {
        id: crypto.randomUUID(),
        name: action,
        entityId,
        entityType,
        action,
        actorId: userId,
        at: new Date().toISOString(),
        provenance: "demo",
      });
  }
  if (area === "admin") {
    return (
      <>
        <WorkspaceNotice />
        <PageHeading
          eyebrow="MARKETPLACE OPERATIONS"
          title={section.charAt(0).toUpperCase() + section.slice(1)}
          description="Review evidence, attribution and safety. All important decisions are recorded."
        />
        {!admin ? (
          <div className="card">
            <h2>Moderator access required</h2>
            <p>Administrative capabilities come from trusted roles.</p>
            {!isSupabase && (
              <button
                className="button dark"
                onClick={() => setPersona("demo-admin")}
              >
                Explore as demo moderator
              </button>
            )}
          </div>
        ) : (
          <>
            {section === "builds" ? (
              <>
                <label>
                  Moderation status
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {["all", "pending", "approved", "flagged", "rejected"].map(
                      (s) => (
                        <option key={s}>{s}</option>
                      ),
                    )}
                  </select>
                </label>
                <DataTable
                  headings={[
                    "Build",
                    "Evidence & sources",
                    "Status",
                    "Actions",
                  ]}
                  rows={builds
                    .filter(
                      (b) =>
                        statusFilter === "all" || b.moderation === statusFilter,
                    )
                    .map((b) => [
                      <Link to={"/builds/" + b.slug}>{b.name}</Link>,
                      <>
                        <Badge>{b.provenance}</Badge>
                        {b.sources.map((s) => (
                          <SafeLink key={s.id} url={s.url}>
                            {s.label} ↗
                          </SafeLink>
                        ))}
                        <p>{b.attribution}</p>
                      </>,
                      <>
                        {b.visibility} · {b.moderation} · {b.verification}
                      </>,
                      <div className="row wrap">
                        <button
                          className="button light"
                          onClick={() =>
                            setConfirm({ id: b.id, action: "approve" })
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="button light"
                          onClick={() =>
                            setConfirm({ id: b.id, action: "hide" })
                          }
                        >
                          Hide
                        </button>
                        <button
                          className="button light"
                          onClick={() =>
                            setConfirm({ id: b.id, action: "verify" })
                          }
                        >
                          Verify evidence
                        </button>
                      </div>,
                    ])}
                />
                <h2 className="subheading">Questions awaiting review</h2>
                <DataTable
                  headings={["Question", "Build", "Status", "Review"]}
                  rows={comments.map((c) => [
                    c.body,
                    c.buildId,
                    c.status,
                    <div className="row">
                      <button
                        className="button light"
                        onClick={async () => {
                          await actions.save("build_comments", {
                            ...c,
                            status: "approved",
                          });
                          await audit(c.id, "build_comments", "approve");
                        }}
                      >
                        Approve question
                      </button>
                      <button
                        className="button light"
                        onClick={async () => {
                          await actions.save("build_comments", {
                            ...c,
                            status: "rejected",
                          });
                          await audit(c.id, "build_comments", "reject");
                        }}
                      >
                        Reject
                      </button>
                    </div>,
                  ])}
                />
              </>
            ) : section === "creators" ? (
              <DataTable
                headings={["Creator", "Provenance", "Verification", "Review"]}
                rows={creators.map((c) => [
                  <Link to={"/solution-providers/" + c.slug}>{c.name}</Link>,
                  c.provenance,
                  c.verification,
                  <button
                    className="button light"
                    onClick={async () => {
                      await actions.save("creator_profiles", {
                        ...c,
                        verification:
                          c.verification === "verified"
                            ? "unverified"
                            : "verified",
                      });
                      await audit(
                        c.id,
                        "creator_profiles",
                        "verification reviewed",
                      );
                      notify("Profile verification updated");
                    }}
                  >
                    Toggle verification
                  </button>,
                ])}
              />
            ) : section === "offers" ? (
              <DataTable
                headings={[
                  "Offer",
                  "Build",
                  "External link",
                  "State",
                  "Review",
                ]}
                rows={offers.map((o) => [
                  o.name,
                  o.buildId,
                  <SafeLink url={o.externalUrl}>
                    {o.externalUrl || "Contact / demo"}
                  </SafeLink>,
                  o.moderation,
                  <div className="row">
                    <button
                      className="button light"
                      onClick={async () => {
                        await actions.save("build_offers", {
                          ...o,
                          moderation: "approved",
                        });
                        await audit(o.id, "build_offers", "approve");
                      }}
                    >
                      Approve offer
                    </button>
                    <button
                      className="button light"
                      onClick={async () => {
                        await actions.save("build_offers", {
                          ...o,
                          moderation: "rejected",
                          active: false,
                        });
                        await audit(o.id, "build_offers", "reject");
                      }}
                    >
                      Reject offer
                    </button>
                  </div>,
                ])}
              />
            ) : section === "reports" ? (
              <>
                {reports.length ? (
                  <DataTable
                    headings={[
                      "Build",
                      "Reason",
                      "Evidence",
                      "State",
                      "Actions",
                    ]}
                    rows={reports.map((r) => [
                      r.name,
                      r.reason,
                      r.details,
                      r.status,
                      <button
                        className="button light"
                        onClick={async () => {
                          await actions.save("reports", {
                            ...r,
                            status: "resolved",
                          });
                          await audit(r.id, "reports", "resolve");
                          notify("Report resolved");
                        }}
                      >
                        Resolve report
                      </button>,
                    ])}
                  />
                ) : (
                  <EmptyState
                    title="No reports awaiting review"
                    description="Build reports appear here with private evidence and attribution context."
                    to="/admin/builds"
                    action="Review builds"
                  />
                )}
              </>
            ) : section === "claims" ? (
              <>
                {claims.length ? (
                  <DataTable
                    headings={[
                      "Provider",
                      "Claim evidence",
                      "Status",
                      "Review",
                    ]}
                    rows={claims.map((c) => [
                      providers.find((p) => p.id === c.providerId)?.name,
                      c.evidence,
                      c.status,
                      <div className="row">
                        <button
                          className="button light"
                          onClick={async () => {
                            await actions.save("provider_claims", {
                              ...c,
                              status: "approved",
                            });
                            await audit(
                              c.id,
                              "provider_claims",
                              "approve claim",
                            );
                            notify(
                              "Claim reviewed. Ownership grants require a separate trusted membership change.",
                            );
                          }}
                        >
                          Approve claim
                        </button>
                        <button
                          className="button light"
                          onClick={async () => {
                            await actions.save("provider_claims", {
                              ...c,
                              status: "rejected",
                            });
                            await audit(
                              c.id,
                              "provider_claims",
                              "reject claim",
                            );
                          }}
                        >
                          Reject claim
                        </button>
                      </div>,
                    ])}
                  />
                ) : (
                  <EmptyState
                    title="No ownership claims"
                    description="Claimants can submit supporting evidence from their provider workspace."
                    to="/provider/claims"
                    action="View claim workflow"
                  />
                )}
              </>
            ) : null}
            <h2 className="subheading">Moderation audit trail</h2>
            <div className="card">
              {audits.length ? (
                audits
                  .slice()
                  .reverse()
                  .slice(0, 15)
                  .map((a) => (
                    <p key={a.id}>
                      <strong>{a.action}</strong> · {a.entityType} ·{" "}
                      {a.entityId}
                      <small>
                        {new Date(a.at).toLocaleString()} · {a.actorId}
                      </small>
                    </p>
                  ))
              ) : (
                <p>Moderation actions will be recorded here.</p>
              )}
            </div>
            <Modal
              open={!!confirm}
              onClose={() => setConfirm(null)}
              title="Record moderation decision"
              description="Approval, hiding and verification are distinct decisions. Review the linked evidence first."
            >
              <p>
                {confirm?.action === "verify"
                  ? "Verify only after reviewing independent evidence. Demo verification remains labelled demo."
                  : confirm?.action === "hide"
                    ? "This removes the build from public discovery. The creator retains their record."
                    : "This approves publication, without claiming independent verification."}
              </p>
              <button
                className="button dark"
                onClick={async () => {
                  const b = builds.find((b) => b.id === confirm?.id);
                  if (!b || !confirm) return;
                  await actions.save("builds", {
                    ...b,
                    ...(confirm.action === "hide"
                      ? {
                          visibility: "private" as const,
                          moderation: "flagged" as const,
                        }
                      : confirm.action === "verify"
                        ? { verification: "verified" as const }
                        : {
                            moderation: "approved" as const,
                            publication: "published" as const,
                            visibility: "public" as const,
                          }),
                  });
                  await audit(b.id, "builds", confirm.action);
                  setConfirm(null);
                  notify("Moderation decision recorded");
                }}
              >
                Confirm decision
              </button>
            </Modal>
          </>
        )}
      </>
    );
  }
  if (area === "provider" && section === "claims")
    return (
      <>
        <WorkspaceNotice />
        <PageHeading
          eyebrow="PROVIDER WORKSPACE"
          title="Claim your provider profile"
          description="Submit evidence of your authority to represent an organization."
        />
        <form
          className="card form-card"
          onSubmit={async (e) => {
            e.preventDefault();
            await actions.save("provider_claims", {
              id: crypto.randomUUID(),
              name: "Provider ownership claim",
              providerId,
              ownerId: userId,
              evidence,
              status: "pending",
              provenance: isSupabase ? "vendor supplied" : "demo",
            });
            setEvidence("");
            notify("Claim submitted for review");
          }}
        >
          <label>
            Provider
            <select
              required
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              <option value="">Choose provider</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Evidence of representation
            <textarea
              required
              minLength={20}
              maxLength={3000}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Describe your role and provide a public company reference. Do not submit identity documents in the demo."
            />
          </label>
          <button className="button dark">Submit ownership claim</button>
          <p>
            Approval does not grant the right to remove independent builds.
            Corrections go through moderation.
          </p>
        </form>
        <DataTable
          headings={["Claim", "Status", "Submitted evidence"]}
          rows={claims
            .filter((c) => c.ownerId === userId)
            .map((c) => [
              providers.find((p) => p.id === c.providerId)?.name,
              c.status,
              c.evidence,
            ])}
        />
      </>
    );
  if (area === "provider" && section === "builds") {
    const matching = builds.filter(
      (b) =>
        isPublicBuild(b) &&
        (!providerId ||
          b.stack.some((s) =>
            products.some(
              (p) => p.id === s.productId && p.providerId === providerId,
            ),
          )),
    );
    return (
      <>
        <PageHeading
          eyebrow="IMPLEMENTATION CONTEXT"
          title="Your technologies in builds"
          description="Independent work gives suppliers real context. Usage is derived from recorded stack relationships."
        />
        <label>
          Provider catalogue
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
          >
            <option value="">Explore all public providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <p>
          {matching.length} public{" "}
          {matching.every((b) => b.provenance === "demo") ? "demo " : ""}builds
          · no deployment endorsement implied
        </p>
        <div className="build-grid">
          {matching.map((b) => (
            <BuildCard key={b.id} build={b} />
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <WorkspaceNotice />
      <PageHeading
        eyebrow="SOLUTION PROVIDER STUDIO"
        title={
          section === "overview"
            ? `Make your work useful, ${userName.split(" ")[0]}.`
            : section === "builds"
              ? "Your builds"
              : section === "profile"
                ? "Your creator profile"
                : section === "offers"
                  ? "Offers attached to your work"
                  : section === "analytics"
                    ? "Your work, in context"
                    : "Creator settings"
        }
        description="Share the outcome. Explain the stack. Let your work open the next conversation."
        action={
          <ButtonLink to="/creator/builds/new">
            <Plus size={17} />
            Publish a Build
          </ButtonLink>
        }
      />
      {section === "overview" ? (
        <>
          <div className="grid four">
            {[
              ["Published builds", mine.filter(isPublicBuild).length],
              [
                "Private / draft builds",
                mine.filter((b) => !isPublicBuild(b)).length,
              ],
              [
                "Saved build records",
                saves.filter((s) => mine.some((b) => b.id === s.entityId))
                  .length,
              ],
              [
                "Creator enquiries",
                threads.filter(
                  (t) =>
                    t.participantIds.includes(userId) &&
                    t.name.includes("Creator enquiry"),
                ).length,
              ],
            ].map(([name, value]) => (
              <div className="card metric-card" key={String(name)}>
                <small>{name}</small>
                <strong>{value}</strong>
                <Badge>
                  {isSupabase ? "Recorded activity" : "Local demo records"}
                </Badge>
              </div>
            ))}
          </div>
          <div className="creator-dashboard-grid">
            <div className="card">
              <h2>Give your next build a home.</h2>
              <p>
                Start with an import, then explain the decisions a README can’t
                show on its own.
              </p>
              <ButtonLink to="/creator/builds/new">
                Create a build <ArrowRight size={17} />
              </ButtonLink>
            </div>
            <div className="card">
              <h2>Your creator profile</h2>
              <p>
                {creator?.headline ||
                  "Introduce yourself and connect your work to your expertise."}
              </p>
              <ButtonLink to="/creator/profile" variant="light">
                Edit profile
              </ButtonLink>
              {creator && (
                <Link className="text-link" to={"/solution-providers/" + creator.slug}>
                  View public profile →
                </Link>
              )}
            </div>
          </div>
          <h2 className="subheading">Continue your work</h2>
          {buildRows()}
          <SupplyGaps creatorId={creator?.id} />
        </>
      ) : section === "builds" ? (
        buildRows()
      ) : section === "profile" ? (
        <CreatorForm key={creator?.id || "new-profile"} existing={creator} />
      ) : section === "offers" ? (
        <>
          <p className="notice">
            No payments are collected. Contact, external-checkout disclosure and
            demo previews are supported.
          </p>
          <DataTable
            headings={["Offer", "Build", "Pricing", "Status", "Manage"]}
            rows={offers
              .filter((o) => o.ownerId === userId)
              .map((o) => [
                o.name,
                builds.find((b) => b.id === o.buildId)?.name,
                o.pricingModel,
                o.active ? "Active · " + o.moderation : "Paused",
                <div className="row wrap">
                  <Link
                    className="button light"
                    to={"/creator/builds/" + o.buildId + "/edit?stage=offers"}
                  >
                    Edit offer
                  </Link>
                  <button
                    className="button light"
                    onClick={() =>
                      void actions.save("build_offers", {
                        ...o,
                        active: !o.active,
                      })
                    }
                  >
                    {o.active ? "Pause" : "Activate"}
                  </button>
                </div>,
              ])}
          />
          {!offers.some((o) => o.ownerId === userId) && (
            <EmptyState
              title="Your work comes first"
              description="Create a build, then attach a guide, asset or implementation offer."
              to="/creator/builds/new"
              action="Publish a build"
            />
          )}
        </>
      ) : section === "analytics" ? (
        <>
          <p className="notice">
            {isSupabase
              ? "Counts come from recorded events and relationships."
              : "Local demo activity only. These are not audience or commercial performance claims."}{" "}
            No fabricated profile views.
          </p>
          <DataTable
            headings={[
              "Build",
              "Completeness",
              "Saves",
              "Remixes",
              "Recorded events",
            ]}
            rows={mine.map((b) => [
              b.name,
              completeness(b) + "%",
              saves.filter((s) => s.entityId === b.id).length,
              forks.filter((f) => f.parentBuildId === b.id).length,
              events.filter((e) => e.entityId === b.id).length,
            ])}
          />
          <div className="card">
            <h2>Followers</h2>
            <p>
              {follows.filter((f) => f.creatorId === creator?.id).length}{" "}
              recorded follows
            </p>
            <h3>Privacy</h3>
            <p>
              Event records contain an action, entity and day. No raw search
              queries, full IPs or device fingerprints are stored.
            </p>
          </div>
        </>
      ) : (
        <div className="card form-card">
          <h2>One account, multiple capabilities</h2>
          <p>
            Your active roles: {roles.join(", ") || "Signed-in member"}. Buying
            and creating can coexist with organization membership.
          </p>
          {!isSupabase && (
            <label>
              Demo persona
              <select
                value={userId}
                onChange={(e) => setPersona(e.target.value)}
              >
                {Object.entries(demoPersonas).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.name} · {p.roles.join(", ")}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ButtonLink to="/app/settings" variant="light">
            Privacy, preferences and demo data
          </ButtonLink>
          <p>
            Organization permissions and admin roles are assigned through
            trusted server membership. Profile edits never grant elevated
            permissions.
          </p>
        </div>
      )}
    </>
  );
  function buildRows() {
    return mine.length ? (
      <DataTable
        headings={["Build", "Publication", "Completeness", "Actions"]}
        rows={mine.map((b) => [
          <Link to={"/builds/" + b.slug}>{b.name}</Link>,
          <Badge>
            {b.visibility} · {b.moderation}
          </Badge>,
          completeness(b) + "%",
          <div className="row wrap">
            <Link
              className="button light"
              to={"/creator/builds/" + b.id + "/edit"}
            >
              Edit build
            </Link>
            <button
              className="button light"
              onClick={() =>
                void actions.save("builds", {
                  ...b,
                  visibility:
                    b.visibility === "archived" ? "draft" : "archived",
                  publication: "draft",
                })
              }
            >
              {b.visibility === "archived" ? "Restore draft" : "Archive"}
            </button>
          </div>,
        ])}
      />
    ) : (
      <EmptyState
        title="Your first build starts here"
        description="Publish a useful implementation with clear provenance and a connected stack."
        to="/creator/builds/new"
        action="Create your first build"
      />
    );
  }
}
function CreatorForm({ existing }: { existing?: CreatorProfile }) {
  const { userId, notify } = useUI();
  const actions = useActions();
  const { data: products = [] } = useRecords("products");
  const { data: cases = [] } = useRecords("use_cases");
  const [p, setP] = useState<CreatorProfile>(
    existing ?? {
      id: crypto.randomUUID(),
      slug: "",
      ownerId: userId,
      name: "",
      headline: "",
      bio: "",
      location: "",
      website: "",
      github: "",
      expertise: [],
      technologyIds: [],
      useCaseIds: [],
      available: true,
      kind: "individual",
      verification: "unverified",
      color: "sand",
      provenance: isSupabase ? "creator supplied" : "demo",
    },
  );
  return (
    <form
      className="card form-card"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          (p.website && !safeUrl(p.website)) ||
          (p.github && !safeUrl(p.github))
        ) {
          notify("Use valid HTTP(S) profile links.");
          return;
        }
        try {
          await actions.save("creator_profiles", {
            ...p,
            slug: existing?.slug || slugify(p.name) + "-" + p.id.slice(0, 6),
          });
          notify("Creator profile saved");
        } catch {
          /* handled */
        }
      }}
    >
      <Badge>{p.provenance}</Badge>
      {(
        ["name", "headline", "bio", "location", "website", "github"] as const
      ).map((key) => (
        <label key={key}>
          {key === "github"
            ? "GitHub URL"
            : key.charAt(0).toUpperCase() + key.slice(1)}
          {key === "bio" ? (
            <textarea
              required
              minLength={20}
              maxLength={5000}
              value={p[key]}
              onChange={(e) => setP({ ...p, [key]: e.target.value })}
            />
          ) : (
            <input
              required={["name", "headline"].includes(key)}
              maxLength={300}
              value={p[key]}
              onChange={(e) => setP({ ...p, [key]: e.target.value })}
            />
          )}
        </label>
      ))}
      <label>
        Profile type
        <select
          value={p.kind}
          onChange={(e) =>
            setP({ ...p, kind: e.target.value as CreatorProfile["kind"] })
          }
        >
          <option value="individual">Individual</option>
          <option value="studio">Studio</option>
          <option value="company">Company representative</option>
        </select>
      </label>
      <label>
        Expertise (comma separated)
        <input
          value={p.expertise.join(",")}
          onChange={(e) => setP({ ...p, expertise: e.target.value.split(",") })}
        />
      </label>
      <label>
        Technologies
        <select
          multiple
          value={p.technologyIds}
          onChange={(e) =>
            setP({
              ...p,
              technologyIds: [...e.target.selectedOptions].map((o) => o.value),
            })
          }
        >
          {products.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Use cases
        <select
          multiple
          value={p.useCaseIds}
          onChange={(e) =>
            setP({
              ...p,
              useCaseIds: [...e.target.selectedOptions].map((o) => o.value),
            })
          }
        >
          {cases.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <label className="check-field">
        <input
          type="checkbox"
          checked={p.available}
          onChange={(e) => setP({ ...p, available: e.target.checked })}
        />
        Open to implementation enquiries
      </label>
      <div className="notice">
        <ShieldCheck size={18} />
        Verification is reviewed separately. No ratings or client claims are
        created by this form.
      </div>
      <button className="button dark">Save creator profile</button>
    </form>
  );
}
