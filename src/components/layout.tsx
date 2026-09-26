import { useMarketplaceSearch } from "../data/search-hook";
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
  GitBranch,
  Layers3,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRecords, useUI } from "../state";
import { Modal, Logo, ButtonLink, Skeleton } from "./ui";
const ProviderContactModal = lazy(() =>
  import("./forms").then((m) => ({ default: m.ProviderContactModal })),
);
import { isSupabase } from "../data/repository";

type NavItem = readonly [string, string, typeof Home];
const primaryLinks: readonly NavItem[] = [
  ["/", "Home", Home],
  ["/solution-compiler", "Find a solution", Sparkles],
  ["/implementations", "Implementations", LayoutGrid],
  ["/blueprints", "Blueprints", Layers3],
  ["/technologies", "Technologies", Cpu],
  ["/implementers", "Implementers", Users],
];
const browseLinks: readonly NavItem[] = [
  ["/use-cases", "Use Cases", GitBranch],
  ["/providers", "Providers", Building2],
  ["/builds", "Builds", LayoutGrid],
  ["/marketplace", "Marketplace", ShoppingBag],
  ["/resources", "Resources", BookOpen],
  ["/explore", "Explore", Search],
];
const buyerLinks: readonly NavItem[] = [
  ["/app/saved", "Saved", Bookmark],
  ["/collections", "Collections", Folder],
  ["/app/requirements", "Requirements", GitBranch],
  ["/app/solution-runs", "Solution Runs", Sparkles],
  ["/app/projects", "My Projects", Folder],
  ["/app/messages", "Messages", MessageSquare],
  ["/compare", "Compare", Scale],
];
const providerSections = [
  "Overview",
  "Company",
  "Implementations",
  "Compatibility",
  "Builds",
  "Claims",
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
const creatorSections = [
  "Overview",
  "Implementations",
  "Blueprints",
  "Builds",
  "Offers",
  "Requests",
  "Messages",
  "Analytics",
  "Profile",
  "Settings",
];
const adminSections = [
  "Overview",
  "Implementations",
  "Claims",
  "Evidence",
  "Attestations",
  "Blueprints",
  "Compatibility",
  "Staleness",
  "Builds",
  "Creators",
  "Offers",
  "Reports",
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
  const { roles, userName } = useUI();
  const workspace =
    location.pathname.startsWith("/provider") &&
    !location.pathname.startsWith("/providers")
      ? "provider"
      : /^\/creator(?:\/|$)/.test(location.pathname)
        ? "creator"
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
            <Link className="back-nav" to="/implementations" onClick={close}>
              ← Back to marketplace
            </Link>
            <p className="nav-caption">{workspace} workspace</p>
            {(workspace === "provider"
              ? providerSections
              : workspace === "creator"
                ? creatorSections
                : adminSections
            ).map((section, index) => (
              <NavLink
                end
                key={section}
                to={
                  "/" +
                  workspace +
                  (index
                    ? "/" + section.toLowerCase().replaceAll(" ", "-")
                    : "")
                }
                onClick={close}
              >
                <span className="nav-dot" />
                {section}
              </NavLink>
            ))}
          </>
        ) : (
          <>
            {primaryLinks.map(([to, label, Icon]) => (
              <NavLink end key={label} to={to} onClick={close}>
                <Icon size={19} strokeWidth={1.65} />
                {label}
              </NavLink>
            ))}
            <NavGroup title="Browse more" links={browseLinks} close={close} />
            <NavGroup title="Your workspace" links={buyerLinks} close={close} />
          </>
        )}
      </nav>
      <div className="sidebar-bottom">
        <Link to="/app/profile" className="profile-chip" onClick={close}>
          <span className="avatar">AC</span>
          <span>
            <strong>{userName}</strong>
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
        <div className="workspace-links">
          <Link to="/creator">Creator</Link>
          <Link to="/provider">Provider</Link>
          {(!isSupabase || roles.includes("admin")) && (
            <Link to="/admin">Admin</Link>
          )}
          <Link to="/about">About</Link>
        </div>
      </div>
    </>
  );
}

function NavGroup({ title, links, close }: { title: string; links: readonly NavItem[]; close: () => void }) {
  const location = useLocation();
  const containsCurrent = links.some(([to]) => location.pathname === to || location.pathname.startsWith(to + "/"));
  return (
    <details className="nav-group" open={containsCurrent || undefined}>
      <summary>
        {title}
        <ChevronDown size={14} aria-hidden />
      </summary>
      {links.map(([to, label, Icon]) => (
        <NavLink key={label} to={to} onClick={close}>
          <Icon size={17} strokeWidth={1.65} />
          {label}
        </NavLink>
      ))}
    </details>
  );
}

