import { useState, useEffect, lazy, Suspense } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Home,
  Search,
  LayoutGrid,
  Cpu,
  Bot,
  Users,
  ShoppingBag,
  BookOpen,
  MessageSquare,
  Bookmark,
  Folder,
  Scale,
  Settings,
  HelpCircle,
  Bell,
  Plus,
  Menu,
  ArrowRight,
  Command,
  ShieldCheck,
  Building2,
  ChevronDown,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRecords, useUI } from "../state";
import { Modal, Logo, ButtonLink } from "./ui";
const ProviderContactModal = lazy(() =>
  import("./forms").then((m) => ({ default: m.ProviderContactModal })),
);
import { isSupabase } from "../data/repository";
const mainLinks = [
  ["/", "Home", Home],
  ["/explore", "Explore", Search],
  ["/use-cases", "Use Cases", LayoutGrid],
  ["/technologies?category=ai-software", "AI Tools & Models", Cpu],
  ["/technologies?category=robotics-hardware", "Robotics & Hardware", Bot],
  ["/integrators", "Integrators & Consultants", Users],
  ["/marketplace", "Marketplace", ShoppingBag],
  ["/resources", "Resources", BookOpen],
] as const;
const buyerLinks = [
  ["/app/messages", "Messages", MessageSquare],
  ["/app/saved", "Saved", Bookmark],
  ["/app/projects", "My Projects", Folder],
  ["/compare", "Compare", Scale],
] as const;
const providerSections = [
  "Overview",
  "Company",
  "Listings",
  "Leads",
  "Proposals",
  "Messages",
  "Analytics",
  "Media",
  "Verification",
  "Team",
  "Billing",
  "Settings",
];
const adminSections = [
  "Overview",
  "Users",
  "Providers",
  "Listings",
  "Use Cases",
  "Stacks",
  "Reviews",
  "Projects",
  "Content",
  "Categories",
  "Verification",
  "Moderation",
];
export function AppSidebar({ close }: { close: () => void }) {
  const location = useLocation();
  const { role } = useUI();
  const workspace =
    location.pathname.startsWith("/provider") &&
    !location.pathname.startsWith("/providers")
      ? "provider"
      : location.pathname.startsWith("/admin")
        ? "admin"
        : null;
  return (
    <>
      <Link to="/" className="brand" onClick={close}>
        <img src={import.meta.env.BASE_URL + "favicon.svg"} alt="" />
        Oracnet
      </Link>
      <nav aria-label="Main navigation">
        {workspace ? (
          <>
            <Link className="back-nav" to="/explore" onClick={close}>
              ← Back to marketplace
            </Link>
            <p className="nav-caption">{workspace} workspace</p>
            {(workspace === "provider" ? providerSections : adminSections).map(
              (s, i) => (
                <NavLink
                  end
                  key={s}
                  to={
                    "/" +
                    workspace +
                    (i ? "/" + s.toLowerCase().replaceAll(" ", "-") : "")
                  }
                  onClick={close}
                >
                  <span className="nav-dot" />
                  {s}
                </NavLink>
              ),
            )}
          </>
        ) : (
          <>
            {mainLinks.map(([to, label, I]) => (
              <NavLink
                end
                key={label}
                to={to}
                onClick={close}
                className={({ isActive }) =>
                  isActive &&
                  (to.includes("?")
                    ? location.search === to.slice(to.indexOf("?"))
                    : true)
                    ? "active"
                    : ""
                }
              >
                <I size={19} strokeWidth={1.65} />
                {label}
              </NavLink>
            ))}
            <div className="nav-divider" />
            {buyerLinks.map(([to, label, I]) => (
              <NavLink key={label} to={to} onClick={close}>
                <I size={19} strokeWidth={1.65} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="sidebar-bottom">
        <Link to="/app/profile" className="profile-chip" onClick={close}>
          <span className="avatar">AC</span>
          <span>
            <strong>Alex Chen</strong>
            <small>{isSupabase ? "Your account" : "Demo workspace"}</small>
          </span>
          <ChevronDown size={15} />
        </Link>
        <NavLink to="/app/settings" onClick={close}>
          <Settings size={19} />
          Settings
        </NavLink>
        <NavLink to="/contact" onClick={close}>
          <HelpCircle size={19} />
          Help & Support
        </NavLink>
        <Link className="sidebar-promo" to="/how-it-works" onClick={close}>
          <strong>
            Build smarter
            <br />
            with Oracnet
          </strong>
          <p>The technology marketplace for what you want to build.</p>
          <ArrowRight size={20} />
        </Link>
        <div className="workspace-links">
          <Link to="/provider">Provider</Link>
          {(!isSupabase || role === "admin") && <Link to="/admin">Admin</Link>}
          <Link to="/about">About</Link>
        </div>
      </div>
    </>
  );
}
export function MobileNavigation({ onMenu }: { onMenu: () => void }) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <NavLink to="/explore">
        <Search size={21} />
        Explore
      </NavLink>
      <NavLink to="/app/saved">
        <Bookmark size={21} />
        Saved
      </NavLink>
      <NavLink to="/compare">
        <Scale size={21} />
        Compare
      </NavLink>
      <NavLink to="/app/projects">
        <Folder size={21} />
        Projects
      </NavLink>
      <button onClick={onMenu}>
        <Menu size={21} />
        Menu
      </button>
    </nav>
  );
}
export function GlobalSearch() {
  const { setCommand } = useUI();
  return (
    <button className="global-search" onClick={() => setCommand(true)}>
      <Search size={19} />
      <span>Search technologies, use cases, providers, or resources…</span>
      <kbd>⌘ K</kbd>
    </button>
  );
}
export function CommandPalette() {
  const { command, setCommand } = useUI();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: products = [] } = useRecords("products");
  const { data: cases = [] } = useRecords("use_cases");
  const { data: providers = [] } = useRecords("providers");
  const results = [
    ...cases.map((p) => ({
      ...p,
      path: "/use-cases/" + p.slug,
      type: "Use case",
    })),
    ...products.map((p) => ({
      ...p,
      path: "/technologies/" + p.slug,
      type: "Technology",
    })),
    ...providers.map((p) => ({
      ...p,
      path: "/providers/" + p.slug,
      type: "Provider",
    })),
  ]
    .filter((x) =>
      (x.name + " " + x.description).toLowerCase().includes(q.toLowerCase()),
    )
    .slice(0, 7);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommand(!command);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [command, setCommand]);
  return (
    <Modal
      open={command}
      onClose={() => setCommand(false)}
      title="What do you want to build?"
      description="Search use cases, technologies, and providers. Enter to see all results."
    >
      <form
        className="command-input"
        onSubmit={(e) => {
          e.preventDefault();
          setCommand(false);
          navigate("/search?q=" + encodeURIComponent(q));
        }}
      >
        <Search size={20} />
        <input
          autoFocus
          aria-label="Search marketplace"
          placeholder="Try ‘video’, ‘automation’, or ‘OpenAI’"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button aria-label="Search all results" className="icon-button">
          <ArrowRight size={20} />
        </button>
      </form>
      <div className="command-results">
        {results.map((r) => (
          <Link key={r.path} to={r.path} onClick={() => setCommand(false)}>
            <span className="category-icon sand">
              <Search size={18} />
            </span>
            <span>
              <strong>{r.name}</strong>
              <small>{r.type} · Demo</small>
            </span>
            <ArrowRight size={17} />
          </Link>
        ))}
        {!results.length && (
          <p>No suggestions found. Try a capability or a broader outcome.</p>
        )}
      </div>
      <div className="command-foot">
        <Command size={14} /> Search the ecosystem <span>Esc to close</span>
      </div>
    </Modal>
  );
}
export function CompareTray() {
  const { data = [] } = useRecords("comparisons");
  const ids = data.find((x) => x.id === "current")?.productIds ?? [];
  const location = useLocation();
  return (
    <AnimatePresence>
      {ids.length > 0 && !location.pathname.endsWith("compare") && (
        <motion.div
          className="compare-tray"
          initial={{ y: 70, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 70, opacity: 0 }}
        >
          <Scale size={21} />
          <span>
            <strong>{ids.length} technologies</strong> in your comparison
          </span>
          <ButtonLink to="/compare">
            Compare
            <ArrowRight size={16} />
          </ButtonLink>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export function Layout() {
  const { contact } = useUI();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  const { data: notifications = [] } = useRecords("notifications");
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setMenu(false);
  }, [location.pathname]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <aside className="sidebar">
        <AppSidebar close={() => {}} />
      </aside>
      <div className="app-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            aria-label="Open navigation"
            onClick={() => setMenu(true)}
          >
            <Menu size={21} />
          </button>
          <GlobalSearch />
          <div className="topbar-actions">
            <Link
              to="/app/notifications"
              className="icon-button notification-button"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {notifications.some((n) => !n.read) && <i />}
            </Link>
            <ButtonLink to="/app/projects/new" variant="gold">
              <Plus size={18} />
              <span>Post a Project</span>
            </ButtonLink>
            <button
              className="avatar account-button"
              aria-label="Account menu"
              onClick={() => setAccount(true)}
            >
              AC
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
        <footer>
          <Link className="brand footer-brand" to="/">
            Oracnet<span>Build tomorrow, today.</span>
          </Link>
          <div>
            {[
              "about",
              "how-it-works",
              "pricing",
              "contact",
              "press",
              "careers",
              "security",
              "trust",
              "accessibility",
              "terms",
              "privacy",
              "cookies",
              "marketplace-terms",
            ].map((p) => (
              <Link key={p} to={"/" + p}>
                {p.replaceAll("-", " ")}
              </Link>
            ))}
          </div>
          <small>
            {isSupabase
              ? "Connected workspace"
              : "Interactive demo · sample marketplace content · no live payments"}{" "}
            · © {new Date().getFullYear()} Oracnet
          </small>
        </footer>
      </div>
      <MobileNavigation onMenu={() => setMenu(true)} />
      <Modal
        open={menu}
        onClose={() => setMenu(false)}
        title="Explore Oracnet"
        description="Marketplace and workspace navigation"
      >
        <div className="mobile-sidebar">
          <AppSidebar close={() => setMenu(false)} />
        </div>
      </Modal>
      <Modal
        open={account}
        onClose={() => setAccount(false)}
        title="Your account"
        description="Choose a workspace or manage your profile."
      >
        <div className="account-links">
          {[
            ["/app", "Buyer workspace"],
            ["/provider", "Provider workspace"],
            ["/app/profile", "Profile"],
            ["/app/settings", "Settings"],
            ["/sign-in", "Sign in"],
          ].map(([path, name]) => (
            <Link key={path} to={path} onClick={() => setAccount(false)}>
              {name}
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </Modal>
      <CommandPalette />
      {contact && (
        <Suspense fallback={null}>
          <ProviderContactModal />
        </Suspense>
      )}
      <CompareTray />
    </>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function WorkspaceNotice() {
  return (
    <div className="workspace-notice">
      <ShieldCheck size={17} />
      {isSupabase
        ? "Connected workspace — permissions enforced by Supabase"
        : "Demo workspace — actions stay in this browser. No external messages or payments."}
      <Link to="/app/settings">Manage data</Link>
    </div>
  );
}
export { Building2, X, Logo };
