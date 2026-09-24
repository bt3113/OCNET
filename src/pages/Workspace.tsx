import { BuildCard, CollectionPicker } from "../components/builds/cards";
import { MediaManager } from "../components/media";
import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  Plus,
  Send,
  Check,
  Download,
  Trash2,
  Folder,
  Bookmark,
  MessageSquare,
  ChartNoAxesColumn,
  ShieldCheck,
} from "lucide-react";
import { useActions, useRecords, useUI } from "../state";
import { isSupabase } from "../data/repository";
import type { Table, WorkspaceRecord } from "../data/model";
import { PageHeading, WorkspaceNotice } from "../components/layout";
import {
  Badge,
  ButtonLink,
  EmptyState,
  TechnologyCard,
  ProviderCard,
  UseCaseCard,
  DataTable,
  Modal,
  Logo,
  Tabs,
  ErrorState,
  Skeleton,
} from "../components/ui";
import { ProjectWizard, SimpleForm } from "../components/forms";
export default function Workspace() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);
  const area = parts[0];
  const section = parts[1] || "overview";
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const actions = useActions();
  const { notify, userId, roles } = useUI();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<WorkspaceRecord | null>(null);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("projects");
  const { data: builds = [] } = useRecords("builds");
  const { data: products = [] } = useRecords("products");
  const { data: allSaved = [] } = useRecords("saved_items");
  const saved = allSaved.filter((s) => !s.ownerId || s.ownerId === userId);
  const { data: providers = [] } = useRecords("providers");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: proposals = [] } = useRecords("proposals");
  const { data: notifications = [] } = useRecords("notifications");
  const { data: threads = [] } = useRecords("message_threads");
  const { data: messages = [] } = useRecords("messages");
  const { data: settings = [] } = useRecords("settings");
  const { data: verification = [] } = useRecords("verification_records");
  const { data: reviews = [] } = useRecords("reviews");
  const { data: team = [] } = useRecords("team");
  const { data: leads = [] } = useRecords("leads");
  const { data: organizations = [] } = useRecords("organizations");
  const { data: users = [] } = useRecords("users");
  const { data: categories = [] } = useRecords("categories");
  const { data: stacks = [] } = useRecords("solution_stacks");
  const { data: articles = [] } = useRecords("articles");
  const title =
    section === "overview"
      ? area === "app"
        ? "Your next idea starts here"
        : area === "provider"
          ? "Your provider workspace"
          : "Marketplace operations"
      : section === "saved"
        ? "Your saved discoveries"
        : section === "projects"
          ? "Your projects"
          : section === "company"
            ? "Company profile"
            : section.charAt(0).toUpperCase() +
              section.slice(1).replaceAll("-", " ");
  async function updateStatus(
    table:
      "projects" | "proposals" | "leads" | "reviews" | "verification_records",
    record: unknown,
    status: string,
  ) {
    await actions.save(table, {
      ...(record as WorkspaceRecord),
      status,
    } as never);
    notify("Status updated");
  }
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;
  if (isSupabase && area === "admin" && !roles.includes("admin"))
    return (
      <EmptyState
        title="Administrator access required"
        description="This workspace is restricted to authorized administrators."
        to="/app"
        action="Go to buyer workspace"
      />
    );
  if (
    isSupabase &&
    area === "provider" &&
    !roles.some((r) =>
      ["provider", "integrator", "consultant", "admin"].includes(r),
    )
  )
    return (
      <EmptyState
        title="Provider access required"
        description="Sign in with a provider organization account to manage listings."
        to="/sign-in"
        action="Sign in"
      />
    );
  if (section === "projects" && parts[2] === "new")
    return (
      <>
        <PageHeading
          eyebrow="POST A PROJECT"
          title="Let’s build something that matters."
          description="A good brief is the first step to finding the right technology and partners."
        />
        <ProjectWizard />
      </>
    );
  if (section === "projects" && id) {
    const p = projects.find((p) => p.id === id);
    if (!p) return <EmptyState title="Project not found" />;
    return (
      <>
        <WorkspaceNotice />
        <PageHeading
          eyebrow="PROJECT WORKSPACE"
          title={p.name}
          description={p.description}
          action={<Badge>{p.status}</Badge>}
        />
        <Tabs
          items={["Overview", "Proposals", "Activity"]}
          value={tab === "All" ? "Overview" : tab}
          onChange={setTab}
        />
        {tab === "Proposals" ? (
          <div className="grid two">
            {proposals
              .filter((x) => x.projectId === id)
              .map((x) => (
                <article className="card prose" key={x.id}>
                  <Badge>{x.status}</Badge>
                  <h2>{x.name}</h2>
                  <p>{x.description}</p>
                  <p>{x.estimate}</p>
                  <div className="row wrap">
                    <button
                      className="button dark"
                      onClick={() =>
                        void updateStatus("proposals", x, "shortlisted")
                      }
                    >
                      Shortlist
                    </button>
                    <button
                      className="button light"
                      onClick={() =>
                        void updateStatus("proposals", x, "declined")
                      }
                    >
                      Decline
                    </button>
                  </div>
                </article>
              ))}
            {!proposals.some((x) => x.projectId === id) && (
              <EmptyState
                title="No proposals yet"
                description="Your project brief is ready to share with potential partners."
                to="/integrators"
                action="Find partners"
              />
            )}
          </div>
        ) : tab === "Activity" ? (
          <div className="card prose">
            <h2>Project activity</h2>
            <p>
              Project {p.status === "draft" ? "prepared" : "posted"} ·{" "}
              {p.createdAt
                ? new Date(p.createdAt).toLocaleDateString()
                : "Sample project"}
            </p>
            <p>Demo actions and messages are stored in your browser.</p>
            <ButtonLink to="/app/messages">Open messages</ButtonLink>
          </div>
        ) : (
          <div className="detail-columns">
            <SimpleForm
              title="Refine your brief"
              initial={{ name: p.name, description: p.description }}
              onSubmit={async (d) => {
                await actions.save("projects", { ...p, ...d });
                notify("Project updated");
              }}
            />
            <div className="card side-card">
              <h3>Project details</h3>
              <dl className="detail-list">
                <div>
                  <dt>Budget</dt>
                  <dd>{p.budget}</dd>
                </div>
                <div>
                  <dt>Timeline</dt>
                  <dd>{p.timeline}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{p.category}</dd>
                </div>
              </dl>
              <button
                className="button light"
                onClick={() =>
                  void updateStatus(
                    "projects",
                    p,
                    p.status === "closed" ? "open" : "closed",
                  )
                }
              >
                {p.status === "closed" ? "Reopen project" : "Close project"}
              </button>
              <ButtonLink to="/integrators">
                Find a partner
                <ArrowRight size={17} />
              </ButtonLink>
            </div>
          </div>
        )}
      </>
    );
  }
  if (section === "listings" && parts[2]) {
    const product = products.find((p) => p.id === id);
    return (
      <>
        <WorkspaceNotice />
        <PageHeading
          title={
            product ? "Edit " + product.name : "Create a technology listing"
          }
          description="Describe a capability accurately and include the evidence behind it."
        />
        <SimpleForm
          title="Listing details"
          initial={
            product
              ? { name: product.name, description: product.description }
              : undefined
          }
          submitLabel={product ? "Save listing" : "Create demo listing"}
          onSubmit={async (d) => {
            await actions.save("products", {
              ...product,
              ...d,
              id: product?.id ?? crypto.randomUUID(),
              slug:
                product?.slug ??
                d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              category: product?.category ?? "ai-software",
              providerId: product?.providerId ?? "demo-provider",
              capabilityIds: product?.capabilityIds ?? ["automation"],
              deployment: "Cloud",
              pricing: "Contact provider",
              integrations: [],
              color: "sand",
              initials: d.name.slice(0, 1),
              provenance: "demo",
            });
            notify("Listing saved");
            navigate("/provider/listings");
          }}
        />
      </>
    );
  }
  if (section === "messages") {
    const current =
      threads.find((t) => t.id === params.get("thread")) ?? threads[0];
    return (
      <>
        <WorkspaceNotice />
        <PageHeading
          title="Conversations that move ideas forward"
          description="Keep context, requirements, and next steps in one place."
        />
        <div className="messaging card">
          <aside aria-label="Conversations">
            {threads.map((t) => (
              <Link
                key={t.id}
                className={current?.id === t.id ? "active" : ""}
                to={"/" + area + "/messages?thread=" + t.id}
              >
                <Logo initials={t.name.slice(0, 1)} color="sand" />
                <span>
                  <strong>{t.name}</strong>
                  <small>Demo conversation</small>
                </span>
              </Link>
            ))}
          </aside>
          <section>
            {current ? (
              <>
                <div className="thread-heading">
                  <h2>{current.name}</h2>
                  <Badge>Demo thread</Badge>
                </div>
                <div
                  className="thread-messages"
                  role="log"
                  aria-label="Message history"
                >
                  {messages
                    .filter((m) => m.threadId === current.id)
                    .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
                    .map((m) => (
                      <div
                        key={m.id}
                        className={
                          "message " +
                          (m.senderId === "demo-user" ? "outgoing" : "")
                        }
                      >
                        <small>
                          {m.senderId === "demo-user" ? "You" : current.name}
                        </small>
                        <p>{m.body}</p>
                        <time>
                          {new Date(m.sentAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    ))}
                </div>
                <form
                  className="message-compose"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = e.currentTarget;
                    const body = String(new FormData(f).get("message")).trim();
                    if (!body) return;
                    void actions
                      .save("messages", {
                        id: crypto.randomUUID(),
                        name: "Message",
                        threadId: current.id,
                        senderId: userId,
                        body,
                        sentAt: new Date().toISOString(),
                        provenance: "demo",
                      })
                      .then(() => {
                        f.reset();
                        notify("Message saved in demo thread");
                      })
                      .catch(() => {});
                  }}
                >
                  <label className="sr-only" htmlFor="message">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    maxLength={5000}
                    placeholder="Write your message…"
                    rows={2}
                  />
                  <button className="button dark" aria-label="Send message">
                    <Send size={19} />
                  </button>
                </form>
              </>
            ) : (
              <EmptyState
                title="Start a useful conversation"
                description="Contact a provider from its profile to create an enquiry."
                to="/providers"
                action="Explore providers"
              />
            )}
          </section>
        </div>
      </>
    );
  }
  const adminMap: Record<string, Table> = {
    users: "users",
    providers: "providers",
    listings: "products",
    "use-cases": "use_cases",
    stacks: "solution_stacks",
    reviews: "reviews",
    projects: "projects",
    content: "articles",
    categories: "categories",
    verification: "verification_records",
    moderation: "reviews",
  };
  const collections: Partial<Record<Table, unknown[]>> = {
    users,
    providers,
    products,
    use_cases: cases,
    solution_stacks: stacks,
    reviews,
    projects,
    articles,
    categories,
    verification_records: verification,
    leads,
    proposals,
    team,
  };
  const table =
    area === "admin"
      ? adminMap[section]
      : section === "listings"
        ? "products"
        : section === "leads"
          ? "leads"
          : section === "proposals"
            ? "proposals"
            : section === "team"
              ? "team"
              : undefined;
  const records = (
    table ? (collections[table] ?? []) : []
  ) as WorkspaceRecord[];
  return (
    <>
      <WorkspaceNotice />
      <PageHeading
        eyebrow={
          area === "app"
            ? "YOUR WORKSPACE"
            : area === "provider"
              ? "PROVIDER WORKSPACE"
              : "ADMINISTRATION"
        }
        title={title}
        description={
          section === "overview"
            ? "Discover, shortlist, and move your ideas forward."
            : area === "admin"
              ? "Review marketplace records and keep information useful, accurate, and accountable."
              : "Your work, organized around what comes next."
        }
        action={
          section === "projects" ? (
            <ButtonLink to="/app/projects/new">
              <Plus size={17} />
              New project
            </ButtonLink>
          ) : section === "listings" ? (
            <ButtonLink to="/provider/listings/new">
              <Plus size={17} />
              New listing
            </ButtonLink>
          ) : undefined
        }
      />
      {section === "overview" ? (
        <>
          <div className="stats-grid">
            {[
              [
                area === "app" ? "Saved discoveries" : "Catalogue listings",
                area === "app" ? saved.length : products.length,
                Bookmark,
                area === "app" ? "/app/saved" : "/provider/listings",
              ],
              [
                "Active projects",
                projects.filter((p) => p.status !== "closed").length,
                Folder,
                "/app/projects",
              ],
              [
                "Conversations",
                threads.length,
                MessageSquare,
                "/" + (area === "admin" ? "app" : area) + "/messages",
              ],
              [
                "Unread updates",
                notifications.filter((n) => !n.read).length,
                ChartNoAxesColumn,
                "/app/notifications",
              ],
            ].map(([label, value, I, path]) => {
              const Icon = I as typeof Folder;
              return (
                <Link
                  to={path as string}
                  className="card stat-card"
                  key={String(label)}
                >
                  <Icon size={22} />
                  <strong>{String(value)}</strong>
                  <span>{String(label)}</span>
                  <ArrowRight size={17} />
                </Link>
              );
            })}
          </div>
          <div className="workspace-welcome">
            <div>
              <Badge>YOUR NEXT STEP</Badge>
              <h2>
                {area === "app"
                  ? "A clear brief opens better conversations."
                  : area === "provider"
                    ? "Help the right buyers find you."
                    : "A trustworthy marketplace starts with evidence."}
              </h2>
              <p>
                {area === "app"
                  ? "Describe your outcome, explore the capabilities you need, and find a partner to bring it to life."
                  : "Keep profiles current, review evidence, and respond to opportunities with useful context."}
              </p>
              <ButtonLink
                to={
                  area === "app"
                    ? "/app/projects/new"
                    : area === "provider"
                      ? "/provider/company"
                      : "/admin/moderation"
                }
              >
                {area === "app"
                  ? "Create a project brief"
                  : area === "provider"
                    ? "Complete your profile"
                    : "Open moderation queue"}
                <ArrowRight size={17} />
              </ButtonLink>
            </div>
            <div className="welcome-illustration">
              <Folder size={76} strokeWidth={1} />
              <span>Ideas → possibilities</span>
            </div>
          </div>
          <h2 className="subheading">Continue exploring</h2>
          <div className="usecase-grid">
            {cases.slice(0, 3).map((c) => (
              <UseCaseCard item={c} key={c.id} />
            ))}
          </div>
        </>
      ) : section === "saved" ? (
        <>
          <ButtonLink to="/collections" variant="light">
            Manage private collections
          </ButtonLink>
          <div className="build-grid">
            {builds
              .filter((b) => saved.some((s) => s.entityId === b.id))
              .map((b) => (
                <BuildCard key={b.id} build={b} />
              ))}
          </div>
          {saved.map((s) => (
            <div className="collection-shortcut" key={s.id}>
              <span>{s.name}</span>
              <CollectionPicker
                entityId={s.entityId}
                entityType={s.entityType}
                name={s.name}
              />
            </div>
          ))}
          {saved.length ? (
            <>
              <div className="grid three">
                {products
                  .filter((p) => saved.some((s) => s.entityId === p.id))
                  .map((p) => (
                    <TechnologyCard product={p} key={p.id} />
                  ))}
              </div>
              <div className="grid two">
                {providers
                  .filter((p) => saved.some((s) => s.entityId === p.id))
                  .map((p) => (
                    <ProviderCard provider={p} key={p.id} />
                  ))}
              </div>
              {saved
                .filter(
                  (s) =>
                    !products.some((p) => p.id === s.entityId) &&
                    !providers.some((p) => p.id === s.entityId) &&
                    !builds.some((b) => b.id === s.entityId),
                )
                .map((s) => (
                  <div className="card saved-row" key={s.id}>
                    <Link
                      to={
                        "/" +
                        (s.entityType === "products"
                          ? "technologies"
                          : s.entityType) +
                        "/" +
                        s.entityId
                      }
                    >
                      {s.name}
                      <ArrowRight size={17} />
                    </Link>
                    <button
                      className="icon-button"
                      aria-label={"Remove " + s.name}
                      onClick={() => void actions.remove("saved_items", s.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
            </>
          ) : (
            <EmptyState
              title="A home for your next possibilities"
              description="Save technologies, use cases, and partners as you explore. Your shortlist will be here."
            />
          )}
        </>
      ) : section === "projects" && area !== "admin" ? (
        <div className="grid two">
          {projects.map((p) => (
            <Link
              className="card project-card"
              key={p.id}
              to={"/app/projects/" + p.id}
            >
              <div className="row between">
                <span className="category-icon sand">
                  <Folder />
                </span>
                <Badge>{p.status}</Badge>
              </div>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <div className="card-foot">
                <span>{p.timeline}</span>
                <ArrowRight size={20} />
              </div>
            </Link>
          ))}
        </div>
      ) : section === "notifications" ? (
        <div className="notification-list">
          <button
            className="button light"
            onClick={() =>
              void Promise.all(
                notifications.map((n) =>
                  actions.save("notifications", { ...n, read: true }),
                ),
              ).then(() => notify("All notifications marked read"))
            }
          >
            <Check size={16} />
            Mark all as read
          </button>
          {notifications.map((n) => (
            <article
              className={"card notification " + (!n.read ? "unread" : "")}
              key={n.id}
            >
              <span className="category-icon sand">
                <ShieldCheck />
              </span>
              <div>
                <h2>{n.name}</h2>
                <p>{n.body}</p>
                <Link to={n.href}>
                  View details
                  <ArrowRight size={15} />
                </Link>
              </div>
              <button
                className="icon-button"
                aria-label={
                  "Mark " + n.name + " as " + (n.read ? "unread" : "read")
                }
                onClick={() =>
                  void actions.save("notifications", { ...n, read: !n.read })
                }
              >
                <Check size={18} />
              </button>
            </article>
          ))}
        </div>
      ) : section === "profile" || section === "company" ? (
        <SimpleForm
          key={section}
          title={
            section === "company" ? "Tell your company’s story" : "Your profile"
          }
          initial={{
            name:
              (section === "company"
                ? organizations[0]?.name
                : settings.find((s) => s.id === "profile")?.name) ??
              (section === "company" ? "Your company" : "Alex Chen"),
            description:
              (section === "company"
                ? organizations[0]?.description
                : settings.find((s) => s.id === "profile")?.description) ?? "",
          }}
          onSubmit={async (d) => {
            if (section === "company")
              await actions.save("organizations", {
                id: organizations[0]?.id ?? "my-company",
                ...d,
                provenance: "demo",
              });
            else
              await actions.save("settings", {
                id: "profile",
                ...d,
                provenance: "demo",
              });
            notify("Profile saved");
          }}
        />
      ) : section === "settings" ? (
        <SettingsPanel />
      ) : section === "analytics" ? (
        <>
          <div className="stats-grid">
            {[
              ["Enquiries in this demo", leads.length],
              ["Listed technologies", products.length],
              ["Proposals drafted", proposals.length],
              ["Conversations", threads.length],
            ].map(([label, value]) => (
              <div className="card stat-card" key={label}>
                <ChartNoAxesColumn />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="card prose">
            <h2>Your activity overview</h2>
            <p>
              These counts reflect records in your current demo workspace.
              Website traffic, conversion tracking, and customer attribution are
              not connected.
            </p>
            {[
              ["Enquiries", leads.length],
              ["Proposals", proposals.length],
              ["Messages", messages.length],
            ].map(([label, value]) => (
              <div className="metric-row" key={label}>
                <span>{label}</span>
                <meter
                  min="0"
                  max={Math.max(
                    5,
                    messages.length,
                    leads.length,
                    proposals.length,
                  )}
                  value={Number(value)}
                  aria-label={String(label)}
                />
                <strong>{value}</strong>
              </div>
            ))}
            <button
              className="button light"
              onClick={() =>
                download(
                  "oracnet-activity.json",
                  JSON.stringify(
                    {
                      leads: leads.length,
                      proposals: proposals.length,
                      messages: messages.length,
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              <Download size={17} />
              Export activity
            </button>
          </div>
        </>
      ) : section === "media" ? (
        <MediaManager />
      ) : section === "verification" && area !== "admin" ? (
        <>
          <div className="card prose">
            <span className="category-icon sand">
              <ShieldCheck />
            </span>
            <h2>Build trust with evidence</h2>
            <p>
              Submit your company identity, official website, and evidence
              references for review. A submission does not make a profile
              verified.
            </p>
            {verification.map((v) => (
              <div className="notice" key={v.id}>
                {v.name} · {v.status}
              </div>
            ))}
          </div>
          <SimpleForm
            title="Request verification"
            submitLabel="Submit for review"
            onSubmit={async (d) => {
              await actions.save("verification_records", {
                id: crypto.randomUUID(),
                name: d.name,
                organizationId: organizations[0]?.id ?? "my-company",
                evidence: d.description,
                status: "pending",
                provenance: "demo",
              });
              notify("Demo verification request submitted");
            }}
          />
        </>
      ) : section === "billing" ? (
        <div className="card billing-card">
          <Badge>DEMO PLAN</Badge>
          <h2>Explore without a payment method.</h2>
          <p>
            This prototype has no charges, subscriptions, or payment processing.
            You can try the complete discovery and workspace experience without
            entering financial information.
          </p>
          <ul>
            <li>Marketplace discovery and comparisons</li>
            <li>Company profile and sample listings</li>
            <li>Project, proposal, and messaging workflows</li>
          </ul>
          <ButtonLink to="/pricing" variant="light">
            View plan information
            <ArrowRight size={16} />
          </ButtonLink>
        </div>
      ) : table ? (
        <>
          <div className="table-toolbar">
            <label className="table-search">
              Search records
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name…"
              />
            </label>
            {section === "proposals" || section === "team" ? (
              <button className="button dark" onClick={() => setModal(true)}>
                <Plus size={17} />
                {section === "proposals" ? "Draft proposal" : "Add demo member"}
              </button>
            ) : null}
          </div>
          {records.length ? (
            <DataTable
              headings={["Name", "Source", "Status", "Actions"]}
              rows={records
                .filter((r) =>
                  r.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((r) => [
                  <strong>{r.name}</strong>,
                  <Badge>{r.provenance}</Badge>,
                  <span>{String(r.status ?? "Unverified")}</span>,
                  <div className="row wrap">
                    {table === "products" ? (
                      <Link
                        className="button light"
                        to={"/provider/listings/" + r.id}
                      >
                        Edit
                      </Link>
                    ) : ["reviews", "verification_records"].includes(table) ? (
                      <>
                        <button
                          className="button light"
                          onClick={() =>
                            void updateStatus(
                              table as "reviews",
                              r,
                              table === "reviews" ? "published" : "approved",
                            )
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="button light"
                          onClick={() =>
                            void updateStatus(table as "reviews", r, "rejected")
                          }
                        >
                          Reject
                        </button>
                      </>
                    ) : table === "leads" ? (
                      <button
                        className="button light"
                        onClick={() =>
                          void updateStatus(
                            "leads",
                            r,
                            r.status === "New" ? "Qualified" : "Closed",
                          )
                        }
                      >
                        Update status
                      </button>
                    ) : table === "proposals" ? (
                      <button
                        className="button light"
                        onClick={() =>
                          void updateStatus("proposals", r, "submitted")
                        }
                      >
                        Submit demo
                      </button>
                    ) : (
                      <button
                        className="button light"
                        onClick={() => setEditing(r)}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      className="icon-button"
                      aria-label={"Delete " + r.name}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Remove this " +
                              (isSupabase ? "record?" : "demo record?"),
                          )
                        )
                          void actions.remove(table, r.id);
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>,
                ])}
            />
          ) : (
            <EmptyState
              title="Your queue is clear"
              description="New records will appear here when submitted through the marketplace workflows."
              to={
                section === "reviews" || section === "moderation"
                  ? "/technologies"
                  : section === "verification"
                    ? "/provider/verification"
                    : "/explore"
              }
              action="Explore the marketplace"
            />
          )}
          <Modal
            open={!!editing}
            onClose={() => setEditing(null)}
            title={"Edit " + (editing?.name ?? "record")}
            description="Update the record. Verification and publication remain separate moderation decisions."
          >
            {editing && (
              <SimpleForm
                key={editing.id}
                title="Record details"
                initial={{
                  name: editing.name,
                  description: String(editing.description ?? ""),
                }}
                onSubmit={async (d) => {
                  await actions.save(table, { ...editing, ...d } as never);
                  notify("Record updated");
                  setEditing(null);
                }}
              />
            )}
          </Modal>
          <Modal
            open={modal}
            onClose={() => setModal(false)}
            title={
              section === "proposals"
                ? "Draft a proposal"
                : "Add a demo team member"
            }
            description="This action only updates the demo workspace."
          >
            <SimpleForm
              title="Details"
              submitLabel="Save draft"
              onSubmit={async (d) => {
                if (section === "proposals")
                  await actions.save("proposals", {
                    ...d,
                    id: crypto.randomUUID(),
                    projectId: projects[0]?.id ?? "sample-project",
                    providerId: "demo-provider",
                    estimate: "Contact to discuss scope",
                    status: "submitted",
                    provenance: "demo",
                  });
                else
                  await actions.save("team", {
                    ...d,
                    id: crypto.randomUUID(),
                    status: "Demo member",
                    provenance: "demo",
                  });
                notify("Saved");
                setModal(false);
              }}
            />
          </Modal>
        </>
      ) : (
        <EmptyState title="Choose your next step" />
      )}
    </>
  );
}
function download(filename: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function SettingsPanel() {
  const { notify, setRole, role } = useUI();
  const actions = useActions();
  const { data: settings = [] } = useRecords("settings");
  const prefs = settings.find((s) => s.id === "preferences");
  const [email, setEmail] = useState(Boolean(prefs?.email));
  const [compact, setCompact] = useState(Boolean(prefs?.compact));
  return (
    <div className="settings-grid">
      <div className="card form-card">
        <h2>Workspace preferences</h2>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={email}
            onChange={(e) => setEmail(e.target.checked)}
          />
          Email notifications preference
        </label>
        <p className="muted">
          Preference is saved; no email is sent in the demo.
        </p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={compact}
            onChange={(e) => setCompact(e.target.checked)}
          />
          Reduce decorative motion
        </label>
        <button
          className="button dark"
          onClick={() =>
            void actions
              .save("settings", {
                id: "preferences",
                name: "Preferences",
                email,
                compact,
                provenance: "demo",
              })
              .then(() => {
                document.documentElement.classList.toggle(
                  "reduce-motion",
                  compact,
                );
                notify("Preferences saved");
              })
          }
        >
          Save preferences
          <Check size={16} />
        </button>
        {!isSupabase && (
          <label>
            Demo persona
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as typeof role);
                notify("Demo persona changed");
              }}
            >
              {["buyer", "provider", "integrator", "consultant", "admin"].map(
                (r) => (
                  <option key={r}>{r}</option>
                ),
              )}
            </select>
          </label>
        )}
      </div>
      <div className="card form-card">
        <h2>Your demo data</h2>
        <p>
          Export a copy or reset this browser’s workspace. This does not affect
          any external account.
        </p>
        <button
          className="button light"
          onClick={() => {
            const data: Record<string, unknown> = {};
            Object.keys(localStorage)
              .filter((k) => k.startsWith("oracnet:"))
              .forEach((k) => {
                data[k] = JSON.parse(localStorage.getItem(k) || "null");
              });
            download("oracnet-demo-export.json", JSON.stringify(data, null, 2));
          }}
        >
          <Download size={16} />
          Export demo data
        </button>
        <button
          className="button danger"
          onClick={() => {
            if (
              window.confirm(
                "Reset all local demo data? This cannot be undone.",
              )
            ) {
              Object.keys(localStorage)
                .filter((k) => k.startsWith("oracnet"))
                .forEach((k) => localStorage.removeItem(k));
              location.reload();
            }
          }}
        >
          <Trash2 size={16} />
          Reset demo data
        </button>
        <Link to="/privacy">
          Read the privacy notice
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