export function MobileNavigation({ onMenu }: { onMenu: () => void }) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <NavLink to="/explore">
        <Search size={21} />
        Explore
      </NavLink>
      <NavLink to="/implementations">
        <LayoutGrid size={21} />
        Records
      </NavLink>
      <NavLink to="/solution-compiler" className="mobile-publish">
        <Sparkles size={21} />
        Find
      </NavLink>
      <NavLink to="/app/saved">
        <Bookmark size={21} />
        Saved
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
      <span>Search implementations, Blueprints, use cases, technologies…</span>
      <kbd>⌘ K</kbd>
    </button>
  );
}

export function CommandPalette() {
  const { command, setCommand } = useUI();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const search = useMarketplaceSearch(q);
  const [active, setActive] = useState(-1);
  const results = search.data.slice(0, 8);
  const jumps = [
    { name: "Solution Compiler", path: "/solution-compiler" },
    { name: "Add implementation record", path: "/implementation/new" },
    { name: "Explore Blueprints", path: "/blueprints" },
    { name: "Your saved items", path: "/app/saved" },
    { name: "Requirement profiles", path: "/app/requirements" },
  ];
  const options = [
    ...results,
    ...jumps.filter(
      (jump) => !q || jump.name.toLowerCase().includes(q.toLowerCase()),
    ),
  ];
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
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
      title="Search Oracnet"
      description="Search implementation evidence, Blueprints, Builds, use cases, technologies and people."
    >
      <form
        className="command-input"
        onSubmit={(event) => {
          event.preventDefault();
          setCommand(false);
          navigate(
            active >= 0 && options[active]
              ? options[active].path
              : "/search?q=" + encodeURIComponent(q),
          );
        }}
      >
        <Search size={20} />
        <input
          autoFocus
          aria-label="Search marketplace"
          placeholder="Try ‘missed enquiries’, ‘Twilio’, or ‘booking’"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setActive(-1);
          }}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={command}
          aria-controls="command-results"
          aria-activedescendant={
            active >= 0 ? "command-option-" + active : undefined
          }
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!options.length) return;
              setActive(
                (active +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  options.length) %
                  options.length,
              );
            }
          }}
        />
        <button aria-label="Search all results" className="icon-button">
          <ArrowRight size={20} />
        </button>
      </form>
      <div
        className="command-results"
        id="command-results"
        role="listbox"
        aria-label="Search suggestions"
      >
        {options.map((result, index) => (
          <div
            key={result.path}
            id={"command-option-" + index}
            role="option"
            aria-selected={active === index}
            className={active === index ? "command-active" : ""}
          >
            <Link to={result.path} onClick={() => setCommand(false)}>
              <span className="category-icon sand">
                <Search size={18} />
              </span>
              <span>
                <strong>{result.name}</strong>
                <small>
                  {"type" in result
                    ? String(result.type) +
                      " · " +
                      ("provenance" in result ? result.provenance : "")
                    : "Jump to page"}
                </small>
              </span>
              <ArrowRight size={17} />
            </Link>
          </div>
        ))}
        {!options.length && <p>No suggestions found. Try a broader outcome.</p>}
      </div>
      <span className="sr-only" role="status">
        {results.length} search suggestions
      </span>
      <div className="command-foot">
        <Command size={14} /> Search the evidence graph <span>Esc to close</span>
      </div>
    </Modal>
  );
}

export function CompareTray() {
  const { data = [] } = useRecords("comparisons");
  const ids = data.find((item) => item.id === "current")?.productIds ?? [];
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
        {!isSupabase && (
          <p className="demo-strip" role="note">
            <strong>Demo</strong> Sample records, Blueprints, implementers and outcomes are illustrative — none describes a real customer or result. Provider use-case listings summarise public pages and link their source.
          </p>
        )}
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
              {notifications.some((notification) => !notification.read) && <i />}
            </Link>
            <ButtonLink to="/implementation/new" variant="gold">
              <Plus size={18} />
              <span>Add Implementation</span>
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
          <Suspense fallback={<Skeleton />}>
            <Outlet />
          </Suspense>
        </main>
        <footer>
          <Link className="brand footer-brand" to="/">
            Oracnet<span>Implementation intelligence, connected.</span>
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
            ].map((page) => (
              <Link key={page} to={"/" + page}>
                {page.replaceAll("-", " ")}
              </Link>
            ))}
          </div>
          <small>
            {isSupabase
              ? "Connected workspace"
              : "Interactive demo · synthetic implementation records · no live payments"}{" "}
            · © {new Date().getFullYear()} Oracnet
          </small>
        </footer>
      </div>
      <MobileNavigation onMenu={() => setMenu(true)} />
      <Modal
        open={menu}
        onClose={() => setMenu(false)}
        title="Explore Oracnet"
        description="Implementation intelligence, marketplace and workspace navigation"
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
            ["/creator", "Creator / implementer workspace"],
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
        : "Demo workspace — actions stay in this browser. No external messages, attestations or payments."}
      <Link to="/app/settings">Manage data</Link>
    </div>
  );
}
export { Building2, X, Logo };
